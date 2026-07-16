# Repository Guidelines

## Project Structure & Module Organization

This repository publishes an installable library of agent skills and plugin bundles. Canonical skill sources live in `skills/<skill-id>/SKILL.md`; use lowercase, hyphenated skill IDs. Mirrored plugin distributions live under `plugins/`. Contributor and user docs live in `docs/`; localized docs live in `docs_zh-CN/` and `docs/vietnamese/`. Maintenance scripts and tests are in `tools/scripts/` and `tools/scripts/tests/`. The hosted catalog app is in `apps/web-app/`. Registry outputs such as `CATALOG.md`, `skills_index.json`, and `data/*.json` are generated artifacts.

## Build, Test, and Development Commands

- `npm ci`: install root dependencies for scripts and validation.
- `npm run validate`: validate skill frontmatter, required sections, and schema rules.
- `npm run security:docs`: run safety checks for command, install, credential, and network guidance.
- `npm run test`: run the repository script test suite.
- `npm run build`: regenerate core indexes and build the catalog data.
- `npm run app:install`: install `apps/web-app` dependencies.
- `npm run app:dev`: start the local Vite catalog app.
- `npm run app:build`: build and prerender the catalog app.

Before PRs, run `npm run validate && npm run test && npm run security:docs`.

## Coding Style & Naming Conventions

Use Markdown for skills and docs, JavaScript/Node for most tooling, and Python for audits and sync helpers. Keep skill directories lowercase with hyphens, for example `skills/my-awesome-skill/SKILL.md`. Start new skills from `docs/contributors/skill-template.md`; include frontmatter, `## When to Use`, examples, and limitations. Keep generated-file edits out of community PRs unless doing maintainer release or sync work.

## Testing Guidelines

Tests live mainly in `tools/scripts/tests/` and use Node assertions or Python `unittest`. Name new tests after the behavior under test, for example `installer_filters.test.js` or `test_validate_skills_strict.py`. Run targeted tests during development, then run the relevant npm scripts above. Web app changes should also run `npm run app:test` or `npm run app:test:coverage`.

## Commit & Pull Request Guidelines

History uses conventional-style subjects such as `feat: add ...`, `fix: refresh ...`, `docs: add ...`, and `chore: release ...`. Keep commits focused. PRs must use the default template, include the Quality Bar Checklist, link an issue when applicable, and allow maintainer edits. Source PRs should avoid generated registry artifacts; CI enforces this source-only contract.

## Agent-Specific Instructions

Respect deeper `AGENTS.md` files inside skill subtrees. When changing canonical skill content that is mirrored under `plugins/agentic-awesome-skills/` or `plugins/agentic-awesome-skills-claude/`, check whether mirrors must be synchronized. For release work, follow the scripted `release:prepare` and `release:publish` flow rather than hand-editing version surfaces.

### Mandatory Maintainer Workflow

For every repository maintenance sweep, PR merge batch, maintainer-side PR repair, canonical synchronization, combined Security/Quality cleanup and merge, or tag/release request, **always invoke and follow the `antigravity-maintainer-batch-release` skill before triage or mutation**. This is a hard gate, including when the user asks for direct merges or a direct update to `main`; do not substitute a generic Git or GitHub workflow.

Treat `main` as pull-request-only. Perform maintainer edits on a topic branch or in a clean temporary clone, merge accepted source PRs with `npm run merge:batch`, and let the protected canonical-sync PR own generated state and contributor-credit drift. Never retry a rejected direct push to `main` and never use a generic push helper for releases.

Use the skill's end-to-end sequence: complete triage, repair mergeable source PRs, run checks in parallel, merge source PRs in conflict-aware order, perform one canonical synchronization after the source batch, use the scripted protected-release flow when requested, and verify final `main`, tag, GitHub Release, npm package, CI, and live public surfaces. For changed `SKILL.md` files, distinguish a real Tessl `review` from `manual-review-required`; the latter means Tessl did not run and requires a maintainer review attested to the exact full head SHA. If the skill is unavailable or unreadable, stop before making repository changes and report that blocker explicitly.
