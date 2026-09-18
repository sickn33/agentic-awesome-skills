# Multi-task queues

A queue is several bounded tasks run through the same loop, one after another, with you reviewing
between them. It is not a way to dispatch a large task in parallel pieces.

## Run sequentially, one commit per task

Dispatch task N, review it, commit it, then dispatch task N+1. The reasons are practical:

- **A clean base per task.** Reviewing a diff means reading what this task changed. If two runs edit
  the tree at once, `touchedFiles` stops telling you who did what.
- **Aider's chat history is per-repository.** `--resume-last` restores the history file in the repo,
  so concurrent runs in one worktree share and clobber it. Genuine parallelism needs separate
  worktrees, each with its own history.
- **Failure stays contained.** A bad task N is one commit to inspect, not a tangle.

If you truly need parallelism, use `git worktree` so each run gets its own tree, its own
`.aider.chat.history.md`, and its own reviewable diff.

## Carry decided constraints forward

Aider starts each non-resumed run with no memory of the previous one. Anything decided in task 1 that
constrains task 3 must be restated in task 3's brief:

- Names, signatures, and interfaces settled earlier.
- Patterns chosen ("we used the repository pattern here, follow it").
- Boundaries that held ("still do not touch migrations/").

A queue that does not carry constraints forward produces N locally-reasonable changes that do not
agree with each other.

## Keep a progress file

For anything longer than three tasks, keep a small file outside the repo tracking: task, status,
commit sha, and any decision that later tasks depend on.

```
1. reject negative windows       done    a1b2c3d   ValueError, not clamp
2. propagate through scheduler   done    e4f5g6h   callers let it raise
3. document the new behavior     pending           follow decision from 1
```

It survives a lost session, and it is what you carry forward into each brief.

## Close with a coherence check

Individually-correct tasks can still add up to something incoherent. After the last one, review the
whole range as one diff:

```bash
git diff <sha-before-queue>..HEAD
```

Look for interfaces that drifted between tasks, duplicated helpers introduced independently, docs that
describe an earlier iteration, and dead code left by a later task. Fix the seams before calling the
queue done.

## When to stop and ask

Stop the queue and go back to the human when:

- A task fails twice for the same reason. The brief is wrong, not the implementer.
- A task reveals the plan itself was wrong - a later task no longer makes sense.
- Correct completion needs a scope change: a `DO NOT TOUCH` file, a public interface, a new
  dependency.
- The queue's assumptions have gone stale because reality moved under it.

Finishing a queue on a false premise is worse than stopping in the middle of it.
