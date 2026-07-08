---
name: create-issue-gate
description: Use when starting a new implementation task and an issue must be created with strict acceptance criteria gating before execution.
risk: safe
source: community
date_added: "2026-03-12"
---

# Create Issue Gate

## Overview

Create GitHub issues as the single tracking entrypoint for tasks, with a hard gate on acceptance criteria.

Core rule: **no explicit, testable acceptance criteria from user => issue stays `draft` and execution is blocked.**

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
- still create the issue
- set `Status: draft`
- add `Execution Gate: blocked (missing valid acceptance criteria)`
- do not move task to execution

## Issue Creation Mode

Default mode is direct GitHub creation using `gh issue create`.

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

If issue is `draft`, stop and request user-provided acceptance criteria.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
