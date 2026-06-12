# Maintenance Walkthrough - 2026-04-17

- Imported 8 frontend/design skills from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) into `skills/`:
  - `design-taste-frontend`
  - `gpt-taste`
  - `redesign-existing-projects`
  - `high-end-visual-design`
  - `minimalist-ui`
  - `industrial-brutalist-ui`
  - `stitch-design-taste`
  - `full-output-enforcement`
- Normalized the imported skill metadata to repository conventions:
  - folder names match `name`
  - `risk`, `source`, `source_repo`, `source_type`, `author`, and `date_added` are present
  - descriptions are shortened for validation
  - `## When to Use` sections were added where the upstream files did not have one
- Preserved the upstream `stitch-design-taste/DESIGN.md` artifact.
- Added source attribution for `Leonxlnx/taste-skill` in `README.md` and `docs/sources/sources.md`.

# Maintenance Walkthrough - 2026-04-05

- Merged community PR batch `#487`, `#488`, `#489`, and `#490` on GitHub with squash, following the maintainer GitHub-only merge contract instead of local integration.
- Used the repository batch shortcut for the initial pass, then switched to the manual maintainer playbook when fork metadata drift produced stale `pr-policy` failures on reopened PRs.
- Repaired PR `#488` on the contributor branch by adding the missing `fruitwyatt/puzzle-activity-planner` source credit to `README.md`, then pushed the maintainer fix back to the fork and re-ran the fork workflows.
- Normalized PR `#490` by patching the body to include the required `## Quality Bar Checklist ✅` section, then closed and reopened it to force fresh `pull_request` checks against the updated metadata.
- Approved the pending fork workflow runs for PRs `#487` through `#490` after each reopen/push cycle so `Skills Registry CI`, `Skill Review & Optimize`, `Dependency Review`, and `CodeQL` could execute on the contributor heads.
- Ran the mandatory post-merge `npm run sync:contributors` follow-up after each successful merge and pushed the resulting README contributor-sync commits directly to `main` when the sync changed tracked files.
- Prepared the `v9.12.0` release notes in `CHANGELOG.md` to cover the Rayden UI additions, puzzle activity planning, skill diagnostics, and the `sales-automator` YAML repair before starting the release workflow.

- Closed issues `#455` and `#456` with maintainer comments explaining what a follow-up submission must include before reopening:
  - concrete repo diff or implementation PR
  - source-only contributor branch
  - Quality Bar checklist and maintainer validations from `.github/MAINTENANCE.md`
- Reviewed open issues `#455` and `#456` during the maintainer sweep; neither had a matching accepted PR and both remain open pending a source-quality contributor submission.
- Triaged PR `#454` as superseded by `#457` because `#457` rebuilds the Windows validation/test fixes on top of current `main` and includes the follow-up batch activation fix requested in review.
- Verified PR `#457` locally on the contributor head with:
  - `npm run validate`
  - `npm run validate:references`
  - `npm run check:warning-budget`
  - `npm run check:readme-credits -- --base origin/main --head HEAD`
  - `npm run test`
  - `npm run app:test:coverage`
  - `npm run app:build`
- Cleaned PR `#457` back to the repository's source-only PR contract by dropping maintainer-owned generated registry artifacts before merge review.
- Normalized the PR metadata so the required Quality Bar Checklist is present before re-triggering the fork-based GitHub Actions checks.

# Maintenance Walkthrough - 2026-03-30

- Merged PR #418 on GitHub with squash after approving the pending fork workflow run and waiting for `pr-policy`, `source-validation`, and `artifact-preview` to finish green.
- Repaired PR #423's stale metadata state by updating the PR body to include the required Quality Bar Checklist, then closed and reopened it to force fresh `pull_request` runs before squash merging it on GitHub.
- Synced local `main` after the PR merge batch so release preparation starts from the canonical remote state.
- Resolved issue #421 by ensuring the `README.md` Community Contributed Skills section includes `SoulPass` on `main`.
- Resolved issue #419 by tightening the `github-issue-creator` frontmatter description and "When to Use" guidance for better discoverability.
- Prepared the `v9.3.0` release notes in `CHANGELOG.md` and recorded the maintainer actions here before running the release flow.

# Maintenance Walkthrough - 2026-03-29

