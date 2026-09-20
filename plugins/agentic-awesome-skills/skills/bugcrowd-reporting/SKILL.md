---
name: bugcrowd-reporting
description: Bugcrowd-specific reporting tactics complementing report-writing
category: security
risk: safe
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Process guidance; no tooling required. Docs-only; upstream templates
  not bundled.
sources: bugcrowd, community
---

# BUGCROWD REPORTING — Program-Specific Tactics

> Companion to the generic `report-writing` skill. Use when working specifically on Bugcrowd submissions where VRT mapping, OOS-clause rebuttals, or per-program target selection matter.

This skill encodes patterns that apply specifically to Bugcrowd's submission flow. For the generic per-platform templates (HackerOne / Bugcrowd / Intigriti / Immunefi report bodies), use the `report-writing` skill. For the 7-Question Gate before deciding to report at all, use `triage-validation`.

---

## 1. VRT Category Selection — Search & Fallback Strategy

Bugcrowd's submission form requires a single VRT (Vulnerability Rating Taxonomy) selection. The dropdown's default severity is bound to the chosen node — pick wrong and the form auto-suggests a lower priority (often P4) when the actual impact is P3 or P2.

> Note: VRT default severities are not fixed constants. Bugcrowd revises the VRT schema across versions, and individual programs can remap defaults via their own priority configuration. The P-values shown in the examples below (e.g., "No Rate Limiting on Form → Login" defaulting to P4) are the typical baseline at time of writing — always read the severity the *current* form actually auto-suggests for *this* program rather than assuming the value here.

### 1.1 Search hierarchy (try in order, pick the highest-severity match that still describes the bug)

For any finding, search the VRT dropdown with these terms in this order:

1. **The bug's primary class** — e.g., `IDOR`, `XSS`, `SSRF`, `auth bypass`, `2FA bypass`
2. **The data category exposed** — e.g., `PII`, `sensitive data exposure`, `disclosure of secrets`
3. **The control bypassed** — e.g., `broken access control`, `authentication bypass`
4. **The endpoint type** — e.g., `no rate limiting on form > login`, `no rate limiting on form > change password`
5. **The generic parent node** — e.g., `Server Security Misconfiguration > Other`, `Broken Access Control > Other`

### 1.2 Pick the highest-severity match that still accurately describes the bug

Never select a VRT that misrepresents the bug just to get a higher default severity. Triagers will reassign and may flag the misrepresentation. The discipline is: pick the most specific *accurate* VRT, then use §2 (Manual Severity Override) if the default is wrong.

### 1.3 Common mappings worth knowing

| Finding type | First-choice VRT | Fallback |
|---|---|---|
| ATO via missing 2FA on password change | Broken Authentication & Session Management → Second Factor Authentication (2FA/MFA) → Bypass | Broken Auth → Authentication Bypass → Other |
| Password oracle without rate limit | Broken Authentication & Session Management → Authentication Bypass → Other | Server Security Misconfiguration → No Rate Limiting on Form → Login |
| GraphQL introspection / APQ allowlist bypass | Server Security Misconfiguration → Other (justify in body) | Broken Access Control → Other |
| Username → real name PII enumeration | Sensitive Data Exposure → PII Leakage / Disclosure of Secrets → Non-Corporate User | Broken Access Control → Other |
| State desync on security-sensitive action | Application-Level DoS → Other (with state-desync framing) | Server Security Misconfiguration → Other |
| Email/SMS pumping on auth-flow endpoint | Server Security Misconfiguration → No Rate Limiting on Form → Email-Triggering / SMS-Triggering | Server Security Misconfiguration → No Rate Limiting on Action |
| Token brute-force (email-change OTP, password reset) | Broken Authentication → Authentication Bypass → Other | Server Security Misconfiguration → No Rate Limiting on Action |

### 1.4 If no good VRT exists

Pick `Server Security Misconfiguration → Other` or `Broken Access Control → Other` and **lead the description body with a "VRT mapping note"** explaining why the chosen node is the closest available match and what the bug actually is.

---

## 2. Manual Severity Override

