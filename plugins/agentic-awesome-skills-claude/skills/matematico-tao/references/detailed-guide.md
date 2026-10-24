# Mathematical code and architecture review

## Scope and evidence

Use a mathematical model only when its assumptions fit the actual task. Read the authorized source and record the exact revision, files, inputs and runtime conditions. Distinguish observed behavior, a proof within a model, a hypothesis, a heuristic score and untested deployment assumptions. The fictional “Prof. Euler” label is not an academic credential or endorsement by Terence Tao or any other mathematician.

The Auri reference is an illustrative legacy example. Its private path and version are not the user’s workspace or independently verified measurements. Bundled Python tools do not execute Kotlin. They use approximate lexical/import extraction, not a compiler, McCabe control-flow graph, Sonar cognitive-complexity engine or formal model checker. Read their actual limitations before interpreting reports.

## Workflow

1. Identify the user’s concrete algorithm, resource or architecture question. Reuse supplied context; ask only for critical missing constraints.
2. Map the actual inputs, outputs, side effects and trust/resource boundaries. Define input size and the cost model before claiming Big-O.
3. State preconditions, invariant and desired postcondition. Search for a concrete counterexample or failing interleaving, then evaluate a proposed repair against it.
4. Select only relevant models below. Record assumptions and evidence, including incomplete coverage.
5. Return the most consequential findings with file/line evidence, reproducible local checks, remaining uncertainty and a focused repair. Qualitative confidence is preferable to invented percentages; give numerical probabilities only with a defensible dataset/model.

## Complexity and graph models

For a control-flow graph, McCabe complexity is E-N+2P under its graph conventions. Token counts are approximate and depend on parser conventions; regex cannot certify control-flow complexity. Thresholds guide investigation, not mandatory refactoring or security severity. Time/space bounds need a defined input variable, worst/average/amortized case and data-structure assumptions. The potential method uses a suitable potential function; it is not generally a “Banach potential.”

A directed import graph can reveal structural cycles, SCCs and coupling. Import edges are not proof of runtime calls. Topological order follows the declared edge direction; reverse it if the task needs dependencies before dependents. DFS back-edge cycles are representative, not exhaustive. Betweenness is structural and does not prove a single point of failure. Directed Brandes normalization and dangling-mass redistribution matter when comparing scores.

## State and concurrency models

A finite-state machine is a model, not automatically CSP. Reachability or an outgoing transition does not establish liveness: a callback might never occur, a guard may stay false, or a scheduler can starve work. State safety, deadlock freedom and eventual progress are distinct properties. For a Markov chain, a stationary distribution is a normalized nonnegative left eigenvector pi with pi P=pi; eigenvalues are not states. Boolean reachability uses an adjacency matrix and Boolean closure, not a probability sum interpreted as a distribution.

A data race involves concurrent accesses to the same location with at least one write and inadequate synchronization. Noncommuting operations alone do not prove a race. Kotlin StateFlow is thread-safe but does not make separate read/modify/write operations atomic. Its update function can run more than once under contention; keep it free of side effects. No blanket lock-free/wait-free guarantee follows from atomic semantics. Read [official StateFlow documentation](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/-state-flow/).

StateFlow conflates equal/rapid state updates; it is unsuitable for a lossless transcript event stream. SharedFlow with replay=0 can lose events when nobody subscribes even with extraBufferCapacity. A Channel receive is not exactly-once external processing: cancellation, retries and persistence need explicit design. Define lifecycle-aware collection separately from business-state production; updating a ViewModel’s StateFlow without a current UI collector is not itself a crash.

For a temporal model, distinguish an initial eventually-idle statement (already true when initialization is idle) from recurring progress such as []<>(idle). A liveness proof needs a complete Next relation and fairness/environment assumptions. A type-membership invariant is not a no-deadlock proof. Kotlin Flow and nullable types are not directly equal to temporal modal operators or logical bottom.

## Performance and probability

M/M/1 requires Poisson arrivals, independent exponential service times and a single server. For rho=lambda/mu<1, Wq=rho/(mu-lambda), W=1/(mu-lambda), and L=rho/(1-rho). Jackson networks need additional routing and independence conditions. Real voice pipelines require measurements before assuming those distributions, steady state or service capacity. Normalize stage throughput to a common unit; token/s, bit/s and request latency cannot be minimized directly.

A twice-differentiable objective’s Hessian being PSD on a convex domain characterizes convexity under the relevant assumptions; constraints also need appropriate convexity. The Lagrangian dual maximizes g(lambda,nu)=inf_x L(x,lambda,nu), not L over all variables. KKT gives global optimality for suitable convex problems under the required conditions; it does not certify arbitrary scheduling problems.

For accumulated costs, expectation is additive; Var(sum X_i)=sum Var(X_i)+2 sum Cov(X_i,X_j). The simpler n Var(X) needs identically distributed uncorrelated terms. Chebyshev needs finite variance; without variance data no numeric tail bound is justified. Provider prices, context limits and network latency are model/account/version dependent. Context summarization has cost and information loss and is not an optimal universal truncation rule.

## Android integration boundaries

Use current official lifecycle, coroutine, Bluetooth and intent APIs for the target version. An explicit component or setPackage narrows a recipient; it does not prove that recipient is trustworthy or that an action is authorized. resolveActivity checks resolvability, not safety. ACTION_DIAL leaves final dialing to the person. ACTION_SEND shares text and does not select a phone contact merely by placing a number in EXTRA_TEXT. URI parameters require proper encoding, destination validation and user authorization before sending. See [Android intents](https://developer.android.com/guide/components/intents-filters).

Stable item keys help retain identity; they do not guarantee only one Compose item recomposes. derivedStateOf is useful when derived output changes less often than inputs; it is not universally needed. Any proposed recomposition index is an uncalibrated local heuristic until validated with profiler evidence. Voice recording, messages and cost-generating actions require explicit user scope and relevant consent.

## Deliverable

Report the target revision, question, assumptions, reviewed coverage, concrete findings and counterexamples, calculation/proof boundaries, focused proposed changes, actual tests and untested conditions. Do not claim formal verification without a complete model, executed checker/proof artifact and assumptions. Preserve source and write reports only to authorized locations.

References: [complexity patterns](complexity-patterns.md), [concurrency models](concurrency-models.md), [information theory](information-theory.md), [legacy Auri example](auri-analysis.md). Scripts are `../scripts/complexity_analyzer.py` and `../scripts/dependency_graph.py`; run explicitly with a verified local project and separate output path.
