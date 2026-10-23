# Documentation Index

Current operational guidance lives in `users/`, `contributors/`, and the current maintainer playbooks. Dated audits, release notes, worklogs and `maintainers/backups/` preserve historical evidence; their counts and commands are not current requirements. Translations can lag: use the linked English source and exact-base `package.json` when instructions differ.

## Users

- [`users/aas-core.md`](users/aas-core.md) — canonical AAS Core preview guide
- [`users/getting-started.md`](users/getting-started.md)
- [`users/usage.md`](users/usage.md)
- [`users/faq.md`](users/faq.md)
- [`users/claude-code-skills.md`](users/claude-code-skills.md)
- [`users/cursor-skills.md`](users/cursor-skills.md)
- [`users/codex-cli-skills.md`](users/codex-cli-skills.md)
- [`users/gemini-cli-skills.md`](users/gemini-cli-skills.md)
- [`users/ai-agent-skills.md`](users/ai-agent-skills.md)
- [`users/agentic-awesome-skills-vs-awesome-claude-skills.md`](users/agentic-awesome-skills-vs-awesome-claude-skills.md)
- [`users/best-claude-code-skills-github.md`](users/best-claude-code-skills-github.md)
- [`users/best-cursor-skills-github.md`](users/best-cursor-skills-github.md)
- [`users/plugins.md`](users/plugins.md) — installation and distribution boundaries
- [`users/specialized-plugin-roadmap.md`](users/specialized-plugin-roadmap.md) — curated scope and resolved findings
- [`users/bundles.md`](users/bundles.md)
- [`users/workflows.md`](users/workflows.md)
- [`users/kiro-integration.md`](users/kiro-integration.md)
- [`users/visual-guide.md`](users/visual-guide.md)
- [`users/local-config.md`](users/local-config.md)
- [`users/skills-library-overview.md`](users/skills-library-overview.md)

## Contributors

- [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- [`contributors/skill-template.md`](contributors/skill-template.md)
- [`contributors/skill-anatomy.md`](contributors/skill-anatomy.md)
- [`contributors/examples.md`](contributors/examples.md)
- [`contributors/quality-bar.md`](contributors/quality-bar.md)
- [`contributors/security-guardrails.md`](contributors/security-guardrails.md)
- [`contributors/community-guidelines.md`](contributors/community-guidelines.md)

## Maintainers

- [150-skill static review and repairs](maintainers/skill-review-150-2026-10-23.md) — exact cohort, findings and limitations

- [Catalog audit batches](maintainers/catalog-audit-batches-2026-10-23.md) — bounded queue and truthful progress tracking

- [`maintainers/merge-batch.md`](maintainers/merge-batch.md)
- [`maintainers/maintainer-sweep.md`](maintainers/maintainer-sweep.md) — one-shot triage before merge batches (`npm run maintainer:sweep`)
- [`maintainers/jev-hints.md`](maintainers/jev-hints.md) — optional TypeSafe Jev triage (`maintainer:jev-batch` for open PRs; local only)
- [`maintainers/release-process.md`](maintainers/release-process.md)
- [`maintainers/merging-prs.md`](maintainers/merging-prs.md)
- [`maintainers/rollback-procedure.md`](maintainers/rollback-procedure.md)
- [`maintainers/audit.md`](maintainers/audit.md)
- [`maintainers/ci-drift-fix.md`](maintainers/ci-drift-fix.md)
- [`maintainers/repo-growth-seo.md`](maintainers/repo-growth-seo.md)
- [`maintainers/skills-update-guide.md`](maintainers/skills-update-guide.md)
- [`maintainers/categorization-implementation.md`](maintainers/categorization-implementation.md)
- [`maintainers/date-tracking-implementation.md`](maintainers/date-tracking-implementation.md)
- [`maintainers/skills-date-tracking.md`](maintainers/skills-date-tracking.md)

## Sources

- [`sources/sources.md`](sources/sources.md)
- [`sources/LICENSE-MICROSOFT`](sources/LICENSE-MICROSOFT)
- [`sources/microsoft-skills-attribution.json`](sources/microsoft-skills-attribution.json)

- [Specialized plugin coverage review (2026-10-13)](maintainers/specialized-plugin-expansion-review-2026-10-13.md): all 21 compositions, selected additions, omissions and validation scope.

- [Plugin consolidation and migration](users/plugin-migration.md): current focused offer and replacements for retired packs.

- [Plugin consolidation review](maintainers/plugin-offer-consolidation-2026-10-13.md): preservation, migration and validation scope.

- [Maintainer flow and recovery](maintainers/maintainer-flow.md): batch coordination, source credits, preflight, dossiers, and release verification.
