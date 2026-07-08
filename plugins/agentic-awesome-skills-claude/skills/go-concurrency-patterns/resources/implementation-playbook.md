# Go Concurrency Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Go Concurrency Patterns

Production patterns for Go concurrency including goroutines, channels, synchronization primitives, and context management.

## When to Use This Skill

- Building concurrent Go applications
- Implementing worker pools and pipelines
- Managing goroutine lifecycles
- Using channels for communication
- Debugging race conditions
- Implementing graceful shutdown

## Core Concepts

### 1. Go Concurrency Primitives

| Primitive | Purpose |
|-----------|---------|
| `goroutine` | Lightweight concurrent execution |
| `channel` | Communication between goroutines |
| `select` | Multiplex channel operations |
| `sync.Mutex` | Mutual exclusion |
| `sync.WaitGroup` | Wait for goroutines to complete |
| `context.Context` | Cancellation and deadlines |

### 2. Go Concurrency Mantra

```
Don't communicate by sharing memory;
share memory by communicating.
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    results := make(chan string, 10)
    var wg sync.WaitGroup

    // Spawn workers
    for i := 0; i < 3; i++ {
        wg.Add(1)
        go worker(ctx, i, results, &wg)
    }

    // Close results when done
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
    for result := range results {
        fmt.Println(result)
    }
}

func worker(ctx context.Context, id int, results chan<- string, wg *sync.WaitGroup) {
    defer wg.Done()

    select {
    case <-ctx.Done():
        return
    case results <- fmt.Sprintf("Worker %d done", id):
    }
}
```

## Patterns

### Pattern 1: Worker Pool

```go
package main

import (
    "context"
    "fmt"
    "sync"
)

type Job struct {
    ID   int
    Data string
}

type Result struct {
    JobID int
    Output string
    Err   error
}

func WorkerPool(ctx context.Context, numWorkers int, jobs <-chan Job) <-chan Result {
    results := make(chan Result, len(jobs))

    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                default:
                    result := processJob(job)
                    results <- result
                }
            }
        }(i)
    }

    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}

func processJob(job Job) Result {
    // Simulate work
    return Result{
        JobID:  job.ID,
        Output: fmt.Sprintf("Processed: %s", job.Data),
    }
}

// Usage
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    jobs := make(chan Job, 100)

    // Send jobs
    go func() {
        for i := 0; i < 50; i++ {
            jobs <- Job{ID: i, Data: fmt.Sprintf("job-%d", i)}
        }
        close(jobs)
    }()

    // Process with 5 workers
    results := WorkerPool(ctx, 5, jobs)

    for result := range results {
        fmt.Printf("Result: %+v\n", result)
    }
}
```

### Pattern 2: Fan-Out/Fan-In Pipeline

```go
package main

import (
    "context"
    "sync"
)

// Stage 1: Generate numbers
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case <-ctx.Done():
                return
            case out <- n:
            }
        }
    }()
    return out
}

// Stage 2: Square numbers (can run multiple instances)
func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case <-ctx.Done():
                return
            case out <- n * n:
            }
        }
    }()
    return out
}

// Fan-in: Merge multiple channels into one
func merge(ctx context.Context, cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    // Start output goroutine for each input channel
    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            select {
            case <-ctx.Done():
                return
            case out <- n:
            }
        }
    }

    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }

    // Close out after all inputs are done
    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Generate input
    in := generate(ctx, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    // Fan out to multiple squarers
    c1 := square(ctx, in)
    c2 := square(ctx, in)
    c3 := square(ctx, in)

    // Fan in results
    for result := range merge(ctx, c1, c2, c3) {
        fmt.Println(result)
    }
}
```

### Pattern 3: Bounded Concurrency with Semaphore

```go
package main

import (
    "context"
    "fmt"
    "golang.org/x/sync/semaphore"
    "sync"
)

type RateLimitedWorker struct {
    sem *semaphore.Weighted
}

func NewRateLimitedWorker(maxConcurrent int64) *RateLimitedWorker {
    return &RateLimitedWorker{
        sem: semaphore.NewWeighted(maxConcurrent),
    }
}

func (w *RateLimitedWorker) Do(ctx context.Context, tasks []func() error) []error {
    var (
        wg     sync.WaitGroup
        mu     sync.Mutex
        errors []error
    )

    for _, task := range tasks {
        // Acquire semaphore (blocks if at limit)
        if err := w.sem.Acquire(ctx, 1); err != nil {
            return []error{err}
        }

        wg.Add(1)
        go func(t func() error) {
            defer wg.Done()
            defer w.sem.Release(1)

            if err := t(); err != nil {
                mu.Lock()
                errors = append(errors, err)
                mu.Unlock()
            }
        }(task)
    }

    wg.Wait()
    return errors
}

// Alternative: Channel-based semaphore
type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore {
    return make(chan struct{}, n)
}

func (s Semaphore) Acquire() {
    s <- struct{}{}
}

func (s Semaphore) Release() {
    <-s
}
```

### Pattern 4: Graceful Shutdown

