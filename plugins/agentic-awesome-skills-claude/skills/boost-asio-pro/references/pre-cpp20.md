# Pre-C++20 Styles (C++11–17, Boost ≥ 1.74)


If you can't use C++20 `co_await`, the **same Asio library** (modern Boost or standalone) still works — only the *async style* changes. Compile with C++11 or later. Two pre-C++20 styles:

1. **Completion handlers (callbacks)** — header-only, C++11, no extra dependencies. The recommended baseline.
2. **Stackful coroutines** (`asio::spawn` + `yield_context`) — synchronous-looking like `co_await`, but built on Boost.Coroutine/Boost.Context, so it **must be linked** (not header-only) — see build note below.

**Unchanged from the coroutine style** (these are library, not language, features): `io_context`, `make_strand`, `bind_executor`, `steady_timer`, `ssl::stream`, `signal_set`, `async_read`/`async_write`/`async_read_until`, buffers, `resolver`. Use them exactly as shown in [coroutines.md](coroutines.md).

**Not available pre-C++20:** `co_await`/`awaitable<T>`, `co_spawn`, `use_awaitable`, the `||`/`&&` `awaitable_operators`, `as_tuple`, and `co_composed`. The table below gives the equivalent.

### C++20 → pre-C++20 mapping

| C++20 coroutine | Pre-C++20 equivalent |
|-----------------|----------------------|
| `co_await op(use_awaitable)` | callback: `op(handler)` · stackful: `op(yield)` |
| `awaitable<T>` function | member `do_x()` callback chain · or `spawn(strand, fn)` |
| `co_spawn(ex, coro, tok)` | start the callback chain · or `asio::spawn(ex, fn, tok)` |
| `as_tuple(use_awaitable)` → `[ec,n]` | callback's `(ec, n)` params · stackful: `op(yield[ec])` |
| `a() \|\| b()` (first-wins race) | a **watchdog timer** that closes the socket; the other op fails with `operation_aborted` |
| `a() && b()` (wait both) | launch both, count completions in a shared `shared_ptr<int>` |
| `co_composed<>` custom op | `asio::async_compose<>` (C++11) |
| `co_await this_coro::executor` | `socket_.get_executor()` / a passed-in executor |

### Callback style: full-duplex + write queue

The full-duplex write-queue rule is identical — a strand alone doesn't stop interleaved writes — just expressed with chained handlers. Capture `self = shared_from_this()` in **every** handler to keep the connection alive.

```cpp
class connection : public std::enable_shared_from_this<connection> {
    tcp::socket socket_;
    asio::strand<asio::any_io_executor> strand_;   // tcp::socket's executor is any_io_executor
    std::deque<std::string> outbox_;
    bool writing_ = false;
    char buf_[1024];
public:
    explicit connection(tcp::socket s)
        : socket_(std::move(s)), strand_(asio::make_strand(socket_.get_executor())) {}
    void start() { do_read(); }

    void send(std::string frame) {          // call on the strand only
        outbox_.push_back(std::move(frame));
        if (!writing_) do_write();
    }
private:
    void do_read() {
        auto self = shared_from_this();
        socket_.async_read_some(asio::buffer(buf_),
            asio::bind_executor(strand_,     // serialize handler execution
                [this, self](boost::system::error_code ec, std::size_t n) {
                    if (ec) return;          // self drops here → socket closes
                    /* parse buf_[0..n]; call send() for replies */
                    do_read();
                }));
    }
    void do_write() {                        // at most one async_write in flight
        writing_ = true;
        auto self = shared_from_this();
        asio::async_write(socket_, asio::buffer(outbox_.front()),
            asio::bind_executor(strand_,
                [this, self](boost::system::error_code ec, std::size_t) {
                    if (ec) { writing_ = false; return; }
                    outbox_.pop_front();
                    if (!outbox_.empty()) do_write();
                    else writing_ = false;
                }));
    }
};
```

### Stackful style: spawn + yield_context

`yield` is a completion token: `op(socket, ..., yield)` suspends until done and returns the result; errors **throw** by default, or use `yield[ec]` for an `error_code`. Run each chain on a per-connection strand.

