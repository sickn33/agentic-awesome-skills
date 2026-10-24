# C# Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Nullable Reference Types

```csharp
// DANGEROUS: NRT is opt-in and warnings-only by default
// Project must enable: <Nullable>enable</Nullable>

string? nullable = null;
string nonNull = nullable;  // Warning, but compiles!
nonNull.Length;  // NullReferenceException at runtime

// DANGEROUS: Suppression operator
string value = possiblyNull!;  // Suppresses warning, doesn't fix bug

// DANGEROUS: Default enabled doesn't mean enforced
// Many legacy codebases have NRT enabled with thousands of warnings ignored
```

**Fix**: Enable NRT AND treat warnings as errors:
```xml
<Nullable>enable</Nullable>
<TreatWarningsAsErrors>true</TreatWarningsAsErrors>
```

## Default Struct Values

```csharp
// DANGEROUS: Structs have default(T) that may be invalid
struct Connection {
    public string Host;  // Default: null
    public int Port;     // Default: 0
}

var conn = default(Connection);
// conn.Host is null, conn.Port is 0 - probably invalid state

// DANGEROUS: Array of structs
var connections = new Connection[10];
// All 10 are default(Connection) - invalid state
```

**Fix**: Validate at use boundaries or design a valid default state; readonly and constructor validation cannot prevent default(T) or zero-initialized arrays. Use a reference type when construction must enforce an invariant.

## IDisposable Leaks

```csharp
// DANGEROUS: Resources not disposed on exception
var conn = new SqlConnection(connectionString);
conn.Open();
// Exception here = connection never closed
Process(conn);
conn.Dispose();

// DANGEROUS: Nested disposables
var outer = new Outer();  // Creates inner disposable
// Exception before outer.Dispose() = inner leaked
```

**Fix**: Use `using` statement or declaration:
```csharp
using var conn = new SqlConnection(connectionString);
conn.Open();
// Disposed even on exception

using (var conn = new SqlConnection(...)) {
    // Scoped disposal
}
```

## Async/Await Pitfalls

```csharp
// DANGEROUS: async void - exceptions can't be caught
async void FireAndForget() {
    throw new Exception("Lost!");  // Crashes the process
}

// DANGEROUS: Deadlock with .Result
async Task<int> DoWork() {
    await Task.Delay(100);
    return 1;
}

void Caller() {
    DoWork().Result;  // Deadlock in UI/ASP.NET contexts!
}

// DANGEROUS: Forgetting to await
async Task Process() {
    DoWorkAsync();  // Not awaited - runs in background
    // Exceptions lost, no completion guarantee
}
```

**Fix**: Always return Task, use `ConfigureAwait(false)` in libraries:
```csharp
async Task DoWorkAsync() {
    await Task.Delay(100).ConfigureAwait(false);
}
```

## LINQ Deferred Execution

```csharp
// DANGEROUS: LINQ queries are lazy
var query = items.Where(x => x.IsValid);
// Nothing executed yet!

items.Add(newItem);  // Added after query defined
foreach (var item in query) {
    // newItem IS included - query executes here
}

// DANGEROUS: Multiple enumeration
var filtered = items.Where(x => ExpensiveCheck(x));
var count = filtered.Count();    // Executes query
var first = filtered.First();    // Executes query AGAIN
```

**Fix**: Materialize with `.ToList()` or `.ToArray()` when needed.

## String Comparison

```csharp
// Equals and == on strings are ordinal by default; Compare/ToLower may use culture.
"stra\u00dfe".Equals("strasse");  // False with default ordinal equality

// DANGEROUS: Turkish-I problem
"INFO".ToLower() == "info"  // FALSE in Turkish culture!
// Turkish: I → ı (dotless i), İ → i

// DANGEROUS: Ordinal vs linguistic
string.Compare("a", "A");  // Culture-dependent
```

**Fix**: Use ordinal comparison for identifiers:
```csharp
string.Equals(a, b, StringComparison.Ordinal);
string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
```

