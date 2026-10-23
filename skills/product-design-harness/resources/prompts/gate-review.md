# Gate Review Prompt

Use this before design, implementation, prototype, launch, or growth work.

## Prompt

Run a Product Design Harness gate review. Do not implement.

Use the already-loaded `schemas/session-config.schema.json`,
`knowledge/ontology.json`, and triggered `knowledge/rules.json` entries. Keep
the response in `working_language` while keeping schema fields, rule IDs, and
Flow identifiers canonical.

Review User Flow, Evidence Flow, and Business Flow independently.

Each lane must return the fields in
`schemas/reviewer-verdict.schema.json`. For a Standard Gate, use
`review_round: independent` and omit `objection_to`, `counter_evidence`,
and `position_change`; those fields exist only in the challenge round.
Explain the counter-evidence search in `disconfirming_evidence`.

Reviewer verdicts are working artifacts, not the final shape. When you
assemble `schemas/review-result.schema.json`, reduce each lane to exactly
the canonical lane fields: `verdict`, `evidence_tier`, `strongest_signal`,
`weakest_assumption`, `missing_evidence`, `disconfirming_evidence`,
`stop_condition`, plus `stop_reason_class` when and only when that lane
verdict is `stop_reframe`. Never copy `reviewer`, `review_round`,
`confidence_level`, or `next_smallest_action` into `reviews.*`; the
canonical contract rejects them.

Then apply the weakest-flow rule:

| Lane state | Combined verdict |
|---|---|
| Any lane `stop_reframe`, for any reason | `stop_reframe` |
| At least one `verify` and no stop | `verify` |
| All three `continue` | `continue` |

Select `weakest_flow` deterministically: the most severe lane verdict
(`stop_reframe` > `verify` > `continue`); ties break to the lowest lane
`evidence_tier`, then to the fixed priority evidence, user, business.

Return the final result as `schemas/review-result.schema.json`.

Rules:

- Reversibility lowers mode, not the review requirement.
- List disconfirming evidence before support.
- Use evidence tier, not confidence alone, to bound action. The contract
  enforces the floor: `t0` headline evidence forces `stop_reframe`, and
  `t1` can never return `continue`.
- Do not average verdicts.
- `continue` creates a context pack; continue plus a valid context pack authorizes implementation.
- `verify` creates one proof step; verify authorizes only the exact proof_step and never general coding.
- `stop_reframe` creates one better product question.
- Every branch must state `may_do`, `must_not_do`, and `must_ask`.
- Product organization, issuer, stakeholder effects, and accountable owner must
  be present before any handoff.
- Designer taste stays a human-owned input and never upgrades evidence.
- Post-build feedback must be classified with
  ux3.rule.feedback_classification before it changes scope.
