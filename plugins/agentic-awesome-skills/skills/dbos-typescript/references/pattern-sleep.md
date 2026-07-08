---
title: Use Durable Sleep for Delayed Execution
impact: MEDIUM
impactDescription: Enables reliable scheduling across restarts
tags: pattern, sleep, delay, durable, schedule
---

## Use Durable Sleep for Delayed Execution

Use `DBOS.sleep()` for durable delays within workflows. The wakeup time is stored in the database, so the sleep survives restarts.

**Incorrect (non-durable sleep):**

```typescript
async function delayedTaskFn() {
  // setTimeout is not durable - lost on restart!
  await new Promise(r => setTimeout(r, 60000));
  await DBOS.runStep(doWork, { name: "doWork" });
}
const delayedTask = DBOS.registerWorkflow(delayedTaskFn);
```

**Correct (durable sleep):**

```typescript
async function delayedTaskFn() {
  // Durable sleep - survives restarts
  await DBOS.sleep(60000); // 60 seconds in milliseconds
  await DBOS.runStep(doWork, { name: "doWork" });
}
const delayedTask = DBOS.registerWorkflow(delayedTaskFn);
```

`DBOS.sleep()` takes milliseconds (unlike Python which takes seconds).

Use cases:
- Scheduling tasks to run in the future
- Implementing retry delays
- Delays spanning hours, days, or weeks

```typescript
async function scheduledTaskFn(task: string) {
  // Sleep for one week
  await DBOS.sleep(7 * 24 * 60 * 60 * 1000);
  await processTask(task);
}
```

For getting the current time durably, use `DBOS.now()`:

```typescript
async function myWorkflowFn() {
  const now = await DBOS.now(); // Checkpointed as a step
  // For random UUIDs:
  const id = await DBOS.randomUUID(); // Checkpointed as a step
}
```

Reference: [Durable Sleep](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial#durable-sleep)
