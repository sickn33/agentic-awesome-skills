# Concurrency and Parallel Programming

## Atomics and Memory Ordering

```cpp
#include <atomic>
#include <thread>

// Basic atomics
std::atomic<int> counter{0};
std::atomic<bool> flag{false};

// Memory ordering
void producer(std::atomic<int>& data, std::atomic<bool>& ready) {
    data.store(42, std::memory_order_relaxed);
    ready.store(true, std::memory_order_release);  // Release barrier
}

void consumer(std::atomic<int>& data, std::atomic<bool>& ready) {
    while (!ready.load(std::memory_order_acquire)) {  // Acquire barrier
        std::this_thread::yield();
    }
    int value = data.load(std::memory_order_relaxed);
}

// Compare-and-swap
bool try_acquire_lock(std::atomic<bool>& lock) {
    bool expected = false;
    return lock.compare_exchange_strong(expected, true,
                                       std::memory_order_acquire,
                                       std::memory_order_relaxed);
}

// Fetch-and-add
int increment_counter(std::atomic<int>& counter) {
    return counter.fetch_add(1, std::memory_order_relaxed);
}
```

## Lock-Free Data Structures

```cpp
#include <atomic>
#include <memory>

// A naive CAS linked stack cannot safely delete popped nodes: other
// threads may still dereference them (use-after-free), beyond ABA alone.
// Use a proven reclamation implementation or this mutex-owned stack.
#include <mutex>
#include <vector>
template<typename T>
class SafeStack {
    std::mutex mutex_;
    std::vector<T> values_;
public:
    void push(const T& value) {
        std::lock_guard lock(mutex_);
        values_.push_back(value);
    }
    bool pop(T& result) {
        std::lock_guard lock(mutex_);
        if (values_.empty()) return false;
        result = values_.back();
        values_.pop_back();
        return true;
    }
};

// Lock-free queue (single producer, single consumer)
template<typename T, size_t Size>
class SPSCQueue {
    static_assert(Size >= 2, "One sentinel slot is required");
    std::array<T, Size> buffer_;
    alignas(64) std::atomic<size_t> head_{0};
    alignas(64) std::atomic<size_t> tail_{0};

public:
    bool push(const T& item) {
        size_t head = head_.load(std::memory_order_relaxed);
        size_t next_head = (head + 1) % Size;

        if (next_head == tail_.load(std::memory_order_acquire)) {
            return false;  // Queue full
        }

        buffer_[head] = item;
        head_.store(next_head, std::memory_order_release);
        return true;
    }

    bool pop(T& item) {
        size_t tail = tail_.load(std::memory_order_relaxed);

        if (tail == head_.load(std::memory_order_acquire)) {
            return false;  // Queue empty
        }

        item = buffer_[tail];
        tail_.store((tail + 1) % Size, std::memory_order_release);
        return true;
    }
};
```

## Thread Pool

```cpp
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <future>

class ThreadPool {
    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex queue_mutex_;
    std::condition_variable condition_;
    bool stop_ = false;

public:
    // Sketch: queue is unbounded; add admission/backpressure and
    // exception-safe cleanup if creating a later worker throws.
    ThreadPool(size_t num_threads) {
        if (num_threads == 0) throw std::invalid_argument("No workers");
        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this] {
                while (true) {
                    std::function<void()> task;

                    {
                        std::unique_lock<std::mutex> lock(queue_mutex_);
                        condition_.wait(lock, [this] {
                            return stop_ || !tasks_.empty();
                        });

                        if (stop_ && tasks_.empty()) {
                            return;
                        }

                        task = std::move(tasks_.front());
                        tasks_.pop();
                    }

                    task();
                }
            });
        }
    }

    ~ThreadPool() {
        {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            stop_ = true;
        }
        condition_.notify_all();
        for (auto& worker : workers_) {
            worker.join();
        }
    }

    template<typename F, typename... Args>
    auto enqueue(F&& f, Args&&... args)
        -> std::future<typename std::invoke_result_t<F, Args...>> {

        using return_type = typename std::invoke_result_t<F, Args...>;

        auto task = std::make_shared<std::packaged_task<return_type()>>(
            std::bind(std::forward<F>(f), std::forward<Args>(args)...)
        );

        std::future<return_type> result = task->get_future();

        {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            if (stop_) {
                throw std::runtime_error("enqueue on stopped ThreadPool");
            }
            tasks_.emplace([task]() { (*task)(); });
        }

        condition_.notify_one();
        return result;
    }
};
```

## Parallel STL Algorithms

```cpp
#include <algorithm>
#include <execution>
#include <vector>
#include <numeric>

void parallel_algorithms_demo() {
    std::vector<int> vec(1'000'000);
    std::iota(vec.begin(), vec.end(), 0);

    // Parallel sort
    std::sort(std::execution::par, vec.begin(), vec.end());

    // Parallel for_each
    std::for_each(std::execution::par_unseq, vec.begin(), vec.end(),
                  [](int& x) { x *= 2; });

    // Parallel transform
    std::vector<long long> result(vec.size());
    std::transform(std::execution::par, vec.begin(), vec.end(),
                   result.begin(), [](int x) { return 1LL * x * x; });

    // Parallel reduce
    long long sum = std::reduce(std::execution::par, vec.begin(), vec.end(), 0LL);

    // Parallel transform_reduce (map-reduce)
    long long sum_of_squares = std::transform_reduce(
        std::execution::par,
        vec.begin(), vec.end(),
        0LL,
        std::plus<>(),
        [](int x) { return 1LL * x * x; }
    );
}
```

