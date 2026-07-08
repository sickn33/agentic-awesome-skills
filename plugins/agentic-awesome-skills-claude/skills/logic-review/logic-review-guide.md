# Logic Review — Step-by-Step Guide

## Step 1: Establish Claimed Behavior

Read any comments, docstrings, test names, or commit message. Write one sentence:
"This code is supposed to [verb] [what], given [inputs], producing [output/side effect]."

This sentence is the reference point: anything the trace contradicts is a candidate finding. If no documentation exists, infer intent from the function signature, caller usage, tests, and names. Do not emit a documentation-gap finding unless the missing contract directly prevents a logic conclusion.

Select the review entry point before tracing:
- Single function input: trace that function and any local callees reached from it.
- Single file input: identify public/exported functions, functions changed recently, and functions touching external state. If the file exceeds `common.md` §9 limits, choose at most 3 high-risk functions and state the uncovered functions in Scope.
- Pasted snippet without line numbers: anchor trace steps to function names and expressions; do not invent line numbers.

## Step 2: Build Premises

Run through every applicable item in **`../_shared/semiformal-checklist.md`** — Name Resolution, Type Contracts, State Preconditions, Control Flow Assumptions. Read its "What is NOT a Premise" section before writing.

Write premises **before** starting the trace.

**Good premise example:** "`users` is a `list[User]` passed by reference; `users.remove(x)` mutates the list in place; the `for user in users` iterator does not re-index after a mutation, so removing element at position `i` causes element at original position `i+1` to be skipped."

For logic-review, premises must cover both sides of each important boundary:
- **Caller contract:** What values can enter this function from real call sites? If call sites are unavailable, mark this premise as partial.
- **Callee contract:** What can each local callee return, raise, mutate, or skip? Trace into local callees when the finding depends on their behavior.
- **State lifetime:** Which state survives across calls, iterations, awaits, callbacks, or retries?
- **Observable consequence:** What output, mutation, exception, persisted value, or externally visible side effect would make the bug real?

## Step 3: Build the Risk Path Ledger

Before writing any finding, enumerate candidate paths. This prevents the review from anchoring on the happy path.

Create a short internal ledger with one row per path:

```
[risk code] [entry point] [input/state condition] [branch/callee/resource involved] [why this path is reachable or not] [Class A | Class B]
```

Tag each **retained** candidate with a **Reachability Class** (discarded candidates need no tag):
- **Class A (Self-evident):** triggering condition is visible in local code — e.g., dereference after explicit nil check, index beyond bounds, unchecked type assertion, resource with no release on a visible exit path.
- **Class B (Invariant-dependent):** triggering condition requires an implicit external assumption to be false — e.g., "all groups always contain at least one alias" or "callers never pass nil here." Requires a reachability probe in Step 5 before reporting.

Example ledger rows:
```
L3  parseCSV  empty input  len(rows)==0 guard absent      always reachable from callers  Class A
L5  filterPkgVulns  all groups ignored  len(newGroups)==0 guard  depends on "vuln always in ≥1 group" invariant  Class B
```

