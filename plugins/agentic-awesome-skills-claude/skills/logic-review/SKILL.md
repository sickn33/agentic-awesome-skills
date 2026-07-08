---
name: logic-review
description: Find logic bugs in a single file or function via semi-formal execution tracing (Premises → Trace → Divergence → Trigger → Remedy). Trigger when a user shares code and suspects something is wrong without naming a concrete failure — phrases like "review this", "does this look right",...
risk: unknown
source: https://github.com/hyhmrright/logic-lens/tree/main/skills/logic-review
source_repo: hyhmrright/logic-lens
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/logic-lens/blob/main/LICENSE
---

# Logic-Lens — Logic Review
## When to Use

Use this skill when you need find logic bugs in a single file or function via semi-formal execution tracing (Premises → Trace → Divergence → Trigger → Remedy). Trigger when a user shares code and suspects something is wrong without naming a concrete failure — phrases like "review this", "does this look right",...


## Output Skeleton Contract

The downstream grader (`scripts/grade-iteration.py`) and other Logic-Lens skills consume this report by substring-matching literal tokens defined in `../_shared/common.md` §1 (header map), §2 (mandatory field labels + Logic Score), and `../_shared/report-template.md` (skeleton). Paraphrasing those tokens — even with a synonym that reads fine to a human — breaks the contract regardless of analysis quality.

**Three failure modes observed in benchmark that deserve specific callout** beyond the general rule:

- **Synonym substitution for field labels whose substituted form omits the required substring** — replacing `Premises` / `前提` with `前置条件构建` / `前置条件` (eval-201), or `Divergence` / `偏差` with `根因` / `核心缺陷` / `结论` (eval-252). Each substitution reads fine to a human and may even appear as a section heading or table column, but the substituted word does NOT contain the required substring, so grader and cross-skill consumers see the document as missing the field entirely. Use the literal token from `common.md` §1; you can still add a descriptive subtitle alongside it.
- **Demoting a confirmed L-code finding** to `### 附加观察（非 Finding）` / `### Additional observation` — if Premises→Trace→Divergence holds, the finding belongs inside `## Findings` with the five literal fields, even at Suggestion severity. This was a recurring cause of eval-279 (quicksort L4) failing on Sonnet runs.
- **Omitting `Divergence:` / `偏差：` field entirely** — the single most frequent failure mode. Many outputs correctly analyze the bug but write the divergence as prose, in a table cell, or under headings like `根因`, `故障点`, `核心问题`, `缺陷`. The `Divergence:` field is the specific label for "the point where actual behavior diverges from the premise." It is NOT optional and has no acceptable synonym. For no-bug findings use `Divergence: None — [why the premise holds]` (中文 `偏差：无——[原因]`).

**Correctly formatted finding — use as template:**

```
### 🔴 Critical
**[L4] — Mutation during iteration skips elements**
Premises: `users` is `list[User]` passed by reference; `list.remove()` shifts subsequent elements left; the `for` iterator advances by index.
Trace: [1] index=0, user is inactive → `remove()` shifts list. [2] Iterator advances to index 1, which now holds the element originally at index 2 — the original index-1 element is skipped. Rebuttal check: PASSED — no defense found.
Divergence: `remove_inactive([inactive₁, inactive₂, active])` returns `[inactive₂, active]` (2 elements) instead of `[active]` (1 element) — the second inactive user is never visited.
Trigger: `remove_inactive([User(False), User(False), User(True)])` → expected 1, actual 2.
Remedy: Replace loop body with `return [u for u in users if u.is_active]`. Dry-run: ✅ divergence eliminated.
```

Each finding block MUST contain all five literal labels (`Premises:` / `Trace:` / `Divergence:` / `Trigger:` / `Remedy:` or `前提：` / `追踪：` / `偏差：` / `触发：` / `修复：`) as line-starting prefixes. Section headers (`### Premises`, `## Execution Trace`) do NOT satisfy this requirement — the labels must appear inside the finding block.

**No-bug case**: emit `## Findings` with a finding block that uses all five field labels, with `Divergence: None — [why the premise holds]`. This format is REQUIRED — it satisfies both grading and auditing. Example:

