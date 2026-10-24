# Repository Guidelines

## Project Structure & Module Organization

This repository publishes an installable library of agent skills and plugin bundles. Canonical skill sources live in `skills/<skill-id>/SKILL.md`; use lowercase, hyphenated skill IDs. Mirrored plugin distributions live under `plugins/`. Contributor and user docs live in `docs/`; localized docs live in `docs_zh-CN/` and `docs/vietnamese/`. Maintenance scripts and tests are in `tools/scripts/` and `tools/scripts/tests/`. The hosted catalog app is in `apps/web-app/`. Registry outputs such as `CATALOG.md`, `skills_index.json`, and `data/catalog.json` are generated artifacts. Editorial inputs in `data/` remain source files; use `tools/scripts/generated_files.js` for the exact generated-file classification.

## Build, Test, and Development Commands

- `npm ci`: install root dependencies for scripts and validation.
- `npm run validate`: validate skill frontmatter, required sections, and schema rules.
- `npm run security:docs`: run safety checks for command, install, credential, and network guidance.
- `npm run test`: run the repository script test suite.
- `npm run build`: regenerate core indexes and build the catalog data.
- `npm run app:install`: install `apps/web-app` dependencies.
- `npm run app:dev`: start the local Vite catalog app.
- `npm run app:build`: build and prerender the catalog app.

Before PRs, run `npm run pr:preflight -- --base origin/main --head HEAD` from the clean committed source head. It runs the component policy in an isolated checkout; unknown and policy changes require the full suite.

## Coding Style & Naming Conventions

Use Markdown for skills and docs, JavaScript/Node for most tooling, and Python for audits and sync helpers. Keep skill directories lowercase with hyphens, for example `skills/my-awesome-skill/SKILL.md`. Start new skills from `docs/contributors/skill-template.md`; include frontmatter, `## When to Use`, examples, and limitations. Keep generated-file edits out of community PRs unless doing maintainer release or sync work.

## Testing Guidelines

Tests live mainly in `tools/scripts/tests/` and use Node assertions or Python `unittest`. Name new tests after the behavior under test, for example `installer_filters.test.js` or `test_validate_skills_strict.py`. Run targeted tests during development, then run the relevant npm scripts above. Web app changes should also run `npm run app:test` or `npm run app:test:coverage`.

## Commit & Pull Request Guidelines

History uses conventional-style subjects such as `feat: add ...`, `fix: refresh ...`, `docs: add ...`, and `chore: release ...`. Keep commits focused. PRs must use the default template, include the Quality Bar Checklist, link an issue when applicable, and allow maintainer edits. Source PRs should avoid generated registry artifacts; CI enforces this source-only contract.

## Agent-Specific Instructions

Respect deeper `AGENTS.md` files inside skill subtrees. When changing canonical skill content that is mirrored under `plugins/agentic-awesome-skills/` or `plugins/agentic-awesome-skills-claude/`, check whether mirrors must be synchronized. For release work, follow the scripted `release:prepare` and `release:publish` flow rather than hand-editing version surfaces.

### Current-Base Instruction Guard

Repository instructions must match the exact Git base used for the task. After creating a clean clone, worktree, or topic branch, re-read that base's `AGENTS.md`, `.github/MAINTENANCE.md`, canonical maintainer skill, and `package.json`; those files supersede instructions inherited from the checkout that launched the task.

Every command, script, reviewer, or gate described as mandatory must exist on the current task base. If it is absent, do not recover or execute it from another branch, worktree, stash, installed copy, or historical commit. Treat the mismatch as evidence that the procedure may have been retired, inspect `origin/main` and the relevant removal history, then follow the current-base contract or report the unresolved conflict.

### Mandatory Maintainer Workflow

For every repository maintenance sweep, PR merge batch, maintainer-side PR repair, canonical synchronization, combined Security/Quality cleanup and merge, or tag/release request, **always invoke and follow the `antigravity-maintainer-batch-release` skill before triage or mutation**. If the client has not installed or discovered that skill, read and follow the repository-canonical copy at `skills/antigravity-maintainer-batch-release/SKILL.md`. This is a hard gate, including when the user asks for direct merges or a direct update to `main`; do not substitute a generic Git or GitHub workflow.

Treat `main` as pull-request-only; use `npm run merge:batch` with strict protection and no admin bypass. Follow [the maintenance contract](docs/maintainers/maintenance-contract.md) for resumable review, release-only snapshots, immutable artifact publication and independent catalog revisions. Ordinary merges generate ephemeral validation data; general tracked distribution refresh belongs to protected release PRs. The maintenance contract defines a narrow owner-only exception for byte-identical canonical lockfile replicas during an explicitly requested no-release dependency-security repair; all checks and strict protection remain required.

