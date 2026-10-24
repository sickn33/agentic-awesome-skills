# Example: UX3 Council Review

Machine-checkable result: `ux3-council-review.json`.

## Product Direction

Let a workflow assistant complete recurring customer operations without manual
approval.

Stage: prototype. Risk class: R3.

## Claim Graph

| ID | Claim | Type | Depends on | Breaks if false |
|---|---|---|---|---|
| U1 | Operators repeatedly perform a costly workflow. | User | None | E1, B1 |
| E1 | Assistance reduces cycle time without increasing corrections. | Evidence | U1 | R1, B1 |
| R1 | Customer-facing mistakes can be detected and reversed. | Risk | E1 | B1, direction |
| B1 | Time saved exceeds review, support, and recovery cost. | Business | U1, E1, R1 | direction |

R1 is the riskiest claim because its failure blocks autonomous action even if
the user and business claims remain plausible.

## Independent Reviews

| Flow | Verdict | Main reason |
|---|---|---|
| User | verify | The problem is plausible, but approval preference and recovery mental model are unclear. |
| Evidence | verify | Current proof is t1: stated pain and support notes without observed delegation behavior. |
| Business | verify | Value is plausible, but trust, review, and exception cost are unknown. |

## Challenge Round

| Reviewer | objection_to | counter_evidence | position_change |
|---|---|---|---|
| User | business_flow | Reported time savings do not prove willingness to delegate customer-facing action. | unchanged |
| Evidence | user_flow | Support requests may ask for speed, not autonomy. | weakened |
| Business | evidence_flow | A draft-only test can measure cycle time and correction cost without full autonomy. | strengthened |

The challenge round does not force consensus. It identifies draft-only
assistance as the proof step that can test all three lanes safely.

## Uncertainty Review

| Field | Answer |
|---|---|
| Evidence tier | t1 |
| Confidence level | Low |
| Risk class | R3 |
| Reversibility | Medium |
| Main uncertainty | Whether people want autonomy or faster preparation with approval. |
| Proof bar | Observe five workflows and compare draft cycle time, corrections, and approval decisions. |

## Final Result

| Machine field | Answer |
|---|---|
| combined_verdict | verify |
| weakest_flow | evidence |
| main_trade_off | Delay autonomy to protect trust, recovery, and accountability. |
| human_owned_decision | risk |
| next_smallest_action | Test draft-only assistance with human approval on five workflows. |
| context_pack_required | false |

Execution may prepare workflow drafts and collect approval decisions.

Execution must not perform customer-facing actions or remove human approval.

## Stop Conditions

- No recurring workflow has a clear operator cost.
- Operators reject draft-only assistance.
- Recovery paths remain unclear.
- Customer-facing mistakes cannot be reversed.
