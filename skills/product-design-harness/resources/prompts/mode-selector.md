# Mode Selector Prompt

Use this to choose the smallest review process that is still responsible.

## Prompt

Select the Product Design Harness mode.

Answer the questions:

| Question | Answer |
|---|---|
| Is the next step reversible? | Yes / No / Unknown |
| Is user harm possible? | Yes / No / Unknown |
| Is business cost high? | Yes / No / Unknown |
| Is external evidence needed? | Yes / No / Unknown |
| Are multiple stakeholders affected? | Yes / No / Unknown |
| Is the product direction still vague? | Yes / No / Unknown |
| Is this a new feature or workflow, rather than a small bounded change? | Yes / No / Unknown |

Return:

| Field | Required answer |
|---|---|
| Mode | Quick Gate, Standard Gate, or UX3 Council. |
| Why this mode | One sentence. |
| Evidence bar | What evidence is needed before the next step. |
| Human gate needed | Yes or No. |
| Next file | Prompt or template to use next. |

Rules:

- If risk is high or reversibility is low, choose UX3 Council.
- If the direction is vague, choose Standard Gate and complete the product brief.
- If the work is a new feature, workflow, or experiment, choose Standard Gate.
- Choose Quick Gate only for a small, reversible, bounded change to an
  existing flow.
- Do not choose Quick Gate for irreversible or high-risk work.

Handoff is not a review mode. If a valid `continue` review-result already
exists, skip mode selection and produce a context pack from
`../templates/context-pack.md`; no new review-result is created.
