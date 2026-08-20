# Build Configuration


### Boost.Asio (header-only since Boost 1.74+)

```cmake
find_package(Boost REQUIRED)
find_package(OpenSSL REQUIRED)          # if using SSL
find_package(Threads REQUIRED)

target_link_libraries(myapp PRIVATE
    Boost::headers                       # header-only Asio
    OpenSSL::SSL OpenSSL::Crypto         # if using SSL
    Threads::Threads
)

target_compile_features(myapp PRIVATE cxx_std_20)

# REQUIRED for GCC coroutine support — build will fail without this
target_compile_options(myapp PRIVATE
    $<$<CXX_COMPILER_ID:GNU>:-fcoroutines>
)

# Optional: truly header-only (no Boost.System link needed)
target_compile_definitions(myapp PRIVATE BOOST_ERROR_CODE_HEADER_ONLY)
```

### Standalone Asio (always header-only)

```cmake
# Standalone Asio has no CMake config — use pkg-config or manual path
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

# If installed via brew:
find_path(ASIO_INCLUDE_DIR asio.hpp HINTS /opt/homebrew/include)

target_include_directories(myapp PRIVATE ${ASIO_INCLUDE_DIR})
target_link_libraries(myapp PRIVATE OpenSSL::SSL OpenSSL::Crypto Threads::Threads)
target_compile_features(myapp PRIVATE cxx_std_20)
target_compile_definitions(myapp PRIVATE ASIO_STANDALONE)

target_compile_options(myapp PRIVATE
    $<$<CXX_COMPILER_ID:GNU>:-fcoroutines>
)
```

### Dual-mode CMake (supports both)

```cmake
option(USE_STANDALONE_ASIO "Use standalone Asio instead of Boost.Asio" OFF)

find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

if(USE_STANDALONE_ASIO)
    find_path(ASIO_INCLUDE_DIR asio.hpp HINTS /opt/homebrew/include)
    target_include_directories(myapp PRIVATE ${ASIO_INCLUDE_DIR})
    target_compile_definitions(myapp PRIVATE USE_STANDALONE_ASIO ASIO_STANDALONE)
else()
    find_package(Boost REQUIRED)
    target_link_libraries(myapp PRIVATE Boost::headers)
    target_compile_definitions(myapp PRIVATE BOOST_ERROR_CODE_HEADER_ONLY)
endif()

target_link_libraries(myapp PRIVATE OpenSSL::SSL OpenSSL::Crypto Threads::Threads)
target_compile_features(myapp PRIVATE cxx_std_20)
target_compile_options(myapp PRIVATE $<$<CXX_COMPILER_ID:GNU>:-fcoroutines>)
```

## Header-Only Usage

**Boost.Asio:** Asio is header-only by default. The only thing that pulls in a Boost library to link is `boost::system::error_code`'s out-of-line symbols, so for a truly link-free build define **`BOOST_ERROR_CODE_HEADER_ONLY`**. `BOOST_ASIO_HEADER_ONLY` is rarely needed and only relevant if separate compilation was previously enabled; you do **not** normally need both.

**Define `BOOST_ERROR_CODE_HEADER_ONLY` in exactly ONE place — prefer CMake** (`target_compile_definitions`, as shown above). Defining it in CMake *and* with a source `#define` triggers `-Wmacro-redefined`. So in source, just include — no `#define`:
```cpp
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>
#include <boost/asio/experimental/awaitable_operators.hpp>
```

**Standalone Asio:**
```cpp
#include <asio.hpp>
#include <asio/ssl.hpp>
#include <asio/experimental/awaitable_operators.hpp>
// No macros needed — always header-only
```