```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

type Server struct {
    shutdown chan struct{}
    wg       sync.WaitGroup
}

func NewServer() *Server {
    return &Server{
        shutdown: make(chan struct{}),
    }
}

func (s *Server) Start(ctx context.Context) {
    // Start workers
    for i := 0; i < 5; i++ {
        s.wg.Add(1)
        go s.worker(ctx, i)
    }
}

func (s *Server) worker(ctx context.Context, id int) {
    defer s.wg.Done()
    defer fmt.Printf("Worker %d stopped\n", id)

    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            // Cleanup
            fmt.Printf("Worker %d cleaning up...\n", id)
            time.Sleep(500 * time.Millisecond) // Simulated cleanup
            return
        case <-ticker.C:
            fmt.Printf("Worker %d working...\n", id)
        }
    }
}

func (s *Server) Shutdown(timeout time.Duration) {
    // Signal shutdown
    close(s.shutdown)

    // Wait with timeout
    done := make(chan struct{})
    go func() {
        s.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        fmt.Println("Clean shutdown completed")
    case <-time.After(timeout):
        fmt.Println("Shutdown timed out, forcing exit")
    }
}

func main() {
    // Setup signal handling
    ctx, cancel := context.WithCancel(context.Background())

    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    server := NewServer()
    server.Start(ctx)

    // Wait for signal
    sig := <-sigCh
    fmt.Printf("\nReceived signal: %v\n", sig)

    // Cancel context to stop workers
    cancel()

    // Wait for graceful shutdown
    server.Shutdown(5 * time.Second)
}
```

### Pattern 5: Error Group with Cancellation

```go
package main

import (
    "context"
    "fmt"
    "golang.org/x/sync/errgroup"
    "net/http"
)

func fetchAllURLs(ctx context.Context, urls []string) ([]string, error) {
    g, ctx := errgroup.WithContext(ctx)

    results := make([]string, len(urls))

    for i, url := range urls {
        i, url := i, url // Capture loop variables

        g.Go(func() error {
            req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
            if err != nil {
                return fmt.Errorf("creating request for %s: %w", url, err)
            }

            resp, err := http.DefaultClient.Do(req)
            if err != nil {
                return fmt.Errorf("fetching %s: %w", url, err)
            }
            defer resp.Body.Close()

            results[i] = fmt.Sprintf("%s: %d", url, resp.StatusCode)
            return nil
        })
    }

    // Wait for all goroutines to complete or one to fail
    if err := g.Wait(); err != nil {
        return nil, err // First error cancels all others
    }

    return results, nil
}

// With concurrency limit
func fetchWithLimit(ctx context.Context, urls []string, limit int) ([]string, error) {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(limit) // Max concurrent goroutines

    results := make([]string, len(urls))
    var mu sync.Mutex

    for i, url := range urls {
        i, url := i, url

        g.Go(func() error {
            result, err := fetchURL(ctx, url)
            if err != nil {
                return err
            }

            mu.Lock()
            results[i] = result
            mu.Unlock()
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }

    return results, nil
}
```

### Pattern 6: Concurrent Map with sync.Map

```go
package main

import (
    "sync"
)

// For frequent reads, infrequent writes
type Cache struct {
    m sync.Map
}

func (c *Cache) Get(key string) (interface{}, bool) {
    return c.m.Load(key)
}

func (c *Cache) Set(key string, value interface{}) {
    c.m.Store(key, value)
}

func (c *Cache) GetOrSet(key string, value interface{}) (interface{}, bool) {
    return c.m.LoadOrStore(key, value)
}

func (c *Cache) Delete(key string) {
    c.m.Delete(key)
}

// For write-heavy workloads, use sharded map
type ShardedMap struct {
    shards    []*shard
    numShards int
}

type shard struct {
    sync.RWMutex
    data map[string]interface{}
}

func NewShardedMap(numShards int) *ShardedMap {
    m := &ShardedMap{
        shards:    make([]*shard, numShards),
        numShards: numShards,
    }
    for i := range m.shards {
        m.shards[i] = &shard{data: make(map[string]interface{})}
    }
    return m
}

func (m *ShardedMap) getShard(key string) *shard {
    // Simple hash
    h := 0
    for _, c := range key {
        h = 31*h + int(c)
    }
    return m.shards[h%m.numShards]
}

func (m *ShardedMap) Get(key string) (interface{}, bool) {
    shard := m.getShard(key)
    shard.RLock()
    defer shard.RUnlock()
    v, ok := shard.data[key]
    return v, ok
}

func (m *ShardedMap) Set(key string, value interface{}) {
    shard := m.getShard(key)
    shard.Lock()
    defer shard.Unlock()
    shard.data[key] = value
}
```

### Pattern 7: Select with Timeout and Default

```go
func selectPatterns() {
    ch := make(chan int)

    // Timeout pattern
    select {
    case v := <-ch:
        fmt.Println("Received:", v)
    case <-time.After(time.Second):
        fmt.Println("Timeout!")
    }

    // Non-blocking send/receive
    select {
    case ch <- 42:
        fmt.Println("Sent")
    default:
        fmt.Println("Channel full, skipping")
    }

    // Priority select (check high priority first)
    highPriority := make(chan int)
    lowPriority := make(chan int)

    for {
        select {
        case msg := <-highPriority:
            fmt.Println("High priority:", msg)
        default:
            select {
            case msg := <-highPriority:
                fmt.Println("High priority:", msg)
            case msg := <-lowPriority:
                fmt.Println("Low priority:", msg)
            }
        }
    }
}
```

## Race Detection

```bash
# Run tests with race detector
go test -race ./...

# Build with race detector
go build -race .

# Run with race detector
go run -race main.go
```

## Best Practices

### Do's
- **Use context** - For cancellation and deadlines
- **Close channels** - From sender side only
- **Use errgroup** - For concurrent operations with errors
- **Buffer channels** - When you know the count
- **Prefer channels** - Over mutexes when possible

### Don'ts
- **Don't leak goroutines** - Always have exit path
- **Don't close from receiver** - Causes panic
- **Don't use shared memory** - Unless necessary
- **Don't ignore context cancellation** - Check ctx.Done()
- **Don't use time.Sleep for sync** - Use proper primitives

## Resources

- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [Effective Go - Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Go by Example - Goroutines](https://gobyexample.com/goroutines)
