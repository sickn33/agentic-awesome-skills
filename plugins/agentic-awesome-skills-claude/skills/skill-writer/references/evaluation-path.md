# Evaluation Path

Use evaluation to decide whether the skill actually changes agent behavior.

## Lightweight qualitative check

Run this by default:

1. Read the skill as an agent would.
2. Simulate one realistic task.
3. Confirm the output contract is clear.
4. Check that validation is possible.
5. List residual gaps.

## Depth rubric

Score each dimension as pass, partial, or fail:

- Trigger precision.
- Workflow completeness.
- Safety and permission boundaries.
- Output determinism.
- Validation strength.
- Progressive disclosure.

## Baseline comparison

Only run a deeper baseline-vs-with-skill comparison when requested or when risk is high. Use the same task, same inputs, and a holdout case that was not used while editing.
