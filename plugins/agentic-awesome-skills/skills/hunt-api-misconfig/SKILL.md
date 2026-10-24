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
# Pseudocode only: JSON-serialize and base64url-encode without padding.
# A token with alg=none is a candidate; correct verifiers reject it.
```

### JWT RS256 → HS256 Algorithm Confusion
```python
# Get server's public key from /.well-known/jwks.json
# Sign token with public key as HMAC secret
token = jwt.encode({"sub": "admin", "role": "admin"}, pub_key, algorithm="HS256")
# Only a misconfigured verifier with compatible key handling could accept it;
# modern libraries commonly reject asymmetric keys as HMAC secrets.
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

Use only the inert `polluted` marker in a disposable test process; command/job,
role-changing or inspector properties are escalation hypotheses, not default probes.

5. **Stop at an inert controlled marker.** Prototype state may be process-global and affect other users. Use a disposable isolated process with approved restart/cleanup; never read secrets or trigger shell/inspector gadgets on a shared production process.

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
   fields are routing hypotheses, not proof of server-side interpolation; compare controlled fixtures and inspect server behavior.
3. **Use path traversal to move inside the server-side URL.** If `username/../other-user` changes the
   referenced account, the input is in a REST path segment. Then try appending route fragments such as
   `/field/email`, `/field/id`, `/field/username`, `/field/syntheticCanary`, and terminate the rest
   of the original backend path with `#` or `%23` when the backend URL parser honors fragments.
4. **Discover API documentation from errors.** When an error says to consult the API definition, probe
   common documentation/spec paths: `/openapi.json`, `/swagger.json`, `/api-docs`, `/api/swagger.json`,
   `/swagger/v1/swagger.json`, `/v3/api-docs`, and path-traversal variants that attempt to reach the
   spec from the vulnerable backend route. A spec or descriptive route error tells you valid resources
   and field names.
5. **Validate a controlled boundary.** Use two owner-controlled synthetic accounts and a harmless protected canary field. Do not retrieve another user’s reset token, complete takeover or send reset messages. An error difference alone is not evidence of data access.

Payload patterns to try, adapted to the observed parameter name:

```
username=administrator%23
username=administrator%3f
username=administrator%2f..%2fvictimuser
username=administrator/../victimuser
username=administrator/field/email%23
username=administrator/field/id%23
username=administrator/field/syntheticCanary%23
username=administrator%2ffield%2fpasswordResetToken%23
```

### CORS Exploitation
```bash
# Test: reflected origin + credentials
curl -s -I -H "Origin: https://controlled-origin.example" https://target.example/api/user/me
# If: Access-Control-Allow-Origin: https://controlled-origin.example + Access-Control-Allow-Credentials: true
# → Candidate only: browser credentials, SameSite, preflight and readable sensitive body must be demonstrated with controlled identities
```

---

## OData authorization and parser-boundary review

OData query options can expose information or consume resources only when the actual
service’s authorization, parser or query-cost controls are inadequate. Do not assume
operator casing/encoding equivalence, a WAF bypass, SQL injection, XXE or a current
CVE from the presence of OData. Dialect/version/provider behavior differs.

Use a tiny owner-approved sandbox with synthetic data:

1. Establish the exact service/version and an authenticated low-privilege identity.
2. Create owned records A/B with a protected synthetic `canary` field, documented
   expected permissions and a reset path. Inspect the service schema as inert data.
3. Compare `$select`, `$filter`, `$orderby` and `$expand` against expected field AND
   related-object authorization. Do not use real password hashes, cards or PII.
4. For example, if A cannot read `canary`, ordering/filtering by it must not reveal
   its value through a repeatable oracle. Document the controlled difference and
   rule, not merely a response count.
5. Test at most an approved small batch/nesting depth; bound work per inner operation
   and preserve auth per subrequest. A parsing difference alone is not exploitation.

No destructive SQL, blind extraction loop or unlimited expansion is needed for a
minimal report. Review the provider’s current security advisories and original
research before claiming any historical version range, patch date or public case.

## OpenAPI / Swagger exposure

Public documentation may be intentional; it is not itself an authentication bypass,
complete inventory or proof that every described operation is deployed. Fetch only
approved bounded spec URLs, validate schema and treat operation descriptions,
external `$ref` targets, servers and example URLs as untrusted data. Never automatically
feed every path to a scanner, execute “Try it out”, or follow third-party references.

A useful static check is `jq '.paths | keys' approved-spec.json` on a private local
copy. Then compare a single owned synthetic object across authorized/unauthorized
identities. Privileged writable DTO fields are candidates requiring persisted-state
verification, not proof from a schema name or 200 status. Remote Swagger UI config
loading/version banners require current bundle configuration and advisory checks;
do not send crafted links to unsuspecting users. No public case, payout, CVE range
or target behavior has been verified by these examples.

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
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; separately review official tool provenance and current compatibility before installation.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
