# UX3 Council Prompt

Use this for high-uncertainty or high-impact product work before execution.

## Prompt

Run a UX3 Product Design Harness council. Do not implement.

1. Identify stage and risk class.
2. Run claim analysis and create dependency edges.
3. Retrieve missing evidence with
   `schemas/evidence-request.schema.json` and
   `schemas/evidence-response.schema.json`.
4. Fork User, Evidence, and Business reviewers in parallel (or rotate
   roles in one context, writing each lane's JSON before reading the next
   brief). If all three lanes return continue, run `red-team.md` and give
   its `schemas/red-team-review.schema.json` output to the facilitator as
   council_input.red_team_review before synthesis.
5. Wait until all three independent reviews validate against
   `schemas/reviewer-verdict.schema.json`. Those verdicts are working
artifacts: when the facilitator assembles the final
`schemas/review-result.schema.json`, each lane is reduced to the canonical
lane fields (`verdict`, `evidence_tier`, `strongest_signal`,
`weakest_assumption`, `missing_evidence`, `disconfirming_evidence`,
`stop_condition`, and `stop_reason_class` only on a `stop_reframe`
verdict); reviewer-verdict-only fields never appear inside `reviews.*`.
6. Run a challenge round. Each reviewer must name `objection_to`,
   `counter_evidence`, and `position_change`.
7. Run Uncertainty Reviewer on evidence tier, freshness, risk, and
   reversibility.
8. Run Council Facilitator only after the join barrier.
9. Route taste, risk, strategy, ethics, or meaning to Human Judgment Gate.
10. Return `schemas/review-result.schema.json`.

Rules:

- Do not average verdicts.
- Do not synthesize before all three lane reviews and challenge outputs exist.
- A connector, search result, or external tool cannot provide a verdict.
- Evidence tier controls action size.
- Confidence cannot upgrade evidence.
- An expired source must be re-verified or downgraded.
- A human-owned decision requires an accountable owner.
- Only `continue` creates a context pack.
