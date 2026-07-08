# Changelog Automation Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Core Concepts

### 1. Keep a Changelog Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature X

## [1.2.0] - 2024-01-15

### Added
- User profile avatars
- Dark mode support

### Changed
- Improved loading performance by 40%

### Deprecated
- Old authentication API (use v2)

### Removed
- Legacy payment gateway

### Fixed
- Login timeout issue (#123)

### Security
- Updated dependencies for CVE-2024-1234

[Unreleased]: https://github.com/user/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/user/repo/compare/v1.1.0...v1.2.0
```

### 2. Conventional Commits

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

| Type | Description | Changelog Section |
|------|-------------|-------------------|
| `feat` | New feature | Added |
| `fix` | Bug fix | Fixed |
| `docs` | Documentation | (usually excluded) |
| `style` | Formatting | (usually excluded) |
| `refactor` | Code restructure | Changed |
| `perf` | Performance | Changed |
| `test` | Tests | (usually excluded) |
| `chore` | Maintenance | (usually excluded) |
| `ci` | CI changes | (usually excluded) |
| `build` | Build system | (usually excluded) |
| `revert` | Revert commit | Removed |

### 3. Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (feat! or BREAKING CHANGE)
MINOR: New features (feat)
PATCH: Bug fixes (fix)
```

## Implementation

### Method 1: Conventional Changelog (Node.js)

```bash
# Install tools
npm install -D @commitlint/cli @commitlint/config-conventional
npm install -D husky
npm install -D standard-version
# or
npm install -D semantic-release

# Setup commitlint
cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'ci',
        'build',
        'revert',
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 72],
  },
};
EOF

# Setup husky
npx husky init
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### Method 2: standard-version Configuration

```javascript
// .versionrc.js
module.exports = {
  types: [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'revert', section: 'Reverts' },
    { type: 'docs', section: 'Documentation', hidden: true },
    { type: 'style', section: 'Styles', hidden: true },
    { type: 'chore', section: 'Miscellaneous', hidden: true },
    { type: 'refactor', section: 'Code Refactoring', hidden: true },
    { type: 'test', section: 'Tests', hidden: true },
    { type: 'build', section: 'Build System', hidden: true },
    { type: 'ci', section: 'CI/CD', hidden: true },
  ],
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
  issueUrlFormat: '{{host}}/{{owner}}/{{repository}}/issues/{{id}}',
  userUrlFormat: '{{host}}/{{user}}',
  releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
  scripts: {
    prebump: 'echo "Running prebump"',
    postbump: 'echo "Running postbump"',
    prechangelog: 'echo "Running prechangelog"',
    postchangelog: 'echo "Running postchangelog"',
  },
};
```

```json
// package.json scripts
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major",
    "release:patch": "standard-version --release-as patch",
    "release:dry": "standard-version --dry-run"
  }
}
```

### Method 3: semantic-release (Full Automation)

```javascript
// release.config.js
module.exports = {
  branches: [
    'main',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: ['dist/**/*.js', 'dist/**/*.css'],
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
```

### Method 4: GitHub Actions Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      release_type:
        description: 'Release type'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Run semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release

  # Alternative: manual release with standard-version
  manual-release:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Bump version and generate changelog
        run: npx standard-version --release-as ${{ inputs.release_type }}

      - name: Push changes
        run: git push --follow-tags origin main

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ steps.version.outputs.tag }}
          body_path: CHANGELOG.md
          generate_release_notes: true
```

### Method 5: git-cliff (Rust-based, Fast)

```toml
# cliff.toml
[changelog]
header = """
# Changelog

All notable changes to this project will be documented in this file.

"""
body = """
{% if version %}\
    ## [{{ version | trim_start_matches(pat="v") }}] - {{ timestamp | date(format="%Y-%m-%d") }}
{% else %}\
    ## [Unreleased]
{% endif %}\
{% for group, commits in commits | group_by(attribute="group") %}
    ### {{ group | upper_first }}
    {% for commit in commits %}
        - {% if commit.scope %}**{{ commit.scope }}:** {% endif %}\
            {{ commit.message | upper_first }}\
            {% if commit.github.pr_number %} ([#{{ commit.github.pr_number }}](https://github.com/owner/repo/pull/{{ commit.github.pr_number }})){% endif %}\
    {% endfor %}
{% endfor %}
"""
footer = """
{% for release in releases -%}
    {% if release.version -%}
        {% if release.previous.version -%}
            [{{ release.version | trim_start_matches(pat="v") }}]: \
                https://github.com/owner/repo/compare/{{ release.previous.version }}...{{ release.version }}
        {% endif -%}
    {% else -%}
        [unreleased]: https://github.com/owner/repo/compare/{{ release.previous.version }}...HEAD
    {% endif -%}
{% endfor %}
"""
trim = true

[git]
conventional_commits = true
filter_unconventional = true
split_commits = false
commit_parsers = [
    { message = "^feat", group = "Features" },
    { message = "^fix", group = "Bug Fixes" },
    { message = "^doc", group = "Documentation" },
    { message = "^perf", group = "Performance" },
    { message = "^refactor", group = "Refactoring" },
    { message = "^style", group = "Styling" },
    { message = "^test", group = "Testing" },
    { message = "^chore\\(release\\)", skip = true },
    { message = "^chore", group = "Miscellaneous" },
]
filter_commits = false
tag_pattern = "v[0-9]*"
skip_tags = ""
ignore_tags = ""
topo_order = false
sort_commits = "oldest"

[github]
owner = "owner"
repo = "repo"
```

```bash
# Generate changelog
git cliff -o CHANGELOG.md

# Generate for specific range
git cliff v1.0.0..v2.0.0 -o CHANGELOG.md

# Preview without writing
git cliff --unreleased --dry-run
```

### Method 6: Python (commitizen)

```toml
# pyproject.toml
[tool.commitizen]
name = "cz_conventional_commits"
version = "1.0.0"
version_files = [
    "pyproject.toml:version",
    "src/__init__.py:__version__",
]
tag_format = "v$version"
update_changelog_on_bump = true
changelog_incremental = true
changelog_start_rev = "v0.1.0"

[tool.commitizen.customize]
message_template = "{{change_type}}{% if scope %}({{scope}}){% endif %}: {{message}}"
schema = "<type>(<scope>): <subject>"
schema_pattern = "^(feat|fix|docs|style|refactor|perf|test|chore)(\\(\\w+\\))?:\\s.*"
bump_pattern = "^(feat|fix|perf|refactor)"
bump_map = {"feat" = "MINOR", "fix" = "PATCH", "perf" = "PATCH", "refactor" = "PATCH"}
```

```bash
# Install
pip install commitizen

# Create commit interactively
cz commit

# Bump version and update changelog
cz bump --changelog

# Check commits
cz check --rev-range HEAD~5..HEAD
```

## Release Notes Templates

### GitHub Release Template

```markdown
## What's Changed

### 🚀 Features
{{ range .Features }}
- {{ .Title }} by @{{ .Author }} in #{{ .PR }}
{{ end }}

### 🐛 Bug Fixes
{{ range .Fixes }}
- {{ .Title }} by @{{ .Author }} in #{{ .PR }}
{{ end }}

### 📚 Documentation
{{ range .Docs }}
- {{ .Title }} by @{{ .Author }} in #{{ .PR }}
{{ end }}

### 🔧 Maintenance
{{ range .Chores }}
- {{ .Title }} by @{{ .Author }} in #{{ .PR }}
{{ end }}

## New Contributors
{{ range .NewContributors }}
- @{{ .Username }} made their first contribution in #{{ .PR }}
{{ end }}

**Full Changelog**: https://github.com/owner/repo/compare/v{{ .Previous }}...v{{ .Current }}
```

### Internal Release Notes

```markdown
# Release v2.1.0 - January 15, 2024

## Summary
This release introduces dark mode support and improves checkout performance
by 40%. It also includes important security updates.

## Highlights

### 🌙 Dark Mode
Users can now switch to dark mode from settings. The preference is
automatically saved and synced across devices.

### ⚡ Performance
- Checkout flow is 40% faster
- Reduced bundle size by 15%

## Breaking Changes
None in this release.

## Upgrade Guide
No special steps required. Standard deployment process applies.

## Known Issues
- Dark mode may flicker on initial load (fix scheduled for v2.1.1)

## Dependencies Updated
| Package | From | To | Reason |
|---------|------|-----|--------|
| react | 18.2.0 | 18.3.0 | Performance improvements |
| lodash | 4.17.20 | 4.17.21 | Security patch |
```

## Commit Message Examples

```bash
# Feature with scope
feat(auth): add OAuth2 support for Google login

# Bug fix with issue reference
fix(checkout): resolve race condition in payment processing

Closes #123

# Breaking change
feat(api)!: change user endpoint response format

BREAKING CHANGE: The user endpoint now returns `userId` instead of `id`.
Migration guide: Update all API consumers to use the new field name.

# Multiple paragraphs
fix(database): handle connection timeouts gracefully

Previously, connection timeouts would cause the entire request to fail
without retry. This change implements exponential backoff with up to
3 retries before failing.

The timeout threshold has been increased from 5s to 10s based on p99
latency analysis.

Fixes #456
Reviewed-by: @alice
```

## Best Practices

### Do's
- **Follow Conventional Commits** - Enables automation
- **Write clear messages** - Future you will thank you
- **Reference issues** - Link commits to tickets
- **Use scopes consistently** - Define team conventions
- **Automate releases** - Reduce manual errors

### Don'ts
- **Don't mix changes** - One logical change per commit
- **Don't skip validation** - Use commitlint
- **Don't manual edit** - Generated changelogs only
- **Don't forget breaking changes** - Mark with `!` or footer
- **Don't ignore CI** - Validate commits in pipeline

## Resources

- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [semantic-release](https://semantic-release.gitbook.io/)
- [git-cliff](https://git-cliff.org/)
