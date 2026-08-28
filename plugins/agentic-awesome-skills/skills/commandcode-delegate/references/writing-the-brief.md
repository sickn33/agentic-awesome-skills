# Writing the brief

A brief is the entire task as Command Code will see it. It runs in a fresh process with **no memory of
your conversation, no access to your prior notes, and no shared context** — only the text you send and
whatever it can read from the working tree (including the repo's own `AGENTS.md`, which it picks up
automatically, and any skills it discovers there).
If a constraint isn't in the brief or discoverable in the repo, it doesn't exist for Command Code. The
single most common failure is a brief that assumes context it doesn't have.

## The shape that works

Command Code responds best to compact, block-structured prompts with XML tags rather than long prose.
State the task, what "done" looks like, how to behave by default, and the few constraints that actually
matter. Add a block only when the task needs it — don't ship empty ceremony.

```xml
<task>
One or two sentences: the concrete job and where it lives. Then the specifics — current state, what to
change, and explicitly what to leave untouched. The "leave untouched" list is what keeps Command Code
from wandering into unrelated refactors.
</task>

<verification_loop>
Run these before finishing and fix anything they surface, don't just report it:
  <the project's real test command>
  <the project's real lint/format command>
  <the project's real build/typecheck command>
Confirm the working tree shows only the intended changes afterward.
</verification_loop>

<action_safety>
Keep changes scoped to the task. No unrelated refactors, renames, or cleanup unless required for
correctness. Do NOT run git add or git commit — the orchestrator commits after reviewing. Leave the
work uncommitted in the working tree.
</action_safety>

<structured_output_contract>
End with a report in this exact shape:
  1. What changed and why
  2. Files touched
  3. Gate outcomes (paste the test/lint counts)
  4. Anything you deviated on, left open, or want a decision on
</structured_output_contract>
```

That four-block skeleton covers most implementation tasks. Reach for the extra blocks when the task
profile calls for them:

- **Debugging / open-ended fixes** — add `<completeness_contract>` (resolve fully, don't stop at the
  first plausible fix) and `<missing_context_gating>` (don't guess missing repo facts; find them or
  state what's unknown).
- **Review / diagnosis (read-only)** — add `<grounding_rules>` (ground every claim in evidence; label
  inferences) and run with `--read-only` so the write, edit, and shell tools stay withheld.
- **Research / recommendations** — add `<research_mode>` (separate observed facts, inferences, open
  questions).

## Path discipline is scope guidance

An implementation run goes out under `--yolo`, which means no filesystem boundary: Command Code can
write anywhere the process can reach, not just under `--cd`. Name the files or directories it may
change, say plainly that everything else is off limits, and keep `<action_safety>` in every
write-capable brief. That is guidance, not a sandbox. A worktree isolates the checkout but does not
contain the process; use a container or another OS-enforced boundary when writes outside the target
tree are unacceptable. `touchedFiles` is only a review aid: it cannot show ignored files or writes
outside the repository.

## `git commit` is not blocked, only forbidden

Sibling delegates can rely on a sandbox refusing to write `.git`. This one cannot: under `--yolo`,
Command Code can commit, so the brief has to tell it not to. Record `HEAD` before dispatch and keep the
"do NOT run git add or git commit" line. If `HEAD` changed, inspect status, staged and unstaged diffs,
and the intervening log first. Only after confirming the whole commit range belongs to the run, use
`git reset --soft <recorded-baseline>` so you can review that range as a diff.

## Discover the real gates — don't hardcode

`<verification_loop>` is only useful if it names the project's *actual* commands. Read the repo's
`AGENTS.md` / `CLAUDE.md` / `Makefile` / `package.json` first and copy the real ones in (`make test`,
`npm run lint`, `cargo test`, `pytest -q`, whatever it is). A brief that says "run the tests" without
naming them gets you an implementer that guesses — or skips.

## Honor the repo's conventions

Command Code reads the repo's `AGENTS.md` automatically, so house rules there (style, forbidden
patterns, commit conventions) already apply. If the project forbids certain things in code — say,
spec/ticket IDs in comments, process language like "MVP"/"for now"/"phase N", or specific test
conventions, whatever the repo's own conventions ban — restate the load-bearing ones in the brief too,
because compliance is only as reliable as what's in front of it.

## One task per brief

Keep each brief to a single, bounded job. "Review this, fix what you find, update the docs, and
suggest a roadmap" produces a muddled run; split it into separate dispatches. One brief → one run →
one commit keeps review and rollback clean, and lets a later task assume the earlier one landed.

Turns are capped (Command Code's own default is 100; `--max-turns` changes it). A brief bundling four
jobs is also the brief most likely to hit that cap and stop mid-way, reported as `stopReason:
max_turns` with a half-finished tree.

## Premises freeze at dispatch

The implementer starts from the brief's facts and there is no steering channel mid-run. Audit the
fact block before sending — ownership, target branch, constraints, anything a judgment call rests
on. If a premise turns out wrong while the run is live, stop the run and re-dispatch a corrected
brief rather than discounting the output afterward; for a write-capable run, inspect the working
tree and reconcile any partial or premise-contaminated edits — keep or revert them — before the
re-dispatch.

## Expect environment preamble in the reply

The final message may carry environment noise on top of your requested report — a banner injected by
the repo's `AGENTS.md`, extra text from an MCP server or skill you have configured locally, taste
notes from Command Code's own learning. That comes from your setup, not a relay defect. The
`<structured_output_contract>` is your defense: ask for a clearly delimited report section so you can
find the real output regardless of what wraps it.

## A worked example

```xml
<task>
In the payments service at services/billing/, the refund path double-charges when a refund is retried
after a network timeout (the idempotency key isn't checked before re-submitting). Make the refund
submission idempotent: check for an existing refund by idempotency key before creating a new one.
Touch only services/billing/refund.py and its tests. Leave the charge path, the API routes, and the
data models untouched, and do not write outside services/billing/.
</task>

<verification_loop>
Run and make green before finishing:
  pytest tests/billing/ -q
  ruff check services/billing/
Confirm git status shows only refund.py and its test file changed.
</verification_loop>

<action_safety>
Scope strictly to the refund idempotency fix. No unrelated refactors. Do NOT git add or commit; leave
changes in the working tree for review.
</action_safety>

<structured_output_contract>
Report: (1) the root cause and your fix, (2) files touched, (3) pytest + ruff outcomes with counts,
(4) anything you left open or want decided.
</structured_output_contract>
```

Send this with `relay.mjs` (see [dispatch-and-poll.md](dispatch-and-poll.md)); review the result and
commit it yourself (see [review-and-land.md](review-and-land.md)).
