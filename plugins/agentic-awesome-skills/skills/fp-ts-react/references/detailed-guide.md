# Functional Programming in React - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Quick Reference

| Pattern | Use When |
|---------|----------|
| `Option` | Value might be missing (user not loaded yet) |
| `Either` | Operation might fail (form validation) |
| `TaskEither` | Async operation might fail (API calls) |
| `RemoteData` | Need to show loading/error/success states |
| `pipe` | Chaining multiple transformations |

---


## 1. State with Option (Maybe It's There, Maybe Not)

Use `Option` instead of `null | undefined` for clearer intent.

### Basic Pattern

```typescript
import { useState } from 'react'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

interface User {
  id: string
  name: string
  email: string
}

function UserProfile() {
  // Option says "this might not exist yet"
  const [user, setUser] = useState<O.Option<User>>(O.none)

  const handleLogin = (userData: User) => {
    setUser(O.some(userData))
  }

  const handleLogout = () => {
    setUser(O.none)
  }

  return pipe(
    user,
    O.match(
      // When there's no user
      () => <button onClick={() => handleLogin({ id: '1', name: 'Alice', email: 'alice@example.com' })}>
        Log In
      </button>,
      // When there's a user
      (u) => (
        <div>
          <p>Welcome, {u.name}!</p>
          <button onClick={handleLogout}>Log Out</button>
        </div>
      )
    )
  )
}
```

### Chaining Optional Values

```typescript
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

interface Profile {
  user: O.Option<{
    name: string
    settings: O.Option<{
      theme: string
    }>
  }>
}

function getTheme(profile: Profile): string {
  return pipe(
    profile.user,
    O.flatMap(u => u.settings),
    O.map(s => s.theme),
    O.getOrElse(() => 'light') // default
  )
}
```

---


## 2. Form Validation with Either

Either is perfect for validation: `Left` = errors, `Right` = valid data.

### Simple Form Validation

```typescript
import * as E from 'fp-ts/Either'
import * as A from 'fp-ts/Array'
import { pipe } from 'fp-ts/function'

// Validation functions return Either<ErrorMessage, ValidValue>
const validateEmail = (email: string): E.Either<string, string> =>
  email.includes('@')
    ? E.right(email)
    : E.left('Invalid email address')

const validatePassword = (password: string): E.Either<string, string> =>
  password.length >= 8
    ? E.right(password)
    : E.left('Password must be at least 8 characters')

const validateName = (name: string): E.Either<string, string> =>
  name.trim().length > 0
    ? E.right(name.trim())
    : E.left('Name is required')
```

### Collecting All Errors (Not Just First One)

```typescript
import * as E from 'fp-ts/Either'
import { sequenceS } from 'fp-ts/Apply'
import { getSemigroup } from 'fp-ts/NonEmptyArray'
import { pipe } from 'fp-ts/function'

// This collects ALL errors, not just the first one
const validateAll = sequenceS(E.getApplicativeValidation(getSemigroup<string>()))

interface SignupForm {
  name: string
  email: string
  password: string
}

interface ValidatedForm {
  name: string
  email: string
  password: string
}

function validateForm(form: SignupForm): E.Either<string[], ValidatedForm> {
  return pipe(
    validateAll({
      name: pipe(validateName(form.name), E.mapLeft(e => [e] as [string])),
      email: pipe(validateEmail(form.email), E.mapLeft(e => [e] as [string])),
      password: pipe(validatePassword(form.password), E.mapLeft(e => [e] as [string])),
    })
  )
}

// Usage in component
function SignupForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = () => {
    pipe(
      validateForm(form),
      E.match(
        (errs) => setErrors(errs),     // Show all errors
        (valid) => {
          setErrors([])
          submitToServer(valid)         // Submit valid data
        }
      )
    )
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
      <input
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Name"
      />
      <input
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        placeholder="Email"
      />
      <input
        type="password"
        value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        placeholder="Password"
      />

      {errors.length > 0 && (
        <ul style={{ color: 'red' }}>
          {errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}

      <button type="submit">Sign Up</button>
    </form>
  )
}
```

### Field-Level Errors (Better UX)

```typescript
type FieldErrors = Partial<Record<keyof SignupForm, string>>

function validateFormWithFieldErrors(form: SignupForm): E.Either<FieldErrors, ValidatedForm> {
  const errors: FieldErrors = {}

  pipe(validateName(form.name), E.mapLeft(e => { errors.name = e }))
  pipe(validateEmail(form.email), E.mapLeft(e => { errors.email = e }))
  pipe(validatePassword(form.password), E.mapLeft(e => { errors.password = e }))

  return Object.keys(errors).length > 0
    ? E.left(errors)
    : E.right({ name: form.name.trim(), email: form.email, password: form.password })
}

// In component
{errors.email && <span className="error">{errors.email}</span>}
```

