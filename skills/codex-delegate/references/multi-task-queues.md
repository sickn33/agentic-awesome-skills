# Multi-task queues

The single-task loop scales to a queue, and that's where delegation pays off most — a removal split
across layers, a migration touching many files, a refactor sweep. The discipline that makes a queue
trustworthy is sequencing and bookkeeping, not parallelism.

## Run sequentially, one commit per task

Resist the urge to fan out the whole queue at once. Run tasks **one at a time, in dependency order**,
landing each (review + gates + commit) before dispatching the next. Three reasons:

- **Later tasks assume earlier ones landed.** Task 3's brief can say "the X added in the previous step
  exists" only if the previous step actually committed.
- **One commit per task** keeps the history reviewable and any single step revertible.
- **Each review is honest.** A clean working tree before each dispatch means the next task's
  `touchedFiles` shows only *its* changes, not a pile-up from earlier tasks.

Parallelism is occasionally worth it for genuinely independent tasks on separate files, but it
sacrifices the clean-tree-per-task property and makes review harder. Default to sequential.

## Carry decided constraints forward

Implementation surfaces facts the original plan didn't have: a helper got named, a fixture lives in a
specific place, an interface was chosen. When a later task depends on one of those, **fold it into that
task's brief** as an explicit line. Codex has no memory of the earlier run, so a constraint that
emerged in task 2 must be restated in task 5's brief or it won't hold. This is the queue equivalent of
keeping briefs self-contained.

## Keep a progress file

For anything longer than two or three tasks — especially a run the human steps away from — maintain a
single progress file alongside the work. It's the durable record that survives your own context limits
and lets the human catch up at a glance. A shape that works:

- **Status table** — each task: queued / at-implementer / reviewed+committed (with the commit hash).
- **Per-task review notes** — what landed, what you verified, the gate outcome. One short paragraph.
- **"Needs your eyes"** — design decisions Codex made, non-blocking nitpicks, anything you want the
  human to overrule or confirm. This is the section they read first.
- **End-of-run checklist** — what happens after the last task (push, open/update the PR, manual checks
  the human should do).

Update it as each task lands, not in a batch at the end — if the run is interrupted, the file is still
accurate.

## Close with a coherence check

Per-task review proves each step in isolation; it doesn't prove the steps cohere. After the last task,
verify the whole:

- Run the full test/build once more on the final tree — not just the last task's slice.
- Do a repo-wide check for the thing the queue was about (e.g. after a removal, grep the entire tree
  for any surviving reference; after a rename, confirm no stragglers).
- For schema work, replay all the new migrations from a clean state and check for drift.
- Then push and open or update the PR, with a description that reflects what actually shipped.

## When to stop and ask

Proceed without asking on anything that follows from the agreed plan — that's the point of the human
opting into the queue. Stop and surface when:

- A task can't be completed correctly within its brief's scope (a scope change is the human's call).
- A review finds something that calls the *plan* into question, not just the implementation.
- The gates reveal a problem that affects tasks already "done."

Then report where you are, what's committed, and what the open question is — and wait. A queue that
quietly works around a broken assumption produces a lot of commits in the wrong direction.
