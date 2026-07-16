# Rollback Procedure

Use this when a structural refactor, generated artifact refresh, or release prep needs to be backed out safely.

## Before Rolling Back

- Capture the current branch name with `git branch --show-current`.
- Review changed files with `git status --short`.
- Decide whether you need to keep any generated files before reverting.

## Safe Rollback Flow

1. Create a temporary safety branch:

```bash
git switch -c rollback-safety-check
```

2. Verify the repository still reports the expected changed files:

```bash
git status --short
```

3. Switch back to the original branch:

```bash
git switch -
```

4. If you need to discard only this refactor later, revert the relevant commit(s) or restore specific files explicitly:

```bash
git restore README.md CONTRIBUTING.md package.json package-lock.json
git restore --staged README.md CONTRIBUTING.md package.json package-lock.json
```

5. If the refactor has already been committed, prefer `git revert <commit>` over history-rewriting commands.

## Notes

- Avoid `git reset --hard` unless you have explicit approval and understand the impact on unrelated work.
- For generated artifacts, regenerate after rollback with the standard scripts instead of manually editing them.
