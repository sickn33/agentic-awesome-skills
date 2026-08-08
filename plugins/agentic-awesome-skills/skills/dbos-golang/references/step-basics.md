---
title: Use Steps for External Operations
impact: HIGH
impactDescription: Steps enable recovery by checkpointing results
tags: step, external, api, checkpoint
---

## Use Steps for External Operations

Any function that performs complex operations, accesses external APIs, or has side effects should be a step. Step results are checkpointed, enabling workflow recovery.

**Incorrect (external call in workflow):**

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	// External API call directly in workflow - not checkpointed!
	resp, err := http.Get("https://api.example.com/data")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return string(body), nil
}
```

**Correct (external call in step using `dbos.RunAsStep`):**

```go
func fetchData(ctx context.Context) (string, error) {
	resp, err := http.Get("https://api.example.com/data")
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
	return data, nil
}
```

`dbos.RunAsStep` can also accept an inline closure:

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	data, err := dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
		resp, err := http.Get("https://api.example.com/data")
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		return string(body), nil
	}, dbos.WithStepName("fetchData"))
	return data, err
}
```

Step type signature: `type Step[R any] func(ctx context.Context) (R, error)`

Step requirements:
- The function must accept a `context.Context` parameter — use the one provided, not the workflow's context
- Inputs and outputs must be serializable to JSON
- Cannot start or enqueue workflows from within steps
- Calling a step from within another step makes the inner call part of the outer step's execution

When to use steps:
- API calls to external services
- File system operations
- Random number generation
- Getting current time
- Any non-deterministic operation

Reference: [DBOS Steps](https://docs.dbos.dev/golang/tutorials/step-tutorial)
