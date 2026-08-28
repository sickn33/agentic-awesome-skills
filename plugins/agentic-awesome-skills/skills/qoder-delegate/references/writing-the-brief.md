# Writing the brief

A brief is the complete task Qoder receives. It has no memory of this chat; it sees only the brief,
its resumed session when applicable, and workspace context it can inspect. A constraint not in the
brief or repository does not exist for the implementer.

## Model, context, and resumed sessions

Model and context-window choices belong to dispatch, not the brief. Select a requested model from the
fresh output of `qodercli --list-models`. Omit `--model` for Qoder's default. Pass
`--context-window <positive-integer>` only when an explicit size is useful and let Qoder reject an
unsupported model/size combination.

A resumed session keeps context. Send only the correction with `--resume-last` or `--resume <id>`.

## The shape that works

```xml
<task>
State the concrete job, where it lives, the current behavior, what must change, and what must remain
untouched. Keep it to one bounded task.
</task>

<verification_loop>
Run these before finishing and fix what they surface:
  <the project's real test command>
  <the project's real lint/format command>
  <the project's real build/typecheck command>
Confirm the working tree contains only intended changes.
</verification_loop>

<action_safety>
Keep changes scoped. Do not perform unrelated refactors, renames, or cleanup. Do NOT run git add or git
commit; the orchestrator reviews and commits. Leave work uncommitted.
</action_safety>

<structured_output_contract>
End with:
  1. What changed and why
  2. Files touched
  3. Gate outcomes with counts
  4. Deviations, open items, or decisions needed
</structured_output_contract>
```

For debugging, add `<completeness_contract>` so Qoder resolves the cause rather than stopping at the
first plausible fix, and `<missing_context_gating>` so it finds missing repository facts instead of
guessing.

## Discover the real gates

Read `AGENTS.md`, `CLAUDE.md`, `Makefile`, `package.json`, or the repository's equivalents before
writing the brief. Copy the actual commands. "Run the tests" makes the implementer guess.

## Honor repository conventions

Qoder loads repository context such as `AGENTS.md`, but restate load-bearing constraints directly in
the brief. This is especially important for forbidden commands, narrow file scope, data safety, and
the no-commit boundary.

## Ask for the report

The relay prefers Qoder's `result.result` for `finalMessage`, then falls back to assistant text blocks.
An explicit output contract makes the result reviewable even when the edits are correct.

## One task per brief

One brief -> one Qoder run -> one reviewed commit. Split mixed implementation, review, documentation,
and roadmap requests. Resume only for rework on that same task.

## Premises freeze at dispatch

Audit the brief's facts before dispatch: ownership, target branch, constraints, and any premise a
judgment call depends on. If one proves wrong during a run, stop Qoder, inspect and reconcile any
partial edits, then dispatch a corrected brief.

## Keep secrets out of argv

Qoder print mode receives the brief as a command-line argument, visible through process inspection on
the host. The relay rejects briefs over 120 KB, or 12 KB on native Windows where command lines are
shorter. Put secrets and large context in appropriately protected workspace files or environment
variables, then reference them by name or path.

Continue with [dispatch-and-poll.md](dispatch-and-poll.md), then
[review-and-land.md](review-and-land.md).
