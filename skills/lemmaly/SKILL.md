---
name: lemmaly
description: "Algorithm-first discipline: state Big-O, data structure, and algorithm family BEFORE writing loops, queries, or recursion. Catches O(n^2), N+1, and brute-force defaults."
risk: safe
source: community
source_repo: morsechimwai/lemmaly
source_type: community
date_added: "2026-05-26"
author: morsechimwai
tags: [algorithms, big-o, performance, code-review, complexity, gateway]
tools: [claude-code, antigravity, cursor, gemini-cli, codex-cli]
license: "Apache-2.0"
license_source: "https://github.com/morsechimwai/lemmaly/blob/main/LICENSE"
---

# lemmaly — Algorithm-First Proof

The model already knows Big-O, hash tables, divide-and-conquer, dynamic programming, sorting, graph algorithms, and amortized analysis. It just does not apply them spontaneously. lemmaly fixes the behavior, not the knowledge.

This skill is the gateway for an algorithm-discipline suite of four skills (`lemmaly`, `mathguard`, `invariant-guard`, `complexity-cuts`). It enforces the hard rules that every other guard in the suite assumes.

**Violating the letter of these rules is violating the spirit of the skill.** "Just this once" is how O(n²) ships to production.

## When to Use This Skill

Use **lemmaly** when:

- Writing, editing, or reviewing code that involves loops, collections, lookups, searches, joins, recursion, graphs, queries, or any computation over more than a handful of items.
- About to write a `for` inside a `for`, `.find` / `.includes` / `.indexOf` inside a loop, `await` inside `for` / `map` / `forEach` over independent items, or one query per item in a collection.
- Auditing a codebase / PR for known anti-patterns (await-in-loop, `.includes` inside `.filter`, string-concat in loop, `SELECT *`, N+1, etc.).
- Reviewing AI-generated code that "looks idiomatic" but might hide O(n²) or N+1.

When in doubt, **start at lemmaly** — it is the gateway and will tell you when to escalate to its three sibling skills.

| If you are about to… | Use | Why |
| --- | --- | --- |
| Write *new* code that loops, queries, joins, recurses, or processes a collection | **lemmaly** | Forces complexity + data structure + algorithm family **before** code is written. |
| Refactor *existing* code that is already slow, OOMs, times out, or has nested loops / N+1 / repeated work | **complexity-cuts** | Corrective playbook for code that already shipped with bad Big-O. |
| Implement an algorithm where the obvious version is subtly wrong (binary search variants, in-place dedup, Boyer–Moore, QuickSelect partition, recursion with accumulators, fixed-point / termination concerns) | **invariant-guard** | Forces writing the function contract + loop invariant before code. The trap is in the contract, not the loop body. |
| Work with n ≥ 10⁶, similarity search, dedup at scale, top-K, streaming analytics, cardinality estimation, embeddings, FFT/NTT, dimensionality reduction, computational geometry, randomized algorithms | **mathguard** | Classical algorithms have hit their lower bound; an approximate or math-heavy technique (Bloom, HLL, Count-Min, MinHash/LSH, FFT, JL projection, sweep line, kd-tree) gives the asymptotic win. |

### Routing flow

```text
Are you writing new code?
├── yes → lemmaly (state complexity, structure, family BEFORE coding)
│         ├── classical algorithm at its lower bound AND n is large? → mathguard
│         └── subtle correctness trap (invariant, base case, off-by-one)? → invariant-guard
└── no, refactoring existing slow / OOM / timed-out code → complexity-cuts
          └── still slow after classical fixes? → mathguard
```

### One-line mental model

- **lemmaly** = think first (prevention).
- **complexity-cuts** = clean up bad Big-O (correction).
- **invariant-guard** = prove it's correct (verification).
- **mathguard** = beat the classical floor (acceleration).

## The Iron Law

```text
NO NON-TRIVIAL CODE WITHOUT STATED COMPLEXITY, DATA STRUCTURE, AND ALGORITHM FAMILY
```

Before you write a loop, a recursion, a query, or any computation over more than a handful of items, three things must appear in your message — in this order:

