---
name: mathguard
description: "Math-heavy escalation for n >= 10^6 — Bloom, HyperLogLog, Count-Min, MinHash/LSH, FFT, JL projection, sweep line. Use when classical O(n log n) is the floor and approximate or math wins."
risk: safe
source: community
source_repo: morsechimwai/lemmaly
source_type: community
date_added: "2026-05-26"
author: morsechimwai
tags: [algorithms, probabilistic-data-structures, approximate-algorithms, bloom-filter, hyperloglog, fft, performance]
tools: [claude-code, antigravity, cursor, gemini-cli, codex-cli]
license: "Apache-2.0"
license_source: "https://github.com/morsechimwai/lemmaly/blob/main/LICENSE"
---

# mathguard — Math-Heavy Optimization for AI Code

`lemmaly` makes you pick the right classical algorithm. `mathguard` kicks in when the classical algorithm is already optimal but **mathematics gives a better bound** — usually by accepting bounded approximation, exploiting structure, or moving to a smarter algebraic space.

The model knows these techniques. It almost never proposes them spontaneously. mathguard fixes that.

**Violating the letter of these rules is violating the spirit of the skill.** A Bloom filter where the caller assumed exact answers is a production incident, not an optimization.

## When to Use This Skill

Use **mathguard** when:

- Working with large-scale data (`n ≥ 10⁶`): similarity search, deduplication, top-K / heavy-hitters, streaming analytics, cardinality estimation, embeddings, recommender systems.
- Doing signal/image processing, polynomial or big-integer arithmetic, convolution, graph distance, computational geometry, randomized algorithms.
- The classical O(n log n) is already the floor and you need an asymptotic win (Bloom filter, HyperLogLog, Count-Min Sketch, MinHash/LSH, FFT/NTT, Johnson-Lindenstrauss projection, sweep line, kd-tree/BVH, fast exponentiation, monoid parallel reduction, amortized potential method).
- Loaded *after* `lemmaly` has confirmed the classical answer is not enough.

Do **not** use mathguard when:
- The caller needs exact answers (auth, billing, dedup-for-correctness, primary keys).
- `n` is small (n < 10⁴) and the path is not hot.
- The bottleneck is I/O, not CPU/memory.

## The Iron Law

```text
NO APPROXIMATE STRUCTURE WITHOUT WRITTEN ε/δ AND EXPLICIT CALLER ACCEPTANCE
```

Probabilistic data structures (Bloom, HyperLogLog, Count-Min, MinHash/LSH, t-digest), randomized projections (JL), and lossy transforms (floating FFT) all change the answer's meaning. Before proposing one:

1. Write the error parameter the caller will see (false-positive rate, relative error, distortion bound).
2. Identify the caller and state, in one sentence, that they tolerate this kind of wrong answer.
3. If you cannot identify the caller, or they need exact (auth checks, billing, dedup keys, deduplication for correctness, anything that flows into a primary key), DO NOT propose the approximate structure. Keep classical, or escalate to a sharded/streaming exact design.

This rule has saved more incidents than any other in this skill. Do not soften it.

## Non-negotiable rules

1. **Declare exact vs approximate up front.** Before suggesting a math-level technique, state:
   - `mode: exact` or `mode: approximate`
   - If approximate: the error parameter (ε, δ, false-positive rate) and a sentence on whether the caller can tolerate it.
   - If the caller needs exact and there is no exact win, say so and stop — do not silently degrade to approximate.

2. **Cite the technique by name.** Never describe a probabilistic or numerical trick in vague terms. Name it: `Bloom filter`, `HyperLogLog`, `Count-Min Sketch`, `MinHash + LSH`, `Johnson–Lindenstrauss projection`, `FFT`, `NTT`, `fast exponentiation`, `Karatsuba`, `Strassen`, `sweep line`, `kd-tree`, `BVH`, `union-find with path compression`, `Floyd's cycle detection`, `Boyer-Moore majority`, `reservoir sampling`, `Knuth shuffle`, `Aho-Corasick`, `suffix automaton`, `segment tree with lazy propagation`, `Fenwick tree`, `monoid scan / parallel prefix`. A named technique is auditable; "a smart approximation" is not.

3. **State the trade you are making.** Every math-level optimization buys something at a cost. In one line:
   - Buys: `space`, `time`, `wall-clock`, `parallelism`.
   - Costs: `accuracy ε=?`, `code complexity`, `dependency`, `non-determinism`, `numerical stability`.
   - If the cost is invisible to the caller, write "callers see no change".

