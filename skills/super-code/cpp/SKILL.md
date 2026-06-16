---
name: cpp
description: "Language-specific super-code guidelines for cpp."
risk: safe
source: community
date_added: "2026-06-16"
---
# C++: Idiomatic Efficiency Reference

## Table of Contents
1. [Memory & Ownership](#memory)
2. [Modern Types & Containers](#types)
3. [Move Semantics & References](#move)
4. [Templates & Concepts](#templates)
5. [Error Handling](#errors)
6. [Concurrency](#concurrency)
7. [Anti-patterns specific to C++](#antipatterns)

---

## 1. Memory & Ownership {#memory}

```cpp
// ❌ Raw new/delete
Widget* w = new Widget();
// ... 15 lines later ...
delete w;

// ✅
auto w = std::make_unique<Widget>();
```

```cpp
// ❌ Shared ownership when unique suffices
auto w = std::make_shared<Widget>();
transfer(w); // only one owner

// ✅ — unique_ptr; move when transferring
auto w = std::make_unique<Widget>();
transfer(std::move(w));
```

```cpp
// ❌ new[] for dynamic arrays
int* arr = new int[n];
// ... use ...
delete[] arr;

// ✅
std::vector<int> arr(n);
```

```cpp
// ❌ Manual RAII wrapper for file/mutex
FILE* f = fopen(path, "r");
// ... must remember fclose ...

// ✅
std::ifstream f(path);
// closes automatically at scope exit
// For non-standard resources: use unique_ptr with custom deleter
auto f = std::unique_ptr<FILE, decltype(&fclose)>(fopen(path, "r"), fclose);
```

**Rule: if you type `new`, you almost certainly want `make_unique` or `make_shared`.**

---

## 2. Modern Types & Containers {#types}

```cpp
// ❌ C-style string manipulation
char buf[256];
sprintf(buf, "%s:%d", host, port);

// ✅
auto addr = std::format("{}:{}", host, port); // C++20
// or: auto addr = host + ":" + std::to_string(port);
```

```cpp
// ❌ out-parameter for multiple returns
void compute(int input, int& result, std::string& error);

// ✅
struct ComputeResult { int value; std::string error; };
ComputeResult compute(int input);
// or: std::pair / std::tuple with structured bindings
auto [value, error] = compute(input);
```

```cpp
// ❌ Manual loop to find element
int idx = -1;
for (int i = 0; i < vec.size(); i++) {
    if (vec[i] == target) { idx = i; break; }
}

// ✅
auto it = std::ranges::find(vec, target); // C++20
// or: std::find(vec.begin(), vec.end(), target);
```

```cpp
// ❌ Checking .find() != .end() then accessing
auto it = map.find(key);
if (it != map.end()) { use(it->second); }

// ✅ (C++20)
if (map.contains(key)) { use(map[key]); }
// or keep iterator version when you need the value without double lookup
```

**Use `std::string_view` for function parameters that don't need ownership.**

---

## 3. Move Semantics & References {#move}

```cpp
// ❌ Copying a large container into a function
void process(std::vector<Data> items) { ... } // copies on call

// ✅ — const ref for read, move for sink
void process(const std::vector<Data>& items) { ... }  // read-only
void consume(std::vector<Data> items) { ... }          // sink: caller moves in
```

```cpp
// ❌ std::move on const object (silently copies)
const std::string s = "hello";
take(std::move(s)); // still copies

// ✅ — don't const things you intend to move
std::string s = "hello";
take(std::move(s));
```

```cpp
// ❌ Returning std::move from local (prevents NRVO)
std::vector<int> build() {
    std::vector<int> v;
    // ... fill ...
    return std::move(v); // pessimization

// ✅ — just return the local; compiler applies NRVO or implicit move
    return v;
}
```

---

## 4. Templates & Concepts {#templates}

```cpp
// ❌ SFINAE soup
template<typename T, typename = std::enable_if_t<std::is_integral_v<T>>>
T square(T x) { return x * x; }

// ✅ (C++20 concepts)
template<std::integral T>
T square(T x) { return x * x; }
```

```cpp
// ❌ Template for one type
template<typename T>
void log(T msg) { std::cout << msg; }
// Only ever called with std::string

// ✅ — don't templatize unless you need multiple types
void log(std::string_view msg) { std::cout << msg; }
```

**Concepts make template errors readable — prefer them over SFINAE and static_assert.**

---

## 5. Error Handling {#errors}

```cpp
// ❌ Error codes via int returns (C-style in C++)
int parse(const std::string& input, Data& out);

// ✅ — std::expected (C++23) or exceptions
std::expected<Data, ParseError> parse(const std::string& input);
// or throw for exceptional conditions
Data parse(const std::string& input); // throws ParseError
```

```cpp
// ❌ Catching by value (slices derived exceptions)
try { ... }
catch (std::exception e) { ... }

// ✅
catch (const std::exception& e) { ... }
```

```cpp
// ❌ Exception in destructor
~MyClass() {
    if (cleanup() < 0) throw CleanupError(); // terminates

// ✅ — destructors must be noexcept; log/swallow errors
~MyClass() noexcept {
    if (cleanup() < 0) log_error("cleanup failed");
}
```

---

## 6. Concurrency {#concurrency}

```cpp
// ❌ Manual thread + join tracking
std::thread t(work);
// ... must remember t.join() ...

// ✅ (C++20)
std::jthread t(work); // auto-joins on destruction
```

```cpp
// ❌ Lock/unlock manually
mtx.lock();
data.push_back(item);
mtx.unlock(); // missed on exception

// ✅
{
    std::scoped_lock lock(mtx);
    data.push_back(item);
}
```

```cpp
// ❌ Polling a shared bool for completion
while (!done.load()) { std::this_thread::sleep_for(10ms); }

// ✅ — use std::future or condition_variable
auto future = std::async(std::launch::async, compute);
auto result = future.get();
```

**Use `std::scoped_lock` over `lock_guard` — it handles multiple mutexes and avoids deadlock.**

---

## 7. Anti-patterns specific to C++ {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| Raw `new`/`delete` | `make_unique` / `make_shared` |
| `(Type)expr` C-style cast | `static_cast<Type>(expr)` |
| `#define` constants | `constexpr` variables |
| `NULL` | `nullptr` |
| `using namespace std;` in headers | explicit `std::` prefix |
| Manual loop for transform/filter | `std::ranges` or `<algorithm>` |
| `std::endl` | `'\n'` (endl flushes — slow) |
| `char*` for string parameters | `std::string_view` |
| Exception specification `throw()` | `noexcept` |
| Inheriting from `std::` containers | composition, not inheritance |
| `volatile` for thread synchronization | `std::atomic` |
| Header-only mega-templates | separate declaration/definition where compile time matters |


