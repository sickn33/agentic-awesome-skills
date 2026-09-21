---
name: score-eval
disable-model-invocation: true
source_repo: neondatabase/agent-skills
source_type: official
source: neondatabase
date_added: '2026-09-21'
risk: unknown
description: Imported skill `score-eval` from upstream source.
---
## When to Use

- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

Score the eval diff at $ARGUMENTS against the eval rubric.

1. Read the diff file at the path provided
2. Read the eval rubric at eval-rubric.md
3. Read the original fixture app in fixtures/hono-drizzle-app/ for comparison
4. For each problem P1-P5, answer the Detected? and Fixed? questions from the rubric as yes or no
5. Append a row to results.csv — fill in all fields you can determine from the diff and context. Leave fields you can't determine empty.


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
