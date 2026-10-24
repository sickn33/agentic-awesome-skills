# Language-Specific Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


General programming footguns by language—not limited to cryptography.

## C / C++

### Integer Overflow is Undefined Behavior

```c
// DANGEROUS: Signed overflow is UB, compiler can optimize away checks
int x = INT_MAX;
if (x + 1 > x) {  // Compiler may assume always true (UB)
    // Overflow check optimized away!
}

// DANGEROUS: Size calculations
size_t size = user_count * sizeof(struct User);
// If user_count * sizeof overflows, allocates tiny buffer
void *buf = malloc(size);
```

**The Problem**: Signed integer overflow is undefined behavior. Compilers assume it never happens and optimize accordingly—including removing overflow checks.

### Buffer Handling

```c
// DANGEROUS: No bounds checking
char buf[64];
strcpy(buf, user_input);      // Classic overflow
sprintf(buf, "Hello %s", name); // Format + overflow
gets(buf);                     // Never use, removed in C11

// DANGEROUS: Off-by-one
char buf[64];
strncpy(buf, src, 64);        // NOT null-terminated if src >= 64!
buf[63] = '\0';               // Must do manually
```

### Format Strings

```c
// DANGEROUS: User controls format
printf(user_input);           // Format string attack
syslog(LOG_INFO, user_input); // Same problem

// SAFE: Format as literal
printf("%s", user_input);
```

### Memory Cleanup

```c
// DANGEROUS: Secrets persist
char password[64];
// ... use password ...
memset(password, 0, sizeof(password));  // May be optimized away!

// SAFER: Use explicit_bzero or volatile
explicit_bzero(password, sizeof(password));  // Won't be optimized
```

---

## Go

### Silent Integer Overflow

```go
// DANGEROUS: Overflow wraps silently (no panic!)
var x int32 = math.MaxInt32
x = x + 1  // Wraps to -2147483648, no error

// This enables vulnerabilities in:
// - Size calculations for allocations
// - Loop bounds
// - Financial calculations
```

**The Problem**: Unlike Rust (debug panics), Go silently wraps. Fuzzing may never find overflow bugs because they don't crash.

### Slice Aliasing

```go
// DANGEROUS: Slices share backing array
original := []int{1, 2, 3, 4, 5}
slice1 := original[1:3]  // {2, 3}
slice2 := original[2:4]  // {3, 4}

slice1[1] = 999  // Modifies original AND slice2!
// slice2 is now {999, 4}
```

### Interface Nil Confusion

```go
// DANGEROUS: Typed nil vs untyped nil
var p *MyStruct = nil
var i interface{} = p

if i == nil {
    // This is FALSE! i holds (type=*MyStruct, value=nil)
    // An interface is only nil if both type and value are nil
}

// Common in error handling:
func getError() error {
    var err *MyError = nil
    return err  // Returns non-nil error interface!
}
```

### JSON Field Matching

```go
// DANGEROUS: Go's JSON decoder is case-insensitive
type User struct {
    Admin bool `json:"admin"`
}

// Attacker sends: {"ADMIN": true} or {"Admin": true}
// Both match the "admin" field!

// Also: duplicate keys - last one wins
// {"admin": false, "admin": true} → Admin = true
```

**Fix**: DisallowUnknownFields rejects unknown fields, not duplicate keys or case variants; enforce a bounded exact schema separately.

### Defer in Loops

```go
// DANGEROUS: All defers execute at function end, not loop iteration
for _, file := range files {
    f, _ := os.Open(file)
    defer f.Close()  // Files stay open until function returns!
}
// Can exhaust file descriptors on large loops
```

---

## Rust

### Integer Overflow Behavior Changes

```rust
// In debug builds: panics
// In release builds: wraps silently!
let x: u8 = 255;
let y = x + 1;  // Debug: panic! Release: y = 0
```

**The Problem**: Behavior differs between debug and release. Bugs may only manifest in production.

**Fix**: Use `wrapping_*`, `checked_*`, or `saturating_*` explicitly.

### Unsafe Blocks

```rust
// DANGEROUS: Unsafe disables Rust's safety guarantees
unsafe {
    // Can create data races
    // Can dereference raw pointers
    // Can call unsafe functions
    // Can access mutable statics
}

// Common in FFI—audit all unsafe blocks carefully
```

### Mem::forget Skips Destructors

```rust
// DANGEROUS: Resources never cleaned up
let guard = Mutex::lock().unwrap();
std::mem::forget(guard);  // Lock never released = deadlock

// Also problematic for:
// - File handles
// - Memory mappings
// - Cryptographic key cleanup
```

### Unwrap Panics

```rust
// DANGEROUS: Panics on None/Err
let value = some_option.unwrap();  // Panics if None
let result = fallible_fn().unwrap();  // Panics if Err

// In libraries: propagate errors with ?
// In binaries: use expect() with message, or handle properly
```