Bugcrowd's form lets you manually set Technical Severity *separate from the VRT default*. The form text itself states: *"A severity rating suggested by the VRT is not guaranteed to be the severity rating applied to your submission."*

### 2.1 When to override

Override the VRT default when:
- The chained outcome is a higher severity than the standalone bug class (chain → ATO)
- The VRT category is approximate and its default doesn't reflect the actual impact class
- The program's own Focus Areas explicitly list this outcome at a higher severity than VRT's default
- The data class exposed is more sensitive than the VRT's example uses (e.g., real-name PII vs. handle enumeration)

### 2.2 How to override (form mechanics)

1. Select the VRT that most accurately describes the bug (per §1)
2. Note the auto-suggested severity (P4, P3, etc.)
3. In the **Technical Severity** field, manually pick the severity you're requesting
4. Add a **Severity Request** paragraph as the FIRST section of the description body (per §3)

### 2.3 Don't over-claim

P1 inflation is the fastest way to lose triager trust. Reserve P1 for ATO without interaction, RCE, mass PII exfiltration, fund theft, and similar Critical-bucket impacts. If the chain to P1 requires a separate stolen-cookie premise, file the standalone primitive at P3 and discuss the chain explicitly with cross-references (per §4).

---

## 3. Severity-Request Paragraph — Always First in the Body

When the VRT default underrates impact, the FIRST section of the description body should be a severity-request paragraph. This is the first thing the triager reads and it pre-empts the auto-close that often happens when triagers see "P4" in the form.

### 3.1 Template

```markdown
## Severity request — please review carefully before applying VRT default

The closest VRT category for this finding is "[chosen VRT]," which Bugcrowd defaults to **P[N] ($X-$Y in [program]'s rubric)**. **I am requesting evaluation at P[M] [standalone | in chain with submission XXXX]** for the following reasons:

1. **[Impact axis 1]** — [specific reason this finding exceeds the VRT default's example]
2. **[Impact axis 2]** — [specific reason, often citing the program's own Focus Areas]
3. **[Impact axis 3]** — [specific reason, often comparing to historical bounty payouts for the same data class]

[Optional: one paragraph contrasting the VRT default's typical example with this finding's actual impact, e.g., "P4 = No Rate Limiting on Login Form" applies to ordinary login pages where brute force is bounded by lockout policies; this endpoint has neither lockout nor throttle.]
```

### 3.2 Worked example pattern

```markdown
## Severity request — please review carefully before applying VRT default

The closest VRT category for this finding is "No Rate Limiting on Form → Login," which Bugcrowd defaults to **P4 ($XX–$YY in this program's rubric)**. **I am requesting evaluation at P3 standalone, P2 in chain with submission XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX** for the following reasons:

1. **[Endpoint] is a password-disclosure oracle, not a generic rate-limit gap.** The endpoint returns true/false for a supplied password — combined with cookie theft, it is the exact primitive an attacker uses to learn the victim's *durable* credential from a stolen *transient* session.
2. **The chained outcome is "Account Takeover,"** explicitly listed under the program → Focus Areas → Critical (P1) examples. This finding is one of two independent links that make that chain work; the other is submission XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.
3. **The two findings have independent fix surfaces.** Per the program's "one fix = one bounty" rule they should be evaluated as two separate findings whose chain raises the joint severity.

The "P4 = No Rate Limiting on Login Form" default applies to ordinary login pages where brute-force is bounded by lockout policies. This endpoint has neither lockout nor throttle, and the result of brute force is the *user's actual password* (not a session) — making the impact significantly higher than the default VRT severity assumes.
```

### 3.3 Tone guidelines

- Open with *"Severity request — please review carefully before applying VRT default"* (literal phrase). Triagers recognize this and don't auto-close.
- Use **bold** sparingly; one or two phrases per reason at most.
- Never use "could potentially" or "may allow" — these are downgrade-bait.
- Cite the program's own Focus Areas / accepted-impact list by exact name.
- Cross-reference linked submissions by full submission ID (UUID format).

---

## 4. OOS-Clause Rebuttals — Templates

