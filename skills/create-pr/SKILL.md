---
id: 'create-pr'
name: create-pr
description: Alias for sentry-skills:pr-writer. Use when users explicitly ask for "create-pr" or reference the legacy skill name. Redirects to the canonical PR writing workflow.
risk: safe
source: community
category: frontend-frameworks
tags:
- ci
- git
- test
- testing
- ui
- writing
tools:
- claude-code
author: 'emanueleodierna'
date_added: '2026-05-23'
---

# Alias: create-pr

This skill name is kept for compatibility.

## When to Use
- The user explicitly asks for `create-pr` or refers to the legacy skill name.
- You need to redirect pull request creation work to the canonical `sentry-skills:pr-writer` workflow.
- The task is specifically about writing or updating a pull request rather than general git operations.

Use `sentry-skills:pr-writer` as the canonical skill for creating and editing pull requests.

If invoked via `create-pr`, run the same workflow and conventions documented in `sentry-skills:pr-writer`.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

