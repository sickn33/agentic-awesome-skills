---
name: create-branch
description: Create a git branch following Sentry naming conventions. Use when asked to "create a branch", "new branch", "start a branch", "make a branch", "switch to a new branch", or when starting new work on the default branch.
argument-hint: '[optional description of the work]'
risk: critical
source: community
---

# Create Branch

Create a git branch with the correct type prefix and a descriptive name following Sentry conventions.

## When to Use
- You need to create a new git branch that follows the repository's naming convention.
- You are starting a new piece of work from the default branch and need help classifying it as `feat`, `fix`, `docs`, or another branch type.
- You want the branch name proposed from either the task description or the current local diff.

## Step 1: Get the Username Prefix

Run `gh api user --jq .login` to get the GitHub username.

If the command fails (e.g. not authenticated), ask the user for their preferred prefix.

## Step 2: Determine the Branch Description

**If `$ARGUMENTS` is provided**, use it as the description of the work.

**If no arguments**, check for local changes:

```bash
git diff
git diff --cached
git status --short
```

- **Changes exist**: read the diff content to understand what the work is about and generate a description.
- **No changes**: ask the user what they are about to work on.

## Step 3: Classify the Type

Pick the type from this table based on the description:

| Type      | Use when                                                              |
| --------- | --------------------------------------------------------------------- |
| `feat`    | New user-facing functionality                                         |
| `fix`     | Broken behavior now works                                             |
| `ref`     | Same behavior, different structure                                    |
| `chore`   | Deps, config, version bumps, updating existing tooling — no new logic |
| `perf`    | Same behavior, faster                                                 |
| `style`   | CSS, formatting, visual-only                                          |
| `docs`    | Documentation only                                                    |
| `test`    | Tests only                                                            |
| `ci`      | CI/CD config                                                          |
| `build`   | Build system                                                          |
| `meta`    | Repo metadata changes                                                 |
| `license` | License changes                                                       |

When unsure: `feat` for new things (including new scripts, skills, or tools), `ref` for restructuring existing things, `chore` only when updating/maintaining something that already exists.

## Step 4: Generate and Propose

Build the branch name as `<username>/<type>/<short-description>`.

Rules for `<short-description>`:

- Kebab-case, lowercase
- 3 to 6 words, concise but clear
- Describe the change, not file names
- Only use ASCII letters, digits, and hyphens — no spaces, dots, colons, tildes, or other git-forbidden characters

Present it to the user and ask if they want to use it, modify it, or change the type.

### Examples

| Work description                           | Branch name                                 |
| ------------------------------------------ | ------------------------------------------- |
| Dropdown menu not closing on outside click | `priscila/fix/dropdown-not-closing-on-blur` |
| Adding search to conversations page        | `priscila/feat/add-search-to-conversations` |
| Restructuring drawer components            | `priscila/ref/simplify-drawer-components`   |
| Updating test fixtures                     | `priscila/chore/update-test-fixtures`       |
| Bumping @sentry/react to latest version    | `priscila/chore/bump-sentry-react`          |
| Adding a new agent skill                   | `priscila/feat/add-create-branch-skill`     |

## Step 5: Create the Branch

Once confirmed, detect the current and default branch:

```bash
git branch --show-current
git remote | grep -qx origin && echo origin || git remote | head -1
git symbolic-ref refs/remotes/<remote>/HEAD 2>/dev/null | sed 's|refs/remotes/<remote>/||' | tr -d '[:space:]'
```

If `symbolic-ref` fails, fall back to `git branch --list main master`: use the one that exists; if both or neither exist, ask the user.

If `git branch --show-current` is empty (detached HEAD), show the current commit (`git rev-parse --short HEAD`) and ask whether to branch from it or switch to the default branch first.

Otherwise, if the current branch is not the default branch, warn the user and ask whether to branch from the current branch or switch to the default branch first.

If the user wants to switch to the default branch, handle any uncommitted changes appropriately (offer to stash them if present), then run `git checkout <default-branch>`. On any failure, restore stashed changes if applicable and stop.

Before creating the branch, check that the name doesn't already exist locally or on the remote (`git show-ref`). If it does, ask the user to choose a different name.

Create the branch:

```bash
git checkout -b <branch-name>
```

Restore any stashed changes after the branch is created.

## References

- [Sentry Branch Naming](https://develop.sentry.dev/sdk/getting-started/standards/code-submission/#branch-naming)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