---

## Swift

### Force Unwrapping

```swift
// DANGEROUS: Crashes on nil
let value = optionalValue!  // Runtime crash if nil

// DANGEROUS: Implicitly unwrapped optionals
var name: String!  // IUO - crashes if accessed while nil
```

### Bridge Type Surprises

```swift
// DANGEROUS: NSString/String bridging
let nsString: NSString = "hello"
let range = nsString.range(of: "é")  // UTF-16 range
let swiftString = nsString as String
// Range semantics differ between NSString (UTF-16) and String (grapheme clusters)
```

---

## Java

### Equality Confusion

```java
// DANGEROUS: Reference equality, not value equality
String a = new String("hello");
String b = new String("hello");
if (a == b) {  // FALSE - different objects
}

Integer x = 128;
Integer y = 128;
if (x == y) {  // Not guaranteed: only the minimum cache range is specified
}

Integer p = 127;
Integer q = 127;
if (p == q) {  // TRUE - cached, but misleading
}
```

### Type Erasure

```java
// DANGEROUS: Generic types erased at runtime
List<String> strings = new ArrayList<>();
List<Integer> ints = new ArrayList<>();

// At runtime, both are just "List" - no type checking
// Can cast incorrectly and get ClassCastException later

// Also: can't do runtime checks
if (obj instanceof List<String>) {  // Compile error
}
```

### Serialization

```java
// DANGEROUS: Like pickle, arbitrary code execution
ObjectInputStream ois = new ObjectInputStream(untrustedInput);
Object obj = ois.readObject();  // Executes readObject() on malicious classes

// "Gadget chains" in libraries enable RCE
// readObject invokes deserialization callbacks; merely constructing ObjectInputStream is not this complete gadget-chain example.
```

### Swallowed Exceptions

```java
// DANGEROUS: Empty catch blocks
try {
    sensitiveOperation();
} catch (Exception e) {
    // Silently swallowed - security failure masked
}
```

---

## Kotlin

### Platform Types from Java

```kotlin
// DANGEROUS: Java returns can be null, but Kotlin doesn't know
val result = javaLibrary.getValue()  // Platform type: String!
result.length  // NPE if Java returned null!

// Kotlin trusts Java's lack of nullability annotations
```

### Not-Null Assertion

```kotlin
// DANGEROUS: Throws NPE
val value = nullableValue!!  // KotlinNullPointerException if null
```

### Lateinit Pitfalls

```kotlin
// DANGEROUS: Accessing before initialization throws
lateinit var config: Config

fun process() {
    config.value  // UninitializedPropertyAccessException
}
```

---

## C#

### Nullable Reference Types Opt-In

```csharp
// DANGEROUS: NRT is opt-in, not enforced by default
// Project must enable: <Nullable>enable</Nullable>

// Even when enabled, it's warnings only by default
string? nullable = null;
string nonNull = nullable;  // Warning, not error
nonNull.Length;  // NullReferenceException at runtime
```

### Default Struct Values

```csharp
// DANGEROUS: Structs have default values that may be invalid
struct Connection {
    public string Host;  // Default: null
    public int Port;     // Default: 0
}

var conn = default(Connection);
// conn.Host is null, conn.Port is 0 - probably invalid
```

### IDisposable Leaks

```csharp
// DANGEROUS: Resources not disposed
var conn = new SqlConnection(connectionString);
conn.Open();
// Exception here = connection never closed

// SAFE: using statement
using var conn = new SqlConnection(connectionString);
conn.Open();
// Disposed even on exception
```

---

## PHP

### Type Juggling

```php
// DANGEROUS: Loose comparison (==) does type coercion
"0e123" == "0e456"  // TRUE - both are 0 in scientific notation
"0" == false        // TRUE
"" == false         // TRUE
[] == false         // TRUE
null == false       // TRUE

// Magic hash comparison
"0e462097431906509019562988736854" == "0"  // TRUE
// MD5("240610708") starts with 0e... = compares as 0

// SAFE: Strict comparison (===)
"0e123" === "0e456"  // FALSE
```

### Variable Variables and Extract

```php
// DANGEROUS: User controls variable names
$name = $_GET['name'];
$$name = $_GET['value'];  // Variable variable - arbitrary assignment

// DANGEROUS: Extract creates variables from array
extract($_POST);  // Every POST param becomes a variable
// Attacker sends: POST isAdmin=true → $isAdmin = true
```

### Unserialize

```php
// DANGEROUS: Like pickle, arbitrary object instantiation
$obj = unserialize($user_input);

// Triggers __wakeup(), __destruct() on crafted objects
// Can chain to RCE via "POP gadgets" in libraries
```