## Boxing and Unboxing

```csharp
// DANGEROUS: Hidden boxing with value types
int value = 42;
object boxed = value;  // Boxing allocation
int unboxed = (int)boxed;  // Unboxing

// DANGEROUS: Interface boxing
struct Point : IComparable<Point> { ... }
IComparable<Point> comparable = point;  // Boxed!

// DANGEROUS: LINQ with value types
var ints = new[] { 1, 2, 3 };
ints.Where(x => x > 1);  // Noncapturing lambda does not inherently box each int; measure actual allocations.
```

## Equality Implementation

```csharp
// DANGEROUS: Incorrect equality implementation
class MyClass {
    public int Id;

    public override bool Equals(object obj) {
        return Id == ((MyClass)obj).Id;  // Throws if obj is null or wrong type
    }

    // DANGEROUS: Missing GetHashCode
    // Objects that are Equal MUST have same hash code
    // But: public override int GetHashCode() => ... // Missing!
}
```

**Fix**: Implement correctly or use records (C# 9+):
```csharp
record MyRecord(int Id);  // Equality implemented correctly
```

## Lock Pitfalls

```csharp
// DANGEROUS: Locking on public object
public object SyncRoot = new object();
lock (SyncRoot) { }  // External code can deadlock

// DANGEROUS: Locking on this
lock (this) { }  // External code can lock same object

// DANGEROUS: Locking on Type
lock (typeof(MyClass)) { }  // Type objects are shared across AppDomains

// DANGEROUS: Locking on string
lock ("mylock") { }  // String interning makes this shared!
```

**Fix**: Lock on private readonly object:
```csharp
private readonly object _lock = new object();
lock (_lock) { }
```

## Finalizers

```csharp
// DANGEROUS: Finalizer delays GC and can resurrect objects
class Problematic {
    ~Problematic() {
        // This code runs on finalizer thread
        // Can't access other managed objects safely
        GlobalList.Add(this);  // Resurrection!
    }
}

// DANGEROUS: Finalizer without dispose pattern
// Object stays in memory longer (finalization queue)
```

**Fix**: Implement dispose pattern, avoid finalizers:
```csharp
class Proper : IDisposable {
    private bool _disposed;

    public void Dispose() {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing) {
        if (_disposed) return;
        if (disposing) { /* managed cleanup */ }
        // unmanaged cleanup
        _disposed = true;
    }
}
```

## Event Handler Memory Leaks

```csharp
// DANGEROUS: Event handlers keep objects alive
class Publisher {
    public event EventHandler Changed;
}

class Subscriber {
    public Subscriber(Publisher pub) {
        pub.Changed += OnChanged;  // Subscriber now rooted by Publisher
        // Even if Subscriber should be collected, it won't be
    }
}
```

**Fix**: Unsubscribe in Dispose or use weak events.

## Serialization

```csharp
// DANGEROUS: BinaryFormatter is insecure
var formatter = new BinaryFormatter();
formatter.Deserialize(untrustedStream);  // RCE vulnerability

// Microsoft: "BinaryFormatter is dangerous and is not recommended"
// Similar issues with NetDataContractSerializer, SoapFormatter
```

**Fix**: Use JSON, XML with known types, or protobuf.

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `string? x = null; string y = x;` | NRT warning ignored |
| `possiblyNull!` | Null suppression |
| `new Connection[n]` for structs | Invalid default state |
| `SqlConnection` without `using` | Resource leak |
| `async void` | Unhandled exceptions |
| `.Result` or `.Wait()` on Task | Deadlock |
| Missing `await` before async call | Fire and forget |
| `.Where()` without materialization | Multiple enumeration |
| `string.Compare/ToLower` without explicit comparison policy | Culture-dependent semantics |
| `lock (this)` or `lock (typeof(...))` | Deadlock risk |
| `BinaryFormatter` | Deserialization RCE |
| Event subscription without unsubscription | Memory leak |