4. **Justify the asymptotic win.** Do not propose a math technique without a one-line bound argument:
   - "HyperLogLog: count uniques in O(log log n) bits at standard error 1.04/√m."
   - "FFT: polynomial multiplication O(n log n) vs schoolbook O(n²)."
   - "JL projection: preserves pairwise distances within (1±ε) using O(log n / ε²) dimensions."
   - "Sweep line: rectangle overlap from O(n²) pair checks to O(n log n) events."
   No bound, no proposal.

5. **Forbid math cargo-culting.** Do not introduce these techniques when:
   - n is small enough that a linear scan finishes in microseconds (n < ~10⁴ unless it is a hot path).
   - The problem is I/O-bound — the math win disappears behind network/disk.
   - Exact answers are required and no exact technique exists.
   - The team will not maintain it (write that down: "team familiarity: ?").

## The pre-proposal protocol

Before suggesting a math-level technique, your message must contain — in this order:

1. **The classical floor** — what is the best non-mathy algorithm and its Big-O? ("Hash join is O(n+m); we're already there.")
2. **Why classical is not enough** — n too large, space blows up, real-time deadline, etc.
3. **The math technique** — named (rule 2).
4. **Exact or approximate** — with ε if approximate (rule 1).
5. **The new bound** — with one-line derivation (rule 4).
6. **The trade** — buys/costs (rule 3).
7. **When NOT to use this** — at least one disqualifier.
8. **The code or pseudocode.**

If any of 1–7 is missing, do not propose the technique.

## Playbook — math technique → problem → win → caveat

### Sketches and probabilistic structures (massive data, approximate)

| Problem | Classical | Math technique | Win | Caveat |
|---|---|---|---|---|
| Membership: "have I seen this key?" at scale | `Set<id>`, O(n) space | **Bloom filter** | O(n) bits at chosen ε false-positive | False positives only; cannot remove (use Cuckoo if needed) |
| Count distinct values in a stream | `Set` to count, O(unique) space | **HyperLogLog** | O(log log n) bits, ~1% relative error | Approximate; cannot list elements |
| Top-K / heavy hitters in a stream | full counter, O(unique) space | **Count-Min Sketch** + heap | O(log(1/δ)·1/ε) space | Overestimates; choose ε,δ deliberately |
| Document / set similarity at scale | full Jaccard, O(n·m) | **MinHash + LSH** | Sub-linear ANN query | Tunes recall vs precision; param search |
| k-NN in high-dim vectors | brute O(n·d) | **JL projection → HNSW / IVF** | O(log n) per query, (1±ε) distortion | Index build cost; recall < 1 |
| Reservoir of size k from a stream of unknown length | buffer all, O(n) space | **Reservoir sampling** | O(k) space, uniform sample | Single-pass only |
| Find majority element | counter map | **Boyer-Moore majority vote** | O(1) space, O(n) time | Requires majority exists; verify pass |
| Quantiles in a stream | sort, O(n log n) | **t-digest / GK** | O(1/ε) space, ε-accurate quantiles | Approximate |

### Fast arithmetic / transforms (numeric and combinatorial)

| Problem | Classical | Math technique | Win | Caveat |
|---|---|---|---|---|
| Multiply two polynomials / big integers | O(n²) | **FFT / NTT / Karatsuba** | O(n log n) | Floating FFT loses precision — use NTT for integers |
| Convolution of two signals | O(n·m) | **FFT-based convolution** | O((n+m) log(n+m)) | Numerical noise at very small magnitudes |
| `pow(a, b) mod p`, b large | O(b) multiplications | **Fast exponentiation (square-and-multiply)** | O(log b) | Watch for overflow inside; use modular arithmetic |
| GCD of large integers | repeated subtraction | **Euclidean algorithm** | O(log min) | Standard; AI sometimes still writes the subtraction loop |
| Matrix multiplication, n large | O(n³) | **Strassen** (then Coppersmith-Winograd family) | O(n^2.81) | High constant; only wins for very large dense |
| Solving Ax=b for sparse A | O(n³) dense | **Conjugate gradient / sparse LU** | O(nnz · iterations) | Numerical conditioning matters |
| Modular inverse | brute force | **Extended Euclidean** or **Fermat** when p prime | O(log p) | p must be prime for Fermat |

### Dimensionality reduction and linear algebra

