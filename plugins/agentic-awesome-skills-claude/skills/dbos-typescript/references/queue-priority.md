---
title: Set Queue Priority for Workflows
impact: HIGH
impactDescription: Prioritizes important workflows over lower-priority ones
tags: queue, priority, ordering, importance
---

## Set Queue Priority for Workflows

Enable priority on a queue to process higher-priority workflows first. Lower numbers indicate higher priority.

**Incorrect (no priority - FIFO only):**

```typescript
const queue = new WorkflowQueue("tasks");
// All tasks processed in FIFO order regardless of importance
```

**Correct (priority-enabled queue):**

```typescript
const queue = new WorkflowQueue("tasks", { priorityEnabled: true });

async function processTaskFn(task: string) {
  // ...
}
const processTask = DBOS.registerWorkflow(processTaskFn);

// High priority task (lower number = higher priority)
await DBOS.startWorkflow(processTask, {
  queueName: queue.name,
  enqueueOptions: { priority: 1 },
})("urgent-task");

// Low priority task
await DBOS.startWorkflow(processTask, {
  queueName: queue.name,
  enqueueOptions: { priority: 100 },
})("background-task");
```

Priority rules:
- Range: `1` to `2,147,483,647`
- Lower number = higher priority
- Workflows **without** assigned priorities have the highest priority (run first)
- Workflows with the same priority are dequeued in FIFO order

Reference: [Priority](https://docs.dbos.dev/typescript/tutorials/queue-tutorial#priority)
