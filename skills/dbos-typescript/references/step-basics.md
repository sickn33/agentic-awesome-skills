---
title: Use Steps for External Operations
impact: HIGH
impactDescription: Steps enable recovery by checkpointing results
tags: step, external, api, checkpoint
---

## Use Steps for External Operations

Any function that performs complex operations, accesses external APIs, or has side effects should be a step. Step results are checkpointed, enabling workflow recovery.

**Incorrect (external call in workflow):**

```typescript
async function myWorkflowFn() {
  // External API call directly in workflow - not checkpointed!
  const response = await fetch("https://api.example.com/data");
  return await response.json();
}
const myWorkflow = DBOS.registerWorkflow(myWorkflowFn);
```

**Correct (external call in step using `DBOS.runStep`):**

```typescript
async function fetchData() {
  return await fetch("https://api.example.com/data").then(r => r.json());
}

async function myWorkflowFn() {
  const data = await DBOS.runStep(fetchData, { name: "fetchData" });
  return data;
}
const myWorkflow = DBOS.registerWorkflow(myWorkflowFn);
```

`DBOS.runStep` can also accept an inline arrow function:

```typescript
async function myWorkflowFn() {
  const data = await DBOS.runStep(
    () => fetch("https://api.example.com/data").then(r => r.json()),
    { name: "fetchData" }
  );
  return data;
}
```

Alternatively, you can use `DBOS.registerStep` to pre-register a step or `@DBOS.step()` as a class decorator, but `DBOS.runStep` is preferred for most use cases.

Step requirements:
- Inputs and outputs must be serializable to JSON
- Cannot call, start, or enqueue workflows from within steps
- Calling a step from another step makes the called step part of the calling step's execution

When to use steps:
- API calls to external services
- File system operations
- Random number generation
- Getting current time
- Any non-deterministic operation

Reference: [DBOS Steps](https://docs.dbos.dev/typescript/tutorials/step-tutorial)
