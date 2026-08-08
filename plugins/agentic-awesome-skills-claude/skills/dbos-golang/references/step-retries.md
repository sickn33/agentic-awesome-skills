---
title: Configure Step Retries for Transient Failures
impact: HIGH
impactDescription: Automatic retries handle transient failures without manual code
tags: step, retry, exponential-backoff, resilience
---

## Configure Step Retries for Transient Failures

Steps can automatically retry on failure with exponential backoff. This handles transient failures like network issues.

**Incorrect (manual retry logic):**

```go
func fetchData(ctx context.Context) (string, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		resp, err := http.Get("https://api.example.com")
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			return string(body), nil
		}
		lastErr = err
		time.Sleep(time.Duration(math.Pow(2, float64(attempt))) * time.Second)
	}
	return "", lastErr
}
```

**Correct (built-in retries with `dbos.RunAsStep`):**

```go
func fetchData(ctx context.Context) (string, error) {
	resp, err := http.Get("https://api.example.com")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return string(body), nil
}

func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	data, err := dbos.RunAsStep(ctx, fetchData,
		dbos.WithStepName("fetchData"),
		dbos.WithStepMaxRetries(10),
		dbos.WithBaseInterval(500*time.Millisecond),
		dbos.WithBackoffFactor(2.0),
		dbos.WithMaxInterval(5*time.Second),
	)
	return data, err
}
```

Retry parameters:
- `WithStepMaxRetries(n)`: Maximum retry attempts (default: `0` — no retries)
- `WithBaseInterval(d)`: Initial delay between retries (default: `100ms`)
- `WithBackoffFactor(f)`: Multiplier for exponential backoff (default: `2.0`)
- `WithMaxInterval(d)`: Maximum delay between retries (default: `5s`)

With defaults, retry delays are: 100ms, 200ms, 400ms, 800ms, 1.6s, 3.2s, 5s, 5s...

If all retries are exhausted, a `DBOSError` with code `MaxStepRetriesExceeded` is returned to the calling workflow.

Reference: [Configurable Retries](https://docs.dbos.dev/golang/tutorials/step-tutorial#configurable-retries)
