---
title: Partition Queues for Per-Entity Limits
impact: HIGH
impactDescription: Enables per-entity concurrency control
tags: queue, partition, per-user, dynamic
---

## Partition Queues for Per-Entity Limits

Partitioned queues apply flow control limits per partition key instead of the entire queue. Each partition acts as a dynamic "subqueue".

**Incorrect (global concurrency for per-user limits):**

```typescript
// Global concurrency=1 blocks ALL users, not per-user
const queue = new WorkflowQueue("tasks", { concurrency: 1 });
```

**Correct (partitioned queue):**

```typescript
const queue = new WorkflowQueue("tasks", {
  partitionQueue: true,
  concurrency: 1,
});

async function onUserTask(userID: string, task: string) {
  // Each user gets their own partition - at most 1 task per user
  // but tasks from different users can run concurrently
  await DBOS.startWorkflow(processTask, {
    queueName: queue.name,
    enqueueOptions: { queuePartitionKey: userID },
  })(task);
}
```

**Two-level queueing (per-user + global limits):**

```typescript
const concurrencyQueue = new WorkflowQueue("concurrency-queue", { concurrency: 5 });
const partitionedQueue = new WorkflowQueue("partitioned-queue", {
  partitionQueue: true,
  concurrency: 1,
});

// At most 1 task per user AND at most 5 tasks globally
async function onUserTask(userID: string, task: string) {
  await DBOS.startWorkflow(concurrencyManager, {
    queueName: partitionedQueue.name,
    enqueueOptions: { queuePartitionKey: userID },
  })(task);
}

async function concurrencyManagerFn(task: string) {
  const handle = await DBOS.startWorkflow(processTask, {
    queueName: concurrencyQueue.name,
  })(task);
  return await handle.getResult();
}
const concurrencyManager = DBOS.registerWorkflow(concurrencyManagerFn);
```

Reference: [Partitioning Queues](https://docs.dbos.dev/typescript/tutorials/queue-tutorial#partitioning-queues)
