---
name: antigravity-maintainer-batch-release
description: "Run protected AAS maintainer sweeps, PR merge batches, resumable review, immutable distribution, Core checks, and scripted releases. Use for repository maintenance, main alignment, CLI/MCP/Workbench changes, or release work; not ordinary contribution tasks."
risk: critical
source: self
date_added: "2026-07-18"
---

# Antigravity Maintainer Batch Release

## When to Use

Use for AAS maintainer sweeps, PR repairs and merge batches, runtime/catalog releases, installed maintainer-skill alignment, and public deployment verification. Ordinary contributors do not need maintainer privileges.

## Operating sequence

1. Preserve dirty work. Use an isolated current-main checkout. Read the exact-base AGENTS.md, `.github/MAINTENANCE.md`, `package.json`, and [maintenance contract](references/maintenance-contract.md). Mandatory tools must exist on that base; never import retired procedures from another checkout.
2. For a source PR batch, inventory its PR numbers, start `npm run maintenance:cycle -- start` on clean current main before content analysis/review, and follow the [complete cycle](references/maintenance-cycle.md). The runner measures source maintenance without a release; finish it before release preparation. For a release-only task or a sweep with no PRs, start an explicit empty cycle with `--prs none` and verify it before preparation. Triage the full authorized scope. Repair source PRs, run the component plan, review the entire tracked `skills/<skill-id>/**` subtree, and inspect relevant advisories. Do not substitute a heuristic score for semantic review.
3. Use `maintenance:cycle merge`, which delegates to `merge:batch`, or invoke `npm run merge:batch` directly when no source cycle applies. These share the sole merge authority; do not run both for the same merge. Keep strict protected main and admin enforcement. Safe analysis may precede review; merge still requires current checks and either real Tessl review or exact-head maintainer attestation. Private signed receipts may reuse unchanged content/context review. Preserve owner-only sensitive-change and protected-base fork-ledger restrictions.
4. Use guided intake to collect all blockers, then resume with a private external `--state-dir`. Record each blocker once; after two equivalent unproductive checks, continue independent work. Re-fetch PR state and protection every time. Continue independent PRs after a blocked PR; report failures. Follow the cycle reference’s deterministic failure codes and bounded read retries. Never repeat a write with an unknown outcome, steal an active state lock, or reuse stale CI evidence. Do not rewrite PR metadata, automatically retry base drift, or use GitHub auto-merge.
5. Ordinary source merges generate ephemeral validation state only. Tracked distribution snapshots and contributor credits refresh in the protected release PR; no ordinary canonical-sync PR is required.
6. When authorized, use `release:prepare` and `release:publish`. Prepare already validates; do not duplicate its suite with diagnostic preflight. Merge the prepared release PR through protection. The immutable candidate is built once, checked on supported platforms, and consumed unchanged by npm/Pages. Main may advance while the released commit remains protected ancestry.
7. For compatible catalog-only publication, use the independent catalog workflow and immutable revision/SRI. Preserve offline operation, rollback and agent-owned selection. Do not bump or republish runtime just to update catalog data.
8. Finish a source batch with `maintenance:cycle verify` on exact main CI/CodeQL after all other source-cycle actions. Without publication, stop there: public distribution snapshots intentionally remain at the last release. For releases, complete the full-release-alignment gate in the contract, including actual public bytes and live surfaces. Report personal MCP configuration and session reload separately. Update installed maintainer skills from the adopted canonical source, preserving unrelated installations.

## Examples

Prepare safe analyses without merging:

```sh
npm run merge:batch -- --prs 123,124 --prepare-only
```

After actual semantic review, persist the evidence and merge:

```sh
npm run merge:batch -- --prs 123,124 --state-dir /absolute/private/state --reviewed-head FULL_40_CHARACTER_SHA --reviewer maintainer --review-evidence 'Complete bundle, provenance, safety and limitations reviewed'
```

Use real IDs, paths and a full immutable SHA. The state directory must already exist, be privately owned and mode 0700, and be outside source checkouts.

## Validation

Read [component validation](references/component-validation.md) and the [maintenance contract](references/maintenance-contract.md) for exact checks, release proof, catalog compatibility and timing methodology. Required checks remain `pr-policy`, `pr-evidence`, `source-validation`, `artifact-preview`. Unknown/shared/policy changes receive full validation.

## Limitations

This skill grants no additional publication or messaging authority. Tessl unavailable means `manual-review-required`, not a passing review. Jev, SkillSpector and timing reports are advisory. Never use direct main push, admin bypass, mutable artifact identity, PR-controlled review receipts, or invented native-client reload proof. Local timings do not establish whole-cycle improvement.

Consult [scanner interpretation](references/skillspector.md) when triaging SkillSpector and [Core preview acceptance](references/core-preview.md) for runtime changes.

Follow [public surface verification](references/public-surfaces.md) for catalog, Pages and legacy redirect changes.

For CSV security intake, distinguish historical/generated duplicates from current canonical defects. Never execute skill Markdown or external setup as a triage shortcut. Dossiers must include containing nested skill trees; use reviewed test fixtures and inert source comparisons for executable documentation examples. Record each finding disposition and its evidence before release.

Before creating a release tag, inventory and audit every canonical npm lockfile, including bundled applications and templates; a clean root/web audit does not cover nested dependencies. Recheck live security alerts after source merges and immediately before tagging. Treat newly created alerts as new work before publication.


## Mandatory release cycle barrier

A release must never proceed with an unresolved PR in the recorded batch. Every
batch PR must be merged into protected main or closed without merge with an
owner rationale posted **before** closure and bound to its exact head. A policy
blocker is not completion and never authorizes bypassing merge protection or
closing an otherwise valid contribution merely to unlock publication.

Use `npm run maintenance:cycle -- close --state-dir /absolute/private/state --prs 123 --expected-head FULL_40_CHARACTER_SHA --reason 'Substantive reason, including the replacement PR when applicable'`.
This posts the required comment before closing; uncertain writes stop without a
retry. Plain undocumented closure does not satisfy verification. Merged PRs use
the existing protected merge path.

Run `maintenance:cycle verify` successfully on exact current main before
`npm run release:prepare -- X.Y.Z --state-dir /absolute/private/state`.
Preparation fails before branch creation or version changes without completed
cycle evidence. The release PR carries `data/release-cycle.json`; publication
and the npm workflow independently re-read live PR states, closure comments,
protected-main ancestry and successful CI/CodeQL for the verified source commit.
Reopened PRs, absent proof or failed checks block publication. Reverify if main
moves before preparation. Never shrink the recorded scope to hide blockers.

For a genuinely release-only task with no source PR batch, explicitly start a
cycle with `--prs none` and verify it; no implicit no-cycle bypass is supported.
The original batch inventory must include every PR in the authorized scope.
