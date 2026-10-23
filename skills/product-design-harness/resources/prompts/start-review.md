# Start Review Prompt

Use this as the first prompt for Product Design Harness.

## Prompt

Start a Product Design Harness review.

Do not implement.

Load first, in order:

1. `schemas/session-config.schema.json` to set `working_language` while
   keeping canonical identifiers in English.
2. `knowledge/ontology.json` as the canonical UX3 knowledge kernel.
3. `knowledge/rules.json`, including required rules and only conditional rules
   triggered by the request.
4. This start-review prompt.

First choose the review mode:

| Mode | Use when |
|---|---|
| Quick Gate | Small reversible change. |
| Standard Gate | New feature, workflow, or experiment. |
| UX3 Council | High uncertainty, external evidence, multiple reviewers, or human-owned trade-off. |

Reversibility lowers mode, not the review requirement.

If a previous review already returned continue with a valid context pack,
skip mode selection and reuse that context pack; no new review is created.

Then produce:

| Field | Required answer |
|---|---|
| Selected mode | Quick Gate, Standard Gate, or UX3 Council. |
| Reason | Why this mode fits. |
| Missing intake | Any required information not supplied. |
| Next prompt | Which prompt should run next. |

Required intake includes product organization, issuer, stakeholder effects,
and accountable owner. If any are missing, list them before handoff.

If the request is vague, first fill `templates/product-brief.md`.

If the mode is UX3 Council, run `prompts/ux3-council.md`.

If the verdict becomes Continue, create `templates/context-pack.md`.
continue plus a valid context pack authorizes implementation.

If the verdict becomes Verify, run only the returned `proof_step`.
verify authorizes only the exact proof_step and never general coding.

Every completed review must return
`schemas/review-result.schema.json`. Do not invent a different output shape.
Every result must include `may_do`, `must_not_do`, and `must_ask`.
