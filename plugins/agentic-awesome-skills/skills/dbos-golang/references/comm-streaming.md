---
title: Use Streams for Real-Time Data
impact: MEDIUM
impactDescription: Enables streaming results from long-running workflows
tags: communication, stream, real-time, channel
---

## Use Streams for Real-Time Data

Workflows can stream data to clients in real-time using `dbos.WriteStream`, `dbos.CloseStream`, and `dbos.ReadStream`/`dbos.ReadStreamAsync`. Useful for LLM output streaming or progress reporting.

**Incorrect (accumulating results then returning at end):**

```go
func processWorkflow(ctx dbos.DBOSContext, items []string) ([]string, error) {
	var results []string
	for _, item := range items {
		result, _ := dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
			return processItem(item)
		}, dbos.WithStepName("process"))
		results = append(results, result)
	}
	return results, nil // Client must wait for entire workflow to complete
}
```

**Correct (streaming results as they become available):**

```go
func processWorkflow(ctx dbos.DBOSContext, items []string) (string, error) {
	for _, item := range items {
		result, err := dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
			return processItem(item)
		}, dbos.WithStepName("process"))
		if err != nil {
			return "", err
		}
		dbos.WriteStream(ctx, "results", result)
	}
	dbos.CloseStream(ctx, "results") // Signal completion
	return "done", nil
}

// Read the stream synchronously (blocks until closed)
handle, _ := dbos.RunWorkflow(ctx, processWorkflow, items)
values, closed, err := dbos.ReadStreamstring, "results")
```

**Async stream reading with channels:**

```go
ch, err := dbos.ReadStreamAsyncstring, "results")
if err != nil {
	log.Fatal(err)
}
for sv := range ch {
	if sv.Err != nil {
		log.Fatal(sv.Err)
	}
	if sv.Closed {
		break
	}
	fmt.Println("Received:", sv.Value)
}
```

Key behaviors:
- A workflow may have any number of streams, each identified by a unique key
- Streams are immutable and append-only
- Writes from workflows happen exactly-once
- Streams are automatically closed when the workflow terminates
- `ReadStream` blocks until the workflow is inactive or the stream is closed
- `ReadStreamAsync` returns a channel of `StreamValue[R]` for non-blocking reads

Reference: [Workflow Streaming](https://docs.dbos.dev/golang/tutorials/workflow-communication#workflow-streaming)
