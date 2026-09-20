---
name: triage-validation
description: Finding validation before writing any report
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
sources: community, operator_experience
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

# TRIAGE & VALIDATION

One wrong answer = STOP **this finding**. Kill **the finding**. Move on **to the next test class**.

> **Scope of "STOP" in this skill:** This skill's gates kill INDIVIDUAL FINDINGS that fail validation. They do NOT authorize stopping the engagement. Killing a finding via the 7-Question Gate just means *that finding* doesn't get submitted — every other test class in the engagement is still pending. See `redteam-mindset` "DO NOT STOP primary directive" for the coverage-axis rule.

> "N/A hurts your validity ratio. Informative is neutral. Only submit what passes all 7 questions."

---

## THE 7-QUESTION GATE

Ask IN ORDER. One wrong answer = STOP immediately.

---

### Q1: Can an attacker use this RIGHT NOW, step by step?

Complete this template:
```
1. Setup:   I need [own account / another user's ID / no account]
2. Request: [exact HTTP method, URL, headers, body — copy-paste ready]
3. Result:  I can [read / modify / delete] [exact data shown in response]
4. Impact:  The real-world consequence is [account takeover / PII read / money stolen]
5. Cost:    Time: [X minutes], Capital: [$0 / $X subscription required]
```

**If you CANNOT write step 2 as a real HTTP request → KILL IT.**

---

### Q2: Is the impact on the program's accepted impact list?

Go to the program page. Find "Vulnerability Types" or "Out of Scope."

Common tiers:
- **Critical**: Any-user ATO without interaction, RCE, SQLi with data exfil, admin auth bypass
- **High**: Mass PII exfil, privilege escalation, internal SSRF with data, stored XSS all users
- **Medium**: IDOR on specific user non-critical data, XSS on sensitive page requiring click
- **Low**: Non-sensitive info disclosure, clickjacking with PoC

**If your bug maps to a listed exclusion → KILL IT.**

---

### Q3: Is the root cause in an in-scope asset?

Confirm:
- Vulnerable domain is on the in-scope list (not `*.internal.target.com`)
- It's a production asset (not staging/dev unless explicitly in scope)
- It's not a third-party service the company just uses (not Stripe, Salesforce, Google Auth)

**If out-of-scope → KILL IT.**

---

### Q4: Does it require privileged access that an attacker can't realistically get?

- "Admin can do X" = centralization risk = **KILL IT** (on 99% of programs)
- "Non-admin can do X that only admin should do" = valid
- "Requires physical access / MFA device" = usually invalid
- "Requires compromised victim account to work" = questionable, low severity at best

---

### Q5: Is this already known or accepted behavior?

Search:
1. Program's HackerOne/Bugcrowd disclosed reports: Ctrl+F endpoint name + bug class
2. GitHub issues on target repo: `is:issue label:security ENDPOINT_NAME`
3. Changelog/CHANGELOG.md — does it mention this behavior?
4. API docs / design docs — is it documented as intended?

**If acknowledged/design decision → KILL IT.**

---

### Q6: Can you prove impact beyond "technically possible"?

- XSS → show actual cookie theft or session hijack, not just `alert(1)` or `alert(document.domain)`
- SSRF → hit an internal endpoint that returns data, not just DNS ping
- SQLi → show actual data exfil from a real table, not just error message
- IDOR → show actual other-user's data in response, not just a 200 status code

**If you can only show "technically possible" → DOWNGRADE severity, not kill.**

---

### Q7: Is this a known-invalid bug class?

Check the NEVER SUBMIT list below. If it's on this list without a chain → **KILL IT.**

---

## THE LAYER-ORDERING TRAP — read before claiming any auth bypass

**A validation error does NOT prove you passed authentication.**

This is the highest-confidence false positive in the auth-bypass class, because the
evidence looks concrete. The reasoning that fails:

> "I sent an unauthenticated request and got back `400 — field X is required`.
> A validation error means the request cleared auth and reached business logic.
> Therefore auth is missing."

That inference is only valid if auth runs *before* input handling. Many stacks put a
**global input sanitiser, body parser, or schema filter in front of the auth
middleware.** A malformed body is then rejected before auth is ever consulted, and
the response is indistinguishable from "auth passed, validation failed."

