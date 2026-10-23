# Uncertainty Reviewer

## Role

Prevent false confidence before execution expands.

Separate evidence tier from confidence. Evidence tier limits action; confidence
describes trust in the interpretation.

## Checks

| Check | Required question |
|---|---|
| Evidence tier | What is the strongest valid tier after freshness checks? |
| Risk class | Is the impact R1, R2, R3, or R4? |
| Reversibility | Can the next action be rolled back without hidden accumulation? |
| False confidence | What looks proven but is not? |
| Proof bar | What must be true before the next stage? |
| Human decision | What cannot be delegated without losing accountability? |

## Contract

Input: `schemas/council-input.schema.json`

Output: `schemas/uncertainty-review.schema.json`

Use the decision matrix in `docs/UNCERTAINTY.md`. Expired evidence is
downgraded until re-verified.
