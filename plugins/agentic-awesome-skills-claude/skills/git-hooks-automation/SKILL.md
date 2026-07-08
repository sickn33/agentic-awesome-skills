---
name: git-hooks-automation
description: "Master Git hooks setup with Husky, lint-staged, pre-commit framework, and commitlint. Automate code quality gates, formatting, linting, and commit message enforcement before code reaches CI."
risk: safe
source: community
date_added: "2026-03-07"
---

# Git Hooks Automation

Automate code quality enforcement at the Git level. Set up hooks that lint, format, test, and validate before commits and pushes ever reach your CI pipeline — catching issues in seconds instead of minutes.

## When to Use This Skill

- User asks to "set up git hooks" or "add pre-commit hooks"
- Configuring Husky, lint-staged, or the pre-commit framework
- Enforcing commit message conventions (Conventional Commits, commitlint)
- Automating linting, formatting, or type-checking before commits
- Setting up pre-push hooks for test runners
- Migrating from Husky v4 to v9+ or adopting hooks from scratch
- User mentions "pre-commit", "commit-msg", "pre-push", "lint-staged", or "githooks"

## Git Hooks Fundamentals

Git hooks are scripts that run automatically at specific points in the Git workflow. They live in `.git/hooks/` and are not version-controlled by default — which is why tools like Husky exist.

### Hook Types & When They Fire

| Hook | Fires When | Common Use |
|---|---|---|
| `pre-commit` | Before commit is created | Lint, format, type-check staged files |
| `prepare-commit-msg` | After default msg, before editor | Auto-populate commit templates |
| `commit-msg` | After user writes commit message | Enforce commit message format |
| `post-commit` | After commit is created | Notifications, logging |
| `pre-push` | Before push to remote | Run tests, check branch policies |
| `pre-rebase` | Before rebase starts | Prevent rebase on protected branches |
| `post-merge` | After merge completes | Install deps, run migrations |
| `post-checkout` | After checkout/switch | Install deps, rebuild assets |

### Native Git Hooks (No Framework)

```bash
# Create a pre-commit hook manually
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
set -e

# Run linter on staged files only
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx)$' || true)

if [ -n "$STAGED_FILES" ]; then
  echo "🔍 Linting staged files..."
  echo "$STAGED_FILES" | xargs npx eslint --fix
  echo "$STAGED_FILES" | xargs git add  # Re-stage after fixes
fi
EOF
chmod +x .git/hooks/pre-commit
```

**Problem**: `.git/hooks/` is local-only and not shared with the team. Use a framework instead.

## Husky + lint-staged (Node.js Projects)

The modern standard for JavaScript/TypeScript projects. Husky manages Git hooks; lint-staged runs commands only on staged files for speed.

### Quick Setup (Husky v9+)

```bash
# Install
npm install --save-dev husky lint-staged

# Initialize Husky (creates .husky/ directory)
npx husky init

# The init command creates a pre-commit hook — edit it:
echo "npx lint-staged" > .husky/pre-commit
```

### Configure lint-staged in `package.json`

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "prettier --write",
      "stylelint --fix"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Add Commit Message Linting

```bash
# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Create commitlint config
cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100]
  }
};
EOF

# Add commit-msg hook
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### Add Pre-Push Hook

```bash
# Run tests before pushing
echo "npm test" > .husky/pre-push
```

### Complete Husky Directory Structure

```
project/
├── .husky/
│   ├── pre-commit        # npx lint-staged
│   ├── commit-msg        # npx --no -- commitlint --edit $1
│   └── pre-push          # npm test
├── commitlint.config.js
├── package.json          # lint-staged config here
└── ...
```

## pre-commit Framework (Python / Polyglot)

Language-agnostic framework that works with any project. Hooks are defined in YAML and run in isolated environments.

### Setup

```bash
# Install (Python required)
pip install pre-commit

# Create config
cat > .pre-commit-config.yaml << 'EOF'
repos:
  # Built-in checks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
        args: ['--maxkb=500']
      - id: check-merge-conflict
      - id: detect-private-key

  # Python formatting
  - repo: https://github.com/psf/black
    rev: 24.4.2
    hooks:
      - id: black

  # Python linting
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: ['--fix']
      - id: ruff-format

  # Shell script linting
  - repo: https://github.com/shellcheck-py/shellcheck-py
    rev: v0.10.0.1
    hooks:
      - id: shellcheck

  # Commit message format
  - repo: https://github.com/compilerla/conventional-pre-commit
    rev: v3.2.0
    hooks:
      - id: conventional-pre-commit
        stages: [commit-msg]
EOF

# Install hooks into .git/hooks/
pre-commit install
pre-commit install --hook-type commit-msg

# Run against all files (first time)
pre-commit run --all-files
```

### Key Commands

```bash
pre-commit install              # Install hooks
pre-commit run --all-files      # Run on everything (CI or first setup)
pre-commit autoupdate           # Update hook versions
pre-commit run <hook-id>        # Run a specific hook
pre-commit clean                # Clear cached environments
```

## Custom Hook Scripts (Any Language)

For projects not using Node or Python, write hooks directly in shell.

### Portable Pre-Commit Hook

```bash
#!/bin/sh
# .githooks/pre-commit — Team-shared hooks directory
set -e

