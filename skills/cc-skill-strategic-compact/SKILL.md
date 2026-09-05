---
name: cc-skill-strategic-compact
description: "Prepare a verified checkpoint before condensing an agent conversation at a phase boundary. Use during long tasks when context is repetitive; preserves constraints, evidence, decisions and the next action."
risk: none
source: community
date_added: "2026-02-27"
---

# Strategic Context Checkpoints

Condense context after a verified phase, with enough durable information to resume the same task. A tool-call count is only a reminder; it cannot measure context quality or decide when compaction is safe.

## When to Use
Use when exploration has finished, a tested milestone has landed, or a long conversation contains repeated or obsolete reasoning. Do not compact in the middle of an unresolved tool call, an unrecorded approval decision, or a failure whose exact evidence has not been captured.

## Inputs and prerequisites

- The user's current objective, accepted constraints and definition of done.
- The current branch and source revision, local changes, relevant artifact paths and actual check results.
- Running processes, pending tool calls, approvals or external blockers.
- A host-supported context-compaction mechanism. This skill does not assume `/compact` exists in every client or manipulate internal context files.

## Procedure

1. Choose a phase boundary: discovery to implementation, implementation to verification, or one completed batch to the next. Preserve an unresolved failure's reproduction first.
2. Reconcile task state with the filesystem and Git. Distinguish completed, uncommitted, planned and failed work.
3. Produce the checkpoint below. Include exact commands, result summaries and paths needed to resume; omit copied logs and discarded hypotheses that no longer matter.
4. Check that the next action is executable and that a new context would not repeat a merge, send a message twice, lose a constraint or overwrite unrelated work.
5. Save only in an already authorized project artifact, or return the checkpoint in the conversation. Do not rewrite global memory or host configuration automatically.
6. Use the client's supported compaction command if requested and available. On resumption, read the checkpoint and verify mutable state before continuing.

## Checkpoint template

```text
Objective and done condition:
User constraints and authorization boundaries:
Source revision, branch and local changes:
Completed outcomes with verification:
Outstanding work and known failures:
Running process/tool identifiers:
Artifacts and exact paths needed next:
Next action, expected result and fallback:
```

## Worked example

For a search feature whose source PR merged while canonical synchronization is pending, preserve the source merge SHA, canonical PR number and expected generated files. Record tests as passed only for the revision actually tested. The next action is to verify the canonical PR and updated `main`; it is not to merge the source PR again. If a browser check still needs an unlocked desktop, keep that condition visible while continuing independent code review.

Expected outcome: the next context resumes outstanding verification, preserves unrelated local edits and does not claim publication from a source merge.

## Optional stateless reminder

```bash
bash skills/cc-skill-strategic-compact/suggest-compact.sh 50
```

The helper accepts an observed tool-call count and optional threshold (default 50), and prints a reminder at the threshold and every 25 calls after it. `COMPACT_TOOL_COUNT` and `COMPACT_THRESHOLD` can be supplied by an explicit caller adapter. It stores no counter, estimates no token usage and never performs compaction. With no count it exits quietly.

Earlier versions incremented a shared user-state counter across unrelated sessions. That counter is no longer read or written; existing custom wrappers must pass a session count explicitly. Existing state files are left untouched. This skill does not install or edit a hook.

## Limitations
- A checkpoint preserves recorded evidence, not all conversation detail. Keep primary artifacts when exact bytes matter.
- Counts are caller-provided, bounded non-negative decimal integers; reminders are not a context-capacity measurement.
- Branches, processes and remote checks can change after a checkpoint. Revalidate them instead of treating a summary as current truth.
- Client context management differs. Do not simulate compaction by deleting chat databases, logs, caches or project files.