Minimum ledger coverage:
- **Normal path:** the common valid input path.
- **Boundary paths (L3):** empty/null/zero, single item, first/last item, max/min, divide/slice/index boundaries.
- **Type/name paths (L1/L2):** shadowed identifiers, dynamic dispatch, coercions, nullable values, deserialized input.
- **Callee paths (L6):** local callees returning null/None/undefined, raising, mutating arguments, or returning a different shape.
- **Control/resource paths (L5/L8):** every early return, throw/raise, catch/except, break/continue after acquisition or required post-condition. **L5 exhaustive enumeration:** when a required side-effect (audit log, metric, notification, state update) must run on every exit, verify EVERY exit path independently — `return`, explicit `raise`/`throw`, implicit raises from callees, `break`, `continue`. Name each skipped path separately in the finding; a finding that identifies only the first skipped path is incomplete. Example: "Two paths skip `audit_log.record`: (1) `return _unauthorized()` at line 3, (2) `raise BadRequest` at line 5." Note: if the skipped operation is a resource release or rollback, reclassify as L8 and apply the same exhaustive path logic there.
- **State/concurrency paths (L4/L7):** mutation during iteration, shared mutable defaults, aliases, closures, await/callback/task boundaries. For L4 also check: does the function mutate its argument AND return it (aliased-return dual contract)? For L7: does the hazard require two concurrent execution contexts — if yes it is L7, not L4 (e.g. lock-order inversion between goroutines is L7 even though it involves mutation).
  - **L4 aliased-return trap (high priority):** When a function BOTH mutates its input in-place AND returns the same object, this is an L4 finding — not a style issue. The caller may write `result = func(original)` and assume `original` is unchanged. Trace: (a) confirm mutation is in-place (e.g., `list.sort()`, `del arr[i]`, `arr[i], arr[j] = arr[j], arr[i]`); (b) confirm the function returns the SAME object (not a copy); (c) construct a Trigger showing `original` is unexpectedly modified. This is L4, not L3 or L7.
  - **L7 async interleaving (critical for asyncio/coroutines):** When shared mutable state is accessed across `await`/`yield` boundaries, the bug is L7 even if no threads are involved — asyncio coroutines interleave on a single thread via the event loop. Key indicator: a check-then-act pattern with an `await` between the check and the act. Do NOT classify asyncio interleaving as L4.
  - **L7 memory model hazards (Java/C++/Go):** For double-checked locking, volatile/atomic, happens-before: always check BOTH (a) the visibility hazard (missing volatile/atomic) AND (b) the initialization-before-publish ordering (is the object fully constructed before other threads can see it?). Two-step trace: step 1 = reordering/visibility, step 2 = consequence of observing partially-constructed object.
- **Time/locale paths (L9):** naive/aware datetime, DST, locale-sensitive parse/sort/format, implicit encoding.

Discard a candidate only after stating why it is unreachable or irrelevant. Deep-trace the normal path and the highest-risk reachable candidates first.

## Step 4: Deep-Trace Selected Execution Paths

Trace the most common execution path step by step:

```
1. [line N] [expression evaluated] → [result]
2. `name` resolves to [full qualified definition] at [file:line]
3. Arguments passed: arg1 = [value/type], arg2 = [value/type]
4. Inside [callee] at [line]: [key operation] → [result]
5. Returns [value/type] to caller at [line]
6. [line N+k] Result used as [role]
```

**Minimum thresholds** (per `../_shared/semiformal-guide.md`): ≥ 3 substantive steps and ≥ 2 location anchors. Below either threshold, downgrade the finding to Suggestion with `manual verification recommended`.

**Good trace example:**
```
1. [service.py:6] `result = charge(order)` — `charge` resolves to `payments.gateway.charge` (imported at line 1).
2. [gateway.py:3] Inside `charge`: condition `order.amount == 0` evaluates to True for this input.
3. [gateway.py:4] Returns `None` (early return; no dict constructed).
4. [service.py:7] `result['transaction_id']` evaluates `None['transaction_id']` → raises `TypeError`.
```

Then trace each selected risk path separately:

- Start with concrete input/state values, not abstract phrases like "bad input".
- Follow value origin → branch decision → callee behavior → state mutation/output.
- For loops, trace zero iterations, one iteration, and the iteration where the invariant changes.
- For async/concurrent code, name the exact boundary where another execution context can observe or mutate state.
- For **L4 aliased-return mutation**: trace what happens when the caller holds a reference to the input BEFORE the call, calls the function, then uses the original reference. Show that the original was mutated. Example trace:
  ```
  1. caller: original = [3, 1, 2]
  2. caller: result = quicksort(original)
  3. inside quicksort: arr is the SAME object as original (passed by reference)
  4. quicksort mutates arr in-place via swaps
  5. quicksort returns arr — same object
  6. caller: original is now [1, 2, 3] — mutated without caller's knowledge
  7. caller: result is original — they are the same object (result is original == True)
  ```
