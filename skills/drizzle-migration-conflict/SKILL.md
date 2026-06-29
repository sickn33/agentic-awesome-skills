---
name: drizzle-migration-conflict
description: "Diagnose, repair, and prevent Drizzle Kit migration conflicts involving generated SQL, snapshots, journals, merge queues, and team workflows."
category: databases
risk: critical
source: community
source_repo: chaunsin/agent-skills
source_type: community
date_added: "2026-06-29"
author: chaunsin
tags: [drizzle, migrations, database, ci, merge-conflicts]
tools: [git, python, rg]
license: "Apache-2.0"
license_source: "https://github.com/chaunsin/agent-skills/blob/master/LICENSE"
---

# Drizzle Migration Conflict

Use this skill to help a user diagnose, repair, and prevent Drizzle Kit migration conflicts in a
multi-developer repository. Drizzle migrations encode both SQL and migration snapshots, so the safe
answer depends on the current migration directory shape, the Drizzle Kit version, and the git state.

## When to Use This Skill

- Use when Drizzle migration files, `_journal.json`, or `snapshot.json` conflict after a pull, merge, rebase, or PR update.
- Use when `drizzle-kit check` reports non-commutative migrations or migration folder conflicts.
- Use when a team wants a safe repair flow for generated Drizzle migrations after schema changes converge.
- Use when designing CI or merge-queue policy to prevent repeated Drizzle migration conflicts.

## Safety rules

- Start in read-only diagnosis mode unless the user explicitly asks to fix files.
- Do not run `drizzle-kit migrate`, `drizzle-kit push`, database seed scripts, or any command that
  connects to a live database unless the user explicitly requests it and the target is clear.
- Treat `drizzle-kit check`, project typechecks, and tests as command execution that may load project
  config, environment variables, or scripts. Inspect scripts/config first, and require an explicit
  non-production or disposable target before any DB-backed validation.
- Do not delete migration files, rewrite `_journal.json`, or run `git checkout --ours`,
  `git checkout --theirs`, `git restore`, or `rm` unless the user has confirmed the exact side and
  files to change.
- Do not recommend `drizzle-kit push` as the production solution for migration conflicts; it skips
  the auditable migration history that teams need.
- Treat `--ignore-conflicts` as an exception for a known false positive, not as the normal fix.
- Preserve schema source code changes unless the user explicitly asks to discard them. Conflict
  repair normally discards generated migrations and regenerates them from the merged schema.
- If `ours` and `theirs` could mean different branches depending on merge direction, ask the user to
  identify the parent branch before suggesting checkout commands.

## Required references

- Read `references/sources.md` when the answer depends on current Drizzle behavior, official
  guidance, or one of the preserved external links.
- Read `references/conflict-resolution.md` before recommending a repair flow.
- Read `references/ci-policy.md` before proposing CI, merge queue, or team workflow changes.
- Read `references/report-template.md` before writing a diagnostic report.

## Source references

The full list of official docs, Drizzle GitHub discussions, community scripts, and merge-queue
references lives in `references/sources.md` with trust levels and caveats. Read that file whenever
the answer depends on current Drizzle behavior. Re-verify the official docs and the most relevant
discussion when the project's `drizzle-kit` major version changes, since migration internals
(snapshot format, journal shape, `drizzle-kit check` semantics) have shifted between releases.

## Mode selection

Classify the task first:

1. **Diagnose** - The user has a conflict or failed `drizzle-kit check` and wants to understand it.
2. **Repair** - The user explicitly asks to fix or regenerate migration files.
3. **CI hardening** - The user wants to prevent future conflicts in PRs or merge queues.
4. **Explain** - The user wants a conceptual answer or a team playbook.

When the mode is not explicit, choose Diagnose.

Each mode unlocks a specific set of actions. Do not cross these boundaries without an explicit upgrade:

- **Diagnose** - read-only only. Run `git status`, `git ls-files -u`, the helper script, and file
  inspection. Do not run `drizzle-kit check`, typechecks, tests, or any write command. Report
  findings and the proposed repair path, but do not execute it.
- **Repair** - adds file writes and `drizzle-kit generate`/`check` execution, each gated by the
  Safety rules and explicit confirmation of the exact files and side (`ours`/`theirs`) to change.
- **CI hardening** - adds proposing or editing CI/workflow files. Do not run migration commands
  against the user's database to validate the workflow; validate the workflow syntax and logic only.
- **Explain** - conceptual only. No commands against the repo beyond optional read-only inspection.

## Repository discovery