## Synchronization Primitives

```cpp
#include <mutex>
#include <shared_mutex>
#include <condition_variable>

// Mutex types
std::mutex mtx;
std::recursive_mutex rec_mtx;
std::timed_mutex timed_mtx;
std::shared_mutex shared_mtx;

// RAII locks
void exclusive_access() {
    std::lock_guard<std::mutex> lock(mtx);
    // Critical section
}

void unique_lock_example() {
    std::unique_lock<std::mutex> lock(mtx);
    // Can unlock and relock
    lock.unlock();
    // Do some work
    lock.lock();
}

// Reader-writer lock
class SharedData {
    mutable std::shared_mutex mutex_;
    std::string data_;

public:
    std::string read() const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        return data_;
    }

    void write(std::string new_data) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        data_ = std::move(new_data);
    }
};

// Condition variable
class Queue {
    std::queue<int> queue_;
    std::mutex mutex_;
    std::condition_variable cv_;

public:
    void push(int value) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(value);
        }
        cv_.notify_one();
    }

    int pop() {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this] { return !queue_.empty(); });
        int value = queue_.front();
        queue_.pop();
        return value;
    }
};

// std::scoped_lock - multiple mutexes
std::mutex mtx1, mtx2;

void transfer(Account& from, Account& to, int amount) {
    if (&from == &to) return; // Never lock the same nonrecursive mutex twice.
    // Validate positive amount, available balance and arithmetic bounds first.
    std::scoped_lock lock(from.mutex, to.mutex);  // Deadlock-free
    from.balance -= amount;
    to.balance += amount;
}
```

## Async and Futures

```cpp
#include <future>

// std::async
auto future = std::async(std::launch::async, []() {
    return expensive_computation();
});

// Get result (blocks until ready)
auto result = future.get();

// Promise and future
void producer(std::promise<int> promise) {
    int value = compute_value();
    promise.set_value(value);
}

void consumer(std::future<int> future) {
    int value = future.get();
}

std::promise<int> promise;
std::future<int> future = promise.get_future();

std::thread producer_thread(producer, std::move(promise));
std::thread consumer_thread(consumer, std::move(future));

producer_thread.join();
consumer_thread.join();

// Packaged task
std::packaged_task<int(int, int)> task([](int a, int b) {
    return a + b;
});

std::future<int> task_future = task.get_future();
std::thread task_thread(std::move(task), 5, 3);

int sum = task_future.get();  // 8
task_thread.join();
```

## Coroutine-Based Concurrency

```cpp
#include <coroutine>
#include <optional>

// Async task coroutine
template<typename T>
struct AsyncTask {
    struct promise_type {
        std::optional<T> value;
        std::exception_ptr exception;

        AsyncTask get_return_object() {
            return AsyncTask{
                std::coroutine_handle<promise_type>::from_promise(*this)
            };
        }

        std::suspend_never initial_suspend() { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }

        void return_value(T v) {
            value = std::move(v);
        }

        void unhandled_exception() {
            exception = std::current_exception();
        }
    };

    std::coroutine_handle<promise_type> handle;

    AsyncTask(std::coroutine_handle<promise_type> h) : handle(h) {}
    AsyncTask(const AsyncTask&) = delete;
    AsyncTask& operator=(const AsyncTask&) = delete;
    AsyncTask(AsyncTask&& other) noexcept : handle(std::exchange(other.handle, {})) {}
    ~AsyncTask() { if (handle) handle.destroy(); }

    T get() {
        if (!handle) throw std::logic_error("Empty task");
        if (!handle.done()) {
            handle.resume();
        }

        if (!handle || !handle.done())
            throw std::logic_error("Task is not complete; scheduler required");
        if (handle.promise().exception) {
            std::rethrow_exception(handle.promise().exception);
        }

        return *handle.promise().value;
    }
};

// Usage
AsyncTask<int> async_compute() {
    co_return 42;
}
```

## Quick Reference

| Primitive | Use Case | Performance |
|-----------|----------|-------------|
| std::atomic | Simple shared state | Check is_lock_free; type/platform dependent |
| std::mutex | Exclusive access | Kernel call |
| std::shared_mutex | Read-heavy workload | Benchmark contention and fairness |
| Lock-free structures | Specialized shared state | Reclamation required; benchmark |
| Thread pool | Task parallelism | Avoid thread overhead |
| Parallel STL | Data parallelism | Automatic scaling |
| std::async | Simple async tasks | Policy-dependent; no portable pool guarantee |
| Coroutines | Async I/O | Minimal overhead |

## Memory Ordering Guide

| Ordering | Guarantees | Use Case |
|----------|-----------|----------|
| relaxed | No synchronization | Counters |
| acquire | Load barrier | Consumer |
| release | Store barrier | Producer |
| acq_rel | Both | RMW operations |
| seq_cst | Total order | Default |
