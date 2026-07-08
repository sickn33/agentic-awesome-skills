# Semantic Diff — Step-by-Step Guide

## Step 1: Identify the Shared Specification

Two versions are semantically equivalent if they produce identical behavior for all inputs in the shared specification. Establish it:
- What inputs are both versions expected to handle?
- What outputs or side effects should both produce?
- Are there inputs one version handles that the other doesn't? (This may itself be the divergence.)

If the user hasn't stated the spec, derive it from shared tests, the commit message/PR description, or the function's documented contract. State the derived specification explicitly.

## Step 2: Build Independent Premises for Each Version

Apply the full **Premises Construction Checklist** at `../_shared/semiformal-checklist.md` to Version A and Version B **separately**:
- Name resolution: same identifier, same resolution in both?
- Type contracts: same type assumptions at call sites?
- State preconditions: same preconditions required?
- Control flow: same branches for same inputs?

This step often surfaces the divergence before the trace begins — a renamed import, a changed conditional, a different default value.

## Step 3: Trace Both Versions for the Common Case

```
Scenario: [describe the input]

Version A — Trace:
1. [step]
2. [step]
Result: [value / side effect]

Version B — Trace:
1. [step]
2. [step]
Result: [value / side effect]

Verdict: [Equivalent / Divergent at step N]
```

If both produce the same result, proceed to Step 4. If they diverge, jump to Step 5.

## Step 4: Trace Boundary Cases

Rank boundary conditions by how likely they are to expose a behavior change, then trace Version A and B separately for the top scenarios:
- Empty/null/zero inputs (catches L3 divergences)
- Maximum values (integer overflow in one version but not the other)
- Error inputs (which version raises, which returns a default?)
- First and last elements of collections (off-by-one in one version)

Default budget: trace the common case plus at most three boundary scenarios. Expand only when the user asks for exhaustive comparison, the shared specification names more required cases, or a traced path exposes a new boundary that must be confirmed.

## Step 5: Identify Semantic Divergences

A semantic divergence is any scenario where A and B produce different behavior. Classify each:
- Bug in A corrected in B (intended)
- Regression: B breaks something A handled (unintended)
- Behavioral change: both work, but differently — user must decide which is correct
- Scope expansion: B handles inputs A didn't

For each divergence, write a five-field finding (Premises → Trace → Divergence → Trigger → Remedy) with the L-code that best describes the cause.

## Step 6: Classify Equivalence

- **✅ Semantically Equivalent:** No divergence found for all traced scenarios.
- **⚠️ Conditionally Equivalent:** Equivalent for all common cases; diverges only when [specific condition — state precisely].
- **❌ Semantically Divergent:** Confirmed behavioral difference at [location] for [scenario].

Note: "No divergence found" is not "provably equivalent." State which scenarios were traced and acknowledge untested scenarios may still diverge.

## Step 7: Output

Use the Report Template from `report-template.md`. Replace Logic Score with the equivalence verdict. In Summary:
1. The verdict
2. The most significant divergence (or "no divergences found under traced scenarios")
3. Any untraced scenarios that should be verified manually
