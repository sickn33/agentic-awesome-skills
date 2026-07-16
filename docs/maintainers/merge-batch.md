# Merge Batch

`merge:batch` is the maintainer shortcut for merging multiple PRs in order while keeping the GitHub-only squash rule and delegating generated follow-up work to the protected canonical-sync PR lane.

## Prerequisites

- Start from a clean `main` that exactly matches `origin/main`.
- For a real merge, require pull-request-only strict branch protection with the four exact GitHub-Actions-owned checks, administrator enforcement, no applicable ruleset bypass actors, and no merge queue. Dry runs remain available without this server-side prerequisite.
- Make sure [`.github/MAINTENANCE.md`](../../.github/MAINTENANCE.md) is the governing policy.
- Have `gh` authenticated with maintainer permissions.
- Use this only for PRs that are already expected to merge; conflicting PRs still need the manual conflict playbook.

## Basic Usage

```bash
npm run merge:batch -- --prs 450,449,446,451
```

Add `--poll-seconds <n>` if you want a slower or faster status loop while checks settle.

If a PR changes canonical `SKILL.md` content or its allowlisted supporting assets/references/resources, first review the exact current head commit, then attest to that immutable revision:

```bash
npm run merge:batch -- --prs 450 --reviewed-head <40-character-head-sha>
```

Use `--dry-run` to exercise local classification without approving a run or merging. An abbreviated or stale attestation is rejected.

## Happy Path

`merge:batch` will:

- refresh the PR body when the Quality Bar checklist is missing
- close and reopen the PR if stale metadata needs a fresh `pull_request` event
- fetch the exact base/head objects and classify the complete raw Git diff
- recompute changed-skill evidence with evaluator code materialized from the trusted `main` commit
- reject incomplete evidence coverage, deterministic quality/security/provenance regressions, and base/head drift
- approve fork runs waiting on `action_required` only when every path, mode, object, size, and workflow identity is allowlisted
- wait for the fresh required checks on the current head SHA
- call GitHub's immediate squash-merge endpoint and continue only when it reports `merged: true`
- pull the protected `main`; its trusted workflow opens a canonical-sync bot PR for generated artifacts and contributor credits when needed

## What It Automates

- PR body normalization against the repository template
- stale PR metadata refresh
- required-check polling for the current PR head
- handoff of post-merge contributor and artifact drift to the canonical-sync PR lane

## What It Does Not Automate

- conflict resolution on the PR branch
- manual judgment for risky skill changes
- semantic review when the distinct `manual-review-required` check is present
- README community-source audits when the source metadata is ambiguous
- fork-only edge cases that require contributor coordination outside GitHub permissions
- base-branch drift: stale evidence is discarded and the batch must be rerun
- auto-merge and merge-queue enrollment; deferred merge state is rejected

## When To Stop

Stop and switch to the manual playbook when:

- the PR is `CONFLICTING`
- `merge:batch` reports a check failure that needs source changes, not maintainer automation
- the PR needs a manual README credits decision
- the local diff contains a symlink, gitlink, executable mode, unknown path/type, oversized blob, or other non-allowlisted change
- the workflow run cannot be bound to the intended PR number, current head SHA, `pull_request` event, and trusted workflow definition
- fork approval or branch permissions are missing
- effective strict protection for `main` cannot be proven

In those cases, follow [Merging Pull Requests](merging-prs.md) and the relevant sections in [MAINTENANCE.md](../../.github/MAINTENANCE.md).
