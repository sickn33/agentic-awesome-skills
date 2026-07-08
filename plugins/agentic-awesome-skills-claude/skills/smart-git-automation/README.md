# smart-git-automation

Intelligently detect and group changes, auto-generate branch names, and streamline the commit/PR workflow.

## What it does

- Intelligently detects and groups related changes
- Auto-generates descriptive branch names from changes
- Streamlines workflow: scan → branch → commit → push → PR with fewer prompts
- Generates commit messages and PR descriptions from changes

## When to use

Use this when you want a faster, smarter git workflow that groups changes logically and reduces manual confirmation overhead.

## Key capabilities

- **Smart grouping**: Runs git status/diff in parallel, groups files by module/directory or related edits
- **Auto branch names**: Generates `<type>/<short-description>` in kebab-case from dominant change pattern (feature, fix, refactor, docs, test, chore)
- **Streamlined commit**: Stages grouped files, auto-generates commit message, asks single-word confirmation
- **Push & PR**: Optional push to remote, then optional PR with auto-generated title/body from changes
- **Fork handling**: Detects fork remotes and uses correct remote for PR creation

## Rules

- Generate branch names from actual changes, don't ask user to name them
- Reduce confirmations to single-word answers or single confirmation points
- Never commit secrets, credentials, or large binaries
- Check if GitHub repo exists before PR creation
- Skip PR step if user says "no" at any point
- If branch already exists with changes, offer to amend or add new commit
