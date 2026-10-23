---
title: Use Messages for Workflow Notifications
impact: MEDIUM
impactDescription: Enables reliable inter-workflow and external-to-workflow communication
tags: communication, messages, send, recv, notification
---

## Use Messages for Workflow Notifications

Use `dbos.Send` to send messages to a workflow and `dbos.Recv` to receive them. Messages are queued per topic and persisted for reliable delivery.

**Incorrect (using external messaging for workflow communication):**

```go
// External message queue is not integrated with workflow recovery
ch := make(chan string) // Not durable!
```

**Correct (using DBOS messages):**

```go
func checkoutWorkflow(ctx dbos.DBOSContext, orderID string) (string, error) {
	// Wait for payment notification (timeout 120 seconds)
	notification, err := dbos.Recv[string](ctx, "payment_status", 120*time.Second)
	if err != nil {
		return "", err
	}

	if notification == "paid" {
		_, err = dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
			return fulfillOrder(orderID)
		}, dbos.WithStepName("fulfillOrder"))
		return "fulfilled", err
	}
	_, err = dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
		return cancelOrder(orderID)
	}, dbos.WithStepName("cancelOrder"))
	return "cancelled", err
}

// Send a message from a webhook handler
func paymentWebhook(ctx dbos.DBOSContext, workflowID, status string) error {
	return dbos.Send(ctx, workflowID, status, "payment_status")
}
```

Key behaviors:
- `Recv` waits for and consumes the next message for the specified topic
- Returns the zero value if the wait times out, with a `DBOSError` with code `TimeoutError`
- Messages without a topic can only be received by `Recv` without a topic
- Messages are queued per-topic (FIFO)

**Reliability guarantees:**
- All messages are persisted to the database
- Messages sent from workflows are delivered exactly-once

Reference: [Workflow Messaging and Notifications](https://docs.dbos.dev/golang/tutorials/workflow-communication#workflow-messaging-and-notifications)