- For **L7 memory model**: trace two threads/goroutines/coroutines with numbered interleaving steps:
  ```
  T1-step1: thread A checks instance == null → true
  T1-step2: thread A enters synchronized, creates object
  T1-step3: JIT reorders: reference published BEFORE constructor completes
  T2-step1: thread B checks instance == null → false (sees non-null)
  T2-step2: thread B returns instance — but object.data is still null
  ```
- Stop at a confirmed safe post-condition if the candidate is not a bug; do not turn safe paths into Suggestions.

## Step 5: Identify Divergences

For each point where a premise is violated, write a finding using the five-field format (Premises → Trace → Divergence → Trigger → Remedy) with the L-code that best describes the cause.

**Severity:**
- 🔴 Critical: causes exception, data corruption, incorrect output, or security-relevant behavior in a reachable path.
- 🟡 Warning: reachable but only under uncommon inputs or a specific sequence of prior operations.
- 🟢 Suggestion: requires unusual/currently-impossible conditions, consequence is minor, or one premise is partial.

For Class A candidates: if the trace does not conclusively confirm consequence (reachability is already self-evident for Class A), downgrade to Suggestion with `manual verification recommended` or omit it. A plausible code smell without a concrete execution path is not a logic-review finding.

**Reachability gate — apply before writing any finding:**

- **Class A:** report at the assigned severity (local code is sufficient evidence).
- **Class B:** run a reachability probe first:
  1. Search for invariant enforcement — constructor, validator, schema definition, or call sites visible in current scope.
  2. Enforcement found and airtight (no code path bypasses it) → **drop the candidate; do not write a finding.** Optionally record in the report Summary: "Invariant enforced at [location] — no current bug; revisit if callers or schema change."
  3. No enforcement found → report at the assigned severity.
  4. Enforcement partial or outside current scope → report at the assigned severity, capped at 🟡 Warning, with `manual verification recommended`.

Record the probe result in the finding's Trace (not Premises) so the reader can verify the class assignment without violating the Premises checklist.

Deduplicate by root cause: if one bad callee contract creates several caller symptoms, report one L6 finding at the callee/caller contract boundary and list representative call sites in the Trace or Remedy.

**No-bug discipline:** When the user's question is framed as "does X cause bug Y?" and the trace conclusively shows Y does NOT apply (e.g., `defer` in Go runs on all exit paths so there is no lock leak), write a finding concluding **NO logic error** for Y with Premises → Trace → Divergence showing why. Do not fabricate unrelated findings to appear thorough — that undermines precision and triggers false positives. However, if the Risk Path Ledger from Step 3 surfaced a separate, concrete, reachable bug with a complete trace, report it as an independent finding; a no-bug verdict on Y does not suppress genuine findings on other risks. If the ledger produced no other findings, stop.

**Correctness parity principle:** Correctly concluding "no bug" is equally valuable as correctly finding a bug. A Logic Score 100 report with "no confirmed logic errors" is a professional, high-value output — not a failure. Do not lower evidence standards to produce findings. If every path in the Risk Path Ledger terminates at a confirmed safe post-condition, output Score 100 immediately. Record each path's safe-termination reason (≥1 sentence) but do NOT wrap safe paths as Suggestion findings.

## Step 5.5: Adversarial Red Team

For each candidate finding that survived Step 5, attempt to **disprove it** from the defender's perspective before writing the Remedy. This step reduces false positives by forcing an adversarial check.

**Three Rebuttal Questions** (answer each explicitly — do not skip):

1. **Premise rebuttal:** Does any of my premises rest on an unverified assumption? Could callers guarantee the premise through schema validation, type checking, wrapper functions, middleware, or a constructor that enforces the invariant? Search the current scope for evidence.

