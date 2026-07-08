---
title: Enqueue Workflows from External Applications
impact: HIGH
impactDescription: Enables external services to submit work to DBOS queues
tags: client, enqueue, external, queue
---

## Enqueue Workflows from External Applications

Use `client.Enqueue()` to submit workflows from outside your DBOS application. Since the Client runs externally, workflow and queue metadata must be specified explicitly by name.

**Incorrect (trying to use RunWorkflow from external code):**

```go
// RunWorkflow requires a full DBOS context with registered workflows
dbos.RunWorkflow(ctx, processTask, "data", dbos.WithQueue("myQueue"))
```

**Correct (using Client.Enqueue):**

```go
client, err := dbos.NewClient(context.Background(), dbos.ClientConfig{
	DatabaseURL: os.Getenv("DBOS_SYSTEM_DATABASE_URL"),
})
if err != nil {
	log.Fatal(err)
}
defer client.Shutdown(10 * time.Second)

// Basic enqueue - specify workflow and queue by name
handle, err := client.Enqueue("task_queue", "processTask", "task-data")
if err != nil {
	log.Fatal(err)
}

// Wait for the result
result, err := handle.GetResult()
```

**Enqueue with options:**

```go
handle, err := client.Enqueue("task_queue", "processTask", "task-data",
	dbos.WithEnqueueWorkflowID("custom-id"),
	dbos.WithEnqueueDeduplicationID("unique-id"),
	dbos.WithEnqueuePriority(10),
	dbos.WithEnqueueTimeout(5*time.Minute),
	dbos.WithEnqueueQueuePartitionKey("user-123"),
	dbos.WithEnqueueApplicationVersion("2.0.0"),
)
```

Enqueue options:
- `WithEnqueueWorkflowID`: Custom workflow ID
- `WithEnqueueDeduplicationID`: Prevent duplicate enqueues
- `WithEnqueuePriority`: Queue priority (lower = higher priority)
- `WithEnqueueTimeout`: Workflow timeout
- `WithEnqueueQueuePartitionKey`: Partition key for partitioned queues
- `WithEnqueueApplicationVersion`: Override application version

The workflow name must match the registered name or custom name set with `WithWorkflowName` during registration.

Always call `client.Shutdown()` when done.

Reference: [DBOS Client Enqueue](https://docs.dbos.dev/golang/reference/client#enqueue)
