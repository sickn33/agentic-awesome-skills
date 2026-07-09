---
name: rust
description: "Language-specific super-code guidelines for rust."
risk: safe
source: community
date_added: "2026-06-16"
---
# Rust: Idiomatic Efficiency Reference

## When to Use
- Use this skill when the task matches this description: Language-specific super-code guidelines for rust.

## Table of Contents
1. [Ownership & Borrowing](#ownership)
2. [Error Handling](#errors)
3. [Iterators](#iterators)
4. [Pattern Matching](#patterns)
5. [Structs & Enums](#structs)
6. [Concurrency](#concurrency)
7. [Anti-patterns specific to Rust](#antipatterns)

---

## 1. Ownership & Borrowing {#ownership}

```rust
// ❌ Cloning to avoid thinking about lifetimes
fn get_name(user: &User) -> String {
    user.name.clone()
}

// ✅ — return a reference when the data lives long enough
fn get_name(user: &User) -> &str {
    &user.name
}
```

```rust
// ❌ Taking ownership when borrowing suffices
fn print_name(name: String) {
    println!("{name}");
}

// ✅
fn print_name(name: &str) {
    println!("{name}");
}
```

```rust
// ❌ Unnecessary .to_string() / .to_owned() in hot paths
let key = id.to_string();
map.get(&key)

// ✅ — use Borrow trait; HashMap<String, V> accepts &str as key
map.get(id)
```

**Prefer `&str` over `String` in function parameters unless the function needs to own the data.**

---

## 2. Error Handling {#errors}

```rust
// ❌ .unwrap() in production code
let file = File::open(path).unwrap();

// ✅
let file = File::open(path)
    .map_err(|e| AppError::Io { path: path.to_owned(), source: e })?;
```

```rust
// ❌ Manual match on Result for every call
match do_thing() {
    Ok(v) => v,
    Err(e) => return Err(e),
}

// ✅ — the ? operator
let v = do_thing()?;
```

```rust
// ❌ Box<dyn Error> everywhere (loses type info)
fn run() -> Result<(), Box<dyn std::error::Error>> { ... }

// ✅ — use thiserror for library errors, anyhow for application errors
use anyhow::{Context, Result};
fn run() -> Result<()> {
    do_thing().context("failed during run")?;
    Ok(())
}
```

```rust
// ❌ Separate error enum variant for every call site
enum Error { FileOpen, FileRead, Parse, Network, ... }

// ✅ — use thiserror with #[from] for automatic conversion
#[derive(thiserror::Error, Debug)]
enum Error {
    #[error("io error")] Io(#[from] std::io::Error),
    #[error("parse error")] Parse(#[from] serde_json::Error),
}
```

---

## 3. Iterators {#iterators}

```rust
// ❌ Imperative accumulation
let mut result = Vec::new();
for item in &items {
    if item.active {
        result.push(item.name.to_uppercase());
    }
}

// ✅
let result: Vec<_> = items.iter()
    .filter(|i| i.active)
    .map(|i| i.name.to_uppercase())
    .collect();
```

```rust
// ❌ Manual sum
let mut total = 0;
for order in &orders { total += order.amount; }

// ✅
let total: u64 = orders.iter().map(|o| o.amount).sum();
```

```rust
// ❌ Index-based loop
for i in 0..items.len() {
    process(&items[i]);
}

// ✅
for item in &items {
    process(item);
}
// With index:
for (i, item) in items.iter().enumerate() {
    process(i, item);
}
```

**Chain iterators lazily; only `.collect()` when you actually need a concrete collection.**

---

## 4. Pattern Matching {#patterns}

```rust
// ❌ if-let chain that should be match
if let Some(x) = opt {
    if x > 0 {
        use(x)
    }
}

// ✅
if let Some(x) = opt.filter(|&x| x > 0) {
    use(x)
}
// or match with guard:
match opt {
    Some(x) if x > 0 => use(x),
    _ => {}
}
```

```rust
// ❌ match with identical arms
match status {
    Status::Active => true,
    Status::Pending => true,
    Status::Inactive => false,
}

// ✅
matches!(status, Status::Active | Status::Pending)
```

```rust
// ❌ Destructuring in body instead of pattern
fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle(c) => { let r = c.radius; r * r * PI }
        Shape::Rect(r)   => { let w = r.width; let h = r.height; w * h }
    }
}

// ✅ — destructure in pattern
match shape {
    Shape::Circle(Circle { radius, .. }) => radius * radius * PI,
    Shape::Rect(Rect { width, height })  => width * height,
}
```

---

## 5. Structs & Enums {#structs}

```rust
// ❌ Enum variant carrying bool for binary state
enum State { Running(bool) } // true = paused?

// ✅ — explicit variants
enum State { Running, Paused, Stopped }
```

```rust
// ❌ Struct with many Option fields (stringly optional)
struct Config {
    timeout: Option<u64>,
    retries: Option<u32>,
    base_url: Option<String>,
}

// ✅ — use Default + builder pattern or #[derive(Default)] with sensible defaults
#[derive(Default)]
struct Config {
    timeout: u64,      // default 0 = no timeout
    retries: u32,      // default 0
    base_url: String,
}
```

```rust
// ❌ pub fields on a type that needs invariants
pub struct Percentage { pub value: f64 }

// ✅ — private field, constructor enforces invariant
pub struct Percentage(f64);
impl Percentage {
    pub fn new(v: f64) -> Option<Self> {
        (0.0..=100.0).contains(&v).then_some(Self(v))
    }
}
```

---

## 6. Concurrency {#concurrency}

```rust
// ❌ Arc<Mutex<T>> for read-heavy data
let data = Arc::new(Mutex::new(vec![...]));

// ✅ — RwLock for read-heavy
let data = Arc::new(RwLock::new(vec![...]));
```

```rust
// ❌ Spawning OS threads for many small tasks
for item in items {
    std::thread::spawn(|| process(item));
}

// ✅ — use rayon for CPU-bound parallel iteration
use rayon::prelude::*;
items.par_iter().for_each(|item| process(item));
```

**For async: prefer `tokio::spawn` + `JoinHandle` over manual channels for structured concurrency. Use `tokio::join!` for concurrent awaits.**

---

## 7. Anti-patterns specific to Rust {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `.clone()` to appease borrow checker | reconsider lifetime or restructure |
| `.unwrap()` in non-test code | `?` operator or explicit handling |
| `impl Trait` in return position hiding complex type | name the type or use `Box<dyn Trait>` intentionally |
| `String` parameter when `&str` suffices | `&str` for params, `String` for owned storage |
| Nested `Option<Option<T>>` | rethink the data model |
| `unsafe` block without a safety comment | always document the invariant being upheld |
| `Vec<Box<T>>` when `Vec<T>` works | avoid heap allocation inside collections unless T is unsized |
| Manual `Drop` for cleanup that `?` handles | let RAII + `?` do it |


## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
