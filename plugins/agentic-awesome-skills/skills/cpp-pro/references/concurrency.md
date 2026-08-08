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

// Lock-free stack
template<typename T>
class LockFreeStack {
    struct Node {
        T data;
        Node* next;
        Node(const T& value) : data(value), next(nullptr) {}
    };

    std::atomic<Node*> head_{nullptr};

public:
    void push(const T& value) {
        Node* new_node = new Node(value);
        new_node->next = head_.load(std::memory_order_relaxed);

        while (!head_.compare_exchange_weak(new_node->next, new_node,
                                           std::memory_order_release,
                                           std::memory_order_relaxed)) {
            // Retry with updated head
        }
    }

    bool pop(T& result) {
        Node* old_head = head_.load(std::memory_order_relaxed);

        while (old_head &&
               !head_.compare_exchange_weak(old_head, old_head->next,
                                           std::memory_order_acquire,
                                           std::memory_order_relaxed)) {
            // Retry
        }

        if (old_head) {
            result = old_head->data;
            delete old_head;  // Note: ABA problem exists
            return true;
        }
        return false;
    }
};

// Lock-free queue (single producer, single consumer)
template<typename T, size_t Size>
class SPSCQueue {
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
    ThreadPool(size_t num_threads) {
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
    std::vector<int> result(vec.size());
    std::transform(std::execution::par, vec.begin(), vec.end(),
                   result.begin(), [](int x) { return x * x; });

    // Parallel reduce
    int sum = std::reduce(std::execution::par, vec.begin(), vec.end());

    // Parallel transform_reduce (map-reduce)
    int sum_of_squares = std::transform_reduce(
        std::execution::par,
        vec.begin(), vec.end(),
        0,
        std::plus<>(),
        [](int x) { return x * x; }
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
    ~AsyncTask() { if (handle) handle.destroy(); }

    T get() {
        if (!handle.done()) {
            handle.resume();
        }

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
| std::atomic | Simple shared state | Lock-free |
| std::mutex | Exclusive access | Kernel call |
| std::shared_mutex | Read-heavy workload | Better than mutex |
| Lock-free structures | High contention | Best throughput |
| Thread pool | Task parallelism | Avoid thread overhead |
| Parallel STL | Data parallelism | Automatic scaling |
| std::async | Simple async tasks | Thread pool |
| Coroutines | Async I/O | Minimal overhead |

## Memory Ordering Guide

| Ordering | Guarantees | Use Case |
|----------|-----------|----------|
| relaxed | No synchronization | Counters |
| acquire | Load barrier | Consumer |
| release | Store barrier | Producer |
| acq_rel | Both | RMW operations |
| seq_cst | Total order | Default |
