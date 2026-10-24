# Kotlin Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Platform Types from Java

```kotlin
// DANGEROUS: Java interop returns "platform types" (Type!)
val result = javaLibrary.getValue()  // Type: String! (platform type)
result.length  // NPE if Java returned null!

// Kotlin doesn't know if Java code can return null
// Platform types bypass null safety

// Even "safe" Java annotations may not be recognized:
// @NotNull in Java doesn't guarantee Kotlin sees it correctly
```

**Fix**: Explicitly declare nullability when calling Java:
```kotlin
val result: String? = javaLibrary.getValue()  // Treat as nullable
val result: String = javaLibrary.getValue()   // Throws if null
```

## Not-Null Assertion (!!)

```kotlin
// DANGEROUS: !! throws on null
val value = nullableValue!!  // KotlinNullPointerException

// Common antipattern:
val user = findUser(id)!!  // "I know it's not null"
// Famous last words

// DANGEROUS: Chained assertions
val name = user!!.profile!!.name!!  // Triple jeopardy
```

**Fix**: Use safe calls and elvis operator:
```kotlin
val value = nullableValue ?: return
val value = nullableValue ?: throw IllegalStateException("...")
val name = user?.profile?.name ?: "default"
```

## Lateinit

```kotlin
// DANGEROUS: Accessing before initialization
class MyClass {
    lateinit var config: Config

    fun process() {
        config.value  // UninitializedPropertyAccessException if not set
    }
}

// Can check with ::property.isInitialized but often forgotten
if (::config.isInitialized) {
    config.value
}
```

**Better alternatives**:
```kotlin
// Lazy initialization
val config: Config by lazy { loadConfig() }

// Nullable with check
var config: Config? = null
fun process() {
    val c = config ?: throw IllegalStateException("Not configured")
}
```

## Data Class Copy Pitfalls

```kotlin
data class User(val name: String, val role: Role)

// DANGEROUS: copy() can bypass immutability intentions
val admin = User("Alice", Role.ADMIN)
val notAdmin = admin.copy(role = Role.USER)  // Fine

// But if User validates in constructor:
data class User(val name: String, val role: Role) {
    init {
        require(name.isNotBlank()) { "Name required" }
    }
}

// Generated copy() calls the primary constructor, so init validation runs.
// The actual pitfall is a shallow copy: mutable referenced properties are shared.
```

## Companion Object Initialization

```kotlin
// DANGEROUS: Companion objects initialize lazily on first access
class MyClass {
    companion object {
        val config = loadConfig()  // When does this run?
    }
}

// First access triggers initialization
// Can cause unexpected delays or errors at runtime
// Order of initialization across classes is complex
```

## Coroutine Cancellation

```kotlin
// DANGEROUS: Not checking for cancellation
suspend fun longOperation() {
    while (true) {
        heavyComputation()  // Doesn't check cancellation
    }
}

// Cancel won't stop this coroutine!
val job = launch { longOperation() }
job.cancel()  // Coroutine keeps running

// DANGEROUS: Swallowing CancellationException
suspend fun wrapped() {
    try {
        suspendingFunction()
    } catch (e: Exception) {
        // CancellationException caught! Breaks cancellation
    }
}
```

**Fix**: Check for cancellation and rethrow CancellationException:
```kotlin
suspend fun longOperation() {
    while (true) {
        ensureActive()  // or yield()
        heavyComputation()
    }
}

catch (e: Exception) {
    if (e is CancellationException) throw e
    // handle other exceptions
}
```

## Inline Class Boxing

```kotlin
@JvmInline
value class UserId(val id: Int)

// DANGEROUS: Boxing occurs in certain contexts
fun process(id: UserId?) { }  // Nullable = boxed
fun process(id: Any) { }      // Any = boxed
val list: List<UserId>        // Generic = boxed

// Performance benefit lost, but worse:
// Two "equal" values may not be identical
```

## Scope Functions Confusion

```kotlin
// DANGEROUS: Wrong scope function leads to bugs
val user = User()
user.also {
    it.name = "Alice"
}.let {
    return it.name  // 'it' is the user, 'this' is outer scope
}

// Easy to confuse:
// let: it = receiver, returns lambda result
// also: it = receiver, returns receiver
// apply: this = receiver, returns receiver
// run: this = receiver, returns lambda result
// with: this = receiver, returns lambda result
```

## Delegation Pitfalls

```kotlin
// DANGEROUS: Property delegation evaluated lazily
class Config {
    val setting by lazy { loadExpensiveSetting() }
}

// Thread safety depends on lazy mode:
by lazy { }                           // Synchronized (safe but slow)
by lazy(LazyThreadSafetyMode.NONE) { } // Not safe!
by lazy(LazyThreadSafetyMode.PUBLICATION) { } // Safe but may compute multiple times
```

## Reified Type Erasure

```kotlin
// DANGEROUS: Inline + reified still has limits
inline fun <reified T> parse(json: String): T {
    return gson.fromJson(json, T::class.java)
}

// Works for simple types, but:
parse<List<String>>(json)  // T::class.java is just List, not List<String>
// Generic type arguments still erased
```

## Sequence vs Iterable

```kotlin
// DANGEROUS: Sequences are lazy, Iterables are eager
val list = listOf(1, 2, 3)

// Eager - filter runs on all elements immediately
list.filter { println("filter $it"); it > 1 }
    .map { println("map $it"); it * 2 }
    .first()
// Prints: filter 1, filter 2, filter 3, map 2, map 3

// Lazy - only processes needed elements
list.asSequence()
    .filter { println("filter $it"); it > 1 }
    .map { println("map $it"); it * 2 }
    .first()
// Prints: filter 1, filter 2, map 2
```

But sequences can also surprise:
```kotlin
// DANGEROUS: Sequence operations return new sequences, not results
val seq = listOf(1, 2, 3).asSequence()
    .filter { it > 1 }
    .map { it * 2 }
// Nothing executed yet! Must terminate with toList(), first(), etc.
```

## Extension Function Shadowing

```kotlin
// Members take priority over same-signature extensions; an extension may be unreachable
class MyClass {
    fun process() = "member"
}

fun MyClass.process() = "extension"  // Never called!

val obj = MyClass()
obj.process()  // "member" - members always win
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| Java interop without explicit nullability | Platform type NPE |
| `!!` assertion | Null pointer exception |
| `lateinit` without isInitialized check | Uninitialized access |
| `data class` with mutable referenced properties | copy() is shallow and shares those objects |
| `suspend fun` without ensureActive/yield | Can't cancel |
| `catch (e: Exception)` in coroutines | Swallows cancellation |
| `@JvmInline` with nullable/generic | Unexpected boxing |
| `by lazy(LazyThreadSafetyMode.NONE)` | Thread safety |
| `asSequence()` without terminal op | Nothing executes |
| Extension function same name as member | Extension never called |