2. **Path rebuttal:** Is the trigger path truly reachable in production? Could an upstream guard, configuration flag, middleware filter, type system constraint, or framework convention prevent the input from ever reaching this code path?

3. **Consequence rebuttal:** Even if the divergence exists, is the consequence truly harmful? Could a downstream defense (catch/except, fallback value, retry logic, idempotency guard) neutralize the impact?

**Ruling:**
- Any question finds **conclusive evidence** (a defense locatable in code) → **withdraw the finding**. Record in Summary: "Candidate [L-code] at [location] withdrawn — defense confirmed at [defense location]."
- Any question finds **partial evidence** (indirect defense, uncertain coverage) → **downgrade to Suggestion** with `manual verification recommended`.
- All three questions find **no rebuttal evidence** → **retain at original severity**.

**Async/concurrency protection clause:** For L7 findings involving async interleaving (asyncio, goroutines, coroutines) or memory model hazards (volatile, happens-before), apply stricter rebuttal thresholds — only withdraw if the defense is an **explicit synchronization primitive** (lock, semaphore, atomic, channel, volatile). Do NOT treat the GIL, event loop single-threading, or "unlikely timing" as a defense. The GIL does not prevent asyncio interleaving; single-threaded event loops DO interleave at await points.

**Recording:** Append the rebuttal conclusion to the Trace field:
- `Rebuttal check: PASSED — no defense mechanism found in scope.`
- `Rebuttal check: DOWNGRADED — partial defense found at [location].`
- `Rebuttal check: WITHDRAWN — confirmed defense at [location].`

(Chinese: `反驳检查：已通过——范围内未发现防御机制。` / `反驳检查：已降级——在 [位置] 发现部分防御。` / `反驳检查：已撤回——在 [位置] 确认防御。`)

## Step 6: Apply Iron Law (Five-Field Discipline)

Premises, Trace, and Divergence must all be complete before writing a **Trigger** or **Remedy**.

Every finding follows five fields in order: **Premises → Trace → Divergence → Trigger → Remedy**.

### Trigger field (required for Critical and Warning; optional for Suggestion)

Provide a **concrete input or state** that triggers the bug. The trigger must be specific enough that a developer can paste it into a REPL or test to reproduce.

**Good trigger example:**
```
Trigger: remove_inactive([User(active=False), User(active=False), User(active=True)])
  Expected: returns [User(active=True)]  (1 element)
  Actual:   returns [User(active=False), User(active=True)]  (2 elements — second inactive user skipped)
```

**Bad trigger (unacceptable):**
```
Trigger: "when passing a list with inactive users"  ← too vague, cannot reproduce
```

**When a concrete trigger is difficult to construct:**
- Bug depends on external state (DB, network): describe the minimal triggering condition + mark `manual verification recommended`.
- Bug involves concurrency/timing: describe the specific thread/coroutine interleaving sequence with numbered steps.
- Completely unable to construct a trigger: **automatically downgrade to Suggestion**.

### Remedy field

**Good remedy example:** "On line 42, replace `format(self.data.year, '04d')` with `builtins.format(self.data.year, '04d')` to avoid dispatching to the module-level `format()` that expects a datetime object."

## Step 6.5: Remedy Dry-Run Verification

After writing the Remedy, mentally re-execute the Trigger input against the **fixed** code to confirm correctness. This prevents remedies that are ineffective or introduce regressions.

**Procedure (3-step minimum):**

1. **Mentally apply** the Remedy to the original code.
2. **Re-trace** the Trigger input through the fixed code (≥3 steps).
3. **Confirm** all three conditions:
   - (a) The original Divergence no longer occurs.
   - (b) No new Divergence is introduced by the fix (check boundary conditions of the fix itself).
   - (c) The happy-path behavior is preserved (the fix does not change correct behavior).

**Outcomes:**
- (a) fails → Remedy is ineffective. Rewrite before emitting.
- (b) fails → Remedy introduces a regression. Record the new risk, narrow the fix scope, and rewrite.
- (c) fails → Remedy is over-scoped. Reduce the fix to the minimal change.