---


## 3. Data Fetching with TaskEither

TaskEither = async operation that might fail. Perfect for API calls.

### Basic Fetch Hook

```typescript
import { useState, useEffect } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

// Wrap fetch in TaskEither
const fetchJson = <T,>(url: string, decode: (value: unknown) => T, signal?: AbortSignal): TE.TaskEither<Error, T> =>
  TE.tryCatch(
    async () => {
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return decode(await res.json())
    },
    (err) => err instanceof Error ? err : new Error(String(err))
  )

// Custom hook
function useFetch<T>(url: string, decode: (value: unknown) => T) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setData(null)
    setError(null)

    pipe(
      fetchJson<T>(url, decode, controller.signal),
      TE.match(
        (err) => {
          if (!active) return
          setError(err)
          setLoading(false)
        },
        (result) => {
          if (!active) return
          setData(result)
          setLoading(false)
        }
      )
    )()
    return () => { active = false; controller.abort() }
  }, [url, decode])

  return { data, error, loading }
}

// Usage
function UserList() {
  const { data, error, loading } = useFetch<User[]>('/api/users', decodeUsers) // stable runtime decoder required

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return (
    <ul>
      {data?.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  )
}
```

### Chaining API Calls

```typescript
// Fetch user, then fetch their posts
const fetchUserWithPosts = (userId: string) => pipe(
  fetchJson<User>(`/api/users/${encodeURIComponent(userId)}`, decodeUser),
  TE.flatMap(user => pipe(
    fetchJson<Post[]>(`/api/users/${encodeURIComponent(userId)}/posts`, decodePosts),
    TE.map(posts => ({ ...user, posts }))
  ))
)
```

### Parallel API Calls

```typescript
import { sequenceT } from 'fp-ts/Apply'

// Fetch multiple things at once
const fetchDashboardData = () => pipe(
  sequenceT(TE.ApplyPar)(
    fetchJson<User>('/api/user', decodeUser),
    fetchJson<Stats>('/api/stats', decodeStats),
    fetchJson<Notifications[]>('/api/notifications', decodeNotifications)
  ),
  TE.map(([user, stats, notifications]) => ({
    user,
    stats,
    notifications
  }))
)
```

---


## 4. RemoteData Pattern (The Right Way to Handle Async State)

Stop using `{ data, loading, error }` booleans. Use a proper state machine.

### The Pattern

```typescript
// RemoteData has exactly 4 states - no impossible combinations
type RemoteData<E, A> =
  | { _tag: 'NotAsked' }                    // Haven't started yet
  | { _tag: 'Loading' }                     // In progress
  | { _tag: 'Failure'; error: E }           // Failed
  | { _tag: 'Success'; data: A }            // Got it!

// Constructors
const notAsked = <E, A>(): RemoteData<E, A> => ({ _tag: 'NotAsked' })
const loading = <E, A>(): RemoteData<E, A> => ({ _tag: 'Loading' })
const failure = <E, A>(error: E): RemoteData<E, A> => ({ _tag: 'Failure', error })
const success = <E, A>(data: A): RemoteData<E, A> => ({ _tag: 'Success', data })

// Pattern match all states
function fold<E, A, R>(
  rd: RemoteData<E, A>,
  onNotAsked: () => R,
  onLoading: () => R,
  onFailure: (e: E) => R,
  onSuccess: (a: A) => R
): R {
  switch (rd._tag) {
    case 'NotAsked': return onNotAsked()
    case 'Loading': return onLoading()
    case 'Failure': return onFailure(rd.error)
    case 'Success': return onSuccess(rd.data)
  }
}
```

### Hook with RemoteData

```typescript
function useRemoteData<T>(fetchFn: () => Promise<T>) {
  const [state, setState] = useState<RemoteData<Error, T>>(notAsked())

  const execute = async () => {
    setState(loading())
    try {
      const data = await fetchFn()
      setState(success(data))
    } catch (err) {
      setState(failure(err instanceof Error ? err : new Error(String(err))))
    }
  }

  return { state, execute }
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const { state, execute } = useRemoteData(() =>
    fetch(`/api/users/${userId}`).then(r => r.json())
  )

  useEffect(() => { execute() }, [userId])

  return fold(
    state,
    () => <button onClick={execute}>Load User</button>,
    () => <Spinner />,
    (err) => <ErrorMessage message={err.message} onRetry={execute} />,
    (user) => <UserCard user={user} />
  )
}
```

