---
title: Use Events for Workflow Status Publishing
impact: MEDIUM
impactDescription: Enables real-time progress monitoring and interactive workflows
tags: communication, events, status, key-value
---

## Use Events for Workflow Status Publishing

Workflows can publish events (key-value pairs) with `dbos.SetEvent`. Other code can read events with `dbos.GetEvent`. Events are persisted and useful for real-time progress monitoring.

**Incorrect (using external state for progress):**

```go
var progress int // Global variable - not durable!

func processData(ctx dbos.DBOSContext, input string) (string, error) {
	progress = 50 // Not persisted, lost on restart
	return input, nil
}
```

**Correct (using events):**

```go
func processData(ctx dbos.DBOSContext, input string) (string, error) {
	dbos.SetEvent(ctx, "status", "processing")
	_, err := dbos.RunAsStep(ctx, stepOne, dbos.WithStepName("stepOne"))
	if err != nil {
		return "", err
	}
	dbos.SetEvent(ctx, "progress", 50)
	_, err = dbos.RunAsStep(ctx, stepTwo, dbos.WithStepName("stepTwo"))
	if err != nil {
		return "", err
	}
	dbos.SetEvent(ctx, "progress", 100)
	dbos.SetEvent(ctx, "status", "complete")
	return "done", nil
}

// Read events from outside the workflow
status, err := dbos.GetEventstring
progress, err := dbos.GetEventint
```

Events are useful for interactive workflows. For example, a checkout workflow can publish a payment URL for the caller to redirect to:

```go
func checkoutWorkflow(ctx dbos.DBOSContext, order Order) (string, error) {
	paymentURL, err := dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
		return createPayment(order)
	}, dbos.WithStepName("createPayment"))
	if err != nil {
		return "", err
	}
	dbos.SetEvent(ctx, "paymentURL", paymentURL)
	// Continue processing...
	return "success", nil
}

// HTTP handler starts workflow and reads the payment URL
handle, _ := dbos.RunWorkflow(ctx, checkoutWorkflow, order)
url, _ := dbos.GetEventstring, "paymentURL", 300*time.Second)
```

`GetEvent` blocks until the event is set or the timeout expires. It returns the zero value of the type if the timeout is reached.

Reference: [Workflow Events](https://docs.dbos.dev/golang/tutorials/workflow-communication#workflow-events)
