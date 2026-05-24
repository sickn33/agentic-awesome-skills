---
id: 'git-pushing'
name: git-pushing
description: "Stage all changes, create a conventional commit, and push to the remote branch. Use when explicitly asks to push changes (\"push this\", \"commit and push\"), mentions saving work to remote (\"save to github\", \"push to remote\"), or completes a feature and wants to share it."
risk: critical
source: community
date_added: "2026-02-27"
category: frontend-frameworks
tags:
- ci
- claude
- git
- test
- testing
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Git Push Workflow

Stage all changes, create a conventional commit, and push to the remote branch.

## When to Use
Automatically activate when the user:

- Explicitly asks to push changes ("push this", "commit and push")
- Mentions saving work to remote ("save to github", "push to remote")
- Completes a feature and wants to share it
- Says phrases like "let's push this up" or "commit these changes"

## Workflow

**ALWAYS use the script** - do NOT use manual git commands:

```bash
bash skills/git-pushing/scripts/smart_commit.sh
```

With custom message:

```bash
bash skills/git-pushing/scripts/smart_commit.sh "feat: add feature"
```

Script handles: staging, conventional commit message, Claude footer, push with -u flag.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

