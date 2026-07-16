---
name: git-advanced-workflows
description: "Master advanced Git techniques to maintain clean history, collaborate effectively, and recover from any situation with confidence."
risk: critical
source: community
date_added: "2026-02-27"
---

# Git Advanced Workflows

Master advanced Git techniques to maintain clean history, collaborate effectively, and recover from any situation with confidence.

## Do not use this skill when

- The task is unrelated to git advanced workflows
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Cleaning up commit history before merging
- Applying specific commits across branches
- Finding commits that introduced bugs
- Working on multiple features simultaneously
- Recovering from Git mistakes or lost commits
- Managing complex branch workflows
- Preparing clean PRs for review
- Synchronizing diverged branches

## Core Concepts

### 1. Interactive Rebase

Interactive rebase is the Swiss Army knife of Git history editing.

**Common Operations:**
- `pick`: Keep commit as-is
- `reword`: Change commit message
- `edit`: Amend commit content
- `squash`: Combine with previous commit
- `fixup`: Like squash but discard message
- `drop`: Remove commit entirely

**Basic Usage:**
```bash
# Rebase last 5 commits
git rebase -i HEAD~5

# Rebase all commits on current branch
git rebase -i $(git merge-base HEAD main)

# Rebase onto specific commit
git rebase -i abc123
```

### 2. Cherry-Picking

Apply specific commits from one branch to another without merging entire branches.

```bash
# Cherry-pick single commit
git cherry-pick abc123

# Cherry-pick range of commits (exclusive start)
git cherry-pick abc123..def456

# Cherry-pick without committing (stage changes only)
git cherry-pick -n abc123

# Cherry-pick and edit commit message
git cherry-pick -e abc123
```

### 3. Git Bisect

Binary search through commit history to find the commit that introduced a bug.

```bash
# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark known good commit
git bisect good v1.0.0

# Git will checkout middle commit - test it
# Then mark as good or bad
git bisect good  # or: git bisect bad

# Continue until bug found
# When done
git bisect reset
```

**Automated Bisect:**
```bash
# Use script to test automatically
git bisect start HEAD v1.0.0
git bisect run ./test.sh

# test.sh should exit 0 for good, 1-127 (except 125) for bad
```

### 4. Worktrees

Work on multiple branches simultaneously without stashing or switching.

```bash
# List existing worktrees
git worktree list

# Add new worktree for feature branch
git worktree add ../project-feature feature/new-feature

# Add worktree and create new branch
git worktree add -b bugfix/urgent ../project-hotfix main

# Remove worktree
git worktree remove ../project-feature

# Prune stale worktrees
git worktree prune
```

### 5. Reflog

Your safety net - tracks all ref movements, even deleted commits.

```bash
# View reflog
git reflog

# View reflog for specific branch
git reflog show feature/branch

# Restore deleted commit
git reflog
# Find commit hash
git checkout abc123
git branch recovered-branch

# Restore deleted branch
git reflog
git branch deleted-branch abc123
```

## Practical Workflows

### Workflow 1: Clean Up Feature Branch Before PR

```bash
# Start with feature branch
git checkout feature/user-auth

# Interactive rebase to clean history
git rebase -i main

# Example rebase operations:
# - Squash "fix typo" commits
# - Reword commit messages for clarity
# - Reorder commits logically
# - Drop unnecessary commits

# Force push cleaned branch (safe if no one else is using it)
git push --force-with-lease origin feature/user-auth
```

### Workflow 2: Apply Hotfix to Multiple Releases

```bash
# Create fix on main
git checkout main
git commit -m "fix: critical security patch"

# Apply to release branches
git checkout release/2.0
git cherry-pick abc123

git checkout release/1.9
git cherry-pick abc123

# Handle conflicts if they arise
git cherry-pick --continue
# or
git cherry-pick --abort
```

### Workflow 3: Find Bug Introduction

```bash
# Start bisect
git bisect start
git bisect bad HEAD
git bisect good v2.1.0

# Git checks out middle commit - run tests
npm test

# If tests fail
git bisect bad

# If tests pass
git bisect good

# Git will automatically checkout next commit to test
# Repeat until bug found

# Automated version
git bisect start HEAD v2.1.0
git bisect run npm test
```

### Workflow 4: Multi-Branch Development

