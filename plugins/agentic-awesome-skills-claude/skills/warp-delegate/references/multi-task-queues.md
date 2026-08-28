# Multi-task queues

A queue is a list of briefs run through Warp one at a time, each reviewed before the next is
dispatched. It is the shape to reach for when the user hands you a backlog rather than a single
task.

## Run them sequentially

Dispatch one brief, review it, land it, then dispatch the next. Parallel runs against the same
working tree interleave edits into a diff nobody can review — and because `oz agent run` has no
sandbox, there is nothing to keep two runs out of each other's files.

If tasks are genuinely independent and you want them concurrent, give each its own checkout (a git
worktree) and its own `--cd`. Otherwise, keep the queue serial.

## Carry constraints forward

Each brief is self-contained, so a constraint discovered in task 2 does not reach task 5 by itself.
Keep a short running list and paste the relevant lines into every subsequent brief:

- Conventions you had to correct in an earlier review ("use the existing `Result` type, not
  exceptions").
- Files that are off-limits for the whole queue.
- Gates that turned out to be slow, flaky, or need a flag.
- Decisions already made, so a later task does not relitigate them.

A constraint that had to be corrected twice belongs in the repository's own skill directory
(`.agents/skills/`, `.warp/skills/`) instead — then pass it with `--skill` and stop re-pasting it.

## One out-dir per task

Give every dispatch its own `--out-dir` so artifacts do not overwrite each other:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief briefs/03-stream-export.txt \
  --cd /path/to/repo --out-dir /tmp/warp-queue/03 --name "queue-03-stream-export"
```

`--name` labels the run in Warp's own run list, which makes a queue far easier to follow later.
Keeping the out-dirs numbered means `result.json`, `events.jsonl`, and `final.txt` for any task stay
recoverable after the queue has moved on.

## Track progress where the user can see it

Maintain a visible checklist — the orchestrator's task list, or a scratch file — with one line per
task and its state: pending, dispatched, under review, landed, or abandoned. Record the commit sha
as each task lands, and the reason whenever one is abandoned.

## When a task fails

Do not roll straight into the next brief. Decide first:

- **Rework** — the diff is close. Continue the conversation with `--conversation <id>` and a delta
  brief.
- **Re-scope** — the task was too big or the brief was wrong. Split it and requeue the parts.
- **Abandon** — it depends on something that is not true yet. Record why and move on.

A failed task that leaves a dirty tree must be cleaned up before the next dispatch. `git status`
should be clean, or clean except for work you have deliberately kept.

## Stop the queue when

- Two consecutive tasks fail for the same underlying reason — the shared assumption is wrong, and
  the remaining briefs probably inherit it.
- A task reveals the plan itself is wrong. Re-plan with the user rather than working the list.
- The gates start failing for reasons unrelated to the current task; something earlier in the queue
  broke and the diff is no longer trustworthy.

## Final coherence pass

Ten individually correct diffs can still add up to an incoherent whole. When the queue is done,
review the aggregate — `git diff <first-commit>~1..HEAD`:

- Duplicated helpers that separate tasks each introduced.
- Naming that drifted between early and late tasks.
- Docs, types, or tests that an earlier task's assumption made stale.
- Dead code left by a later task superseding an earlier one.

Fix these yourself if small. If the cleanup is substantial, it is one more brief — dispatch it with
the aggregate diff as the current state.
