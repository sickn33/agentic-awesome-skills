---
name: ab-test-setup
description: 'Use when designing an A/B or split test: define the hypothesis, control and variants, estimate sample size, verify tracking, and predeclare metrics and stopping rules.'
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# A/B Test Setup

## 1️⃣ Purpose & Scope

Define an experiment that can answer a specific product question, and verify its assumptions before exposing users. This procedure cannot guarantee validity by itself.

- Documents the stopping rule
- Estimates sample needs under stated assumptions
- Makes the hypothesis and decision criteria reviewable

---

## 2️⃣ Pre-Requisites

You must have:

- A clear user problem
- Access to an analytics source
- Roughly estimated traffic volume

### Hypothesis Quality Checklist

A valid hypothesis includes:

- Observation or evidence
- Single, specific change
- Directional expectation
- Defined audience
- Measurable success criteria

---

## 3️⃣ Hypothesis Lock (Hard Gate)

Before designing variants or metrics, you MUST:

- Present the **final hypothesis**
- Specify:
  - Target audience
  - Primary metric
  - Expected direction of effect
  - Minimum Detectable Effect (MDE)

Use the hypothesis already agreed in the task. If a launch-critical choice is missing, present the concrete choice for confirmation while continuing independent analysis. Do not repeatedly request approval for a decision already authorized.

---

## 4️⃣ Assumptions & Validity Check (Mandatory)

Explicitly list assumptions about:

- Traffic stability
- User independence
- Metric reliability
- Randomization quality
- External factors (seasonality, campaigns, releases)

If assumptions are weak or violated:

- Warn the user
- Recommend delaying or redesigning the test

---

## 5️⃣ Test Type Selection

Choose the simplest valid test:

- **A/B Test** – single change, two variants
- **A/B/n Test** – multiple variants, higher traffic required
- **Multivariate Test (MVT)** – interaction effects, very high traffic
- **Split URL Test** – major structural changes

Default to **A/B** unless there is a clear reason otherwise.

---

## 6️⃣ Metrics Definition

#### Primary Metric (Mandatory)

- Single metric used to evaluate success
- Directly tied to the hypothesis
- Pre-defined and frozen before launch

#### Secondary Metrics

- Provide context
- Explain _why_ results occurred
- Must not override the primary metric

#### Guardrail Metrics

- Metrics that must not degrade
- Used to prevent harmful wins
- Trigger test stop if significantly negative

---

## 7️⃣ Sample Size & Duration

Define upfront:

- Baseline rate
- MDE
- Significance level alpha (often 0.05, corresponding to 95% confidence)
- Statistical power (typically 80%)

Estimate:

- Required sample size per variant
- Expected test duration

**Do NOT proceed without a realistic sample size estimate.**

---

### Tracking Verification (Required before Gate 8)

Before entering the Execution Readiness Gate below, run through this checklist to make "Tracking is verified" mean something concrete:

1. **Event firing:** Trigger each event the primary and secondary metrics depend on (sign-up, add-to-cart, custom event) on staging or a debug page, and confirm it arrives within that pipeline’s documented latency; record the observed delay.
2. **Variant attribution:** Verify that the variant assignment ID is attached to every fired event — not just the entry event. Use your analytics' raw event view to compare a sample of 5+ events per variant.
3. **De-duplication:** Confirm that a user reloading the page does not cause double-counted events. Use a stable event/transaction ID and document cross-client/server deduplication; a variant label alone is not a unique event key.
4. **Sample randomization:** Check sample-ratio mismatch against the configured allocation with a pre-specified statistical check and adequate records. A fixed ±5% band on 100 records is not a valid universal randomization test. Inspect assignment stability, unit independence and missing exposure records.
5. **Guardrail metric pipeline:** Each guardrail metric defined in §6️⃣ must have a working dashboard or alert by the time the test launches.

If any of the above fails, stop and resolve it before Gate 8.

---

## 8️⃣ Execution Readiness Gate (Hard Stop)

You may proceed to implementation **only if all are true**:

