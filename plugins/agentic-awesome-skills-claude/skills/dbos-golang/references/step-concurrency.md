---
title: Run Concurrent Steps with Go and Select
impact: HIGH
impactDescription: Enables parallel execution of steps with durable checkpointing
tags: step, concurrency, goroutine, select, parallel
---

## Run Concurrent Steps with Go and Select

Use `dbos.Go` to run steps concurrently in goroutines and `dbos.Select` to durably select the first completed result. Both operations are checkpointed for recovery.

**Incorrect (raw goroutines without checkpointing):**

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	// Raw goroutines are not checkpointed - recovery breaks!
	ch := make(chan string, 2)
	go func() { ch <- callAPI1() }()
	go func() { ch <- callAPI2() }()
	return <-ch, nil
}
```

**Correct (using dbos.Go for concurrent steps):**

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	// Start steps concurrently
	ch1, err := dbos.Go(ctx, func(ctx context.Context) (string, error) {
		return callAPI1(ctx)
	}, dbos.WithStepName("api1"))
	if err != nil {
		return "", err
	}

	ch2, err := dbos.Go(ctx, func(ctx context.Context) (string, error) {
		return callAPI2(ctx)
	}, dbos.WithStepName("api2"))
	if err != nil {
		return "", err
	}

	// Wait for the first result (durable select)
	result, err := dbos.Select(ctx, []<-chan dbos.StepOutcome[string]{ch1, ch2})
	if err != nil {
		return "", err
	}
	return result, nil
}
```

**Waiting for all concurrent steps:**

```go
func myWorkflow(ctx dbos.DBOSContext, input string) ([]string, error) {
	ch1, _ := dbos.Go(ctx, step1, dbos.WithStepName("step1"))
	ch2, _ := dbos.Go(ctx, step2, dbos.WithStepName("step2"))
	ch3, _ := dbos.Go(ctx, step3, dbos.WithStepName("step3"))

	// Collect all results
	results := make([]string, 3)
	for i, ch := range []<-chan dbos.StepOutcome[string]{ch1, ch2, ch3} {
		outcome := <-ch
		if outcome.Err != nil {
			return nil, outcome.Err
		}
		results[i] = outcome.Result
	}
	return results, nil
}
```

Key behaviors:
- `dbos.Go` starts a step in a goroutine and returns a channel of `StepOutcome[R]`
- `dbos.Select` durably selects the first completed result and checkpoints which channel was selected
- On recovery, `Select` replays the same selection, maintaining determinism
- Steps started with `Go` follow the same retry and checkpointing rules as `RunAsStep`

Reference: [Concurrent Steps](https://docs.dbos.dev/golang/tutorials/workflow-tutorial#concurrent-steps)
