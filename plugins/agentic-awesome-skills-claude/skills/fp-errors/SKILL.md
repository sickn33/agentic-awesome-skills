---
name: fp-errors
description: Stop throwing everywhere - handle errors as values using Either and TaskEither for cleaner, more predictable code
risk: critical
source: community
date_added: "2026-01-30"
version: 1.0.0
author: kadu
tags:
  - fp-ts
  - error-handling
  - either
  - task-either
  - typescript
  - validation
  - practical
---

# Practical Error Handling with fp-ts

This skill teaches you how to handle errors without try/catch spaghetti. No academic jargon - just practical patterns for real problems.

The core idea: **Errors are just data**. Instead of throwing them into the void and hoping someone catches them, return them as values that TypeScript can track.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You need to replace exception-heavy code with `Either` or `TaskEither`.
- The task involves validation, domain errors, or clearer error contracts in TypeScript.
- You want pragmatic fp-ts error-handling guidance for real application code.

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Type and side-effect boundaries

These are separate fragments, not one compilable module: imports, domain types and application helpers must be supplied. `FormData` means a custom record with email/password/age fields here, not the browser FormData class. Import Task as T wherever T.of is used and Array as A in the bulk fragment. fp-ts Either can still be ignored; a return type does not force a caller to inspect it. Functions inside map/chain must not throw outside an explicitly wrapped boundary, and TaskEither does not automatically catch every rejection.

JSON parsing or `as T` checks syntax/type assertions, not runtime shape; decode unknown data using a real schema. Do not use the default-user fallback for authentication/authorization failures. Retry only transient idempotent operations, validate positive integer attempt counts and finite bounded delay, and include SDK retries/deadlines. ApplyPar starts all operations and does not cancel siblings on Left; the bulk example uses sequential tasks to avoid unbounded parallel deletion. Actual mutations still need authorization, tenant checks, idempotency and partial-success reconciliation. Do not expose raw causes, credentials or submitted password values in logs/UI. No TypeScript compilation or service operation was performed.
