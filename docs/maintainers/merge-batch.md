# Merge Batch

`merge:batch` is the maintainer shortcut for merging multiple PRs in order while keeping the GitHub-only squash rule and the post-merge contributor sync.

## Prerequisites

- Start from a clean `main`.
- Make sure [`.github/MAINTENANCE.md`](../../.github/MAINTENANCE.md) is the governing policy.
- Have `gh` authenticated with maintainer permissions.
- Use this only for PRs that are already expected to merge; conflicting PRs still need the manual conflict playbook.

## Basic Usage

```bash
npm run merge:batch -- --prs 450,449,446,451
```

Add `--poll-seconds <n>` if you want a slower or faster status loop while checks settle.

## Happy Path

`merge:batch` will:

- refresh the PR body when the Quality Bar checklist is missing
- close and reopen the PR if stale metadata needs a fresh `pull_request` event
- approve fork runs waiting on `action_required`
- wait for the fresh required checks on the current head SHA
- merge with GitHub squash merge
- pull `main`, run `sync:contributors`, and push a README-only follow-up if needed

## What It Automates

- PR body normalization against the repository template
- stale PR metadata refresh
- required-check polling for the current PR head
- the post-merge contributor sync step
- the retry loop for `Base branch was modified`

## What It Does Not Automate

- conflict resolution on the PR branch
- manual judgment for risky skill changes
- README community-source audits when the source metadata is ambiguous
- fork-only edge cases that require contributor coordination outside GitHub permissions

## When To Stop

Stop and switch to the manual playbook when:

- the PR is `CONFLICTING`
- `merge:batch` reports a check failure that needs source changes, not maintainer automation
- the PR needs a manual README credits decision
- fork approval or branch permissions are missing

In those cases, follow [Merging Pull Requests](merging-prs.md) and the relevant sections in [MAINTENANCE.md](../../.github/MAINTENANCE.md).
