---
name: github-automation
description: "Operate GitHub issues, pull requests, branches, checks, workflows, and permissions through Rube MCP. Use when GitHub work must be queried or changed programmatically with repository-policy safeguards."
risk: critical
source: community
date_added: "2026-02-27"
---

# GitHub Automation via Rube MCP

Use Composio's GitHub toolkit through Rube MCP while preserving repository policy, exact revision identity, and branch protection.

## When to Use

Use for programmatic GitHub issue, pull-request, branch, Actions, deployment, collaborator, or protection tasks when Rube MCP is available. Prefer the native `gh` workflow or a repository-specific maintainer command when local repository policy requires it.

## Setup

1. Confirm `RUBE_SEARCH_TOOLS` is available.
2. Search for the current GitHub tool schemas before composing calls.
3. Use `RUBE_MANAGE_CONNECTIONS` with toolkit `github` and complete OAuth only if the connection is not active.
4. Resolve the exact `owner/repo`; do not rely on a similarly named repository.

Never request, print, or persist GitHub credentials in prompts or artifacts.

## Repository Policy Gate

Before mutation, read `AGENTS.md`, contribution and maintainer docs, then inspect the default branch and effective protection. Repository-native commands and required checks take precedence over generic Rube operations.

If a repository provides a guarded merge or release command, use it instead of the generic merge tool. In `agentic-awesome-skills`, use `antigravity-maintainer-batch-release` and `npm run merge:batch` so exact-SHA review, fresh check-suite binding, and protected `main` are enforced.

## Workflows

### Issues

1. List or search existing issues before creating a duplicate.
2. Distinguish issues from pull requests in mixed results.
3. Read the current item, comments, labels, and linked PRs before changing state.
4. Create, comment, label, assign, or close only within the user's requested scope.
5. Re-read the item and verify the resulting state.

Paginate until the requested result set is complete. Treat silent omission of labels or assignees as a permissions failure, not success.

### Pull requests

1. Resolve the PR and capture its number, base, full head SHA, draft state, author, fork identity, and mergeability.
2. Inspect changed files, reviews, conversations, and required check runs.
3. Bind every review or approval decision to the current full head SHA.
4. Create or update the PR body truthfully; never mark pending tests or reviews as completed.
5. Immediately before merge, re-read base/head identity, branch protection, mergeability, required checks, and repository policy.
6. Use the repository's guarded merge path. Call a generic merge tool only when policy permits it and the user authorized the merge.
7. Verify the PR reports `MERGED` and confirm the target branch contains the intended commit.

Do not treat a successful API call that enables auto-merge or queues work as an immediate merge.

### Branches and references

1. Resolve the source commit SHA and target ref explicitly.
2. Create topic branches rather than updating protected/default branches directly.
3. Reject non-fast-forward or force updates unless the user explicitly authorizes them and repository policy permits them.
4. Confirm the remote ref after mutation.

Deletion, force-push, default-branch changes, and protection changes are destructive or high-impact actions requiring explicit authorization.

### Actions and deployments

1. Resolve the workflow by trusted ID or path and confirm `workflow_dispatch` support before dispatch.
2. Bind run inspection to the intended event, ref, and head SHA.
3. Distinguish `queued`, `in_progress`, `action_required`, `completed`, and `skipped` states.
4. Read failed job logs before proposing source changes.
5. Wait for terminal success and verify the deployed or published surface separately.

Do not approve fork workflow runs by raw run ID when the repository provides a guarded approval command.

### Permissions and protection

1. Read collaborators, role, branch protection, and applicable rulesets before proposing changes.
2. Treat a 404 protection response as “not configured” only after confirming repository and branch identity.
3. Show the exact before/after policy and impact before any protection or permission mutation.
4. Re-read effective state after the change.

## Failure Rules

- Re-resolve tool schemas when Rube reports missing or changed parameters.
- Stop on repository ambiguity, stale head/base SHA, missing permissions, incomplete pagination, or inconclusive protection state.
- Never bypass required checks, reviews, merge queues, maintainer commands, or server-side branch protection.
- Do not claim a merge, workflow, deployment, or permission change succeeded without reading the resulting remote state.

## Limitations

- Available Rube tool names and schemas can change; discover them at runtime.
- GitHub permissions, organization policy, and external checks can block otherwise valid operations.
- This skill does not authorize repository deletion, force pushes, protection changes, merges, deployments, or releases beyond explicit user intent.