```bash
# Main project directory
cd ~/projects/myapp

# Create worktree for urgent bugfix
git worktree add ../myapp-hotfix hotfix/critical-bug

# Work on hotfix in separate directory
cd ../myapp-hotfix
# Make changes, commit
git commit -m "fix: resolve critical bug"
git push origin hotfix/critical-bug

# Return to main work without interruption
cd ~/projects/myapp
git fetch origin
git cherry-pick hotfix/critical-bug

# Clean up when done
git worktree remove ../myapp-hotfix
```

### Workflow 5: Recover from Mistakes

```bash
# Accidentally reset to wrong commit
git reset --hard HEAD~5  # Oh no!

# Use reflog to find lost commits
git reflog
# Output shows:
# abc123 HEAD@{0}: reset: moving to HEAD~5
# def456 HEAD@{1}: commit: my important changes

# Recover lost commits
git reset --hard def456

# Or create branch from lost commit
git branch recovery def456
```

## Advanced Techniques

### Rebase vs Merge Strategy

**When to Rebase:**
- Cleaning up local commits before pushing
- Keeping feature branch up-to-date with main
- Creating linear history for easier review

**When to Merge:**
- Integrating completed features into main
- Preserving exact history of collaboration
- Public branches used by others

```bash
# Update feature branch with main changes (rebase)
git checkout feature/my-feature
git fetch origin
git rebase origin/main

# Handle conflicts
git status
# Fix conflicts in files
git add .
git rebase --continue

# Or merge instead
git merge origin/main
```

### Autosquash Workflow

Automatically squash fixup commits during rebase.

```bash
# Make initial commit
git commit -m "feat: add user authentication"

# Later, fix something in that commit
# Stage changes
git commit --fixup HEAD  # or specify commit hash

# Make more changes
git commit --fixup abc123

# Rebase with autosquash
git rebase -i --autosquash main

# Git automatically marks fixup commits
```

### Split Commit

Break one commit into multiple logical commits.

```bash
# Start interactive rebase
git rebase -i HEAD~3

# Mark commit to split with 'edit'
# Git will stop at that commit

# Reset commit but keep changes
git reset HEAD^

# Stage and commit in logical chunks
git add file1.py
git commit -m "feat: add validation"

git add file2.py
git commit -m "feat: add error handling"

# Continue rebase
git rebase --continue
```

### Partial Cherry-Pick

Cherry-pick only specific files from a commit.

```bash
# Show files in commit
git show --name-only abc123

# Checkout specific files from commit
git checkout abc123 -- path/to/file1.py path/to/file2.py

# Stage and commit
git commit -m "cherry-pick: apply specific changes from abc123"
```

## Best Practices

1. **Always Use --force-with-lease**: Safer than --force, prevents overwriting others' work
2. **Rebase Only Local Commits**: Don't rebase commits that have been pushed and shared
3. **Descriptive Commit Messages**: Future you will thank present you
4. **Atomic Commits**: Each commit should be a single logical change
5. **Test Before Force Push**: Ensure history rewrite didn't break anything
6. **Keep Reflog Aware**: Remember reflog is your safety net for 90 days
7. **Branch Before Risky Operations**: Create backup branch before complex rebases

```bash
# Safe force push
git push --force-with-lease origin feature/branch

# Create backup before risky operation
git branch backup-branch
git rebase -i main
# If something goes wrong
git reset --hard backup-branch
```

## Common Pitfalls

- **Rebasing Public Branches**: Causes history conflicts for collaborators
- **Force Pushing Without Lease**: Can overwrite teammate's work
- **Losing Work in Rebase**: Resolve conflicts carefully, test after rebase
- **Forgetting Worktree Cleanup**: Orphaned worktrees consume disk space
- **Not Backing Up Before Experiment**: Always create safety branch
- **Bisect on Dirty Working Directory**: Commit or stash before bisecting

## Recovery Commands

```bash
# Abort operations in progress
git rebase --abort
git merge --abort
git cherry-pick --abort
git bisect reset

# Restore file to version from specific commit
git restore --source=abc123 path/to/file

# Undo last commit but keep changes
git reset --soft HEAD^

# Undo last commit and discard changes
git reset --hard HEAD^

# Recover deleted branch (within 90 days)
git reflog
git branch recovered-branch abc123
```

## Resources

- **references/git-rebase-guide.md**: Deep dive into interactive rebase
- **references/git-conflict-resolution.md**: Advanced conflict resolution strategies
- **references/git-history-rewriting.md**: Safely rewriting Git history
- **assets/git-workflow-checklist.md**: Pre-PR cleanup checklist
- **assets/git-aliases.md**: Useful Git aliases for advanced workflows
- **scripts/git-clean-branches.sh**: Clean up merged and stale branches

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
