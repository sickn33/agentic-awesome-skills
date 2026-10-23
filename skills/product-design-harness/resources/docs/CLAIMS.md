# Claim Decomposition

A product direction is a bundle of claims. Review the claims before reviewing
the solution.

## Claim Types

| Type | Required question |
|---|---|
| User | What must be true about the actor, situation, problem, or consequence? |
| Evidence | What signal must be trustworthy for the decision to hold? |
| Business | What value, cost, retention, or distribution logic must be true? |
| Risk | Who can be harmed, excluded, misled, or made accountable? |
| Taste | What judgment about coherence, restraint, trust, or meaning is implied? |

## Decomposition Method

1. Rewrite the direction as one observable outcome.
2. Split every hidden "and" into a separate claim.
3. Give each claim an identifier.
4. Add current support and a counter-signal.
5. Link depends_on and breaks_if_false edges.
6. Name the smallest proof step and stop condition.
7. Mark the claim that can collapse the most downstream claims.

Use schemas/claim.schema.json for each claim.

## Claim Status

- Every claim carries a status: assumption or verified.
- A claim stays an assumption until evidence receipts support it.
- A verified claim must list at least one evidence receipt id in evidence_ids.
- breaks_if_false must name at least one dependent decision or claim.

## Example

Broad statement:

> An autonomous assistant will save time and improve retention.

Decomposed:

| ID | Claim | Depends on | Breaks if false |
|---|---|---|---|
| U1 | Operators repeatedly perform a costly workflow. | None | E1, B1 |
| E1 | Draft assistance reduces cycle time without increasing corrections. | U1 | B1 |
| R1 | Customer-facing mistakes can be detected and reversed. | E1 | B1 |
| B1 | Time saved exceeds review, support, and recovery cost. | U1, E1, R1 | Direction |

The riskiest claim is not automatically the least supported claim. It is the
claim whose failure produces the largest decision change.

## Claim Review Rules

- A claim without a counter-signal is advocacy, not analysis.
- A claim without a stop condition cannot control execution.
- A derived claim cannot have stronger evidence than its weakest dependency.
- External retrieval may support a claim but cannot decide its verdict.
- Taste claims require a named human owner when they affect the final verdict.
