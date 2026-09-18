# Writing the brief

A brief is the entire task as Vibe will see it. It runs in a separate session with **no memory of your
conversation, no access to prior notes, and no shared context** — only the text you send and whatever
it can inspect in the workspace. If a constraint is not in the brief or discoverable in the repo, it
does not exist for Vibe.

## Resumed sessions

A resumed run keeps the session context. Send only the delta brief with `--resume-last` or
`--session <id>`.

## The shape that works

Use a compact, block-structured brief. State the task, what done means, the few constraints that
matter, and the report Vibe must return.

```xml
<task>
One or two sentences: the concrete job and where it lives. Then the specifics — current state, what to
change, and explicitly what to leave untouched. The leave-untouched list prevents unrelated refactors.
</task>

<verification_loop>
These are the real project gates the orchestrator will run after dispatch:
  <the project's real test command>
  <the project's real lint/format command>
  <the project's real build/typecheck command>
If shell execution was explicitly authorized for this run, run them and fix what they surface.
Otherwise do not claim they ran; perform the inspections available to you and report the gates as not run.
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
  3. Gate outcomes with counts, or exactly which gates were not run
  4. Anything you deviated on, left open, or want a decision on
</structured_output_contract>
```

Add extra blocks only when the task needs them:

- **Debugging or open-ended fixes** — add `<completeness_contract>` (resolve fully, not just the
  first plausible cause) and `<missing_context_gating>` (find missing repo facts or state what is
  unknown).
- **Research or recommendations** — add `<research_mode>` (separate observed facts, inferences, and
  open questions).

## Always ask for the report explicitly

The relay uses Vibe's last non-empty assistant message as `finalMessage`. Without a
closing summary, the edits may exist but the result is hard to review. The
`<structured_output_contract>` block makes the expected report explicit.

## Discover the real gates

Read the repo's `AGENTS.md`, `CLAUDE.md`, `Makefile`, `package.json`, or equivalent first and copy the
actual commands into `<verification_loop>`. Default `accept-edits` runs cannot execute most gates
headlessly, but naming them lets the orchestrator run the same commands after dispatch. Ask Vibe to
run them only when the human explicitly authorized `--full-access`.

## Honor repo conventions

Restate the load-bearing house rules in the brief. Vibe can inspect the workspace, but the important
constraints should be directly in front of it.

## One task per brief

Keep each brief bounded. One brief → one Vibe run → one reviewed commit keeps the diff and rollback
clean. Split mixed implementation, review, documentation, and roadmap requests into separate
dispatches.

## Premises freeze at dispatch

Vibe starts from the brief's facts and there is no steering channel mid-run. Audit ownership, target
branch, constraints, and other judgment-bearing premises before dispatch. If one proves wrong while
the run is live, stop it and inspect the working tree before sending a corrected brief; reconcile any
partial or premise-contaminated edits rather than discounting them after the fact.

## A worked example

```xml
<task>
In the payments service at services/billing/, the refund path double-charges when a refund is retried
after a network timeout. Make refund submission idempotent: check for an existing refund by idempotency
key before creating a new one. Touch only services/billing/refund.py and its tests. Leave the charge
path, API routes, and data models untouched.
</task>

<verification_loop>
The orchestrator will run:
  pytest tests/billing/ -q
  ruff check services/billing/
If shell execution is authorized for this run, run them and fix failures. Otherwise report them as
not run and confirm only refund.py and its test file changed.
</verification_loop>

<action_safety>
Scope strictly to the refund idempotency fix. No unrelated refactors. Do NOT git add or commit; leave
changes in the working tree for review.
</action_safety>

<structured_output_contract>
Report: (1) the root cause and fix, (2) files touched, (3) pytest and ruff outcomes with counts or
that they were not run,
(4) anything left open or needing a decision.
</structured_output_contract>
```

## Argv delivery limits

Vibe's headless mode requires the brief as a command-line argument via `--prompt`. The relay reads a
file or stdin for convenience, then passes the text with `--prompt=<brief>`. The equals form binds a
brief that starts with `-` instead of treating it as another flag.

This has two consequences:

- The brief is visible in the host process list (`ps`, `/proc`). Keep secrets out of it on shared
  machines; reference workspace files or environment variables instead.
- A brief over 120 KB on POSIX or 12 KB on Windows is rejected before launch because the platforms
  cap command arguments. Put large context in the workspace and tell Vibe which file to read.

Dispatch with [dispatch-and-poll.md](dispatch-and-poll.md), then review and commit with
[review-and-land.md](review-and-land.md).
