# Review and land

OpenCode did the typing; you own the judgment. This is where delegation earns its keep or quietly ships
a mistake. The discipline is simple to state and easy to skip under time pressure: **verify against
reality, never against the self-report — and read the diff as generated code, which fails in ways a
green gate can't see.**

## Check the tests before trusting the gates

If the diff touches existing tests, review those edits *first* — before the gate re-run means anything.
A weakened assertion, an added skip, or a deleted test makes the gate measure less than it did before
the run; green is only meaningful if the yardstick wasn't shortened.

- **Unbriefed edits to existing tests are a contract change, not part of the fix.** The brief asked for
  an implementation; nothing in it authorized moving the goalposts. Flag them, don't absorb them.
- **Skipped, disabled, or commented-out tests added in this diff:** treat the underlying test as failing
  until proven otherwise, whatever the annotation's comment claims.
- **Loosened assertions** (exact match relaxed to contains/truthy, error-type checks broadened, tolerance
  widened): same treatment.

## Re-run the gates yourself

`result.json` carries OpenCode's own claim that the gates passed. Treat that as a claim, not evidence —
re-run the project's actual test/lint/build commands in the working tree and read the output. And keep
the result in proportion: **passing is necessary, not sufficient.** An implementer can *game* a gate,
not just misreport it — that is what the test check above and the sweep below exist to catch.

For changes with their own verification shape, go further:

- **Migrations / schema:** round-trip them (apply, reverse, re-apply on a scratch target) and check for
  drift, rather than trusting that "the migration is reversible."
- **Removals / renames:** grep the codebase for dangling references to whatever was removed.
- **Anything stateful:** exercise the actual behavior, don't just confirm it compiles.

## Read the diff against the brief

Open the diff (`touchedFiles` in the result is your starting list) and hold it against what you asked
for:

- **Scope creep** — did OpenCode change things the brief said to leave untouched? Unasked refactors,
  renames, "while I was here" edits. These are the most common quality problem in delegated work.
- **Scope shortfall** — did it do the whole task, including the edge cases and cleanup, or stop at the
  first plausible version?
- **Quiet judgment calls** — sometimes OpenCode makes a defensible decision the brief didn't anticipate.
  Don't just accept it because it looks reasonable; understand it and decide.

## The implementer sweep

Generated code fails in systematic ways that gates are structurally blind to — each of these can sit in
a diff whose tests are all green. Walk them against every diff before you commit:

- **Hardcoded success or fixture data** on a path the brief says does real work — a canned
  `{status: "ok"}` or default return passes tests *by design*. If OpenCode couldn't implement something,
  the diff should fail loudly, not pretend.
- **Catch-all error handling that returns a default** instead of propagating — the suppressed failure is
  exactly what the gate would have caught. A broad catch is only acceptable with a recovery path the
  contract documents.
- **Unverified imports and API calls** — confirm every new dependency, method, and signature exists in
  the *installed* version (read the lockfile or the package, don't trust plausibility).
- **Dead weight** — unused imports, helpers nothing calls, unreachable branches, "Step 1/Step 2"
  comment scaffolding, comments that restate the line below them.
- **A second way to do what the file already does** — a new HTTP client, error idiom, or logging style
  introduced beside the existing one instead of reusing it.
- **New tests that assert internals** — asserting that an internal helper was called, or mocking the
  project's own functions to isolate a "unit." Green, brittle, and worthless as regression cover.
- **Near-duplicate test bodies** differing by one value — fold into one data-driven test or drop the
  copies; bloat reads as coverage but isn't.
- **Speculative surface** — optional parameters, config flags, or abstractions with no caller in this
  diff or the repo. Delegated work gets the concrete behavior the brief asked for, nothing extra.
- **Guards for impossible cases** — null/type checks for values the code's own contract already
  excludes. Noise that buries the validation that matters at real trust boundaries.

Anything the sweep catches goes back to OpenCode as a delta brief (below) or gets fixed in the tree
before commit — and either way is reported to the user (see "Surface, don't absorb").

If the `guard-skills` package is installed, run the relevant guard on the diff for the full treatment —
`clean-code-guard` on production code, `test-guard` on tests, `docs-guard` on documentation. The sweep
above is the built-in floor; the guards go deeper.

## The commit boundary

When the gates pass and the diff holds, **you commit** — the orchestrator, never the implementer. The
`build` agent *can* write the working tree, but committing should be the act of the party that verified
the work, not the one that produced it. Write a clear message describing what landed. If your project
attributes co-authorship, that's the place for it.

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

If the review turns up problems, don't restate the entire brief. Continue the same OpenCode session with
just the correction:

```bash
echo "The fix is right, but the test mocks the DB session - use the real migrated fixture instead, and
drop the now-unused import." | node "<skill-dir>/scripts/relay.mjs" --resume-last --cd /path/to/repo
```

(`<skill-dir>` is this skill's install directory — see [dispatch-and-poll.md](dispatch-and-poll.md).)

`--resume-last` keeps OpenCode's session context from the first run (and its model), so a short delta is
enough. Then review again — rework gets the same gate-rerun, test check, diff-read, and sweep as the
original, no shortcuts. Repeat until it's right, then commit.

## Surface, don't absorb

The human opted into delegation, so committing verified, gate-passing work is the agreed contract.
But keep them in the loop on anything that changes the shape of the work:

- **Report design decisions** OpenCode made, and any defensible-but-unrequested turns it took.
- **Note non-blocking nitpicks** you chose not to block on, so the human can overrule you.
- **Stop and ask** if correct completion requires going beyond the brief — don't expand the mandate on
  your own. A scope change is the human's call, not yours or OpenCode's.

For a multi-task run, capture these in the progress file rather than letting them scroll past — see
[multi-task-queues.md](multi-task-queues.md).
