# Memory Safety Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Memory Safety Patterns

Cross-language patterns for memory-safe programming including RAII, ownership, smart pointers, and resource management.

## When to Use This Skill

- Writing memory-safe systems code
- Managing resources (files, sockets, memory)
- Preventing use-after-free and leaks
- Implementing RAII patterns
- Choosing between languages for safety
- Debugging memory issues

## Core Concepts

### 1. Memory Bug Categories

| Bug Type | Description | Prevention |
|----------|-------------|------------|
| **Use-after-free** | Access freed memory | Ownership, RAII |
| **Double-free** | Free same memory twice | Smart pointers |
| **Memory leak** | Never free memory | RAII, GC |
| **Buffer overflow** | Write past buffer end | Bounds checking |
| **Dangling pointer** | Pointer to freed memory | Lifetime tracking |
| **Data race** | Concurrent unsynchronized access | Ownership, Sync |

### 2. Safety Spectrum

```
Manual (C) → Smart Pointers (C++) → Ownership (Rust) → GC (Go, Java)
Less safe                                              More safe
More control                                           Less control
```

## Patterns by Language

### Pattern 1: RAII in C++

```cpp
// RAII: Resource Acquisition Is Initialization
// Resource lifetime tied to object lifetime

#include <memory>
#include <fstream>
#include <mutex>

// File handle with RAII
class FileHandle {
public:
    explicit FileHandle(const std::string& path)
        : file_(path) {
        if (!file_.is_open()) {
            throw std::runtime_error("Failed to open file");
        }
    }

    // Destructor automatically closes file
    ~FileHandle() = default; // fstream closes in its destructor

    // Delete copy (prevent double-close)
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;

    // Allow move
    FileHandle(FileHandle&&) = default;
    FileHandle& operator=(FileHandle&&) = default;

    void write(const std::string& data) {
        file_ << data;
    }

private:
    std::fstream file_;
};

// Lock guard (RAII for mutexes)
class Database {
public:
    void update(const std::string& key, const std::string& value) {
        std::lock_guard<std::mutex> lock(mutex_); // Released on scope exit
        data_[key] = value;
    }

    std::string get(const std::string& key) {
        std::shared_lock<std::shared_mutex> lock(shared_mutex_);
        return data_[key];
    }

private:
    std::mutex mutex_;
    std::shared_mutex shared_mutex_;
    std::map<std::string, std::string> data_;
};

// Transaction with rollback (RAII)
template<typename T>
class Transaction {
public:
    explicit Transaction(T& target)
        : target_(target), backup_(target), committed_(false) {}

    ~Transaction() {
        if (!committed_) {
            target_ = backup_; // Rollback
        }
    }

    void commit() { committed_ = true; }

    T& get() { return target_; }

private:
    T& target_;
    T backup_;
    bool committed_;
};
```

### Pattern 2: Smart Pointers in C++

```cpp
#include <memory>

// unique_ptr: Single ownership
class Engine {
public:
    void start() { /* ... */ }
};

class Car {
public:
    Car() : engine_(std::make_unique<Engine>()) {}

    void start() {
        engine_->start();
    }

    // Transfer ownership
    std::unique_ptr<Engine> extractEngine() {
        return std::move(engine_);
    }

private:
    std::unique_ptr<Engine> engine_;
};

// shared_ptr: Shared ownership
class Node {
public:
    std::string data;
    std::shared_ptr<Node> next;

    // Use weak_ptr to break cycles
    std::weak_ptr<Node> parent;
};

void sharedPtrExample() {
    auto node1 = std::make_shared<Node>();
    auto node2 = std::make_shared<Node>();

    node1->next = node2;
    node2->parent = node1; // Weak reference prevents cycle

    // Access weak_ptr
    if (auto parent = node2->parent.lock()) {
        // parent is valid shared_ptr
    }
}

// Custom deleter for resources
class Socket {
public:
    static void close(int* fd) {
        if (fd && *fd >= 0) {
            ::close(*fd);
            delete fd;
        }
    }
};

auto createSocket() {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    return std::unique_ptr<int, decltype(&Socket::close)>(
        new int(fd),
        &Socket::close
    );
}

// make_unique/make_shared best practices
void bestPractices() {
    // Good: Exception safe, single allocation
    auto ptr = std::make_shared<Widget>();

    // Bad: Two allocations, not exception safe
    std::shared_ptr<Widget> ptr2(new Widget());

    // For arrays
    auto arr = std::make_unique<int[]>(10);
}
```

