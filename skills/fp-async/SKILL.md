---
name: fp-async
description: Practical async patterns using TaskEither - clean pipelines instead of try/catch hell, with real API examples
risk: unknown
source: community
version: 1.0.0
author: kadu
tags:
  - fp-ts
  - typescript
  - async
  - error-handling
  - practical
  - promises
  - api
  - fetch
---

# Practical Async Patterns with fp-ts

Stop writing nested try/catch blocks. Stop losing error context. Start building clean async pipelines that handle errors properly.

**TaskEither is simply an async operation that tracks success or failure.** That's it. No fancy terminology needed.

## When to Use
- You need async error handling in TypeScript with `TaskEither`.
- The task involves wrapping Promises, composing API calls, or replacing nested `try/catch` flows.
- You want practical fp-ts async patterns instead of academic explanations.

```typescript
// TaskEither<Error, User> means:
// "An async operation that either fails with Error or succeeds with User"
```

---

## 1. Wrapping Promises Safely

### The Problem: Try/Catch Everywhere

```typescript
// BEFORE: Try/catch hell
async function getUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const user = await response.json()

    try {
      const posts = await fetch(`/api/users/${userId}/posts`)
      if (!posts.ok) {
        throw new Error(`HTTP ${posts.status}`)
      }
      const postsData = await posts.json()
      return { user, posts: postsData }
    } catch (postsError) {
      // Now what? Return partial data? Rethrow? Log?
      console.error('Failed to fetch posts:', postsError)
      return { user, posts: [] }
    }
  } catch (error) {
    // Lost all context about what failed
    console.error('Something failed:', error)
    throw error
  }
}
```

### The Solution: Wrap Once, Handle Cleanly

```typescript
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

// One wrapper function - reuse everywhere
const fetchJson = <T>(url: string): TE.TaskEither<Error, T> =>
  TE.tryCatch(
    async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.json()
    },
    (error) => error instanceof Error ? error : new Error(String(error))
  )

// AFTER: Clean and composable
const getUser = (userId: string) => fetchJson<User>(`/api/users/${userId}`)
const getPosts = (userId: string) => fetchJson<Post[]>(`/api/users/${userId}/posts`)
```

### tryCatch Explained

`TE.tryCatch` takes two things:
1. An async function that might throw
2. A function to convert the thrown value into your error type

```typescript
TE.tryCatch(
  () => somePromise,           // The async work
  (thrown) => toError(thrown)  // Convert failures to your error type
)
```

### Creating Success and Failure Values

```typescript
// Wrap a value as success
const success = TE.right<Error, number>(42)

// Wrap a value as failure
const failure = TE.left<Error, number>(new Error('Nope'))

// From a nullable value (null/undefined becomes error)
const fromNullable = TE.fromNullable(new Error('Value was null'))
const result = fromNullable(maybeUser) // TaskEither<Error, User>

// From a condition
const mustBePositive = TE.fromPredicate(
  (n: number) => n > 0,
  (n) => new Error(`Expected positive, got ${n}`)
)
```

---

## 2. Chaining Async Operations

### The Problem: Callback Hell / Nested Awaits

```typescript
// BEFORE: Deeply nested, hard to follow
async function processOrder(orderId: string) {
  try {
    const order = await fetchOrder(orderId)
    if (!order) throw new Error('Order not found')

    try {
      const user = await fetchUser(order.userId)
      if (!user) throw new Error('User not found')

      try {
        const inventory = await checkInventory(order.items)
        if (!inventory.available) throw new Error('Out of stock')

        try {
          const payment = await chargePayment(user, order.total)
          if (!payment.success) throw new Error('Payment failed')

          try {
            const shipment = await createShipment(order, user)
            return { order, shipment, payment }
          } catch (e) {
            // Refund payment? Log? What's the state now?
            await refundPayment(payment.id)
            throw e
          }
        } catch (e) {
          throw e
        }
      } catch (e) {
        throw e
      }
    } catch (e) {
      throw e
    }
  } catch (e) {
    console.error('Order processing failed', e)
    throw e
  }
}
```

