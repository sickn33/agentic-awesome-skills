# Review Contracts

JSON Schema defines the artifact shape and conditional branches. Prose explains
it but does not redefine it. `scripts/check_review.py` is the required
canonical validator for complete review results because weakest-flow and
headline-tier selection are semantic checks.

The canonical final output is schemas/review-result.schema.json. Quick Gate,
Standard Gate, and UX3 Council all return this shape.

## Canonical Final Result

| Machine field | Human meaning |
|---|---|
| schema_version | Contract version. |
| review_id | Stable identifier for traceability. |
| product_direction | Direction under review. |
| mode | quick_gate, standard_gate, or ux3_council. |
| stage | idea, prototype, launch, or scale. |
| actor_boundary | Target population, operator, beneficiary, machine actor, affected people, and excluded groups. actor_boundary.target_population is the single target population source. |
| combined_verdict | continue, verify, or stop_reframe. |
| weakest_flow | user, evidence, or business. |
| strongest_signal | Best current support. |
| riskiest_claim | Claim most likely to break the direction. |
| main_uncertainty | Unknown that matters most. |
| confidence_level | Human-readable confidence judgment. |
| evidence_tier | Operational proof level from t0 to t4. |
| main_trade_off | What is sacrificed to protect what matters. |
| human_owned_decision | Taste, risk, strategy, ethics, meaning, or none. |
| human_decision_record_id | Link to the accountable decision record, or null. |
| evidence_receipt_ids | Evidence receipts used by the final decision. |
| reviews | User, Evidence, and Business lane verdicts. |
| next_smallest_action | One action only. |
| execution_boundary | What may and must not be done. |
| stop_conditions | Conditions that block or downgrade work. |
| context_pack_required | True only for continue. |

Council mode also requires council_record with independent review identifiers,
three challenge receipts, and unresolved conflicts.

A context pack must copy execution_boundary.may_do into scope exactly. Its
scope is an approved action list, not another opportunity to propose work.
Check both artifacts together with scripts/check_review.py and --context-pack.

## Outcome Branches

| Verdict | Required output | Execution |
|---|---|---|
| continue | context_pack_required is true. | Create a context pack within the stated boundary. |
| verify | proof_step is required. | Run only that proof step. |
| stop_reframe | reframed_question is required. | Do not create execution work. |

## Weakest Flow Rule

The weakest flow controls the next action, not every future decision.

| Lane state | Combined verdict |
|---|---|
| Any lane is stop_reframe, for any reason. | stop_reframe |
| No lane stops and at least one lane is verify. | verify |
| All three lanes are continue. | continue |

The weakest flow is the lane with the most severe verdict
(stop_reframe > verify > continue); ties break to the lowest lane
evidence_tier, then to the fixed priority evidence, user, business.

The headline evidence_tier equals the lowest lane evidence_tier. Use
`scripts/check_review.py` to validate any review-result against both the JSON
Schema shape and these semantic rules.

Human-owned decisions (taste, risk, strategy, ethics, meaning) are recorded
through schemas/human-decision.schema.json. Overriding a `verify` or
`stop_reframe` verdict to execute anyway is a different act with its own
contract: schemas/verdict-override.schema.json, checked by
`scripts/check_override.py` against the review it overrides. An override
never modifies the review-result - the verdict stays on record. It must name
one accountable owner, restate the weakest flow, grant an explicit scope
that cannot repeat the review's must_not_do, and carry an expiry and
tripwires. Active overrides are tracked in templates/override-ledger.md; an
unlogged override does not exist.

## Reviewer Contract

Each independent reviewer and challenge-round reviewer returns
schemas/reviewer-verdict.schema.json.

The challenge round requires:

- the reviewer being challenged
- counter-evidence
- whether the reviewer's position changed

This prevents a council from producing three parallel summaries and calling
them debate.
