---
title: Control Queue Concurrency
impact: HIGH
impactDescription: Prevents resource exhaustion with concurrent limits
tags: queue, concurrency, workerConcurrency, limits
---

## Control Queue Concurrency

Queues support worker-level and global concurrency limits to prevent resource exhaustion.

**Incorrect (no concurrency control):**

```go
queue := dbos.NewWorkflowQueue(ctx, "heavy_tasks") // No limits - could exhaust memory
```

**Correct (worker concurrency):**

```go
// Each process runs at most 5 tasks from this queue
queue := dbos.NewWorkflowQueue(ctx, "heavy_tasks",
	dbos.WithWorkerConcurrency(5),
)
```

**Correct (global concurrency):**

```go
// At most 10 tasks run across ALL processes
queue := dbos.NewWorkflowQueue(ctx, "limited_tasks",
	dbos.WithGlobalConcurrency(10),
)
```

**In-order processing (sequential):**

```go
// Only one task at a time - guarantees order
serialQueue := dbos.NewWorkflowQueue(ctx, "sequential_queue",
	dbos.WithGlobalConcurrency(1),
)
```

Worker concurrency is recommended for most use cases. Take care with global concurrency as any `PENDING` workflow on the queue counts toward the limit, including workflows from previous application versions.

When using worker concurrency, each process must have a unique `ExecutorID` set in configuration (this is automatic with DBOS Conductor or Cloud).

Reference: [Managing Concurrency](https://docs.dbos.dev/golang/tutorials/queue-tutorial#managing-concurrency)
