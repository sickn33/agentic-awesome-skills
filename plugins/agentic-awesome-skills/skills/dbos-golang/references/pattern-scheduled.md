---
title: Create Scheduled Workflows
impact: MEDIUM
impactDescription: Enables recurring tasks with exactly-once-per-interval guarantees
tags: pattern, scheduled, cron, recurring
---

## Create Scheduled Workflows

Use `dbos.WithSchedule` when registering a workflow to run it on a cron schedule. Each scheduled invocation runs exactly once per interval.

**Incorrect (manual scheduling with goroutine):**

```go
// Manual scheduling is not durable and misses intervals during downtime
go func() {
	for {
		generateReport()
		time.Sleep(60 * time.Second)
	}
}()
```

**Correct (using WithSchedule):**

```go
// Scheduled workflow must accept time.Time as input
func everyThirtySeconds(ctx dbos.DBOSContext, scheduledTime time.Time) (string, error) {
	fmt.Println("Running scheduled task at:", scheduledTime)
	return "done", nil
}

func dailyReport(ctx dbos.DBOSContext, scheduledTime time.Time) (string, error) {
	_, err := dbos.RunAsStep(ctx, func(ctx context.Context) (string, error) {
		return generateReport()
	}, dbos.WithStepName("generateReport"))
	return "report generated", err
}

func main() {
	ctx, _ := dbos.NewDBOSContext(context.Background(), config)
	defer dbos.Shutdown(ctx, 30*time.Second)

	dbos.RegisterWorkflow(ctx, everyThirtySeconds,
		dbos.WithSchedule("*/30 * * * * *"),
	)
	dbos.RegisterWorkflow(ctx, dailyReport,
		dbos.WithSchedule("0 0 9 * * *"), // 9 AM daily
	)

	dbos.Launch(ctx)
	select {} // Block forever
}
```

Scheduled workflows must accept exactly one parameter of type `time.Time` representing the scheduled execution time.

DBOS crontab uses 6 fields with second precision:
```text
┌────────────── second
│ ┌──────────── minute
│ │ ┌────────── hour
│ │ │ ┌──────── day of month
│ │ │ │ ┌────── month
│ │ │ │ │ ┌──── day of week
* * * * * *
```

Reference: [Scheduled Workflows](https://docs.dbos.dev/golang/tutorials/workflow-tutorial#scheduled-workflows)
