# C++20 Coroutine Style (Boost ≥ 1.77)

The preferred style when the toolchain allows it. Read `SKILL.md` first — the rules there (write queue, buffer lifetime, version floors) apply here and are not repeated.

## Core Architecture

Boost.Asio uses the **Proactor pattern**: async operations run in the background, completion handlers are invoked with results.

```
Program → I/O Object → Execution Context → OS → (completion) → Handler
```

**Execution contexts:** `io_context` (single/multi-thread event loop), `thread_pool`, `system_context`

**I/O objects:** `tcp::socket`, `tcp::acceptor`, `udp::socket`, `steady_timer`, `ssl::stream<>`

**Completion tokens:** Control how async results are delivered — `use_awaitable`, `deferred` (default), `detached`, callbacks, futures.

## C++20 Coroutines (Preferred Style)

```cpp
#include <boost/asio.hpp>
#include <boost/asio/co_spawn.hpp>
#include <boost/asio/use_awaitable.hpp>

namespace asio = boost::asio;
using tcp = asio::ip::tcp;

asio::awaitable<void> echo_session(tcp::socket socket) {
    try {
        char data[1024];
        for (;;) {
            std::size_t n = co_await socket.async_read_some(asio::buffer(data));
            co_await async_write(socket, asio::buffer(data, n));
        }
    } catch (std::exception&) {
        // Connection closed or error — coroutine ends
    }
}

asio::awaitable<void> listener(tcp::acceptor acceptor) {
    for (;;) {
        auto socket = co_await acceptor.async_accept();
        co_spawn(acceptor.get_executor(), echo_session(std::move(socket)), asio::detached);
    }
}

int main() {
    asio::io_context io(1); // concurrency_hint=1 for single-threaded
    tcp::acceptor acceptor(io, {tcp::v4(), 8080});
    co_spawn(io, listener(std::move(acceptor)), asio::detached);
    io.run();
}
```

**Key rules:**
- `co_spawn(executor, coroutine, completion_token)` launches a coroutine
- Without explicit token, async ops use `deferred` (returns awaitable object for `co_await`)
- Errors become `system_error` exceptions by default inside coroutines
- Use `asio::detached` when you don't need the coroutine's result

## Error Handling in Coroutines

**Default:** Errors throw `boost::system::system_error`.

**Explicit error handling with `as_tuple`:**
```cpp
auto [ec, n] = co_await socket.async_read_some(
    asio::buffer(data), asio::as_tuple(asio::use_awaitable));
if (ec) { /* handle error, no exception */ }
```
**Wrap, don't use bare `as_tuple`.** Always write `as_tuple(use_awaitable)`. Bare `asio::as_tuple` resolves against the operation's *default* completion token (often `deferred`), which compiles in some contexts but fails in others — wrapping an explicit base token is unambiguous everywhere.

**With `redirect_error`:**
```cpp
boost::system::error_code ec;
std::size_t n = co_await socket.async_read_some(
    asio::buffer(data), asio::redirect_error(asio::use_awaitable, ec));
```

## Strands (Thread Safety)

**Rule: All async operations on a shared object MUST execute on the same strand.**

```cpp
// Per-connection strand
asio::strand<asio::io_context::executor_type> strand(io.get_executor());
co_spawn(strand, session(std::move(socket)), asio::detached);

// Bind handler to strand
socket.async_read_some(asio::buffer(data),
    asio::bind_executor(strand, [](error_code ec, size_t n) { /*...*/ }));
```

**Implicit strands (no explicit strand needed):**
- Single-threaded `io_context::run()` — all handlers are sequential
- Single chain of async ops on one connection (half-duplex)

**Explicit strand required when:**
- Multiple threads call `io_context::run()`
- Full-duplex read+write on same socket
- Shared state accessed from multiple async chains

## Full-Duplex: Strand + Write Queue

**A strand serializes handler *execution*, NOT whole composed operations.** Two `async_write`s started "concurrently" on the same strand still overlap and **interleave bytes on the wire** — the strand only orders the intermediate handlers, not the byte stream. For full-duplex (a read loop plus pushes/replies writing at the same time on one socket), a strand alone is **not** enough: you must serialize outbound writes yourself with a queue.

