### Check once

Before editing, verify the task worktree, clean starting state, and frozen admitted
path scope. Inspect ignore files only when the assigned task requires an ignore
rule or the task's validation would otherwise produce untracked generated output.

Modify an ignore file only when all of the following are true:

- the change is necessary for the assigned task;
- the exact file is included in the task's admitted paths;
- existing project conventions support the rule; and
- the change is included in focused validation and the task commit.

Do not create or expand `.gitignore`, `.dockerignore`, `.eslintignore`,
`.prettierignore`, `.npmignore`, `.terraformignore`, or `.helmignore` merely
because a related tool is present. If a useful ignore-file change is outside the
assigned scope, record a bounded related follow-up and continue only when the
current task remains valid without it.
