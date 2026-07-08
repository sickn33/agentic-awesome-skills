# Report Template

Use this template for diagnosis and repair recommendations. Keep reports short and evidence-based.

## Conclusion values

- `NO_CONFLICT_FOUND` - No migration conflict or structural inconsistency was found from available
  evidence.
- `SAFE_TO_REGENERATE` - The conflict is understood, schema source is resolved, and the recommended
  next step is to discard generated artifacts and regenerate migrations.
- `NEEDS_USER_CONFIRMATION` - A repair path exists, but a destructive step or branch-side decision
  requires confirmation.
- `BLOCKED_BY_AMBIGUITY` - The migration structure, source-of-truth branch, schema state, or
  migration directory cannot be determined safely.

## Template

````markdown
# Drizzle Migration Conflict Report

Conclusion: <NO_CONFLICT_FOUND | SAFE_TO_REGENERATE | NEEDS_USER_CONFIRMATION | BLOCKED_BY_AMBIGUITY>
Mode: <diagnose | repair | ci-hardening | explain>

## Detected Structure
- Migration directory: `<path>`
- Structure: <legacy | folder-based | mixed | unknown>
- Drizzle Kit version: <version or unable to verify>
- Git state: <clean | dirty | active merge | active rebase | unable to verify>

## Conflict State
- <confirmed conflict or inconsistency with file paths>
- <journal/snapshot/SQL mismatch, non-commutative check, or conflict marker evidence>

## Recommended Path
- <safe next step>
- <why this path preserves schema intent and migration history>

## Commands
```bash
# Read-only commands first.
<commands>

# Destructive commands only if confirmed by the user.
<commands requiring confirmation>
```

## Files At Risk
- `<path>` - <why it may be discarded or regenerated>

## Validation
- <drizzle-kit check or project script>
- <helper script command>
- <typecheck/test command if relevant>

## Unable To Verify
- <missing version, unavailable branch, unknown migration path, or external docs not refreshed>
````

## Reporting rules

- Put destructive commands in a clearly labeled block.
- Do not output `--ours` or `--theirs` commands unless the merge/rebase direction, source-of-truth
  branch, and exact file paths are confirmed. Otherwise use `BLOCKED_BY_AMBIGUITY`.
- If the project has multiple Drizzle configs, report each output independently.
- If no conflict is found but the worktree is dirty, state that uncommitted files were not repaired.
- Do not include clean checklist categories that are irrelevant to the user's conflict.
- Redact secrets. Never include database URLs, passwords, tokens, or connection strings in the
  report. When a config or env value matters, describe only whether it points at a production-like
  target and write the value as `<redacted>`.
