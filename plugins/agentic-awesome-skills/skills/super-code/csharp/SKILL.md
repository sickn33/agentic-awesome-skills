---
name: csharp
description: "Language-specific super-code guidelines for csharp."
risk: safe
source: community
date_added: "2026-06-16"
---
# C#: Idiomatic Efficiency Reference

## When to Use
- Use this skill when the task matches this description: Language-specific super-code guidelines for csharp.

## Table of Contents
1. [LINQ & Collections](#linq)
2. [Null Handling](#nulls)
3. [Async/Await](#async)
4. [Records & Pattern Matching](#records)
5. [Error Handling](#errors)
6. [Resource Management](#resources)
7. [Anti-patterns specific to C#](#antipatterns)

---

## 1. LINQ & Collections {#linq}

```csharp
// ❌ Imperative accumulation
var result = new List<string>();
foreach (var item in items) {
    if (item.IsActive) result.Add(item.Name.ToUpper());
}

// ✅
var result = items
    .Where(i => i.IsActive)
    .Select(i => i.Name.ToUpper())
    .ToList();
```

```csharp
// ❌ Manual grouping
var grouped = new Dictionary<string, List<Item>>();
foreach (var item in items) {
    if (!grouped.ContainsKey(item.Category))
        grouped[item.Category] = new List<Item>();
    grouped[item.Category].Add(item);
}

// ✅
var grouped = items.GroupBy(i => i.Category)
    .ToDictionary(g => g.Key, g => g.ToList());
```

```csharp
// ❌ Checking Any() then First()
if (items.Any(i => i.IsValid)) {
    var first = items.First(i => i.IsValid);
}

// ✅
var first = items.FirstOrDefault(i => i.IsValid);
if (first is not null) { ... }
```

**Prefer method syntax for chains of 2+ operations. Query syntax is fine for complex joins.**

---

## 2. Null Handling {#nulls}

```csharp
// ❌ Nested null checks
string city = null;
if (user != null && user.Address != null) {
    city = user.Address.City;
}

// ✅
var city = user?.Address?.City;
```

```csharp
// ❌ Ternary for null fallback
var name = user != null ? user.Name : "Unknown";

// ✅
var name = user?.Name ?? "Unknown";
```

```csharp
// ❌ Null check before event invocation
if (OnChanged != null) OnChanged(this, args);

// ✅
OnChanged?.Invoke(this, args);
```

```csharp
// ❌ Throwing ArgumentNullException manually
if (name == null) throw new ArgumentNullException(nameof(name));

// ✅ (C# 10+)
ArgumentNullException.ThrowIfNull(name);
```

**Enable nullable reference types (`<Nullable>enable</Nullable>`) project-wide.**

---

## 3. Async/Await {#async}

```csharp
// ❌ Blocking on async code
var result = GetDataAsync().Result; // deadlock risk

// ✅
var result = await GetDataAsync();
```

```csharp
// ❌ async void (exceptions are unobservable)
async void OnButtonClick() { await DoWork(); }

// ✅ — async Task; only async void for event handlers that truly require it
async Task OnButtonClick() { await DoWork(); }
```

```csharp
// ❌ Sequential awaits for independent work
var a = await FetchA();
var b = await FetchB();

// ✅
var (a, b) = (await Task.WhenAll(FetchA(), FetchB())) switch
{
    var r => (r[0], r[1])
};
// or cleaner with ValueTuple:
var taskA = FetchA();
var taskB = FetchB();
var a = await taskA;
var b = await taskB;
```

```csharp
// ❌ Wrapping synchronous code in Task.Run inside a library
public Task<int> GetValue() => Task.Run(() => ComputeSync());

// ✅ — let the caller decide; expose sync method
public int GetValue() => ComputeSync();
```

**Add `ConfigureAwait(false)` in library code. Omit in app/UI code.**

---

## 4. Records & Pattern Matching {#records}

```csharp
// ❌ Manual equality, ToString, Deconstruct for data types
class Point {
    public int X { get; init; }
    public int Y { get; init; }
    // + Equals, GetHashCode, ToString...
}

// ✅ (C# 9+)
record Point(int X, int Y);
```

```csharp
// ❌ if-else chain for type checking
if (shape is Circle) {
    var c = (Circle)shape;
    return c.Radius * c.Radius * Math.PI;
} else if (shape is Rectangle) { ... }

// ✅
return shape switch {
    Circle { Radius: var r } => r * r * Math.PI,
    Rectangle { Width: var w, Height: var h } => w * h,
    _ => throw new ArgumentException($"Unknown shape: {shape}")
};
```

```csharp
// ❌ Range checking with && 
if (score >= 0 && score <= 100) { ... }

// ✅ (C# 9+)
if (score is >= 0 and <= 100) { ... }
```

---

## 5. Error Handling {#errors}

```csharp
// ❌ Catching Exception to log and swallow
try { Process(); }
catch (Exception ex) { logger.LogError(ex, "error"); }

// ✅ — catch specific, rethrow if you can't handle
try { Process(); }
catch (HttpRequestException ex) {
    throw new ServiceException("upstream failure", ex);
}
```

```csharp
// ❌ throw ex (resets stack trace)
catch (Exception ex) { throw ex; }

// ✅
catch (Exception ex) { throw; } // preserves stack trace
// or wrap: throw new AppException("context", ex);
```

```csharp
// ❌ Exceptions for flow control
try { return dict[key]; }
catch (KeyNotFoundException) { return defaultValue; }

// ✅
return dict.TryGetValue(key, out var value) ? value : defaultValue;
```

---

## 6. Resource Management {#resources}

```csharp
// ❌ Manual Dispose
var conn = new SqlConnection(cs);
conn.Open();
// ... use conn ...
conn.Dispose(); // missed on exception

// ✅
using var conn = new SqlConnection(cs);
conn.Open();
// disposed at end of scope
```

```csharp
// ❌ Verbose using block
using (var reader = new StreamReader(path)) {
    return reader.ReadToEnd();
}

// ✅ (C# 8+)
using var reader = new StreamReader(path);
return reader.ReadToEnd();
// or just: return File.ReadAllText(path);
```

---

## 7. Anti-patterns specific to C# {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `string.Format("{0}", x)` | `$"{x}"` string interpolation |
| `List<T>` as public API return | `IReadOnlyList<T>` or `IEnumerable<T>` |
| `async void` | `async Task` |
| `.Result` / `.Wait()` on Task | `await` |
| `throw ex` | `throw` (preserves stack trace) |
| Manual `IEquatable` on data types | `record` |
| `object` parameters | generics with constraints |
| `DateTime.Now` | `DateTime.UtcNow` or `DateTimeOffset` |
| Mutable public fields | properties with `{ get; set; }` or `{ get; init; }` |
| `catch (Exception) { }` (swallow all) | catch specific exceptions, rethrow unknown |
| `IDisposable` without `using` | `using` declaration |



## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