```cpp
asio::spawn(strand,                                   // executor or strand
    [self](asio::yield_context yield) {               // capture self for lifetime
        try {
            char data[1024];
            for (;;) {
                std::size_t n = self->socket_.async_read_some(asio::buffer(data), yield);
                asio::async_write(self->socket_, asio::buffer(data, n), yield);
            }
        } catch (const std::exception&) { self->socket_.close(); }
    },
    asio::detached);                                  // completion token (3rd arg)
```

### Timeout without `||` (watchdog timer)

Replace the `read || timer` race with a separate watchdog: reset the timer on each read; a second chain waits on it and closes the socket on expiry, which makes the read fail with `operation_aborted`.

```cpp
// callback watchdog
void arm_timeout() {
    timer_.expires_after(std::chrono::seconds(30));
    auto self = shared_from_this();
    timer_.async_wait(asio::bind_executor(strand_,
        [this, self](boost::system::error_code ec) {
            if (!ec) socket_.close();        // fired → drop; reset cancels with ec
        }));
}
// call arm_timeout() again on every frame received to re-arm
```

### Callback multi-step reads + recurring side-tasks

**Lifetime shift:** coroutine *stack locals* become *member variables* in callback style — a header/body buffer must outlive each async op or it dangles. Chain a composed read of the length, then the body:

```cpp
// members, NOT locals — they must survive until the handler runs
uint32_t len_be_;
std::string body_;
static constexpr std::uint32_t max_frame_size = 1U << 20; // protocol limit: 1 MiB

void read_frame() {
    auto self = shared_from_this();
    asio::async_read(socket_, asio::buffer(&len_be_, sizeof len_be_),
        asio::bind_executor(strand_, [this, self](boost::system::error_code ec, std::size_t) {
            if (ec) return;
            const std::uint32_t frame_length = ntohl(len_be_);
            if (frame_length > max_frame_size) {
                boost::system::error_code ignored;
                socket_.close(ignored);                         // reject before allocation
                return;
            }
            body_.assign(static_cast<std::size_t>(frame_length), '\0');
            asio::async_read(socket_, asio::buffer(body_),     // read exactly N bytes
                asio::bind_executor(strand_, [this, self](boost::system::error_code ec2, std::size_t) {
                    if (ec2) return;
                    handle_frame(body_);                       // dispatch on type byte
                    read_frame();                              // next frame
                }));
        }));
}
```

**Recurring side-task** (e.g. push every 250ms) running concurrently with the read loop — there is no detached coroutine to stop, so use a self-rescheduling timer and `cancel()` it to stop:

```cpp
void schedule_tick(std::string symbol, std::shared_ptr<asio::steady_timer> t) {
    t->expires_after(std::chrono::milliseconds(250));
    auto self = shared_from_this();
    t->async_wait(asio::bind_executor(strand_,
        [this, self, symbol, t](boost::system::error_code ec) {
            if (ec) return;                  // cancelled on unsubscribe/close → stops
            send(make_tick(symbol));         // enqueue on the write queue
            schedule_tick(symbol, t);        // reschedule itself
        }));
}
// start: keep one timer per subscription alive (e.g. in a map); stop: erase + t->cancel()
```

### Build difference (stackful spawn only)

Callbacks need no change beyond the standard (drop `-fcoroutines`; it's only for C++20 `co_await`):
```cmake
set(CMAKE_CXX_STANDARD 11)        # or 14 / 17
set(CMAKE_CXX_EXTENSIONS OFF)     # else CMake emits -std=gnu++NN, not literal -std=c++NN
target_link_libraries(app PRIVATE Boost::headers Threads::Threads)
target_compile_definitions(app PRIVATE BOOST_ERROR_CODE_HEADER_ONLY)
```
Stackful `spawn` additionally requires Boost.Coroutine (which uses Boost.Context) — **not header-only**:
```cmake
find_package(Boost REQUIRED COMPONENTS coroutine)
target_link_libraries(app PRIVATE Boost::coroutine)   # pulls in Boost.Context
```
> Standalone Asio's `spawn` also depends on Boost.Coroutine/Context — it drags Boost into an otherwise Boost-free build. If you want zero Boost, use the **callback** style.
>
> The 3-arg `spawn(ex, fn, token)` form needs **Boost ≥ 1.80** (older Boost has only `spawn(ex, fn)`). On old distros like Debian bookworm (Boost 1.74), the **callback** style compiles cleanly while stackful `spawn` does not — verified.
