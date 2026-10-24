# Intake Prompt

Use this when a product idea is vague.

## Prompt

Do not propose features.

Fill `schemas/product-brief.schema.json` or its human-readable companion
`templates/product-brief.md`.

Use `working_language` for prose and keep canonical identifiers in English.
Use `knowledge/ontology.json` for actor and stakeholder terms, then load only
triggered rule IDs from `knowledge/rules.json`.

Required decisions:

| Field | Required answer |
|---|---|
| stage | idea / prototype / launch / scale |
| actor_boundary | Operator, beneficiary, affected people, excluded groups. |
| product_organization | Organization, project owner, issuer, and decision authority. |
| stakeholder_effects | Who receives value, pays, decides, operates, or bears risk. |
| problem_hypothesis | Actor, situation, frequency, consequence, workaround, evidence standard. |
| evidence_tier | t0 / t1 / t2 / t3 / t4 |
| riskiest_claim | The belief most likely to change the direction. |
| disconfirming_evidence | What would prove the problem or direction wrong. |
| accountable_owner | Who owns the final human decision. |
| human_taste | Named human-owned taste input, if any; do not score it as evidence. |
| feedback_classification | Evidence, noise, incident, drift, or not_applicable. |
| execution_boundary | `may_do`, `must_not_do`, and `must_ask`. |
| next_question | One question that reduces the most uncertainty. |

Then run `prompts/mode-selector.md`. Do not write an execution plan.
