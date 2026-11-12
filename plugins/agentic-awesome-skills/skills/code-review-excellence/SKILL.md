---
name: code-review-excellence
description: "Review a defined code diff for correctness, security, performance and maintainability; report evidence-backed findings with severity and actionable feedback."
risk: safe
source: community
date_added: "2026-02-27"
---

# Code Review Excellence

Review the actual base/head diff and relevant surrounding behavior. Separate reproducible defects from questions and optional suggestions.

## Use this skill when

- Reviewing pull requests and code changes
- Establishing code review standards
- Mentoring developers through review feedback
- Auditing for correctness, security, or performance

## Do not use this skill when

- There are no code changes to review
- The task is a design-only discussion without code
- You need to implement fixes instead of reviewing

## Instructions

- Identify the exact base/head, requested review scope, requirements and available test evidence first.
- Review for correctness, security, performance, and maintainability.
- Provide actionable feedback with severity and rationale.
- Ask clarifying questions when intent is unclear.
- If detailed checklists are required, open `resources/implementation-playbook.md`.

## Output Format

- High-level summary of findings
- Issues grouped by severity (blocking, important, minor)
- Suggestions and questions
- Test and coverage notes

## Worked example: a retry can create two records

Given a diff that retries a create request, inspect the caller, server handling and existing idempotency tests. If a lost response can lead to a second committed record, cite the changed lines and describe the trigger and consequence. Use an isolated fixture to reproduce it when available. Recommend a contract-compatible fix and a regression covering the lost-response case; avoid treating every retry as a defect.

Return each finding with severity, location, evidence, impact and a suggested correction. Label an untested hypothesis as such, and report no findings when the reviewed evidence supports none. A clean review is scoped to that diff and is not proof that the entire application is secure.

## Resources

- `resources/implementation-playbook.md` for detailed review patterns and templates.

## Limitations
- Draft findings in the requested channel; this skill alone does not authorize posting comments, approving a PR or merging it.
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
