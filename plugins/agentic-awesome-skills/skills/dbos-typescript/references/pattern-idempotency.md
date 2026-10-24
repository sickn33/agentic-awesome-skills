---
title: Use Workflow IDs for Idempotency
impact: MEDIUM
impactDescription: Prevents duplicate side effects like double payments
tags: pattern, idempotency, workflow-id, deduplication
---

## Use Workflow IDs for Idempotency

Assign a workflow ID to ensure a workflow executes only once, even if called multiple times. This deduplicates workflow starts while records are retained. External steps can still repeat after interruption; use provider-side idempotency for payments.

**Incorrect (no idempotency):**

```typescript
async function processPaymentFn(orderId: string, amount: number) {
  await DBOS.runStep(() => chargeCard(amount, { idempotencyKey: `payment-${orderId}` }), { name: "chargeCard" });
  await DBOS.runStep(() => updateOrder(orderId), { name: "updateOrder" });
}
const processPayment = DBOS.registerWorkflow(processPaymentFn);

// Multiple calls could charge the card multiple times!
await processPayment("order-123", 50);
await processPayment("order-123", 50); // Double charge!
```

**Correct (with workflow ID):**

```typescript
async function processPaymentFn(orderId: string, amount: number) {
  await DBOS.runStep(() => chargeCard(amount, { idempotencyKey: `payment-${orderId}` }), { name: "chargeCard" });
  await DBOS.runStep(() => updateOrder(orderId), { name: "updateOrder" });
}
const processPayment = DBOS.registerWorkflow(processPaymentFn);

// Same workflow ID = only one execution
const orderId = "order-123";
const workflowID = `payment-${orderId}`;
await DBOS.startWorkflow(processPayment, { workflowID })("order-123", 50);
await DBOS.startWorkflow(processPayment, { workflowID })("order-123", 50);
// Second call returns a handle to the existing workflow; getResult() retrieves its result
```

Access the current workflow ID inside a workflow:

```typescript
async function myWorkflowFn() {
  const currentID = DBOS.workflowID;
  console.log(`Running workflow: ${currentID}`);
}
```

Workflow IDs must be **globally unique** for your application. If not set, a random UUID is generated.

Reference: [Workflow IDs and Idempotency](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial#workflow-ids-and-idempotency)
