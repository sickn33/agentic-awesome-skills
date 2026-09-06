# Repository documentation consistency audit — 2026-09-06

## Scope and evidence

Base: `34aa7130c381eb078aa2dbd433dd130cf286c191`. The initial inventory contains 205 tracked Markdown documents outside canonical `skills/` and generated `plugins/` mirrors: root policies, user and contributor guides, maintenance instructions, Chinese and Vietnamese translations, app documentation, notices and historical evidence.

All 205 were scanned for local Markdown targets and documented npm commands. Active guide anchors were also checked. Semantic cross-checks concentrated on installation/update behavior, protected merges, canonical synchronization, review outcomes, release boundaries, rollback instructions, risk labels and specialized-plugin status. Sources were the exact-base package scripts, workflows, launcher, warning-budget configuration and canonical maintainer skill. This is not a line-by-line semantic review of every skill, validation of external websites, or execution of cloud integrations.

## Corrected inconsistencies

- Maintenance instructions: explain non-passing Tessl outcomes accurately; use the actual warning-budget configuration; distinguish provenance from risk; route emergency repairs through protected source PRs; avoid claiming a merged fix has already shipped.
- Canonical synchronization: remove the ordinary generated-only repair PR workaround. The trusted `automation/canonical-repo-state` lane owns derived state and exact-tree proof.
- Chinese maintainer guides: replace retired direct-main pushes, premature tag creation, UI merges and bot CI skipping with the current protected workflow. Preserve translation entrypoints and link canonical English procedures.
- Rollback: a branch is not a backup of uncommitted files. Require a verified backup before path-scoped discards and preserve published history.
- Local updates: the Windows launcher does not fetch Git/PowerShell updates or install Python. Distinguish index refresh, full build, installed copies and publication.
- Specialized plugins: record the hardening checklist as repaired while preserving the selected nine-skill composition.
- User guidance: remove stale current catalog/risk totals and the nonexistent shared vendor-skill directory assumption. Describe Core as available starting with the 15.x line, not as the current major release.
- Navigation: repair three active local file links and eight anchor occurrences; link plugin guidance from the documentation index.
- Duplicate Chinese authoring pages: preserve old URLs as pointers to the maintained contributor guides, removing nonexistent validation and scoring commands.

## Historical material and limits

The initial scan found 112 missing relative file targets. Three were active-guide defects and are repaired. The other 109 occurrences are in `CHANGELOG.md` and a relocated README backup: deleted historical skills and paths relative to the original snapshot. Their content is preserved, with explicit historical exceptions in the regression; they do not make current installation guides valid or invalid. Existing dated reports retain observed versions, command names and findings rather than being rewritten as current facts.

The new `test_documentation_consistency.py` checks local guide links/anchors and package-script names, with narrow history/example exceptions. It contains negative fixtures for missing files and headings and checks protected-maintenance documentation boundaries. It is included automatically in `npm test`. It does not parse all Markdown dialects or claim internet-link availability.

No release, tag, package publication, deployment, wiki edit or local MCP configuration change is part of this audit.