### Why RemoteData Beats Booleans

```typescript
// ❌ BAD: Impossible states are possible
interface BadState {
  data: User | null
  loading: boolean
  error: Error | null
}
// Can have: { data: user, loading: true, error: someError } - what does that mean?!

// ✅ GOOD: Only valid states exist
type GoodState = RemoteData<Error, User>
// Can only be: NotAsked | Loading | Failure | Success
```

---


## 5. Referential Stability (Preventing Re-renders)

fp-ts values like `O.some(1)` create new objects each render. React sees them as "changed".

### Derived values versus stored state

```typescript
// State itself is stable until updated; the initializer expression may be recreated.
function BadComponent() {
  const [value, setValue] = useState(O.some(1))

  useEffect(() => {
    // This runs when stored state changes; useState preserves the initial value.
    console.log('value changed')
  }, [value])
}
```

### Solution 1: useMemo

```typescript
// ✅ GOOD: Memoize Option creation
function GoodComponent() {
  const [rawValue, setRawValue] = useState<number | null>(1)

  const value = useMemo(
    () => O.fromNullable(rawValue),
    [rawValue]  // Only recreate when rawValue changes
  )

  useEffect(() => {
    // Now this only runs when rawValue actually changes
    console.log('value changed')
  }, [rawValue])  // Depend on raw value, not Option
}
```

### Solution 2: fp-ts-react-stable-hooks

```bash
npm install fp-ts-react-stable-hooks
```

```typescript
import { useStableO, useStableEffect } from 'fp-ts-react-stable-hooks'
import * as O from 'fp-ts/Option'
import * as Eq from 'fp-ts/Eq'

function StableComponent() {
  // Uses fp-ts equality instead of reference equality
  const [value, setValue] = useStableO(O.some(1))

  // Effect that understands Option equality
  useStableEffect(
    () => { console.log('value changed') },
    [value],
    Eq.tuple(O.getEq(Eq.eqNumber))  // Custom equality
  )
}
```

---


## 6. Dependency Injection with Context

Use ReaderTaskEither for testable components with injected dependencies.

### Setup Dependencies

```typescript
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { createContext, useContext, ReactNode } from 'react'

// Define what services your app needs
interface AppDependencies {
  api: {
    getUser: (id: string) => Promise<User>
    updateUser: (id: string, data: Partial<User>) => Promise<User>
  }
  analytics: {
    track: (event: string, data?: object) => void
  }
}

// Create context
const DepsContext = createContext<AppDependencies | null>(null)

// Provider
function AppProvider({ deps, children }: { deps: AppDependencies; children: ReactNode }) {
  return <DepsContext.Provider value={deps}>{children}</DepsContext.Provider>
}

// Hook to use dependencies
function useDeps(): AppDependencies {
  const deps = useContext(DepsContext)
  if (!deps) throw new Error('Missing AppProvider')
  return deps
}
```

### Use in Components

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { api, analytics } = useDeps()
  const [user, setUser] = useState<RemoteData<Error, User>>(notAsked())

  useEffect(() => {
    setUser(loading())
    api.getUser(userId)
      .then(u => {
        setUser(success(u))
        analytics.track('user_viewed', { userId })
      })
      .catch(e => setUser(failure(e)))
  }, [userId, api, analytics])

  // render...
}
```

### Testing with Mock Dependencies

```typescript
const mockDeps: AppDependencies = {
  api: {
    getUser: jest.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
    updateUser: jest.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
  },
  analytics: {
    track: jest.fn(),
  },
}

test('loads user on mount', async () => {
  render(
    <AppProvider deps={mockDeps}>
      <UserProfile userId="1" />
    </AppProvider>
  )

  await screen.findByText('Test User')
  expect(mockDeps.api.getUser).toHaveBeenCalledWith('1')
})
```

---


## 7. React 19 Patterns

### use() for Promises (React 19+)

```typescript
import { use, Suspense } from 'react'

// Instead of useEffect + useState for data fetching
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)  // Suspends until resolved
  return <div>{user.name}</div>
}

// Parent provides the promise
function App({ userPromise }: { userPromise: Promise<User> }) {
  // Parent/framework cache creates a stable promise outside this client render.

  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  )
}
```

### useActionState for Forms (React 19+)

```typescript
import { useActionState } from 'react'
import * as E from 'fp-ts/Either'

