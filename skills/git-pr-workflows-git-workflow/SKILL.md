---
name: git-pr-workflows-git-workflow
description: "Orchestrate review, tests, commits, branch pushes, and pull-request creation with parallel agents. Use when completed changes must move through validation into a PR or guarded merge."
risk: critical
source: community
date_added: "2026-02-27"
---

# Guarded Git Pull Request Workflow

Move completed changes from local review to a verified pull request without bypassing repository policy or branch protection.

## When to Use

Use for completed implementation work that must be reviewed, tested, committed, pushed to a topic branch, and opened as a pull request. Use the repository's dedicated maintainer or release workflow instead when one is mandatory.

## Policy Gate

Before mutation:

1. Read `AGENTS.md`, contribution guidance, maintainer docs, and relevant nested instructions.
2. Inspect the current branch, worktree, remotes, upstream, and effective target-branch protection.
3. Discover repository-native validation, commit, PR, merge, and release commands.
4. Preserve unrelated dirty and staged files.

Repository policy wins over flags and user shorthand. Trunk-based development does not imply a direct push: when the target is protected, use a short-lived branch and pull request. If a repository defines a mandatory maintainer skill or guarded merge command, hand off merge and release actions to it. In `agentic-awesome-skills`, use `antigravity-maintainer-batch-release` and `npm run merge:batch`.

## Inputs

Resolve these from the request and repository:

- target branch, defaulting to the repository default branch;
- intended changed files and excluded user work;
- required test, lint, security, build, and documentation checks;
- branch naming and commit-message conventions;
- draft or ready-for-review PR state;
- required reviewers, labels, issue links, and merge method.

Ask only when a missing choice changes the result materially.

## Workflow

### 1. Capture the exact change

```bash
git status --short --branch
git diff --stat
git diff --cached --stat
git branch --show-current
git remote -v
```

Confirm every file in scope. Stop if staged or dirty files cannot be separated safely.

### 2. Review in parallel

When subagents are available and authorized, assign independent bounded passes for:

- correctness and regression risk;
- security, secrets, permissions, and dependency risk;
- test coverage and repository-policy compliance.

Give each reviewer the raw diff and repository instructions. Keep the main agent responsible for deduplication, severity, edits, and final verification.

### 3. Validate and repair

Run the repository's targeted checks, then its required pre-PR suite. If a check fails:

1. identify whether the cause is source, policy, environment, or infrastructure;
2. fix only source or policy defects in scope;
3. rerun the targeted failure;
4. rerun the complete required suite.

Do not weaken gates, hide skipped tests, or treat deterministic failures as flaky.

### 4. Prepare the branch and commit

Fetch the target before committing. If currently on a protected/default branch, create a topic branch before mutation.

```bash
git fetch origin <target-branch>
git switch -c <topic-branch> origin/<target-branch>
git status --short --branch
```

Stage only intended paths and create focused conventional commits according to repository policy. Rebase or update the topic branch when strict required checks demand the latest target; never force a shared branch without explicit authorization.

### 5. Push and create the pull request

```bash
git push -u origin <topic-branch>
gh pr create --base <target-branch> --head <topic-branch> \
  --title "<conventional title>" --body-file <body-file>
```

The PR body must truthfully include:

- what changed and why;
- tests and validation actually run;
- risk, deployment, rollback, and breaking-change notes when applicable;
- issue links, screenshots, and repository checklists when applicable.

Never mark a pending automated review or test as completed.

### 6. Verify the remote result

```bash
gh pr view <pr-number> --json headRefOid,baseRefOid,mergeable,mergeStateStatus,url
gh pr checks <pr-number>
```

Bind review evidence to the current full head SHA. If the head or base changes, discard stale conclusions and rerun affected checks.

Use the repository's guarded merge path. Do not replace required checks, merge queues, exact-SHA attestations, or maintainer commands with a raw merge API. After merge, fetch the target and verify the requested remote, CI, deployment, or release state.

## Stop Condition

Finish when the PR exists at the intended head, required checks are green or have one exact blocker, review evidence is current, unrelated user work is preserved, and any requested guarded merge or deployment is verified.

## Limitations

- This workflow cannot bypass branch protection, required reviews, repository permissions, or missing credentials.
- It does not authorize destructive cleanup, force pushes, merges, deployments, or releases beyond the user's request and repository policy.
- Keep unresolved environment or infrastructure failures explicit; do not convert them into source changes without evidence.
