---
name: kotlin
description: "Language-specific super-code guidelines for kotlin."
risk: safe
source: community
date_added: "2026-06-16"
---
# Kotlin + Compose: Idiomatic Efficiency Reference

## Table of Contents
1. [Collections & Data Transformation](#collections)
2. [Null Safety](#null-safety)
3. [Functions & Lambdas](#functions)
4. [Classes & Objects](#classes)
5. [Coroutines & Flow](#coroutines)
6. [Compose UI](#compose)
7. [Anti-patterns specific to Kotlin](#antipatterns)

---

## 1. Collections & Data Transformation {#collections}

**Prefer scope functions and stdlib transforms over imperative loops.**

```kotlin
// ❌ Verbose
val result = mutableListOf<String>()
for (item in items) {
    if (item.isActive) {
        result.add(item.name.uppercase())
    }
}

// ✅ Idiomatic
val result = items.filter { it.isActive }.map { it.name.uppercase() }
```

```kotlin
// ❌ Manual grouping
val map = mutableMapOf<String, MutableList<Item>>()
for (item in items) {
    map.getOrPut(item.category) { mutableListOf() }.add(item)
}

// ✅
val map = items.groupBy { it.category }
```

```kotlin
// ❌ Manual fold
var total = 0
for (order in orders) total += order.amount

// ✅
val total = orders.sumOf { it.amount }
```

**Use `associate`, `associateBy`, `partition`, `flatMap`, `zip` instead of manual equivalents.**

---

## 2. Null Safety {#null-safety}

```kotlin
// ❌ Unnecessary null check when Elvis suffices
val name: String
if (user?.name != null) {
    name = user.name
} else {
    name = "Guest"
}

// ✅
val name = user?.name ?: "Guest"
```

```kotlin
// ❌ Double null check
if (response != null && response.body != null) {
    process(response.body!!)
}

// ✅
response?.body?.let { process(it) }
```

```kotlin
// ❌ !! without guard
val value = nullable!!.doSomething()

// ✅ Make the non-null contract explicit at the boundary
val value = requireNotNull(nullable) { "nullable must be set before calling X" }.doSomething()
// Or return early:
val n = nullable ?: return
```

---

## 3. Functions & Lambdas {#functions}

```kotlin
// ❌ Single-expression function with unnecessary block body
fun double(x: Int): Int {
    return x * 2
}

// ✅
fun double(x: Int) = x * 2
```

```kotlin
// ❌ Lambda capturing unused parameter
items.forEach { item -> doSomething() }

// ✅
items.forEach { doSomething() }
```

```kotlin
// ❌ Redundant with/apply nesting
val builder = Builder()
builder.setName("x")
builder.setAge(1)
val result = builder.build()

// ✅
val result = Builder().apply {
    setName("x")
    setAge(1)
}.build()
```

**Prefer `let`, `run`, `apply`, `also`, `with` over repeated receiver references — but don't nest more than 2 levels deep.**

---

## 4. Classes & Objects {#classes}

```kotlin
// ❌ Mutable class for immutable data
class Point {
    var x: Int = 0
    var y: Int = 0
}

// ✅
data class Point(val x: Int, val y: Int)
```

```kotlin
// ❌ Companion object just to hold a constant
class Foo {
    companion object {
        val TAG = "Foo"
    }
}

// ✅ — top-level if only used in this file
private const val TAG = "Foo"
class Foo
```

```kotlin
// ❌ Enum with when that has to be updated in two places
enum class Status { ACTIVE, INACTIVE }
fun label(s: Status) = when(s) { Status.ACTIVE -> "Active"; Status.INACTIVE -> "Inactive" }

// ✅ — put display logic on the enum itself
enum class Status(val label: String) { ACTIVE("Active"), INACTIVE("Inactive") }
```

**Sealed classes/interfaces over enum when variants carry different data.**

---

## 5. Coroutines & Flow {#coroutines}

```kotlin
// ❌ Unnecessary async/await pair when result is used immediately
val result = async { fetchData() }.await()

// ✅
val result = fetchData() // just suspend fun, no async needed
```

```kotlin
// ❌ Collecting in a loop
while (true) {
    val value = channel.receive()
    process(value)
}

// ✅
channel.consumeEach { process(it) }
// or for Flow:
flow.collect { process(it) }
```

```kotlin
// ❌ StateFlow + manual emit boilerplate
private val _state = MutableStateFlow(initial)
val state: StateFlow<State> = _state
// ... in many places: _state.value = newValue

// ✅ — use update{} for atomic mutation
_state.update { it.copy(field = newValue) }
```

**Don't launch coroutines in constructors or init blocks. Don't use GlobalScope.**

---

## 6. Compose UI {#compose}

```kotlin
// ❌ Unnecessary remember for derived state that's cheap to compute
val displayName = remember { user.firstName + " " + user.lastName }

// ✅ — only remember if computation is expensive or involves object creation
val displayName = "${user.firstName} ${user.lastName}"
```

```kotlin
// ❌ Passing entire state object when composable only needs one field
@Composable
fun UserBadge(user: User) { Text(user.name) }

// ✅ — pass only what's needed (stability + minimal recomposition)
@Composable
fun UserBadge(name: String) { Text(name) }
```

```kotlin
// ❌ Inline click handler lambda (creates new instance each recomposition)
Button(onClick = { viewModel.onSave() }) { ... }

// ✅
val onSave = remember { { viewModel.onSave() } }
Button(onClick = onSave) { ... }
// Or pass it down as a parameter already
```

```kotlin
// ❌ Nested Column/Row just to group children
Column {
    Column {
        Text("a")
        Text("b")
    }
}

// ✅
Column {
    Text("a")
    Text("b")
}
```

**Use `LazyColumn`/`LazyRow` for lists of unknown or large size. Never put a `LazyColumn` inside a `Column` with unbounded height.**

---

## 7. Anti-patterns specific to Kotlin {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `if (x == true)` | `if (x)` |
| `if (x == null) return else x!!` | `val x = x ?: return` |
| `listOf().toMutableList()` for a known-size list | `mutableListOf()` |
| `when` with a single branch and else | `if/else` |
| `.toString()` on a string | remove it |
| Explicit `Unit` return type on functions | omit (inferred) |
| `object : Runnable { override fun run() { ... } }` | `Runnable { ... }` (SAM) |
| `@JvmStatic` in pure Kotlin code | only needed for Java interop |
| Wrapping every function in try/catch to log | handle at the boundary, not inside |



## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
