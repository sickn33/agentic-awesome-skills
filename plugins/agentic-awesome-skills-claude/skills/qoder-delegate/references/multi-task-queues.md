# Multi-task queues

Scale the single-task loop through sequencing and bookkeeping, not a larger brief.

## Run sequentially

Dispatch one task, review it, rerun its gates, and land it before the next:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief task-01.txt --cd /path/to/repo
```

- Later briefs can rely on earlier work only after it lands.
- One commit per task keeps review and rollback bounded.
- A clean tree makes `touchedFiles` useful.
- Parallelize only genuinely independent tasks in separate worktrees.

## Carry constraints forward

Fresh Qoder sessions do not know earlier queue decisions. Put any helper name, fixture location, or
interface needed later into the later brief.

Resume only for rework on the same task. Send a delta with `--resume-last` or `--resume <id>` from that
task's `result.json`. Start unrelated items in fresh sessions.

## Keep a progress file

For more than two or three tasks, track:

- queued / at-implementer / reviewed+committed status and commit hash;
- per-task review notes and gate outcomes;
- design choices and questions needing human review;
- the final cross-task verification.

Update it after every landed task.

## Close coherently

After the last task, run the full gates once more, search repository-wide for the changed concept,
round-trip migrations when applicable, and only then push or open a pull request.

Stop and ask if a task cannot fit its brief, review invalidates the plan, or gates reveal a problem in
already-landed work. Report the landed hashes and open question before waiting.
