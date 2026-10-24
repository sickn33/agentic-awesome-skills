---
title: Deduplicate Queued Workflows
impact: HIGH
impactDescription: Prevents duplicate workflow executions
tags: queue, deduplication, idempotent, duplicate
---

## Deduplicate Queued Workflows

Set a deduplication ID when enqueuing to prevent duplicate workflow executions. If a workflow with the same deduplication ID is already enqueued or executing, a `DBOSQueueDuplicatedError` is thrown.

**Incorrect (no deduplication):**

```typescript
// Multiple clicks could enqueue duplicates
async function handleClick(userId: string) {
  await DBOS.startWorkflow(processTask, { queueName: queue.name })("task");
}
```

**Correct (with deduplication):**

```typescript
import { DBOS, WorkflowQueue, Error as DBOSErrors } from "@dbos-inc/dbos-sdk";

const queue = new WorkflowQueue("task_queue");

async function processTaskFn(task: string) {
  // ...
}
const processTask = DBOS.registerWorkflow(processTaskFn);

async function handleClick(userId: string) {
  try {
    await DBOS.startWorkflow(processTask, {
      queueName: queue.name,
      enqueueOptions: { deduplicationID: userId },
    })("task");
  } catch (e) {
    if (!(e instanceof DBOSErrors.DBOSQueueDuplicatedError)) throw e;
    // Only the duplicate-queue error is handled here
    console.log("Task already in progress for user:", userId);
  }
}
```

Deduplication is per-queue. The deduplication ID is active while the workflow has status `ENQUEUED` or `PENDING`. Once the workflow completes, a new workflow with the same deduplication ID can be enqueued.

This is useful for:
- Ensuring one active task per user
- Preventing duplicate form submissions
- Suppressing concurrent duplicate processing; durable event idempotency still needs a workflow/provider key

Reference: [Deduplication](https://docs.dbos.dev/typescript/tutorials/queue-tutorial#deduplication)