| Problem | Classical | Math technique | Win | Caveat |
|---|---|---|---|---|
| Similarity in d-dim, d large | O(n·d) brute | **JL projection** to k = O(log n / ε²) | O(n·k) at (1±ε) distortion | Random; verify on validation set |
| Recommender from rating matrix | iterate full matrix | **Truncated SVD / matrix factorization** | O(k·(n+m)) for rank-k | Choose k; refresh strategy |
| Document-term similarity | TF-IDF O(n·m) | **LSA via SVD** | rank-k approximation | Latent dims are not interpretable |
| PCA on n samples in d dims | O(n·d²) | **Randomized SVD** | O(n·d·k) for rank-k | Randomized; set oversampling |

### Geometry (spatial queries)

| Problem | Classical | Math technique | Win | Caveat |
|---|---|---|---|---|
| Range / nearest-neighbor in 2D-3D | O(n) per query | **kd-tree / R-tree / BVH** | O(log n) per query | Degrades in high d; use ANN instead |
| Rectangle / interval overlap pairs | O(n²) pair check | **Sweep line + active set (BBST)** | O((n+k) log n) | k = output size; segment tree variant exists |
| Polygon point-in-polygon at scale | O(n·v) | **BSP / monotone decomposition / R-tree** | O(log v) per query after build | Build cost |
| Convex hull of n points | O(n²) gift wrap | **Graham scan / Andrew's monotone chain** | O(n log n) | Numerical robustness for collinear |
| Closest pair of points | O(n²) | **Divide and conquer** | O(n log n) | Carefully merge across the strip |

### Graph and algebraic tricks

| Problem | Classical | Math technique | Win | Caveat |
|---|---|---|---|---|
| Connected components under merges | recompute BFS each merge | **Union-Find with path compression + rank** | α(n) ≈ O(1) per op amortized | Inverse Ackermann is effectively constant |
| Range sum / update on array | O(n) per query | **Fenwick tree** | O(log n) per op | Inclusive ranges; off-by-one risk |
| Range query with monoid (sum/min/max/gcd) | O(n) per query | **Segment tree (with lazy if range updates)** | O(log n) | More code than Fenwick; more general |
| LCA in a tree, many queries | O(n) per query | **Binary lifting** or **Euler tour + RMQ** | O(log n) or O(1) per query | Preprocessing cost |
| Shortest path on DAG | Dijkstra | **Topo sort + relax** | O(V+E) | Only works on DAG |
| Detect cycle in linked list | hash visited | **Floyd's tortoise and hare** | O(1) space | Same big-O time, dramatic space win |
| Parallel reduction over n items | sequential fold | **Monoid + parallel scan** | O(n/p + log p) on p cores | Operation must be associative; verify it |

### Amortized and online algorithms

| Problem | Classical | Math technique | Win | Caveat |
|---|---|---|---|---|
| "Dynamic array push is expensive" | per-op O(n) on resize | **Amortized analysis (doubling)** | O(1) amortized | This is what `ArrayList` / `vec` already do; just defend it |
| Streaming median | re-sort | **Two heaps (max-heap + min-heap)** | O(log n) per insert | Maintain size invariant |
| Online interval scheduling | re-sort by deadline | **Greedy with priority queue** | O(log n) per arrival | Specific objective; check problem fit |
| Sliding-window max | O(n·k) | **Monotonic deque** | O(n) total | Window invariant subtle to maintain |

## Canonical example — counting distinct users

**Problem.** Count unique users seen across a 24-hour event stream. ~2B events/day, ~50M unique users. Reported on a dashboard, ±2% is acceptable.

### Without the protocol — silent OOM, or worse, silent billing error

```ts
// "Just use a Set" — silently OOMs the box at ~50M strings
const seen = new Set<string>();
for await (const event of stream) {
  seen.add(event.userId);
}
return seen.size; // exact, but the process died at row 41M
```

Or worse — proposed *with* a HyperLogLog "for performance" but plugged into the billing pipeline, which keys off the result. Billing then sees 49.7M instead of 50.0M users and a fraction never get charged.

### With the protocol — auditable HLL

```ts
// Classical floor: O(unique) memory for an exact Set. At 50M strings × ~50B each, ~2.5GB.
// Why classical is not enough: dashboard box has 512MB and refreshes every minute.
// Technique: HyperLogLog (HLL).
// Mode: approximate. ε ≈ 1.04/√m. With m=2^14 registers → ~0.8% relative error.
// Trade: buys O(log log n)-bit space (~12KB); costs ±0.8% on the displayed count.
// When NOT to use: anything that flows into billing, primary keys, or per-user actions.
// Caller acceptance: confirmed — dashboard product owner accepts ±2%, written in PR.

import { createHLL } from 'hyperloglog-lite';
const hll = createHLL({ precision: 14 });
for await (const event of stream) {
  hll.add(event.userId);
}
return hll.estimate(); // 49.6M ± 0.4M; dashboard reads ~50M
```

