---
name: swift
description: "Language-specific super-code guidelines for swift."
risk: safe
source: community
date_added: "2026-06-16"
---
# Swift: Idiomatic Efficiency Reference

## Table of Contents
1. [Optionals](#optionals)
2. [Collections & Functional Transforms](#collections)
3. [Value vs Reference Types](#value-types)
4. [Error Handling](#errors)
5. [Concurrency](#concurrency)
6. [Protocol-Oriented Design](#protocols)
7. [Anti-patterns specific to Swift](#antipatterns)

---

## 1. Optionals {#optionals}

```swift
// ❌ Force unwrap
let name = user.name!

// ✅ — guard or if-let
guard let name = user.name else { return }
```

```swift
// ❌ Nested if-let pyramid
if let user = fetchUser() {
    if let address = user.address {
        if let city = address.city {
            display(city)
        }
    }
}

// ✅ — chained optional binding
if let city = fetchUser()?.address?.city {
    display(city)
}
// or guard-let for early exit
guard let city = fetchUser()?.address?.city else { return }
display(city)
```

```swift
// ❌ Ternary for default
let name = user.name != nil ? user.name! : "Unknown"

// ✅
let name = user.name ?? "Unknown"
```

```swift
// ❌ Optional map when if-let is clearer for side effects
user.name.map { display($0) }

// ✅ — map for transforms, if-let for side effects
let upper = user.name.map { $0.uppercased() }
if let name = user.name { display(name) }
```

---

## 2. Collections & Functional Transforms {#collections}

```swift
// ❌ Imperative filter + map
var result: [String] = []
for item in items {
    if item.isActive { result.append(item.name.uppercased()) }
}

// ✅
let result = items
    .filter(\.isActive)
    .map { $0.name.uppercased() }
```

```swift
// ❌ Manual dictionary construction
var dict: [String: User] = [:]
for user in users { dict[user.id] = user }

// ✅
let dict = Dictionary(uniqueKeysWithValues: users.map { ($0.id, $0) })
// or with possible duplicates:
let dict = Dictionary(grouping: users, by: \.department)
```

```swift
// ❌ Checking isEmpty then accessing first
if !items.isEmpty { process(items[0]) }

// ✅
if let first = items.first { process(first) }
```

```swift
// ❌ Index-based loop
for i in 0..<items.count { process(items[i]) }

// ✅
for item in items { process(item) }
// with index:
for (i, item) in items.enumerated() { process(i, item) }
```

**Use key paths (`\.isActive`) as closure shorthand where supported.**

---

## 3. Value vs Reference Types {#value-types}

```swift
// ❌ Class for plain data (reference semantics where value semantics suffice)
class Point {
    var x: Double
    var y: Double
    init(x: Double, y: Double) { self.x = x; self.y = y }
}

// ✅
struct Point { var x, y: Double }
```

```swift
// ❌ Large struct copied repeatedly (performance hit)
struct HugeData { var buffer: [UInt8] /* thousands of elements */ }
func process(_ data: HugeData) { ... } // copies entire buffer

// ✅ — use class or pass inout for mutation
func process(_ data: inout HugeData) { ... }
// or use copy-on-write wrapper for large value types
```

**Default to `struct`. Use `class` when you need identity, inheritance, or reference semantics.**

---

## 4. Error Handling {#errors}

```swift
// ❌ Using optionals to mask errors
func parse(_ input: String) -> Data? { ... } // caller doesn't know why it failed

// ✅
func parse(_ input: String) throws -> Data { ... }
```

```swift
// ❌ try! in production code
let data = try! JSONDecoder().decode(User.self, from: jsonData)

// ✅
do {
    let data = try JSONDecoder().decode(User.self, from: jsonData)
} catch {
    logger.error("decode failed: \(error)")
    throw AppError.decodingFailed(underlying: error)
}
```

```swift
// ❌ Generic Error type
enum AppError: Error { case generic(String) }

// ✅ — specific, actionable error cases
enum AppError: Error {
    case networkUnreachable
    case invalidInput(field: String, reason: String)
    case unauthorized
}
```

```swift
// ❌ Catching all errors and ignoring
do { try riskyOperation() } catch { }

// ✅
do {
    try riskyOperation()
} catch let error as NetworkError {
    handleNetworkError(error)
} catch {
    throw error // rethrow unknown
}
```

---

## 5. Concurrency {#concurrency}

```swift
// ❌ Callback-based async (pyramid of doom)
fetchUser { user in
    fetchPosts(for: user) { posts in
        fetchComments(for: posts.first!) { comments in
            display(comments)
        }
    }
}

// ✅ (Swift 5.5+)
let user = try await fetchUser()
let posts = try await fetchPosts(for: user)
let comments = try await fetchComments(for: posts[0])
display(comments)
```

```swift
// ❌ Sequential awaits for independent work
let a = try await fetchA()
let b = try await fetchB()

// ✅
async let a = fetchA()
async let b = fetchB()
let (resultA, resultB) = try await (a, b)
```

```swift
// ❌ DispatchQueue.main.async for UI updates in async context
DispatchQueue.main.async { label.text = result }

// ✅
await MainActor.run { label.text = result }
// or mark the function/class @MainActor
```

**Use `actor` for mutable shared state instead of manual locks/queues.**

---

## 6. Protocol-Oriented Design {#protocols}

```swift
// ❌ Deep class inheritance hierarchy
class Animal { ... }
class Dog: Animal { ... }
class GuideDog: Dog { ... }

// ✅ — protocols + composition
protocol Animal { var name: String { get } }
protocol Trainable { func train() }
struct Dog: Animal, Trainable { ... }
```

```swift
// ❌ Protocol with default implementations for everything
protocol Renderable {
    func render()
}
extension Renderable {
    func render() { /* default */ }
}
// Every conformer uses default — protocol serves no purpose

// ✅ — only default implementations that provide genuine shared logic
```

```swift
// ❌ Associated type when generic parameter suffices
protocol Container {
    associatedtype Element
    func get() -> Element
}

// ✅ — use `some` or generic parameter for simple cases
func process(_ item: some Equatable) { ... }
```

---

## 7. Anti-patterns specific to Swift {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| Force unwrap `!` in production code | `guard let` / `if let` / `??` |
| `try!` outside tests | `do/catch` |
| `class` for plain data | `struct` |
| Deep inheritance hierarchies | protocol composition |
| `@objc` when pure Swift works | native Swift types |
| `NSArray` / `NSDictionary` | `Array` / `Dictionary` |
| `DispatchQueue` in async/await code | `actor` / `MainActor` |
| Implicitly unwrapped optionals as fields | regular optionals or non-optional with init |
| `Any` / `AnyObject` everywhere | generics with protocol constraints |
| Massive `switch` over string values | enum with raw values |
| Singleton pattern (global mutable state) | dependency injection |


