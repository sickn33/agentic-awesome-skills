# Gate Review Template

Human-readable companion to `schemas/review-result.schema.json`.

## 1. Contract

| Machine field | Answer |
|---|---|
| schema_version | 2.1 |
| working_language | en / zh-TW / zh-CN / ja / ko / es / fr / de / pt |
| canonical_identifiers | en |
| fallback_language | en |
| review_id |  |
| product_direction |  |
| mode | quick_gate / standard_gate |
| stage | idea / prototype / launch / scale |

## 2. Product Context

| Field | Answer |
|---|---|
| actor_boundary.target_population |  |
| Operator |  |
| Beneficiary |  |
| Machine or agent actor |  |
| Affected people |  |
| Excluded groups |  |
| Product organization |  |
| Project owner |  |
| Issuer |  |
| Stakeholder effects |  |
| Unresolved assumptions |  |

## 3. Human Judgment Boundary

| Field | Answer |
|---|---|
| Human-owned decisions |  |
| Machine-supported inputs |  |
| Not mechanized |  |
| Named human approval gate |  |
| Accountable owner |  |
| Condition |  |

## 4. Canonical Result

| Machine field | Answer |
|---|---|
| combined_verdict | continue / verify / stop_reframe |
| weakest_flow | user / evidence / business |
| strongest_signal |  |
| riskiest_claim |  |
| main_uncertainty |  |
| confidence_level | very_low / low / medium / high / very_high |
| evidence_tier | t0 / t1 / t2 / t3 / t4 |
| main_trade_off |  |
| human_owned_decision | taste / risk / strategy / ethics / meaning / none |
| human_decision_record_id |  |
| evidence_receipt_ids |  |
| next_smallest_action |  |
| context_pack_required | true / false |

## 5. Lane Reviews

| Flow | Verdict | Evidence tier | Strongest signal | Weakest assumption | Missing evidence | Disconfirming evidence | Stop condition |
|---|---|---|---|---|---|---|---|
| User |  |  |  |  |  |  |  |
| Evidence |  |  |  |  |  |  |  |
| Business |  |  |  |  |  |  |  |

## 6. Execution Boundary

| Field | Answer |
|---|---|
| May do |  |
| Must not do |  |
| Must ask |  |

## 7. Human Approval Gates

| Named human approval gate | Accountable owner | Condition |
|---|---|---|
|  |  |  |

## 8. High-Risk Actions

| Action | Named human approval gate | Accountable owner | Condition | Rollback plan |
|---|---|---|---|---|
|  |  |  |  |  |

## 9. Verdict Branch

| Field | Answer |
|---|---|
| proof_step for verify |  |
| reframed_question for stop_reframe |  |
| stop_conditions |  |
