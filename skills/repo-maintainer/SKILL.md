---
name: repo-maintainer
description: "Audit and repair repository hygiene across artifacts, dependencies, CI, docs, Git state, and code-quality signals. Use for repository maintenance, cleanup, health checks, or pre-release hardening."
risk: critical
source: https://github.com/Wolfe-Jam/faf-skills/tree/main/skills/repo-maintainer
source_repo: Wolfe-Jam/faf-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Wolfe-Jam/faf-skills/blob/main/LICENSE
---

# Repository Maintainer

Audit repository health, apply authorized repairs narrowly, and finish through the repository's own protected workflow.

## When to Use

Use when the user asks to maintain, clean, audit, harden, or prepare a repository for release. Use a more specific security, database, deployment, or release skill when that is the dominant task.

## Repository Policy Gate

Before mutation:

1. Read root and nested `AGENTS.md`, contributor guidance, maintainer docs, and release instructions.
2. Inspect the current branch, worktree, staged files, remotes, default branch, and effective branch protection.
3. Discover repository-native validation, synchronization, merge, and release commands.
4. Preserve unrelated user work and generated outputs that are not in scope.

If the repository names a mandatory maintainer skill or guarded command, delegate to it instead of inventing a parallel branch, merge, sync, or release path. In `agentic-awesome-skills`, use `antigravity-maintainer-batch-release` and `npm run merge:batch`; `main` is pull-request-only.

## Workflow

### 1. Establish the baseline

```bash
git status --short --branch
git diff --stat
git diff --cached --stat
git remote -v
git log -5 --oneline
```

Record the repository's required runtime versions and test commands. Use a clean temporary clone or worktree when existing user changes cannot be isolated safely.

### 2. Audit independent lanes

Run independent read-only checks in parallel where possible.

#### Artifacts and Git hygiene

- untracked caches, coverage, build output, editor files, and test leftovers;
- tracked large or binary files, accidental secrets, executable-mode drift, and ignored-file gaps;
- stale branches, detached HEAD, existing staged changes, submodules, and symlinks;
- generated files whose ownership belongs to CI or a canonical-sync workflow.

Do not delete or rewrite history during the audit.

#### Dependencies and packaging

- lockfile and manifest agreement;
- outdated, vulnerable, duplicate, unused, or end-of-life dependencies;
- runtime imports incorrectly placed in development dependencies;
- clean-install, package-content, and executable-entrypoint behavior.

Treat audit-tool output as evidence to verify, not automatic permission to upgrade or remove packages.

#### CI and release health

- failing, cancelled, skipped, or stale workflow runs;
- inconsistent runtime matrices and unpinned or obsolete actions;
- required checks, branch protection, release permissions, and secret boundaries;
- mismatch between documented and implemented release commands.

#### Documentation and repository metadata

- README, changelog, version, examples, links, badges, credits, and support metadata;
- contribution instructions and PR templates versus current CI policy;
- generated catalog, site, or API documentation drift.

#### Code-quality signals

- dead code, stale TODO/FIXME items, debug logging, commented-out code, and missing tests;
- unsafe defaults, suppressed errors, credential exposure, and environment-specific paths.

For FAF projects only, also inspect declared `.faf`, `.faf-dna`, sync, score, and MCP contracts with the project's installed FAF commands.

### 3. Produce a prioritized decision set

For each finding report:

- evidence and affected paths;
- severity and user impact;
- whether it is safe to fix now, needs approval, or belongs to another workflow;
- exact validation that proves the repair.

Deduplicate symptoms with the same root cause. Do not mix optional modernization with release blockers.

### 4. Apply authorized repairs

Make the smallest coherent change set. Keep source and generated-file ownership separate, update tests with behavior changes, and rerun the targeted failing check after each repair group.

Never delete data, rewrite history, rotate credentials, change branch protection, or upgrade across breaking versions without explicit authorization.

### 5. Validate and publish safely

Run the repository's required pre-PR suite, then inspect the final diff for unrelated files and secrets. Commit on a topic branch and create a pull request when the target branch is protected.

Use required checks and the repository-native merge path. A user request to “push to main” describes the desired final state; it does not bypass branch protection. For releases, use the scripted release workflow and verify external publication rather than inferring success from a local tag.

## Stop Condition

Finish when every in-scope finding is repaired or has one exact blocker, required validation passes, the remote integration path is verified when requested, and unrelated user work remains unchanged.

## Limitations

- Maintenance findings can depend on repository-specific ownership and release policy; read local instructions before acting.
- Dependency and security scanners can produce false positives or incomplete reachability evidence.
- This skill does not authorize destructive cleanup, branch-policy changes, direct protected-branch pushes, merges, deployments, or releases beyond the user's request.