Collect repo facts before giving commands:

```bash
git status --short
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git ls-files -u
rg --files -g 'drizzle.config.*' -g 'package.json' -g 'pnpm-lock.yaml' -g 'yarn.lock' -g 'package-lock.json'
```

Then inspect the relevant files:

- `drizzle.config.*` for `out`, `schema`, dialect, and config shape.
- `package.json` scripts for the project-approved `generate`, `check`, and `migrate` commands.
- `package.json` dependencies or lockfile snippets for `drizzle-kit` and `drizzle-orm` versions.
- The migration output directory, either from config or common names like `drizzle/`, `migrations/`,
  or `src/db/migrations/`.

If this skill's helper script is available, run it in read-only mode:

```bash
python3 <skill-dir>/scripts/check_drizzle_migrations.py --root .
```

Resolve `<skill-dir>` to the installed skill directory before running. Check these locations in order
and use the first that contains `scripts/check_drizzle_migrations.py`:

1. The target repository's vendored copy: `<repo-root>/skills/drizzle-migration-conflict`.
2. The Claude Code skills directory: `~/.claude/skills/drizzle-migration-conflict`.
3. Any other install location reported by the user's environment.

If none of these resolve, fall back to the manual `git`/`rg` inspection commands above and tell the
user the helper script was not found. Use `--config <file>` and `--migrations-dir <dir>` when the
project has multiple Drizzle configs or outputs. The script never connects to a database and never
writes files; it only reads migration directories and reports structural issues.

## Migration structure decision

Identify the structure before proposing a fix:

- **Legacy structure**: `<out>/meta/_journal.json`, `<out>/meta/*_snapshot.json`, and root-level
  migration SQL files such as `<out>/0003_name.sql`.
- **Folder-based structure**: each migration is a directory containing `migration.sql` and
  `snapshot.json`.
- **Unknown or mixed structure**: stop and report ambiguity. Do not guess a destructive repair.

## Recommended repair principles

- Resolve schema source conflicts first. The regenerated migration must reflect the merged schema,
  not one side's stale snapshot.
- Treat the parent or target branch migration history as the source of truth when repairing a feature
  branch after updating from that branch.
- Prefer discarding and regenerating generated migration artifacts over hand-editing journal or
  snapshot files.
- After regeneration, validate in tiers: database-free structural checks first; then `drizzle-kit
  check` only after confirming its config/env cannot point at production; then project tests only
  after inspecting the scripts and any database targets.
- If the user asks to apply changes, state exactly which files will be changed before performing the
  write.

## Output rules

- Use the user's language when practical, but keep command snippets and file paths literal.
- State the detected migration structure and selected mode.
- Separate confirmed conflicts from assumptions and missing evidence.
- Give a safe default path first, then optional automation or CI hardening.
- For destructive steps, label them as "requires confirmation" and explain what will be lost.
- Never echo secrets. When inspecting `drizzle.config.*`, `.env`, or environment variables, do not
  include database URLs, passwords, tokens, or connection strings in the report. Reference them as
  `<redacted>` or describe only whether they point at a production-like target.
- Use the conclusion values from `references/report-template.md` for diagnostic reports:
  `NO_CONFLICT_FOUND`, `SAFE_TO_REGENERATE`, `NEEDS_USER_CONFIRMATION`, or `BLOCKED_BY_AMBIGUITY`.

## Limitations

- This skill cannot guarantee that a regenerated migration is production-safe without review against the target database state and deployment process.
- It does not run DB-backed migration commands unless the user explicitly confirms the target and the command.
- It is focused on Drizzle Kit migration conflicts, not general schema design or application-query optimization.

## Test prompts

Use these prompts to validate the skill behavior:

- "My Drizzle `_journal.json` and `0003_snapshot.json` conflict during merge. Tell me what to do."
- "We upgraded to the migration folder layout and `drizzle-kit check` reports a non-commutative conflict."
- "Design CI so our team stops merging broken Drizzle migrations."
- "Can I solve this production Drizzle migration conflict with `drizzle-kit push`?"
- "Use the links in the skill to re-check the current official Drizzle migration conflict guidance."
- "We're halfway through moving from the legacy flat layout to folder-based migrations. How do we handle a conflict during the transition?"
- "Our `drizzle.config.ts` sets `out` from `process.env.MIGRATIONS_DIR`, and the helper says no out directory was found. What now?"
- "`drizzle-kit check` keeps failing on a migration we know commutes. Can we just always pass `--ignore-conflicts`?"
