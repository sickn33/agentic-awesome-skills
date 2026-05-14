# Iteration Path

Use this path when improving a skill from outcomes, traces, examples, or user feedback.

## Gather examples

Collect:

- Positive examples where the skill helped.
- Negative examples where it misfired.
- Fix examples showing the desired behavior.
- Any validation output or user correction.

Remove secrets and unrelated personal data before storing examples.

## Diagnose

For each example, identify whether the problem is:

- Triggering: skill loaded too often or not often enough.
- Routing: wrong reference or workflow branch.
- Instruction gap: missing step, safety rule, or output requirement.
- Validation gap: no check caught the failure.
- Overload: too much context or too many steps.

## Patch

Make the smallest instruction change that would have changed the outcome. Retest against at least one positive and one negative example when feasible.
