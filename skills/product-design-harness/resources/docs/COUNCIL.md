# UX3 Review Council

The council is a disagreement system, not a voting system.

It protects three different product realities:

| Reviewer | Protects |
|---|---|
| User Flow | Real actors, problems, consequences, affected people, and exclusion. |
| Evidence Flow | Provenance, signal strength, counter-signals, measurement, and failure criteria. |
| Business Flow | Value exchange, cost, retention, distribution, and defensibility. |
| Claim Analyst | Testable claims and dependency edges. |
| Uncertainty Reviewer | Evidence tier, risk class, reversibility, and false confidence. |
| Council Facilitator | Weakest flow, trade-off, human decision, and final boundary. |

The machine-readable registry is agents/registry.json.

## Fork, Join, Challenge

1. The Claim Analyst creates the claim graph.
2. User, Evidence, and Business reviewers work in parallel without seeing the
   other lane verdicts.
3. The council waits until all three independent reviews are complete.
4. Each lane runs one challenge round against another material claim.
5. The Uncertainty Reviewer checks evidence tier, risk, reversibility, and
   freshness.
6. The facilitator synthesizes only after all required contracts are valid.
7. Human-owned decisions move to the Human Judgment Gate.

## Forced Disagreement

Each challenge-round output must include:

| Field | Requirement |
|---|---|
| objection_to | One lane whose conclusion or premise is challenged, or none. |
| counter_evidence | Evidence or reasoning that could change that lane's verdict. |
| position_change | unchanged, strengthened, weakened, or reversed. |

If objection_to is none, the reviewer must state what counter-evidence was
searched and why it did not change the conclusion.

The facilitator must reject council synthesis when:

- a lane review is missing
- challenge fields are missing
- evidence lacks provenance or is expired without downgrade
- two claims contradict each other without an explicit trade-off
- a human-owned decision has no accountable owner

## UX3 Intersections

The facilitator reviews the intersections, not only the lanes.

| Intersection | Name | Core question |
|---|---|---|
| User + Evidence | Situated Understanding | What do people say, feel, and do, and how strong is each signal? |
| Evidence + Business | Viable Learning | What evidence shows that value can be sustained? |
| User + Business | Sustainable Value Exchange | Is the exchange valuable and fair to both sides? |
| All three | UX3 Decision Kernel | Which canonical verdict and execution boundary follow from the three lane results? |

## Weakest Flow Rule

| Lane state | Combined verdict |
|---|---|
| Any lane is stop_reframe, for any reason. | stop_reframe |
| No lane stops and at least one lane is verify. | verify |
| All three lanes are continue. | continue |

Every stop_reframe lane verdict must name a `stop_reason_class`
(actor, safety, core_evidence, irreversible_risk, business_viability, other).
The class is reporting metadata. It never downgrades a stop.

The weakest flow is selected deterministically:

1. The lane with the most severe verdict (stop_reframe > verify > continue).
2. If tied, the tied lane with the lowest lane `evidence_tier` (t0 is lowest).
3. If still tied, fixed priority: evidence, then user, then business.

The weakest flow selects the next action:

- User weakness creates a user-learning step.
- Evidence weakness creates an evidence proof step.
- Business weakness creates a value, retention, cost, or channel test.

## Human Judgment Gate

The gate is mandatory for brand-affecting work, vulnerable users, irreversible
actions, major risk appetite, ethics, strategy, or meaning.

Taste is handled inside this gate:

| Taste dimension | Question |
|---|---|
| Coherence | Does the product express one clear idea? |
| Restraint | Did the team avoid unnecessary power or scope? |
| Trust | Does the product reveal enough to be believed? |
| Dignity | Does it respect users and affected people? |
| Timing | Is this the right moment to ask for action? |
| Meaning | Is the work worth existing beyond short-term output? |

Record the final call with schemas/human-decision.schema.json.

## Final Output

The facilitator returns schemas/review-result.schema.json.

The council should make uncertainty visible. It should not make uncertainty
disappear.