```cpp
// Give each accepted socket its OWN strand, then run every chain (read loop,
// pushes, replies) on that strand. Passing an executor to async_accept means you
// must ALSO pass an explicit completion token — the default-deferred shortcut on
// the zero-arg form no longer applies.
auto socket = co_await acceptor.async_accept(asio::make_strand(io), asio::use_awaitable);
std::make_shared<connection>(std::move(socket))->start();

class connection : public std::enable_shared_from_this<connection> {
    tcp::socket socket_;                 // bound to its own strand
    std::deque<std::string> outbox_;
    bool writing_ = false;
public:
    explicit connection(tcp::socket s) : socket_(std::move(s)) {}

    void start() {
        // Each chain captures `self` so the connection outlives all its coroutines.
        co_spawn(socket_.get_executor(),
                 [self = shared_from_this()] { return self->read_loop(); }, asio::detached);
    }

    // Call ONLY from the connection's strand (e.g. from its own coroutines).
    // From another thread/strand: asio::dispatch(socket_.get_executor(), ...).
    void send(std::string frame) {
        outbox_.push_back(std::move(frame));
        if (!writing_)
            co_spawn(socket_.get_executor(),
                     [self = shared_from_this()] { return self->write_loop(); }, asio::detached);
    }
private:
    asio::awaitable<void> write_loop() {
        writing_ = true;
        while (!outbox_.empty()) {
            co_await async_write(socket_, asio::buffer(outbox_.front()));
            outbox_.pop_front();         // pop only AFTER the write completes
        }
        writing_ = false;
    }
    asio::awaitable<void> read_loop();   // reads frames, calls send() for replies
};
```

**Why each rule matters:**
- One strand per connection → read loop and write loop never run their handlers concurrently.
- Write queue + `writing_` flag → at most one `async_write` in flight, so frames never interleave.
- `enable_shared_from_this` + capturing `self` in every `co_spawn` → the connection survives until all of its read/write/timer chains finish.
- The accepted socket from `async_accept(make_strand(...))` is `basic_stream_socket<tcp, strand<...>>`, **not** `tcp::socket`. Take it **by value** (`connection(tcp::socket s)`, store `tcp::socket socket_`) — the strand executor type-erases into `any_io_executor` on the move. Passing that accepted socket to a `tcp::socket&` (by reference) instead will **fail to compile** — use `auto` or accept by value.