1. `time = O(?)`, `space = O(?)`, with the dominant input dimension named.
2. The data structure you will use, with a one-phrase reason.
3. The algorithm family (one of: linear scan, two-pointer, sliding window, binary search, sort+sweep, hash join, BFS/DFS, topo sort, Dijkstra/A*, union-find, DP, greedy, recursion+memo, prefix sum, segment tree, monoid reduction).

If you cannot state all three, you do not understand the problem yet. Ask, or read more code. Do not write code.

## Non-negotiable rules

1. **State complexity before writing any non-trivial code.** In one line:
   - `time = O(?)`, `space = O(?)`
   - Dominant input dimension: `n = what`, with realistic magnitude (e.g. `n ~ 10^6 rows`)
   - If you cannot state these, you do not yet understand the problem. Ask, or read more code.

2. **Name the data structure with a one-phrase reason.** Every collection-shaped value gets a deliberate choice from `Array / List / Set / HashMap / TreeMap / Heap / Deque / Trie / Graph / BitSet / Counter / LinkedList` — with the reason: "Set for O(1) membership inside the loop", "Heap for top-K in O(n log k)", "Counter to fold the nested loop into a single pass". Default to hashed structures (`Set`, `Map`) for lookup inside loops. Default to streaming/iterator over materialized list when n is large.

3. **Identify the algorithm family before writing.** Name one of: `linear scan`, `divide and conquer`, `two-pointer`, `sliding window`, `binary search`, `sort + sweep`, `hash join`, `BFS/DFS`, `topological sort`, `Dijkstra/A*`, `union-find`, `dynamic programming`, `greedy`, `recursion + memoization`, `prefix sum`, `segment tree`, `monoid reduction`. If you cannot name a family, you are about to write brute force. Stop and reconsider.

4. **Repeated work in loops is algorithmic waste.** All of these are presumed wrong until justified:
   - I/O inside a loop (database queries, HTTP calls, file reads) — batch with `IN (...)`, `Promise.all`, bulk endpoints, streaming
   - Recomputing the same value in a loop — hoist or memoize
   - Re-sorting / re-grouping inside a loop — sort once outside
   - Linear scan (`.find`, `.indexOf`, `.includes`, `in list`) inside a loop — precompute an index `Map`
   - Allocating fresh structures per iteration when one can be reused — hoist allocation
   - Materializing intermediate collections only to iterate again — fuse into one pass

   If you must do any of these inside a loop, write one comment line explaining why.

5. **No invented complexity or numbers.** Never write "O(log n) on average" without an argument. Never write "10x faster" or "~3ms" without measuring. If you cannot derive the complexity, write `<complexity: TBD>`. If you have not measured, write `<measured: TBD>`. Move on.

## The pre-write protocol

Before producing non-trivial code, your message must contain — in this order:

1. **Problem shape** — one sentence. ("Given n events with a timestamp, find the longest contiguous window where total weight ≤ K.")
2. **Input dimensions** — `n = ?`, realistic magnitude, whether hot path.
3. **Target complexity** — `time = O(?)`, `space = O(?)`.
4. **Data structures** — name them with a phrase each.
5. **Algorithm family** — one phrase.
6. **Edge cases you will handle** — empty, singleton, all-equal, n=1, n=max, overflow, duplicates. List the ones that apply.
7. **The code.**

If any of 1–6 is missing, do not emit code yet.

## Canonical example — protocol vs no-protocol

The same problem with and without the seven-step protocol.

**Problem.** Given `users: User[]` and `bannedIds: string[]`, return users whose `id` is not banned. Realistic n: 50k users, 5k banned.

### Without the protocol — ships O(n·m)

```ts
// Looks idiomatic, ships O(n·m)
const active = users.filter((u) => !bannedIds.includes(u.id));
```

`bannedIds.includes` is O(m) per call. The filter runs it n times → 50k × 5k = 250M comparisons.

### With the protocol — O(n + m)