interface FormState {
  errors: string[]
  success: boolean
}

async function submitForm(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const data = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  }

  // Use Either for validation
  const result = pipe(
    validateForm(data),
    E.matchW(
      (errors): Promise<FormState> => Promise.resolve({ errors, success: false }),
      async (valid) => {
        await saveToServer(valid)
        return { errors: [], success: true }
      }
    )
  )

  return result
}

function SignupForm() {
  const [state, formAction, isPending] = useActionState(submitForm, {
    errors: [],
    success: false
  })

  return (
    <form action={formAction}>
      <input name="name" type="text" />
      <input name="email" type="email" />
      <input name="password" type="password" />

      {state.errors.map(e => <p key={e} className="error">{e}</p>)}

      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Sign Up'}
      </button>
    </form>
  )
}
```

### useOptimistic for Instant Feedback (React 19+)

```typescript
import { useOptimistic } from 'react'

function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, { ...newTodo, pending: true }]
  )

  const addTodo = async (text: string) => {
    const newTodo = { id: crypto.randomUUID(), text, done: false }

    // Invoke from a React Action/formAction or startTransition; this fragment alone
    // does not establish that context. Persist then update authoritative todos in
    // the parent, handling errors/idempotency so optimistic state can reconcile.
    addOptimisticTodo(newTodo)
    await saveTodo(newTodo)
  }

  return (
    <ul>
      {optimisticTodos.map(todo => (
        <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
          {todo.text}
        </li>
      ))}
    </ul>
  )
}
```

---


## 8. Common Patterns Cheat Sheet

### Render Based on Option

```typescript
// Pattern 1: match
pipe(
  maybeUser,
  O.match(
    () => <LoginButton />,
    (user) => <UserMenu user={user} />
  )
)

// Pattern 2: fold (same as match)
O.fold(
  () => <LoginButton />,
  (user) => <UserMenu user={user} />
)(maybeUser)

// Pattern 3: getOrElse for simple defaults
const name = pipe(
  maybeUser,
  O.map(u => u.name),
  O.getOrElse(() => 'Guest')
)
```

### Render Based on Either

```typescript
pipe(
  validationResult,
  E.match(
    (errors) => <ErrorList errors={errors} />,
    (data) => <SuccessMessage data={data} />
  )
)
```

### Safe Array Rendering

```typescript
import * as A from 'fp-ts/Array'

// Get first item safely
const firstUser = pipe(
  users,
  A.head,
  O.map(user => <Featured user={user} />),
  O.getOrElse(() => <NoFeaturedUser />)
)

// Find specific item
const adminUser = pipe(
  users,
  A.findFirst(u => u.role === 'admin'),
  O.map(admin => <AdminBadge user={admin} />),
  O.toNullable  // or O.getOrElse(() => null)
)
```

### Conditional Props

```typescript
// Add props only if value exists
const modalProps = {
  isOpen: true,
  ...pipe(
    maybeTitle,
    O.map(title => ({ title })),
    O.getOrElse(() => ({}))
  )
}
```

---


## Libraries

- **[fp-ts](https://github.com/gcanti/fp-ts)** - Core library
- **[fp-ts-react-stable-hooks](https://github.com/mblink/fp-ts-react-stable-hooks)** - Stable hooks
- **[@devexperts/remote-data-ts](https://github.com/devexperts/remote-data-ts)** - RemoteData
- **[io-ts](https://github.com/gcanti/io-ts)** - Runtime type validation
- **[zod](https://github.com/colinhacks/zod)** - Schema validation (works great with fp-ts)

## Integration limits

All snippets are separate sketches, not a bundled application or compatibility test.
`decodeUser`, `decodeUsers` and other decoders must validate unknown JSON at runtime;
type parameters/casts do not do so. `submitToServer`, `saveTodo`, UI components and
test imports are application adapters, not included functions. Next.js hooks require
a client component boundary; secrets/authentication/authorization belong on the server.
The “Log In” fixture only sets local demo state and does not authenticate anyone.

The minimal `useRemoteData` and dependency-context examples omit overlapping-request
and unmount protection: add cancellation/generation guards before use (e.g. ignore A's
late response once user B is selected). Check HTTP status and decode responses there
as in the basic hook. Memoize dependency functions intentionally; do not suppress hook
dependency lint to hide stale closures. Client validation is usability only; enforce
server validation, avoid logging passwords/PII and send analytics identifiers only
with appropriate consent. Error-boundary handling is needed for rejected `use()`
promises. `useMemo` is an optimization, not a semantic re-render guarantee.
