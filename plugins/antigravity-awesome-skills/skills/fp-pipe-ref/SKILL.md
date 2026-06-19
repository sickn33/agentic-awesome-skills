---
name: fp-pipe-ref
description: Quick reference for pipe and flow. Use when user needs to chain functions, compose operations, or build data pipelines in fp-ts.
risk: unknown
source: community
version: 1.0.0
tags: [fp-ts, pipe, flow, composition, quick-reference]
---

# pipe & flow Quick Reference

## pipe - Transform a Value

```typescript
import { pipe } from 'fp-ts/function'

// pipe(startValue, fn1, fn2, fn3)
// = fn3(fn2(fn1(startValue)))

const result = pipe(
  '  hello world  ',
  s => s.trim(),
  s => s.toUpperCase(),
  s => s.split(' ')
)
// ['HELLO', 'WORLD']
```

## flow - Create Reusable Pipeline

```typescript
import { flow } from 'fp-ts/function'

// flow(fn1, fn2, fn3) returns a new function
const process = flow(
  (s: string) => s.trim(),
  s => s.toUpperCase(),
  s => s.split(' ')
)

process('  hello world  ') // ['HELLO', 'WORLD']
process('  foo bar  ')     // ['FOO', 'BAR']
```

## When to Use
| Use | When |
|-----|------|
| `pipe` | Transform a specific value now |
| `flow` | Create reusable transformation |

## With fp-ts Types

```typescript
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'

// Option chain
pipe(
  O.fromNullable(user),
  O.map(u => u.email),
  O.getOrElse(() => 'no email')
)

// Array chain
pipe(
  users,
  A.filter(u => u.active),
  A.map(u => u.name)
)
```

## Common Pattern

```typescript
// Data last enables partial application
const getActiveNames = flow(
  A.filter((u: User) => u.active),
  A.map(u => u.name)
)

// Reuse anywhere
getActiveNames(users1)
getActiveNames(users2)
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