The first version is not "no HLL" — it is "HLL without writing down ε and who tolerates it." The second is identical in technique but auditable: ε is in the comment, the caller is named, the disqualifier (billing) is explicit.

## Output discipline

Code that uses a math-level technique must include:

- One comment naming the technique with a doc link or one-line citation.
- The exact error parameters chosen (ε, δ, bits, dimensions, etc.) and why those values.
- A measured or asymptotic justification next to the chosen parameters.
- An exact-mode fallback path, if the caller might need it.

## When to escalate or redirect

- The bottleneck is I/O, not CPU/memory → go back to `lemmaly` rule 4; math will not help.
- You need bit-exact reproducibility → avoid floating FFT, randomized projections, and probabilistic structures.
- The result is consumed by a downstream system that assumes exact → keep classical or wrap with a validation pass.
- You need a correctness proof (not just a bound) → load **invariant-guard** after picking the technique.

## Rationalizations to watch for

| Excuse | Reality |
| --- | --- |
| "A `set` works — I'll flag the memory issue in a comment." | Noticing the problem is not solving it. If memory is the budget, ship the structure that respects it. |
| "Probabilistic structures sound fancy / academic." | Cloudflare runs Bloom filters in the request path. Redis ships HyperLogLog. These are production-tested, not academic. |
| "Approximate is risky — I'll do exact and let it OOM later." | Silent OOM at 3am is riskier than a stated 0.81% error. State the ε, pick parameters, ship. |
| "I'll just shard the set across machines." | Sharding multiplies your infra cost; HLL solves it in 12KB on one box. Ask whether you actually need exact. |
| "FFT is overkill for this." | True 99% of the time. But state the n. At n ≥ ~64 for polynomial mult, schoolbook is already losing. |
| "JL projection feels too lossy for embeddings." | At ε = 0.1, JL preserves pairwise distances within 10%. For ANN this is almost always fine — measure recall, do not eyeball. |

## Red flags — STOP

- Proposing a probabilistic structure without stating ε and δ.
- Saying "we can use FFT here" without writing the n at which FFT actually beats schoolbook.
- Using `JSON.parse(JSON.stringify(...))` to deep-clone when `structuredClone` exists, then claiming it as an optimization.
- Recommending Strassen on a 100×100 matrix.
- Switching to approximate output without the caller having agreed to it.
- Naming a technique you cannot derive the bound for.
- Math optimization where n is small and not on a hot path.
- "Should be O(log n) on average" with no average-case argument.

## Verification checklist

Before shipping code that uses a math-level technique:

- [ ] The technique is named (no "a smart approximation").
- [ ] If approximate: ε and δ (or the equivalent error parameter) are written in code or in the PR description.
- [ ] The caller has been identified and their tolerance for that error is stated.
- [ ] A one-line bound derivation is present (asymptotic or measured).
- [ ] At least one disqualifier ("when NOT to use this") is documented.
- [ ] An exact-mode fallback exists, OR a one-line note explains why exact is impossible.
- [ ] If randomized: the seed strategy is documented (fixed for reproducibility, or stated as non-deterministic).
- [ ] Downstream consumers that assume exactness (joins on this value, billing, auth, primary keys) have been audited.

Cannot check every box? The technique is not ready to ship. Keep classical, or stop and ask.

## Limitations

- **Not for exact-required pipelines.** Any system where the result is a primary key, dedup key, billing input, or auth decision is out of scope — keep classical.
- **Assumes representative inputs.** ε/δ bounds are average-case or high-probability; adversarial inputs can blow past them. State the threat model.
- **Library quality varies.** Bloom / HLL / MinHash implementations differ in seed strategy, hash function, and memory layout — pick a maintained library and pin the version.
- **Numerical stability.** Floating FFT, randomized SVD, and JL projection accumulate float error; for combinatorial exactness use NTT or exact integer variants.
- **Team-familiarity risk.** A technique nobody can debug at 3 a.m. is a liability — write the maintainer note next to the trade-off.
- **Not a profiler.** mathguard tells you which asymptotic ceiling you can break; it does not measure constant factors. Benchmark before claiming a wall-clock win.

## The thesis, in one line

> **When classical algorithms hit their floor, mathematics still has another floor below. mathguard makes the model reach for it instead of accepting the first answer.**

## Related Skills

- `lemmaly` — gateway; pick the classical algorithm first before reaching for math.
- `invariant-guard` — for stating ε-bounds as part of the postcondition of an approximate algorithm.
- `complexity-cuts` — when baseline code already exists and the bottleneck is CPU/memory, not approximation.
