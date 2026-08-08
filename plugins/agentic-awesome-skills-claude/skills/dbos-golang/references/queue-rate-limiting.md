---
title: Rate Limit Queue Execution
impact: HIGH
impactDescription: Prevents overwhelming external APIs with too many requests
tags: queue, rate-limit, throttle, api
---

## Rate Limit Queue Execution

Set rate limits on a queue to control how many workflows start in a given period. Rate limits are global across all DBOS processes.

**Incorrect (no rate limiting):**

```go
queue := dbos.NewWorkflowQueue(ctx, "llm_tasks")
// Could send hundreds of requests per second to a rate-limited API
```

**Correct (rate-limited queue):**

```go
queue := dbos.NewWorkflowQueue(ctx, "llm_tasks",
	dbos.WithRateLimiter(&dbos.RateLimiter{
		Limit:  50,
		Period: 30 * time.Second,
	}),
)
```

This queue starts at most 50 workflows per 30 seconds.

**Combining rate limiting with concurrency:**

```go
// At most 5 concurrent and 50 per 30 seconds
queue := dbos.NewWorkflowQueue(ctx, "api_tasks",
	dbos.WithWorkerConcurrency(5),
	dbos.WithRateLimiter(&dbos.RateLimiter{
		Limit:  50,
		Period: 30 * time.Second,
	}),
)
```

Common use cases:
- LLM API rate limiting (OpenAI, Anthropic, etc.)
- Third-party API throttling
- Preventing database overload

Reference: [Rate Limiting](https://docs.dbos.dev/golang/tutorials/queue-tutorial#rate-limiting)
