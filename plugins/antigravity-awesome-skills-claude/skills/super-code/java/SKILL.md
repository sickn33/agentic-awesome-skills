---
name: java
description: "Language-specific super-code guidelines for java."
risk: safe
source: community
date_added: "2026-06-16"
---
# Java: Idiomatic Efficiency Reference

## Table of Contents
1. [Streams & Collections](#streams)
2. [Optional](#optional)
3. [Records & Data Classes](#records)
4. [Switch Expressions](#switch)
5. [Concurrency](#concurrency)
6. [Error Handling](#errors)
7. [Anti-patterns specific to Java](#antipatterns)

---

## 1. Streams & Collections {#streams}

```java
// ❌ Imperative accumulation
List<String> result = new ArrayList<>();
for (Item item : items) {
    if (item.isActive()) result.add(item.getName().toUpperCase());
}

// ✅
List<String> result = items.stream()
    .filter(Item::isActive)
    .map(item -> item.getName().toUpperCase())
    .toList(); // Java 16+; use .collect(Collectors.toList()) before
```

```java
// ❌ Manual grouping
Map<String, List<Item>> grouped = new HashMap<>();
for (Item item : items) {
    grouped.computeIfAbsent(item.getCategory(), k -> new ArrayList<>()).add(item);
}

// ✅
Map<String, List<Item>> grouped = items.stream()
    .collect(Collectors.groupingBy(Item::getCategory));
```

```java
// ❌ Manual sum
int total = 0;
for (Order o : orders) total += o.getAmount();

// ✅
int total = orders.stream().mapToInt(Order::getAmount).sum();
```

**Prefer method references (`Item::isActive`) over equivalent lambdas (`item -> item.isActive()`).**

---

## 2. Optional {#optional}

```java
// ❌ Null check chain
String city = null;
if (user != null && user.getAddress() != null) {
    city = user.getAddress().getCity();
}

// ✅
String city = Optional.ofNullable(user)
    .map(User::getAddress)
    .map(Address::getCity)
    .orElse(null);
```

```java
// ❌ Optional.get() without isPresent()
String name = optional.get(); // throws if empty

// ✅
String name = optional.orElse("default");
// or: optional.orElseThrow(() -> new IllegalStateException("name required"));
```

```java
// ❌ Optional as a field or parameter (anti-pattern)
class User { private Optional<String> nickname; }

// ✅ — Optional is for return types only
class User { private String nickname; } // nullable field
public Optional<String> getNickname() { return Optional.ofNullable(nickname); }
```

---

## 3. Records & Data Classes {#records}

```java
// ❌ Manual POJO
class Point {
    private final int x, y;
    public Point(int x, int y) { this.x = x; this.y = y; }
    public int getX() { return x; }
    public int getY() { return y; }
    // + equals, hashCode, toString...
}

// ✅ (Java 16+)
record Point(int x, int y) {}
```

```java
// ❌ Builder pattern for a 2-field object
User user = new User.Builder().name("Alice").age(30).build();

// ✅ — use record or constructor directly for small objects
record User(String name, int age) {}
var user = new User("Alice", 30);
```

**Use `record` for any immutable data carrier. Keep builders only for objects with many optional fields.**

---

## 4. Switch Expressions {#switch}

```java
// ❌ Switch statement with fall-through and break
String label;
switch (status) {
    case ACTIVE: label = "Active"; break;
    case INACTIVE: label = "Inactive"; break;
    default: label = "Unknown";
}

// ✅ (Java 14+)
String label = switch (status) {
    case ACTIVE -> "Active";
    case INACTIVE -> "Inactive";
    default -> "Unknown";
};
```

```java
// ❌ instanceof + cast
if (shape instanceof Circle) {
    Circle c = (Circle) shape;
    return c.radius() * c.radius() * Math.PI;
}

// ✅ Pattern matching (Java 16+)
if (shape instanceof Circle c) {
    return c.radius() * c.radius() * Math.PI;
}
```

---

## 5. Concurrency {#concurrency}

```java
// ❌ Raw Thread creation
Thread t = new Thread(() -> doWork());
t.start();

// ✅
ExecutorService exec = Executors.newVirtualThreadPerTaskExecutor(); // Java 21
exec.submit(() -> doWork());
```

```java
// ❌ synchronized on this for fine-grained state
synchronized(this) { counter++; }

// ✅
AtomicInteger counter = new AtomicInteger();
counter.incrementAndGet();
```

**Prefer `CompletableFuture.allOf()` over blocking `.get()` chains for parallel async work.**

---

## 6. Error Handling {#errors}

```java
// ❌ Catching Exception to log and swallow
try {
    risky();
} catch (Exception e) {
    log.error("error", e);
}

// ✅ — rethrow as unchecked if you can't handle it
try {
    risky();
} catch (IOException e) {
    throw new UncheckedIOException(e);
}
```

```java
// ❌ Checked exceptions declared on every method
public void process() throws IOException, SQLException, ParseException { ... }

// ✅ — wrap at the boundary; internal methods throw unchecked
```

---

## 7. Anti-patterns specific to Java {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `new ArrayList<String>()` (Java 7+) | `new ArrayList<>()` (diamond) |
| `"string".equals(variable)` (Yoda) | `Objects.equals(variable, "string")` |
| `for (int i = 0; i < list.size(); i++)` | enhanced for or stream |
| `StringBuffer` in single-threaded code | `StringBuilder` |
| `e.printStackTrace()` | `log.error("msg", e)` |
| `null` return for "not found" | `Optional<T>` return type |
| Public fields | private + accessor, or `record` |
| Mutable `static` fields | avoid; use dependency injection |
| `instanceof` + cast without pattern matching | pattern matching (Java 16+) |


## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
