# Rust Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Integer Overflow Behavior Differs by Build

```rust
// In debug builds: panics
// In release builds: wraps silently!
let x: u8 = std::hint::black_box(255);  // runtime value, avoiding compile-time overflow lint
let y = x + 1;  // Debug: panic! Release: y = 0

fn calculate_size(count: usize, element_size: usize) -> usize {
    count * element_size  // Panics in debug, wraps in release
}
```

**The Problem**: Behavior differs between debug and release. Bugs may only manifest in production.

**Fix**: Use explicit methods:
```rust
// Wrapping (explicitly allows overflow)
let y = x.wrapping_add(1);

// Checked (returns Option)
let y = x.checked_add(1);  // None if overflow

// Saturating (clamps to max/min)
let y = x.saturating_add(1);  // 255 if would overflow

// Overflowing (returns value + overflow flag)
let (y, overflowed) = x.overflowing_add(1);
```

## Unsafe Blocks

```rust
// Unsafe permits specific operations whose safety invariants the programmer must uphold; normal borrow/type checks still apply
unsafe {
    // Can dereference raw pointers
    let ptr: *const i32 = &42;
    let val = *ptr;

    // Can call unsafe functions
    libc::free(ptr as *mut libc::c_void);

    // Can access mutable statics
    GLOBAL_COUNTER += 1;

    // Can implement unsafe traits
}

// Real vulnerabilities from unsafe:
// - Any claimed CVE association must be checked against its primary advisory; raw pointer invariants alone do not identify a particular CVE.
// - Many FFI-related vulnerabilities
```

**Audit Focus**: Every `unsafe` block should have a SAFETY comment explaining invariants.

```rust
// GOOD: Documented safety invariants
// SAFETY: ptr is valid for reads of `len` bytes,
// properly aligned, and the memory won't be mutated
// for the lifetime 'a
unsafe { std::slice::from_raw_parts(ptr, len) }
```

## Mem::forget Skips Destructors

```rust
// DANGEROUS: Resources never cleaned up
let guard = mutex.lock().unwrap();
std::mem::forget(guard);  // Lock never released = deadlock

let file = File::open("data.txt")?;
std::mem::forget(file);  // File descriptor leaked

// Can be used to create memory unsafety with certain types
let mut vec = vec![1, 2, 3];
let ptr = vec.as_mut_ptr();
std::mem::forget(vec);  // Vec's memory leaked, but ptr still valid... maybe
```

**Note**: `mem::forget` is safe (not `unsafe`), but can cause resource leaks and logical bugs.

## Panics and Unwinding

```rust
// A Rust panic reaching a non-unwinding extern C boundary aborts under current Rust semantics
#[no_mangle]
pub extern "C" fn called_from_c() {
    panic!("oops");  // Aborts if it reaches this non-unwinding ABI boundary
}

// With panic=unwind, catch Rust unwinds before returning across FFI; panic=abort cannot be caught.
#[no_mangle]
pub extern "C" fn called_from_c() -> i32 {
    match std::panic::catch_unwind(|| {
        might_panic();
    }) {
        Ok(_) => 0,
        Err(_) => -1,
    }
}

// DANGEROUS: Panic in Drop can abort
impl Drop for MyType {
    fn drop(&mut self) {
        if something_wrong() {
            panic!("in drop");  // If already unwinding, aborts!
        }
    }
}
```

## Unwrap and Expect

```rust
// DANGEROUS: Panics on None/Err
let value = some_option.unwrap();  // Panics if None
let result = fallible_fn().unwrap();  // Panics if Err

// In libraries: propagate errors with ?
fn library_fn() -> Result<T, E> {
    let value = fallible_fn()?;  // Propagates error
    Ok(value)
}

// In binaries: use expect() with context
let config = load_config()
    .expect("failed to load config from config.toml");
```

## Interior Mutability Pitfalls