```
### ✅ No Bug
**[No Bug] — defer guarantees unlock on all exit paths**
Premises: `mu.Lock()` acquired at line 12; `defer mu.Unlock()` placed at line 13 (before any conditional branch or early return).
Trace: [1] `defer` registered immediately after `Lock()`. [2] Go spec guarantees deferred calls execute on ALL function exit paths (return, panic, early return). [3] No conditional branch between Lock and defer registration.
Divergence: None — `defer mu.Unlock()` placed unconditionally after acquire guarantees release on every exit path; no lock leak possible.
Trigger: N/A (no bug to reproduce).
Remedy: N/A (code is correct as written).
```

## Setup

Use lazy loading per `../_shared/common.md` §13:
1. Read `../_shared/common.md` only for language, Iron Law, Logic Score, scope management, Remedy discipline, config fields, and loading budget.
2. Read only the relevant step in `logic-review-guide.md` as you reach it.
3. Load `../_shared/logic-risks.md`, `../_shared/semiformal-guide.md`, `../_shared/semiformal-checklist.md`, and `../_shared/report-template.md` on demand when the current step needs them.

## Process

**Step 0. Language + scope routing.** Detect the user's language per `common.md` §1; every label and header below must be in that language. Confirm scope is one file or one function — if the user points at a directory, switch to logic-health; if they describe a confirmed failure, switch to logic-locate; if two versions, logic-diff.

**Step 1. Establish claimed behavior + review entry points** (guide Step 1) — write one sentence describing what the code is supposed to do, then select the concrete entry function(s) that will be traced. If a file exceeds `common.md` §9 limits, state the selected subset and why.

**Step 2. Build premises** (guide Step 2) — per the Premises Construction Checklist in `semiformal-checklist.md`; include caller/callee contracts when the reviewed function depends on another local function.

**Step 3. Build the risk path ledger** (guide Step 3) — enumerate candidate bug paths across L1–L9 before writing findings. Tag each retained path as Class A (self-evident) or Class B (invariant-dependent). Do not stop after the happy path. Read `logic-risks.md` Quick Disambiguation Table before assigning any L-code — common misclassifications are catalogued there. **L4 priority check:** does any function mutate its input AND return the same object? **L7 priority check:** is shared state accessed across `await`/yield/thread boundaries without explicit synchronization? **L4 vs L7 disambiguation:** any state access involving more than one execution context (thread / goroutine / `await` / yield) is **L7**, never L4 — including single-threaded asyncio where coroutines interleave at `await`. L4 is for single-context aliasing only (mutable defaults, in-place mutation footgun, mutation-during-iteration). L4 requires an actual **mutation of shared/aliased state** as the root cause — variable scoping issues (const/let visibility, constructor scope) are L1, and query-pattern inefficiencies (N+1) are L3.

**L1 vs L6 disambiguation:** if the root cause is a name/identifier resolving to a different definition than the developer expected (import shadowing, module constant lookup, prototype chain, constructor-scoped `const`/`let` not visible to methods), it is **L1** even when the symptom is a missing-method error or wrong return value — L6 applies only when the name resolves correctly but the callee's behavior differs from what the caller assumed.

**L2 vs L6 disambiguation:** if the root cause is an implicit type coercion at the **operator level** (`+`/`-`/`*`/`==` triggering string↔number conversion, or `as`/cast bypassing runtime type checks), it is **L2** — L6 requires calling a specific callee whose behavior differs from the caller's assumption. Operators are not callees.

**L5 vs L7 disambiguation:** if an error code, exit status, or exception is suppressed by a **single-context construct** (`|| true`, empty `catch`, missing `set -e`, bare `except`), it is **L5** (control flow escape) — L7 requires multiple execution contexts. Error propagation failure within one sequential script/function is L5.

**L9 check:** if the bug's root cause is timezone/locale/encoding information **lost at the data-type level** (e.g., `TIMESTAMP` vs `TIMESTAMPTZ`, naive vs aware datetime, locale-dependent string sort), it is **L9** — not L6 even if it looks like "callee behavior differs from expectation", not L2, not L8.