- Re-triaged the full 2026-03-15 security finding set against current `main` and wrote a fresh current-head report in `docs/maintainers/security-findings-triage-2026-03-29-refresh.md`.
- Added a matching machine-readable export at `docs/maintainers/security-findings-triage-2026-03-29-refresh.csv` so the refreshed statuses are available in both markdown and CSV form.
- Kept the old `2026-03-15` markdown/CSV as historical baseline input, preserved the smaller `2026-03-29` addendum as a transition note, and pointed both docs at the new refresh as the current source of truth.
- The refreshed triage currently lands at:
  - `0` findings still present and exploitable
  - `0` findings still present but low practical risk
  - `26` obsolete/not reproducible on current HEAD
  - `7` duplicates
- The refresh folds in the hardening shipped today and earlier in the session:
  - symlink/path safety in maintainer/install/web copy flows
  - frontmatter parser robustness
  - removal of shared frontend star writes
  - secure Office unpack behavior
  - migration away from predictable `/tmp` state files

- Fixed the remaining production/documentation drift introduced by the web-app and CI hardening work:
  - clarified that the hosted GitHub Pages app runs in static public-catalog mode
  - documented that `Sync Skills` is development-only unless explicitly enabled in local maintainer runs
  - documented that web-app save/star interactions are intentionally browser-local today
- Hardened the maintainer documentation so release and CI expectations now match the live workflows:
  - release docs now mention the shared `tools/requirements.txt` install path, the web-app coverage gate, and blocking `npm audit --audit-level=high` on publish
  - maintainer docs now document the narrow canonical-artifact auto-sync contract on `main`
- Expanded the documented risk-maintenance workflow after the new automation landed:
  - `audit:skills` exposes `suggested_risk`
  - `sync:risk-labels` supports conservative high-confidence legacy cleanup
  - offensive auto-promotions now also insert the canonical `AUTHORIZED USE ONLY` notice
- Updated user-facing install docs to mention that the npm installer now uses a shallow clone for lighter first-run installs.
- Updated the onboarding/trust docs to reflect the real `risk` taxonomy (`unknown`, `none`, `safe`, `critical`, `offensive`) instead of the older simplified wording.

# Maintenance Walkthrough - 2026-03-25

