# LWC Recovery and Maintenance

## Use when

Use this document when a command returns Work, a migration/projection fails,
graph parity is stale, lint finds durable knowledge issues, or an explicit
checkpoint/maintenance window is required.

## Skip when

Skip broad lint, graph traversal, checkpoints, and maintenance during routine
session recall. Do not perform speculative cleanup merely because a Hook ran.

## Minimum workflow

When a command returns Work instead of its normal result:

```bash
lwc work status <ID>
lwc work watch <ID>
```

Require `state=succeeded`, inspect `work.result`, then retry the original command
when required. Use `work cancel` for cooperative cancellation. Use `work resume`
only for failed, cancelled, or stale interrupted Work after inspecting its error;
never resume queued/running Work or switch graph engines while projection runs.

For physical graph drift, use `graph status`, `graph verify`, `work list`, then
inspect the coalesced `graph-project` Work. Canonical Wiki reads remain available
while projection is pending or failed.

After meaningful Wiki changes, lint the changed scope and run fixed retrieval
questions plus paraphrases. A clean lint report is not retrieval proof. When a
draft was validated, commit it and repeat the same checks against live state.

Use checkpoints only for explicit recovery/operational boundaries. Use
`maintenance compact` only in an idle window when storage growth matters; inspect
`work.result.busy` and `work.result.after_bytes`. It attempts a WAL truncate
checkpoint, not a full FTS optimization.

## Consent boundaries

Recovery never authorizes direct edits to Wiki databases, WAL/SHM, graph
sidecars, CodeGraph indexes, Agent configs, or backups. Destructive page/source
removal uses guarded CLI commands. Schema rollback restores a validated artifact;
it does not run handwritten downgrade SQL.

## Completion evidence

- Work reached a terminal state with its structured result inspected.
- `graph verify` proves projection parity when graph state changed.
- Lint and fixed retrieval acceptance pass for changed memory.
- Checkpoint/restore evidence includes integrity and exact target scope.
