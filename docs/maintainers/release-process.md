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
- If PR or CI workflow behavior changed during the cycle, confirm maintainer and contributor docs mention the active checks (for example the `skill-review` workflow for any change under `skills/**` or `plugins/**/skills/**`).
- If maintainers changed declared risk labels during the cycle, confirm that each change has semantic review evidence rather than lexical inference.

5. Prepare the protected release PR:

```bash
npm run release:prepare -- X.Y.Z
```

This command:

- checks `CHANGELOG.md` for `X.Y.Z`
- aligns `package.json` / `package-lock.json`
- runs the full release suite
- explicitly proves `plugin-compat:check` and `bundles:check` after regeneration
- refreshes release metadata in `README.md`
- regenerates canonical registries, tracked web assets, both plugin marketplaces, every Codex/Claude mirror and editorial bundle, and every release-owned plugin manifest
- stages canonical release files
- creates and pushes `release/vX.Y.Z`
- opens a release PR containing the scripted canonical release state

Prerelease versions use the same protected flow, for example `15.0.0-rc.1`. They must have their own exact changelog section.

6. Merge the release PR through required checks, update local `main`, then publish the GitHub release:

```bash
npm run release:publish -- X.Y.Z
```

This command requires exactly one merged release PR from the same repository, authored by the repository owner, with base `main`, exact title `chore: release vX.Y.Z`, and head branch `release/vX.Y.Z`. Zero or multiple candidates fail closed; the command never chooses the newest approximate match. It then proves local `main` equals protected `origin/main` and that PR's exact squash commit, checks that no canonical-sync PR or release-state drift remains, creates or reuses the matching local/remote tag safely, and creates the GitHub release object from the matching `CHANGELOG.md` section. SemVer prereleases are marked as GitHub prereleases. It never pushes `main` directly and can be retried after a partial tag/release failure.

7. Publish to npm if needed:

```bash
npm publish --tag latest
```

Normally this still happens via the existing GitHub release workflow after the GitHub release is published. The workflow publishes stable versions explicitly to npm's `latest` dist-tag and prerelease versions explicitly to `next`; it fails closed on an invalid version. Verify both tags after a prerelease so `latest` remains on the last stable release.

```bash
npm view agentic-awesome-skills dist-tags --json
```

The workflow reruns `sync:release-state`, installs Python dependencies from `tools/requirements.txt`, refreshes tracked web assets, fails on canonical drift via `git diff --exit-code`, executes tests and docs security checks, runs the web-app coverage gate, enforces `npm audit --audit-level=high`, builds the web app, and dry-runs the npm package before publishing.

8. Complete the mandatory full-release-alignment gate.

A stable or prerelease version is not complete when only its tag, GitHub Release, or npm package exists. After publication:

- rerun `npm run sync:release-state`, `npm run plugin-compat:check`, and `npm run bundles:check`, then require an idempotent second pass and a clean tree;
- verify every release-owned Codex/Claude plugin manifest and Claude marketplace entry equals `X.Y.Z`, without treating nested third-party skill manifests as AAS release manifests;
- bind local and remote `main`, the tag, GitHub Release, npm version and intended dist-tag, required CI, CodeQL, and the explicitly dispatched release-only Pages deployment to the exact released commit;
- read back live `llms.txt`, `skills.json`, catalog/plugin routes, and the legacy redirect bridge;
- discover every already-configured local AAS MCP host from real configuration, update each existing entry with the digest-bound two-pass `aas mcp configure` flow, pin `agentic-awesome-skills@X.Y.Z` and `--version X.Y.Z`, preserve a backup, restart or reconnect the host, and prove a real `initialize` plus `tools/list` handshake reports `X.Y.Z`;
- fetch and fast-forward `main` again after automation settles, require `git rev-list --left-right --count main...origin/main` to return `0 0`, and repeat the no-drift, public-surface, and MCP parity checks.

A release request covers updates to existing AAS MCP host entries only. Creating a previously absent host configuration still needs separate authorization. Any mismatch, inaccessible configured host, or stale public surface keeps the release incomplete.

## Canonical Sync Bot

`main` still uses the repository's auto-sync model for canonical generated artifacts, but through a protected pull-request contract:

- PRs stay source-only.
- After merge, the `main` workflow may open or update `automation/canonical-repo-state`; it never pushes generated files directly to `main`.
- The bot PR is only allowed to stage files resolved from `tools/scripts/generated_files.js --include-mixed`.
- Its explicitly dispatched required checks require both managed-only paths and an exact converged Git tree before an immediate protected merge.
- If repo-state sync leaves any unmanaged tracked or untracked drift, the workflow fails instead of pushing a partial fix.
- The scheduled hygiene workflow follows the same contract and shares the same concurrency group so only one canonical sync writer runs at a time.

## Rollback Notes

- If the release tag is wrong, delete the tag locally and remotely before republishing.
- If generated files drift after tagging, cut a follow-up patch release instead of mutating a published tag.
- If npm publish fails after tagging, fix the issue, bump the version, and publish a new release instead of reusing the same version.
