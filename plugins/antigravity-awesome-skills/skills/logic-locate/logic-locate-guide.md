# Fault Locate — Step-by-Step Guide

## Step 1: Understand the Failure

Characterize it precisely:
- **Observed behavior:** exact error message, wrong output value, or symptom
- **Expected behavior:** from the test assertion, documentation, or user description
- **Reproduction path:** which inputs, environment, sequence of operations

If a stack trace is available, note the innermost frame (actual crash point) separately from the function that caused it (which may be higher in the stack).

## Step 2: Identify the Entry Point

Start from the closest code entry point to the failure:
- Failing test → the test function
- Stack trace → the outermost **application** frame (not a library frame)
- Described symptom ("API returns 500") → the request handler

Do not start from `main()` — start from the function closest to the failure.

Start inside the **failure cone**:
- Stack trace frames from application code
- The failing test and fixtures directly setting up the failing state
- Local callees reached by the failing path
- Config/env values read by those frames

Do not inspect unrelated modules, alternative endpoints, or neighboring tests unless the backward trace reaches them.

## Step 3: Trace Backward from the Failure Point

Working from the failure site, trace backward: "Where did this value/state come from?"

At each step:
- Follow the value to its origin: declaration, assignment, callee return, external state
- Build premises: what was assumed about this value? What is its actual value?

**Minimum thresholds** (per `../_shared/semiformal-guide.md`): ≥ 3 substantive hops and ≥ 2 location anchors. Otherwise downgrade Fault Confidence to Low.

**Good backward trace:**
```
Symptom: TypeError at service.py:7 — 'NoneType' object is not subscriptable on `result['transaction_id']`.
←1. [service.py:7] `result` came from line 6.
←2. [service.py:6] `result = charge(order)`; `charge` resolves to `payments.gateway.charge`.
←3. [gateway.py:3-4] `charge` returns None when `order.amount == 0`; all other paths return a dict.
←4. Failing test passes an order with `amount == 0`.
Root: gateway.py returns None on amount==0; service.py assumes dict unconditionally — L6.
```

## Step 4: Trace Forward to Confirm

From the suspected fault location, trace forward:
- Does execution reach the failure site?
- Does the fault produce exactly the observed symptom?

If yes, the hypothesis is confirmed. If not, revise — the actual fault may be earlier or in a different branch.

## Step 5: Interprocedural Tracing

If the backward trace implicates a callee, trace into it:
- Does the callee return `None` under the observed conditions?
- Does the callee raise an exception the caller doesn't handle?
- Does the callee mutate shared state affecting the caller's subsequent behavior?

The fault is often not in the function being looked at — it is in a callee that doesn't behave as assumed (L6), or in a name that resolves differently (L1).

Depth budget: follow the concrete failing path first and stop after the root cause is confirmed. If more than four local calls are required, state the remaining call-chain assumption and downgrade Fault Confidence unless a test or stack trace directly confirms the deeper hop.

## Step 6: Identify the Root Divergence

State precisely:
- The specific line/expression where the divergence **originates** (not the crash site — the cause of the crash)
- The premise that was violated
- The actual value or behavior
- Why this propagated to the observed failure

Contributing Factors: conditions that enabled the fault (not findings themselves, but context for the fix).

## Step 7: Classify and Output

1. Assign the L-code (L1–L9) that best describes the root fault.
2. Assess Fault Confidence:
   - **High:** trace fully confirms — Premises→Trace→Divergence form a complete chain from cause to symptom.
   - **Medium:** trace strongly implicates, but one step rests on an unverified assumption.
   - **Low:** plausible fault, but alternative causes cannot be ruled out without execution.
3. Output: Primary Fault (five-field finding for root cause) + Contributing Factors + Remedy.
