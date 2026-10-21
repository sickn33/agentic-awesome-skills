---
name: fp-taskeither-ref
description: Quick reference for TaskEither. Use when user needs async error handling, API calls, or Promise-based operations that can fail.
risk: critical
source: community
date_added: "2026-03-06"
version: 1.0.0
tags: [fp-ts, taskeither, async, promise, error-handling, quick-reference]
---

# TaskEither Quick Reference

TaskEither = async operation that can fail. Its shape is `() => Promise<Either<E, A>>`: construction is lazy.

## When to Use
- You need a quick fp-ts reference for async operations that can fail.
- The task involves API calls, Promise wrapping, or composing asynchronous error-handling pipelines.
- You want a concise cheat sheet for `TaskEither` operators and patterns.

## Create

```typescript
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'

TE.right(value)          // Async success
TE.left(error)           // Async failure
TE.tryCatch(asyncFn, toError)  // Promise → TaskEither
TE.fromEither(either)    // Either → TaskEither
```

## Transform

```typescript
TE.map(fn)               // Transform success value
TE.mapLeft(fn)           // Transform error
TE.flatMap(fn)           // Chain (fn returns TaskEither)
TE.orElse(fn)            // Recover from error
```

## Execute

```typescript
// TaskEither is lazy - must call () to run
const result = await myTaskEither()  // Either<E, A>

// Or pattern match
await pipe(
  myTaskEither,
  TE.match(
    (err) => console.error(err),
    (val) => console.log(val)
  )
)()
```

## Common Patterns

```typescript
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'

// Wrap fetch
const fetchUser = (id: string, signal: AbortSignal) => TE.tryCatch(
  async () => {
    const response = await fetch(`/api/users/${encodeURIComponent(id)}`, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body: unknown = await response.json()
    return validateUser(body) // Application schema validator; throws on invalid data
  },
  (e) => ({ type: 'NETWORK_ERROR', message: String(e) })
)

// Chain async calls
pipe(
  fetchUser('123', signal),
  TE.flatMap(user => fetchPosts(user.id)),
  TE.map(posts => posts.length)
)

// Parallel calls
import { sequenceT } from 'fp-ts/Apply'
sequenceT(TE.ApplyPar)(
  fetchUser('1', signal),
  fetchPosts('1'),
  fetchComments('1')
)

// With recovery
pipe(
  fetchUser('123', signal),
  TE.orElse(() => TE.right(defaultUser)),
  TE.getOrElse(() => T.of(defaultUser))
)
```

## vs async/await

```typescript
// ❌ async/await - errors hidden
async function getUser(id: string) {
  try {
    const res = await fetch(`/api/users/${id}`)
    return await res.json()
  } catch (e) {
    return null  // Error info lost
  }
}

// ✅ TaskEither - errors typed and composable
const getUser = (id: string, signal: AbortSignal) => pipe(
  TE.tryCatch(() => fetch(`/api/users/${encodeURIComponent(id)}`, { signal }), toNetworkError),
  TE.flatMap(res => TE.tryCatch(async () => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return validateUser(await res.json())
  }, toParseError))
)
```

Use TaskEither when you need **typed errors** for async operations.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Reference scope

These are fp-ts 2.x fragments. Supply application variables, types, validators and imports, and check the installed version. `map` does not catch thrown exceptions. `Task` has no typed error channel; an improperly wrapped promise can still reject. Use `tryCatch` at fallible boundaries.

Supply a caller-owned timeout/abort signal and validate response schemas. Parallel application calls need bounded concurrency and authorization for their data, costs and effects; `ApplyPar` does not cancel work automatically on failure. Error callbacks must redact secrets and private payloads.

Official API: [fp-ts modules](https://gcanti.github.io/fp-ts/modules/).
