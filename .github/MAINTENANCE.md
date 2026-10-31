# AAS maintenance

Invoke the canonical [maintainer skill](../skills/antigravity-maintainer-batch-release/SKILL.md) before triage or mutation. Follow the [maintenance contract](../docs/maintainers/maintenance-contract.md) for the full sequence and [component validation](../docs/maintainers/component-validation.md) for test selection.

## Current-base guard

Mandatory tools must exist on the current task base. Never import missing procedures from another branch, worktree, stash, installed copy, or historical commit. Read the exact-base instructions after creating an isolated checkout. Preserve unrelated dirty work.

## Invariants

- Main is PR-only with strict protection and administrator enforcement. `merge:batch` is the only fork-run approval and merge authority. No admin bypass or auto-merge.
- Review complete `skills/<skill-id>/**` trees. Safe analysis can precede review; merge requires real Tessl review or exact-head maintainer attestation. Private authenticated receipts reuse only unchanged content and context.
- Source PRs exclude generated snapshots. Main CI validates ephemeral state; distribution snapshots, general mirrors and generated contributor credits refresh only in the release PR. The contract separately permits strictly verified existing lockfile replicas for an owner-requested no-release security repair; all other generated paths remain forbidden.
- Unknown/policy/shared changes receive full checks. Missing or skipped required evidence cannot pass.
- Use the scripted protected release path, build the immutable candidate once, publish its exact tested bytes, and run the mandatory full-release-alignment gate. Main may advance beyond the released commit.
- Catalog-only revisions are independently pinned and compatible with an explicit runtime; no runtime bump is required.
- Report public completion and personal environment alignment separately. Measure real whole-cycle times, not inferred percentage gains.

Warning limits remain in `tools/config/validation-budget.json`; never raise the budget to hide regressions.

Use `maintenance:cycle start/intake/merge/verify` for a measured source batch (its merge delegates to `merge:batch`); finish this no-release cycle before any authorized release preparation; read `docs/maintainers/maintenance-cycle.md`. Record blockers once, continue independent PRs and reuse the existing host verifier. Do not run release steps when no release was requested.


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

Contribution readiness and author correction ownership follow [contribution intake](../docs/maintainers/contribution-intake.md). Local preview and CI summaries remain advisory to protected merge authority.

Canonical skill-tree PRs must pass mandatory evidence admission in `pr-policy` and current-body revalidation in `merge:batch`. Body/draft drift stops an active merge; content attestations cannot waive incomplete evidence. Keep author requirements proportionate and free of mandatory paid tools or unsafe live tests.

Use `release:rehearse` with a completed cycle bound to an ancestor of the rehearsed source for the full disposable local candidate proof before publication. Rehearsal has no remote write or publication authority; see the maintenance contract. Keep concurrent release tooling repairs isolated until the active release finishes.

Web CI uses pinned Turborepo with local caching persisted within the existing free GitHub cache quota. Follow the component guide for fresh current-commit finalization, input invalidation, output integrity and branch-scoped cache trust. Repository script tests and protected merge authority remain uncached.
