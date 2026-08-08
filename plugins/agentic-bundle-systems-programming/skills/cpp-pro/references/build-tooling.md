# Build Systems and Tooling

## Modern CMake

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyProject VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile commands for tools
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Compiler warnings
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror)
endif()

# Create library target
add_library(mylib
    src/mylib.cpp
    include/mylib.h
)

target_include_directories(mylib
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_features(mylib PUBLIC cxx_std_20)

# Create executable
add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE mylib)

# Dependencies with FetchContent
include(FetchContent)

FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG 10.1.1
)
FetchContent_MakeAvailable(fmt)

target_link_libraries(mylib PUBLIC fmt::fmt)

# Testing
enable_testing()
add_subdirectory(tests)

# Install rules
include(GNUInstallDirs)
install(TARGETS mylib myapp
    EXPORT MyProjectTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

install(DIRECTORY include/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
```

## Sanitizers

```cmake
# AddressSanitizer (ASan) - memory errors
set(CMAKE_CXX_FLAGS_ASAN
    "-g -O1 -fsanitize=address -fno-omit-frame-pointer"
    CACHE STRING "Flags for ASan build"
)

# UndefinedBehaviorSanitizer (UBSan)
set(CMAKE_CXX_FLAGS_UBSAN
    "-g -O1 -fsanitize=undefined -fno-omit-frame-pointer"
    CACHE STRING "Flags for UBSan build"
)

# ThreadSanitizer (TSan) - data races
set(CMAKE_CXX_FLAGS_TSAN
    "-g -O1 -fsanitize=thread -fno-omit-frame-pointer"
    CACHE STRING "Flags for TSan build"
)

# MemorySanitizer (MSan) - uninitialized reads
set(CMAKE_CXX_FLAGS_MSAN
    "-g -O1 -fsanitize=memory -fno-omit-frame-pointer"
    CACHE STRING "Flags for MSan build"
)

# Usage: cmake -DCMAKE_BUILD_TYPE=ASAN ..
```

## Static Analysis

```yaml
# .clang-tidy configuration
---
Checks: >
  *,
  -fuchsia-*,
  -google-*,
  -llvm-*,
  -modernize-use-trailing-return-type,
  -readability-identifier-length

WarningsAsErrors: '*'

CheckOptions:
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.FunctionCase
    value: lower_case
  - key: readability-identifier-naming.VariableCase
    value: lower_case
  - key: readability-identifier-naming.ConstantCase
    value: UPPER_CASE
  - key: readability-identifier-naming.MemberCase
    value: lower_case
  - key: readability-identifier-naming.MemberSuffix
    value: '_'
  - key: modernize-use-nullptr.NullMacros
    value: 'NULL'
```

```bash
# Run clang-tidy
clang-tidy src/*.cpp -p build/

# Run cppcheck
cppcheck --enable=all --std=c++20 --suppress=missingInclude src/

# Run include-what-you-use
include-what-you-use -std=c++20 src/main.cpp
```

## Testing with Catch2

```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/benchmark/catch_benchmark.hpp>
#include "mylib.h"

TEST_CASE("Vector operations", "[vector]") {
    std::vector<int> vec{1, 2, 3};

    SECTION("push_back") {
        vec.push_back(4);
        REQUIRE(vec.size() == 4);
        REQUIRE(vec.back() == 4);
    }

    SECTION("pop_back") {
        vec.pop_back();
        REQUIRE(vec.size() == 2);
        REQUIRE(vec.back() == 2);
    }
}

TEST_CASE("Exception handling", "[exceptions]") {
    REQUIRE_THROWS_AS(risky_function(), std::runtime_error);
    REQUIRE_THROWS_WITH(risky_function(), "error message");
}

TEST_CASE("Floating point", "[math]") {
    REQUIRE_THAT(compute_value(),
                 Catch::Matchers::WithinAbs(3.14, 0.01));
}

BENCHMARK("Vector creation") {
    return std::vector<int>(1000);
};

BENCHMARK("Vector fill") {
    std::vector<int> vec(1000);
    for (int i = 0; i < 1000; ++i) {
        vec[i] = i;
    }
    return vec;
};
```

## Testing with GoogleTest

```cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "calculator.h"

class CalculatorTest : public ::testing::Test {
protected:
    void SetUp() override {
        calc = std::make_unique<Calculator>();
    }

    void TearDown() override {
        calc.reset();
    }

    std::unique_ptr<Calculator> calc;
};

TEST_F(CalculatorTest, Addition) {
    EXPECT_EQ(calc->add(2, 3), 5);
    EXPECT_EQ(calc->add(-1, 1), 0);
}

TEST_F(CalculatorTest, Division) {
    EXPECT_DOUBLE_EQ(calc->divide(10, 2), 5.0);
    EXPECT_THROW(calc->divide(10, 0), std::invalid_argument);
}

// Parameterized tests
class AdditionTest : public ::testing::TestWithParam<std::tuple<int, int, int>> {};

TEST_P(AdditionTest, ValidAddition) {
    auto [a, b, expected] = GetParam();
    Calculator calc;
    EXPECT_EQ(calc.add(a, b), expected);
}

INSTANTIATE_TEST_SUITE_P(
    AdditionSuite,
    AdditionTest,
    ::testing::Values(
        std::make_tuple(1, 2, 3),
        std::make_tuple(-1, -2, -3),
        std::make_tuple(0, 0, 0)
    )
);

// Mock objects
class MockDatabase : public Database {
public:
    MOCK_METHOD(void, connect, (const std::string&), (override));
    MOCK_METHOD(std::string, query, (const std::string&), (override));
    MOCK_METHOD(void, disconnect, (), (override));
};

TEST(ServiceTest, UsesDatabase) {
    MockDatabase mock_db;
    EXPECT_CALL(mock_db, connect("localhost"))
        .Times(1);
    EXPECT_CALL(mock_db, query("SELECT *"))
        .WillOnce(::testing::Return("result"));

    Service service(mock_db);
    service.process();
}
```

## Performance Profiling

```cpp
// Benchmark with Google Benchmark
#include <benchmark/benchmark.h>

static void BM_VectorPush(benchmark::State& state) {
    for (auto _ : state) {
        std::vector<int> vec;
        for (int i = 0; i < state.range(0); ++i) {
            vec.push_back(i);
        }
        benchmark::DoNotOptimize(vec);
    }
}
BENCHMARK(BM_VectorPush)->Range(8, 8<<10);

static void BM_VectorReserve(benchmark::State& state) {
    for (auto _ : state) {
        std::vector<int> vec;
        vec.reserve(state.range(0));
        for (int i = 0; i < state.range(0); ++i) {
            vec.push_back(i);
        }
        benchmark::DoNotOptimize(vec);
    }
}
BENCHMARK(BM_VectorReserve)->Range(8, 8<<10);

BENCHMARK_MAIN();
```

```bash
# Profiling with perf (Linux)
perf record -g ./myapp
perf report

# Profiling with Instruments (macOS)
instruments -t "Time Profiler" ./myapp

# Valgrind callgrind
valgrind --tool=callgrind ./myapp
kcachegrind callgrind.out.*

# Memory profiling
valgrind --tool=massif ./myapp
ms_print massif.out.*
```

## Conan Package Manager

```python
# conanfile.txt
[requires]
fmt/10.1.1
spdlog/1.12.0
catch2/3.4.0

[generators]
CMakeDeps
CMakeToolchain

[options]
fmt:header_only=True
```

```cmake
# CMakeLists.txt with Conan
cmake_minimum_required(VERSION 3.20)
project(MyProject)

find_package(fmt REQUIRED)
find_package(spdlog REQUIRED)
find_package(Catch2 REQUIRED)

add_executable(myapp src/main.cpp)
target_link_libraries(myapp
    PRIVATE
        fmt::fmt
        spdlog::spdlog
)

add_executable(tests test/main.cpp)
target_link_libraries(tests
    PRIVATE
        Catch2::Catch2WithMain
)
```

```bash
# Install dependencies
conan install . --output-folder=build --build=missing
cd build
cmake .. -DCMAKE_TOOLCHAIN_FILE=conan_toolchain.cmake
cmake --build .
```

## CI/CD with GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        compiler: [gcc, clang, msvc]
        build_type: [Debug, Release]

    steps:
    - uses: actions/checkout@v3

    - name: Install dependencies
      run: |
        pip install conan
        conan install . --output-folder=build --build=missing

    - name: Configure
      run: |
        cmake -B build -DCMAKE_BUILD_TYPE=${{ matrix.build_type }}

    - name: Build
      run: cmake --build build --config ${{ matrix.build_type }}

    - name: Test
      run: ctest --test-dir build -C ${{ matrix.build_type }}

  sanitizers:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        sanitizer: [asan, ubsan, tsan]

    steps:
    - uses: actions/checkout@v3

    - name: Build with sanitizer
      run: |
        cmake -B build -DCMAKE_BUILD_TYPE=${{ matrix.sanitizer }}
        cmake --build build

    - name: Run tests
      run: ctest --test-dir build

  static-analysis:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Run clang-tidy
      run: |
        cmake -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
        clang-tidy src/*.cpp -p build/

    - name: Run cppcheck
      run: cppcheck --enable=all --error-exitcode=1 src/
```

## Quick Reference

| Tool | Purpose | Command |
|------|---------|---------|
| CMake | Build system | `cmake -B build && cmake --build build` |
| Conan | Package manager | `conan install . --build=missing` |
| ASan | Memory errors | `-fsanitize=address` |
| UBSan | Undefined behavior | `-fsanitize=undefined` |
| TSan | Data races | `-fsanitize=thread` |
| clang-tidy | Static analysis | `clang-tidy src/*.cpp` |
| cppcheck | Static analysis | `cppcheck --enable=all src/` |
| Catch2 | Unit testing | `TEST_CASE("name") { REQUIRE(...); }` |
| GoogleTest | Unit testing | `TEST(Suite, Name) { EXPECT_EQ(...); }` |
| Google Benchmark | Performance | `BENCHMARK(func)->Range(...)` |
| Valgrind | Memory profiler | `valgrind --tool=memcheck ./app` |