### The Solution: Clean Pipelines with chain

```typescript
// AFTER: Flat, readable pipeline
const processOrder = (orderId: string) =>
  pipe(
    fetchOrder(orderId),
    TE.chain(order => fetchUser(order.userId)),
    TE.chain(user =>
      pipe(
        checkInventory(order.items),
        TE.chain(inventory => chargePayment(user, order.total))
      )
    ),
    TE.chain(payment => createShipment(order, user, payment))
  )
```

### chain vs map

Use `map` when your transformation is synchronous and can't fail:

```typescript
pipe(
  fetchUser(userId),
  TE.map(user => user.name.toUpperCase())  // Just transforms the value
)
```

Use `chain` (or `flatMap`) when your transformation is async or can fail:

```typescript
pipe(
  fetchUser(userId),
  TE.chain(user => fetchOrders(user.id))  // Returns another TaskEither
)
```

### Building Context with Do Notation

When you need values from multiple steps:

```typescript
// BEFORE: Have to thread values through manually
const processOrderManual = (orderId: string) =>
  pipe(
    fetchOrder(orderId),
    TE.chain(order =>
      pipe(
        fetchUser(order.userId),
        TE.chain(user =>
          pipe(
            chargePayment(user, order.total),
            TE.map(payment => ({ order, user, payment }))
          )
        )
      )
    )
  )

// AFTER: Do notation keeps everything accessible
const processOrder = (orderId: string) =>
  pipe(
    TE.Do,
    TE.bind('order', () => fetchOrder(orderId)),
    TE.bind('user', ({ order }) => fetchUser(order.userId)),
    TE.bind('payment', ({ user, order }) => chargePayment(user, order.total)),
    TE.bind('shipment', ({ order, user }) => createShipment(order, user)),
    TE.map(({ order, payment, shipment }) => ({
      orderId: order.id,
      paymentId: payment.id,
      trackingNumber: shipment.tracking
    }))
  )
```

---

## 3. Parallel vs Sequential Execution

### When to Use Each

**Sequential** (one after another):
- When each operation depends on the previous result
- When you need to respect rate limits
- When order matters

**Parallel** (all at once):
- When operations are independent
- When you want speed
- When fetching multiple resources by ID

### Sequential Chaining

```typescript
// Operations depend on each other - must be sequential
const getUserWithOrg = (userId: string) =>
  pipe(
    fetchUser(userId),                              // First: get user
    TE.chain(user => fetchTeam(user.teamId)),      // Then: get their team
    TE.chain(team => fetchOrganization(team.orgId)) // Finally: get org
  )
```

### Parallel Execution

```typescript
import { sequenceT } from 'fp-ts/Apply'

// Independent operations - run in parallel
const getDashboardData = (userId: string) =>
  sequenceT(TE.ApplyPar)(
    fetchUser(userId),
    fetchNotifications(userId),
    fetchRecentActivity(userId)
  ) // Returns TaskEither<Error, [User, Notification[], Activity[]]>

// With destructuring:
const getDashboard = (userId: string) =>
  pipe(
    sequenceT(TE.ApplyPar)(
      fetchUser(userId),
      fetchNotifications(userId),
      fetchRecentActivity(userId)
    ),
    TE.map(([user, notifications, activities]) => ({
      user,
      notifications,
      activities,
      unreadCount: notifications.filter(n => !n.read).length
    }))
  )
```

### Parallel Array Operations

```typescript
// Fetch multiple users in parallel
const userIds = ['1', '2', '3', '4', '5']

// TE.traverseArray runs all fetches in parallel
const fetchAllUsers = pipe(
  userIds,
  TE.traverseArray(fetchUser)
) // TaskEither<Error, readonly User[]>

// Note: Fails fast - if ANY request fails, the whole thing fails
// All errors after the first are lost
```

