# Writing the brief

A brief is the entire task as Grok will see it. Grok runs in a fresh process with **no memory of
your conversation, no access to your prior notes, and no shared context** — only the text you send and
whatever it can read from the working tree (including repo rules it discovers via `grok inspect`, and
the repo's own `AGENTS.md` when present).
If a constraint isn't in the brief or discoverable in the repo, it doesn't exist for Grok. The single
most common failure is a brief that assumes context Grok doesn't have.

## The shape that works

Grok responds best to compact, block-structured prompts with XML tags rather
than long prose. State the task, what "done" looks like, how to behave by default, and the few
constraints that actually matter. Add a block only when the task needs it — don't ship empty ceremony.

```xml
<task>
One or two sentences: the concrete job and where it lives. Then the specifics — current state, what to
change, and explicitly what to leave untouched. The "leave untouched" list is what keeps Grok from
wandering into unrelated refactors.
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
  inferences), tell Grok in the brief not to edit anything, and run with `--read-only`. Note
  `--read-only` is best-effort on grok, not a hard block — verify `touchedFiles` after the run.
- **Research / recommendations** — add `<research_mode>` (separate observed facts, inferences, open
  questions).

## Discover the real gates — don't hardcode

`<verification_loop>` is only useful if it names the project's *actual* commands. Read the repo's
`CLAUDE.md` / `AGENTS.md` / `Makefile` / `package.json` first and copy the real ones in (`make test`,
`npm run lint`, `cargo test`, `pytest -q`, whatever it is). A brief that says "run the tests" without
naming them gets you a Grok that guesses — or skips.

## Honor the repo's conventions

Grok discovers project configuration for the current directory (`grok inspect` shows rules, skills,
plugins, hooks, and MCP servers). House rules in the repo (style, forbidden patterns, commit
conventions) already apply when configured. If the project forbids certain things in code — say,
spec/ticket IDs in comments, process language like "MVP"/"for now"/"phase N", or specific test
conventions — restate the load-bearing ones in the brief too, because compliance is only as reliable
as what's in front of the implementer.

## One task per brief

Keep each brief to a single, bounded job. "Review this, fix what you find, update the docs, and
suggest a roadmap" produces a muddled run; split it into separate dispatches. One brief → one Grok
run → one commit keeps review and rollback clean, and lets a later task assume the earlier one landed.

## Premises freeze at dispatch

The implementer starts from the brief's facts and there is no steering channel mid-run. Audit the
fact block before sending — ownership, target branch, constraints, anything a judgment call rests
on. If a premise turns out wrong while the run is live, stop the run and re-dispatch a corrected
brief rather than discounting the output afterward; for a write-capable run, inspect the working
tree and reconcile any partial or premise-contaminated edits — keep or revert them — before the
re-dispatch.

## A worked example

```xml
<task>
In the payments service at services/billing/, the refund path double-charges when a refund is retried
after a network timeout (the idempotency key isn't checked before re-submitting). Make the refund
submission idempotent: check for an existing refund by idempotency key before creating a new one.
Touch only services/billing/refund.py and its tests. Leave the charge path, the API routes, and the
data models untouched.
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
