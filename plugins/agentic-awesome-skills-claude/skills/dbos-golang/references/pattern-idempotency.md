---
title: Use Workflow IDs for Idempotency
impact: MEDIUM
impactDescription: Prevents duplicate side effects like double payments
tags: pattern, idempotency, workflow-id, deduplication
---

## Use Workflow IDs for Idempotency

Assign a workflow ID to ensure a workflow executes only once, even if called multiple times. This prevents duplicate side effects like double payments.

**Incorrect (no idempotency):**

```go
func processPayment(ctx dbos.DBOSContext, orderID string) (string, error) {
	_, err := dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
		return chargeCard(orderID)
	}, dbos.WithStepName("chargeCard"))
	return "charged", err
}

// Multiple calls could charge the card multiple times!
dbos.RunWorkflow(ctx, processPayment, "order-123")
dbos.RunWorkflow(ctx, processPayment, "order-123") // Double charge!
```

**Correct (with workflow ID):**

```go
func processPayment(ctx dbos.DBOSContext, orderID string) (string, error) {
	_, err := dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
		return chargeCard(orderID)
	}, dbos.WithStepName("chargeCard"))
	return "charged", err
}

// Same workflow ID = only one execution
workflowID := fmt.Sprintf("payment-%s", orderID)
dbos.RunWorkflow(ctx, processPayment, "order-123",
	dbos.WithWorkflowID(workflowID),
)
dbos.RunWorkflow(ctx, processPayment, "order-123",
	dbos.WithWorkflowID(workflowID),
)
// Second call returns the result of the first execution
```

Access the current workflow ID inside a workflow:

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	currentID, err := dbos.GetWorkflowID(ctx)
	if err != nil {
		return "", err
	}
	fmt.Printf("Running workflow: %s\n", currentID)
	return input, nil
}
```

Workflow IDs must be **globally unique** for your application. If not set, a random UUID is generated.

Reference: [Workflow IDs and Idempotency](https://docs.dbos.dev/golang/tutorials/workflow-tutorial#workflow-ids-and-idempotency)
