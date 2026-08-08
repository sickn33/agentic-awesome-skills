---
name: invariant-guard
description: "Correctness-first: forces writing the function contract, loop invariant, termination argument, and edge cases BEFORE code. Catches Boyer-Moore, leftmost binary search, QuickSelect traps."
risk: safe
source: community
source_repo: morsechimwai/lemmaly
source_type: community
date_added: "2026-05-26"
author: morsechimwai
tags: [algorithms, correctness, loop-invariants, contracts, edge-cases, verification]
tools: [claude-code, antigravity, cursor, gemini-cli, codex-cli]
license: "Apache-2.0"
license_source: "https://github.com/morsechimwai/lemmaly/blob/main/LICENSE"
---

# invariant-guard — Correctness-First Coding

The model knows what a loop invariant is. It knows recursion needs a base case. It knows about empty lists, integer overflow, and the difference between `<` and `≤`. It just does not write these down before producing code, so it ships subtle correctness bugs that tests do not catch.

invariant-guard fixes the behavior. State the invariants. State the base case. State the termination argument. State the edge cases. Then write the code — and verify that the code maintains what you stated.

**Violating the letter of these rules is violating the spirit of the skill.** "I know this algorithm" is the exact rationalization that ships off-by-one and missing-postcondition bugs.

## When to Use This Skill

Use **invariant-guard** when writing or reviewing algorithms where the obvious implementation is subtly wrong:

- Postcondition stronger than the loop's natural invariant: Boyer–Moore majority, Floyd's cycle detection, leftmost vs any binary search, QuickSelect partition.
- In-place mutation with read+write pointers: dedup-in-place, partition, rotate.
- Recursion with multiple parameters or accumulator state.
- Off-by-one suspects with duplicates, empty inputs, boundary values.
- Iterative refinements that must terminate: fixed-point, Newton, EM.
- Any function where you catch yourself thinking "I know this algorithm" — the trap is usually in the contract, not the loop body.

Pairs with `lemmaly` (picks the algorithm) and `mathguard` (picks the math). Load `invariant-guard` *after* the algorithm has been chosen and *before* the loop body is written.

## The Iron Law

```text
NO LOOP OR RECURSION WITHOUT A WRITTEN INVARIANT AND TERMINATION ARGUMENT
```

If you cannot write the invariant in one sentence, you have not designed the loop. Write code anyway and you are coding by guess — and the bug will be in the case you did not enumerate.

## Non-negotiable rules

1. **Every loop gets a one-line invariant.** Before writing any loop, state in one sentence what is true at the top of every iteration. Examples:
   - "At loop top: `result` contains the sum of `a[0..i)`."
   - "At loop top: `lo ≤ target_position ≤ hi`."
   - "At loop top: `seen` contains every element processed so far; `dups` contains every element that appeared at least twice."

   If you cannot write the invariant in one sentence, you have not designed the loop yet.

2. **Every loop gets a one-line termination argument.** Name the quantity that strictly decreases (or strictly increases toward a bound) on every iteration. Examples:
   - "`hi − lo` strictly decreases each iteration."
   - "`i` increases by 1 and is bounded above by `n`."
   - "`stack.length` strictly decreases each pop; nothing pushes inside this branch."

   No termination argument, no loop.

3. **Every recursion gets an explicit base case and a measure.** Before writing a recursive function, state:
   - The base case(s) — the smallest inputs that return without recursing.
   - The measure — a non-negative integer that strictly decreases on every recursive call (e.g. `len(xs)`, `hi − lo`, `depth`, `n`).
   - The combination — how the recursive results combine into the answer.

   No base case + measure, no recursion. (Mutual recursion: state the measure across the cycle.)

4. **List edge cases before writing, not after.** For every function operating on a collection or number, list which of these apply and how they behave:
   - Empty input (`[]`, `""`, `null`, `undefined`, `None`).
   - Singleton (`[x]`).
   - All-equal elements.
   - Already-sorted / reverse-sorted input.
   - Duplicates (when uniqueness is assumed).
   - Negative numbers, zero, exactly the boundary value.
   - Integer overflow / underflow at the type max/min.
   - NaN, ±Infinity, `-0`, denormals (for floats).
   - Off-by-one boundaries: index 0, index n−1, index n, length 0, length 1.
   - Concurrent modification while iterating.

   The cases that apply must each have a one-phrase expected behavior written down.

