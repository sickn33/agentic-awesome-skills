---
title: Use Queues for Concurrent Workflows
impact: HIGH
impactDescription: Queues provide managed concurrency and flow control
tags: queue, concurrency, enqueue, workflow
---

## Use Queues for Concurrent Workflows

Queues run many workflows concurrently with managed flow control. Use them when you need to control how many workflows run at once.

**Incorrect (uncontrolled concurrency):**

```go
// Starting many workflows without control - could overwhelm resources
for _, task := range tasks {
	dbos.RunWorkflow(ctx, processTask, task)
}
```

**Correct (using a queue):**

```go
// Create queue before Launch()
queue := dbos.NewWorkflowQueue(ctx, "task_queue")

func processAllTasks(ctx dbos.DBOSContext, tasks []string) ([]string, error) {
	var handles []dbos.WorkflowHandle[string]
	for _, task := range tasks {
		handle, err := dbos.RunWorkflow(ctx, processTask, task,
			dbos.WithQueue(queue.Name),
		)
		if err != nil {
			return nil, err
		}
		handles = append(handles, handle)
	}
	// Wait for all tasks
	var results []string
	for _, h := range handles {
		result, err := h.GetResult()
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}
```

Queues process workflows in FIFO order. All queues must be created with `dbos.NewWorkflowQueue` before `Launch()`.

Reference: [DBOS Queues](https://docs.dbos.dev/golang/tutorials/queue-tutorial)
