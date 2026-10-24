---
name: dbos-golang
description: "Guide for building reliable, fault-tolerant Go applications with DBOS durable workflows. Use when adding DBOS to existing Go code, creating workflows and steps, or using queues for concurrency control."
risk: critical
source: "https://docs.dbos.dev/"
date_added: "2026-02-27"
---

# DBOS Go Best Practices

Guide for building reliable, fault-tolerant Go applications with DBOS durable workflows.

## When to Use
Reference these guidelines when:
- Adding DBOS to existing Go code
- Creating workflows and steps
- Using queues for concurrency control
- Implementing workflow communication (events, messages, streams)
- Configuring and launching DBOS applications
- Using the DBOS Client from external applications
- Testing DBOS applications

## Reliability and version boundaries

Pin and verify the DBOS Go SDK version before adapting these illustrative fragments; the current SDK documentation uses dbos.Context while this snapshot uses dbos.DBOSContext. Helpers, imports, registrations and application-specific functions are omitted. Do not claim snippets compile as a complete app. Check every returned error before using a handle or result. Workflow IDs and checkpointed steps do not make external payment/API side effects exactly-once: a crash after the remote action but before checkpointing can replay it. Use provider idempotency keys and reconciliation. Authenticate and deduplicate webhook messages before Send; scope workflow access to the caller. Queue limits govern workflow starts, not every request/retry inside a workflow. Cancellation cannot undo committed effects. Keep workflow inputs, outputs and error payloads free of secrets/unnecessary personal data. Do not enable admin endpoints, schedules, paid calls or management mutations without authorization.

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Lifecycle | CRITICAL | `lifecycle-` |
| 2 | Workflow | CRITICAL | `workflow-` |
| 3 | Step | HIGH | `step-` |
| 4 | Queue | HIGH | `queue-` |
| 5 | Communication | MEDIUM | `comm-` |
| 6 | Pattern | MEDIUM | `pattern-` |
| 7 | Testing | LOW-MEDIUM | `test-` |
| 8 | Client | MEDIUM | `client-` |
| 9 | Advanced | LOW | `advanced-` |

## Critical Rules

### Installation

Install the DBOS Go module:

```bash
go get github.com/dbos-inc/dbos-transact-golang/dbos@latest
```

### DBOS Configuration and Launch

A DBOS application MUST create a context, register workflows, and launch before running any workflows:

```go
package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/dbos-inc/dbos-transact-golang/dbos"
)

func main() {
	ctx, err := dbos.NewDBOSContext(context.Background(), dbos.Config{
		AppName:     "my-app",
		DatabaseURL: os.Getenv("DBOS_SYSTEM_DATABASE_URL"),
	})
	if err != nil {
		log.Fatal(err)
	}
	defer dbos.Shutdown(ctx, 30*time.Second)

	dbos.RegisterWorkflow(ctx, myWorkflow)

	if err := dbos.Launch(ctx); err != nil {
		log.Fatal(err)
	}
}
```

### Workflow and Step Structure

Workflows are comprised of steps. Any function performing complex operations or accessing external services must be run as a step using `dbos.RunAsStep`:

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
	result, err := dbos.RunAsStep(ctx, fetchData, dbos.WithStepName("fetchData"))
	if err != nil {
		return "", err
	}
	return result, nil
}
```

### Key Constraints

- Do NOT start or enqueue workflows from within steps
- Do NOT use uncontrolled goroutines to start workflows - use `dbos.RunWorkflow` with queues or `dbos.Go`/`dbos.Select` for concurrent steps
- Workflows MUST be deterministic - non-deterministic operations go in steps
- Do NOT modify global variables from workflows or steps
- All workflows and queues MUST be registered before calling `Launch()`

## How to Use

Read individual rule files for detailed explanations and examples:

```
references/lifecycle-config.md
references/workflow-determinism.md
references/queue-concurrency.md
```

## References

- https://docs.dbos.dev/
- https://github.com/dbos-inc/dbos-transact-golang

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