**The test: re-send with a minimal WELL-FORMED body.**

```bash
# malformed body — trips the sanitiser, which runs FIRST
curl -s -X POST https://target/api/v1/resource -d '{'
# 400 {"code":"ERR-INPUT-0001","message":"Invalid text. Only permitted
#      characters are allowed"}                      <- looks like auth bypass

# same endpoint, well-formed empty object — now auth is reached
curl -s -X POST https://target/api/v1/resource -H 'Content-Type: application/json' -d '{}'
# 401 {"code":"ERR-AUTH-0001","message":"Not authenticated. Please log in."}
```

**Only the second response tells you where the auth layer sits.**

**Lesson from an authorized engagement.** On a production API, a malformed body
returned a validation-shaped `400` on the large majority of endpoints tested. Read
as an auth bypass, that is a Critical filed against production infrastructure
covering financial and administrative operations. It was a sanitiser reacting to
the `{` character before auth ran — every one of those endpoints returned `401` to
a well-formed `{}`. The false Critical was avoided only because someone re-tested.

**Rules:**
- Layer ordering is not observable from a single response. Never infer it.
- Probe auth with the *simplest valid* body the parser will accept, not a malformed one.
- If the error text is about **input shape or character class**, you are talking to a
  parser or sanitiser, not to business logic.
- If the error text names a **domain field** (`accountId is required`) AND a
  well-formed body still returns it, that is a real signal — proceed to Q6.
- Applies equally to WAF and CDN layers: an edge block is not an origin response.

---

## 4 PRE-SUBMISSION GATES

Run in sequence. ALL 4 must PASS.

### Gate 0: Reality Check (30 seconds)
```
[ ] Bug is REAL — confirmed with actual HTTP requests, not code reading alone
[ ] Bug is IN SCOPE — checked program scope page explicitly
[ ] Reproducible from scratch — can reproduce starting from fresh session
[ ] Evidence ready — screenshot, response body, or video
```

### Gate 1: Impact Validation (2 minutes)
```
[ ] Can answer: "What can attacker DO that they couldn't before?"
[ ] Answer is more than "see non-sensitive data" (unless program pays for info disclosure)
[ ] Real victim: another user's data, company's data, financial loss
[ ] Not relying on victim doing something unlikely
```

### Gate 2: Deduplication Check (5 minutes)
```
[ ] Searched HackerOne Hacktivity for this program + similar bug title/endpoint
[ ] Searched GitHub issues for target repo
[ ] Read most recent 5 disclosed reports for this program
[ ] Not a "known issue" in their changelog or public docs
[ ] Google: "TARGET_NAME ENDPOINT_NAME bug bounty"
```

### Gate 3: Report Quality (10 minutes)
```
[ ] Title: [Bug Class] in [Endpoint] allows [actor] to [impact]
[ ] Steps to Reproduce: copy-pasteable HTTP request
[ ] Evidence: screenshot/video of actual impact (not just 200 status)
[ ] Severity: matches CVSS 3.1 score AND program's severity definitions
[ ] Remediation: 1-2 sentences of concrete fix
[ ] NEVER used "could potentially" or "may allow"
```

---

## NEVER SUBMIT LIST

Submitting these destroys your validity ratio.

```
Missing CSP / HSTS / security headers
Missing SPF / DKIM / DMARC
GraphQL introspection alone (no auth bypass, no IDOR demonstrated)
Banner / version disclosure without working CVE exploit
Clickjacking on non-sensitive pages (no sensitive action PoC)
Tabnabbing
CSV injection (no actual code execution shown)
CORS wildcard (*) without credential exfil proof of concept
Logout CSRF
Self-XSS (only exploits own account)
Open redirect alone (no ATO or OAuth theft chain)
OAuth client_secret in mobile app (known, expected)
SSRF DNS callback only (no internal service access or data)
Host header injection alone (no password reset poisoning PoC)
Rate limit on non-critical forms (search, contact, login with Cloudflare)
Session not invalidated on logout
Concurrent sessions
Internal IP in error message
Mixed content
SSL weak ciphers
Missing HttpOnly / Secure cookie flags alone
Broken external links
Autocomplete on password fields
Pre-account takeover (usually — very specific conditions required)
```