```ts
// Protocol applied:
//   time = O(n + m), space = O(m), n = 50k users, m = 5k banned
//   structure: Set<string> for O(1) membership inside the loop
//   family: linear scan with hashed lookup
//   edge cases: empty users → [], empty bannedIds → users, duplicates in bannedIds → fine (Set dedupes)
const banned = new Set(bannedIds);
const active = users.filter((u) => !banned.has(u.id));
```

The first version is the default an AI ships when asked "filter the active users." The second is what the protocol forces — without changing how the code reads.

## Rule catalog (the lemmaly scanner)

The upstream repo ships a deterministic CLI scanner with the same anti-patterns this skill enforces (**59 rules across 11 languages**: JavaScript/TypeScript, Python, SQL, Java, C#, C++, Go, Rust, PHP, Ruby, Shell/Bash). Each rule has a documented why, an incorrect example, a correct example, and the sibling skill to escalate to.

The scanner is optional. Do not automatically clone and run the upstream
repository from its default branch, because that executes whatever code is
current in a third-party repository. If the user explicitly wants the scanner,
pin the source to a reviewed release tag or commit, use a throwaway directory,
and show the resolved commit before running it:

```bash
# Replace <reviewed-tag-or-commit> after reviewing the upstream release.
tmpdir="$(mktemp -d)"
git clone --filter=blob:none https://github.com/morsechimwai/lemmaly.git "$tmpdir/lemmaly"
git -C "$tmpdir/lemmaly" checkout --detach <reviewed-tag-or-commit>
git -C "$tmpdir/lemmaly" rev-parse HEAD
node "$tmpdir/lemmaly/cli/lemmaly.js" scan <path>
node "$tmpdir/lemmaly/cli/lemmaly.js" rules
```

When the scan is done, remove the throwaway directory only after verifying that
`$tmpdir` points to the directory created by `mktemp -d`.

**CRITICAL severity (error in CI):**

- `js-await-in-for-loop` — N+1 over network
- `js-async-in-foreach` — dropped promises
- `py-mutable-default-arg` — shared default state
- `sql-update-no-where` — touches every row
- `java-arraylist-remove-in-for-i` — index shifts; ConcurrentModification
- `cs-async-void` — exceptions unobserved; crashes the process
- `go-loop-var-capture` — pre-1.22 race on the last value
- `php-query-in-loop` — N+1 against the database

**HIGH severity (warning in CI):** `js-deep-clone-via-json`, `js-useeffect-missing-deps`, `js-inline-object-jsx-prop`, `js-anonymous-handler-jsx`, `js-spread-in-reduce`, `js-unique-via-indexof`, `js-helper-call-in-iterator`, `py-string-concat-in-loop`, `py-django-loop-without-eager`, `py-bare-except`, `sql-select-star`, `sql-leading-wildcard-like`, `sql-not-in-subquery`, `java-string-concat-in-loop`, `java-list-contains-in-loop`, `java-bare-catch-exception`, `cs-string-concat-in-loop`, `cs-list-contains-in-loop`, `cs-disposable-no-using`, `go-string-concat-in-loop`, `go-defer-in-loop`, `go-err-not-checked`, `rs-unwrap-in-prod`, `cpp-string-concat-in-loop`, `cpp-raw-new`, `php-count-in-for-condition`, `php-in-array-in-loop`, `rb-include-in-iterator`, `rb-n-plus-one-activerecord`, `rb-bare-rescue`, `sh-set-e-no-pipefail`, `sh-unquoted-var`, `sh-for-ls`.

**MEDIUM severity (info in CI):** `js-nested-for-loops`, `js-includes-in-iterator`, `js-array-key-index`, `py-range-len`, `py-in-list-literal`, `py-open-without-with`, `sql-select-no-limit`, `sql-or-in-where`, `go-slice-append-no-cap`, `rs-clone-in-loop`, `rs-vec-push-no-capacity`, `rs-string-push-no-capacity`, `cpp-vector-push-no-reserve`, `cpp-range-loop-copy`, `cpp-map-double-lookup`, `php-loose-equality`, `rb-string-concat-in-loop`, `sh-useless-cat-pipe`.

## When to escalate to sibling skills

lemmaly handles classical, day-to-day algorithmic discipline. Escalate when:

- **Math-level optimization** (probabilistic data structures, FFT, dimensionality reduction, approximation algorithms, computational geometry) — load **mathguard**.
- **Algorithm correctness** (loop invariants, termination, recursion base cases, edge cases that tests miss) — load **invariant-guard**.
- **Existing code with bad complexity that already shipped** — load **complexity-cuts** for the corrective transformation playbook.

## Rationalizations to watch for

These are real verbatim thoughts captured from controlled tests where the model shipped O(n·m) code that the seven-step protocol would have prevented:

| Excuse | Reality |
| --- | --- |
| "`.filter` then `.reduce` is the idiomatic way, ship it." | Idiomatic ≠ correct asymptotic. Idiom-driven coding is how O(n²) ships. |
| "It's fine for now, we can optimize later." | Later is a different engineer with no context. State the complexity now. |
| "I'll just use `Array.find` here, it's just one lookup." | One lookup inside a loop over `n` items is `O(n)` lookups. Make the `Map` outside. |
| "The data is small in dev — I'll worry about scale when we ship." | Production data is never the size of dev data. The seven-step protocol takes 30 seconds. |
| "I already understand the problem, the protocol is overhead." | The cases the protocol "wastes time on" are the cases that break in prod. |

If any of these sound familiar mid-thought: stop, write the seven steps.

## Red flags — STOP and restart the protocol

- About to write a `for` inside a `for` without first stating it is the intended O(n·m).
- About to call `.find` / `.includes` / `.indexOf` inside a loop body.
- About to `await` inside `for` / `map` / `forEach` over independent items.
- About to issue one query per item in a collection.
- About to recurse without stating the base case or memoization plan.
- About to write code without having stated complexity.
- About to claim "this is fast" / "this is efficient" / "this scales" without a derivation.
- About to copy a brute-force solution from memory because it "should work for now".

All of these mean: stop, restart the seven-step protocol, choose a better algorithm or explicitly accept the brute force with a written justification.

## Verification checklist

Before claiming the implementation is done:

- [ ] Stated `time = O(?)` and `space = O(?)` appear in the message or PR description.
- [ ] Dominant input dimension is named with a realistic magnitude.
- [ ] Every collection-shaped value has a deliberate data-structure choice with a one-phrase reason.
- [ ] The algorithm family is named (not "a loop").
- [ ] No I/O, `.find` / `.includes` / `.indexOf`, regex compile, sort, or independent `await` sits inside a loop without a one-line justification.
- [ ] The shipped code matches the complexity that was claimed (re-derive if uncertain).
- [ ] Edge cases listed in the pre-write protocol each have a corresponding code path or test.
- [ ] Any "fast" / "efficient" / "scales" claims have either a derivation or a measurement — `<measured: TBD>` is acceptable; an unsupported claim is not.

Cannot check every box? You did not run the protocol. Restart from step 1.

## Limitations

- **Not a substitute for profiling.** lemmaly forces asymptotic reasoning, not measurement. For constant-factor wins, latency tails, or I/O bottlenecks you still need a profiler.
- **Reasoning gate, not a code generator.** This skill changes how the model thinks before writing; it does not auto-rewrite existing code (use `complexity-cuts` for that).
- **English-language enforcement.** The rule catalog and prompts are English-only.
- **n < ~10 is exempt.** The protocol explicitly accepts trivial collections and one-shot setup code; do not waste time stating complexity for `for i in range(3)`.
- **Cannot prevent intentional brute force.** If the author writes a one-line justification ("n ≤ 100 in practice; readability matters more"), brute force ships. The skill only requires the justification, not its absence.
- **CLI scanner is separate.** The 59 rules are enforced by `lemmaly scan` in the upstream repo, not by this SKILL.md alone.

## The thesis, in one line

> **AI ships algorithmically lazy code by default. lemmaly makes it think first.**

## Related Skills

- `mathguard` — escalation for n ≥ 10⁶ where classical O(n log n) is the floor and probabilistic / math-heavy techniques win.
- `invariant-guard` — correctness layer for algorithms whose obvious version is subtly wrong.
- `complexity-cuts` — corrective playbook for code that already shipped with bad Big-O.
