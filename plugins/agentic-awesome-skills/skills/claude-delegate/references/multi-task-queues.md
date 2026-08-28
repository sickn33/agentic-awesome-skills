# Multi-task queues

The single-task loop scales to a migration, removal, or refactor queue. Sequencing and bookkeeping,
not parallelism, keep the work reviewable.

## Run sequentially

Dispatch one task at a time in dependency order. Review, run gates, and land it before dispatching the
next:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief task-01.txt --cd /path/to/repo
```

- Later tasks can rely on earlier behavior only after it lands.
- One reviewed commit per task keeps rollback and history clear.
- A clean tree before each dispatch makes `touchedFiles` useful.

Use parallel dispatches only for genuinely independent tasks in separate working trees. Multiple
implementers editing one tree destroy attribution and make the review boundary unreliable.

## Use fresh sessions for fresh tasks

Each unrelated queue item should start a new Claude session. Use `--resume-last` or `--session <id>`
only for rework on the same task; send a delta brief.

A fresh session does not remember prior queue decisions. If task 2 chose a helper name, fixture
location, interface, or migration ordering that task 5 needs, write that fact explicitly into task
5's brief.

Claude Code will discover `CLAUDE.md`, but it does not generically auto-load `AGENTS.md`. Carry the
applicable `AGENTS.md` constraints into every brief rather than assuming the first session established
them for later sessions.

## Keep a progress file

For more than two or three tasks, maintain one durable progress file:

- **Status:** queued / dispatched / reviewed+landed, including the commit hash.
- **Per-task review:** what landed, what was inspected, and gate outcomes.
- **Needs your eyes:** design decisions, non-blocking concerns, and questions for the human.
- **Session/artifact pointers:** the task's `sessionId` and `result.json` path for rework or diagnosis.
- **End-of-run gates:** the final cross-task verification still required.

Update it when each task lands, not in one batch at the end.

## Close with coherence

After the last task:

- run the full project gates, not only the last task's narrow slice;
- search repository-wide for the concept the queue migrated, removed, or renamed;
- replay all new migrations from a clean state and check drift when applicable;
- inspect the final commit sequence and working tree;
- only then push and open or update the pull request.

## Stop and ask when

Proceed on work that follows from the agreed queue. Stop and surface when:

- a task cannot be completed correctly within its brief;
- review calls the plan itself into question;
- a gate reveals a problem in an already-landed task;
- the next task requires a permission or host-boundary change the human did not approve.

Report what has landed, commit hashes, the current tree state, and the open question, then wait.
