---
name: logic-locate
description: Locate the root cause of a CONFIRMED failure via backward-then-forward semi-formal tracing. Trigger when the user provides a stack trace, failing assertion, error message, or specific wrong-value observation — "find the bug", "this test is failing", "track down this crash", "why is...
risk: unknown
source: https://github.com/hyhmrright/logic-lens/tree/main/skills/logic-locate
source_repo: hyhmrright/logic-lens
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/logic-lens/blob/main/LICENSE
---

# Logic-Lens — Fault Locate
## When to Use

Use this skill when you need locate the root cause of a CONFIRMED failure via backward-then-forward semi-formal tracing. Trigger when the user provides a stack trace, failing assertion, error message, or specific wrong-value observation — "find the bug", "this test is failing", "track down this crash", "why is...


## Setup

Use lazy loading per `../_shared/common.md` §13:
1. Read `../_shared/common.md` only for language, Iron Law, Fault Confidence, scope routing, Remedy discipline, config fields, and loading budget.
2. Read only the relevant step in `logic-locate-guide.md` as you reach it.
3. Load `../_shared/logic-risks.md`, `../_shared/semiformal-guide.md`, `../_shared/semiformal-checklist.md`, and `../_shared/report-template.md` on demand when the current step needs them.

## Process

**Step 0. Language + scope routing.** Detect language per `common.md` §1. Confirm a concrete failure exists (stack trace, failing assertion, specific wrong value). If only a suspicion, switch to logic-review.

**Step 1. Understand the failure** (guide Step 1) — observed behavior, expected behavior, reproduction path.

**Step 2. Identify the entry point** (guide Step 2) — failing test, outermost application frame, or request handler — whichever is closest to the failure. Stay inside the failure cone first: stack frames, failing test fixture, directly called local functions, and config/env values read on that path. Do not scan unrelated modules unless the trace crosses into them.

**Step 3. Trace backward from the failure point** (guide Step 3) — walk each value and state back to its origin, building premises at every hop.

**Step 4. Trace forward to confirm** (guide Step 4) — from the suspected root, verify the trace reaches the observed symptom.

**Step 5. Interprocedural tracing if a callee is implicated** (guide Step 5) — trace into the callee; check return values under observed conditions, unhandled exceptions, shared-state mutation. Apply the depth limit and Call-Chain Context Label format defined in `semiformal-guide.md` §Call-Chain Context Labels; at the limit, state the remaining callee path as a premise assumption and downgrade to **Medium confidence** (per `common.md` §7).

**Step 6. Identify the root divergence and classify** (guide Step 6) — state the exact line/expression, the violated premise, the actual behavior, the propagation chain to the symptom; pick the L-code.

**Step 7. Output the focused report** (guide Step 7) — Fault Confidence (High/Medium/Low, per `common.md` §7); Primary Fault (single five-field finding); optionally Contributing Factors; a minimal Remedy per `common.md` §10. **Format is mandatory even for simple one-function bugs: always emit the labeled Premises / Trace / Divergence / Trigger / Remedy fields and the Fault Confidence line. Never answer with a plain fix suggestion.**

**Mode line in report:** `Fault Locate` (Chinese: `故障定位`).

**Output format:** the Findings section has ONE Primary Fault, not a full Critical/Warning/Suggestion split. The Logic Score line is replaced by **Fault Confidence:** High / Medium / Low.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
