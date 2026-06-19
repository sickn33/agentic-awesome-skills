# Repo coherence and correctness audit

This document summarizes the repository coherence audit performed after the `apps/` + `tools/` + layered `docs/` refactor.

## Scope

- Counts and numbers (README, package.json, CATALOG)
- Skill validation (frontmatter, risk, "When to Use", link)
- Audit repo-wide per skill (conformance + baseline usability)
- Cross references (workflows.json, bundles.json, `docs/users/bundles.md`)
- Documentation (`docs/contributors/quality-bar.md`, `docs/contributors/skill-anatomy.md`, security/licenses)
- Scripts and build (validate, index, readme, catalog, test)
- Notes on data/ and test YAML

## Outcomes

### 1. Counts

- `README.md`, `package.json`, and generated artifacts are aligned to the current collection size.
- `npm run sync:repo-state` is the canonical maintainer command for keeping counts, generated files, contributors, and tracked web assets synchronized on local `main`.
- `npm run sync:release-state` is the canonical release-facing variant when you want the same sync without the contributor refresh step.
- `npm run sync:all` remains a legacy alias for the core chain, not the full maintainer sync surface.

### 2. Skill validation

- `npm run validate` is the operational contributor gate.
- `npm run validate:strict` is currently a diagnostic hardening pass: it still surfaces repository-wide legacy metadata/content gaps across many older skills.
- The validator accepts `risk: unknown` for legacy/unclassified skills while still preferring concrete risk values for new skills.
- Repo-wide documentation risk guidance is now covered by `npm run security:docs`:
  - detects high-risk command guidance in `SKILL.md`,
  - requires explicit allowlists for deliberate command-delivery patterns,
  - and blocks token-like examples that look exploitable.

### 2b. Audit repo-wide per skill

- Added `tools/scripts/audit_skills.py` (also exposed as `npm run audit:skills`), which audits every `SKILL.md` and produces a per-skill status (`ok`, `warning`, `error`) with finding codes.
- The audit is intentionally broader than `validate` and covers:
  - truncated descriptions that likely map to issue `#365`,
  - missing examples and missing limitations sections,
  - overly long `SKILL.md` files that should probably be split into `references/`,
  - plus the existing structural/safety checks (frontmatter, risk, `When to Use`, offensive disclaimer, dangling links).
- The report also includes a non-blocking `suggested_risk` for skills that are still marked `unknown` or appear to be misclassified, so maintainers can resolve risk classification during PR review without changing the contributor gate.
- Added `tools/scripts/sync_risk_labels.py` (also exposed as `npm run sync:risk-labels`) for conservative legacy cleanup: it only rewrites `risk: unknown` when the suggestion is high-confidence enough to be safely automated.
- The sync now covers explicit high-confidence `safe`, `critical`, `offensive`, and `none` patterns. When a skill is promoted to `offensive`, the sync also inserts the canonical `AUTHORIZED USE ONLY` notice so the label and content guardrail stay aligned.
- The intended maintainer loop is: `audit:skills` to inspect `suggested_risk`, `sync:risk-labels` for the safe automated subset, then manual review for the ambiguous tail that should not be batch-classified.
- Use `npm run audit:skills` for the maintainer view and `npm run audit:skills -- --json-out ... --markdown-out ...` when you want artifacts for triage or cleanup tracking.

### 3. Cross references

- Added `tools/scripts/validate_references.py` (also exposed as `npm run validate:references`), which verifies:
  - every `recommendedSkills` in data/workflows.json exists in skills/;
  - every `relatedBundles` exists in data/bundles.json;
  - every slug in data/bundles.json (skills list) exists in skills/;
  - every skill link in `docs/users/bundles.md` points to an existing skill.
- Execution: `npm run validate:references`. Result: all references valid.

### 4. Documentation

- Canonical contributor docs now live under `docs/contributors/`.
- Canonical maintainer docs now live under `docs/maintainers/`.
- README, security docs, licenses, and internal markdown links were rechecked after the refactor.

### 5. Scripts and build

- `npm run test` and `npm run app:build` complete successfully on the refactored layout.
- `validate_skills_headings.test.js` acts as a lightweight regression/smoke test, not as the source of truth for full metadata compliance.
- The maintainer docs now need to stay aligned with the root `package.json` and the refactored `tools/scripts/*` paths.

### 6. Deliverable

- Counts aligned to the current generated registry.
- Reference validation wired to the refactored paths.
- User and maintainer docs checked for path drift after the layout change.
- Follow-up still open: repository-wide cleanup required to make `validate:strict` fully green.

## Useful commands

```bash
npm run validate          # skill validation (soft)
npm run validate:strict   # hardening / diagnostic pass
npm run audit:skills      # full skill audit with finding codes and status
npm run sync:risk-labels  # conservative sync for high-confidence legacy risk labels
npm run sync:risk-labels -- --dry-run  # preview legacy risk rewrites before touching files
npm run validate:references  # workflow, bundle, and docs/users/bundles.md references
npm run security:docs       # documentation command-risk scan (required for security-sensitive guidance)
npm run build             # chain + catalog
npm test                  # suite test
```

## Open issues / follow-up

- Gradual cleanup of legacy skills so `npm run validate:strict` can become a hard CI gate in the future.
- Continue reducing the remaining `risk: unknown` tail with conservative sync passes plus manual maintainer review for ambiguous cases.
- Keep translated docs aligned in a separate pass after the canonical English docs are stable.
