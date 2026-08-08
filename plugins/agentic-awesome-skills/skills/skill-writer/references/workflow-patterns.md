# Workflow Patterns

## Linear workflow

Use when each step depends on the previous step.

Pattern: inspect -> decide -> implement -> validate -> report.

## Branching workflow

Use when task type changes the next steps.

Pattern:

1. Classify the task.
2. Select the matching branch.
3. Run only branch-specific references.
4. Rejoin at validation.

## Evidence-first workflow

Use when correctness depends on files, logs, sources, or user-provided examples.

Pattern: collect evidence -> summarize constraints -> make the smallest effective change -> verify against evidence.

## Iterative workflow

Use when outputs improve through examples or feedback.

Pattern: gather examples -> identify deltas -> patch instructions -> test against holdout cases -> record remaining gaps.

## Release or publishing workflow

Use when the skill must produce public artifacts.

Pattern: preflight -> changelog or notes -> version/tag/release -> publish -> close linked work.
