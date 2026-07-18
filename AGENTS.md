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

#### Mandatory Local Reviewer Gate for Skill Content

<!-- local-skill-reviewer-policy:v1 -->

For every canonical `SKILL.md` change or change to one of its tracked bundle files, the maintainer must complete this local gate before the official merge gate:

1. Stage only the exact changed skill and bundle blobs intended for review. The local reviewer reads the Git index; an unstaged correction is not reviewed, and unrelated paths must not be staged with it.
2. Use a private result directory outside the repository and run:

   ```bash
   npm run review:skills:local -- review <skill-id> --merge-gate --result-dir <private-temp-dir>
   ```

3. Inspect `triage.reviewStatus`, `triage.priority`, and `triage.reasonCodes`. For P0/P1, uncertain, or locally namespaced `manual-review-required` results, choose exactly one semantic preparation route.

   Single-skill semantic route (alternative to batch preparation):

   ```bash
   npm run review:skills:semantic:packet -- <skill-id> --result-dir <private-temp-dir>
   ```

   Obtain the Codex judgment for that packet, then import and verify it:

   ```bash
   npm run review:skills:semantic:import -- <skill-id> --input <codex-judgment.json> --result-dir <private-temp-dir>
   npm run review:skills:semantic:verify -- <skill-id> --result-dir <private-temp-dir>
   ```

   Batch semantic route (alternative to the single-skill packet command):

   ```bash
   npm run review:skills:semantic:prepare -- --result-dir <private-temp-dir>
   ```

   For each escalated skill in that batch, obtain its Codex judgment, then run the same `semantic:import` and `semantic:verify` commands above. Never run `semantic:packet` and `semantic:prepare` for the same skill in the same result directory.

4. After any correction, stage the exact intended blobs again and rerun the local reviewer, `npm run validate`, `npm run validate:references`, `npm run security:docs`, and the relevant tests.

The local status is identified by `source: local-skill-reviewer`. It is triage and review support only: it does not replace Tessl, is not the CI status with the same name, and does not satisfy the exact-head attestation. A truthful Tessl `review` or the normal maintainer attestation bound to the full head SHA remains the official merge gate.
