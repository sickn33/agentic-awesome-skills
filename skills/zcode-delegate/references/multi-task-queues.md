# Multi-task queues

A queue is a sequence of bounded tasks dispatched one at a time, each reviewed and landed before the
next begins. It is the shape that makes delegation worth the overhead: a migration, a mechanical
refactor across many files, a removal sweep.

**Run them sequentially.** Parallel dispatches against one working tree produce interleaved edits
that no reviewer can untangle, and `touchedFiles` stops meaning anything.

## The loop

For each task in the queue:

1. Write the brief for **this task only**.
2. Dispatch.
3. Wait for `result.json`.
4. Review: re-run the gates, read the diff, check scope.
5. Land it — a commit per task, not one commit at the end.
6. Note anything learned that the next brief needs.

A commit per task is what makes a queue recoverable. When task 6 of 9 goes wrong, you revert one
commit instead of unpicking a nine-task blob.

## Carrying constraints forward

Each brief is written cold, so constraints do not survive on their own. Keep a short block and paste
it into every brief in the queue:

```markdown
# Standing constraints (apply to every task in this queue)
- Do not add dependencies.
- Do not reformat files you are not otherwise changing.
- Public API in src/api/ is frozen; changing it fails review.
- Gates: node test/relay-smoke.mjs
```

Add to this block as you learn. If task 3's review caught a drive-by refactor, task 4's brief should
forbid it explicitly. The block is how a queue gets *more* reliable as it runs rather than less.

## Fresh session per task, usually

Start each task cold — a new dispatch with no `--session`. Independent tasks should not inherit an
earlier task's context, which can carry over assumptions you rejected in review.

Use `--session` **within** a task, for rework, not **between** tasks. The exception is a genuinely
continuous piece of work split across dispatches for length; there, continuing the session preserves
context that a cold brief would have to restate.

## Tracking progress

Keep a visible checklist — the queue, one line each, marked as landed. Update it after the commit,
not after the dispatch. A task is done when it is committed and the gates passed, not when ZCode
said it finished.

Record the `sessionId` of each task next to its line. If a landed task later turns out to be wrong,
that id is the cheapest way back into its context.

## The end-of-run coherence check

Individually correct changes can be collectively wrong. When the queue is done, review the whole
range as one diff:

```bash
git diff <commit-before-the-queue>..HEAD
```

Look for what per-task review structurally cannot catch:

- **Drift** — the same problem solved three different ways across tasks.
- **Duplication** — a helper invented in task 2 and reinvented in task 7.
- **Dead ends** — code added for a task that a later task made unnecessary.
- **Half-migrations** — the old and new patterns now both present, with no task left to finish it.

Then run the gates once more over the final state. A queue where every task passed its own gates can
still end with a broken tree, because task N's gates ran before task N+1 existed.

## When to stop the queue

Stop and go back to the human when:

- Two consecutive tasks need rework for the same reason — the standing constraints are wrong, not
  the implementer.
- A task reveals the plan was based on a wrong assumption about the codebase.
- Correct completion needs a scope change. Ask; do not expand the mandate yourself.

Stopping a queue at task 4 with a clear explanation is a better outcome than finishing all nine and
handing over a diff you cannot defend.
