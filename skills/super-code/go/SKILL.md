---
name: go
description: "Language-specific super-code guidelines for go."
risk: safe
source: community
date_added: "2026-06-16"
---
# Go: Idiomatic Efficiency Reference

## Table of Contents
1. [Error Handling](#errors)
2. [Slices & Maps](#slices)
3. [Goroutines & Channels](#concurrency)
4. [Structs & Interfaces](#structs)
5. [Functions & Closures](#functions)
6. [Anti-patterns specific to Go](#antipatterns)

---

## 1. Error Handling {#errors}

```go
// ❌ Ignoring errors
result, _ := os.Open(path)

// ✅ — always handle; only use _ when error is provably irrelevant
result, err := os.Open(path)
if err != nil {
    return fmt.Errorf("open %s: %w", path, err)
}
```

```go
// ❌ Redundant error variable
err := doA()
if err != nil { return err }
err = doB()
if err != nil { return err }

// ✅ — each :=/:  is fine; this is idiomatic Go. Don't try to "fix" it.
// What you CAN simplify: collapsing to one-liners where the if body is a single return
if err := doA(); err != nil { return err }
if err := doB(); err != nil { return err }
```

```go
// ❌ Custom error type with no added value
type MyError struct{ msg string }
func (e MyError) Error() string { return e.msg }

// ✅ — use errors.New or fmt.Errorf unless callers need to inspect type
var ErrNotFound = errors.New("not found")
return fmt.Errorf("lookup %q: %w", key, ErrNotFound)
```

**Wrap errors with `%w` (not `%v`) so callers can use `errors.Is` / `errors.As`.**

---

## 2. Slices & Maps {#slices}

```go
// ❌ Growing a slice without pre-allocation when size is known
var result []string
for _, item := range items {
    result = append(result, item.Name)
}

// ✅
result := make([]string, 0, len(items))
for _, item := range items {
    result = append(result, item.Name)
}
```

```go
// ❌ Manual existence check before map write
if _, ok := m[key]; !ok {
    m[key] = []string{}
}
m[key] = append(m[key], value)

// ✅ — append to nil slice is valid Go
m[key] = append(m[key], value)
```

```go
// ❌ Copying a map by assignment (copies reference)
copy := original

// ✅
copy := make(map[K]V, len(original))
for k, v := range original { copy[k] = v }
```

---

## 3. Goroutines & Channels {#concurrency}

```go
// ❌ Fire-and-forget goroutine with no lifecycle
go doWork()

// ✅ — use errgroup or WaitGroup to track completion
var wg sync.WaitGroup
wg.Add(1)
go func() {
    defer wg.Done()
    doWork()
}()
wg.Wait()
```

```go
// ❌ Unbuffered channel causing unnecessary goroutine block
ch := make(chan Result)
go func() { ch <- compute() }()
result := <-ch

// ✅ — for single-result, buffered channel avoids goroutine leak if receiver exits early
ch := make(chan Result, 1)
go func() { ch <- compute() }()
result := <-ch
```

```go
// ❌ select with a busy-wait default
for {
    select {
    case v := <-ch:
        process(v)
    default:
        // spin
    }
}

// ✅ — blocking select unless you genuinely need non-blocking
for v := range ch {
    process(v)
}
```

**Use `golang.org/x/sync/errgroup` for fan-out with error collection.**

---

## 4. Structs & Interfaces {#structs}

```go
// ❌ Large interface
type Storage interface {
    Get(key string) ([]byte, error)
    Set(key string, val []byte) error
    Delete(key string) error
    List(prefix string) ([]string, error)
    // ... 10 more methods
}

// ✅ — small, composable interfaces
type Getter interface { Get(key string) ([]byte, error) }
type Setter interface { Set(key string, val []byte) error }
type Storage interface { Getter; Setter }
```

```go
// ❌ Returning concrete struct from constructor (ties callers to implementation)
func NewStore() *RedisStore { ... }

// ✅ — return interface when you have or anticipate multiple implementations
func NewStore() Storage { return &RedisStore{...} }
```

```go
// ❌ Pointer receiver for tiny value types
func (p *Point) X() float64 { return p.x }

// ✅ — value receiver for small immutable types
func (p Point) X() float64 { return p.x }
```

**Rule: pointer receiver when method mutates state OR struct is large (>3 fields of non-trivial size). Value receiver otherwise.**

---

## 5. Functions & Closures {#functions}

```go
// ❌ Named return values used just to avoid a variable declaration
func divide(a, b float64) (result float64, err error) {
    result = a / b
    return
}

// ✅ — named returns are worth it only for deferred mutation or documentation
func divide(a, b float64) (float64, error) {
    if b == 0 { return 0, errors.New("division by zero") }
    return a / b, nil
}
```

```go
// ❌ Closure capturing loop variable (classic Go bug, fixed in Go 1.22+)
// Pre-1.22: each goroutine captures the same i
for i := 0; i < n; i++ {
    go func() { use(i) }()
}

// ✅ (Go <1.22 — pass as parameter)
for i := 0; i < n; i++ {
    go func(i int) { use(i) }(i)
}
// Go 1.22+: loop variable scoped per iteration, so the original is safe
```

---

## 6. Anti-patterns specific to Go {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `if err != nil { return err }` repeated 5+ times | acceptable — it's idiomatic Go |
| `panic` for expected errors | `return err` |
| `init()` with side effects | explicit initialization in `main` or constructors |
| `interface{}` / `any` without generics | use generics (Go 1.18+) or typed interfaces |
| Mutex field not adjacent to the data it protects | put `mu` directly above the field it guards |
| Channel of channels | usually a sign of over-engineering; redesign |
| `time.Sleep` in tests | use `testing` hooks or channels for synchronization |
| Exported types with unexported fields (when fields are the whole point) | `record`-style structs with all-exported fields |
| `log.Fatal` outside `main` | return errors up the stack |


## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
