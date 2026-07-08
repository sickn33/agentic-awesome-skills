# Temporal Go Implementation Playbook

This playbook provides production-ready patterns and deep technical guidance for implementing durable orchestration with the Temporal Go SDK.

## Table of Contents

1. [The Deterministic Commandments](#the-deterministic-commandments)
2. [Workflow Versioning](#workflow-versioning)
3. [Activity Design & Idempotency](#activity-design--idempotency)
4. [Worker Configuration for Scale](#worker-configuration-for-scale)
5. [Context & Heartbeating](#context--heartbeating)
6. [Interceptors & Observability](#interceptors--observability)

---

## 1. The Deterministic Commandments

In Go, workflows are state machines that must replay identically. Violating these rules causes "Determinism Mismatch" errors.

### ❌ Never Use Native Go Concurrency

- **Wrong:** `go myFunc()`
- **Right:** `workflow.Go(ctx, func(ctx workflow.Context) { ... })`
- **Why:** `workflow.Go` allows the Temporal orchestrator to track and pause goroutines during replay.

### ❌ Never Use Native Time

- **Wrong:** `time.Now()`, `time.Sleep(d)`, `time.After(d)`
- **Right:** `workflow.Now(ctx)`, `workflow.Sleep(ctx, d)`, `workflow.NewTimer(ctx, d)`

### ❌ Never Use Non-Deterministic Map Iteration

- **Wrong:** `for k, v := range myMap { ... }`
- **Right:** Collect keys, sort them, then iterate.
- ```go
  keys := make([]string, 0, len(myMap))
  for k := range myMap { keys = append(keys, k) }
  sort.Strings(keys)
  for _, k := range keys { v := myMap[k]; ... }
  ```

### ❌ Never Perform Direct External I/O

- **Wrong:** `http.Get("https://api.example.com")` or `os.ReadFile("data.txt")` inside a workflow.
- **Right:** Wrap all I/O in an Activity and call it with `workflow.ExecuteActivity`.
- **Why:** External calls are non-deterministic; their results change between replays.

### ❌ Never Use Non-Deterministic Random Numbers

- **Wrong:** `rand.Int()`, `uuid.New()` inside a workflow.
- **Right:** Pass random seeds or UUIDs as workflow input arguments, or generate them inside an Activity.
- **Why:** `rand.Int()` produces different values on each replay, causing a determinism mismatch.

---

## 2. Workflow Versioning

When you need to change logic in a running workflow, you MUST use `workflow.GetVersion`.

### Pattern: Safe Logic Update

```go
const VersionV2 = 1

func MyWorkflow(ctx workflow.Context) error {
    v := workflow.GetVersion(ctx, "ChangePaymentStep", workflow.DefaultVersion, VersionV2)

    if v == workflow.DefaultVersion {
        // Old logic: kept alive until all pre-existing workflow runs complete.
        return workflow.ExecuteActivity(ctx, OldActivity).Get(ctx, nil)
    }
    // New logic: all new and resumed workflow runs use this path.
    return workflow.ExecuteActivity(ctx, NewActivity).Get(ctx, nil)
}
```

### Pattern: Cleanup After Full Migration

Once you have confirmed **no running workflow instances** are on `DefaultVersion` (verify via Temporal Web UI or `tctl`), you can safely remove the old branch:

```go
func MyWorkflow(ctx workflow.Context) error {
    // Pin minimum version to V2; histories from before the migration will
    // fail the determinism check (replay error) if they replay against this code.
    // Only remove the old branch after confirming zero running instances on DefaultVersion.
    workflow.GetVersion(ctx, "ChangePaymentStep", VersionV2, VersionV2)
    return workflow.ExecuteActivity(ctx, NewActivity).Get(ctx, nil)
}
```

---

## 3. Activity Design & Idempotency

Activities can execute multiple times. They must be idempotent.

### Pattern: Upsert instead of Insert

Instead of a simple `INSERT`, use `UPSERT` or "Check-then-Act" with an idempotency key (like `WorkflowID` or `RunID`).

```go
func (a *Activities) ProcessPayment(ctx context.Context, req PaymentRequest) error {
    info := activity.GetInfo(ctx)
    // Use info.WorkflowExecution.ID as part of your idempotency key in DB
    return a.db.UpsertPayment(req, info.WorkflowExecution.ID)
}
```

---

## 4. Worker Configuration for Scale

### Optimized Worker Options

```go
w := worker.New(c, "task-queue", worker.Options{
    MaxConcurrentActivityExecutionSize:      100, // Limit based on resource constraints
    MaxConcurrentWorkflowTaskExecutionSize:  50,
    WorkerActivitiesPerSecond:               200, // Rate limit for this worker cluster
    WorkerStopTimeout:                       time.Minute, // Allow activities to finish
})
```

---

## 5. Context & Heartbeating

### Propagating Metadata

Use `Workflow Interceptors` or custom `Header` propagation to pass tracing ID or user identity along the call chain.

### Activity Heartbeating

Mandatory for long-running activities to detect worker crashes before the `StartToCloseTimeout` expires.

```go
func LongRunningActivity(ctx context.Context) error {
    for i := 0; i < 100; i++ {
        activity.RecordHeartbeat(ctx, i) // Report progress

        select {
        case <-ctx.Done():
            return ctx.Err() // Handle cancellation
        default:
            // Do work
        }
    }
    return nil
}
```

---

## 6. Interceptors & Observability

### Custom Workflow Interceptors

Use interceptors to inject structured logging (Zap/Slog) or perform global error classification.
The interceptor must be wired via a root `WorkerInterceptor` that Temporal instantiates per workflow task.

```go
// Step 1: Implement the root WorkerInterceptor (registered on worker.Options)
type MyWorkerInterceptor struct {
    interceptor.WorkerInterceptorBase
}

func (w *MyWorkerInterceptor) InterceptWorkflow(
    ctx workflow.Context,
    next interceptor.WorkflowInboundInterceptor,
) interceptor.WorkflowInboundInterceptor {
    return &myWorkflowInboundInterceptor{next: next}
}

// Step 2: Implement the per-workflow inbound interceptor
type myWorkflowInboundInterceptor struct {
    interceptor.WorkflowInboundInterceptorBase
    next interceptor.WorkflowInboundInterceptor
}

func (i *myWorkflowInboundInterceptor) ExecuteWorkflow(
    ctx workflow.Context,
    input *interceptor.ExecuteWorkflowInput,
) (interface{}, error) {
    workflow.GetLogger(ctx).Info("Workflow started", "type", workflow.GetInfo(ctx).WorkflowType.Name)
    result, err := i.next.ExecuteWorkflow(ctx, input)
    if err != nil {
        workflow.GetLogger(ctx).Error("Workflow failed", "error", err)
    }
    return result, err
}

// Step 3: Register on the worker
w := worker.New(c, "task-queue", worker.Options{
    Interceptors: []interceptor.WorkerInterceptor{&MyWorkerInterceptor{}},
})
```

---

## Anti-Patterns to Avoid

1.  **Massive Workflows:** Keeping too much state in a single workflow. Use `ContinueAsNew` if event history exceeds 50K events.
2.  **Fat Activities:** Doing orchestration inside an activity. Activities should be unit-of-work.
3.  **Global Variables:** Using global variables in workflows. They will not be preserved across worker restarts.
4.  **Native Concurrency in Workflows:** Using `go` routines, `mutexes`, or `channels` will cause race conditions and determinism errors during replay.

---

## 7. SideEffect and MutableSideEffect

Use `workflow.SideEffect` when you need a **single non-deterministic value** captured once and replayed identically — for example, generating a UUID or reading a one-time config snapshot inside a workflow.

```go
// SideEffect: called only on first execution; result is recorded in history and
// replayed deterministically on all subsequent replays.
// Requires: "go.temporal.io/sdk/workflow"
encodedID := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
    return uuid.NewString()
})

var requestID string
if err := encodedID.Get(&requestID); err != nil {
    return err
}
```

**When to use `MutableSideEffect`**: When the value may change across workflow tasks but must still be deterministic per history event (e.g., a feature flag that updates while the workflow is running).

```go
// MutableSideEffect: re-evaluated on each workflow task, but only recorded in
// history when the value changes from the previous recorded value.
encodedFlag := workflow.MutableSideEffect(ctx, "feature-flag-v2",
    func(ctx workflow.Context) interface{} {
        return featureFlagEnabled // read from workflow-local state, NOT an external call
    },
    func(a, b interface{}) bool { return a.(bool) == b.(bool) },
)
var enabled bool
encodedFlag.Get(&enabled)
```

> **Warning:** Do NOT use `SideEffect` as a workaround to call external APIs (HTTP, DB) inside a workflow. All external I/O must still go through Activities.
