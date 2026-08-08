---
name: typescript
description: "Language-specific super-code guidelines for typescript."
risk: safe
source: community
date_added: "2026-06-16"
---
# TypeScript / JavaScript: Idiomatic Efficiency Reference

## When to Use
- Use this skill when the task matches this description: Language-specific super-code guidelines for typescript.

## Table of Contents
1. [Array & Object Operations](#arrays)
2. [Destructuring & Spread](#destructuring)
3. [Async / Promises](#async)
4. [Functions & Closures](#functions)
5. [TypeScript Types](#types)
6. [React (if applicable)](#react)
7. [Anti-patterns specific to TS/JS](#antipatterns)

---

## 1. Array & Object Operations {#arrays}

```ts
// ❌ Imperative push loop
const result: string[] = []
for (const item of items) {
    if (item.active) result.push(item.name.toUpperCase())
}

// ✅
const result = items.filter(i => i.active).map(i => i.name.toUpperCase())
```

```ts
// ❌ Manual reduce for sum
let total = 0
for (const o of orders) total += o.amount

// ✅
const total = orders.reduce((sum, o) => sum + o.amount, 0)
```

```ts
// ❌ Manual object copy + override
const updated = Object.assign({}, user)
updated.name = "Alice"

// ✅
const updated = { ...user, name: "Alice" }
```

```ts
// ❌ Existence check before property access
const city = user.address ? user.address.city : undefined

// ✅
const city = user.address?.city
```

---

## 2. Destructuring & Spread {#destructuring}

```ts
// ❌ Separate variable assignments
const name = user.name
const age = user.age

// ✅
const { name, age } = user
```

```ts
// ❌ Index access for array elements
const first = arr[0]
const second = arr[1]

// ✅
const [first, second] = arr
```

```ts
// ❌ Merging arrays with concat
const merged = a.concat(b).concat(c)

// ✅
const merged = [...a, ...b, ...c]
```

```ts
// ❌ Omitting a key by delete (mutates)
const copy = { ...obj }
delete copy.password

// ✅ — destructure to omit
const { password, ...safe } = obj
```

---

## 3. Async / Promises {#async}

```ts
// ❌ Promise chain when async/await is cleaner
fetchUser(id)
    .then(user => fetchOrders(user.id))
    .then(orders => process(orders))
    .catch(handleError)

// ✅
try {
    const user = await fetchUser(id)
    const orders = await fetchOrders(user.id)
    process(orders)
} catch (e) {
    handleError(e)
}
```

```ts
// ❌ Sequential awaits for independent operations
const user = await fetchUser(id)
const config = await fetchConfig()

// ✅ — run in parallel
const [user, config] = await Promise.all([fetchUser(id), fetchConfig()])
```

```ts
// ❌ Wrapping already-async function in new Promise
const result = await new Promise((resolve) => {
    someAsyncFn().then(resolve)
})

// ✅
const result = await someAsyncFn()
```

**Don't `await` inside a `.map()` without `Promise.all` — it sequences what should be parallel.**

---

## 4. Functions & Closures {#functions}

```ts
// ❌ Arrow function with unnecessary block body
const double = (x: number) => { return x * 2 }

// ✅
const double = (x: number) => x * 2
```

```ts
// ❌ Default parameter with if-guard
function greet(name?: string) {
    if (!name) name = "World"
    return `Hello, ${name}`
}

// ✅
function greet(name = "World") {
    return `Hello, ${name}`
}
```

```ts
// ❌ IIFE for no reason in module scope
;(function() {
    const x = compute()
    doSomething(x)
})()

// ✅ — just top-level statements in a module
const x = compute()
doSomething(x)
```

---

## 5. TypeScript Types {#types}

```ts
// ❌ Explicit return type when inference is obvious
function add(a: number, b: number): number {
    return a + b
}

// ✅ — let TS infer simple return types
function add(a: number, b: number) {
    return a + b
}
```

```ts
// ❌ any
function process(data: any) { ... }

// ✅ — use unknown + type guard, or a proper type/generic
function process<T extends Record<string, unknown>>(data: T) { ... }
```

```ts
// ❌ Redundant interface for single-use inline shape
interface UserNameProps { name: string }
function UserName({ name }: UserNameProps) { ... }

// ✅ — inline for single-use
function UserName({ name }: { name: string }) { ... }
// Extract interface when reused in 2+ places
```

```ts
// ❌ Type assertion (as) to silence a real type error
const el = document.getElementById("app") as HTMLDivElement
el.innerText = "hi" // crashes if el is null

// ✅
const el = document.getElementById("app")
if (!(el instanceof HTMLDivElement)) throw new Error("Missing #app")
el.innerText = "hi"
```

**Prefer `type` for unions/intersections/aliases; `interface` for extensible object shapes.**

---

## 6. React (if applicable) {#react}

```tsx
// ❌ Effect for derived state
const [doubled, setDoubled] = useState(0)
useEffect(() => { setDoubled(count * 2) }, [count])

// ✅ — compute during render
const doubled = count * 2
```

```tsx
// ❌ useCallback everywhere by default
const handler = useCallback(() => doSomething(id), [id])

// ✅ — only when passed to memoized child or used as effect dep
// Otherwise: const handler = () => doSomething(id)
```

```tsx
// ❌ Passing object literal as prop (new reference each render)
<Component config={{ debug: true }} />

// ✅
const config = useMemo(() => ({ debug: true }), [])
<Component config={config} />
// Or if truly static: define outside component
const CONFIG = { debug: true }
```

```tsx
// ❌ Index as key in list that can reorder/filter
items.map((item, i) => <Row key={i} {...item} />)

// ✅
items.map(item => <Row key={item.id} {...item} />)
```

---

## 7. Anti-patterns specific to TS/JS {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `== null` (loose) | `=== null` or `?? / ?.` |
| `typeof x === "undefined"` | `x === undefined` or `x == null` (when both null/undefined ok) |
| `!!x` when boolean coercion is implied | `Boolean(x)` for clarity, or just `x` in conditionals |
| `var` | `const` by default, `let` when reassigned |
| `for...in` on arrays | `for...of` or array methods |
| String template literal with no interpolation | plain string `'...'` |
| `console.log` left in production code | remove or use a logger |
| `Object.keys(obj).forEach(...)` | `for (const [k, v] of Object.entries(obj))` |
| Nested ternaries beyond 2 levels | if/else or early return |
| `try { ... } catch (e) {}` (silent swallow) | log or rethrow |



## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
