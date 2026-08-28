# Review and land

The separate Claude session did the typing; the orchestrator owns the judgment. Verify against the
working tree and gate output, never against the implementer's self-report.

## Review tests before trusting gates

If existing tests changed, inspect those edits first:

- An unbriefed test edit is a contract change, not automatically part of the fix.
- Treat a new skip, disable marker, commented-out case, or deleted test as a failure until justified.
- Reject assertions weakened from exact behavior to contains/truthy, broader error types, or wider
  tolerances unless the brief required that semantic change.

A green gate proves less if the implementer shortened the yardstick.

## Re-run the gates

`finalMessage` reports Claude's claims. Run the project's actual test, lint, format, type, and build
commands yourself in the final working tree and read their output. Passing is necessary, not
sufficient.

Add verification suited to the change:

- **Migrations/schema:** apply, reverse, and re-apply from a clean scratch state; check drift.
- **Removals/renames:** search repository-wide for dangling names and stale docs/config.
- **Stateful behavior:** exercise the behavior, not only compilation.
- **Generated output:** regenerate it through the canonical command and compare.

## Inspect the complete tree

Start with `touchedFiles`, but remember it is final git porcelain, not attribution. It includes
pre-existing dirt and can omit modifications inside ignored files. Inspect:

```bash
git status --short
git diff
git diff --cached
```

Open every untracked file directly; ordinary `git diff` does not show its contents. Review staged
changes even though the relay denies common direct `git commit`/`git push` shell forms and the brief
forbids staging. A local hook, another tool, or an unusual command path may still have touched the
index.

For `--read-only`, treat `readOnlyViolation: true` as a hard warning and `null` as unknown. `false`
means the Git-visible tripwire had complete coverage and detected no change. Ignored paths, submodule
internals, perfect restores, and attribution remain outside its contract. Compare the actual diff when
read-only integrity matters.

## Hold the diff against the brief

- **Scope creep:** files or behavior the brief excluded, unrelated cleanup, opportunistic renames.
- **Scope shortfall:** missing edge cases, integration updates, cleanup, or required gates.
- **Quiet judgment calls:** defensible choices not authorized by the brief. Understand and surface
  them rather than silently accepting them.
- **Repository constraints:** especially constraints copied from `AGENTS.md`, which Claude Code does
  not generically auto-load.

## Implementer sweep

Generated code can satisfy tests while remaining wrong. Check every diff for:

- hardcoded success, fixture values, or fake fallbacks on real-work paths;
- broad catches that suppress failures and return defaults;
- APIs, methods, flags, and dependencies absent from the installed versions;
- unused imports, uncalled helpers, unreachable branches, and scaffolding comments;
- a second HTTP client, error idiom, state mechanism, or logging style beside the existing one;
- tests that assert implementation details or mock the project's own behavior;
- near-duplicate tests that inflate volume without adding behavior coverage;
- optional parameters, configuration, or abstractions with no caller;
- guards for impossible internal states that obscure real trust-boundary validation;
- network or filesystem assumptions hidden by the implementer's environment.

Run relevant guard skills when installed. Anything blocking goes back through a delta brief or is
fixed in the tree, and either choice is reported to the human.

## Preserve interrupted work

From dispatch until a reviewed commit, the uncommitted tree is the authoritative copy. Do not
reflexively run `git checkout`, `git reset`, `git clean`, or switch branches after a timeout, abort, or
failed result. First inspect status, unstaged and staged diffs, untracked files, `events.jsonl`, and
`stderr.txt`. After inspection, discarding premise-invalid work can be the correct decision.

## Rework in the same session

Send only the review delta:

```bash
echo "The runtime fix is correct. Replace the mocked database test with the existing migrated fixture,
remove the unused import, rerun the original gates, and leave the tree uncommitted." |
  node "<skill-dir>/scripts/relay.mjs" --session <id> --cd /path/to/repo
```

Use `--resume-last` only when the latest session for that cwd is unambiguous. `--session <id>` is safer
when several Claude sessions exist. The relay maps them to `--continue` and `--resume`, respectively,
and re-passes the permission profile.

Rework gets the same test review, gate rerun, diff review, and implementer sweep. Repeat until the work
holds.

## Commit boundary

When the gates pass and the diff satisfies the brief, **the orchestrator commits**, never the
implementer. Write a clear message describing what landed.

## Surface, do not absorb

The human opted into delegation, so landing verified work is the contract. Keep them informed when
the work changes shape:

- report design decisions and defensible-but-unrequested turns;
- note non-blocking concerns you chose not to block on;
- stop and ask when correct completion requires expanding the brief.

For a queue, record these in the progress file described in
[multi-task-queues.md](multi-task-queues.md).
