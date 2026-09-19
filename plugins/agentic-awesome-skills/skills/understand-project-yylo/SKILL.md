---
name: understand-project-yylo
description: Inspect the current product architecture, dependencies, and validation
  loops before planning or implementing a requested change.
category: project-management
risk: safe
source: https://github.com/yylo-dev/yylo-skills
source_repo: yylo-dev/yylo-skills
source_type: community
date_added: '2026-09-19'
license: MIT
license_source: https://github.com/yylo-dev/yylo-skills/blob/main/LICENSE
compatibility: Requires read access to the product worktree and the `yy` CLI for task/spec
  reads through the canonical controller. Read-only inspection; no mutations.
argument-hint: '[Main Task] [Constraints] [Ultimate Goal]'
enable-shell-directives: true
---

# Understand the project

1. Read `AGENTS.md`/`CLAUDE.md`, repository status, relevant source, tests, and existing product documentation in the integration or assigned feature worktree.
2. Read related Kanban tasks and durable specs through the canonical metadata controller. Do not assume `.juno_task/plan.md` exists and do not materialize controller-private metadata in a product worktree.
3. Trace only the dependencies and runtime paths needed for the requested goal. Use bounded parallel investigation when independent questions justify it.
4. Report current behavior, sources of truth, affected components, risks, unknowns, and the smallest useful validation loop.
5. If the user requested planning, hand the findings to `plan-ledger-tasks-yylo`. If implementation was requested, work only in the task worktree returned by `yy task start TASK_ID`.
6. Write a durable operational spec only when requested or materially useful. Draft it externally, preflight the installed `yy ledger artifact` API, capture it as an immutable `report` Artifact Record with provenance/retention, and verify retrieval, digest, and history. If that API is unavailable, stop with the external draft intact; never fall back to product `docs/`, task bodies/responses, new `.juno_task/specs`, or direct controller-store edits. Product `docs/` remains reserved for documentation shipped with the product. Do not update root instructions with transient status.

## Invocation contract

The structured views below intentionally alias parts of the complete request; they are not additional user arguments.

### Main task

$1

### Constraints and context

$2

### Complete raw request

$ARGUMENTS

## When to Use

- Before planning or implementing a requested change, when you need current architecture, dependencies, and validation loops.
- To hand grounded findings to `plan-ledger-tasks-yylo` (planning) or a task worktree (implementation).

## Limitations

- Read-only: reports current behavior, sources of truth, affected components, risks, unknowns, and the smallest validation loop - does not implement.
- Bounded investigation only; do not materialize controller-private metadata in a product worktree.
- Durable specs are captured as immutable Artifact Records only when the installed `yy ledger artifact` API supports it; otherwise stop with the external draft intact.

### Example

```bash
yy ledger search --status todo --limit 5
yy ledger get TASK_ID
```

> Adapted from [yylo-dev/yylo-skills](https://github.com/yylo-dev/yylo-skills) (MIT) - v2.0.1; frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance.
