---
name: agent-evaluation
description: "Evaluate agent behavior with versioned cases and explicit verifiers. Use when comparing agent or prompt changes, reproducing failures, or running agent regression tests."
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Agent Evaluation

Evaluate observable agent behavior against task-specific cases. Modified by AAS maintainers on 2026-09-05 to remove unsupported benchmark claims, correct uncertainty/error reporting and separate optional architecture sketches from the operating procedure.

## When to Use

Use when comparing a changed agent, prompt or tool configuration, reproducing an observed failure, or estimating reliability on a declared task distribution. Do not infer product readiness from a public benchmark percentage or a generic score threshold.

## Prerequisites

- A versioned case set with expected observable outcomes and permission boundaries.
- A known baseline and candidate revision, including model, prompt, tools, configuration and runtime versions.
- Authorized synthetic or redacted inputs, isolated targets and a bounded token, time and cost budget.
- A verifier that distinguishes wrong outcomes, expected safe rejections, evaluator failures and infrastructure outages. Provider access is needed only if the declared evaluation calls that provider.

## Evaluation procedure

1. **Freeze the contract.** Record case IDs and dataset revision, baseline/candidate identities, target environment, repeat plan, budgets, stopping rule and decision criteria before execution. Keep critical safety and authorization failures separate from average quality; they cannot be compensated by a higher score.
2. **Validate the harness.** Run a known-pass case, a known-fail case and a deliberate verifier/infrastructure failure. Confirm that each is classified correctly and that trace retention excludes credentials and private input bodies. If classification is wrong, fix the harness and repeat these checks before measuring the agent.
3. **Run the frozen cases.** Use the same case definitions and budgets for baseline and candidate, with independent fixture state and recorded execution order. Retain every attempt and its run ID, outcome, reason, latency and resource totals. An exception is not evidence that an unsafe request was safely rejected.
4. **Investigate variation.** Preserve the original failure. Classify disagreement as agent behavior, shared-state contamination, verifier ambiguity or an outage. Use only the predeclared repeat budget; do not retry until green, silently drop failures or change the expected outcome to fit the candidate. An unresolved harness fault makes the affected result inconclusive.
5. **Compare and decide.** Report per-case results and uncertainty, regressions, critical failures and incomplete cases. Repeated runs of one case are not independent samples of the task distribution. A changed expectation needs a separately reviewed contract revision and reruns of both baseline and candidate; keep the old results.
6. **Fix and verify.** Make a bounded fix, rerun the failing case to verify the mechanism, then rerun the applicable frozen regression suite from clean state. Stop at the declared budget if disagreement persists. Record pass, fail or inconclusive with the exact evidence; follow the project publication/deployment approval boundary separately.

## Example: changed tool argument handling

A synthetic agent changes how it chooses a tenant identifier for a read-only lookup. Freeze three cases: an authorized lookup must return the seeded fixture, an unauthorized tenant must be rejected without a tool call, and a simulated tool outage must be classified as infrastructure failure. Supply neither real customer records nor production credentials.

Predeclare five repeats per case with fresh state, the same budget for baseline and candidate, and zero tolerance for an unauthorized tool call. Suppose the candidate returns the expected authorized result in all five runs but makes one unauthorized call in the second case: the candidate fails the permission contract even if its aggregate success rate improves. Retain that run, fix argument authorization, verify the negative case, and rerun the frozen suite. If the outage detector itself crashes, mark that case inconclusive and repair the detector before comparing versions. These are illustrative outcomes, not measured agent results.

Expected output:

```text
contract: case-set revision, rules, repeat plan and budget
versions: baseline, candidate, model, prompt, tool and runtime
runs: one record per attempt, classified outcome and bounded evidence reference
comparison: per-case results, uncertainty, regressions and critical violations
decision: pass | fail | inconclusive; reason; unresolved work
```

## Worked uncertainty example

Ten successes in ten independent trials do not demonstrate 100% reliability. This dependency-free helper returns an approximate 95% Wilson interval; for 10/10 it is about `[0.7225, 1]`. For zero trials it rejects the input.

```javascript
function wilson95(passes, trials) {
  if (!Number.isSafeInteger(passes) || !Number.isSafeInteger(trials)
      || trials <= 0 || passes < 0 || passes > trials) throw new Error('Invalid counts');
  const z = 1.959963984540054;
  const p = passes / trials;
  const denominator = 1 + z * z / trials;
  const center = (p + z * z / (2 * trials)) / denominator;
  const margin = z * Math.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}
```

Expected checks: 0/10 has a positive upper bound; 10/10 has a lower bound below 1; 0/0 fails. Use case-level or clustered uncertainty when repeated runs share cases or state; pooling correlated runs as independent observations overstates confidence. See [NIST interval guidance](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm).

## Optional architecture patterns

Read the corresponding section in the bundled [architecture sketches](references/architecture-sketches.md) only when designing a custom harness:

- [Statistical evaluation](references/architecture-sketches.md#statistical-test-evaluation): repeated stochastic runs and descriptive reports.
- [Behavioral contracts](references/architecture-sketches.md#behavioral-contract-testing): expected behavior and invariants.
- [Adversarial tests](references/architecture-sketches.md#adversarial-testing): synthetic, authorized boundary cases; keyword detectors need reviewed false-positive and false-negative examples.
- [Regression pipeline](references/architecture-sketches.md#regression-testing-pipeline): baseline/candidate artifact comparison.
- [Sharp edges](references/architecture-sketches.md#sharp-edges): dataset mismatch, flakiness, proxy metrics and possible leakage.

The classes require application-specific adapters and are not copy-and-run implementations. No listed tool, related skill or delegate is a required dependency.

## Limitations

- Illustrative 80/90% thresholds and score weights in the architecture sketches are not universal merge/deploy rules; define project-specific criteria and keep critical failures separate.
- A small-sample chi-squared comparison or absence of significance does not prove equivalence; use a method suited to counts, pairing and multiple comparisons.
- Exceptions are not automatic safe rejections, and test retries must not erase the first failure.
- Similarity to a retrieved answer may be legitimate RAG behavior; leakage depends on what the evaluation permits the agent to know.
- LLM judges do not substitute for real user feedback, and output truncation does not remove private data. Use synthetic or authorized redacted inputs with bounded retention.
