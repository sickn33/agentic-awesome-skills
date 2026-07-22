---
name: antigravity-maintainer-batch-release
description: "Run protected AAS maintainer sweeps, PR merge batches, canonical sync, Core preview checks, and scripted releases. Use for repository maintenance, main alignment, CLI/MCP/Workbench changes, or release work; not ordinary contribution tasks."
risk: critical
source: self
date_added: "2026-07-18"
---

# Antigravity Maintainer Batch Release

## When to Use

Use this skill for repository-wide AAS maintenance, maintainer-side PR repair or merge batches, canonical synchronization, AAS Core or Workbench changes, protected releases, and hosted catalog or legacy redirect infrastructure. Do not use it for ordinary contribution work that does not require maintainer privileges or canonical convergence.

## Protected-Main Contract

Treat the repository root containing this skill as pull-request-only:

- Read `AGENTS.md`, `.github/MAINTENANCE.md`, and current maintainer docs before mutation.
- Never commit or push directly to `main`, even when the user says “push to main.” That phrase names the final target state.
- Preserve unrelated dirty work. Use a clean temporary clone or a topic branch for maintainer changes.
- Use `npm run merge:batch` for accepted source PRs. Do not substitute a raw merge API, generic GitHub skill, or generic push helper.
- Let `automation/canonical-repo-state` own generated artifacts and contributor-credit convergence after the source batch.
- Use `release:prepare` and `release:publish` for releases. They never authorize a direct `main` push.

## Source Checks

Before changing anything:

1. Fetch `origin/main`; prove the clean maintainer checkout is on `main` and equals `origin/main`.
2. Inspect live PRs, issues, discussions in scope, Actions failures, Dependabot, CodeQL, secret scanning, and `npm audit` where relevant.
3. Confirm current scripts from `package.json`; do not rely on remembered release behavior.
4. Capture user worktree status separately and keep those files out of maintainer commits.

## Maintainer Sweep

1. Triage every open PR before editing.
   - Separate valid source changes, repairable PRs, conflicts, generated-only noise, promotional links, and unsupported ownership/license changes.
   - Review semantics, safety, provenance, risk labels, limitations, source credits, and changed-skill evidence.
   - Prefer narrow maintainer repairs on the contributor branch when maintainer edits are enabled.

2. Validate changed skills truthfully.
   - Run `npm run validate`, `npm run validate:references`, `npm run security:docs`, changed-skill evidence, and the relevant tests.
   - Treat the entire tracked `skills/<skill-id>/**` subtree as skill content. Inspect semantics, safety, provenance, declared risk, limitations, and every bundled file directly, including nested examples, scripts, lockfiles, references, and assets. Never reduce evidence or review to `SKILL.md` or a fixed support-directory allowlist.
   - Require changed-skill evidence to cover every Git record in each changed canonical skill subtree. Require the `skill-review` workflow for changes under `skills/**` or `plugins/**/skills/**`; its reusable result must be keyed by the complete nearest skill-directory fingerprint on the exact current head SHA.
   - `review` means Tessl semantic review actually ran or a valid identical-content result was reused.
   - `manual-review-required` means Tessl credentials or credits were unavailable, or Tessl did not produce a passing result. Perform the maintainer semantic review and attest with `--reviewed-head <full-40-character-sha>`.
   - Any non-passing Tessl outcome produces `manual-review-required`; complete the semantic review and bind the judgment to the exact head instead of treating a heuristic score as merge authority.
   - Never report `manual-review-required` as “Tessl passed.”

3. Run checks in parallel where independent.
   - Use the repository validation, test, docs-security, source-credit, reference, warning-budget, and targeted app checks required by the changed files.
   - Fix deterministic policy failures in the source; do not wait for them as if they were flaky CI.

4. Merge accepted source PRs in conflict-aware order.
   - Run a dry classification first when useful.
   - For changed skill content, review the exact head and run:

     ```bash
     npm run merge:batch -- --prs <PR_LIST> --reviewed-head <FULL_HEAD_SHA>
     ```

   - `merge:batch` may normalize the PR body and close/reopen the PR. GitHub creates the replacement workflow runs asynchronously; the command must wait for and approve only post-reopen workflow/check-suite IDs. Older runs on the same SHA cannot satisfy or fail the fresh gate.
   - Same-repository location is not sufficient authority for sensitive changes. The guarded same-repository exception is limited to a PR authored by the repository owner and requires an exact full-head attestation; collaborator-authored sensitive PRs fail closed under the external safety policy.
   - The routine protected checks are `pr-policy`, `pr-evidence`, `source-validation`, and `artifact-preview`. The retired `aas-v1-baseline` workflow is not a merge prerequisite and must not be awaited or approved during source or canonical-sync batches.
   - If the PR head or base changes, discard stale evidence and rerun from a fresh `origin/main`.