**Step 4. Deep-trace selected paths** (guide Step 4) — trace the normal path plus the highest-risk edge paths; resolve every name, state every type, cross callee boundaries, and stop each trace at either a confirmed divergence or a confirmed safe post-condition. **Java/C++ DCL rule:** for double-checked locking patterns, MUST trace both faces: (a) missing `volatile` / memory barrier (visibility hazard) AND (b) `instance = new X(); instance.init();` as two non-atomic statements — lock-free readers can see non-null `instance` before `init()` completes (publish-before-init hazard). Report both; omitting either is an incomplete analysis.

**Step 5. Identify divergences** (guide Step 5) — classify each by L1–L9; assign severity; apply the reachability gate (Class A reports directly; Class B requires a probe — enforcement found → drop candidate, not found → assigned severity, partial → cap at Warning with `manual verification recommended`). Apply the correctness parity principle for no-bug scenarios. **No-bug output discipline:** when zero divergences remain, still emit the full template skeleton — Mode line, Scope, `**Logic Score:** 100/100`, `## Findings` followed by a finding block that uses `Divergence: None — [why the premise holds]` (中文 `偏差：无——[原因]`) with all five field labels present. This makes the reasoning auditable and satisfies the format contract. If analysis actively disproves a suspected bug, explain the defense in the `Trace:` field (e.g., "Go `defer mu.Unlock()` guarantees release on all exit paths including early return"). Do not collapse the verdict into free-form prose or omit the structured fields; downstream grading requires the five-field format even for no-bug conclusions.

**Step 5.5. Adversarial Red Team** (guide Step 5.5) — for each candidate finding, attempt to disprove it by answering three rebuttal questions (premise rebuttal, path rebuttal, consequence rebuttal). Withdraw findings with confirmed defenses; downgrade findings with partial defenses to Suggestion. **Design-intent gate:** before reporting an L3 Boundary Blindspot, ask "Does the code explicitly return an error / rejection at this boundary rather than attempting to continue past it?" If yes (e.g., `errors.New("cache full")` at `maxSize`, `429 Too Many Requests`, buffer-full rejection), withdraw — these are correct boundary enforcement, not blindspots. L3 applies only when code *attempts* to operate past the boundary and silently fails (wrong result, crash, infinite loop). Note: a `panic` at a boundary is a crash, not a designed error return, and remains a potential L3.

**Step 6. Apply Iron Law — Five-Field Discipline** (guide Step 6) — confirm all findings have Premises → Trace → Divergence complete; then write Trigger (concrete reproducing input, required for Critical/Warning) and Remedy (paste-ready per `common.md` §10). **Each finding MUST use these literal field labels** — English `Premises:` / `Trace:` / `Divergence:` / `Trigger:` / `Remedy:`, or Chinese `前提：` / `追踪：` / `偏差：` / `触发：` / `修复：`. Do not paraphrase. Headers like `Execution Path`, `Issue Found`, `Core Defect`, `执行路径`, `发现的逻辑隐患`, `核心缺陷` are unacceptable substitutes — they fail downstream grading and break the report contract that other Logic-Lens skills consume. **Multi-finding discipline:** When there are multiple findings, each finding block inside `## Findings` must include all five literal field labels — `Premises:` / `Trace:` / `Divergence:` / `Trigger:` / `Remedy:` (or their Chinese equivalents) — with content specific to that finding. Any shared background context may appear as a preamble section, but it does NOT substitute for the per-finding fields. A finding that omits `Divergence:` (or any other required field) breaks the contract even if `Premises:` or `Trace:` appear elsewhere in the report.

**Step 6.5. Remedy Dry-Run** (guide Step 6.5) — mentally re-trace the Trigger input through the fixed code to confirm: divergence eliminated, no regression introduced, happy path preserved.

**Step 7. Score and output** (guide Step 7) — compute Logic Score per `common.md` §6 and emit it as the literal line `**Logic Score:** XX/100` (中文 `**逻辑评分：** XX/100`) directly under `**Scope:**` — this exact token (not "Score: XX", not "Quality: XX") is required for both grader recognition and cross-skill consumption. Then render the rest of the Report Template with localized headers.

**Step 8. Execution Verification Gate** (guide Step 8, optional) — when a runtime is available, generate a minimal reproducer script for each Critical/Warning finding, execute it to confirm the bug exists, apply the Remedy and re-execute to confirm the fix works. Withdraw false positives; mark verified findings as `✅ Execution-verified`.

**Mode line in report:** `Logic Review` (Chinese: `逻辑审查`).

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
