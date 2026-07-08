---
title: Control Which Queues a Worker Listens To
impact: HIGH
impactDescription: Enables heterogeneous worker pools
tags: queue, listen, worker, process, configuration
---

## Control Which Queues a Worker Listens To

Use `ListenQueues` to make a process only dequeue from specific queues. This enables heterogeneous worker pools.

**Incorrect (all workers process all queues):**

```go
cpuQueue := dbos.NewWorkflowQueue(ctx, "cpu_queue")
gpuQueue := dbos.NewWorkflowQueue(ctx, "gpu_queue")

// Every worker processes both CPU and GPU tasks
// GPU tasks on CPU workers will fail or be slow!
dbos.Launch(ctx)
```

**Correct (selective queue listening):**

```go
cpuQueue := dbos.NewWorkflowQueue(ctx, "cpu_queue")
gpuQueue := dbos.NewWorkflowQueue(ctx, "gpu_queue")

workerType := os.Getenv("WORKER_TYPE") // "cpu" or "gpu"

if workerType == "gpu" {
	ctx.ListenQueues(ctx, gpuQueue)
} else if workerType == "cpu" {
	ctx.ListenQueues(ctx, cpuQueue)
}

dbos.Launch(ctx)
```

`ListenQueues` only controls dequeuing. A CPU worker can still enqueue tasks onto the GPU queue:

```go
// From a CPU worker, enqueue onto the GPU queue
dbos.RunWorkflow(ctx, gpuTask, "data",
	dbos.WithQueue(gpuQueue.Name),
)
```

Reference: [Listening to Specific Queues](https://docs.dbos.dev/golang/tutorials/queue-tutorial#listening-to-specific-queues)