5. Converge canonical state once after the source batch.
   - Wait for the protected `automation/canonical-repo-state` PR.
   - Verify its managed-only diff, required checks, merge result, and the resulting `origin/main`.
   - If an unmanaged repair remains, use a topic PR; never patch `main` directly.

## Workflow Contract Change Gate

When changing maintainer scripts, workflows, or policy, update the canonical skill, maintainer documentation, and regression tests in the same source PR. Add a negative test for every failure mode being fixed, run the relevant dry-run path, and reject any implementation/documentation mismatch. Source PRs must exclude generated registries and plugin mirrors; the protected canonical-sync PR owns that derived state, except for files intentionally staged by the scripted protected-release flow.

## Hosted Catalog and Legacy Redirect Bridge

Treat the current catalog and the legacy user-site bridge as one public system:

- Current catalog: `sickn33/agentic-awesome-skills` at `https://sickn33.github.io/agentic-awesome-skills/`.
- Legacy bridge: `sickn33/sickn33.github.io` at `https://sickn33.github.io/antigravity-awesome-skills/`.

For SEO, indexing, Pages, redirect, or infrastructure changes:

1. Change the generator and verifier in the source repository through a protected source PR and `npm run merge:batch`.
2. Keep the legacy deployment managed allowlist exact: `.nojekyll`, `redirect-manifest.json`, and `antigravity-awesome-skills/**`. Reject any unmanaged sync diff or PR file.
3. Preserve Google verification byte-for-byte and the Bing `msvalidate.01` meta on the legacy root. Record both in manifest evidence.
4. Keep skill counts dynamic, but retain intentional curated sitemap locks. Version manifest contract changes and record source provenance.
5. Let `legacy-redirect-sync.yml` generate or update the fixed automation PR. Bind a fresh verifier run to the exact target head SHA, validate its run identity and managed file set, publish the required status only after that proof, then use protected auto-merge.
6. Recheck source `main` before merge, request the legacy Pages build explicitly after bot-authored merges, and wait for the exact merged commit to be built.
7. Verify locally generated output byte-for-byte, then verify all live legacy/current redirect pairs for a full audit. Retry transient CDN failures with the full audit rather than accepting a partial probe.
8. Prove idempotence with a no-drift sync: no replacement, PR, verification, or merge steps should run; Pages and live probes must still pass.

Keep both repositories on least-privilege Actions defaults (`read`) and require external actions to be pinned to full commit SHAs. When changing these settings or action versions, rerun source CI, CodeQL, Pages, and a legacy no-drift sync before declaring completion.

## AAS Core Preview Acceptance

For AAS CLI, MCP, stack, catalog-cache, or Workbench changes:

1. Use the current scripts declared in `package.json`; do not resurrect retired evaluator, benchmark, tuning-gold, transaction-fault, race, or frozen-matrix gates as routine prerequisites.
2. Run the focused Core tests with `npm run test:aas-v1`, the catalog integrity check with `npm run check:aas-v1-catalog`, and the relevant Workbench tests/build when its contracts or copy change.
3. Keep MCP local, offline, read-only, bounded, and non-mutating. The coding agent inspects the project, searches and reads the complete catalog, and chooses the exact skill IDs. MCP searches, reads, validates agent-owned composition, and compares without scanning the repository or writing to it. Core must not rank, recommend, exclude, or disable skills; metadata is informational only.
4. Keep `aas-stack.json` free of Core selection policy. It pins catalog identity, targets, goals, and the exact IDs selected by the agent. `compose_stack` validates and records that selection; missing or cautionary metadata must never make a canonical skill unselectable or unusable.
5. Keep the supported public path at manifest validation and immutable plan preview. Planning may write only the requested plan artifact; it must not materialize skill payloads or AAS managed state in the target.
6. Treat apply and recovery as experimental opt-ins outside the supported preview claim. Do not add apply/recovery, benchmark, fuzz, crash/race, or synthetic verifier work unless the user explicitly places it in scope.
7. When the task asks for end-to-end client proof, use a real supported client that discovers and invokes the local AAS MCP tools; direct stdio probes and automated tests do not substitute for that evidence.
8. Do not tag, publish npm, deploy Pages, or write real user MCP configuration without the separately required publication approval.

## Protected Release

Release only when requested.

Every stable or prerelease version requires full release alignment. Creating the tag, GitHub Release, or npm package is an intermediate milestone, never the completion condition.

