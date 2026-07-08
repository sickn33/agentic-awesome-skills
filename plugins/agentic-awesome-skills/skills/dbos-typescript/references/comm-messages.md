---
title: Use Messages for Workflow Notifications
impact: MEDIUM
impactDescription: Enables reliable inter-workflow and external-to-workflow communication
tags: communication, messages, send, recv, notification
---

## Use Messages for Workflow Notifications

Use `DBOS.send` to send messages to a workflow and `DBOS.recv` to receive them. Messages are queued per topic and persisted for reliable delivery.

**Incorrect (using external messaging for workflow communication):**

```typescript
// External message queue is not integrated with workflow recovery
import { Queue } from "some-external-queue";
```

**Correct (using DBOS messages):**

```typescript
async function checkoutWorkflowFn() {
  // Wait for payment notification (timeout 120 seconds)
  const notification = await DBOS.recv<string>("payment_status", 120);

  if (notification && notification === "paid") {
    await DBOS.runStep(fulfillOrder, { name: "fulfillOrder" });
  } else {
    await DBOS.runStep(cancelOrder, { name: "cancelOrder" });
  }
}
const checkoutWorkflow = DBOS.registerWorkflow(checkoutWorkflowFn);

// Send a message from a webhook handler
async function paymentWebhook(workflowID: string, status: string) {
  await DBOS.send(workflowID, status, "payment_status");
}
```

Key behaviors:
- `recv` waits for and consumes the next message for the specified topic
- Returns `null` if the wait times out (default timeout: 60 seconds)
- Messages without a topic can only be received by `recv` without a topic
- Messages are queued per-topic (FIFO)

**Reliability guarantees:**
- All messages are persisted to the database
- Messages sent from workflows are delivered exactly-once
- Messages sent from non-workflow code can use an idempotency key:

```typescript
await DBOS.send(workflowID, message, "topic", "idempotency-key-123");
```

Reference: [Workflow Messaging](https://docs.dbos.dev/typescript/tutorials/workflow-communication#workflow-messaging-and-notifications)
