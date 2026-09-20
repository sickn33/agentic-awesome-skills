---
name: git-workflow
description: Implement Git branching strategies, PR workflows, and release management
  patterns.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Git Workflow

Implement effective branching strategies and pull request workflows for team collaboration.

## When to Use This Skill

Use this skill when:
- Establishing team Git workflows
- Implementing branching strategies
- Configuring pull request processes
- Setting up release management
- Improving code review practices

## Prerequisites

- Git installed
- Repository hosting (GitHub, GitLab, Bitbucket)
- Basic Git knowledge

## Branching Strategies

### Trunk-Based Development

Best for: Continuous deployment, small teams, mature CI/CD

```
main ─────●─────●─────●─────●─────●─────●─────●
          │     │     │     │     │     │
          └─●   └─●   └─●   └─●   └─●   └─●
         feature branches (short-lived)
```

```bash
# Create short-lived feature branch
git checkout main
git pull origin main
git checkout -b feature/add-login

# Work and commit frequently
git add .
git commit -m "feat: add login form"

# Keep branch updated
git fetch origin
git rebase origin/main

# Merge quickly (same day ideally)
git checkout main
git pull origin main
git merge feature/add-login
git push origin main
git branch -d feature/add-login
```

### GitHub Flow

Best for: Continuous delivery, web applications

```
main ─────●─────●───────────●─────────────●─────●
          │           ↑           ↑       ↑
          └───●───●───┘           │       │
              feature/login       │       │
                                  │       │
          └───●───●───●───●───────┘       │
              feature/dashboard           │
                                          │
          └───●─────────────────────────┘
              hotfix/security-patch
```

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/user-dashboard

# Push and create PR
git push -u origin feature/user-dashboard

# After review, merge via PR (squash recommended)
# Delete branch after merge
```

### GitFlow

Best for: Scheduled releases, versioned products

```
main     ────────●────────────────●──────────────●
                 ↑                ↑              ↑
release  ────────┼────●───●──────┼──────────────┼
                 │    │   │      │              │
develop  ───●────●────┼───●──●───●───●───●───●──┼
            │         │      │       │   │      │
feature  ───┴─────────┘      │       │   │      │
                             │       │   │      │
hotfix   ────────────────────┴───────┼───┼──────┘
                                     │   │
feature  ────────────────────────────┴───┘
```

```bash
# Initialize GitFlow
git flow init

# Start feature
git flow feature start user-auth

# Finish feature (merges to develop)
git flow feature finish user-auth

# Start release
git flow release start 1.0.0

# Finish release (merges to main and develop)
git flow release finish 1.0.0

# Hotfix
git flow hotfix start security-fix
git flow hotfix finish security-fix
```

## Commit Conventions

### Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```bash
git commit -m "feat(auth): add OAuth2 login support"
git commit -m "fix(api): handle null response from payment service"
git commit -m "docs: update API documentation for v2 endpoints"
git commit -m "refactor(db): optimize user query performance"

# Breaking change
git commit -m "feat(api)!: change response format for user endpoint

BREAKING CHANGE: The user endpoint now returns an object instead of array"
```

### Commit Message Template

```bash
# Create template file ~/.gitmessage
# Subject line (50 chars max)

# Body (72 chars per line max)
# - What changed
# - Why it changed
# - Any side effects

# Footer
# Fixes #123
# Co-authored-by: Name <email>

# Configure Git to use template
git config --global commit.template ~/.gitmessage
```

## Pull Request Workflow

### PR Template

```markdown
<!-- .github/pull_request_template.md -->
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review performed
- [ ] Documentation updated
- [ ] No new warnings introduced

## Related Issues
Closes #

## Screenshots (if applicable)
```

### Branch Protection Rules

```yaml
# GitHub branch protection
branch_protection:
  branch: main
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
  required_status_checks:
    strict: true
    contexts:
      - "ci/tests"
      - "ci/lint"
  restrictions:
    users: []
    teams: ["maintainers"]
  enforce_admins: true
  required_linear_history: true
  allow_force_pushes: false
  allow_deletions: false
```

### Code Owners

```
# .github/CODEOWNERS

# Default owners
* @team-leads

# Frontend code
/src/frontend/ @frontend-team
*.tsx @frontend-team
*.css @frontend-team

# Backend code
/src/api/ @backend-team
/src/services/ @backend-team

# Infrastructure
/terraform/ @platform-team
/k8s/ @platform-team
Dockerfile @platform-team

# Documentation
/docs/ @tech-writers
*.md @tech-writers
```

## Git Hooks

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "Linting failed. Fix errors before committing."
  exit 1
fi

# Run tests
npm run test:unit
if [ $? -ne 0 ]; then
  echo "Tests failed. Fix tests before committing."
  exit 1
fi

# Check for debug statements
if grep -r "console.log\|debugger\|binding.pry" --include="*.js" --include="*.ts" --include="*.rb" src/; then
  echo "Remove debug statements before committing."
  exit 1
fi
```

### Using Husky

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{js,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["prettier --write"]
  }
}
```

### Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'revert']
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100]
  }
};
```

## Release Workflow

### Automated Release with Tags

```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0

# Create release from tag (GitHub CLI)
gh release create v1.0.0 \
  --title "Release 1.0.0" \
  --notes "Release notes here" \
  --target main
```

### Changelog Generation

```bash
# Using conventional-changelog
npx conventional-changelog -p angular -i CHANGELOG.md -s

# Using git-cliff
git cliff -o CHANGELOG.md
```

## Common Git Operations

### Rebase vs Merge

```bash
# Rebase (clean history)
git checkout feature/my-feature
git rebase main
git push --force-with-lease

# Merge (preserve history)
git checkout main
git merge feature/my-feature

# Squash merge (single commit)
git merge --squash feature/my-feature
git commit -m "feat: add feature X"
```

### Cherry Pick

```bash
# Apply specific commit to current branch
git cherry-pick abc123

# Cherry pick range
git cherry-pick abc123..def456

# Cherry pick without committing
git cherry-pick -n abc123
```

### Interactive Rebase

```bash
# Clean up last 3 commits
git rebase -i HEAD~3

# In editor:
# pick abc123 First commit
# squash def456 Second commit
# reword ghi789 Third commit
```

## Common Issues

### Issue: Merge Conflicts
**Problem**: Conflicts when merging branches
**Solution**: Rebase frequently, communicate with team, use smaller PRs

### Issue: Diverged Branches
**Problem**: Local branch far behind remote
**Solution**: `git pull --rebase` or `git fetch && git rebase origin/main`

### Issue: Accidental Commit to Wrong Branch
**Problem**: Committed to main instead of feature
**Solution**: `git reset HEAD~1`, checkout correct branch, recommit

## Best Practices

- Keep branches short-lived (< 1 week)
- Write meaningful commit messages
- Use PR templates consistently
- Require code reviews
- Protect main/master branch
- Automate checks with CI
- Squash merge for clean history
- Delete branches after merge

## Related Skills

- semantic-versioning (`semantic-versioning`) - Version management
- github-actions (`github-actions`) - CI/CD automation
- feature-flags (`feature-flags`) - Feature management

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
