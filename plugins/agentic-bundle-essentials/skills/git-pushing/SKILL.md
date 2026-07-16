---
name: git-pushing
description: "Safely stage, commit, and push intended git changes with conventional commit messages. Use for ordinary non-release pushes when explicitly asked to push, save work remotely, or share a completed change."
risk: critical
source: community
date_added: "2026-02-27"
---

# Git Push Workflow

Stage only intended changes, create a conventional commit, and push to the remote branch.

## When to Use
Automatically activate when the user:

- Explicitly asks to push changes ("push this", "commit and push")
- Mentions saving work to remote ("save to github", "push to remote")
- Completes a feature and wants to share it
- Says phrases like "let's push this up" or "commit these changes"

## Safety Gates

Before staging, inspect `git status --short --branch`, confirm the intended files, and fetch the upstream branch when a concurrent push is plausible. Do not absorb unrelated dirty files.

The helper requires an empty live index and a conventional commit message before it stages anything. It locks the live index, builds and validates the commit in an isolated temporary index, rejects `--` without paths, and atomically updates the branch only if its parent is unchanged.

The helper honors `branch.<name>.pushRemote`, `remote.pushDefault`, and the branch's configured upstream, in that order. For a new branch without those settings, it requires `origin` and establishes `origin/<branch>`. It rejects detached HEAD and invalid remote configurations before staging.

Do not use this skill for a versioned repository release, tag publication, or a repository with an explicit `release:prepare` / `release:publish` workflow. Use that repository's release flow instead; it owns version changes, generated files, tags, and publish verification.

## Workflow

Use the helper only after the safety gates pass. With no paths it stages all current changes, so use that form only when every dirty file belongs to the requested commit:

```bash
bash skills/git-pushing/scripts/smart_commit.sh
```

With custom message:

```bash
bash skills/git-pushing/scripts/smart_commit.sh "feat: add feature"
```

To stage only named files, pass them after `--`:

```bash
bash skills/git-pushing/scripts/smart_commit.sh "fix: scope change" -- path/to/file
```

The helper handles isolated staging, commit creation, and push; it does not replace validation, release tooling, or a rebase required by an advanced upstream branch.

## Limitations
- The helper currently requires Git's `files` ref backend; it rejects `reftable` repositories before creating a commit because their refs cannot use the filesystem lock protocol.
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
