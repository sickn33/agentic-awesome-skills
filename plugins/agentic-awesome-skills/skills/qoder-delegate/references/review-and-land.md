# Review and land

Qoder did the typing; the orchestrator owns the judgment. Verify reality, not the self-report.

## Review changed tests first

- Treat unbriefed test edits as contract changes.
- Treat skipped, disabled, or commented tests as failures.
- Treat loosened assertions as weakened gates.

## Re-run the gates

`finalMessage` contains Qoder's claims. Run the repository's actual test, lint, typecheck, and build
commands yourself. For specialized changes:

- Round-trip migrations and schemas.
- Search for dangling references after removals and renames.
- Exercise stateful behavior, not only compilation.

## Compare the diff to the brief

Start with `touchedFiles`, then read the full diff for:

- **Scope creep** - excluded changes.
- **Scope shortfall** - missing behavior or cleanup.
- **Quiet decisions** - defensible but unasked choices requiring review.

`touchedFiles` is final tree state, not attribution. Start clean when possible and inspect every
`--add-dir` workspace separately.

## Implementer sweep

Look for hardcoded success data, swallowed errors, nonexistent dependencies or APIs, dead helpers,
duplicate patterns, tests that assert internals, speculative options, and guards that hide missing
trust-boundary validation. Run relevant guard skills if installed.

## Rework with a delta brief

Continue the same Qoder session with only the correction:

```bash
echo "Keep the fix, replace the mocked DB assertion with the real migrated fixture, remove the unused import, and rerun the stated gates." |
  node "<skill-dir>/scripts/relay.mjs" --resume-last --cd /path/to/repo
```

Use `--resume <id>` for the specific `sessionId` in `result.json`. Rework receives the same independent
gate and diff review.

## Commit boundary

When the gates pass and the diff holds, **the orchestrator commits**. Qoder must never run `git add` or
`git commit` for this workflow.

Until then, the working tree is the authoritative copy of the implementer's work. Before any cleanup
or branch switch, inspect `git status`, `git diff`, `git diff --cached`, and every untracked file.
Staged and untracked work is invisible to a plain `git diff`; preserve it until the review decides
what to keep.

## Surface, do not absorb

- Report Qoder's design decisions and defensible deviations.
- Note non-blocking issues you did not block on.
- Stop and ask when correct completion requires expanding the brief.

For queues, keep these notes in the progress file described in
[multi-task-queues.md](multi-task-queues.md).
