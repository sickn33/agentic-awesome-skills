---
title: Deduplicate Queued Workflows
impact: HIGH
impactDescription: Prevents duplicate workflow executions
tags: queue, deduplication, idempotent, duplicate
---

## Deduplicate Queued Workflows

Set a deduplication ID when enqueuing to prevent duplicate workflow executions. If a workflow with the same deduplication ID is already enqueued or executing, a `DBOSError` with code `QueueDeduplicated` is returned.

**Incorrect (no deduplication):**

```go
// Multiple calls could enqueue duplicates
func handleClick(ctx dbos.DBOSContext, userID, task string) error {
	_, err := dbos.RunWorkflow(ctx, processTask, task,
		dbos.WithQueue(queue.Name),
	)
	return err
}
```

**Correct (with deduplication):**

```go
func handleClick(ctx dbos.DBOSContext, userID, task string) error {
	_, err := dbos.RunWorkflow(ctx, processTask, task,
		dbos.WithQueue(queue.Name),
		dbos.WithDeduplicationID(userID),
	)
	if err != nil {
		// Check if it was deduplicated
		var dbosErr *dbos.DBOSError
		if errors.As(err, &dbosErr) && dbosErr.Code == dbos.QueueDeduplicated {
			fmt.Println("Task already in progress for user:", userID)
			return nil
		}
		return err
	}
	return nil
}
```

Deduplication is per-queue. The deduplication ID is active while the workflow has status `ENQUEUED` or `PENDING`. Once the workflow completes, a new workflow with the same deduplication ID can be enqueued.

This is useful for:
- Ensuring one active task per user
- Preventing duplicate form submissions
- Idempotent event processing

Reference: [Deduplication](https://docs.dbos.dev/golang/tutorials/queue-tutorial#deduplication)
