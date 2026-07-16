---
title: Start Workflows in Background
impact: CRITICAL
impactDescription: Background workflows enable reliable async processing
tags: workflow, background, handle, async
---

## Start Workflows in Background

Use `dbos.RunWorkflow` to start a workflow and get a handle to track it. The workflow is guaranteed to run to completion even if the app is interrupted.

**Incorrect (no way to track background work):**

```go
func processData(ctx dbos.DBOSContext, data string) (string, error) {
	// ...
	return "processed: " + data, nil
}

// Fire and forget in a goroutine - no durability, no tracking
go func() {
	processData(ctx, data)
}()
```

**Correct (using RunWorkflow):**

```go
func processData(ctx dbos.DBOSContext, data string) (string, error) {
	return "processed: " + data, nil
}

func main() {
	// ... setup and launch ...

	// Start workflow, get handle
	handle, err := dbos.RunWorkflow(ctx, processData, "input")
	if err != nil {
		log.Fatal(err)
	}

	// Get the workflow ID
	fmt.Println(handle.GetWorkflowID())

	// Wait for result
	result, err := handle.GetResult()

	// Check status
	status, err := handle.GetStatus()
}
```

Retrieve a handle later by workflow ID:

```go
handle, err := dbos.RetrieveWorkflowstring
result, err := handle.GetResult()
```

`GetResult` supports options:
- `dbos.WithHandleTimeout(timeout)`: Return a timeout error if the workflow doesn't complete within the duration
- `dbos.WithHandlePollingInterval(interval)`: Control how often the database is polled for completion

Reference: [Workflows](https://docs.dbos.dev/golang/tutorials/workflow-tutorial)
