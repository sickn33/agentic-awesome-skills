---
name: create-pr
description: Alias for sentry-skills:pr-writer. Use when users explicitly ask for "create-pr" or reference the legacy skill name. Redirects to the canonical PR writing workflow.
risk: unknown
source: community
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
