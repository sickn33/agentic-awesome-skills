# Uncertainty, Evidence Tiers, And Confidence

Uncertainty is not a defect. Hidden uncertainty is.

The harness uses two separate ideas:

| Concept | Use |
|---|---|
| Evidence tier | Operational limit on what action is allowed. |
| Confidence level | Human-readable judgment about how much trust to place in the current interpretation. |

Never average confidence labels. Never use confidence to upgrade weak evidence.

## Evidence Tiers

| Tier | Evidence pattern | Maximum default action |
|---|---|---|
| t0 | Internal belief, invented actor, generic trend, no traceable source. | Reframe the question. |
| t1 | Stated opinion, isolated quote, second-hand report, public signal. | Form a hypothesis or run discovery. |
| t2 | Contextual interview, observed workaround, support pattern, small test. | Run a focused reversible prototype. |
| t3 | Repeated behavior, adoption, payment, retention, product logs, recovery proof. | Launch or expand within a bounded scope. |
| t4 | Durable retention, workflow dependency, sustainable economics, governance proof. | Consider scale. |

Subjective evidence matters. A quote or opinion can reveal language, motivation,
fear, and mental model. Its tier depends on context, repetition, and decision
relevance; it should not be mistaken for observed behavior.

## Confidence Rubric

| Level | Interpretation |
|---|---|
| Very low | The source, meaning, or actor is mostly unknown. |
| Low | A plausible signal exists but alternatives remain equally credible. |
| Medium | Multiple contextual signals agree and a focused next step is reversible. |
| High | Repeated direct evidence supports the claim and counter-signals are bounded. |
| Very high | Durable evidence survives time, segments, failure cases, and operating reality. |

## Risk Classes

| Class | Typical effect |
|---|---|
| R1 | Reversible, low cost, no meaningful user harm. |
| R2 | Recoverable user or business impact with bounded cost. |
| R3 | Brand, legal, financial, vulnerable-user, or partially irreversible impact. |
| R4 | Safety-critical, rights-affecting, or irreversible external action. |

## Decision Matrix

| Evidence tier | R1 reversible | R2 bounded | R3 high impact | R4 irreversible |
|---|---|---|---|---|
| t0 | stop_reframe | stop_reframe | stop_reframe | stop_reframe |
| t1 | verify | verify | stop_reframe | stop_reframe |
| t2 | continue narrowly | verify | verify + human gate | stop_reframe |
| t3 | continue | continue narrowly | verify + human gate | human gate |
| t4 | continue | continue | continue + human gate | human gate |

"Continue narrowly" means the execution boundary must preserve reversibility.
The matrix is a default. Human judgment may raise the bar but cannot erase
missing provenance, actor clarity, or safety constraints.

## Freshness And Decay

Evidence expires when the market, workflow, population, policy, or product has
changed enough to alter interpretation.

Every evidence receipt records:

- when it was collected
- when the source was last verified
- maximum staleness in days
- the raw artifact location
- a counter-signal

Expired evidence is not deleted. It is downgraded until re-verified.

## Confidence-To-Cost Rule

Choose the smallest action that creates the largest decision-relevant increase
in evidence tier for the least cost and risk.

Before handoff, ask:

- What is known?
- What is assumed?
- What evidence has expired?
- What would change the verdict?
- What decision must stay human-owned?