- Imported 14 skills from [Dimillian/Skills](https://github.com/Dimillian/Skills) into `skills/`:
  - `app-store-changelog`
  - `github`
  - `ios-debugger-agent`
  - `macos-menubar-tuist-app`
  - `macos-spm-app-packaging`
  - `orchestrate-batch-refactor`
  - `project-skill-audit`
  - `react-component-performance`
  - `simplify-code`
  - `swift-concurrency-expert`
  - `swiftui-liquid-glass`
  - `swiftui-performance-audit`
  - `swiftui-ui-patterns`
  - `swiftui-view-refactor`
- Normalized the imported skill metadata to match repository validation requirements:
  - shortened oversized frontmatter descriptions
  - added `risk`, `source`, and `date_added`
  - added `## When to Use` sections so the imported batch does not increase the warning budget
- Added source attribution for `Dimillian/Skills` in:
  - `README.md` under `Credits & Sources`
  - `docs/sources/sources.md`
- Merged PR `#395` via GitHub squash merge after maintainer refresh of forked workflow approvals and PR body normalization; this added the new `snowflake-development` skill.
- Merged PR `#394` via GitHub squash merge after converting the contributor branch back to source-only, normalizing the PR checklist body, and shortening an oversized `wordpress-penetration-testing` description so CI passed.
- Patched `skills/snowflake-development/SKILL.md` on `main` with a `## When to Use` section so the repository stayed within the frozen validation warning budget after the PR merge batch.
- Reworked `/apply-optimize` automation to address GitHub code scanning alert `#36`: the public `issue_comment` trigger now only queues a trusted workflow, while the privileged branch checkout/apply logic runs in a separate `workflow_dispatch` path limited to same-repository branches.
- Ran the required direct-`main` maintainer sync flow after touching `skills/`:
  - `npm run chain`
  - `npm run check:warning-budget`
  - `npm run catalog`
- Synced maintainer-owned generated artifacts and metadata to the new `1,325+` skill count:
  - `README.md`
  - `package.json`
  - `skills_index.json`
  - `CATALOG.md`
  - `data/catalog.json`
  - `data/bundles.json`
  - curated user/maintainer docs updated by `sync_repo_metadata.py`

# Maintenance Walkthrough - 2026-03-21

- Imported and normalized a new batch of external skills into `skills/`, covering Anthropic Claude API/internal comms entries, marketing workflows, SEO orchestration/sub-skills, and Obsidian-focused file-format/CLI skills.
- Added and standardized the following imported skill families:
  - `claude-api`, `internal-comms`
  - `ad-creative`, `ai-seo`, `churn-prevention`, `cold-email`, `content-strategy`, `lead-magnets`, `product-marketing-context`, `revops`, `sales-enablement`, `site-architecture`
  - `seo`, `seo-competitor-pages`, `seo-content`, `seo-dataforseo`, `seo-geo`, `seo-hreflang`, `seo-image-gen`, `seo-images`, `seo-page`, `seo-plan`, `seo-programmatic`, `seo-schema`, `seo-sitemap`, `seo-technical`
  - `defuddle`, `json-canvas`, `obsidian-bases`, `obsidian-cli`, `obsidian-markdown`
- Preserved the existing `docx`, `pdf`, `pptx`, and `xlsx` aliases as the repository's symlinked `*-official` entries instead of duplicating those directories.
- Normalized imported frontmatter so the new skills align with repository validation expectations:
  - shortened oversized descriptions
  - added missing `risk`, `source`, and `date_added` fields where needed
  - added `## When to Use` sections across the new imports
  - removed or rewrote imported dangling links that referenced non-existent upstream paths in this repository
- Added maintainer provenance notes in `docs/maintainers/skills-import-2026-03-21.md` so the source repository for each imported skill group is documented for future maintenance.
- Regenerated maintainer-owned derived artifacts after the import:
  - `README.md`
  - `skills_index.json`
  - `CATALOG.md`
  - `data/catalog.json`
  - `data/bundles.json`
- Verified the direct-`main` maintenance flow with:
  - `npm run validate`
  - `npm run index`
  - `npm run catalog`
  - `npm run chain`

# Maintenance Walkthrough - 2026-03-18

- Fixed issue `#344` by correcting `.claude-plugin/marketplace.json` so the marketplace plugin entry uses `source: "./"` instead of `"."`, matching Claude Code's relative-path schema requirement for marketplace entries.
- Added `tools/scripts/tests/claude_plugin_marketplace.test.js` and wired it into the local test suite so invalid marketplace `source` paths fail fast in CI/maintainer verification.
- Merged PRs `#333`, `#336`, `#338`, `#343`, `#340`, `#334`, and `#345` via GitHub squash merge after maintainer refresh of forked workflows and PR metadata.
- Closed PR `#337` and PR `#342` as superseded by `#338`, then closed issue `#339` manually after confirming the accepted fix path; issue `#335` auto-closed from the merged PR body.
- Closed issue `#344` with a follow-up comment after shipping the plugin marketplace fix on `main`, and left PR `#341` open with a blocking review comment because the submitted skill content is corrupted even though CI is green.
- Documented a new maintainer edge case in `.github/MAINTENANCE.md`: forked runs in `action_required`, `pr-policy` failures caused by stale PR bodies, the REST API fallback when `gh pr edit` fails with the Projects Classic GraphQL error, and the need to `close`/`reopen` a PR when a plain rerun does not pick up updated metadata.
- Refreshed the release-facing docs for `8.2.0` across `README.md`, `docs/users/getting-started.md`, `docs/users/walkthrough.md`, and `CHANGELOG.md`.
- Published release `v8.2.0` on `main` with:
  - `npm run release:preflight`
  - `npm run security:docs`
  - `npm run release:prepare -- 8.2.0`
  - `npm run release:publish -- 8.2.0`

# Maintenance Walkthrough - 2026-03-17

- Synced `main` after the six merged community PRs and re-verified all forked PR workflows through GitHub before final release prep.
- Reopened/approved forked GitHub Actions runs where needed, normalized missing PR quality checklists, and merged PRs `#331`, `#330`, `#326`, `#324`, `#325`, and `#329` with GitHub squash merge.
- Patched `skills/vibers-code-review/SKILL.md` on the contributor branch for PR `#325` so the skill had valid YAML frontmatter, a `When to Use` section, and explicit limitations; reran CI and merged after green checks.
- Closed issue `#327` with a release comment pointing to `#331`, and closed issue `#328` as a duplicate of `#269` with links to the README recovery guidance and `docs/users/windows-truncation-recovery.md`.
- Updated release-facing docs before cutting `v8.1.0`:
  - `README.md`
  - `docs/users/getting-started.md`
  - `CHANGELOG.md`
  - `walkthrough.md`
- Refreshed the README contributor acknowledgements to include the latest merged contributors from the maintenance batch.
- Release workflow to run for `8.1.0`:
  - `npm run release:preflight`
  - `npm run security:docs`
  - `npm run release:prepare -- 8.1.0`
  - `npm run release:publish -- 8.1.0`

# Maintenance Walkthrough - 2026-03-12

- Merged PRs `#277`, `#272`, `#275`, `#278`, and `#271` via GitHub squash merge after bringing contributor branches into a mergeable state and refreshing PR bodies against the quality checklist in `.github/MAINTENANCE.md`.
- Verified PR `#271` locally with `npm run validate:references` and `npm run test` before merge; confirmed `#269` auto-closed from the merged PR body.
- Added a user-facing Windows truncation recovery guide at `docs/users/windows-truncation-recovery.md`, linked it from `README.md`, `docs/users/faq.md`, `docs/users/getting-started.md`, and `docs/integrations/jetski-cortex.md`, and credited the workflow to issue `#274`.
- Updated `skills/metasploit-framework/SKILL.md` to remove the remote installer flow, require an existing Metasploit installation, and add the required offensive-skill warning.
- Refreshed `README.md` to remove stale `7.2.0` / `7.4.0` onboarding copy, align the star badge with the current milestone, and fix the TOC link for `## Contributing`.
- Normalized the active English docs (`README.md`, user guides, Kiro guide, and evergreen maintainer docs) to the current `7.6.0` / `1,250+ skills` state and removed emoji from H2 headers where maintenance rules require clean anchors.
- Ran the required maintenance validations after the direct fixes:
  - `npm run validate`
  - `npm run validate:references`
  - `npm run chain`
  - `npm run catalog`
- Final release prep, issue closure comments, and verification were completed on `main`.

# Maintenance Walkthrough - 2026-03-13

- Fixed `tools/scripts/update_readme.py` so normal `npm run readme` runs preserve the existing `registry-sync` star/timestamp values instead of rewriting them on every execution, which was causing non-deterministic PR drift failures in CI.
- Updated `tools/scripts/sync_repo_metadata.py` to expose the same explicit `--refresh-volatile` behavior for live star/timestamp refreshes, keeping release/metadata refresh flows available without destabilizing contributor PR checks.
- Updated `.github/workflows/ci.yml` so generated registry drift is informational on pull requests but still strict on `main`, with auto-sync remaining the canonical path for shared artifacts after merge.
- Updated `.github/MAINTENANCE.md`, `docs/maintainers/ci-drift-fix.md`, and `docs/maintainers/merging-prs.md` to document the lower-friction merge flow: validate source changes on PRs, keep `main` for generated conflicts, and let `main` auto-sync the final artifact set.
- Verified the fix with:
  - `python3 tools/scripts/update_readme.py --dry-run`
  - `python3 tools/scripts/sync_repo_metadata.py --dry-run`
  - `npm run readme`
  - `npm run validate:references`
- Added `tools/config/generated-files.json` as the single contract for derived registry artifacts so CI, maintainer scripts, and docs share the same file list.
- Added scripted workflow entrypoints: `npm run pr:preflight`, `npm run release:preflight`, `npm run release:prepare -- X.Y.Z`, and `npm run release:publish -- X.Y.Z`.
- Split PR CI into `pr-policy`, `source-validation`, and `artifact-preview` so PRs stay source-only, policy failures are explicit, and generated drift is previewed separately from source validation.
- Updated `CONTRIBUTING.md` and `.github/PULL_REQUEST_TEMPLATE.md` so contributors are told not to commit derived files and to enable `Allow edits from maintainers`.

# Maintenance Walkthrough - 2026-03-14

- Added root Claude Code plugin marketplace support via `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, exposing the repository as a single plugin entry that points at the existing `skills/` tree.
- Updated the user onboarding trinity (`README.md`, `docs/users/getting-started.md`, `docs/users/faq.md`) so Claude Code users can install via `/plugin marketplace add sickn33/antigravity-awesome-skills` in addition to the existing `npx` installer flow.
- Merged PRs `#302`, `#301`, `#299`, `#297`, `#296`, `#287`, `#298`, and `#293` via GitHub squash merge after maintainer preflight, including a maintained follow-up commit on the contributor branch for `#298` and a maintainer conflict-resolution refresh on `#293`.
- Verified the issue-driven fixes locally before merge:
  - `#301`: `python3 -m py_compile skills/notebooklm/scripts/browser_utils.py`
  - `#299`: `node -c tools/bin/install.js`
- Verified the skill/docs PRs locally before merge:
  - `#297`, `#296`, `#287`, `#298`: `npm run validate`
  - `#293`, `#298`: `npm run validate:references`
- Closed issues `#288`, `#300`, `#286`, and `#281` from the merged fixes and release notes flow; documented `#294` as a release follow-up because the support already exists in the current catalog.
- Removed stale Windows `core.symlinks=true` / Developer Mode guidance from the user docs after the `#299` installer fix, keeping the Windows path on the standard clone/install flow.
- Ran the post-merge maintainer sync on `main`:
  - `npm run chain`
  - `npm run catalog`
- Refreshed `CHANGELOG.md`, `README.md`, `docs/users/getting-started.md`, `docs/users/faq.md`, and the contributor acknowledgements to prepare the single `7.8.0` release cut.

# Maintenance Walkthrough - 2026-03-21

- Imported the missing external skill coverage identified from `travisvn/awesome-claude-skills`, `anthropics/skills`, `coreyhaines31/marketingskills`, `AgriciDaniel/claude-seo`, and `kepano/obsidian-skills`, bringing the indexed registry to `1,304` skills on `main`.
- Added maintainer attribution notes in `docs/maintainers/skills-import-2026-03-21.md` and refreshed the generated registry artifacts after the import batch.
- Re-aligned the public documentation surface to the current repository state:
  - `README.md`
  - `package.json`
  - `docs/users/getting-started.md`
  - `docs/users/usage.md`
  - `docs/users/claude-code-skills.md`
  - `docs/users/gemini-cli-skills.md`
  - `docs/users/visual-guide.md`
  - `docs/users/bundles.md`
  - `docs/users/kiro-integration.md`
  - `docs/integrations/jetski-cortex.md`
  - `docs/maintainers/repo-growth-seo.md`
  - `docs/maintainers/skills-update-guide.md`
- Updated the changelog `Unreleased` section so the post-`v8.4.0` main branch state documents both the imported skill families and the docs/About realignment.
- Automated the recurring docs metadata maintenance by extending `tools/scripts/sync_repo_metadata.py`, wiring it into `npm run chain`, and adding a regression test so future skill-count/version updates propagate through the curated docs surface without manual patching.
- Added a remote GitHub About sync path (`npm run sync:github-about`) backed by `gh repo edit` + `gh api .../topics` so the public repository metadata can be refreshed from the same source of truth on demand.
- Added maintainer automation for repo-state hygiene: `sync:contributors` updates the README contributor list from GitHub contributors, `check:stale-claims`/`audit:consistency` catch drift in count-sensitive docs, and `sync:repo-state` now chains the local maintainer sweep into a single command.
- Hardened automation surfaces beyond the local CLI: `main` CI now runs the unified repo-state sync, tracked web artifacts are refreshed through `sync:web-assets`, release verification now uses a deterministic `sync:release-state` path plus `npm pack --dry-run`, the npm publish workflow reruns those checks before publishing, and a weekly `Repo Hygiene` GitHub Actions workflow now sweeps slow drift on `main`.
- Added two maintainer niceties on top of the hardening work: `check:warning-budget` freezes the accepted `135` validation warnings so they cannot silently grow, and `audit:maintainer` prints a read-only health snapshot of warning budget, consistency drift, and git cleanliness.