**Strand from inside a coroutine** (when `io` isn't a captured local): get the executor from the coroutine and make a strand off it — no `io_context&` needed:
```cpp
auto ex = co_await asio::this_coro::executor;
auto socket = co_await acceptor.async_accept(asio::make_strand(ex), asio::use_awaitable);
```

**Run the read loop and idle watch together** — two `awaitable<void>` branches; don't inspect the result, the first to finish unwinds the other:
```cpp
using namespace asio::experimental::awaitable_operators;
co_await (read_loop() || idle_watch(socket_, timer_));   // either returning tears down the connection
```

**Stopping a detached side-coroutine** (e.g. a per-symbol ticker that must end on unsubscribe/close): a detached `co_spawn` won't stop itself. Either (a) have its loop re-check a flag each iteration and `co_return` when gone:
```cpp
while (subscriptions_.contains(symbol) && socket_.is_open()) {
    timer.expires_after(250ms);
    co_await timer.async_wait(asio::as_tuple(asio::use_awaitable));
    if (/* still subscribed */) send(make_tick(symbol));
}
```
or (b) spawn it with a `cancellation_signal` and `emit()` cancellation on unsubscribe. The flag approach is simpler for per-subscription tickers.

## Timers and Timeouts

```cpp
asio::awaitable<void> with_timeout(tcp::socket& socket) {
    asio::steady_timer timer(co_await asio::this_coro::executor);
    timer.expires_after(std::chrono::seconds(30));

    // Race: read vs timeout (requires awaitable_operators)
    using namespace asio::experimental::awaitable_operators;

    auto result = co_await (
        socket.async_read_some(asio::buffer(data), asio::use_awaitable)
        || timer.async_wait(asio::use_awaitable)
    );

    if (result.index() == 0) { /* read completed */ }
    else { /* timeout — cancel the socket */ socket.close(); }
}
```

**Re-armable idle timeout** (reset on every received frame — the common server pattern):
```cpp
// Run as a long-lived parallel branch. Calling expires_after() again cancels the
// pending wait, resolving the in-flight async_wait with operation_aborted — that
// is the signal to keep waiting, NOT an error. Genuine expiry resolves with no error.
asio::awaitable<void> idle_watch(tcp::socket& sock, asio::steady_timer& timer) {
    for (;;) {
        auto [ec] = co_await timer.async_wait(asio::as_tuple(asio::use_awaitable));
        if (ec == asio::error::operation_aborted) continue;  // re-armed → keep waiting
        if (ec) co_return;                                   // timer error
        sock.close();                                        // real timeout fired
        co_return;
    }
}
// On every frame received from the peer: timer.expires_after(30s);
```

**Parallel operations (`&&` and `||`):**
```cpp
#include <boost/asio/experimental/awaitable_operators.hpp>
using namespace asio::experimental::awaitable_operators;

// Wait for both (AND) — cancels other on failure
auto [read_n, write_n] = co_await (
    async_read(sock, in_buf, use_awaitable) &&
    async_write(sock, out_buf, use_awaitable)
);

// Wait for first (OR) — cancels other on success
auto result = co_await (
    async_read(sock, buf, use_awaitable) ||
    timer.async_wait(use_awaitable)
);
```

**Note:** `||` and `&&` operators require explicit `use_awaitable` token, and the `awaitable_operators.hpp` header (Boost ≥ 1.77 — see the version floors in SKILL.md).

**Void branches:** when a branch returns `void` (e.g. two `awaitable<void>` chains), that arm contributes `std::monostate` to the result variant. If *both* branches are void the result is `variant<monostate, monostate>` — don't inspect `.index()`; just `co_await` the expression and let whichever finishes first unwind the other.

## Cancellation

```cpp
asio::awaitable<void> cancellable_work() {
    // Check cancellation state
    auto cs = co_await asio::this_coro::cancellation_state;
    if (cs.cancelled() != asio::cancellation_type::none) {
        co_return;
    }

    // Enable cancellation types
    co_await asio::this_coro::reset_cancellation_state(
        asio::enable_total_cancellation());
}
```

## TCP Server Pattern

```cpp
asio::awaitable<void> server(asio::io_context& io, unsigned short port) {
    tcp::acceptor acceptor(io, {tcp::v4(), port});
    acceptor.set_option(tcp::acceptor::reuse_address(true));

    for (;;) {
        auto socket = co_await acceptor.async_accept();
        co_spawn(
            io.get_executor(),  // or a strand for multi-threaded
            handle_client(std::move(socket)),
            [](std::exception_ptr ep) {
                if (ep) std::rethrow_exception(ep);
            }
        );
    }
}
```

## Buffers

| Type | Use |
|------|-----|
| `asio::buffer(data, size)` | Wrap existing memory (no ownership) |
| `asio::dynamic_buffer(vec)` | Growable buffer over `vector`/`string` |
| `asio::streambuf` | Legacy stream buffer |
| `asio::const_buffer` | Read-only view |
| `asio::mutable_buffer` | Writable view |

**Critical:** `asio::buffer()` does NOT own memory. The underlying storage must outlive the async operation.

## Resolver (DNS)

```cpp
asio::awaitable<void> connect_to(asio::io_context& io,
                                  std::string host, std::string port) {
    tcp::resolver resolver(io);
    auto endpoints = co_await resolver.async_resolve(host, port);

    tcp::socket socket(io);
    co_await asio::async_connect(socket, endpoints);
    // socket is now connected
}
```

## Multi-Threaded io_context

```cpp
asio::io_context io;
std::vector<std::thread> threads;

for (int i = 0; i < std::thread::hardware_concurrency(); ++i) {
    threads.emplace_back([&io] { io.run(); });
}

// All handlers MUST be strand-protected when sharing state
for (auto& t : threads) t.join();
```

## Composed Async Operations (Custom)

```cpp
template <typename CompletionToken>
auto async_echo(tcp::socket& socket, CompletionToken&& token) {
    return asio::async_initiate<CompletionToken, void(boost::system::error_code)>(
        asio::co_composed<void(boost::system::error_code)>(
            [](auto state, tcp::socket& socket) -> void {
                state.throw_if_cancelled(true);
                state.reset_cancellation_state(asio::enable_terminal_cancellation());
                try {
                    char data[1024];
                    for (;;) {
                        std::size_t n = co_await socket.async_read_some(asio::buffer(data));
                        co_await async_write(socket, asio::buffer(data, n));
                    }
                } catch (const boost::system::system_error& e) {
                    co_return {e.code()};
                }
            }, socket),
        token, std::ref(socket));
}
```

## Line-Based Protocols

For newline-delimited protocols, prefer `async_read_until` over manual `async_read_some` + buffer parsing:

```cpp
asio::awaitable<void> line_echo(tcp::socket socket) {
    asio::streambuf buf;
    for (;;) {
        std::size_t n = co_await asio::async_read_until(socket, buf, '\n');
        std::string line(asio::buffers_begin(buf.data()),
                         asio::buffers_begin(buf.data()) + n);
        buf.consume(n);
        co_await async_write(socket, asio::buffer(line));
    }
}
```

Or with `dynamic_buffer` over a `std::string`:
```cpp
std::string buf;
std::size_t n = co_await asio::async_read_until(socket, asio::dynamic_buffer(buf), '\n');
std::string line = buf.substr(0, n);
buf.erase(0, n);
```

## Length-Prefixed Binary Framing

For binary protocols, read the fixed-size header fully, then the body fully — two sequential **composed** reads (`async_read` fills the whole buffer, handling short reads). Do NOT use `async_read_some` for framing.

```cpp
// Frame: [4-byte big-endian length N][N-byte body]
asio::awaitable<std::string> read_frame(tcp::socket& sock) {
    constexpr uint32_t max_frame_size = 16 * 1024 * 1024;
    uint32_t len_be = 0;
    co_await async_read(sock, asio::buffer(&len_be, sizeof len_be));  // exactly 4 bytes
    uint32_t n = ntohl(len_be);                    // <arpa/inet.h>; or hand-roll endian swap
    if (n > max_frame_size) {
        throw std::length_error("frame exceeds 16 MiB limit");  // <stdexcept>
    }
    std::string body(n, '\0');
    co_await async_read(sock, asio::buffer(body));  // exactly n bytes
    co_return body;
}

asio::awaitable<void> write_frame(tcp::socket& sock, std::string_view body) {
    uint32_t len_be = htonl(static_cast<uint32_t>(body.size()));
    std::array<asio::const_buffer, 2> bufs{
        asio::buffer(&len_be, sizeof len_be), asio::buffer(body)};
    co_await async_write(sock, bufs);              // gather-write header + body atomically
    // len_be and body must outlive the write — they do here (co_await suspends in-frame).
}
```

## Graceful Shutdown (signal_set)

```cpp
asio::signal_set signals(io, SIGINT, SIGTERM);
signals.async_wait([&](const boost::system::error_code&, int /*signo*/) {
    acceptor.close();   // stop accepting; let in-flight sessions drain, then io.run() returns
    // or, for an immediate stop: io.stop();
});
```

For coroutine-style shutdown, `co_await signals.async_wait()` in a dedicated coroutine instead of a callback.

## Quick Reference

| Operation | Function |
|-----------|----------|
| Launch coroutine | `co_spawn(executor, coro, token)` |
| Accept connection | `co_await acceptor.async_accept()` |
| Read some bytes | `co_await socket.async_read_some(buffer)` |
| Read exact/until | `co_await async_read(stream, buf)` / `async_read_until(stream, buf, delim)` |
| Write all | `co_await async_write(stream, buffer)` |
| Connect | `co_await async_connect(socket, endpoints)` |
| Resolve DNS | `co_await resolver.async_resolve(host, port)` |
| Wait timer | `co_await timer.async_wait()` |
| TLS handshake | `co_await stream.async_handshake(type)` |
| Get executor | `co_await asio::this_coro::executor` |
