---
name: fp-backend
description: Functional programming patterns for Node.js/Deno backend development using fp-ts, ReaderTaskEither, and functional dependency injection
risk: critical
source: community
date_added: "2026-03-06"
version: 1.0.0
author: kadu
tags:
  - fp-ts
  - typescript
  - backend
  - functional-programming
  - node
  - deno
  - dependency-injection
  - reader-task-either
---

# fp-ts Backend Patterns

Functional programming patterns for building type-safe, testable backend services using fp-ts.

## Version and execution scope

Pin fp-ts, TypeScript, framework and Prisma versions; these excerpts omit application types/helpers and do not form a compiled package. fp-ts TaskEither represents only errors wrapped by its adapters; thrown exceptions/rejected promises still require handling. Deno needs explicit npm/runtime configuration and Node APIs are not automatically portable. Validate effects and error paths against real adapters before adopting the patterns.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You are building or refactoring a Node.js or Deno backend with fp-ts.
- The task involves dependency injection, service composition, or typed backend errors with `ReaderTaskEither`.
- You need functional backend architecture patterns rather than isolated utility snippets.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
