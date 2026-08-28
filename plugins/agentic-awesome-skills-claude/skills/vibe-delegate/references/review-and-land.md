# Review and land

Vibe did the typing; you own the judgment. Verify against reality, never the self-report, and read the
diff as generated code because a green gate cannot catch every failure mode.

## Check tests before trusting gates

If the diff touches existing tests, review those edits first:

- Treat unbriefed test edits as a contract change, not part of the fix.
- Treat newly skipped, disabled, or commented-out tests as failing until proven otherwise.
- Treat loosened assertions the same way: contains/truthy replacing exact matches, broadened error
  types, and widened tolerances all weaken the gate.

## Re-run the gates yourself

`result.json` carries Vibe's claims, not evidence. Re-run the project's actual test, lint, and build
commands in the working tree and read their output. Passing is necessary, not sufficient.

For changes with a specialized verification shape:

- **Migrations or schema:** round-trip them and check for drift.
- **Removals or renames:** grep for dangling references.
- **Stateful behavior:** exercise the behavior, not just compilation.

## Read the diff against the brief

Start with `touchedFiles`, open the diff, and compare it to the brief:

- **Scope creep** — changes the brief excluded.
- **Scope shortfall** — missed behavior, edges, or cleanup.
- **Quiet judgment calls** — defensible but unasked decisions that need review.

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

Send anything blocking back to Vibe as a delta brief, or fix it in the tree, and report either choice
to the human. Run relevant guard skills if installed.

## The commit boundary

When the gates pass and the diff holds, **the orchestrator commits**, never the implementer. Write a
clear message describing what landed.

From dispatch until that commit, the uncommitted working tree is the authoritative copy of Vibe's
work. Never reflexively run `git checkout`, `reset`, `clean`, or switch branches after an interrupted
run. Inspect `git status`, `git diff`, `git diff --cached` for staged changes, and open every untracked
file (`??`) directly because no diff shows its contents. After inspection, discarding a bad or
premise-contaminated change can be correct; the rule is to preserve the evidence until it is reviewed.

## Rework: send the delta

Continue the same session with only the correction:

```bash
echo "The fix is right, but the test mocks the DB session. Use the real migrated fixture and remove
the unused import." | node "<skill-dir>/scripts/relay.mjs" --resume-last --cd /path/to/repo
```

Vibe's stream does not expose a session id, so use `--resume-last` normally. Use `--session <id>` only
when the id came from outside the relay. Rework gets the same gate rerun, test review, diff review, and
implementer sweep.

Default `accept-edits` runs cannot execute most gates headlessly; the orchestrator runs them.
`--full-access` permits arbitrary shell/tool execution and requires explicit human authorization.

## Surface, do not absorb

The human opted into delegation, so committing verified, gate-passing work is the contract. Keep them
in the loop when the work changes shape:

- Report design decisions and defensible-but-unrequested turns.
- Note non-blocking nitpicks you did not block on.
- Stop and ask if correct completion requires going beyond the brief.

For a queue, keep these notes in the progress file described in
[multi-task-queues.md](multi-task-queues.md).
