# Review and land

Antigravity did the typing; you own the judgment. Verify against reality, never against the self-report
- and read the diff as generated code, which fails in ways a green gate cannot see.

## Check the tests before trusting the gates

If the diff touches existing tests, review those edits *first* - before the gate re-run means anything.
A weakened assertion, an added skip, or a deleted test makes the gate measure less than it did before
the run.

- **Unbriefed edits to existing tests are a contract change, not part of the fix.** Flag them, don't
  absorb them.
- **Skipped, disabled, or commented-out tests added in this diff:** treat the underlying test as
  failing until proven otherwise.
- **Loosened assertions** (exact match relaxed to contains/truthy, error-type checks broadened,
  tolerance widened): same treatment.

## Re-run the gates yourself

`result.json` carries Antigravity's own claims. Treat them as claims, not evidence - re-run the
project's actual test/lint/build commands in the working tree and read the output. Passing is necessary,
not sufficient.

For changes with their own verification shape, go further:

- **Migrations / schema:** round-trip them and check for drift.
- **Removals / renames:** grep the codebase for dangling references.
- **Anything stateful:** exercise the actual behavior, don't just confirm it compiles.

## Read the diff against the brief

Open the diff (`touchedFiles` in the result is your starting list) and hold it against what you asked
for:

- **Scope creep** - did Antigravity change things the brief said to leave untouched?
- **Scope shortfall** - did it do the whole task, including edge cases and cleanup?
- **Quiet judgment calls** - did it make a defensible but unasked decision you need to understand?

## The implementer sweep

Generated code fails in systematic ways that gates are structurally blind to. Walk these against every
diff before you commit:

- **Hardcoded success or fixture data** on a path the brief says does real work.
- **Catch-all error handling that returns a default** instead of propagating or recovering explicitly.
- **Unverified imports and API calls** - confirm new dependencies, methods, and signatures exist in the
  installed version.
- **Dead weight** - unused imports, helpers nothing calls, unreachable branches, scaffolding comments.
- **A second way to do what the file already does** - new client, error idiom, or logging style beside
  an existing one.
- **New tests that assert internals** instead of behavior.
- **Near-duplicate test bodies** differing by one value.
- **Speculative surface** - optional parameters, config flags, or abstractions with no caller.
- **Guards for impossible cases** that bury validation that matters at real trust boundaries.

Anything the sweep catches goes back to Antigravity as a delta brief or gets fixed in the tree before
commit - and either way is reported to the user.

If the `guard-skills` package is installed, run the relevant guard on the diff for the full treatment.

## The commit boundary

When the gates pass and the diff holds, **you commit** - the orchestrator, never the implementer. Write
a clear message describing what landed. If your project attributes co-authorship, that is the place for
it.

From dispatch until that commit, the uncommitted working tree is the authoritative copy of the
implementer's work — the only one you can commit from, and often the only copy at all. Never run `git checkout`, `reset`, `clean`, or a branch switch in the
workspace between those two points — however messy an interrupted run looks, inspect it first:
`git status`, `git diff`, `git diff --cached` for anything the implementer staged (plain
`git diff` is blind to the index), and open any untracked files (`??` in `git status`) directly —
they are the implementer's new files, and no diff shows their contents. The tree is evidence,
not clutter. After that inspection the
verdict can legitimately be to discard — work built on a premise you have since corrected, for
example — and then `git checkout`/`clean` is the right tool. The ban is on reflexive cleanup
before anyone has looked.

## Reworking: send the delta, not the whole task

If the review turns up problems, don't restate the entire brief. Continue the same Antigravity
conversation with just the correction:

```bash
echo "The fix is right, but the test mocks the DB session - use the real migrated fixture instead, and
drop the now-unused import." | node "<skill-dir>/scripts/relay.mjs" --resume-last --cd /path/to/repo
```

`--resume-last` keeps Antigravity's conversation context from the first run, so a short delta is enough.
Then review again - rework gets the same gate-rerun, test check, diff-read, and sweep as the original,
no shortcuts.

## Surface, don't absorb

The human opted into delegation, so committing verified, gate-passing work is the agreed contract. But
keep them in the loop on anything that changes the shape of the work:

- **Report design decisions** Antigravity made, and any defensible-but-unrequested turns it took.
- **Note non-blocking nitpicks** you chose not to block on, so the human can overrule you.
- **Stop and ask** if correct completion requires going beyond the brief.

For a multi-task run, capture these in the progress file rather than letting them scroll past - see
[multi-task-queues.md](multi-task-queues.md).
