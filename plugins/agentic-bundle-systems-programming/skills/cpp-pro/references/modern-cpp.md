# Modern C++20/23 Features

## Concepts and Constraints

```cpp
#include <concepts>

// Define custom concepts
template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template<typename T>
concept Hashable = requires(T a) {
    { std::hash<T>{}(a) } -> std::convertible_to<std::size_t>;
};

template<typename T>
concept Container = requires(T c) {
    typename T::value_type;
    typename T::iterator;
    { c.begin() } -> std::same_as<typename T::iterator>;
    { c.end() } -> std::same_as<typename T::iterator>;
    { c.size() } -> std::convertible_to<std::size_t>;
};

// Use concepts for function constraints
template<Numeric T>
T add(T a, T b) {
    return a + b;
}

// Concept-based overloading
template<std::integral T>
void process(T value) {
    std::cout << "Processing integer: " << value << '\n';
}

template<std::floating_point T>
void process(T value) {
    std::cout << "Processing float: " << value << '\n';
}
```

## Ranges and Views

```cpp
#include <ranges>
#include <vector>
#include <algorithm>

// Ranges-based algorithms
std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

// Filter, transform, take - all lazy evaluation
auto result = numbers
    | std::views::filter([](int n) { return n % 2 == 0; })
    | std::views::transform([](int n) { return n * n; })
    | std::views::take(3);

// Copy to vector only when needed
std::vector<int> materialized(result.begin(), result.end());

// Custom range adaptor
auto is_even = [](int n) { return n % 2 == 0; };
auto square = [](int n) { return n * n; };

auto pipeline = std::views::filter(is_even)
              | std::views::transform(square);

auto processed = numbers | pipeline;
```

## Coroutines

```cpp
#include <coroutine>
#include <iostream>
#include <memory>

// Generator coroutine
template<typename T>
struct Generator {
    struct promise_type {
        T current_value;

        auto get_return_object() {
            return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
        }

        std::suspend_always initial_suspend() { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }

        std::suspend_always yield_value(T value) {
            current_value = value;
            return {};
        }

        void return_void() {}
        void unhandled_exception() { std::terminate(); }
    };

    std::coroutine_handle<promise_type> handle;

    Generator(std::coroutine_handle<promise_type> h) : handle(h) {}
    ~Generator() { if (handle) handle.destroy(); }

    bool move_next() {
        handle.resume();
        return !handle.done();
    }

    T current_value() {
        return handle.promise().current_value;
    }
};

// Usage
Generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield a;
        auto next = a + b;
        a = b;
        b = next;
    }
}

// Async coroutine
#include <future>

struct Task {
    struct promise_type {
        Task get_return_object() {
            return Task{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_never initial_suspend() { return {}; }
        std::suspend_never final_suspend() noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() {}
    };

    std::coroutine_handle<promise_type> handle;
};

Task async_operation() {
    std::cout << "Starting async work\n";
    co_await std::suspend_always{};
    std::cout << "Resuming async work\n";
}
```

## Three-Way Comparison (Spaceship)

```cpp
#include <compare>

struct Point {
    int x, y;

    // Auto-generate all comparison operators
    auto operator<=>(const Point&) const = default;
};

// Custom spaceship operator
struct Version {
    int major, minor, patch;

    std::strong_ordering operator<=>(const Version& other) const {
        if (auto cmp = major <=> other.major; cmp != 0) return cmp;
        if (auto cmp = minor <=> other.minor; cmp != 0) return cmp;
        return patch <=> other.patch;
    }

    bool operator==(const Version& other) const = default;
};
```

## Designated Initializers

```cpp
struct Config {
    std::string host = "localhost";
    int port = 8080;
    bool ssl_enabled = false;
    int timeout_ms = 5000;
};

// C++20 designated initializers
Config cfg {
    .host = "example.com",
    .port = 443,
    .ssl_enabled = true
    // timeout_ms uses default
};
```

## Modules (C++20)

```cpp
// math.cppm - module interface
export module math;

export namespace math {
    template<typename T>
    T add(T a, T b) {
        return a + b;
    }

    class Calculator {
    public:
        int multiply(int a, int b);
    };
}

// Implementation
module math;

int math::Calculator::multiply(int a, int b) {
    return a * b;
}

// Usage in other files
import math;

int main() {
    auto result = math::add(5, 3);
    math::Calculator calc;
    auto product = calc.multiply(4, 7);
}
```

## constexpr Enhancements

```cpp
#include <string>
#include <vector>
#include <algorithm>

// C++20: constexpr std::string and std::vector
constexpr auto compute_at_compile_time() {
    std::vector<int> vec{1, 2, 3, 4, 5};
    std::ranges::reverse(vec);
    return vec[0]; // Returns 5
}

constexpr int value = compute_at_compile_time();

// constexpr virtual functions (C++20)
struct Base {
    constexpr virtual int get_value() const { return 42; }
    constexpr virtual ~Base() = default;
};

struct Derived : Base {
    constexpr int get_value() const override { return 100; }
};
```

## std::format (C++20)

```cpp
#include <format>
#include <iostream>

int main() {
    std::string msg = std::format("Hello, {}!", "World");

    // Positional arguments
    auto text = std::format("{1} {0}", "World", "Hello");

    // Formatting options
    double pi = 3.14159265;
    auto formatted = std::format("Pi: {:.2f}", pi); // "Pi: 3.14"

    // Custom types
    struct Point { int x, y; };
}

// Custom formatter
template<>
struct std::formatter<Point> {
    constexpr auto parse(format_parse_context& ctx) {
        return ctx.begin();
    }

    auto format(const Point& p, format_context& ctx) const {
        return std::format_to(ctx.out(), "({}, {})", p.x, p.y);
    }
};
```

## Quick Reference

| Feature | C++17 | C++20 | C++23 |
|---------|-------|-------|-------|
| Concepts | - | ✓ | ✓ |
| Ranges | - | ✓ | ✓ |
| Coroutines | - | ✓ | ✓ |
| Modules | - | ✓ | ✓ |
| Spaceship | - | ✓ | ✓ |
| std::format | - | ✓ | ✓ |
| std::expected | - | - | ✓ |
| std::print | - | - | ✓ |
| Deducing this | - | - | ✓ |
