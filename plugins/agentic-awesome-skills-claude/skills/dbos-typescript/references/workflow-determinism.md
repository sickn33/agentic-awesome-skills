---
title: Keep Workflows Deterministic
impact: CRITICAL
impactDescription: Non-deterministic workflows cannot recover correctly
tags: workflow, determinism, recovery, reliability
---

## Keep Workflows Deterministic

Workflow functions must be deterministic: given the same inputs and step return values, they must invoke the same steps in the same order. Non-deterministic operations must be moved to steps.

**Incorrect (non-deterministic workflow):**

```typescript
async function exampleWorkflowFn() {
  // Random value in workflow breaks recovery!
  // On replay, Math.random() returns a different value,
  // so the workflow may take a different branch.
  const choice = Math.random() > 0.5 ? 1 : 0;
  if (choice === 0) {
    await stepOne();
  } else {
    await stepTwo();
  }
}
const exampleWorkflow = DBOS.registerWorkflow(exampleWorkflowFn);
```

**Correct (non-determinism in step):**

```typescript
async function exampleWorkflowFn() {
  // Step result is checkpointed - replay uses the saved value
  const choice = await DBOS.runStep(
    () => Promise.resolve(Math.random() > 0.5 ? 1 : 0),
    { name: "generateChoice" }
  );
  if (choice === 0) {
    await stepOne();
  } else {
    await stepTwo();
  }
}
const exampleWorkflow = DBOS.registerWorkflow(exampleWorkflowFn);
```

Non-deterministic operations that must be in steps:
- Random number generation (use `DBOS.randomUUID()` for UUIDs)
- Getting current time (use `DBOS.now()` for timestamps)
- Accessing external APIs
- Reading files
- Database queries (use transactions or steps)

Reference: [Workflow Determinism](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial#determinism)