**Recording:** Append to the Remedy field:
```
Dry-run: ✅ Trigger input re-traced through fix — divergence eliminated, no regression, happy path preserved.
```
(Chinese: `预演：✅ 触发输入已在修复代码中重新追踪——偏差已消除，无回归，正常路径行为保持不变。`)

If dry-run reveals a problem, record the issue and the corrected remedy:
```
Dry-run: ⚠️ Initial remedy [description] failed check (b) — [new issue]. Revised remedy applied.
```

## Step 7: Compute Score and Output

1. Start at 100. Deduct per confirmed finding (Critical −15, Warning −7, Suggestion −2).
2. Fill in the Report Template from `report-template.md`.
3. Summary: most critical finding, recommended next action, whether the logic is safe to ship.

## Step 8: Execution Verification Gate (Optional — when runtime is available)

When the environment supports code execution (CLI with shell access, sandbox, or REPL), apply this step to each **Critical** and **Warning** finding. Skip this step entirely if no runtime is available — mark findings as `unverified — no runtime available` and proceed.

**Prerequisite check:** Detect whether the target language runtime is available (e.g., `python3 --version`, `node --version`, `go version`). If unavailable, skip to output.

### 8a. Generate Minimal Reproducer Script

For each finding, generate a self-contained script based on the Trigger field:
- Include the reviewed function (or a minimal standalone version).
- Include the concrete trigger input from the Trigger field.
- Include an assertion: expected behavior vs. actual behavior.
- The script must **FAIL** (assertion error or exception) when the bug is present.

**Safety constraints:**
- The script must contain only pure computation — NO network requests, file writes, database operations, or other side effects.
- If the function depends on external state, create in-memory mocks/stubs.
- Execution timeout: 10 seconds maximum.

### 8b. Run Original Code (Confirm Bug Exists)

Execute the reproducer script against the original code.
- **Script FAILS (assertion error or expected exception):** Bug confirmed. Proceed to 8c.
- **Script PASSES:** Finding is a **false positive**. Withdraw it, remove from report, and adjust Logic Score.
- **Script errors unexpectedly (syntax error, import failure):** Script needs fixing. Retry once with corrected script. If still broken, mark `unverified — reproducer generation failed`.

### 8c. Apply Remedy and Re-run (Confirm Fix Works)

Apply the Remedy to the code in the reproducer script, then re-execute.
- **Script PASSES:** Fix verified. Mark finding as `✅ Execution-verified`.
- **Script still FAILS:** Remedy is ineffective. Revise and retry (up to 3 attempts). After 3 failures, mark `unverified — remedy needs manual review`.
- **Script throws NEW exception:** Remedy introduces regression. Revert, mark `⚠️ Remedy caused regression — manual fix recommended`.

### 8d. Update Report

Add verification status to each finding:

```
Verification: ✅ Execution-verified — reproducer FAIL → applied fix → PASS
Verification: ⚠️ Unverified — [reason]
Verification: ❌ False positive withdrawn — reproducer PASS on original code
```

(Chinese: `验证：✅ 已执行验证——复现脚本 FAIL → 应用修复 → PASS` / `验证：⚠️ 未验证——[原因]` / `验证：❌ 假阳性已撤回——复现脚本在原始代码上 PASS`)

**Example reproducer (Python, L4 mutation-during-iteration):**

```python
# 最小可复现脚本 — L4: 迭代中修改列表
class User:
    def __init__(self, active):
        self.is_active = active

def remove_inactive(users):
    for user in users:
        if not user.is_active:
            users.remove(user)
    return users

# 触发输入：两个连续的失效用户
users = [User(False), User(False), User(True)]
result = remove_inactive(users)
assert len(result) == 1, f"Expected 1 active user, got {len(result)}"
# 预期：AssertionError（bug 存在）
```