Bugcrowd triagers sometimes auto-close findings by mapping them to an OOS clause without reading the report. Pre-empt this by including an **In-scope justification** section that quotes the OOS clause and explains why your finding doesn't fit it.

### 4.1 "Rate limiting on non-authentication endpoints" rebuttal

When the finding is on an authentication endpoint (login, password change, password verify, OTP verify, token validate):

```markdown
## In-scope justification

The program OOS list excludes "Rate limiting or brute-force issues on **non-authentication** endpoints." `[endpoint name]` is the canonical authentication endpoint — it accepts a password/token/OTP and returns whether it matches the user's stored credential. By definition this is an authentication primitive. The OOS clause's "non-authentication" qualifier therefore does NOT apply.
```

### 4.2 "Debug information disclosure" rebuttal (for schema/introspection findings)

When the finding involves schema disclosure that's actually a control bypass (e.g., GraphQL allowlist bypass exposing the mutation surface):

```markdown
## In-scope justification

This is not a "debug information" finding. The [persisted-query allowlist | introspection gate | etc.] is acting as an authorization control on the [GraphQL surface | API tree | etc.]. The bypass converts that gate into a no-op — multiple [mutations | endpoints] become reachable that the official clients cannot invoke. The schema disclosure is incidental; the impact is **mutation-surface unlock**, not information leakage.
```

### 4.3 "User enumeration with low-risk information" rebuttal

When the finding leaks more than just "this handle/email exists":

```markdown
## In-scope justification

The program OOS list excludes "User Enumeration issues with **low-risk and insignificant** information being enumerated." The data leaked here is **neither low-risk nor insignificant**: it includes the matched user's [full real first name, last name, profile photo / SSN last 4 / phone number / etc.]. Real-[name | identity | etc.] knowledge is the same data class that gates the program's own [account-recovery flows / fraud-investigation interviews / support-call verification], which means this lookup directly defeats one of the program's own anti-fraud controls. This is PII disclosure, not handle enumeration.
```

### 4.4 "Theoretical issues / not exploitable" rebuttal

When the finding's exploitability has been demonstrated end-to-end:

```markdown
## In-scope justification

This finding is exploitable end-to-end as demonstrated in the PoC: [one-sentence summary of the proven exploitation path]. The PoC includes [N HTTP requests with redacted cookies | N screenshots | a sanitized HAR file | etc.] showing the attacker's session [reading victim data | changing victim credentials | etc.]. The OOS clause for "theoretical issues that are not exploitable, or can not be demonstrated as exploitable" does not apply.
```

### 4.5 If you don't have end-to-end proof

If you only have an "API behavior" observation without a fully demonstrated exploitation path, the finding is theoretical. Don't file it. Capture the missing evidence (delivery confirmation, token-format inspection, cross-account victim data in response, etc.) and re-evaluate. Filing theoretical findings damages researcher reputation on the platform.

---

## 5. Chained Findings — Cross-Reference Strategy

Many high-impact findings are chains of two or more standalone primitives (oracle + missing step-up = ATO). Bugcrowd's program rule: *"Submit one vulnerability per report. If multiple vulnerabilities must be chained to demonstrate impact, you may include them together, but please clearly explain the chain."*

### 5.1 Filing strategy for chains

