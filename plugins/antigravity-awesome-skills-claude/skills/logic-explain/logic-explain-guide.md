# Execution Explain — Step-by-Step Guide

## Step 1: Establish Entry Point and Scenario

Confirm or infer from context:
- Which function/method/code block is the entry point?
- Which input scenario is being traced?
- What is the user trying to understand?

State explicitly at the start: "Tracing `process_payment(order, card)` for the scenario where the card is declined."

## Step 2: Build Premises

Apply the **Premises Construction Checklist** at `../_shared/semiformal-checklist.md` — Name Resolution, Type Contracts, State Preconditions, Control Flow Assumptions.

Key emphasis for explanations:
- Resolve every non-obvious name (if the user is asking how something works, they probably don't know which `format` or `sort` is being called).
- State the type of every significant variable at entry.
- Note any global or module-level state the function reads or modifies.

## Step 3: Produce the Step-by-Step Trace

Write as a numbered sequence. Goal: a reader who has never seen this code can follow exactly what happens.

- Short, active sentences: "`items.sort()` calls the list's `sort` method with no key, sorting ascending using `__lt__`."
- When crossing a function boundary: "Entering `validate_card()` at `payments.py:88`."
- When a conditional determines execution: "`if card.status == 'active'` evaluates to `False` because `card.status` is `'declined'`. Taking the else branch."
- When state changes: "`order.status` mutated from `'pending'` to `'failed'` at line 134."

**Depth calibration:**
- High-level flow: trace at function-call level, summarize internals unless relevant.
- Surprising behavior: go deep into the surprising part, even into library code.
- Debugging: trace until the unexpected behavior, then explain exactly why it occurs.

Scenario budget: stay on the single input scenario. Mention untaken branches only when they explain why the current path behaves differently than the user expects; do not trace full alternatives.

## Step 4: Highlight Non-Obvious Behavior

After the trace, explicitly call out anything a reader might not expect:
- Names that resolve differently than they look (L1 patterns)
- Implicit type coercions
- Side effects not obvious from the signature
- Conditions under which this execution path is NOT taken
- Assumptions the code makes that may not hold in all environments

Format: "Worth noting: `format()` on line 42 is NOT Python's builtin — it resolves to the module-level `format()` at line 8 of this file, which expects a datetime object."

## Step 5: Summarize Actual vs. Assumed Behavior

Close with two statements:

**What the code actually does:** A one- or two-sentence factual description revealed by the trace.

**What a casual reader might assume:** The plausible misreading the trace contradicts.

**Example:**
"What the code actually does: `save_record()` commits the transaction then logs the record ID, but if the commit fails, the log statement still executes with a stale ID.
What a casual reader might assume: logging happens after commit succeeds, so the logged ID is always valid."

## Step 6: Map to Report Template

- **Header:** Mode = `Execution Explain` / `执行解释`; omit the mode-specific score line.
- **Findings section:** Always omit — logic-explain produces no L-code findings and no Remedy. If the trace reveals a bug, note it in Step 4, recommend re-running with logic-review or logic-locate, and output a handoff block:

  ```
  **Partial trace context (carry into next skill):**
  Premises established: [list key premises from Step 2]
  Trace completed to: [last confirmed step before the bug was spotted]
  Suspected divergence: [one-sentence description — no L-code, no Remedy]
  ```

  Chinese equivalent: `**部分追踪上下文（移交至下一技能）：**` / `已建立的前提：` / `追踪进展至：` / `疑似偏差：`

- **Summary:** Place the Step-by-Step Trace (Step 3), Non-Obvious Behavior (Step 4), and Actual vs. Assumed pair (Step 5) as labeled sub-sections within Summary.
