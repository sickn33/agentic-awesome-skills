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

## Interpret authentication results conservatively

Use Microsoft's current error reference and tenant sign-in logs. `50126` means
invalid username or password, not confirmed user existence. `53003` records a
Conditional Access block, not independently a verified password. `53000` is the
device-compliance code; the former `530003` entry was incorrect. `50053` can
reflect lockout or malicious-IP protection regardless of password validity.
MFA or external-challenge responses need correlation with the actual flow and
authentication details; do not report a credential as confirmed from one code.
Record correlation/request IDs and timestamps without tokens or passwords.

## Attempt budget and lockout risk

Agree an explicit aggregate budget and stop conditions with the tenant owner.
Microsoft's defaults differ between public and government clouds and can be
customized. Prior attempts, location counters, on-premises authentication and
other operators affect outcomes. One attempt can cross an existing threshold;
there is no mathematical guarantee that this assessment cannot cause lockout.
Reserve the attempt before sending under a cross-process lock or transactional
store shared by all operators and flows. Atomic file replacement alone does not
serialize concurrent read-modify-write. Stop on unexpected blocks and consult
the SOC; do not rotate IPs to evade a protection or retry ambiguous requests.

## User enumeration — vectors + hardening status (May 2026)

### Tenant-specific hypotheses, not current guarantees

Realm, credential-type, autodiscover and OneDrive response differences change
over time and by tenant. Historical upstream observations are not reproduced
here. Calibrate only with owner-provided existing and nonexistent test identities.
A OneDrive 404 can mean unprovisioned storage or another routing condition; it
does not identify a shared mailbox, account license, password or MFA exemption.
Response timing is noisy. Authentication-based probes consume the same approved
attempt budget and can trigger controls. Prefer tenant-admin inventory when the
assessment objective permits it.

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

A blocked flow demonstrates that specific request was denied. It does not
prove all services are protected, identify the only viable attack path, or
establish that a credential was correct. Use tenant-side policy and sign-in
records to delimit the finding. Phishing, token reuse, device enrollment and
alternate-resource tests each require explicit scope; they are not automatic
follow-up steps. Basic-auth availability and app client IDs must be verified
against the current tenant and vendor documentation.

## ROPC password validation (the canonical test)

The previous inline validator disabled TLS verification, used retired Azure AD
Graph endpoints and a racy attempt file, and returned token bodies. Do not use
it as an executable validator. Implement only for an explicitly approved test
identity, registered client, tenant-specific supported endpoint and resource,
with TLS verification, transactional attempt reservation, bounded timeouts and
no automatic retries. Retain only sanitized result/correlation metadata; never
return or log a token/password in report evidence. ROPC cannot satisfy MFA and
is unsuitable for many federation and passwordless configurations.

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

**Always parse JSON, then check `if "access_token" in parsed_dict:`** — never substring-match on OAuth error bodies. This is a parsing hazard, not independently reproduced engagement evidence.

The `claims.access_token.capolids` values are tenant-internal Conditional Access policy IDs — useful recon enrichment, but NOT a token. Document them in engagement notes as "CA policy IDs that fired" — they're a defender-side breadcrumb, not an attacker-side win.

Use only the owner-approved serial pace and cumulative budget. A low rate is
not a guarantee against lockout or detection. Stop and investigate unexpected
responses rather than tuning around anti-abuse controls.

## SAML SSO browser flow (for definitive cred validation when CA blocks ROPC)

A separate browser login is another authentication attempt, requiring a separate budget reservation and approved test identity. The example is a selector sketch, not a definitive credential verifier:

```python
import asyncio
from playwright.async_api import async_playwright

async def saml_validate(target_sp_url, username, password, screenshot_dir):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
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
        await browser.close()
        # Check outcome
        low = content.lower()
        if "convergedconditionalaccess" in low or "53003" in low:
            return "CA_BLOCKED"  # observed policy block only
        elif "verify your identity" in low or "approve sign in" in low:
            return "MFA_REQUIRED"  # observed challenge only
        elif "we couldn't sign you in" in low or "wrong" in low:
            return "INVALID"
        elif "<verified-target-specific-authenticated-marker>" in low:
            return "FULL_SUCCESS"  # session obtained (replace marker per target app)
        return "UNCLEAR"
```

Validate the final origin, authenticated identity and server-side result. Generic page text can be reflected or stale; screenshots may contain personal data and require private handling.

---

## Lockout investigation and credential handling

A lockout response alone cannot establish an active attacker or exclude the
assessment as a contributor. Correlate tenant sign-in logs, failure reasons,
source addresses, request IDs and prior activity with the SOC. Report a
hypothesis until corroborated. Never include a real password in a finding.
Use only owner-supplied dedicated credentials with permission for the exact
test; stealer-log availability is not authorization to reuse stolen secrets.

## Engagement journaling (mandatory)

Every M365 attempt logs to JSONL:
```json
{"ts":"2026-05-08T14:40:53","email":"user1@<client>.example","credential_ref":"owner-controlled-test-id","status":"CA_BLOCK_OBSERVED","code":"AADSTS53003","attempts_used":1}
```

**Per-user tracker** (atomic):
```json
{"user1@<client>.example": 1, "user2@<client>.example": 1, ...}
```

Log approved egress and operators for correlation, without IP rotation to
evade protections. Apply a defined retention period; do not automatically carry
account lists and secrets into later engagements.

## Reporting and tooling limits

Report observed status, tenant/resource, sanitized correlation ID, tested flow,
known scope and missing corroboration. Do not use historical account counts or
upstream engagement narratives as current evidence. The external validator path
is not bundled. Install verified, pinned tools in an isolated environment; do
not override system Python packaging protections or install broad tool suites
without need. Do not treat a CA block or OneDrive response as an automatic
MFA-bypass, compromise or active-attacker finding.

## Related Skills & Chains

- **`hunt-mfa-bypass`** — Authentication errors require tenant-log corroboration and are not a reliable factor-presence oracle. Chain primitive: M365 AADSTS50053 lockout differential observed → inspect actual sign-in and policy evidence → `hunt-mfa-bypass` factor-probe (SMS fallback, voice fallback, OAuth device-code flow, ROPC against legacy endpoint) → Conditional Access bypass via legacy-protocol path.
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
