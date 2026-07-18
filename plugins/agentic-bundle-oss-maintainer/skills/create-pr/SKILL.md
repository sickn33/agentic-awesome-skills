---
name: create-pr
description: Alias for pr-writer. Use when users explicitly ask for "create-pr" or reference the legacy skill name. Redirects to the canonical PR writing workflow.
risk: unknown
source: community
---

# Alias: create-pr

This skill name is kept for compatibility.

## When to Use
- The user explicitly asks for `create-pr` or refers to the legacy skill name.
- You need to redirect pull request creation work to the canonical `pr-writer` workflow.
- The task is specifically about writing or updating a pull request rather than general git operations.

Use the available `pr-writer` skill as the canonical workflow for creating and editing pull requests. If the client requires qualified skill names, use the qualifier for the plugin that supplied this skill rather than assuming an external namespace.

If invoked via `create-pr`, run the same workflow and conventions documented in `pr-writer`.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
