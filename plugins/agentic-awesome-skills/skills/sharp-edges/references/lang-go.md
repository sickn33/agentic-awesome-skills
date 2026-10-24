# Go Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Silent Integer Overflow

```go
// DANGEROUS: Overflow wraps silently (no panic!)
var x int32 = math.MaxInt32
x = x + 1  // Wraps to -2147483648, no error

// Real vulnerability pattern: size calculations
func allocate(count int32, size int32) []byte {
    total := count * size  // Can overflow!
    return make([]byte, total)  // Tiny allocation
}
```

**The Problem**: Unlike Rust (debug panics), Go silently wraps. Fuzz tests need explicit overflow/property oracles; absence of a crash is not proof that arithmetic is safe.

**Detection**: Arithmetic on integer types, especially:
- Multiplication for size calculations
- Addition near max values
- Conversions between integer sizes

**Mitigation**: Use `math/bits` overflow-checking functions or check manually.

## Slice Aliasing

```go
// DANGEROUS: Slices share backing array
original := []int{1, 2, 3, 4, 5}
slice1 := original[1:3]  // {2, 3}
slice2 := original[2:4]  // {3, 4}

slice1[1] = 999  // Modifies original AND slice2!
// slice2 is now {999, 4}
// original is now {1, 2, 999, 4, 5}

// Also dangerous with append:
a := []int{1, 2, 3}
b := a[:2]         // Shares backing array
b = append(b, 4)   // May or may not reallocate
// Did this modify a[2]? Depends on capacity!
```

**Fix**: Use `copy()` to create independent slices when needed.

## Interface Nil Confusion

```go
// DANGEROUS: Typed nil vs untyped nil
var p *MyStruct = nil
var i interface{} = p

if i == nil {
    // This is FALSE!
    // i holds (type=*MyStruct, value=nil)
    // An interface is only nil if BOTH type AND value are nil
}

// Common in error handling:
func getError() error {
    var err *MyError = nil
    return err  // Returns non-nil error interface!
}

if err := getError(); err != nil {
    // Always true! Even though underlying pointer is nil
}
```

**Fix**: Return explicit `nil`, not typed nil pointers.

```go
func getError() error {
    if somethingWrong {
        return &MyError{}
    }
    return nil  // Untyped nil - interface will be nil
}
```

## JSON Decoder Pitfalls

```go
// DANGEROUS: Case-insensitive field matching
type User struct {
    Admin bool `json:"admin"`
}

// Attacker sends: {"ADMIN": true} or {"Admin": true} or {"aDmIn": true}
// ALL match the "admin" field!

// DANGEROUS: Duplicate keys - last one wins
// {"admin": false, "admin": true} → Admin = true
// Attacker can hide the true value after a false value

// DANGEROUS: Unknown fields silently ignored
type Config struct {
    Timeout int `json:"timeout"`
}
// {"timeout": 30, "timeoutt": 0} - typo silently ignored
```

**Fix**:
```go
decoder := json.NewDecoder(r.Body)
decoder.DisallowUnknownFields()  // Reject unknown fields
```

DisallowUnknownFields does not reject duplicate recognized keys or make matching case-sensitive. Add bounded decoding, duplicate-key rejection, exact field policy and a check for trailing JSON values.

## Defer in Loops

```go
// DANGEROUS: All defers execute at function end, not loop iteration
func processFiles(files []string) error {
    for _, file := range files {
        f, err := os.Open(file)
        if err != nil {
            return err
        }
        defer f.Close()  // Files stay open until function returns!
    }
    // All files open simultaneously - can exhaust file descriptors
    return nil
}

// SAFE: Use closure to scope defer
func processFiles(files []string) error {
    for _, file := range files {
        if err := func() error {
            f, err := os.Open(file)
            if err != nil {
                return err
            }
            defer f.Close()  // Closes at end of this closure
            return processFile(f)
        }(); err != nil {
            return err
        }
    }
    return nil
}
```

## Goroutine Leaks

```go
// DANGEROUS: Goroutine blocked forever
func search(query string) string {
    ch := make(chan string)
    go func() {
        ch <- slowSearch(query)  // What if nobody reads?
    }()

    select {
    case result := <-ch:
        return result
    case <-time.After(100 * time.Millisecond):
        return ""  // Timeout - goroutine blocked forever!
    }
}

// Buffered send avoids this specific abandoned-receiver leak; bound/cancel slowSearch too
func search(query string) string {
    ch := make(chan string, 1)  // Buffered - send won't block
    go func() {
        ch <- slowSearch(query)
    }()

    select {
    case result := <-ch:
        return result
    case <-time.After(100 * time.Millisecond):
        return ""  // Goroutine can still send and exit
    }
}
```

## Range Loop Variable Capture

```go
// DANGEROUS (Go < 1.22): Loop variable captured by reference
var funcs []func()
for _, v := range []int{1, 2, 3} {
    funcs = append(funcs, func() { fmt.Println(v) })
}
for _, f := range funcs {
    f()  // Prints: 3, 3, 3 (all capture same v)
}

// SAFE: Copy the variable
for _, v := range []int{1, 2, 3} {
    v := v  // Shadow with new variable
    funcs = append(funcs, func() { fmt.Println(v) })
}
```

**Note**: Per-iteration variables apply to loops declared with := in packages using Go 1.22+ language semantics (go.mod). Assignment to an already-declared variable with = still reuses it; Go 1.21 exposed a loopvar experiment.

## String/Byte Slice Conversion

```go
// DANGEROUS: String to []byte creates a copy
s := "large string..."
b := []byte(s)  // Allocates and copies

// In hot paths, this can be expensive
// But unsafe conversion has its own risks:

// VERY DANGEROUS: Unsafe conversion allows mutation
import "unsafe"
s := "immutable"
b := *(*[]byte)(unsafe.Pointer(&s))
b[0] = 'X'  // Modifies "immutable" string - UB!
// Strings are supposed to be immutable
```

## Map Concurrent Access

```go
// DANGEROUS: Maps are not goroutine-safe
m := make(map[string]int)

go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }()
// Data race! Can cause runtime panic or corruption

// SAFE: Use sync.Map or mutex
var m sync.Map
m.Store("a", 1)
```

## Error Handling Patterns

```go
// DANGEROUS: Ignoring errors
data, _ := ioutil.ReadFile(filename)  // Error ignored!

// DANGEROUS: Error shadowing
err := doSomething()
if err != nil {
    err := handleError(err)  // Shadows outer err!
    // Original err handling may be skipped
}

// DANGEROUS: Deferred error ignoring
defer file.Close()  // Close() returns error, ignored!

// SAFER:
defer func() {
    if err := file.Close(); err != nil {
        log.Printf("close failed: %v", err)
    }
}()
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `x * y` with int types | Silent overflow |
| `slice[a:b]` without copy | Aliasing |
| Returning a typed nil pointer as interface | Interface nil confusion |
| `json.Unmarshal` without DisallowUnknownFields | Field injection |
| `defer` inside `for` | Resource leak |
| `go func()` with unbuffered channel | Goroutine leak |
| Closure in loop capturing loop var | Capture bug (pre-1.22) |
| `map` access from multiple goroutines | Data race |
| `_, err :=` instead of `_, err =` | Error shadowing |