---

## CONDITIONALLY VALID — CHAIN REQUIRED

Build the chain first, prove it works end to end, THEN report.

| Standalone Finding | Chain Required | Valid Result |
|---|---|---|
| Open redirect | + OAuth redirect_uri → auth code theft | ATO (Critical) |
| Clickjacking | + sensitive action + working PoC | Medium |
| CORS wildcard | + credentialed request exfils user PII | High |
| CSRF | + sensitive action (transfer funds, change email, delete account) | High |
| Rate limit bypass | + OTP/reset token brute force succeeds | Medium/High |
| SSRF DNS-only | + internal service access + data returned | Medium |
| Host header injection | + password reset email uses injected host | High |
| Prompt injection | + reads other user's data (IDOR) | High |
| S3 bucket listing | + JS bundles contain API keys or OAuth secrets | Medium/High |
| Self-XSS | + CSRF to trigger it on victim without their knowledge | Medium |
| Subdomain takeover | + OAuth redirect_uri registered at that subdomain | Critical |
| GraphQL introspection | + auth bypass mutation or IDOR on node() | High |

---

## CVSS 3.1 QUICK REFERENCE

### Common Score Examples

| Finding | Score | Severity | Vector |
|---|---|---|---|
| IDOR read PII, any user, auth required | 6.5 | Medium | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N |
| IDOR write/delete, any user | 7.5 | High | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N |
| Auth bypass → admin panel | 9.8 | Critical | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H |
| Stored XSS → cookie theft, stored | 8.5 | High | AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:L/A:N |
| SQLi → full DB dump | 9.1 | Critical | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N |
| SSRF → cloud metadata | 9.1 | Critical | AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N |
| Race → double spend | 7.5 | High | AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:N |
| GraphQL auth bypass | 8.1 | High | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N |
| JWT none algorithm | 9.1 | Critical | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H |

> **UI for stored XSS is a judgment call.** Stored XSS that fires on page view is a long-standing CVSS gray area — NVD/FIRST frequently score it UI:R (which drops the stored-XSS row above to ~7.6). The UI:N above models "no extra action beyond normal page use"; if your triager expects UI:R, defend the choice or re-score before copying the number into a report.

### Metric Quick Guide

| What you have | Metric | Value |
|---|---|---|
| Exploitable over internet | AV | Network (N) |
| No special timing or race | AC | Low (L) |
| Free account needed | PR | Low (L) |
| No login needed | PR | None (N) |
| Admin needed | PR | High (H) |
| No victim action | UI | None (N) |
| Victim must click | UI | Required (R) |
| Reads all data | C | High (H) |
| Reads some data | C | Low (L) |
| Modifies all data | I | High (H) |
| Crashes service | A | High (H) |
| Affects only app | S | Unchanged (U) |
| Affects browser/OS/cloud | S | Changed (C) |

---

## KILL FAST RULES

The goal is to QUICKLY disqualify bad leads so you hunt real bugs:

1. **5-minute rule**: If you can't fill in Q1's template in 5 minutes → move on
2. **Precondition count**: More than 2 preconditions simultaneously required → kill it
3. **Impact test**: "What does attacker walk away with?" — if nothing tangible → kill it
4. **Admin bypass**: "Admin can do X" is NEVER a bug → kill it immediately
5. **Design doc test**: If it's documented behavior → kill it immediately
6. **Rabbit hole signal**: 30+ min on Q6 with no reproducible PoC → kill it

---

## PRE-SEVERITY GATE

Before labelling any finding **Critical** or **High** anywhere in your notes or report — write out the answer to each of these as a one-liner. If you can't answer concretely, **the severity is wrong**.

1. **Have I validated the FULL chain to attacker-attainable impact, or only one primitive in the middle?**
   — "Primitive confirmed at layer N" ≠ exploitable. Multi-stage chains require ALL stages validated before the severity matches the chain's top end.
2. **What does the attacker walk away with, in one concrete sentence?**
   — "RCE on the SP front-end web server" is concrete. "Could lead to RCE" is not — that's High at best, often Medium.