1. Include the target changelog entry in the maintainer batch PR so it is already on protected `main`; avoid a separate release-notes-only PR.
2. From clean, current `main`, run `npm run release:preflight` and required security checks.
3. Run the release-state generator and its explicit plugin gates. Require a second no-drift pass before publication: `npm run sync:release-state`, `npm run plugin-compat:check`, and `npm run bundles:check` must leave a clean tree. Inspect `package.json`, `package-lock.json`, generated registries and the offline catalog, tracked web assets, `.agents/plugins/marketplace.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and every published Codex/Claude plugin mirror and editorial-bundle manifest. Every release-owned manifest version must equal `X.Y.Z`.
4. Run `npm run release:prepare -- X.Y.Z`. This creates and pushes `release/vX.Y.Z` and opens the protected release PR.
5. Merge that release PR through its required checks, update local `main` to equal `origin/main`, and wait for every source, release, or canonical-sync PR in the release path to close. Re-run the release-state and plugin gates if protected `main` moved.
6. Run `npm run release:publish -- X.Y.Z`. It must resolve exactly one merged release PR from the same repository, authored by the repository owner, with base `main`, exact title `chore: release vX.Y.Z`, and head branch `release/vX.Y.Z`. Zero or multiple candidates fail closed; never select the newest approximate match. The command then verifies that exact protected merge before creating or reusing the tag and GitHub Release.
7. Wait for publishing workflows, then bind every proof to the exact released commit: verify the tag/ref, GitHub Release, npm version and intended dist-tag, required CI, CodeQL, and the explicitly dispatched release-only Pages build. Verify live `llms.txt`, `skills.json`, catalog and plugin routes, and the legacy redirect bridge; do not accept a successful run for a different SHA.
8. After npm confirms `X.Y.Z` as the published dist-tag, discover every already-configured local AAS MCP host from its real configuration and update each one to the exact same package version before declaring the release complete. Updating existing AAS host entries is part of the release; creating a previously absent host configuration still requires explicit authorization.
   - Use the published package's `aas mcp configure` two-pass flow: first preview the change, then repeat the identical command with its approval digest. Supply absolute host-config, cache, and backup paths; require a backup when replacing an existing configuration.
   - Pin `agentic-awesome-skills@X.Y.Z` and `--version X.Y.Z`; never use `latest`, reuse an older cached runtime, or create a previously absent host configuration without explicit authorization.
   - Verify that the managed host configuration points to a content-addressed `X.Y.Z` runtime, that the runtime package metadata reports `X.Y.Z`, and that a real MCP `initialize` plus `tools/list` handshake reports catalog package version `X.Y.Z`.
   - Restart the host or open a fresh client session when required so the new MCP process is actually loaded. If configuration access, approval, or runtime verification is blocked, report the exact blocker and keep the maintainer task incomplete even though the package itself is already public.
9. Fetch `origin/main` again after automation settles, fast-forward the maintainer checkout, and repeat the release-state, plugin, version, public-surface, and MCP parity checks. The final generator pass must be idempotent, the tree must stay clean, and `git rev-list --left-right --count main...origin/main` must end at `0 0`.

Never rebase a published release tag, force stale release state, reuse a failed published version, or claim npm publication from the GitHub Release alone.

## Stop Condition

Finish only when:

- every in-scope PR, issue, and alert is resolved or has one exact blocker;
- no open source or canonical-sync PR remains unintentionally;
- for every stable or prerelease version, clean local `main`, `origin/main`, the released commit, canonical generated state, every Codex/Claude plugin mirror, bundle, manifest, marketplace, compatibility report, tag, GitHub Release, npm dist-tag, required workflow, and live public surface agree exactly;
- the source and legacy repositories have no unintended infrastructure PR, their protected branches and Actions settings remain enforced, and the live manifest identifies the source repository;
- the user worktree is unchanged except for files the user explicitly placed in scope;
- release proof is complete when a release was requested, including an idempotent no-drift regeneration and exact runtime parity between the published npm package and every already-configured local AAS MCP host. Any mismatch keeps the release incomplete.

## Failure Rules

- A protected-branch rejection means switch to the PR path; never retry direct `main` pushes.
- A missing PR checklist is informational; never mutate, close, or reopen a PR merely to refresh template metadata.
- Preserve unrelated dirty files and never stage them into maintainer work.
- Do not bypass `merge:batch`, canonical-sync, or scripted release commands with generic Git helpers.
- Do not weaken a test or policy gate merely to make a batch pass. Retire a gate only after explicit maintainer authorization, then update branch protection, workflow files, merge automation, documentation, and maintainer skills together so no phantom requirement remains.

## Examples

For a reviewed source PR whose exact head is `0123456789abcdef0123456789abcdef01234567`, exercise the protected path before merging:

```bash
npm run merge:batch -- --prs 914 --dry-run --reviewed-head 0123456789abcdef0123456789abcdef01234567
```

Run the same command without `--dry-run` only after every required check passes and the attested head remains unchanged.

## Limitations

- This skill orchestrates the repository's existing scripts and protected workflows; it does not grant GitHub, npm, Pages, or local-client permissions.
- Stop at the exact approval or credential boundary when publication, authenticated configuration, or another externally visible action was not authorized.
- Re-read the current repository policy and `package.json` on every run because branch protection, checks, and supported preview commands may change.
