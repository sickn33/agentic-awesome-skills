# Writing the brief

A brief is the entire task as omp will see it. It runs in a separate session with **no memory of
your conversation, no access to prior notes, and no shared context** - only the text you send and
whatever it can inspect in the workspace. If a constraint is not in the brief or discoverable in
the repo, it does not exist for omp.

One shortcut: omp auto-loads `AGENTS.md` and `CLAUDE.md` context files from the workspace and its
parent directories, so conventions written there reach omp without inlining. Restate the
load-bearing rules in the brief anyway - the brief is the contract. Project `.omp` skills, rules,
and extensions stay undiscovered unless the dispatch passed `--approve`.

## Model choice and resumed sessions

omp uses its configured default model when `--model` is omitted, so a fresh dispatch does not
require it. Pass `--model <id>` only when the human asked for a specific model.

**How to choose an id:**

1. Run `omp models` (human table) or `omp models --json`. Narrow with `omp models find <substring>`
   or `omp models <provider>`.
2. Copy a catalog id (often `provider/model-id`, sometimes a unique substring omp can fuzzy-match).
3. Pass it as the relay's `--model`. Add `--provider <name>` when two providers share a short name.

Do **not** run `omp --list-models`. That flag was removed; omp exits 2 with `unknown flag:
--list-models`. Do **not** pass `--api-key` through the relay.

`--thinking` is independent of `--model`. Use `off`, `auto`, `minimal`, `low`, `medium`, `high`,
`xhigh`, or `max`. The relay rejects any other value before dispatch.

A resumed run keeps the session context. Send only the delta brief with `--resume-last` or
`--session <id>`.

## The shape that works

Use a compact, block-structured brief. State the task, what done means, the few constraints that
matter, and the report omp must return.

```xml
<task>
One or two sentences: the concrete job and where it lives. Then the specifics - current state, what to
change, and explicitly what to leave untouched. The leave-untouched list prevents unrelated refactors.
</task>

<verification_loop>
Run these before finishing and fix anything they surface, do not just report it:
  <the project's real test command>
  <the project's real lint/format command>
  <the project's real build/typecheck command>
Confirm the working tree shows only the intended changes afterward.
</verification_loop>

<action_safety>
Keep changes scoped to the task. No unrelated refactors, renames, or cleanup unless required for
correctness. Do NOT run git add or git commit - the orchestrator commits after reviewing. Leave the
work uncommitted in the working tree.
</action_safety>

<structured_output_contract>
End with a report in this exact shape:
  1. What changed and why
  2. Files touched
  3. Gate outcomes (include test/lint counts)
  4. Anything you deviated on, left open, or want a decision on
</structured_output_contract>
```

Add extra blocks only when the task needs them:

- **Debugging or open-ended fixes** - add `<completeness_contract>` (resolve fully, not just the
  first plausible cause) and `<missing_context_gating>` (find missing repo facts or state what is
  unknown).
- **Research or recommendations** - add `<research_mode>` (separate observed facts, inferences,
  and open questions), and dispatch with `--read-only` so omp cannot invoke write/edit/bash tools.
  That restricts the tool surface; it is not a sandbox. `AGENTS.md` and `CLAUDE.md` are also
  repository-controlled instructions and may load without `--approve`. Use read-only dispatches
  for untrusted repositories. Leave `--approve` off unless the user trusts this repo's `.omp`
  extras (the relay already passes `--no-extensions --no-skills --no-rules` unless `--approve`
  is set).

## Always ask for the report explicitly

The relay builds `finalMessage` from assistant text in omp's JSON event stream. Without a closing
summary, the edits may exist but the result is hard to review. The `<structured_output_contract>`
block makes the expected report explicit.

## Discover the real gates

Read the repo's `AGENTS.md`, `CLAUDE.md`, `Makefile`, `package.json`, or equivalent first and copy
the actual commands into `<verification_loop>`. A brief that says only "run the tests" makes the
implementer guess or skip them.

## Honor repo conventions

Restate the load-bearing house rules in the brief. omp can inspect the workspace (and auto-loads
context files), but the important constraints should be directly in front of it.

## One task per brief

Keep each brief bounded. One brief -> one omp run -> one reviewed commit keeps the diff and
rollback clean. Split mixed implementation, review, documentation, and roadmap requests into
separate dispatches.

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
after a network timeout. Make refund submission idempotent: check for an existing refund by idempotency
key before creating a new one. Touch only services/billing/refund.py and its tests. Leave the charge
path, API routes, and data models untouched.
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
Report: (1) the root cause and fix, (2) files touched, (3) pytest and ruff outcomes with counts,
(4) anything left open or needing a decision.
</structured_output_contract>
```

## Stdin delivery

The relay pipes the brief to omp on stdin. Unlike CLIs that take the brief as an argument, there
is no OS argv size cap and the brief never appears in the host process list. Large context can be
inlined, but prefer pointing omp at workspace files it can read itself. Keep secrets out of the
brief anyway on shared machines - reference environment variables or files with tight permissions.

Dispatch with [dispatch-and-poll.md](dispatch-and-poll.md), then review and commit with
[review-and-land.md](review-and-land.md).