```rust
// DANGEROUS: RefCell panics at runtime on borrow violations
use std::cell::RefCell;

let cell = RefCell::new(42);
let borrow1 = cell.borrow_mut();
let borrow2 = cell.borrow_mut();  // PANIC: already borrowed

// Can happen across function calls - hard to track
fn takes_ref(cell: &RefCell<i32>) {
    let _b = cell.borrow_mut();
    other_fn(cell);  // If this also borrows_mut: panic!
}

// SAFER: Use try_borrow_mut
if let Ok(mut borrow) = cell.try_borrow_mut() {
    *borrow += 1;
}
```

## Send and Sync Misuse

```rust
// DANGEROUS: Incorrect Send/Sync implementations
struct MyWrapper(*mut SomeType);

// This is WRONG if SomeType isn't thread-safe:
unsafe impl Send for MyWrapper {}
unsafe impl Sync for MyWrapper {}

// Real vulnerability: Rc<T> is not Send/Sync for good reason
// Incorrectly marking a type as Send/Sync enables data races
```

## Lifetime Elision Surprises

```rust
// Elision follows specified rules; an unnecessarily narrow lifetime can restrict callers
impl MyStruct {
    // Elided: fn get(&self) -> &str
    // Means:  fn get<'a>(&'a self) -> &'a str
    fn get(&self) -> &str {
        &self.data
    }
}

// But what if you return something else?
impl MyStruct {
    // Valid but more restrictive than necessary: output is tied to self
    fn get_static(&self) -> &str {
        "static string"  // Actually 'static, not 'self
    }

    // RIGHT: Be explicit
    fn get_static(&self) -> &'static str {
        "static string"
    }
}
```

## Deref Coercion Confusion

```rust
// Can be confusing when method resolution happens
use std::ops::Deref;

struct Wrapper(String);
impl Deref for Wrapper {
    type Target = String;
    fn deref(&self) -> &String { &self.0 }
}

let w = Wrapper(String::from("hello"));
w.len();  // Calls String::len via Deref
w.capacity();  // Also String::capacity

// What if Wrapper has its own len()?
impl Wrapper {
    fn len(&self) -> usize { 42 }
}
w.len();  // Now calls Wrapper::len, not String::len
(*w).len();  // Explicitly calls String::len
```

## Drop Order

```rust
// Fields dropped in declaration order
struct S {
    first: A,   // Dropped first
    second: B,  // Dropped second
}

// Can cause issues if B depends on A
struct Connection {
    pool: Arc<Pool>,      // This Arc field drops first; other strong owners may keep the pool alive
    conn: PooledConn,     // Drops second; use explicit ownership, not an assumed reverse field order
}

// Fix: reorder fields, or use ManuallyDrop
```

## Macro Hygiene Gaps

```rust
// macro_rules! has hygiene gaps
macro_rules! make_var {
    ($name:ident) => {
        let $name = 42;
    }
}

make_var!(x);
println!("{}", x);  // Works - x is in scope

// Distinguish actual hygiene/namespace limits from an ordinary hygienic local binding
macro_rules! double {
    ($e:expr) => {
        { let x = $e; x + x }  // Local binding does not capture identifiers in the caller’s expression
    }
}

let x = 10;
double!(x + 1)  // Evaluates to 22: macro hygiene preserves the outer x in the supplied expression.
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `+`, `-`, `*` on integers | Overflow (release wraps) |
| `unsafe { }` | All bets off - audit carefully |
| `mem::forget()` | Resource leak, deadlock |
| `.unwrap()`, `.expect()` | Panic on None/Err |
| `RefCell::borrow_mut()` | Runtime panic on double borrow |
| `unsafe impl Send/Sync` | Potential data races |
| `extern "C" fn` without catch_unwind | Process abort if a Rust panic crosses this boundary |
| Drop impl with panic | Double panic = abort |
| Complex deref chains | Method resolution confusion |