### Parallel with Batch Control

When you need to limit concurrent requests:

```typescript
const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// Process in batches of 5 concurrent requests
const fetchUsersWithLimit = (userIds: string[]) => {
  const batches = chunk(userIds, 5)

  return pipe(
    batches,
    // Process batches sequentially
    TE.traverseArray(batch =>
      // But within each batch, run in parallel
      pipe(batch, TE.traverseArray(fetchUser))
    ),
    TE.map(results => results.flat())
  )
}
```

### Sequential When Parallel Looks Tempting

```typescript
// WRONG: This looks parallel but order might matter for DB operations
const createUserAndProfile = (userData: UserData) =>
  sequenceT(TE.ApplyPar)(
    createUser(userData),           // Creates user with ID
    createProfile(userData.profile) // Needs user ID - race condition!
  )

// RIGHT: Sequential when there's a dependency
const createUserAndProfile = (userData: UserData) =>
  pipe(
    createUser(userData),
    TE.chain(user =>
      pipe(
        createProfile(user.id, userData.profile),
        TE.map(profile => ({ user, profile }))
      )
    )
  )
```

---

## 4. Error Recovery Patterns

### Fallback to Alternative

```typescript
// Try primary API, fall back to cache
const getUserWithFallback = (userId: string) =>
  pipe(
    fetchUserFromApi(userId),
    TE.orElse(() => fetchUserFromCache(userId))
  )

// Chain multiple fallbacks
const getConfigRobust = () =>
  pipe(
    fetchRemoteConfig(),
    TE.orElse(() => loadLocalConfig()),
    TE.orElse(() => TE.right(defaultConfig))
  )
```

### Conditional Recovery

```typescript
// Only recover from specific errors
const fetchUserOrCreate = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.orElse(error =>
      error.message.includes('404') || error.message.includes('not found')
        ? createDefaultUser(userId)
        : TE.left(error)  // Re-throw other errors
    )
  )
```

### Typed Error Recovery

```typescript
type ApiError =
  | { _tag: 'NotFound'; id: string }
  | { _tag: 'NetworkError'; cause: Error }
  | { _tag: 'Unauthorized' }

const fetchUser = (id: string): TE.TaskEither<ApiError, User> =>
  TE.tryCatch(
    async () => {
      const res = await fetch(`/api/users/${id}`)
      if (res.status === 404) throw { _tag: 'NotFound', id }
      if (res.status === 401) throw { _tag: 'Unauthorized' }
      if (!res.ok) throw { _tag: 'NetworkError', cause: new Error(`HTTP ${res.status}`) }
      return res.json()
    },
    (e): ApiError =>
      typeof e === 'object' && e !== null && '_tag' in e
        ? e as ApiError
        : { _tag: 'NetworkError', cause: e instanceof Error ? e : new Error(String(e)) }
  )

// Handle specific errors differently
const getUserOrGuest = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.orElse(error => {
      switch (error._tag) {
        case 'NotFound':
          return TE.right(createGuestUser())
        case 'Unauthorized':
          return TE.left(error) // Propagate auth errors
        case 'NetworkError':
          return fetchUserFromCache(userId) // Try cache on network issues
      }
    })
  )
```

### Retry with Exponential Backoff

```typescript
import * as T from 'fp-ts/Task'

const wait = (ms: number): T.Task<void> =>
  () => new Promise(resolve => setTimeout(resolve, ms))

const retry = <E, A>(
  operation: TE.TaskEither<E, A>,
  maxAttempts: number,
  baseDelayMs: number = 1000
): TE.TaskEither<E, A> => {
  const attempt = (remaining: number, delay: number): TE.TaskEither<E, A> =>
    pipe(
      operation,
      TE.orElse(error =>
        remaining <= 1
          ? TE.left(error)
          : pipe(
              TE.fromTask(wait(delay)),
              TE.chain(() => attempt(remaining - 1, delay * 2))
            )
      )
    )

  return attempt(maxAttempts, baseDelayMs)
}

// Usage
const fetchUserWithRetry = (userId: string) =>
  retry(fetchUser(userId), 3, 1000)
  // Attempts: immediate, 1s, 2s delays between retries
```

