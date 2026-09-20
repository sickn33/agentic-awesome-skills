---
name: hunt-clickjacking
description: Hunt Clickjacking
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

## What is Clickjacking

Clickjacking (UI Redressing) lets an attacker load a target page inside a transparent iframe on a malicious site. The victim sees the attacker's decoy UI but clicks the hidden target UI beneath it. No JavaScript on the target is required.

**Highest-value targets:**
- Login / authentication pages — force login with attacker credentials
- Money transfer / checkout / "confirm payment" buttons
- Account settings (email change, password change, 2FA disable)
- OAuth / social-login "Authorize app" confirmation dialogs
- Admin actions (delete, promote user, change role)

## Protection Headers

Two mechanisms prevent framing:

```
X-Frame-Options: DENY              # strongest — blocks all framing
X-Frame-Options: SAMEORIGIN        # allows same-origin frames only
Content-Security-Policy: frame-ancestors 'none'     # CSP equivalent of DENY
Content-Security-Policy: frame-ancestors 'self'     # CSP equivalent of SAMEORIGIN
```

If NEITHER is present, the page is frameable from any origin.

## How to Test

Header-absence is the **trigger for investigation, not the finding**. Two steps:

**Step 1 — Header check (screening).** Fetch the target page and inspect the response headers:

```
curl -sI https://target.example/account/transfer | grep -iE 'x-frame-options|content-security-policy'
```
If BOTH `X-Frame-Options` and CSP `frame-ancestors` are absent, the page is a *candidate*. If either is present and restrictive (`DENY`/`SAMEORIGIN`/`frame-ancestors 'none'|'self'`), stop — it's protected.

**Step 2 — Prove it actually frames and clicks (required for a real finding).** Build a minimal PoC and load it in a real browser:

```html
<!doctype html>
<h1>Win a prize — click below</h1>
<iframe src="https://target.example/account/transfer"
        style="opacity:0.1;position:absolute;top:0;left:0;width:1000px;height:800px"></iframe>
```
Confirm ALL of the following, or it is not exploitable:
- The page **actually renders inside the iframe** (no framebusting JS that blanks/redirects it — e.g. `if(top!==self)` breakout, or a `Sec-Fetch-Dest`/JS frame check).
- The **sensitive action still works while framed** — critically, the action must succeed *cross-site*. If it relies on a session cookie set `SameSite=Lax` or `SameSite=Strict` (the modern default), the cookie is **not** sent on the cross-site framed request, and the clickjack fails. Verify the victim's authenticated state carries into the frame.
- The target is a **state-changing action** (transfer, settings/email/password change, 2FA disable, OAuth authorize, admin action), not a read-only page.

**Strategy:** target the most sensitive action pages first — severity scales directly with what the victim is tricked into doing.

## False Positives

- Public, read-only pages (home/marketing) lacking frame protection are low/informational — no sensitive action to redress.
- APIs and non-HTML endpoints (JSON, images) are not clickjacking targets.
- **Header-absence alone is NOT a finding.** SameSite cookies, framebusting JS, or the lack of any sensitive framed action can each fully defeat it — which is why Step 2 is mandatory.

## Proof Requirements

A valid clickjacking report shows: (1) the target page rendered inside an attacker-controlled iframe in a real browser, (2) a sensitive state-changing action reachable by a framed click while the victim is authenticated (cookies survive the cross-site context), and (3) a screenshot/recording of the overlay. Reporting missing headers with no working frame PoC is a documentation-quality issue, not a vulnerability.

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
