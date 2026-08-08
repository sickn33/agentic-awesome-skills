---
title: Use Events for Workflow Status Publishing
impact: MEDIUM
impactDescription: Enables real-time progress monitoring and interactive workflows
tags: communication, events, status, key-value
---

## Use Events for Workflow Status Publishing

Workflows can publish events (key-value pairs) with `DBOS.setEvent`. Other code can read events with `DBOS.getEvent`. Events are persisted and useful for real-time progress monitoring.

**Incorrect (using external state for progress):**

```typescript
let progress = 0; // Global variable - not durable!

async function processDataFn() {
  progress = 50; // Not persisted, lost on restart
}
const processData = DBOS.registerWorkflow(processDataFn);
```

**Correct (using events):**

```typescript
async function processDataFn() {
  await DBOS.setEvent("status", "processing");
  await DBOS.runStep(stepOne, { name: "stepOne" });
  await DBOS.setEvent("progress", 50);
  await DBOS.runStep(stepTwo, { name: "stepTwo" });
  await DBOS.setEvent("progress", 100);
  await DBOS.setEvent("status", "complete");
}
const processData = DBOS.registerWorkflow(processDataFn);

// Read events from outside the workflow
const status = await DBOS.getEvent<string>(workflowID, "status", 0);
const progress = await DBOS.getEvent<number>(workflowID, "progress", 0);
// Returns null if the event doesn't exist within the timeout (default 60s)
```

Events are useful for interactive workflows. For example, a checkout workflow can publish a payment URL for the caller to redirect to:

```typescript
async function checkoutWorkflowFn() {
  const paymentURL = await DBOS.runStep(createPayment, { name: "createPayment" });
  await DBOS.setEvent("paymentURL", paymentURL);
  // Continue processing...
}
const checkoutWorkflow = DBOS.registerWorkflow(checkoutWorkflowFn);

// HTTP handler starts workflow and reads the payment URL
const handle = await DBOS.startWorkflow(checkoutWorkflow)();
const url = await DBOS.getEvent<string>(handle.workflowID, "paymentURL", 300);
```

Reference: [Workflow Events](https://docs.dbos.dev/typescript/tutorials/workflow-communication#workflow-events)