echo "=== Pre-Commit Checks ==="

# 1. Prevent commits to main/master
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "❌ Direct commits to $BRANCH are not allowed. Use a feature branch."
  exit 1
fi

# 2. Check for debugging artifacts
if git diff --cached --diff-filter=ACM | grep -nE '(console\.log|debugger|binding\.pry|import pdb)' > /dev/null 2>&1; then
  echo "⚠️  Debug statements found in staged files:"
  git diff --cached --diff-filter=ACM | grep -nE '(console\.log|debugger|binding\.pry|import pdb)'
  echo "Remove them or use git commit --no-verify to bypass."
  exit 1
fi

# 3. Check for large files (>1MB)
LARGE_FILES=$(git diff --cached --name-only --diff-filter=ACM | while read f; do
  size=$(wc -c < "$f" 2>/dev/null || echo 0)
  if [ "$size" -gt 1048576 ]; then echo "$f ($((size/1024))KB)"; fi
done)
if [ -n "$LARGE_FILES" ]; then
  echo "❌ Large files detected:"
  echo "$LARGE_FILES"
  exit 1
fi

# 4. Check for secrets patterns
if git diff --cached --diff-filter=ACM | grep -nEi '(AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{48}|ghp_[a-zA-Z0-9]{36}|password\s*=\s*["\x27][^"\x27]+["\x27])' > /dev/null 2>&1; then
  echo "🚨 Potential secrets detected in staged changes! Review before committing."
  exit 1
fi

echo "✅ All pre-commit checks passed"
```

### Share Custom Hooks via `core.hooksPath`

```bash
# In your repo, set a shared hooks directory
git config core.hooksPath .githooks

# Add to project setup docs or Makefile
# Makefile
setup:
	git config core.hooksPath .githooks
	chmod +x .githooks/*
```

## CI Integration

Hooks are a first line of defense, but CI is the source of truth.

### Run pre-commit in CI (GitHub Actions)

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]
jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - uses: pre-commit/action@v3.0.1
```

### Run lint-staged in CI (Validation Only)

```yaml
# Validate that lint-staged would pass (catch bypassed hooks)
name: Lint Check
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx eslint . --max-warnings=0
      - run: npx prettier --check .
```

## Common Pitfalls & Fixes

### Hooks Not Running

| Symptom | Cause | Fix |
|---|---|---|
| Hooks silently skipped | Not installed in `.git/hooks/` | Run `npx husky init` or `pre-commit install` |
| "Permission denied" | Hook file not executable | `chmod +x .husky/pre-commit` |
| Hooks run but wrong ones | Stale hooks from old setup | Delete `.git/hooks/` contents, reinstall |
| Works locally, fails in CI | Different Node/Python versions | Pin versions in CI config |

### Performance Issues

```json
// ❌ Slow: runs on ALL files every commit
{
  "scripts": {
    "precommit": "eslint src/ && prettier --write src/"
  }
}

// ✅ Fast: lint-staged runs ONLY on staged files
{
  "lint-staged": {
    "*.{js,ts}": ["eslint --fix", "prettier --write"]
  }
}
```

### Bypassing Hooks (When Needed)

```bash
# Skip all hooks for a single commit
git commit --no-verify -m "wip: quick save"

# Skip pre-push only
git push --no-verify

# Skip specific pre-commit hooks
SKIP=eslint git commit -m "fix: update config"
```

> **Warning**: Bypassing hooks should be rare. If your team frequently bypasses, the hooks are too slow or too strict — fix them.

## Migration Guide

### Husky v4 → v9 Migration

```bash
# 1. Remove old Husky
npm uninstall husky
rm -rf .husky

# 2. Remove old config from package.json
# Delete "husky": { "hooks": { ... } } section

# 3. Install fresh
npm install --save-dev husky
npx husky init

# 4. Recreate hooks
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg

# 5. Clean up — old Husky used package.json config,
#    new Husky uses .husky/ directory with plain scripts
```

### Adopting Hooks on an Existing Project

```bash
# Step 1: Start with formatting only (low friction)
# lint-staged config:
{ "*.{js,ts}": ["prettier --write"] }

# Step 2: Add linting after team adjusts (1-2 weeks later)
{ "*.{js,ts}": ["eslint --fix", "prettier --write"] }

# Step 3: Add commit message linting
# Step 4: Add pre-push test runner

# Gradual adoption prevents team resistance
```

## Key Principles

- **Staged files only** — Never lint the entire codebase on every commit
- **Auto-fix when possible** — `--fix` flags reduce developer friction
- **Fast hooks** — Pre-commit should complete in < 5 seconds
- **Fail loud** — Clear error messages with actionable fixes
- **Team-shared** — Use Husky or `core.hooksPath` so hooks are version-controlled
- **CI as backup** — Hooks are convenience; CI is the enforcer
- **Gradual adoption** — Start with formatting, add linting, then testing

## Related Skills

- `@codebase-audit-pre-push` - Deep audit before GitHub push
- `@verification-before-completion` - Verification before claiming work is done
- `@bash-pro` - Advanced shell scripting for custom hooks
- `@github-actions-templates` - CI/CD workflow templates

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
