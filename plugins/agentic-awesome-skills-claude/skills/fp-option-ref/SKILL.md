---
name: fp-option-ref
description: Quick reference for Option type. Use when user needs to handle nullable values, optional data, or wants to avoid null checks.
risk: unknown
source: community
version: 1.0.0
tags: [fp-ts, option, nullable, maybe, quick-reference]
---

# Option Quick Reference

Option = value that might not exist. `Some(value)` or `None`.

## When to Use
- You need a quick fp-ts reference for nullable or optional values.
- The task involves eliminating null checks, safe property access, or optional chaining with `Option`.
- You want a short reference card rather than a full migration guide.

## Create

```typescript
import * as O from 'fp-ts/Option'

O.some(5)              // Some(5)
O.none                 // None
O.fromNullable(x)      // null/undefined → None, else Some(x)
O.fromPredicate(x > 0)(x) // false → None, true → Some(x)
```

## Transform

```typescript
O.map(fn)              // Transform inner value
O.flatMap(fn)          // Chain Options (fn returns Option)
O.filter(predicate)    // None if predicate false
```

## Extract

```typescript
O.getOrElse(() => default)  // Get value or default
O.toNullable(opt)           // Back to T | null
O.toUndefined(opt)          // Back to T | undefined
O.match(onNone, onSome)     // Pattern match
```

## Common Patterns

```typescript
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

// Safe property access
pipe(
  O.fromNullable(user),
  O.map(u => u.profile),
  O.flatMap(p => O.fromNullable(p.avatar)),
  O.getOrElse(() => '/default-avatar.png')
)

// Array first element
import * as A from 'fp-ts/Array'
pipe(
  users,
  A.head,  // Option<User>
  O.map(u => u.name),
  O.getOrElse(() => 'No users')
)
```

## vs Nullable

```typescript
// ❌ Nullable - easy to forget checks
const name = user?.profile?.name ?? 'Guest'

// ✅ Option - explicit, composable
pipe(
  O.fromNullable(user),
  O.flatMap(u => O.fromNullable(u.profile)),
  O.map(p => p.name),
  O.getOrElse(() => 'Guest')
)
```

Use Option when you need to **chain** operations on optional values.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