Every stable or prerelease version must finish with the full-release-alignment gate. Verify the immutable released commit and public bytes even if main advances. Report personal MCP host updates and actual session reload separately. Only authorized existing host entries may be changed.

#### Skill Content Review Gate

For every canonical `SKILL.md` change or tracked bundle-file change, run `npm run validate`, `npm run validate:references`, `npm run security:docs`, and the relevant tests. Inspect semantics, safety, provenance, declared risk, limitations, and every bundled file. The official merge gate remains a truthful Tessl `review` or a maintainer review attested to the exact full head SHA; heuristic local scores and inferred risk labels are not merge authority.

Reviewed fork bundle exceptions are restricted to the protected-base ledger in
`tools/config/reviewed-fork-skills.json` and the current maintainer skill. They
bind a complete previously reviewed skill tree and still require exact-current-head
attestation, all required checks and strict protection; no general script allowlist
or PR-controlled ledger is authorized.

## Learned User Preferences

- For maintainer sweeps, PR merges, issue closure, and releases, follow the canonical `antigravity-maintainer-batch-release` skill together with `.github/MAINTENANCE.md`; do not substitute a generic Git or GitHub workflow.
- When executing an attached plan, implement the plan without editing the plan file; use existing todos instead of recreating them.
- Optional TypeSafe Jev tooling must accelerate triage and quality; never add mandatory steps to `merge:batch`, CI, or branch protection.
- Keep Jev usage within a small monthly TypeSafe budget by capping skills per run and treating output as advisory only.
- Store TypeSafe API keys only in gitignored `.env.local`; rotate any key exposed in chat, logs, or commits.
- Before committing new maintainer tooling, run a full validation round on a real open skill PR (worktree, deterministic checks, and Jev smoke when applicable).
- Release changelog and GitHub release notes must match the actual tag diff (skill counts, catalog totals, contributor thanks); emphasize catalog skills in user-facing notes, not maintainer-only tooling.
- Respond in Italian when the user writes maintainer or release requests in Italian.

## Learned Workspace Facts

- `npm run maintainer:jev-hints` evaluates skill content from the `--head` git ref via `git show`; pass `--repo` with a PR worktree when changed skills are not present on the current checkout.
- Jev hints default to five skills per run, exit 0 with a skip message when `TYPESAFE_API_KEY` is unset, and never satisfy Tessl or `--reviewed-head` skill review.
- Maintainer documentation for Jev lives in `docs/maintainers/jev-hints.md`; the upstream TypeSafe agent skill is installed under `.agents/skills/typesafe-ai/` via `npx skills add typesafe-ai/skills --skill typesafe-ai`.

### Maintainer state and attribution

Use private external review receipts and batch journals as described in the maintenance contract. They never replace current protection or exact-head evidence. Update code, rules, canonical skill, installed skill and negative regressions together when the user requests a workflow change.

Use `maintenance:cycle start/intake/merge/verify` for a measured source batch (its merge delegates to `merge:batch`); finish this no-release cycle before any authorized release preparation; read `docs/maintainers/maintenance-cycle.md`. Record blockers once, continue independent PRs and reuse the existing host verifier. Do not run release steps when no release was requested.


## Mandatory release cycle barrier

A release must never proceed with an unresolved PR in the recorded batch. Every
batch PR must be merged into protected main or closed without merge with an
owner rationale posted **before** closure and bound to its exact head. A policy
blocker is not completion and never authorizes bypassing merge protection or
closing an otherwise valid contribution merely to unlock publication.

Use `npm run maintenance:cycle -- close --state-dir /absolute/private/state --prs 123 --expected-head FULL_40_CHARACTER_SHA --reason 'Substantive reason, including the replacement PR when applicable'`.
This posts the required comment before closing; uncertain writes stop without a
retry. Plain undocumented closure does not satisfy verification. Merged PRs use
the existing protected merge path.

Run `maintenance:cycle verify` successfully on exact current main before
`npm run release:prepare -- X.Y.Z --state-dir /absolute/private/state`.
Preparation fails before branch creation or version changes without completed
cycle evidence. The release PR carries `data/release-cycle.json`; publication
and the npm workflow independently re-read live PR states, closure comments,
protected-main ancestry and successful CI/CodeQL for the verified source commit.
Reopened PRs, absent proof or failed checks block publication. Reverify if main
moves before preparation. Never shrink the recorded scope to hide blockers.

For a genuinely release-only task with no source PR batch, explicitly start a
cycle with `--prs none` and verify it; no implicit no-cycle bypass is supported.
The original batch inventory must include every PR in the authorized scope.