### Default Values

```typescript
// Get value or use default (removes the error channel)
const getUsernameOrDefault = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.map(user => user.name),
    TE.getOrElse(() => T.of('Anonymous'))
  ) // Task<string> - no more error tracking

// Keep error channel but provide fallback value
const getUserWithDefault = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.orElse(() => TE.right(defaultUser))
  ) // TaskEither<Error, User> - error channel still exists but always succeeds
```

---

## 5. Real API Examples

### Complete Fetch Wrapper

```typescript
// types.ts
interface ApiError {
  code: string
  message: string
  status: number
  details?: unknown
}

// api.ts
const createApiError = (
  code: string,
  message: string,
  status: number,
  details?: unknown
): ApiError => ({ code, message, status, details })

const request = <T>(
  url: string,
  options: RequestInit = {}
): TE.TaskEither<ApiError, T> =>
  TE.tryCatch(
    async () => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw createApiError(
          body.code || 'HTTP_ERROR',
          body.message || response.statusText,
          response.status,
          body
        )
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      return response.json()
    },
    (error): ApiError => {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        return error as ApiError
      }
      return createApiError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Request failed',
        0
      )
    }
  )

// API client
const api = {
  get: <T>(url: string) => request<T>(url),

  post: <T>(url: string, body: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  put: <T>(url: string, body: unknown) =>
    request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  delete: (url: string) =>
    request<void>(url, { method: 'DELETE' }),
}

// Usage
const getUser = (id: string) => api.get<User>(`/api/users/${id}`)
const createUser = (data: CreateUserDto) => api.post<User>('/api/users', data)
const updateUser = (id: string, data: UpdateUserDto) => api.put<User>(`/api/users/${id}`, data)
const deleteUser = (id: string) => api.delete(`/api/users/${id}`)
```

### Database Operations (Prisma Example)

```typescript
import { PrismaClient, Prisma } from '@prisma/client'

type DbError =
  | { _tag: 'NotFound'; entity: string; id: string }
  | { _tag: 'UniqueViolation'; field: string }
  | { _tag: 'ConnectionError'; cause: unknown }

const prisma = new PrismaClient()

const wrapPrisma = <T>(
  operation: () => Promise<T>
): TE.TaskEither<DbError, T> =>
  TE.tryCatch(
    operation,
    (error): DbError => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const field = (error.meta?.target as string[])?.join(', ') || 'unknown'
          return { _tag: 'UniqueViolation', field }
        }
        if (error.code === 'P2025') {
          return { _tag: 'NotFound', entity: 'Record', id: 'unknown' }
        }
      }
      return { _tag: 'ConnectionError', cause: error }
    }
  )

// Repository pattern
const userRepository = {
  findById: (id: string): TE.TaskEither<DbError, User> =>
    pipe(
      wrapPrisma(() => prisma.user.findUnique({ where: { id } })),
      TE.chain(user =>
        user
          ? TE.right(user)
          : TE.left({ _tag: 'NotFound', entity: 'User', id })
      )
    ),

  findByEmail: (email: string): TE.TaskEither<DbError, User | null> =>
    wrapPrisma(() => prisma.user.findUnique({ where: { email } })),

  create: (data: CreateUserInput): TE.TaskEither<DbError, User> =>
    wrapPrisma(() => prisma.user.create({ data })),

  update: (id: string, data: UpdateUserInput): TE.TaskEither<DbError, User> =>
    wrapPrisma(() => prisma.user.update({ where: { id }, data })),

  delete: (id: string): TE.TaskEither<DbError, void> =>
    pipe(
      wrapPrisma(() => prisma.user.delete({ where: { id } })),
      TE.map(() => undefined)
    ),
}

// Service using repository
const createUserService = (input: CreateUserInput) =>
  pipe(
    // Check email doesn't exist
    userRepository.findByEmail(input.email),
    TE.chain(existing =>
      existing
        ? TE.left({ _tag: 'UniqueViolation' as const, field: 'email' })
        : TE.right(undefined)
    ),
    // Create user
    TE.chain(() => userRepository.create(input))
  )
```

