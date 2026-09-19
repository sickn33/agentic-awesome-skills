---
name: ralph-loop-yylo
description: Execute exactly one explicitly assigned YYLO Ledger task through the
  Ralph loop to a validated queued commit. Use only when the user explicitly requests
  ralph-loop-yylo.
category: agent-orchestration
risk: critical
source: https://github.com/yylo-dev/yylo-skills
source_repo: yylo-dev/yylo-skills
source_type: community
date_added: '2026-09-19'
license: MIT
license_source: https://github.com/yylo-dev/yylo-skills/blob/main/LICENSE
compatibility: Requires the `yy` CLI, git and bash. Executes one explicitly assigned
  Ledger task in its admitted worktree through `yy task start/finish` to a validated
  queued commit. Never pushes, deploys, merges, or releases.
---

# Execute one assigned task in the Ralph loop

Read [references/implement.md](references/implement.md) completely and follow it.

Stay within the assigned task. Do not select unrelated work, edit `tasks.md`, auto-tag releases, push, deploy, mutate production, or broaden scope because another issue is noticed. Record a bounded related Kanban follow-up when necessary.

Keep durable instructions concise and evidence-backed. Status belongs in the task response and runtime receipts, not `AGENTS.md`.

Controller checkpoints are best-effort local durability warnings after terminal metadata is durable. They never gate `yy pi`, `yy task`, `yy merge`, product commits, candidates, or releases.

## Complete assigned request

Treat the following as the complete user-assigned request. Preserve task references and directives literally; resolve them only through the normal agent workflow.

$ARGUMENTS

## When to Use

- The user explicitly requests `ralph-loop-yylo` for one already-assigned YYLO Ledger task.
- You need to implement exactly that task through the validated loop to a queued, review-ready commit.

## Limitations

- Exactly one assigned task per run: never select unrelated work, broaden scope, push, deploy, merge, release, or mutate production.
- Requires `yy task start TASK_ID` admission and `yy task finish TASK_ID` closure; stop after queueing - only the target owner runs `yy merge land`.
- Docs-only import: the upstream `scripts/kanban.sh` wrapper is intentionally not bundled; `references/` holds the worker contract.
- Controller checkpoints are best-effort durability warnings, never lifecycle gates.

### Example

```bash
yy task start TASK_ID
yy task preflight TASK_ID
yy task finish TASK_ID
```

> Adapted from [yylo-dev/yylo-skills](https://github.com/yylo-dev/yylo-skills) (MIT) - v2.0.1; frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: `scripts/kanban.sh` runtime not bundled.