### Pattern 3: Ownership in Rust

```rust
// Move semantics (default)
fn move_example() {
    let s1 = String::from("hello");
    let s2 = s1; // s1 is MOVED, no longer valid

    // println!("{}", s1); // Compile error!
    println!("{}", s2);
}

// Borrowing (references)
fn borrow_example() {
    let s = String::from("hello");

    // Immutable borrow (multiple allowed)
    let len = calculate_length(&s);
    println!("{} has length {}", s, len);

    // Mutable borrow (only one allowed)
    let mut s = String::from("hello");
    change(&mut s);
}

fn calculate_length(s: &String) -> usize {
    s.len()
} // s goes out of scope, but doesn't drop since borrowed

fn change(s: &mut String) {
    s.push_str(", world");
}

// Lifetimes: Compiler tracks reference validity
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// Struct with references needs lifetime annotation
struct ImportantExcerpt<'a> {
    part: &'a str,
}

impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }

    // Lifetime elision: compiler infers 'a for &self
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention: {}", announcement);
        self.part
    }
}

// Interior mutability
use std::cell::{Cell, RefCell};
use std::rc::Rc;

struct Stats {
    count: Cell<i32>,           // Copy types
    data: RefCell<Vec<String>>, // Non-Copy types
}

impl Stats {
    fn increment(&self) {
        self.count.set(self.count.get() + 1);
    }

    fn add_data(&self, item: String) {
        self.data.borrow_mut().push(item);
    }
}

// Rc for shared ownership (single-threaded)
fn rc_example() {
    let data = Rc::new(vec![1, 2, 3]);
    let data2 = Rc::clone(&data); // Increment reference count

    println!("Count: {}", Rc::strong_count(&data)); // 2
}

// Arc for shared ownership (thread-safe)
use std::sync::Arc;
use std::thread;

fn arc_example() {
    let data = Arc::new(vec![1, 2, 3]);

    let handles: Vec<_> = (0..3)
        .map(|_| {
            let data = Arc::clone(&data);
            thread::spawn(move || {
                println!("{:?}", data);
            })
        })
        .collect();

    for handle in handles {
        handle.join().unwrap();
    }
}
```

### Pattern 4: Safe Resource Management in C

```c
// C doesn't have RAII, but we can use patterns

#include <stdlib.h>
#include <stdio.h>

// Pattern: goto cleanup
int process_file(const char* path) {
    FILE* file = NULL;
    char* buffer = NULL;
    int result = -1;

    file = fopen(path, "r");
    if (!file) {
        goto cleanup;
    }

    buffer = malloc(1024);
    if (!buffer) {
        goto cleanup;
    }

    // Process file...
    result = 0;

cleanup:
    if (buffer) free(buffer);
    if (file) fclose(file);
    return result;
}

// Pattern: Opaque pointer with create/destroy
typedef struct Context Context;

Context* context_create(void);
void context_destroy(Context* ctx);
int context_process(Context* ctx, const char* data);

// Implementation
struct Context {
    int* data;
    size_t size;
    FILE* log;
};

Context* context_create(void) {
    Context* ctx = calloc(1, sizeof(Context));
    if (!ctx) return NULL;

    ctx->data = malloc(100 * sizeof(int));
    if (!ctx->data) {
        free(ctx);
        return NULL;
    }

    ctx->log = fopen("log.txt", "w");
    if (!ctx->log) {
        free(ctx->data);
        free(ctx);
        return NULL;
    }

    return ctx;
}

void context_destroy(Context* ctx) {
    if (ctx) {
        if (ctx->log) fclose(ctx->log);
        if (ctx->data) free(ctx->data);
        free(ctx);
    }
}

// Pattern: Cleanup attribute (GCC/Clang extension)
#define AUTO_FREE __attribute__((cleanup(auto_free_func)))

void auto_free_func(void** ptr) {
    free(*ptr);
}

void auto_free_example(void) {
    AUTO_FREE char* buffer = malloc(1024);
    // buffer automatically freed at end of scope
}
```

### Pattern 5: Bounds Checking

