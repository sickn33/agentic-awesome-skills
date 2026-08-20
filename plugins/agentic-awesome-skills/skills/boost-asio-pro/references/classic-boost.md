# Classic Boost (pre-1.66, the `io_service` era — verified to 1.62)


To support Boost older than 1.66 (no `io_context`, no `make_strand`, no `any_io_executor`), drop to the classic API — verified building **back to Boost 1.62** (Debian 9) while still compiling on current Boost via a tiny shim:

| Modern (1.66+) | Classic (pre-1.66) |
|----------------|--------------------|
| `io_context` | `io_service` |
| `make_strand(ex)` / `strand<any_io_executor>` | `io_service::strand strand(io)` |
| `bind_executor(strand, h)` | `strand.wrap(h)` |
| `timer.expires_after(d)` | `timer.expires_from_now(d)` |
| move-return `async_accept()` | `async_accept(socket_, handler)` |
| header-only `error_code` | link **Boost.System** (`find_package(Boost COMPONENTS system)`) |

Only the `io_service`/`io_context` name and the `expires_after`/`expires_from_now` call actually differ across 1.62…1.90 — isolate both behind `#if BOOST_VERSION >= 106600`:
```cpp
#include <boost/version.hpp>
#include <boost/asio/steady_timer.hpp>     // not pulled in by <boost/asio.hpp> on old Boost
#if BOOST_VERSION >= 106600
  using io_service_t = boost::asio::io_context;
#else
  using io_service_t = boost::asio::io_service;
#endif
template <class T, class Rep, class Period>
void timer_expires_in(T& t, std::chrono::duration<Rep,Period> d) {
#if BOOST_VERSION >= 106600
    t.expires_after(d);
#else
    t.expires_from_now(d);
#endif
}
```
CMake for this range: `cmake_minimum_required(VERSION 3.5)` (Debian 9 ships cmake 3.7), link `Boost::system` only if the component is found (modern Boost is header-only and has no such component), and use the classic out-of-source build (`mkdir build && cd build && cmake ..`) since `-S`/`-B` need cmake ≥ 3.13.
