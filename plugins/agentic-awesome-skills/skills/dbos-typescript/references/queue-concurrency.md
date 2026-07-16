---
title: Control Queue Concurrency
impact: HIGH
impactDescription: Prevents resource exhaustion with concurrent limits
tags: queue, concurrency, workerConcurrency, limits
---

## Control Queue Concurrency

Queues support worker-level and global concurrency limits to prevent resource exhaustion.

**Incorrect (no concurrency control):**

```typescript
const queue = new WorkflowQueue("heavy_tasks"); // No limits - could exhaust memory
```

**Correct (worker concurrency):**

```typescript
// Each process runs at most 5 tasks from this queue
const queue = new WorkflowQueue("heavy_tasks", { workerConcurrency: 5 });
```

**Correct (global concurrency):**

```typescript
// At most 10 tasks run across ALL processes
const queue = new WorkflowQueue("limited_tasks", { concurrency: 10 });
```

**In-order processing (sequential):**

```typescript
// Only one task at a time - guarantees order
const serialQueue = new WorkflowQueue("sequential_queue", { concurrency: 1 });

async function processEventFn(event: string) {
  // ...
}
const processEvent = DBOS.registerWorkflow(processEventFn);

app.post("/events", async (req, res) => {
  await DBOS.startWorkflow(processEvent, { queueName: serialQueue.name })(req.body.event);
  res.send("Queued!");
});
```

Worker concurrency is recommended for most use cases. Take care with global concurrency as any `PENDING` workflow on the queue counts toward the limit, including workflows from previous application versions.

When using worker concurrency, each process must have a unique `executorID` set in configuration (this is automatic with DBOS Conductor or Cloud).

Reference: [Managing Concurrency](https://docs.dbos.dev/typescript/tutorials/queue-tutorial#managing-concurrency)
