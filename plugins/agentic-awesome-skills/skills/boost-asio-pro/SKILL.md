---
name: boost-asio-pro
description: "Use when writing asynchronous C++ networking code with Boost.Asio or standalone Asio — TCP/UDP servers and clients, SSL/TLS, timers, strands, composed async ops. Covers io_context, co_spawn, awaitable, async_read/async_write, asio::spawn, yield_context, and pre-C++20 callback styles."
category: development
risk: safe
source: community
source_repo: alexprivalov/boost-asio-skill
source_type: community
date_added: "2026-08-18"
author: alexprivalov
tags: [cpp, boost, asio, async, networking, coroutines]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/alexprivalov/boost-asio-skill/blob/main/LICENSE"
---

# Boost.Asio / standalone Asio

## Overview

Write async C++ networking code that compiles on the *user's* Boost, not the newest one. Asio's API changed shape three times (classic `io_service` → `io_context` → C++20 coroutines) and most Asio code on the internet is from the first era, so **pick the style from the toolchain first**, then follow that style's reference file.

**References:** [Boost.Asio](https://www.boost.org/doc/libs/latest/doc/html/boost_asio.html) · [standalone Asio](https://think-async.com/Asio/)

Asio's API changed shape three times, so the same task has three correct answers depending on the Boost version in front of you. This skill makes the agent establish that version first, then apply the rules that are genuinely easy to get wrong — strand versus write serialization, buffer and connection lifetime, composed reads for framing — and finally check its own output against a list before calling it done.

## When to Use This Skill

- Use when writing or reviewing async C++ networking code with Boost.Asio or standalone Asio: TCP/UDP servers and clients, SSL/TLS streams, timers, resolvers.
- Use when the code involves `io_context`, `io_service`, `co_spawn`, `awaitable`, `async_read`, `async_write`, `strand`, `asio::spawn`, `yield_context`, or completion-handler callbacks.
- Use when the target toolchain is old: an older Boost or a pre-C++20 standard, where coroutine examples will not compile.
- Use when async code compiles but misbehaves: interleaved writes, dangling buffers, sockets closing early, `operation_aborted` treated as an error.

## Step 1: pick the style (do this before writing code)

Determine the Boost (or Asio) version and the C++ standard actually in use — `find_package(Boost)` output, `dpkg -l libboost-dev`, `brew info boost`, `CMAKE_CXX_STANDARD`, or ask. Do not assume the newest.

| Boost | C++ std | Style | Read |
|-------|---------|-------|------|
| ≥ 1.77 | C++20 | Coroutines (`co_await` + `awaitable<T>`) — preferred | [references/coroutines.md](references/coroutines.md) |
| ≥ 1.74 | C++11–17 | Completion handlers (callbacks) — the portable baseline | [references/pre-cpp20.md](references/pre-cpp20.md) |
| ≥ 1.80 | C++11–17 | Stackful `asio::spawn` + `yield_context` (links Boost.Coroutine — not header-only) | [references/pre-cpp20.md](references/pre-cpp20.md) |
| 1.62–1.65 | C++11 | Classic `io_service` / `strand.wrap` / `expires_from_now` | [references/classic-boost.md](references/classic-boost.md) |

SSL/TLS in any style: [references/ssl.md](references/ssl.md). CMake for any style: [references/build.md](references/build.md).

`io_context`, `make_strand`, `bind_executor`, `steady_timer`, `signal_set`, `async_read`/`async_write`/`async_read_until`, buffers and `resolver` are **library** features — identical in the coroutine and callback styles. Only the suspension mechanism differs.

## Step 2: version floors (verified by compiling, not from docs)

Reach for one of these and the build breaks on older distros:

| Feature | Floor |
|---------|-------|
| `experimental/awaitable_operators.hpp` (the `\|\|` / `&&` operators) | **Boost ≥ 1.77** / Asio ≥ 1.20 |
| `as_tuple` completion token | **Boost ≥ 1.79** / Asio ≥ 1.21 |
| `co_composed` (custom composed ops) | **Boost ≥ 1.85** / Asio ≥ 1.30 |
| 3-arg `asio::spawn(ex, fn, token)` | **Boost ≥ 1.80** (older Boost has only `spawn(ex, fn)`) |
| `any_io_executor` (`strand<any_io_executor>`, `tcp::socket`'s default executor) | **Boost ≥ 1.74** — the floor for the callback style; below it, use legacy `io_context::strand` |
| `io_context`, `make_strand`, `expires_after` | **Boost ≥ 1.66** — below it, classic `io_service` |

Distro floors that bite: **Debian bookworm ships Boost 1.74** (no `awaitable_operators.hpp` — `#include` fails outright), Ubuntu 20.04 ships 1.71 (no `any_io_executor`), Debian 9 ships 1.62.

Language, not library: the chrono literals `250ms` / `30s` are **C++14**. For a true C++11 build write `std::chrono::milliseconds(250)`.

## Step 3: the rules that are actually easy to get wrong

**A strand does not serialize writes.** A strand serializes handler *execution*, not whole composed operations. Two `async_write`s in flight on the same strand still **interleave bytes on the wire**. Full-duplex (a read loop plus concurrent pushes/replies) needs a per-connection strand **and** an outbound queue with an in-flight flag, so at most one `async_write` exists at a time. This is the single most common wrong answer about Asio.

**Buffers do not own memory.** `asio::buffer()` is a view. Storage must outlive the operation: coroutine locals are fine across `co_await` in the same frame; in callback style the same data must become a **member**, not a local.

**Connections must outlive their handlers.** `enable_shared_from_this`, and capture `self` in *every* `co_spawn` / handler — read loop, write loop, and each timer.

**Frame with composed reads.** `async_read` (fills the buffer exactly) for a length prefix and then the body; never `async_read_some`, which returns short.

**Wrap `as_tuple`.** Always `as_tuple(use_awaitable)`. Bare `as_tuple` resolves against the operation's default token and compiles in some contexts, fails in others.

**`async_accept(make_strand(...))` changes two things**: it forces an explicit completion token back on the call, and the accepted socket is `basic_stream_socket<tcp, strand<...>>`, not `tcp::socket`. Take it **by value** or with `auto` — binding it to `tcp::socket&` will not compile.

**Re-arming a timer resolves the pending wait with `operation_aborted`.** In an idle-timeout loop that is the signal to keep waiting, not an error.

**GCC needs `-fcoroutines`** for the C++20 style, and header-only Boost needs `BOOST_ERROR_CODE_HEADER_ONLY` defined in exactly one place (CMake).

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Buffer dangling (local goes out of scope during async op) | Ensure buffer lifetime ≥ operation lifetime; coroutine locals or members, not callback locals |
| Forgetting `io.run()` | No handlers dispatch without `run()` / `run_one()` |
| Concurrent socket access without strand | Wrap in `strand<>` or serialize via one coroutine chain |
| Assuming a strand prevents interleaved writes | Add a write queue — see Step 3 |
| Using `use_awaitable` where `deferred` suffices | Omit the token (default is `deferred`) unless using `\|\|` / `&&` |
| Ignoring short reads/writes | Use composed `async_read` / `async_write` / `async_read_until`, not `async_read_some` |
| Not setting `reuse_address` on the acceptor | Set before `bind`/`listen` or restarts hit "address in use" |
| SSL operations without a strand | *All* `ssl::stream` ops need strand synchronization |
| Blocking inside a handler | Never block in a completion handler |
| Accepting a socket with the wrong executor type | See `async_accept(make_strand(...))` in Step 3 |
| Requiring the `Boost::system` component | Header-only since 1.74: `Boost::headers` + `BOOST_ERROR_CODE_HEADER_ONLY`. Only classic (pre-1.66) needs the link |
| Missing `-fcoroutines` on GCC | Build fails — add `$<$<CXX_COMPILER_ID:GNU>:-fcoroutines>` |
| Writing coroutine code for a Boost that predates it | Do Step 1 first |

## Boost.Asio vs standalone Asio

Same author, same API — namespace and includes differ.

| Aspect | Boost.Asio | Standalone Asio |
|--------|-----------|-----------------|
| Namespace / include | `boost::asio` / `<boost/asio.hpp>` | `asio` / `<asio.hpp>` |
| Error code | `boost::system::error_code` | `asio::error_code` (or `std::error_code`) |
| Install (brew) | `brew install boost` | `brew install asio` |
| CMake | `Boost::headers` | manual include path |
| Version (2025) | 1.87–1.90 (with Boost) | 1.30–1.36 (independent) |
| Macro prefix | `BOOST_ASIO_` | `ASIO_` |

Support both with a shim, then use `net::` throughout:
```cpp
#ifdef USE_STANDALONE_ASIO
  #include <asio.hpp>
  namespace net = asio;
  using error_code = asio::error_code;
#else
  #include <boost/asio.hpp>
  namespace net = boost::asio;
  using error_code = boost::system::error_code;
#endif
namespace ssl = net::ssl;
using tcp = net::ip::tcp;
```

## Before you call it done

Check the code you just wrote against this list:

- [ ] Style matches the target Boost version and C++ standard (Step 1), and every API used clears its floor (Step 2).
- [ ] Every buffer passed to an async op outlives that op — no callback locals, no dangling `string_view`.
- [ ] At most one `async_write` per socket in flight, enforced by a queue + flag, if anything writes concurrently with reading.
- [ ] Every async chain on a shared object runs on the same strand; `self` captured in every handler and `co_spawn`.
- [ ] Framing / delimited reads use composed `async_read` / `async_read_until`.
- [ ] Errors are handled, not swallowed: `as_tuple(use_awaitable)` destructured, or the callback's `ec` checked, on every op.
- [ ] `operation_aborted` distinguished from real errors wherever a timer is re-armed or an op is cancelled.
- [ ] Acceptor sets `reuse_address`; shutdown path closes the acceptor and drains sessions.
- [ ] CMake has the standard, `-fcoroutines` for GCC (C++20 only), `BOOST_ERROR_CODE_HEADER_ONLY` in one place, and `Boost::coroutine` only if using stackful `spawn`.
- [ ] It compiles. Build it — most of the mistakes above are compile-time, and the version floors are only real once tested.

## Worked examples

Three CI-verified implementations of the same full-duplex framed-protocol server, one per style — copy from the one matching Step 1. Paths are relative to this skill directory; if only the skill was installed, they are at https://github.com/alexprivalov/boost-asio-skill/tree/main/examples.

- `../../examples/market-data-feed/` — C++20 coroutines (Boost 1.77+; verified 1.83–1.90)
- `../../examples/market-data-feed-precpp20/` — callbacks, C++11-clean (verified Boost 1.74+, incl. Windows/MSVC)
- `../../examples/market-data-feed-classic/` — classic `io_service` (verified back to Boost 1.62 / Debian 9)

## Official documentation

- Overview: https://www.boost.org/doc/libs/latest/doc/html/boost_asio/overview.html
- Reference: https://www.boost.org/doc/libs/latest/doc/html/boost_asio/reference.html
- Examples: https://www.boost.org/doc/libs/latest/doc/html/boost_asio/examples.html

## Limitations

- This skill does not replace compiling and testing against the target toolchain. The version floors it documents are only real once built — build the code.
- It does not cover Boost.Beast (HTTP/WebSocket), io_uring backends, or UDP multicast specifics.
- Stop and ask when the Boost version and C++ standard cannot be determined; the style choice depends on them.

## Security & Safety Notes

- Read-only guidance: this skill contains no shell commands, network fetches, credentials, or mutation instructions. The commands it names (`dpkg -l libboost-dev`, `brew info boost`) are local version queries.
- Networking code it produces accepts untrusted input. Validate length prefixes before allocating (`std::string body(n, 0)` with an attacker-controlled `n` is a memory-exhaustion vector — cap it), and verify peer certificates when using TLS rather than disabling verification to make a handshake pass.

## Related Skills

- `@cpp-pro` — general modern C++ idioms; this skill assumes them and adds the Asio-specific rules.
