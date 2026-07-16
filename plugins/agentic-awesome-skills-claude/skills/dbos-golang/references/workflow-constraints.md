---
title: Follow Workflow Constraints
impact: CRITICAL
impactDescription: Violating constraints breaks recovery and durability guarantees
tags: workflow, constraints, rules, best-practices
---

## Follow Workflow Constraints

Workflows have specific constraints to maintain durability guarantees. Violating them can break recovery.

**Incorrect (starting workflows from steps):**

```go
func myStep(ctx context.Context) (string, error) {
	// Don't start workflows from steps!
	// The step's context.Context does not support workflow operations
	return "", nil
}

func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	// Starting a child workflow inside a step breaks determinism
	dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
		handle, _ := dbos.RunWorkflow(ctx.(dbos.DBOSContext), otherWorkflow, "data") // WRONG
		return handle.GetWorkflowID(), nil
	})
	return "", nil
}
```

**Correct (workflow operations only from workflows):**

```go
func fetchData(ctx context.Context) (string, error) {
	// Steps only do external operations
	resp, err := http.Get("https://api.example.com")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return string(body), nil
}

func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	data, err := dbos.RunAsStep(ctx, fetchData, dbos.WithStepName("fetchData"))
	if err != nil {
		return "", err
	}
	// Start child workflows from the parent workflow
	handle, err := dbos.RunWorkflow(ctx, otherWorkflow, data)
	if err != nil {
		return "", err
	}
	// Receive messages from the workflow
	msg, err := dbos.Recvstring
	// Set events from the workflow
	dbos.SetEvent(ctx, "status", "done")
	return data, nil
}
```

Additional constraints:
- Don't modify global variables from workflows or steps
- All workflows and queues must be registered **before** `Launch()`
- Concurrent steps must start in deterministic order using `dbos.Go`/`dbos.Select`

Reference: [Workflow Guarantees](https://docs.dbos.dev/golang/tutorials/workflow-tutorial#workflow-guarantees)