---

## JavaScript / TypeScript

### Coercion Madness

```javascript
// DANGEROUS: == coerces types unpredictably
"0" == false   // true
"" == false    // true
[] == false    // true
[] == ![]      // true (wat)

// SAFE: === for strict equality
"0" === false  // false
```

### Prototype Pollution

```javascript
// DANGEROUS: Merging untrusted objects
function merge(target, source) {
    for (let key in source) {
        target[key] = source[key];  // Includes __proto__!
    }
}

// Attacker sends: {"__proto__": {"isAdmin": true}}
merge({}, userInput);
// A shallow __proto__ assignment affects the target prototype; a recursive merge into Object.prototype can affect all objects.
({}).isAdmin  // true
```

**Fix**: Check `hasOwnProperty`, use `Object.create(null)`, or safe merge libraries.

### Regex DoS (ReDoS)

```javascript
// DANGEROUS: Catastrophic backtracking
const regex = /^(a+)+$/;
regex.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaa!");
// Exponential time - freezes the event loop

// Patterns to avoid: nested quantifiers (a+)+, (a*)*
// Overlapping alternatives: (a|a)+
```

### ParseInt Radix

```javascript
// DANGEROUS: Radix not specified
parseInt("08");   // 8 in modern JS, was 0 in old (octal)
parseInt("0x10"); // 16 - hex prefix recognized

// SAFE: Always specify radix
parseInt("08", 10);  // 8
```

---

## Python

### Mutable Default Arguments

```python
# DANGEROUS: Default is shared across calls
def append_to(item, target=[]):
    target.append(item)
    return target

append_to(1)  # [1]
append_to(2)  # [1, 2] - same list!

# SAFE: Use None sentinel
def append_to(item, target=None):
    if target is None:
        target = []
    target.append(item)
    return target
```

### Eval and Friends

```python
# DANGEROUS: Arbitrary code execution
eval(user_input)      # Executes Python expression
exec(user_input)      # Executes Python statements
compile(user_input, '', 'exec')  # Compiles for later exec

# Also via:
input()  # In Python 2, equivalent to eval(raw_input())
```

### Late Binding Closures

```python
# DANGEROUS: Closures capture variable by reference
funcs = []
for i in range(3):
    funcs.append(lambda: i)

[f() for f in funcs]  # [2, 2, 2] - all see final i

# SAFE: Capture by value with default argument
funcs = []
for i in range(3):
    funcs.append(lambda i=i: i)

[f() for f in funcs]  # [0, 1, 2]
```

### Is vs ==

```python
# DANGEROUS: 'is' checks identity, not equality
a = 256
b = 256
a is b  # True - cached small integers

a = 257
b = 257
a is b  # False - different objects!

# Same string issue:
s1 = "hello"
s2 = "hello"
s1 is s2  # True - interned

s1 = "hello world"
s2 = "hello world"
s1 is s2  # Maybe - depends on interpreter
```

---

## Ruby

### Dynamic Execution

```ruby
# DANGEROUS: Arbitrary code execution
eval(user_input)           # Executes Ruby code
send(user_input, *args)    # Calls arbitrary method
constantize(user_input)    # Gets arbitrary constant/class
public_send(user_input)    # Calls public method by name

# Rails-specific:
params[:controller].constantize  # Class injection
```

### YAML.load

```ruby
# DANGEROUS: Arbitrary object instantiation (like pickle)
YAML.load(user_input)

# Attacker sends YAML that instantiates arbitrary objects
# Can chain to RCE via "gadget" classes

# SAFE: Use safe_load
YAML.safe_load(user_input)
```

### Mass Assignment

```ruby
# DANGEROUS: All params assigned to model
User.new(params[:user])  # If params includes {admin: true}...

# Rails 4+ requires strong parameters:
params.require(:user).permit(:name, :email)  # Explicitly allowlist
```

---

## Quick Reference Table

| Language | Primary Sharp Edges |
|----------|-------------------|
| C/C++ | Integer overflow UB, buffer overflows, format strings, memory cleanup |
| Go | Silent int overflow, slice aliasing, interface nil, JSON case-insensitive |
| Rust | Debug/release overflow difference, unsafe blocks, mem::forget |
| Swift | Force unwrap, implicitly unwrapped optionals |
| Java | == vs equals, type erasure, serialization, swallowed exceptions |
| Kotlin | Platform types, !!, lateinit |
| C# | NRT opt-in, default struct values, IDisposable leaks |
| PHP | Type juggling (==), extract(), unserialize() |
| JS/TS | == coercion, prototype pollution, ReDoS, parseInt radix |
| Python | Mutable defaults, eval/exec/pickle, late binding, is vs == |
| Ruby | eval/send/constantize, YAML.load, mass assignment |