3. **Have I personally reproduced the full chain end-to-end at least twice?**
   — Twice = once during discovery, once for the report screenshot/PoC. Not "I'm sure it would work."
4. **Is there an inheritance gate, signature check, audience check, or other validation step still gating the chain?**
   — If yes, the chain is not Critical. Document it as "primitive present" at lower severity until the gate is bypassed.
5. **Has the program rejected this severity class before?**
   — Many programs cap "info disclosure with no concrete impact" at Low/Info regardless of the data type. Read the program scope.

**Lesson from an authorized engagement:** JWT `alg:none` was initially labelled **Critical** based on the signature-bypass primitive being confirmed at the audience-validation layer. Subsequent testing showed the issuer-trust check still rejected unsigned tokens — the full ATO chain did not complete. Finding had to be retracted. If the Pre-Severity Gate had been run on the original draft, Q1 would have killed the Critical label before submission.

---

## ANTI-PATTERNS THAT LOSE MONEY

```
Writing a report before confirming the bug exists (most common)
Submitting theoretical impact without proof
"The API returns more fields than necessary" (sensitivity matters — is it actually sensitive?)
Chaining A+B into one report when they're separate bugs (two separate payouts)
Reporting B saying "similar to A in my other report" — fresh Gate 0 for every bug
Overclaiming severity — triagers trust you less next time
Under-describing impact — triager doesn't understand why it matters
```

---

## RETRACTION DISCIPLINE

When a previously-claimed finding fails reproduction — **never silently drop it.** Document the retraction in the report's appendix. This proves to the triager that you validate your own work, and it saves them from chasing a phantom you've already disproved.

**Retraction entry template:**

```markdown
### Retracted: <finding name>

- **Original signal:** <one-line description of what looked like a bug>
- **Disproving evidence:** <concrete reproduction-step + observation that disproves it>
- **Why it looked like a bug:** <root cause of the false positive — e.g., natural marker collision, network jitter, status-code-only confidence>
- **Retraction date:** <YYYY-MM-DD>
```

**Concrete retractions from an authorized engagement — pattern reference:**

- **X-Forwarded-Proto reflection** — looked like header reflection across 4 pages; was the literal word `javascript` in SP help-link hrefs. Cause: non-unique marker.
- **Host header `:80@evil` bypass** — 200 OK on a path that normally 403s; body byte-identical to baseline (8341 bytes). Cause: status-code-only confidence; ELB Host normalisation dropped the `@evil` portion.
- **`download.aspx` file-existence oracle** — looked like a file-existence differentiator across path types; was SP's file-extension blocklist (`.ashx`/`.asmx`/`.svc`/`.config` always blocked regardless of existence). Cause: confusing server-side policy with file state.
- **`Administrator` timing leak** — single-shot 1527 ms vs ~700 ms control on Authentication.asmx Login; n=80 interleaved reproduction collapsed every group to 685-716 ms. Cause: single-sample statistical claim.

**Why this matters:** retracted findings put in an appendix demonstrate methodological honesty. Silently dropping them looks like you cherry-picked. A clean 11-finding report with a retraction appendix is more trustworthy than a 13-finding report where 2 fall apart at triage.

---

## Related Skills & Chains

- **`report-writing`** — When all 7 questions pass and the Pre-Severity Gate is clean. Workflow primitive: this skill is the gate that runs BEFORE `report-writing`; only findings that clear all 7Q + 4 pre-submission gates get the report-template handoff.
- **`bugcrowd-reporting`** — When a Bugcrowd VRT mapping is needed for an accepted finding. Workflow primitive: after this skill validates the finding, `bugcrowd-reporting` decides the VRT category and severity-request paragraph.
- **`evidence-hygiene`** — When the validated finding needs PoC evidence captured. Workflow primitive: this skill says "Q6 requires proof of impact"; `evidence-hygiene` provides the capture-and-redact protocol for that proof.
- **`security-arsenal`** — When checking the always-rejected / conditionally-valid tables. Workflow primitive: this skill's "Never Submit List" and `security-arsenal`'s "Always Rejected" table are aligned; either entry-point lookup decides whether a primitive is reportable alone or only with a chain.
- **`bb-methodology`** — When Phase 5 (Validate & Report) starts. Workflow primitive: Phase 5's pre-report gate explicitly invokes `/validate` (this skill's 7Q gate) before any report is drafted.