```cpp
// C++: Use containers instead of raw arrays
#include <vector>
#include <array>
#include <span>

void safe_array_access() {
    std::vector<int> vec = {1, 2, 3, 4, 5};

    // Safe: throws std::out_of_range
    try {
        int val = vec.at(10);
    } catch (const std::out_of_range& e) {
        // Handle error
    }

    // Unsafe but faster (no bounds check)
    int val = vec[2];

    // Modern C++20: std::span for array views
    std::span<int> view(vec);
    // Iterators are bounds-safe
    for (int& x : view) {
        x *= 2;
    }
}

// Fixed-size arrays
void fixed_array() {
    std::array<int, 5> arr = {1, 2, 3, 4, 5};

    // Compile-time size known
    static_assert(arr.size() == 5);

    // Safe access
    int val = arr.at(2);
}
```

```rust
// Rust: Bounds checking by default

fn rust_bounds_checking() {
    let vec = vec![1, 2, 3, 4, 5];

    // Runtime bounds check (panics if out of bounds)
    let val = vec[2];

    // Explicit option (no panic)
    match vec.get(10) {
        Some(val) => println!("Got {}", val),
        None => println!("Index out of bounds"),
    }

    // Iterators (no bounds checking needed)
    for val in &vec {
        println!("{}", val);
    }

    // Slices are bounds-checked
    let slice = &vec[1..3]; // [2, 3]
}
```

### Pattern 6: Preventing Data Races

```cpp
// C++: Thread-safe shared state
#include <mutex>
#include <shared_mutex>
#include <atomic>

class ThreadSafeCounter {
public:
    void increment() {
        // Atomic operations
        count_.fetch_add(1, std::memory_order_relaxed);
    }

    int get() const {
        return count_.load(std::memory_order_relaxed);
    }

private:
    std::atomic<int> count_{0};
};

class ThreadSafeMap {
public:
    void write(const std::string& key, int value) {
        std::unique_lock lock(mutex_);
        data_[key] = value;
    }

    std::optional<int> read(const std::string& key) {
        std::shared_lock lock(mutex_);
        auto it = data_.find(key);
        if (it != data_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

private:
    mutable std::shared_mutex mutex_;
    std::map<std::string, int> data_;
};
```

```rust
// Rust: Data race prevention at compile time

use std::sync::{Arc, Mutex, RwLock};
use std::sync::atomic::{AtomicI32, Ordering};
use std::thread;

// Atomic for simple types
fn atomic_example() {
    let counter = Arc::new(AtomicI32::new(0));

    let handles: Vec<_> = (0..10)
        .map(|_| {
            let counter = Arc::clone(&counter);
            thread::spawn(move || {
                counter.fetch_add(1, Ordering::SeqCst);
            })
        })
        .collect();

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Counter: {}", counter.load(Ordering::SeqCst));
}

// Mutex for complex types
fn mutex_example() {
    let data = Arc::new(Mutex::new(vec![]));

    let handles: Vec<_> = (0..10)
        .map(|i| {
            let data = Arc::clone(&data);
            thread::spawn(move || {
                let mut vec = data.lock().unwrap();
                vec.push(i);
            })
        })
        .collect();

    for handle in handles {
        handle.join().unwrap();
    }
}

// RwLock for read-heavy workloads
fn rwlock_example() {
    let data = Arc::new(RwLock::new(HashMap::new()));

    // Multiple readers OK
    let read_guard = data.read().unwrap();

    // Writer blocks readers
    let write_guard = data.write().unwrap();
}
```

## Best Practices

### Do's
- **Prefer RAII** - Tie resource lifetime to scope
- **Use smart pointers** - Avoid raw pointers in C++
- **Understand ownership** - Know who owns what
- **Check bounds** - Use safe access methods
- **Use tools** - AddressSanitizer, Valgrind, Miri

### Don'ts
- **Don't use raw pointers** - Unless interfacing with C
- **Don't return local references** - Dangling pointer
- **Don't ignore compiler warnings** - They catch bugs
- **Don't use `unsafe` carelessly** - In Rust, minimize it
- **Don't assume thread safety** - Be explicit

## Debugging Tools

```bash
# AddressSanitizer (Clang/GCC)
clang++ -fsanitize=address -g source.cpp

# Valgrind
valgrind --leak-check=full ./program

# Rust Miri (undefined behavior detector)
cargo +nightly miri run

# ThreadSanitizer
clang++ -fsanitize=thread -g source.cpp
```

## Resources

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/)
- [Rust Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)
- [AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