### File Operations (Node.js)

```typescript
import * as fs from 'fs/promises'
import * as path from 'path'

type FileError =
  | { _tag: 'NotFound'; path: string }
  | { _tag: 'PermissionDenied'; path: string }
  | { _tag: 'IoError'; cause: unknown }

const toFileError = (error: unknown, filePath: string): FileError => {
  if (error instanceof Error) {
    if ('code' in error) {
      if (error.code === 'ENOENT') return { _tag: 'NotFound', path: filePath }
      if (error.code === 'EACCES') return { _tag: 'PermissionDenied', path: filePath }
    }
  }
  return { _tag: 'IoError', cause: error }
}

const readFile = (filePath: string): TE.TaskEither<FileError, string> =>
  TE.tryCatch(
    () => fs.readFile(filePath, 'utf-8'),
    (e) => toFileError(e, filePath)
  )

const writeFile = (filePath: string, content: string): TE.TaskEither<FileError, void> =>
  TE.tryCatch(
    () => fs.writeFile(filePath, content, 'utf-8'),
    (e) => toFileError(e, filePath)
  )

const readJson = <T>(filePath: string): TE.TaskEither<FileError | { _tag: 'ParseError'; cause: unknown }, T> =>
  pipe(
    readFile(filePath),
    TE.chain(content =>
      TE.tryCatch(
        () => Promise.resolve(JSON.parse(content)),
        (e): { _tag: 'ParseError'; cause: unknown } => ({ _tag: 'ParseError', cause: e })
      )
    )
  )

// Usage: Load config with fallback
const loadConfig = () =>
  pipe(
    readJson<Config>('./config.json'),
    TE.orElse(() => readJson<Config>('./config.default.json')),
    TE.getOrElse(() => T.of(defaultConfig))
  )
```

---

## 6. Handling Results

### Pattern Matching with fold/match

```typescript
// fold: Handle both success and failure, returns a Task (no more error channel)
const displayResult = pipe(
  fetchUser(userId),
  TE.fold(
    (error) => T.of(`Error: ${error.message}`),
    (user) => T.of(`Welcome, ${user.name}!`)
  )
) // Task<string>

// Execute and get the string
const message = await displayResult()
```

### Getting the Raw Either

```typescript
// Sometimes you need to work with the Either directly
const result = await fetchUser(userId)() // Either<Error, User>

if (E.isLeft(result)) {
  console.error('Failed:', result.left)
} else {
  console.log('User:', result.right)
}
```

### In Express/Hono Handlers

```typescript
// Express
app.get('/users/:id', async (req, res) => {
  const result = await pipe(
    fetchUser(req.params.id),
    TE.fold(
      (error) => T.of({ status: 500, body: { error: error.message } }),
      (user) => T.of({ status: 200, body: user })
    )
  )()

  res.status(result.status).json(result.body)
})

// Cleaner with a helper
const sendResult = <E, A>(
  res: Response,
  te: TE.TaskEither<E, A>,
  errorStatus: number = 500
) =>
  pipe(
    te,
    TE.fold(
      (error) => T.of(res.status(errorStatus).json({ error })),
      (data) => T.of(res.json(data))
    )
  )()

app.get('/users/:id', async (req, res) => {
  await sendResult(res, fetchUser(req.params.id), 404)
})
```

---

## 7. Common Patterns Reference

### Quick Transformations

