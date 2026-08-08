# permission-manager

Manage opencode permissions: review always-allow lists, suggest safe read-only commands, configure permission patterns.

## What it does

- Reviews and summarizes currently always-allowed commands
- Suggests safe read-only commands for auto-approval
- Adds or removes commands from the allow list in opencode.json
- Configures skill-level permissions (allow/deny/ask) with wildcard patterns
- Audits permission configs for security and usability

## When to use

Use this when optimizing opencode's permission settings, reviewing allowed commands, or configuring skill access controls.

## Key capabilities

- **Config review**: Loads `~/.config/opencode/opencode.json` or project-level config
- **Permission summary**: Identifies currently allowed commands and skill permissions
- **Safe commands**: Suggests reviewed read-only commands such as `git status --short`, `git log --oneline`, `rg`, `grep`, and `cat`; broad trailing wildcards need manual review.
- **Change application**: Edits config to add/remove permission entries, validates JSON
