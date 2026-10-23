# UX3 Operating Protocol

UX3 is the judgment model: User Flow, Evidence Flow, and Business Flow.

Its operating protocol decides when to inspect each dimension, what must leave
each gate, and when work must escalate.

The protocol turns product judgment into repeatable action. It does not add
more product dimensions.

Session startup order is fixed: load `schemas/session-config.schema.json`,
then `knowledge/ontology.json`, then triggered `knowledge/rules.json`, then
`prompts/start-review.md`. Use `working_language` for human-facing prose while
keeping canonical Flow identifiers and rule IDs in English.

## The Six Gates

| Gate | Trigger | Required input | Required output | Escalation |
|---|---|---|---|---|
| Stage Gate | Any new or materially changed direction. | Product direction, proposed next step, constraints. | Stage and proof bar. | Unknown stage becomes standard_gate. |
| User Flow Gate | The direction changes behavior, access, control, or outcomes. | Actor boundary, workflow, experience signals. | Lane verdict, affected people, disconfirming evidence, stop condition. | Vague actor or untestable problem becomes stop_reframe. |
| Evidence Flow Gate | A claim is used to justify action. | Claims and evidence receipts. | Lane verdict, evidence tier, freshness status, missing proof. | Expired, untraceable, or t0 evidence becomes verify or stop_reframe. |
| Business Flow Gate | Work consumes ownership, distribution, support, or trust. | User value, cost boundary, retention and channel assumptions. | Lane verdict, value exchange, viability proof, stop condition. | No durable value path becomes verify or stop_reframe. |
| Council Gate | Risk, uncertainty, cost, or disagreement exceeds Quick Gate. | Claim graph and three independent lane reviews. | Challenge round, weakest flow, trade-off, proposed verdict. | Missing objection or unresolved contradiction blocks synthesis. |
| Human Judgment Gate | Taste, risk appetite, strategy, ethics, meaning, vulnerable users, brand, or irreversible action is involved. | Council result, options, evidence, reversal conditions. | Accountable decision record and final boundary. | No accountable owner means no continue verdict. |

The Human Judgment Gate includes taste. Taste is not a seventh mechanical score.
It is a human decision about coherence, restraint, trust, dignity, timing, and
meaning.

Product organization, issuer, stakeholder effects, and accountable owner are
required before a handoff can authorize execution.

## Stage-Specific Logic

| Stage | Main uncertainty | Minimum useful proof |
|---|---|---|
| Idea | Is the problem real and specific? | Named actor, situation, frequency, consequence, workaround. |
| Prototype | What behavior should be tested? | One riskiest claim, one focused test, one stop condition. |
| Launch | Is there enough pull and reliability? | Repeated behavior, adoption path, recovery path, bounded support cost. |
| Scale | Can this compound safely? | Retention, unit cost, governance, distribution, defensibility. |

Stage raises the proof bar. It never upgrades weak evidence by itself.
Reversibility lowers mode, not the review requirement.

## Claim Analysis

Break attractive directions into user, evidence, business, risk, and taste
claims. Add dependencies so the council can see which false claim collapses the
rest.

Use docs/CLAIMS.md and schemas/claim.schema.json.

## Council Logic

The three lane reviewers work independently before seeing one another's
conclusions. After the synchronization barrier, each reviewer must challenge
one material claim or state that no objection remains and show the
counter-evidence search performed.

The facilitator then applies the weakest flow rule:

| Lane state | Final action |
|---|---|
| Any lane stop_reframe, for any reason | Stop and rewrite the product question. |
| At least one verify and no stop_reframe | Run one proof step for the weakest flow. |
| All continue | Create a bounded context pack. |

The weakest flow is the lane with the most severe verdict
(stop_reframe > verify > continue); ties break to the lowest lane
evidence_tier, then to the fixed priority evidence, user, business.

Do not average reviewers. Do not trade away safety or actor clarity because
another lane looks strong.

verify authorizes only the exact proof_step and never general coding.
continue plus a valid context pack authorizes implementation. `stop_reframe`
authorizes no execution work. Each branch must preserve `may_do`,
`must_not_do`, and `must_ask`.

## Human In The Loop

Humans do not approve every detail. They own decisions that cannot be delegated
without losing accountability.

| Decision | Human responsibility |
|---|---|
| Taste | Choose coherence, restraint, dignity, and timing. |
| Risk | Choose acceptable exposure and recovery obligations. |
| Strategy | Decide whether a locally valid move fits the company direction. |
| Ethics | Decide whether a useful system should exist or act. |
| Meaning | Decide what value the product should stand for. |

Record the decision with schemas/human-decision.schema.json.

Post-build feedback enters the learning loop only after classification:
evidence, noise, incident, drift, or not_applicable. Classification records the
source, actor role, severity, repeatability, decision impact, and next action.

## Output Rule

All modes return schemas/review-result.schema.json.

- continue creates a context pack
- verify creates one proof step
- stop_reframe creates a better product question