```typescript
// Transform success value
TE.map(user => user.name)

// Transform error
TE.mapLeft(error => ({ ...error, timestamp: Date.now() }))

// Transform both at once
TE.bimap(
  error => enhanceError(error),
  user => user.profile
)
```

### Filtering

```typescript
// Fail if condition not met
pipe(
  fetchUser(userId),
  TE.filterOrElse(
    user => user.isActive,
    user => new Error(`User ${user.id} is not active`)
  )
)
```

### Side Effects Without Changing Value

```typescript
// Log on success, keep the value unchanged
pipe(
  fetchUser(userId),
  TE.tap(user => TE.fromIO(() => console.log(`Fetched user: ${user.id}`)))
)

// Log on error, keep the error unchanged
pipe(
  fetchUser(userId),
  TE.tapError(error => TE.fromIO(() => console.error(`Failed: ${error.message}`)))
)

// chainFirst is like tap but for operations that return TaskEither
pipe(
  createUser(userData),
  TE.chainFirst(user => sendWelcomeEmail(user.email))
) // Returns the created user, not the email result
```

### Converting From Other Types

```typescript
// From Either
const fromEither = TE.fromEither(E.right(42))

// From Option
import * as O from 'fp-ts/Option'
const fromOption = TE.fromOption(() => new Error('Value was None'))
const result = fromOption(O.some(42))

// From boolean
const fromBoolean = TE.fromPredicate(
  (x: number) => x > 0,
  () => new Error('Must be positive')
)
```

---

## Quick Reference Card

| What you want | How to do it |
|---------------|--------------|
| Wrap a promise | `TE.tryCatch(() => promise, toError)` |
| Create success | `TE.right(value)` |
| Create failure | `TE.left(error)` |
| Transform value | `TE.map(fn)` |
| Transform error | `TE.mapLeft(fn)` |
| Chain async ops | `TE.chain(fn)` or `TE.flatMap(fn)` |
| Run in parallel | `sequenceT(TE.ApplyPar)(te1, te2, te3)` |
| Array in parallel | `TE.traverseArray(fn)(items)` |
| Recover from error | `TE.orElse(fn)` |
| Use default value | `TE.getOrElse(() => T.of(default))` |
| Handle both cases | `TE.fold(onError, onSuccess)` |
| Build up context | `TE.Do` + `TE.bind('name', () => te)` |
| Log without changing | `TE.tap(fn)` |
| Filter with error | `TE.filterOrElse(pred, toError)` |

---

## Before/After Summary

### Fetching Data

```typescript
// BEFORE
async function getUser(id: string) {
  try {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) throw new Error('Not found')
    return await res.json()
  } catch (e) {
    console.error(e)
    return null
  }
}

// AFTER
const getUser = (id: string) =>
  TE.tryCatch(
    async () => {
      const res = await fetch(`/api/users/${id}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
    E.toError
  )
```

### Chained Operations

```typescript
// BEFORE
async function processOrder(orderId: string) {
  const order = await fetchOrder(orderId)
  if (!order) throw new Error('No order')
  const user = await fetchUser(order.userId)
  if (!user) throw new Error('No user')
  const result = await chargePayment(user, order.total)
  return result
}

// AFTER
const processOrder = (orderId: string) =>
  pipe(
    TE.Do,
    TE.bind('order', () => fetchOrder(orderId)),
    TE.bind('user', ({ order }) => fetchUser(order.userId)),
    TE.chain(({ user, order }) => chargePayment(user, order.total))
  )
```

### Error Recovery

```typescript
// BEFORE
async function getData(id: string) {
  try {
    return await fetchFromApi(id)
  } catch {
    try {
      return await fetchFromCache(id)
    } catch {
      return defaultValue
    }
  }
}

// AFTER
const getData = (id: string) =>
  pipe(
    fetchFromApi(id),
    TE.orElse(() => fetchFromCache(id)),
    TE.getOrElse(() => T.of(defaultValue))
  )
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
