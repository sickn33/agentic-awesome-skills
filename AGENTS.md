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