- Hypothesis is locked
- Primary metric is frozen
- Sample size is calculated
- Test duration is defined
- Guardrails are set
- Tracking is verified

If any item is missing, stop and resolve it.

---

## Running the Test

### During the Test

**DO:**

- Monitor technical health
- Document external factors

**DO NOT:**

- Stop early due to “good-looking” results
- Change variants mid-test
- Add new traffic sources
- Redefine success criteria

---

## Analyzing Results

### Analysis Discipline

When interpreting results:

- Do NOT generalize beyond the tested population
- Do NOT claim causality beyond the tested change
- Do NOT override guardrail failures
- Separate statistical significance from business judgment

### Interpretation Outcomes

| Result               | Action                                 |
| -------------------- | -------------------------------------- |
| Significant positive | Consider rollout                       |
| Significant negative | Reject variant, document learning      |
| Inconclusive         | Report uncertainty; use the pre-specified continuation rule or design a new test |
| Guardrail failure    | Do not ship, even if primary wins      |

---

## Documentation & Learning

### Test Record (Mandatory)

Document:

- Hypothesis
- Variants
- Metrics
- Sample size vs achieved
- Results
- Decision
- Learnings
- Follow-up ideas

Store records in a shared, searchable location to avoid repeated failures.

---

## Refusal Conditions (Safety)

Refuse to proceed if:

- Baseline rate is unknown and cannot be estimated
- Traffic is insufficient to detect the MDE
- Primary metric is undefined
- Multiple variables are changed without proper design
- Hypothesis cannot be clearly stated

Explain why and recommend next steps.

---

## Key Principles (Non-Negotiable)

- One hypothesis per test
- One primary metric
- Commit before launch
- No peeking
- Learning over winning
- Statistical rigor first

---

## When to Use

Use when a product change has enough eligible traffic for a randomized comparison and a measurable outcome. For low-volume launches or qualitative discovery, consider usability research or descriptive measurement instead of claiming causal lift.

### Sample-size calculation example

For an illustrative binary metric, estimate the per-variant sample for a change
from 10% to 11% (one percentage point, 10% relative lift), 50/50 allocation,
two-sided alpha 0.05 and power 0.80. This Python 3 large-sample approximation uses
[Cohen's proportion effect size](https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.proportion_effectsize.html):

```python
from math import asin, ceil, sqrt
from statistics import NormalDist

baseline, variant = 0.10, 0.11  # illustrative assumptions, not measured data
alpha, power = 0.05, 0.80
h = abs(2 * asin(sqrt(variant)) - 2 * asin(sqrt(baseline)))
z = NormalDist()
per_variant = ceil(2 * (z.inv_cdf(1 - alpha / 2) + z.inv_cdf(power)) ** 2 / h ** 2)
print(per_variant)
```

Expected output: `14745` observations per variant for these assumptions.

This calculation assumes independent units, one binary outcome, a fixed horizon
and no multiplicity adjustment. It is inappropriate for clustered or repeated
observations, sequential decisions or continuous revenue metrics. Account for
eligible traffic, attrition, outcome delay and the sampling unit before turning a
sample estimate into calendar duration. Equal assumed rates have zero effect size
and no finite sample for detecting that difference.

## Worked example

```text
Observation: users abandon a long signup form.
Change: remove one optional field; unit: account; allocation: 50/50 and stable.
Primary metric: completed signup / eligible assigned accounts within 24 hours.
Guardrails: validation failures and support requests.
Before launch: estimate sample needs from baseline and MDE, verify exposure and
completion IDs, define analysis window and stopping rule.
Expected report: counts, absolute/relative effect, interval, data-quality checks,
guardrail results and a decision with its limits; never just “p < 0.05, ship”.
```

## Limitations

- Clustered users, spillovers and repeated observations can invalidate independent-sample calculations.
- Sequential monitoring needs a planned sequential method; fixed-horizon significance does not authorize repeated peeking.
- A tracking gap or sample-ratio mismatch can invalidate inference despite a favorable primary metric.
- This skill does not activate flags, publish variants or establish regulatory compliance automatically.
