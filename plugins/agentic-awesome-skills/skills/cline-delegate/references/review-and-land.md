# Review and land

The implementer made the changes; you own the judgment. Verify against reality, never the
self-report, and read the diff as generated code because a green gate cannot catch every failure
mode.

## Check tests before trusting gates

If the diff touches existing tests, review those edits first:

- Treat unbriefed test edits as a contract change, not part of the fix.
- Treat newly skipped, disabled, or commented-out tests as failing until proven otherwise.
- Treat loosened assertions the same way: contains/truthy replacing exact matches, broadened
  error types, and widened tolerances all weaken the gate.

## Re-run the gates yourself

`result.json` carries cline's claims, not evidence. Re-run the project's actual test, lint, and
build commands in the working tree and read their output. Passing is necessary, not sufficient.

## Read the diff against the brief

Start with `touchedFiles`, open the diff, and compare it to the brief:

- **Scope creep** - changes the brief excluded.
- **Scope shortfall** - missed behavior, edges, or cleanup.
- **Quiet judgment calls** - defensible but unasked decisions that need review.

## The implementer sweep

Check every diff for patterns gates often miss:

- Hardcoded success or fixture data on a real-work path.
- Catch-all error handling that returns a default instead of propagating or recovering.
- Imports, dependencies, methods, and signatures not present in the installed version.
- Unused imports, uncalled helpers, unreachable branches, and scaffolding comments.
- A second client, error idiom, or logging style beside the repo's existing one.
- Tests that assert internals instead of behavior, or near-duplicate test bodies.
- Optional parameters, config flags, and abstractions with no caller.
- Guards for impossible cases that hide trust-boundary validation.

Send anything blocking back to cline as a delta brief, or fix it in the tree, and report either
choice to the human. Run relevant guard skills if installed.

## The commit boundary

When the gates pass and the diff holds, **the orchestrator commits**, never the implementer.
Write a clear message describing what landed.

From dispatch until that commit, the uncommitted working tree is the authoritative copy of the
implementer's work - the only one you can commit from, and often the only copy at all. Never run
`git checkout`, `reset`, `clean`, or a branch switch in the workspace between those two points -
however messy an interrupted run looks, inspect it first: `git status`, `git diff`,
`git diff --cached` for anything the implementer staged (plain `git diff` is blind to the index),
and commit the intended files explicitly.

## Rework: re-dispatch a corrected brief

Re-dispatch the correction with the needed context:

```bash
echo "The fix is right, but the tests mock the DB session: use the real migrated fixture and
remove the unused import." | node "<skill-dir>/scripts/relay.mjs" --cd /path/to/repo
```

Cline's verified headless JSON path does not support session resume, so each correction is a fresh
run and its brief must restate the required context. Rework gets the same test review, diff review,
and implementer sweep.

## Surface, do not absorb

The human opted into delegation, so committing verified, gate-passing work is the contract. Keep
them in the loop when the work changes shape:

- Report design decisions and defensible-but-unrequested turns.
- Note non-blocking nitpicks you did not block on.
- Stop and ask if correct completion requires going beyond the brief.

For a queue, keep these notes in the progress file described in
[multi-task-queues.md](multi-task-queues.md).
