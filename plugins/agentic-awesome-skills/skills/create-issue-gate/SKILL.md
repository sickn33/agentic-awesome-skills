---
name: create-issue-gate
description: Use when starting a new implementation task and an issue must be created with strict acceptance criteria gating before execution.
risk: critical
source: community
date_added: "2026-03-12"
---

# Create Issue Gate

## Overview

Use this issue-gating workflow only when the user or current project explicitly requires it. It is not a universal prerequisite for implementation or permission to create public issues.

Core rule: **within an explicitly required issue gate, dependent execution requires valid acceptance criteria.** Derive them from available authorized task context when possible; only indispensable unresolved decisions need clarification.

## When to Use
- You are starting a new implementation task and want a GitHub issue to be the required tracking entrypoint.
- The work must be blocked until the user provides explicit, testable acceptance criteria.
- You need to distinguish between `draft`, `ready`, and `blocked` work before execution begins.

## Required Fields

Every issue must include these sections:
- Problem
- Goal
- Scope
- Non-Goals
- Acceptance Criteria
- Dependencies/Blockers
- Status (`draft` | `ready` | `blocked` | `done`)

## Acceptance Criteria Gate

Acceptance criteria are valid only when they are testable and pass/fail checkable.

Examples:
- valid: "CreateCheckoutLambda-dev returns an openable third-party payment checkout URL"
- invalid: "fix checkout" / "improve UX" / "make it better"

If criteria are missing or non-testable:
- prepare a reviewable draft; create a public issue only when that repository action is authorized
- set `Status: draft`
- add `Execution Gate: blocked (missing valid acceptance criteria)`
- do not move task to execution

## Issue Creation Mode

Default to preparing the exact issue body for review. If issue creation is authorized, use the named repository and existing template; a skill invocation does not grant permission to post to an unrelated repository.

Use a body template like:

```md
## Problem
<what is broken or missing>

## Goal
<what outcome is expected>

## Scope
- <in scope item>

## Non-Goals
- <out of scope item>

## Acceptance Criteria
- <explicit, testable criterion 1>

## Dependencies/Blockers
- <dependency or none>

## Status
draft|ready|blocked|done

## Execution Gate
allowed|blocked (<reason>)
```

## Status Rules

- `draft`: missing/weak acceptance criteria or incomplete task definition
- `ready`: acceptance criteria are explicit and testable
- `blocked`: external dependency prevents progress
- `done`: acceptance criteria verified with evidence

Never mark an issue `ready` without valid acceptance criteria.

## Handoff to Execution

Execution workflows (for example `closed-loop-delivery`) may start only when:
- issue status is `ready`
- execution gate is `allowed`

If an applicable required issue remains draft due to an indispensable missing decision, pause that dependent step and continue independent safe work. Do not ask again for criteria already clear in the user’s request.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
