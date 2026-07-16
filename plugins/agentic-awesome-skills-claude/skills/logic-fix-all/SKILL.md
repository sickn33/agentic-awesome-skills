---
name: logic-fix-all
description: 'Autonomous repository-wide audit-and-fix pipeline: health → review → locate/explain → fix → diff-verify → iterate until clean. Starts with a mandatory consent prompt (token-intensive); after consent runs hands-free. Trigger when the user wants ALL logic issues found and fixed — "fix...'
risk: unknown
source: https://github.com/hyhmrright/logic-lens/tree/main/skills/logic-fix-all
source_repo: hyhmrright/logic-lens
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/logic-lens/blob/main/LICENSE
---

# Logic-Lens — Logic Fix All
## When to Use

Use this skill when you need autonomous repository-wide audit-and-fix pipeline: health → review → locate/explain → fix → diff-verify → iterate until clean. Starts with a mandatory consent prompt (token-intensive); after consent runs hands-free. Trigger when the user wants ALL logic issues found and fixed — "fix...


## Setup

Use phase-gated lazy loading per `../_shared/common.md` §13:
1. Before consent, read only `../_shared/common.md` for language, scope routing, fix-all header fields, config fields, and loading budget; then read `logic-fix-all-guide.md` through the phase map and `guide-phases-0-2-consent-scope-health.md` through Phase 0.
2. After consent, read each phase file only when entering that phase.
3. Load `../_shared/logic-risks.md`, `../_shared/semiformal-guide.md`, `../_shared/semiformal-checklist.md`, `../_shared/report-template.md`, and the other skill guides on demand when that phase invokes their methodology.

## Process

**Step 0. Language + scope routing.** Detect language per `common.md` §1. Default scope is the repo root; honor a user-named subpath or pasted snippet. For a pasted snippet, skip the consent prompt and run the fix pipeline directly. Read `.logic-lens.yaml` for `ignore:`, `custom_risks`, `severity:`, `focus:`, and `fix_all.max_iterations`.

**Step 1. Consent + scope enumeration** (guide Phase 0–1) — for repo/directory scope: mandatory consent prompt displaying scope / method / cost / iteration cap; on consent, enumerate runtime-affecting files (source / config / constraint / doc), exclude `.git` and build artifacts, classify by risk tier. For a pasted snippet: skip consent, enumerate the snippet's functions directly.

**Step 2. Health pass** (guide Phase 2) — apply logic-health methodology to map per-module Logic Scores and L-code patterns.

**Step 3. Deep review** (guide Phase 3) — apply logic-review per file to collect full Premises → Trace → Divergence findings.

**Step 4. Conditional clarification** (guide Phase 4–5) — apply logic-locate where concrete failures exist; apply logic-explain when a finding's path is unclear (call depth > 3, cross-module, or async).

**Step 5. Fix queue + remedy** (guide Phase 6) — sort by severity; write a paste-ready Remedy per finding; route cross-file contradictions to the correct edit target (code / constraint / config / doc).

**Step 6. Apply + verify** (guide Phase 7) — apply each fix, then apply logic-diff methodology comparing original vs. fixed code. Expected verdict: `⚠️ Conditionally Equivalent` where the differing condition is exactly the bug scenario. Revert if verdict is `✅ Semantically Equivalent` (fix had no effect) or shows new divergences outside the bug scenario (regression). Retry up to 3×.

**Step 7. Iterate + report** (guide Phase 8–9) — re-run health + review on modified files and their consumers; Criticals loop without cap; Warning/Suggestion rounds capped by `fix_all.max_iterations` with user-escalation prompt at the cap. Output the Fix Report.

**Mode line in report:** `Logic Fix All` (Chinese: `逻辑全修`).

**Fix-report additions** (appended after the standard Summary; localize all labels):

```
## Scope

| Role (source/config/constraint/doc) | Files scanned | Tier H/M/L | Truncated? |
|-------------------------------------|---------------|------------|------------|

## Skill Invocations
logic-health: N · logic-review: N · logic-locate: N · logic-explain: N · logic-diff: N

## Iteration History

| Round | Severity class | New findings | Action |

## Fix Log

| # | File | Lines | Finding | Risk | Severity | Fix Applied (one-line edit or diff summary) | Status (resolved/unresolved/reverted) |

## Resolved by Clarification
[Findings the Phase-5 logic-explain pass revealed as false positives. Empty if none.]

## Unresolved Findings
[Include reason per entry: "conflicting constraints", "user stopped iteration at round N",
"hard iteration ceiling reached", "ambiguous spec", "unclear whether spec or consumer is wrong".
Empty if all resolved.]
```

**Report header fields** (replace the standard single-line header per `common.md` §5):

```
**Logic Score (before):** XX/100
**Logic Score (after):**  YY/100
**Findings fixed:** N  (Critical: n1 · Warning: n2 · Suggestion: n3)
**Findings unresolved:** M
```

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