5. **Make illegal states unreachable, not just unhandled.** Prefer encoding constraints in types and structure so the wrong state cannot be constructed:
   - Sum type over boolean flag soup (`Loading | Loaded(data) | Error(msg)` not `{loading, data, error}`).
   - Newtype for IDs that must not be swapped (`UserId` vs `OrderId`).
   - Non-empty list type when the function requires at least one element.
   - Parsed value at the boundary, not validated repeatedly downstream (parse-don't-validate).

   If the language cannot encode it, write the invariant as a comment and assert it at the boundary.

## The pre-write protocol

Before producing non-trivial code that has loops, recursion, or non-trivial state, your message must contain — in this order:

1. **Function contract** — preconditions, postconditions, and what the function returns. One line each.
2. **Loop invariants** — one per loop. (Rule 1.)
3. **Termination arguments** — one per loop or recursion. (Rules 2, 3.)
4. **Base cases and measure** — for recursion. (Rule 3.)
5. **Edge case table** — bullets, one per applicable case, with expected behavior. (Rule 4.)
6. **Illegal states made unrepresentable** — name the types or asserts that enforce invariants. (Rule 5.)
7. **The code.**
8. **Self-check** — one line per loop confirming the invariant holds at top, body preserves it, and exit implies postcondition.

If any of 1–6 is missing, do not emit code.

## Worked trap — Boyer–Moore majority vote

This is the canonical "the trap is in the contract, not the loop body" case.

**Naive baseline (what gets shipped without the skill):**

```typescript
function findMajority(arr: number[]): number | null {
  if (arr.length === 0) return null;
  let candidate = arr[0], count = 0;
  for (const x of arr) {
    if (count === 0) candidate = x;
    if (x === candidate) count++; else count--;
  }
  return candidate;   // BUG: returns the candidate even when no majority exists
}
```

This implementation fails on `[1,2,3]` (returns `3`, expected `null`) and `[2,2,1,1]` (returns `1`, expected `null`). The voting loop is correct; the postcondition is wrong.

**Why the protocol catches it.** Writing **step 1 (function contract)** forces the postcondition in plain language:

> Returns `x` iff `count(x, arr) > arr.length / 2`; else `null`.

Then writing **step 2 (loop invariant)** forces the invariant of the voting pass:

> If a strict majority element exists in `arr`, it equals `candidate` when the loop exits.

These two statements are not equivalent. The loop invariant guarantees "if a majority exists, it is the candidate" — not "the candidate is a majority." Once you write both down, the gap is visible: you need a second pass to verify, or the postcondition is unmet.

**Correct implementation that survives the protocol:**

```typescript
function findMajority(arr: number[]): number | null {
  if (arr.length === 0) return null;
  // Pass 1: vote.
  let candidate = arr[0], count = 0;
  // inv: if a strict majority exists in arr, it equals candidate at every count===0 reset.
  for (const x of arr) {
    if (count === 0) candidate = x;
    if (x === candidate) count++; else count--;
  }
  // Pass 2: verify — the voting invariant is strictly weaker than the postcondition.
  let tally = 0;
  // inv: tally = count of candidate in arr[0..i).
  for (const x of arr) if (x === candidate) tally++;
  return tally * 2 > arr.length ? candidate : null;
}
```

**Pattern to generalize.** The same trap appears in:

- **Floyd's cycle detection** — finding the meeting point tells you a cycle exists, *not* where it starts. You need a second walk.
- **Two-pointer "find any"** vs **"find leftmost"** — the loop invariant for one does not satisfy the postcondition of the other.
- **QuickSelect partition** — the loop returns a position; the postcondition is that the element at that position is the k-th smallest. Off by one in the partition invariant silently breaks it.
- **DP with reconstruction** — the table tells you the optimum value; reconstructing the optimum path needs separate invariants on the choice array.

In every case: **write the postcondition first; write the loop invariant second; check that the second implies the first. If not, you are missing a pass, a check, or an auxiliary state.**

## Canonical example — binary search for the leftmost match

Most "I know binary search" implementations are written for "find any match." The trap is the postcondition.

**Problem.** Given a sorted array with duplicates, return the index of the **leftmost** occurrence of `target`, or `-1`.

### Without the protocol — returns any match

```ts
function leftmost(a: number[], target: number): number {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;       // returns ANY occurrence
    if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}
// leftmost([1,2,2,2,3], 2) → may return 2, not 1
```

The loop invariant ("target lies in `a[lo..hi]` if anywhere") is satisfied. But the postcondition ("returned index is the *smallest* `i` with `a[i] === target`") is strictly stronger. The loop body's early return abandons the search before reaching the leftmost.

### With the protocol — contract-driven leftmost

```ts
function leftmost(a: number[], target: number): number {
  // contract:
  //   pre:  a is sorted ascending
  //   post: returns smallest i with a[i] === target, or -1 if absent
  let lo = 0, hi = a.length;                 // half-open [lo, hi)
  // inv: every index < lo has a[i] < target; every index ≥ hi has a[i] > target OR is past leftmost match
  // term: hi - lo strictly halves each iteration
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < target) lo = mid + 1; else hi = mid;
  }
  // exit: lo === hi, and by invariant lo is the leftmost index where a[lo] >= target
  return lo < a.length && a[lo] === target ? lo : -1;
}
```

Same loop shape. The difference is the contract was written first — and the loop body was chosen to maintain an invariant that *implies* the postcondition.

## Common invariant patterns to reach for

| Loop / algorithm shape | Canonical invariant | Termination |
|---|---|---|
| Linear scan accumulating | `acc = f(a[0..i))` at top | `i` increases by 1, bounded by `n` |
| Two-pointer (sorted) | `target (if any) lies in a[lo..hi]` | `hi − lo` strictly decreases |
| Binary search | `target (if present) ∈ a[lo..hi]` and `a[lo..hi]` non-empty | `hi − lo` strictly halves |
| Sliding window | window `[l..r)` satisfies the constraint; answer ≥ best so far | `r` advances at least once per outer iter |
| BFS | every node at distance < d has been popped; queue contains some at distance d | strict node count decrease per pop |
| DFS / recursion on tree | result for subtree rooted at v = combine(children results) | depth (or remaining nodes) strictly decreases |
| Divide and conquer | result on `a[lo..hi]` = combine(results on the two halves) | `hi − lo` strictly halves |
| Greedy with priority queue | extracted item is globally optimal for the remaining problem | heap size strictly decreases per extract |
| Union-Find op | `find(x)` always returns the canonical root of x's component | tree height bounded by O(log n) (with rank) |
| In-place partition | `a[0..i)` < pivot; `a[i..j)` ≥ pivot; `a[j..n)` unseen | `n − j` strictly decreases |

## Edge case table — defaults to consider

| Input shape | Cases to check |
|---|---|
| Array / list | empty, singleton, all-equal, sorted, reversed, with duplicates |
| String | empty, single char, all whitespace, unicode (surrogates, combining), bytes vs code points |
| Integer | 0, 1, −1, MIN, MAX, MAX − 1, near overflow in arithmetic, division by 0 |
| Float | 0.0, −0.0, NaN, ±Inf, denormal, exact comparison should be ε-based |
| Map / dict | empty, missing key (default vs error), key collision semantics |
| Tree / graph | empty, single node, cycle (if undirected), self-loop, multigraph, disconnected |
| Stream / iterator | empty, infinite, single yield, exception mid-iteration |
| Time / date | DST transition, leap second/day, timezone offset, epoch boundary |
| Concurrent | empty contention, single thread, max contention, cancellation mid-op |

## Output discipline

Code you emit must:

- Have one comment per loop stating the invariant (use `// inv:` or `# inv:`).
- Have one comment per recursion stating the base case and measure.
- Handle every edge case you listed in step 5, or explicitly delegate ("throws on empty — caller responsibility").
- Assert preconditions at function entry when the language supports it cheaply.
- Use types (sum types, newtypes, non-empty, non-null) over runtime checks where the language allows.

## When to escalate or redirect

- The function is performance-critical and you have not picked the algorithm — go back to **`lemmaly`** first; pick the algorithm, then state its invariants here.
- The technique is mathematical (probabilistic, FFT, geometry) — load **`mathguard`**; invariants for approximate algorithms include ε-bounds, not equality.
- The code is concurrent — invariants must account for interleaving; explicitly state "single-threaded only" if that is the assumption.

## Rationalizations to watch for

| Excuse | Reality |
| --- | --- |
| "I know this algorithm — single pass, done." | Knowing the loop ≠ knowing the contract. The trap usually lives in the postcondition the loop does not enforce. |
| "I traced it in my head, it works." | Mental tracing skips edge cases. Write the invariant; check it implies the postcondition. |
| "Edge cases are obvious." | Then write them down in 30 seconds. If they are obvious, the table is cheap. If they are not, the table just saved you. |
| "Tests will catch it." | Tests catch the examples you thought of. The trap is the example you did not. Postconditions catch all examples. |
| "The postcondition is implied." | If it were, the natural loop invariant would equal it. When they differ (Boyer–Moore, leftmost search, QuickSelect), you need a second pass, an extra check, or auxiliary state. |
| "Adding a verification pass feels redundant." | Boyer–Moore voting + verification is still O(n). "Feels redundant" is the rationalization that ships the bug. |

## Red flags — STOP and write the invariant first

- About to write `while (...)` without having stated what is true on entry.
- About to write `if (i === n − 1)` or `if (i === n)` — boundary suspicious, restate the invariant.
- About to recurse without naming the base case in this message.
- About to write `// TODO: handle empty` — handle it now or change the type so empty is impossible.
- About to use `==` on floats.
- About to compare across signed/unsigned or across types where overflow rolls.
- About to silently swallow an error in the middle of a loop ("just continue").
- Tests pass but you did not actually state what the function guarantees.
- "It works on the examples I tried."

## Verification checklist

Before claiming the function is correct:

- [ ] Every loop has a one-line `// inv:` comment in code.
- [ ] Every loop has a termination argument written down (in comment or PR description).
- [ ] Every recursion names its base case and measure in code.
- [ ] The function's postcondition is written and is implied by the exit state of the last loop.
- [ ] Every applicable edge case from the table has a test or an explicit "delegated to caller" note.
- [ ] At least one test exercises each non-trivial boundary (empty, singleton, max, off-by-one).
- [ ] Illegal states the function rejects are either unrepresentable in the type, or asserted at entry.
- [ ] For approximate/randomized algorithms (escalated to mathguard): ε-bounds are part of the postcondition, not equality.

Cannot check every box? The code is example-correct, not behavior-correct. Either fill the gap or downgrade the function's claimed contract.

## Limitations

- **Not an automated prover.** invariant-guard requires the author to *write* invariants; it does not mechanically check them. Pair with property-based tests for stronger evidence.
- **Concurrency is out of scope by default.** Stated invariants assume single-threaded execution unless explicitly extended; multi-threaded reasoning needs additional happens-before / linearizability arguments.
- **Float and overflow edge cases are language-specific.** The edge-case table is a checklist, not a substitute for understanding your language's numeric semantics.
- **Will slow down trivial code.** For one-liners that obviously cannot fail, the protocol is overhead; reserve it for non-trivial loops, recursion, and in-place mutation.
- **Documentation is the only enforcement.** If the author skips writing the invariants, this skill cannot detect that — pair with code review or a PR template that asks for the contract.

## The thesis, in one line

> **Tests verify examples. Invariants verify behavior. AI assistants ship example-correct, behavior-wrong code by default. invariant-guard makes them reason about behavior first.**

## Related Skills

- `lemmaly` — algorithm choice must be settled before invariants; load lemmaly first if the algorithm family is unclear.
- `mathguard` — ε-bounded postconditions for approximate / randomized algorithms.
- `complexity-cuts` — if 3+ optimization transformations have failed tests, the bug is a missing contract, not a missing optimization — escalate here.
