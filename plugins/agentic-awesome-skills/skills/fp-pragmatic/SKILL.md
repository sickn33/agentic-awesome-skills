---
name: fp-pragmatic
description: A practical, jargon-free guide to functional programming - the 80/20 approach that gets results without the academic overhead
risk: critical
source: community
version: 1.0.0
author: kadu
tags:
  - fp-ts
  - functional-programming
  - typescript
  - pragmatic
  - beginner-friendly
  - best-practices
---

# Pragmatic Functional Programming

**Read this first.** This guide cuts through the academic jargon and shows you what actually matters. No category theory. No abstract nonsense. Just patterns that make your code better.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You want a pragmatic starting point for fp-ts or functional programming in TypeScript.
- The task is exploratory or educational and needs an 80/20 view of what is actually worth adopting.
- You need guidance on when FP helps and when it is better to keep code simple.

## When NOT to Use FP

Functional programming is not always the answer. Here's when to keep it simple.

### Simple Null Checks

```typescript
// Just use optional chaining - it's built into the language
const city = user?.address?.city ?? 'Unknown'

// DON'T overcomplicate it
const city = pipe(
  O.fromNullable(user),
  O.flatMap(u => O.fromNullable(u.address)),
  O.flatMap(a => O.fromNullable(a.city)),
  O.getOrElse(() => 'Unknown')
)
```

### Simple Loops

```typescript
// A for loop is fine when you need early exit or complex logic
function findFirst(items: Item[], predicate: (i: Item) => boolean): Item | null {
  for (const item of items) {
    if (predicate(item)) return item
  }
  return null
}

// DON'T force FP when it doesn't help
const result = pipe(
  items,
  A.findFirst(predicate),
  O.toNullable
)
```

### Performance-Critical Code

```typescript
// For hot paths, imperative is faster (no intermediate arrays)
function sumLarge(numbers: number[]): number {
  let sum = 0
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i]
  }
  return sum
}

// fp-ts creates intermediate structures
const sum = pipe(numbers, A.reduce(0, (acc, n) => acc + n))
```

### When Your Team Doesn't Know FP

If you're the only one who can read the code, it's not good code.

```typescript
// If your team knows this pattern
async function getUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Don't force this on them
const getUser = (id: string): TE.TaskEither<Error, User> =>
  pipe(
    TE.tryCatch(() => fetch(`/api/users/${id}`), E.toError),
    TE.flatMap(r => r.ok ? TE.right(r) : TE.left(new Error('Not found'))),
    TE.flatMap(r => TE.tryCatch(() => r.json(), E.toError))
  )
```

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