---

## Operator Notes (Claude-BugHunter)

> Engagement-derived additions to the vendored foundation. Wisdom from real
> authorized engagements + Phase 2 verification across this repo's 31+
> skill-area live tests. The upstream methodology covers the WHAT; this
> layer covers the WHEN-IT-ACTUALLY-WORKS and the FAILURE-MODES.

### 7-Question Gate at scale

The 7Q gate is the single highest-ROI artifact in this skill. Phase 2D's hardened-lab campaign verified it kills four distinct false-positive shapes:

1. **URL echo dressed as reflection** — payload appears in the response body because the response IS the URL. Q1 (is this a real HTTP request that does something on the server) kills it.
2. **Word collision dressed as marker hit** — the canary string `XSS-test` matched a CSS class name, not your injection. Marker Discipline + Q1 kill it.
3. **Server policy mistaken for state oracle** — `download.aspx?file=foo.config` always returns "blocked" regardless of whether the file exists. Q6 (impact beyond technically possible) kills it: there's no oracle, just a deny-list.
4. **200 OK without leak** — status code differs from baseline 403; body is byte-identical. Body-Diff Rule + Q6 kill it.

Without the 7Q gate, expect 10-20% submission validity loss across an engagement. With it, retraction rates trend to single digits.

### Pre-Severity Gate before reporting Critical

A authorized SharePoint engagement nearly submitted a Critical when the chain didn't actually complete end-to-end — a primitive that read auth state was conflated with a primitive that mutated it. The Pre-Severity Gate (run all 7 questions specifically against the **Critical claim**, not the generic "is this a bug" claim) would have caught it.

Process: write your draft Critical title. Take each of the 7 questions and answer them with the Critical claim substituted for "the bug." If Q6 (impact beyond technically possible) returns "I have a primitive that should let me do X, but I haven't demonstrated X end-to-end on a test account," downgrade. Critical means impact-demonstrated, not impact-inferable.

### Retraction discipline

If a finding stops reproducing 24h after submission — retract preemptively. Two reasons:

1. **Triagers retract for you with downgraded scoring.** A self-retraction reads "the researcher validates their own work." A triager-retraction reads "the researcher submitted noise."
2. **Validation rate is platform-tracked.** Self-retractions don't hit the same metric as triager-closed-as-N/A. Your reputation signal stays cleaner.

The retraction template in the RETRACTION DISCIPLINE section above is the canonical format. Don't silently delete — append a retraction appendix to the engagement report instead.

### When the 7Q feels obstructive

The friction is the gate working. The half of findings that get killed by the 7Q are the half that would have come back as Informative or N/A. Take the friction. Your average payout per submission goes up when low-confidence findings stop diluting the funnel.

The exception: if the 7Q kills a finding but you still believe it, the answer is **gather more evidence**, not **bypass the gate**. The gate is a "do you have proof" check. Get proof, then re-run the gate.

### Validation discipline rules cross-link

The 7 questions are the umbrella; the discipline rules from `bb-methodology` are the implementation:

| 7Q Question | Discipline Rule (bb-methodology) |
|---|---|
| Q1 (real HTTP request that does something) | Reproducibility Gate |
| Q2 (impact beyond informational) | Pre-Severity Gate |
| Q3 (server-side state change or data leak) | Server-Policy-vs-State |
| Q4 (cross-tenant / cross-user demonstrated) | OOB Gate (for blind class), Marker Discipline (for reflective class) |
| Q5 (not already known / dup) | disclosed-reports/ index + HackerOne hacktivity check |
| Q6 (impact beyond technically possible) | OOB Gate + Body-Diff Rule + Statistical-Sample Rule |
| Q7 (in scope per program rules) | scope.md lookup (engagement scaffold) |

When a question is hard to answer "yes" to, the cross-linked rule tells you which artifact to produce to make the answer yes. Q6 is the one most engagements stumble on; that's why three discipline rules back it.

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
