# Claim Analysis Prompt

Use this when a product direction sounds attractive but broad.

## Prompt

Break the product direction into user, evidence, business, risk, and taste
claims. Do not propose solutions.

For each claim, return `schemas/claim.schema.json`:

- stable claim identifier
- one testable claim
- current support
- counter-signal
- confidence level
- depends_on edges
- breaks_if_false edges
- smallest proof step
- stop condition

Then identify:

| Field | Required answer |
|---|---|
| Riskiest claim | The claim whose failure changes the decision most. |
| Critical path | The dependency chain that can collapse the direction. |
| Highest-leverage proof step | The smallest test that changes the most claims. |
| Human-owned decision | Taste, risk, strategy, ethics, meaning, or none. |

Use docs/CLAIMS.md for decomposition rules.
