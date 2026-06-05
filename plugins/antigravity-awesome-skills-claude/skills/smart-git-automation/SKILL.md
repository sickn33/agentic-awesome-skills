---
name: smart-git-automation
version: 1.0.0
description: "Smart change detection, auto branch naming, and streamlined commit/PR workflow"
risk: critical
source: community
source_type: community
source_repo: mskadu/opencode-agent-skills
license: MIT
license_source: "https://github.com/mskadu/opencode-agent-skills/blob/main/LICENSE"
date_added: "2026-06-05"
---

## What I do
- Intelligently detect and group related changes
- Auto-generate descriptive branch names from changes
- Streamlined workflow: scan → branch → commit → push → PR with fewer prompts

## When to Use
Use this when you want a faster, smarter git workflow that groups changes logically and reduces manual confirmation overhead.

## Workflow Steps

### 1. Smart Detection & Grouping
Run in parallel:
- `git status` - check what's changed
- `git diff --stat` - see file modification summary
- `git diff --name-only` - list changed files only
- `git diff --staged --stat` - see what's already staged

Analyze changes to group them logically:
- Files in the same module/directory → likely related
- Files that were modified together in recent edits → likely related
- New files that complement each other → likely related

Present grouped changes in a clear format, e.g.:
```
📁 Group 1: UI Components
  - src/components/Button.tsx (modified)
  - src/components/Button.test.tsx (modified)

📁 Group 2: API Layer
  - src/api/client.ts (new)
  - src/api/types.ts (modified)
```

### 2. Auto Branch Name Generation
Generate branch name from dominant change pattern:
- Use format: `<type>/<short-description>`
- Types: `feature`, `fix`, `refactor`, `docs`, `test`, `chore`
- Derive description from most significant changed file/feature
- Convert to kebab-case, max 50 chars
- Examples:
  - `feature/add-user-auth` (from auth-related files)
  - `fix/login-validation` (from validation changes)
  - `refactor/api-cleanup` (from API refactoring)

Show the proposed branch name and ask for one-word confirmation (or type alternative).

### 3. Streamlined Branch & Commit
- If not on main/master: check if current branch matches proposed name
  - If yes: stay on it
  - If no: ask to switch or create new
- Create branch: `git checkout -b <branch-name>`
- Stage changes: `git add <grouped-files>`
- Auto-generate commit message from changes:
  - First line: `<type>: <short description>` (max 72 chars)
  - Body: grouped file changes with brief descriptions
- Commit with generated message, show preview first
- Ask for one-word confirmation to proceed

### 4. Push & Optional PR
- After commit, ask: "Push to remote? (yes/no/abort)"
- If yes: `git push -u origin <branch-name>`
- Then ask: "Create PR? (yes/no)"
- If yes:
  - Check remote: `git remote -v`
  - If fork: use fork's remote (e.g., `mskadu/repo-name`)
  - Auto-generate PR description from commit messages
  - Use `gh pr create` with:
    - Title from branch name
    - Body: summary of changes + file breakdown + follow-up notes

## Key Rules
- Group related files automatically, but allow user to adjust
- Generate branch names from actual changes, don't ask user to name them
- Reduce confirmations: ask for one-word answers or single confirmation points
- Never commit secrets, credentials, or large binaries
- Check if GitHub repo exists before PR creation
- Skip PR step if user says "no" at any point
- If branch already exists with changes, offer to amend or add new commit

## Limitations

- Do not bypass repository-specific maintainer rules, branch policies, or required review gates.
- Confirm destructive or publishing actions explicitly; this skill should streamline routine Git flow, not remove accountability.
