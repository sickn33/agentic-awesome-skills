# CI and Team Policy

Use this reference when the user wants to prevent Drizzle migration conflicts in pull requests,
protected branches, or GitHub merge queues.

## Recommended layers

1. **Local developer habit**
   - Pull or merge the parent branch before generating a migration.
   - Generate migrations once schema source conflicts are resolved.
   - Run `drizzle-kit check` only after confirming its config/env do not target production.
2. **Pull request check**
   - Run the project's normal static checks.
   - Run `drizzle-kit check` or the package script that wraps it with explicit non-production config.
   - Run the read-only helper script to catch legacy journal/snapshot mismatches.
3. **Merge queue check**
   - If GitHub merge queue is enabled, run the same check on `merge_group` events.
   - Do not assume a successful PR check means the queued merge result is still conflict-free.

## GitHub Actions skeleton

Adapt package manager, config path, migration directory, and script location to the target
repository. The helper script must be vendored or copied into the repository before CI can run it.
Never point CI migration checks at production credentials.

```yaml
name: drizzle-migration-check

on:
  pull_request:
  merge_group:

jobs:
  drizzle-migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      # Run only with a non-production or disposable DATABASE_URL if the config requires one.
      - run: pnpm exec drizzle-kit check --config drizzle.config.ts
      # Example assumes the helper was copied to scripts/check_drizzle_migrations.py.
      - run: python3 scripts/check_drizzle_migrations.py --root . --config drizzle.config.ts --migrations-dir drizzle
```

If the repository does not vendor this skill, copy the helper script into the repo or run an
equivalent read-only check from the CI tooling repository. In multi-config repositories, pass the
same config and matching migration directory to both Drizzle Kit and the helper script.

The helper script exits with: `0` when all checked directories are clean, `1` when any error or
warning issue is found, and `2` when no migration directory was discovered at all. A CI step that
runs the script should fail the job on a non-zero exit, but treat exit `2` as "nothing to check"
only if the repo is expected to have no Drizzle migrations; otherwise exit `2` usually means
detection missed the migration directory and the config should be passed explicitly.

## What merge queue does and does not solve

Merge queue can serialize the final merge order and test a temporary merge result. It does not
rewrite Drizzle migrations, re-run `drizzle-kit generate`, or choose which branch's snapshots are
correct. The check should fail when generated migration history is inconsistent, then the developer
updates the branch and regenerates migrations.

## Policy recommendations

- Require one migration-generation point per PR after schema conflicts are resolved.
- Treat migration artifacts as generated but reviewable files: do not silently rewrite them in CI.
- Require `drizzle-kit check` or an equivalent conflict check before merge.
- In legacy projects, reject duplicate migration numbers and journal/snapshot drift.
- In folder-based projects, reject incomplete migration directories and failed commutativity checks.
- Keep production migration execution separate from PR validation.

## When CI should fail

Fail the job when any of these are true:

- `_journal.json` contains duplicate `idx` or `tag` values.
- A journal entry references a missing SQL file or snapshot.
- Root SQL or snapshot files exist but are not referenced by the journal in a legacy output.
- Migration files contain Git conflict markers.
- A folder-based migration directory is missing `migration.sql` or `snapshot.json`.
- `drizzle-kit check` reports a non-commutative migration conflict.
