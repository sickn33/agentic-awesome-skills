# C++ Implementation Playbook

**Date:** March 23, 2026  
**Author:** champbreed  
---

## 1. RAII & Resource Management
Always wrap raw resources in manager objects to ensure cleanup on scope exit.
```cpp
// Good: Scope-bound cleanup
void process() {
    auto data = std::make_unique<uint8_t[]>(1024);
    // memory is freed automatically
}
```
## 2. Smart Pointer Ownership
- **unique_ptr**: Use for exclusive ownership.
- **shared_ptr**: Use for shared ownership across components.
- **weak_ptr**: Use to break circular reference cycles.

## 3. Concurrency Safety
Always use RAII-style locks like `std::lock_guard` or `std::unique_lock`.
```cpp
void update() {
    std::lock_guard<std::mutex> lock(mutex_); // Released automatically
    // thread-safe logic
}
```
## 4. Move Semantics & Efficiency
Avoid expensive copies by utilizing move constructors and `std::move`.
```cpp
void processData(std::vector<std::string>&& data) {
    auto internalData = std::move(data); // Transfers ownership, no copy
}
```
## 5. Modern STL Algorithms
Prefer algorithms over manual loops for readability and optimization.

```cpp
void sortData(std::vector<int>& myVector) {
    // Use std::ranges (C++20) for cleaner, safer iteration
    std::ranges::sort(myVector);
}