1. **Identify the highest-severity chained outcome** (typically the one that maps to a P1/P2 example in the program's Focus Areas).
2. **File the chain primitives FIRST** as separate reports — each at its standalone severity (typically P3/P4). A submission's UUID only exists *after* it is filed, so the primitives must exist before anything can reference them. Leave the cross-reference line in each primitive's body as a placeholder for now.
3. **File the chain consumer** — the report whose body describes the full ATO/RCE/etc. impact at the chained severity (e.g., P1). Because the primitives already exist, fill in their real UUIDs in the consumer's "Chain partners" block (per §5.2).
4. **Edit each primitive after filing the consumer** to backfill the consumer's UUID: *"Chain partner: submission [UUID] for the full impact narrative."* (The reference is bidirectional, so one report must be edited after the other is filed — Bugcrowd allows post-submission edits to the description body.)

### 5.2 Cross-reference template

In the chain consumer's body, near the top:

```markdown
## Chain partners (filed as separate reports)

- **submission [UUID-1]** — [primitive 1: e.g., `me.verify_password` no rate limit]
- **submission [UUID-2]** — [primitive 2: e.g., GraphQL APQ allowlist bypass]

These primitives have independent fix surfaces and are filed separately per the program's "one fix = one bounty" rule. The chained impact described here requires both primitives to be exploited end-to-end.
```

In each primitive's body:

```markdown
## Chain context

This finding is the [N]th of [M] independent primitives that together produce [impact, e.g., "permanent account takeover from a stolen session cookie"]. The full chain narrative and the chained severity (P1) are documented in submission [UUID]. This standalone report is at P3 reflecting the primitive's individual impact.
```

### 5.3 What NOT to do

- Don't paste the entire chain narrative into every primitive's body. Cross-reference instead.
- Don't claim each primitive is independently P1 — overclaiming damages credibility for all linked reports.
- Don't ask for a single combined bounty for the chain. The program's "one fix = one bounty" rule means each independent fix surface is a separate bounty. Frame the chain as a severity-amplifier, not a merge request.

---

## 6. Target Selection — QA vs. Production

Programs that scope both production and QA assets (e.g., `app.target.com` vs. `app-qa.target.com`) require careful target selection.

### 6.1 Picking the right target dropdown entry

| If you tested... | Pick this target | Why |
|---|---|---|
| Production app/API | The production target | Most accurate; signals the impact landed on real users |
| QA app/API (per program rules for non-US researchers) | The QA target (e.g., `Sign In - (QA)`, `Enrollment - (QA)`) | Accurate per program rules; signals friendly tester |
| QA but no specific QA target exists | Closest matching production target with a clear QA disclaimer in the body | Triager will reassign correctly if needed |
| Cross-asset finding (multiple targets affected) | The asset where the bug originates / has the highest impact | Add list of other affected targets in the body |

### 6.2 QA-disclaimer paragraph (when filing a QA-tested finding)

```markdown
## Notes for triagers

- Tested in the QA environment ([qa-host]) per the program's instruction for non-US researchers / per the program's QA-testing scope.
- Production may enforce additional controls that QA does not — please confirm whether the same resolver code path runs on production.
- All testing limited to my own QA test account; no other accounts were interacted with.
- Selected target: `[chosen-target]`. Selected VRT: `[chosen-VRT]`. Both selected as closest available matches; please reassign if more appropriate options exist.
```

---

## 7. Researcher-Side Hygiene (Bugcrowd-specific)

These are program-rule items that affect submission quality even though they're not part of the report body itself.

### 7.1 Account email — Bugcrowdninja alias

Most Bugcrowd-managed programs ask researchers to use their `@bugcrowdninja.com` alias as the account email on the target. This flags traffic as friendly-tester to the target's fraud team. Steps:

1. Sign up for the target using your Bugcrowd alias (looks like `username@bugcrowdninja.com`)
2. If you already have an account, update the email to the alias before testing
3. If the program offers a contact path for multi-account testing, use that to coordinate additional aliased accounts (`alias+test1@bugcrowdninja.com`, etc.)
4. Document the alias in the report's "Notes for triagers" section so the triager can correlate test traffic in their logs

### 7.2 Account-state restoration after PoC

After demonstrating any state-changing action (password change, email change, device removal, money transfer):

1. Restore the account to its pre-PoC state immediately (e.g., revert the password to what it was)
2. Document the restoration in the report — *"Account state was restored immediately after the PoC."*
3. If restoration is impossible (e.g., a sent email cannot be unsent), document the residual state honestly

### 7.3 Cookie / session rotation after submission

After submitting any report that includes session-cookie-derived evidence:

1. Log out and log back in to rotate the session cookie
2. Any cookie value visible in screenshots / HARs you submitted is now dead
3. Optionally, rotate the test-account password to a fresh value not used elsewhere — that way passwords visible in PoC screenshots are also dead

### 7.4 If the test account gets locked

1. Don't create a second account to bypass the lock — that looks like fraud
2. Email the program-specific contact (if provided) with your Bugcrowd username and the report ID
3. Wait for the program team to unblock you; testing during the lock period damages credibility

---

## 8. Submission-Order Strategy for Multi-Finding Engagements

When you have multiple findings from a single engagement, the order matters.

### 8.1 Recommended order

1. **Chain primitives before their consumer.** A consumer references the primitives' report UUIDs, which only exist once the primitives are filed (see §5.1). File the best-evidenced primitive first to lock your timestamp, then the rest of the chain's primitives.
2. **The chain consumer next** — fill in the real primitive UUIDs, then edit each primitive to backfill the consumer's UUID (Bugcrowd allows post-submission body edits).
3. **Standalone P3 findings next.** Order by quality of evidence: best-evidenced first, riskier (OOS-adjacent) findings later.
4. **OOS-risky findings last.** By the time these land, you've established a credible track record on this engagement.

### 8.2 Tracking submission IDs

Maintain a simple text file with each submission's UUID, severity, and one-line description. You'll reference these IDs across reports and during any subsequent triager dialogue.

### 8.3 What to avoid

- Don't file all findings in a single batch within minutes. Triagers see this as low-effort spam.
- Don't file an OOS-risky finding before a clean P3 from the same engagement. The clean one establishes credibility; the risky one benefits from being read in that context.
- Don't disclose any findings publicly until the program explicitly says it's OK. Bugcrowd's confidentiality applies to both unresolved AND resolved issues.

---

## 9. Pairing with Other Skills

| For this question / task | Use this skill |
|---|---|
| "Should I report this finding at all?" | `triage-validation` (7-Question Gate) |
| "What's the report body template for Bugcrowd?" | `report-writing` |
| "What VRT do I pick?" | This skill (`bugcrowd-reporting`) §1 |
| "How do I argue for higher severity?" | This skill §2-3 |
| "How do I rebut an OOS objection?" | This skill §4 |
| "How do I redact cookies / PII in screenshots?" | `evidence-hygiene` |
| "Where do I find the payload for this exploitation step?" | `security-arsenal` |
| "Where do I find recon probes for this asset class?" | `offensive-osint` |

---

## Notes on usage

This skill is small and focused. It does NOT duplicate content from `report-writing` (per-platform templates, CVSS scoring, downgrade counters, 60-second pre-submit checklist) — load both skills together when filing a Bugcrowd report. The two skills' content composes naturally because their boundaries are clean: `report-writing` is the body templates, `bugcrowd-reporting` is the program-specific tactics layered on top.

---

## Related Skills & Chains

- **`report-writing`** — Always load this skill alongside `bugcrowd-reporting`. Workflow primitive: `report-writing` provides the body skeleton; this skill layers VRT selection + severity-request paragraph + OOS-clause rebuttals on top of that skeleton.
- **`triage-validation`** — When deciding if a Bugcrowd-bound finding will pass triage. Workflow primitive: 7Q gate runs first; only validated findings reach this skill for VRT mapping.
- **`evidence-hygiene`** — When attaching screenshots / HARs to a Bugcrowd submission. Workflow primitive: Bugcrowd's private attachment system requires redacted evidence; route everything through `evidence-hygiene` before clicking attach.
- **`security-arsenal`** — When the PoC step needs payloads cited verbatim. Workflow primitive: the "Steps to Reproduce" section in this skill's report bodies pulls exact payloads from `security-arsenal` so the triager can paste-and-run.
- **`bb-methodology`** — When confirming engagement mode is bug-bounty (not red-team). Workflow primitive: PART 0 of `bb-methodology` answers "bug bounty?"; if yes AND the target is Bugcrowd, this skill becomes the reporting overlay.

## When to Use

- You need this skill's process guidance (reporting format, evidence handling, detection notes, or scope triage) during an authorized engagement.
- No active probing is involved in this step.

## Limitations

- Process guidance only; it does not authorize probing or exploitation — those steps need their own authorized skill and confirmation gate.
- Docs-only import: upstream templates, commands, and research assets are not bundled.

### Example

```markdown
Apply this skill's checklist to the current engagement notes and report gaps.
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
