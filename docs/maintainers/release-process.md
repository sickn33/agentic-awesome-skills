# Release Process

This is the maintainer playbook for cutting a repository release. Historical release notes belong in [`CHANGELOG.md`](../../CHANGELOG.md); this file documents the repeatable process.

## Preconditions

- The tracked working tree is clean.
- You are on `main`.
- `CHANGELOG.md` already contains the release section you intend to publish.
- README counts, badges, and acknowledgements are up to date.

## Release Checklist

1. Run the scripted preflight:

```bash
npm run release:preflight
```

This preflight now runs the deterministic `sync:release-state` flow, refreshes the tracked web assets in `apps/web-app/public`, executes the local test suite, installs the web-app dependencies, runs the web-app build, and performs `npm pack --dry-run --json` so release tags are validated against the same artifact path used later in CI.

The active CI/release contract also expects:

- Python dependencies to come from `tools/requirements.txt`,
- the web app coverage job (`npm run app:test:coverage`) to stay green,
- and `npm run security:docs` to pass without relying on non-blocking audit warnings.

2. Mandatory documentation hardening (repo-wide SKILL.md security scan):

```bash
npm run security:docs
```

This is required so every release validates repo-wide risky command patterns and inline token-like examples before publishing.

3. Optional hardening pass:

```bash
npm run validate:strict
```

Use this as a diagnostic signal. It is useful for spotting legacy quality debt, but it is not yet the release blocker for the whole repository.

4. Update release-facing docs:

- Add the release entry to [`CHANGELOG.md`](../../CHANGELOG.md).
- Confirm `README.md` reflects the current version and generated counts.
- Confirm Credits & Sources, contributors, and support links are still correct.
- If PR or CI workflow behavior changed during the cycle, confirm maintainer and contributor docs mention the active checks (for example the `skill-review` workflow for `SKILL.md` pull requests).
- If maintainers used `npm run sync:risk-labels` or a comparable cleanup flow during the cycle, make sure the maintainer docs still describe the current audit -> sync -> repo-state loop.

5. Prepare the release commit and tag locally:

```bash
npm run release:prepare -- X.Y.Z
```

This command:

- checks `CHANGELOG.md` for `X.Y.Z`
- aligns `package.json` / `package-lock.json`
- runs the full release suite
- refreshes release metadata in `README.md`
- stages canonical release files
- creates `chore: release vX.Y.Z`
- creates the local tag `vX.Y.Z`

6. Publish the GitHub release:

```bash
npm run release:publish -- X.Y.Z
```

This command pushes `main`, pushes `vX.Y.Z`, and creates the GitHub release object from the matching `CHANGELOG.md` section.

7. Publish to npm if needed:

```bash
npm publish
```

Normally this still happens via the existing GitHub release workflow after the GitHub release is published.
That workflow now reruns `sync:release-state`, installs Python dependencies from `tools/requirements.txt`, refreshes tracked web assets, fails on canonical drift via `git diff --exit-code`, executes tests and docs security checks, runs the web-app coverage gate, enforces `npm audit --audit-level=high`, builds the web app, and dry-runs the npm package before `npm publish`.

## Canonical Sync Bot

`main` still uses the repository's auto-sync model for canonical generated artifacts, but with a narrow contract:

- PRs stay source-only.
- After merge, the `main` workflow may commit generated canonical files directly to `main` with `[ci skip]`.
- Those bot commits still skip CI, so the sync contract must stay narrow and predictable: only canonical/generated files may be staged, and any unmanaged drift must fail the workflow instead of being silently pushed.
- The bot commit is only allowed to stage files resolved from `tools/scripts/generated_files.js --include-mixed`.
- If repo-state sync leaves any unmanaged tracked or untracked drift, the workflow fails instead of pushing a partial fix.
- The scheduled hygiene workflow follows the same contract and shares the same concurrency group so only one canonical sync writer runs at a time.

## Rollback Notes

- If the release tag is wrong, delete the tag locally and remotely before republishing.
- If generated files drift after tagging, cut a follow-up patch release instead of mutating a published tag.
- If npm publish fails after tagging, fix the issue, bump the version, and publish a new release instead of reusing the same version.
