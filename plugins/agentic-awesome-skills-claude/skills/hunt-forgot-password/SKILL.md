---
name: hunt-forgot-password
description: Hunt Forgot Password / Account Recovery Authentication Flaws
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
sources: hackerone_public, public_research
report_count: 6
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

## Autonomous Testing Priority

**Start with username enumeration — it's the fastest win and gates the rest.**

**Pattern 1 — Username enumeration (response difference for valid vs invalid email):**
1. POST to the forgot-password endpoint with a clearly invalid email (e.g. `nonexistent@fakedomain12345.com`) — record the response body, status code, and length
2. POST with an email you know exists (or try common patterns like `admin@target.com`, `test@target.com`, `user@target.com`)
3. Compare responses: different message ("Email sent" vs "Email not found"), different HTTP status, or meaningfully different body length = username enumeration confirmed
4. Proof: enumeration is confirmed when the two responses differ measurably (baseline vs probe) in message text, status code, or body length

**Pattern 2 — Reset token exposed in the API response:**
Some APIs return the reset token directly in the response body (instead of only emailing it). POST to the forgot-password endpoint and look for a token, link, or code in the JSON/HTML response. If a token appears that lets you reset the password, that's an immediate account-takeover vector.

**Pattern 3 — Reset token replay (reuse after use):**
1. Complete a full password reset cycle: request token → use it to reset password
2. Immediately try submitting the same token again to the reset-password endpoint
3. If the second submission returns 200 or "success" → token not invalidated after use

**Pattern 4 — No rate limit on reset requests:**
Submit the forgot-password endpoint 10-20 times rapidly with the same email. If all succeed without a 429, lockout, or CAPTCHA → no rate limit (enumeration + token flooding is possible).

**Content-type:** Forgot-password endpoints are often JSON-based REST APIs. Use `application/x-www-form-urlencoded` only if the endpoint is a traditional HTML form (check the login page's HTML to determine form encoding).

**Proof:** Username enumeration = measurably different response (body/status/length). Token exposure = token in response body. Token replay = second successful use of a consumed token.

---

## Vulnerability Classes in This Skill

### 1. Username Enumeration via Password Reset
Different error messages for valid vs invalid accounts leaks the user list without authentication. Even timing differences (fast "no user found" vs slow "email queued") count.

High-value targets: admin accounts, employee email patterns, API keys derived from usernames.

### 2. Weak / Predictable Reset Tokens
A reset token derived from timestamp, username, or sequential IDs can be brute-forced:
- `base64(email + timestamp)` — decodable
- 4-6 digit numeric code — 10K guesses, easily feasible with no rate limit
- Sequential `token=1234`, `token=1235` — trivially enumerable

### 3. Token Not Bound to Session or IP
Most apps generate a token, email it, and accept it from any browser. A truly bound token should only work from the same IP or require the original session cookie. If neither is enforced → link forwarding = account takeover.

**Token leak via `Referer` / third-party resources.** When the token rides in the reset-page URL (`/reset?token=…`) and that page loads any cross-origin resource (analytics, ads, fonts, a CDN image), the full URL — token included — leaks to that third party in the `Referer` header. Check the reset page's outbound requests: if the token appears in any cross-origin `Referer`, it's harvestable without the victim's inbox. Same leak via a `<meta name=referrer>` misconfig or an outbound link the victim clicks from the reset page. Disclosed token-leak→ATO class: <https://hackerone.com/reports/173551>.

### 4. Reset Link Doesn't Expire
Common best practice: reset tokens expire within ~15–60 minutes (no hard RFC mandates the exact value; OWASP recommends a short, single-use lifetime). If a token from 24 hours ago still works → persistence risk for phishing attacks.

### 5. No Rate Limit on Reset Endpoint
An uncapped reset endpoint enables:
- Email flooding (DoS against victim's inbox)
- Token brute-force if the token space is small
- Username enumeration at scale

---

## Related Skills

- **`hunt-ato`** — owns the account-takeover CHAIN (password-reset is its path #1). This skill finds/proves the recovery-flow primitive; hand off to hunt-ato to assemble the full takeover.
- **`hunt-cache-poison`** — host-header injection during reset email generation (different vulnerability, same flow)
- **`hunt-brute-force`** — rate-limit testing pattern applies to the reset endpoint too
- **`hunt-auth-bypass`** — if the reset flow can be skipped entirely (go to `/reset-password?token=` with empty/null token)
- **`hunt-mfa-bypass`** — if MFA is required after reset, test the bypass there

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
