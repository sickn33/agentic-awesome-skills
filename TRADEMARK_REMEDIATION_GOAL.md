# Trademark Remediation Goal

## Outcome

Rename the public project identity from `antigravity-awesome-skills` / `Antigravity Awesome Skills` to `agentic-awesome-skills` / `Agentic Awesome Skills` across the repository surfaces that can create affiliation confusion, while preserving descriptive compatibility references to Antigravity only where they document supported install targets or upstream provenance.

## Baseline

- GitHub repository name has been changed by the owner.
- Local `origin` still points to `https://github.com/sickn33/antigravity-awesome-skills.git`.
- Public/source surfaces still contain old naming in package metadata, README, web app SEO, manifests, installer text, plugin metadata sources, generated catalogs, and verification scripts.

## Constraints

- Do not remove truthful upstream provenance links or skill compatibility tags solely because they mention Antigravity.
- Do not weaken validation, SEO checks, security checks, or generated-file contracts.
- Prefer source and generator edits, then regenerate generated outputs.
- Public, irreversible, or costly actions are approval-gated: repo rename, npm publish/deprecate, GitHub Pages deployment, direct push to `main`, and email sending.

## Verifiers

Primary verifier:

- A repository-wide public-brand scan shows no remaining first-party `antigravity-awesome-skills`, `Antigravity Awesome Skills`, or `Antigravity Skills` identity on package, README, web app, generated plugin/package metadata, or SEO surfaces.

Supporting checks:

- `npm run validate`
- `npm run test`
- `npm run security:docs`
- `npm run build`
- `npm run app:build`
- `cd apps/web-app && npm run verify:seo`

## Loop

1. Inspect a bounded surface.
2. Patch canonical source or generator first.
3. Regenerate affected outputs.
4. Run targeted scan/check.
5. Repeat until only descriptive compatibility/provenance references remain.
6. Run the full verifier chain and record failures or remaining approval gates.

## Blocker Standard

The goal is blocked only if a required network/public action needs user approval or credentials and no local verification or patch work remains.

## Completion Proof

- Changed file summary.
- Remaining Antigravity references classified as compatibility/provenance, not first-party branding.
- Verifier command results.
- English reply draft for GitHub Trust & Safety.

## Execution Notes - 2026-07-08

- Renamed first-party package, repository URLs, README branding, web app branding, manifests, SEO metadata, sitemap generation, installer docs, plugin roots, generated bundle prefixes, and contributor/user documentation to `agentic-awesome-skills` / `Agentic Awesome Skills`.
- Added explicit independent-project disclaimers in README and the web app home surface.
- Updated `origin` and `upstream` to `https://github.com/sickn33/agentic-awesome-skills.git`; fork remotes intentionally retain their own upstream names.
- Preserved truthful compatibility/provenance mentions for Antigravity IDE/CLI support and external source repositories such as `Kench001/antigravity-awesome-skills`, `iradoweck/antigravity-awesome-skills`, and `pravin-python/antigravity-awesome-skills`.
- Regenerated root indexes/catalogs, plugin bundles, metadata, web assets, sitemap, and the production web app build.
- Verification passed:
  - `npm run build`
  - `npm run sync:web-assets`
  - `npm run app:build`
  - `npm run validate` (passes with existing non-blocking warnings/advisories)
  - `npm_config_cache=/private/tmp/aas-npm-cache npm run test`
  - `npm run security:docs`
  - `cd apps/web-app && npm run verify:seo`
  - `npm run app:test`
- `npm run test` with the default npm cache failed before retry because `/Users/nicco/.npm` contains root-owned cache entries; the successful rerun used a temporary cache under `/private/tmp`.
- Final scan found only external provenance/license references and cleanup code for removing stale old plugin directory names.
