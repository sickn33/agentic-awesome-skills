---
name: agent-evaluation-reporting
description: "Use when summarizing agent evaluations where autonomous, assisted, failed, timed-out, or invalid outcomes must remain distinct and comparable."
category: agent-evaluation
risk: none
source: self
source_type: self
date_added: "2026-08-18"
author: Whxuan0701
tags: [agent-evaluation, metrics, reporting, reliability, benchmarking]
tools: [claude, cursor, gemini, codex]
---

# Agent Evaluation Reporting

## Overview

Turn raw agent evaluation runs into a decision-ready report without hiding failures or overstating capability. Keep outcome populations, denominators, latency populations, and experiment conditions explicit so readers can reproduce every headline number.

## When to Use This Skill

- Use when reporting benchmark, regression, pilot, or production evaluation runs for an AI agent.
- Use when autonomous and human-assisted completions appear in the same result set.
- Use when failures, timeouts, infrastructure-invalid runs, retries, or partial results affect the denominator.
- Use when comparing two agents, prompts, harnesses, or releases and deciding whether the comparison is valid.

## How It Works

### Step 1: Freeze the comparison contract

Record the task set and sampling, model and provider, prompt or policy version, tool and harness versions, evaluator rubric, timeout and retry policy, token or cost budget, environment, and human-intervention policy. Assign the configuration a stable label or digest.

If a material condition differs between runs, mark the comparison as non-equivalent. Report a directional observation only; do not claim that the changed agent caused the difference.

### Step 2: Build a mutually exclusive outcome ledger

Classify every scheduled attempt exactly once:

| Outcome | Meaning |
|---|---|
| `autonomous_success` | The agent satisfied the evaluator without human intervention. |
| `assisted_success` | The task succeeded only after a human intervened. |
| `failure` | The run reached a terminal, evaluable failure. |
| `timeout` | The run exhausted its declared time or step budget. |
| `invalid` | The agent never received a valid evaluation because the harness, environment, or input failed. |

Preserve attempt ID, task ID or seed, retry index, parent attempt ID, configuration label, outcome, intervention count, duration, cost, evaluator evidence, and invalid reason when available. Never silently drop invalid or retried runs.

Also build a unique-task rollup. For each task, retain its first-attempt outcome and derive one eventual outcome after the predeclared retry policy finishes. An execution attempt may contribute once to attempt-level metrics, but a task may contribute only once to task-level completion metrics. If retry lineage or the retry policy is missing, do not report eventual task completion.

### Step 3: Lock each metric to a denominator

Let `N_all` be all execution attempts, including retries, and `N_eval = N_all - N_invalid` be evaluable attempts. Let `T_all` be unique scheduled tasks and `T_eval` be tasks with a valid task-level outcome under the fixed retry policy. Report counts beside every rate.

```text
autonomous attempt success = N_autonomous / N_eval
assisted attempt success   = N_assisted / N_eval
attempt non-completion     = (N_failure + N_timeout) / N_eval
invalid-attempt rate       = N_invalid / N_all
first-attempt completion   = T_first_attempt_completed / T_all
eventual task completion   = T_eventual_completed / T_eval
operational task delivery  = T_eventual_completed / T_all
```

Label attempt-level and unique-task metrics explicitly; never call an attempt-level rate workflow completion. Report the retry rate and attempts per task so policy-dependent gains remain visible. Check that evaluable attempt outcomes sum to `N_eval`, all attempt outcomes sum to `N_all`, and the task rollup sums to `T_all`.

If `N_eval == 0`, report every attempt capability rate as `unavailable` rather than dividing by zero, and mark any gate that depends on those rates `inconclusive`. Apply the same rule to any metric whose denominator is zero, including task-level rates when `T_all == 0` or `T_eval == 0`.

### Step 4: Keep latency and cost populations honest

Report autonomous-completion latency, assisted end-to-end latency, and failure time-to-terminal separately. A success-only P50 is not an overall P50, and subgroup medians cannot be averaged or weighted to reconstruct a combined median.

Calculate an all-run percentile only from per-run observations and state how timeouts are handled. If durations are right-censored, report the censoring policy or use an appropriate survival estimate. Apply the same population labels to token and cost metrics.

### Step 5: Quantify uncertainty and comparability

For stochastic evaluations, show sample size and an interval or repeated-run distribution beside headline rates. For comparisons, report the absolute delta and verify that both sides share the frozen contract from Step 1. If data is missing, conditions differ, or intervals are too wide, use `inconclusive` rather than choosing a winner.

### Step 6: Map evidence to predeclared decision gates

Define readiness gates before reading the result, such as minimum autonomous success, maximum timeout rate, zero critical safety violations, and latency or cost bounds. Return `pass`, `fail`, or `inconclusive` for each gate.

Do not infer production readiness from a success rate alone. When no thresholds or risk requirements were supplied, state that readiness is not determined and list the missing gates.

## Example

For 120 unique tasks with one attempt each, including 12 infrastructure-invalid runs, 48 autonomous successes, 24 assisted successes, 20 failures, and 16 timeouts:

```text
Evaluable attempts:       108 / 120
Autonomous success:        48 / 108 = 44.4%
Assisted success:          24 / 108 = 22.2%
Attempt non-completion:     36 / 108 = 33.3%
First-attempt completion:   72 / 120 = 60.0%
Eventual task completion:   72 / 108 = 66.7% (no retries)
Operational task delivery: 72 / 120 = 60.0%
Infrastructure-invalid:    12 / 120 = 10.0%
Overall latency P50:       unavailable from subgroup aggregates
Readiness:                 inconclusive until gates are declared
```

## Best Practices

- Report counts, formulas, denominator labels, and exclusions together.
- Separate autonomous capability from human-assisted workflow completion.
- Preserve timeout and invalid-run rates even when publishing a valid-run score.
- Pair aggregate metrics with failure categories and representative evidence.
- Re-run both candidates under one frozen contract before making a causal improvement claim.

## Limitations

- This skill structures and interprets supplied evaluation evidence; it does not validate the evaluator or recreate missing run records.
- Small or biased task sets can produce precise-looking but unrepresentative metrics.
- Statistical significance does not establish production safety, user value, or acceptable cost.
- Readiness remains inconclusive when acceptance thresholds, severity policy, or required evidence are absent.

## Security & Safety Notes

- Redact credentials, private prompts, personal data, and sensitive tool output from reports while retaining stable evidence references.
- Treat critical safety violations as separate release gates rather than averaging them into a general quality score.

## Common Pitfalls

- **Problem:** Assisted completions are presented as autonomous success.
  **Solution:** Publish separate autonomous, assisted, and workflow-completion rates.
- **Problem:** Timeouts or invalid runs disappear from the denominator.
  **Solution:** Reconcile the full outcome ledger against `N_all` before calculating metrics.
- **Problem:** A faster success-only P50 is presented as a faster system.
  **Solution:** Label the population and report all-run time-to-terminal only from per-run data.
- **Problem:** A release verdict is improvised after seeing results.
  **Solution:** Apply predeclared gates or return `inconclusive`.

## Related Skills

- `@agent-evaluation` - Design behavioral tests, benchmarks, and reliability evaluations.
- `@run-deep-swe` - Execute reproducible DeepSWE benchmark runs before reporting their results.
