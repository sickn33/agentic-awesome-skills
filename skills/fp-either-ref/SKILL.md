---
id: 'fp-either-ref'
name: fp-either-ref
description: Quick reference for Either type. Use when user needs error handling, validation, or operations that can fail with typed errors.
risk: critical
source: community
version: 1.0.0
tags: [fp-ts, either, error-handling, validation, quick-reference]
category: frontend-frameworks
tools:
- claude-code
author: 'emanueleodierna'
date_added: '2026-05-23'
---

# Either Quick Reference

Either = success or failure. `Right(value)` or `Left(error)`.

## When to Use
- You need a quick fp-ts reference for typed synchronous error handling.
- The task involves validation, fallible operations, or converting throwing code to `Either`.
- You want a compact cheat sheet rather than a long tutorial.

## Create

```typescript
import * as E from 'fp-ts/Either'

E.right(value)           // Success
E.left(error)            // Failure
E.fromNullable(err)(x)   // null → Left(err), else Right(x)
E.tryCatch(fn, toError)  // try/catch → Either
```

## Transform

```typescript
E.map(fn)                // Transform Right value
E.mapLeft(fn)            // Transform Left error
E.flatMap(fn)            // Chain (fn returns Either)
E.filterOrElse(pred, toErr) // Right → Left if pred fails
```

## Extract

```typescript
E.getOrElse(err => default)  // Get Right or default
E.match(onLeft, onRight)     // Pattern match
E.toUnion(either)            // E | A (loses type info)
```

## Common Patterns

```typescript
import { pipe } from 'fp-ts/function'
import * as E from 'fp-ts/Either'

// Validation
const validateEmail = (s: string): E.Either<string, string> =>
  s.includes('@') ? E.right(s) : E.left('Invalid email')

// Chain validations (stops at first error)
pipe(
  E.right({ email: 'test@example.com', age: 25 }),
  E.flatMap(d => pipe(validateEmail(d.email), E.map(() => d))),
  E.flatMap(d => d.age >= 18 ? E.right(d) : E.left('Must be 18+'))
)

// Convert throwing code
const parseJson = (s: string) => E.tryCatch(
  () => JSON.parse(s),
  (e) => `Parse error: ${e}`
)
```

## vs try/catch

```typescript
// ❌ try/catch - errors not in types
try {
  const data = JSON.parse(input)
  process(data)
} catch (e) {
  handleError(e)
}

// ✅ Either - errors explicit in types
pipe(
  E.tryCatch(() => JSON.parse(input), String),
  E.map(process),
  E.match(handleError, identity)
)
```

Use Either when **error type matters** and you want to chain operations.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

