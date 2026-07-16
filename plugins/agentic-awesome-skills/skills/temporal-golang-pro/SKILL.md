---
name: temporal-golang-pro
description: "Use when building durable distributed systems with Temporal Go SDK. Covers deterministic workflow rules, mTLS worker configs, and advanced patterns."
risk: safe
source: self
date_added: "2026-02-27"
---

# Temporal Go SDK (temporal-golang-pro)

## Overview

Expert-level guide for building resilient, scalable, and deterministic distributed systems using the Temporal Go SDK. This skill transforms vague orchestration requirements into production-grade Go implementations, focusing on durable execution, strict determinism, and enterprise-scale worker configuration.

## When to Use This Skill

- **Designing Distributed Systems**: When building microservices that require durable state and reliable orchestration.
- **Implementing Complex Workflows**: Using the Go SDK to handle long-running processes (days/months) or complex Saga patterns.
- **Optimizing Performance**: When workers need fine-tuned concurrency, mTLS security, or custom interceptors.
- **Ensuring Reliability**: Implementing idempotent activities, graceful error handling, and sophisticated retry policies.
- **Maintenance & Evolution**: Versioning running workflows or performing zero-downtime worker updates.

## Do not use this skill when

- Using Temporal with other SDKs (Python, Java, TypeScript) - refer to their specific `-pro` skills.
- The task is a simple request/response without durability or coordination needs.
- High-level design without implementation (use `workflow-orchestration-patterns`).

## Step-by-Step Guide

1.  **Gather Context**: Proactively ask for:
    - Target **Temporal Cluster** (Cloud vs. Self-hosted) and **Namespace**.
    - **Task Queue** names and expected throughput.
    - **Security requirements** (mTLS paths, authentication).
    - **Failure modes** and desired retry/timeout policies.
2.  **Verify Determinism**: Before suggesting workflow code, verify against these **5 Rules**:
    - No native Go concurrency (goroutines).
    - No native time (`time.Now`, `time.Sleep`).
    - No non-deterministic map iteration (must sort keys).
    - No direct external I/O or network calls.
    - No non-deterministic random numbers.
3.  **Implement Incrementally**: Start with shared Protobuf/Data classes, then Activities, then Workflows, and finally Workers.
4.  **Leverage Resources**: If the implementation requires advanced patterns (Sagas, Interceptors, Replay Testing), explicitly refer to the implementation playbook and testing strategies.

## Capabilities

### Go SDK Implementation

- **Worker Management**: Deep knowledge of `worker.Options`, including `MaxConcurrentActivityTaskPollers`, `WorkerStopTimeout`, and `StickyScheduleToStartTimeout`.
- **Interceptors**: Implementing Client, Worker, and Workflow interceptors for cross-cutting concerns (logging, tracing, auth).
- **Custom Data Converters**: Integrating Protobuf, encrypted payloads, or custom JSON marshaling.

### Advanced Workflow Patterns

- **Durable Concurrency**: Using `workflow.Go`, `workflow.Channel`, and `workflow.Selector` instead of native primitives.
- **Versioning**: Implementing safe code evolution using `workflow.GetVersion` and `workflow.GetReplaySafeLogger`.
- **Large-scale Processing**: Pattern for `ContinueAsNew` to manage history size limits (defaults: 50MB or 50K events).
- **Child Workflows**: Managing lifecycle, cancellation, and parent-child signal propagation.

### Testing & Observability

- **Testsuite Mastery**: Using `WorkflowTestSuite` for unit and functional testing with deterministic time control.
- **Mocking**: Sophisticated activity and child workflow mocking strategies.
- **Replay Testing**: Validating code changes against production event histories.
- **Metrics**: Configuring Prometheus/OpenTelemetry exporters for worker performance tracking.

## Examples

### Example 1: Versioned Workflow (Deterministic)

```go
// Note: imports omitted. Requires 'go.temporal.io/sdk/workflow', 'go.temporal.io/sdk/temporal', and 'time'.
func SubscriptionWorkflow(ctx workflow.Context, userID string) error {
    // 1. Versioning for logic evolution (v1 = DefaultVersion)
    v := workflow.GetVersion(ctx, "billing_logic", workflow.DefaultVersion, 2)

    for i := 0; i < 12; i++ {
        ao := workflow.ActivityOptions{
            StartToCloseTimeout: 5 * time.Minute,
            RetryPolicy: &temporal.RetryPolicy{MaximumAttempts: 3},
        }
        ctx = workflow.WithActivityOptions(ctx, ao)

        // 2. Activity Execution (Always handle errors)
        err := workflow.ExecuteActivity(ctx, ChargePaymentActivity, userID).Get(ctx, nil)
        if err != nil {
            workflow.GetLogger(ctx).Error("Payment failed", "Error", err)
            return err
        }

        // 3. Durable Sleep (Time-skipping safe)
        sleepDuration := 30 * 24 * time.Hour
        if v >= 2 {
            sleepDuration = 28 * 24 * time.Hour
        }

        if err := workflow.Sleep(ctx, sleepDuration); err != nil {
            return err
        }
    }
    return nil
}
```

### Example 2: Full mTLS Worker Setup

```go
func RunSecureWorker() error {
    // 1. Load Client Certificate and Key
    cert, err := tls.LoadX509KeyPair("client.pem", "client.key")
    if err != nil {
        return fmt.Errorf("failed to load client keys: %w", err)
    }

    // 2. Load CA Certificate for Server verification (Proper mTLS)
    caPem, err := os.ReadFile("ca.pem")
    if err != nil {
        return fmt.Errorf("failed to read CA cert: %w", err)
    }
    certPool := x509.NewCertPool()
    if !certPool.AppendCertsFromPEM(caPem) {
        return fmt.Errorf("failed to parse CA cert")
    }

    // 3. Dial Cluster with full TLS config
    c, err := client.Dial(client.Options{
        HostPort:  "temporal.example.com:7233",
        Namespace: "production",
        ConnectionOptions: client.ConnectionOptions{
            TLS: &tls.Config{
                Certificates: []tls.Certificate{cert},
                RootCAs:      certPool,
            },
        },
    })
    if err != nil {
        return fmt.Errorf("failed to dial temporal: %w", err)
    }
    defer c.Close()

    w := worker.New(c, "payment-queue", worker.Options{})
    w.RegisterWorkflow(SubscriptionWorkflow)

    if err := w.Run(worker.InterruptCh()); err != nil {
        return fmt.Errorf("worker run failed: %w", err)
    }
    return nil
}
```

### Example 3: Selector & Signal Integration

```go
func ApprovalWorkflow(ctx workflow.Context) (string, error) {
    var approved bool
    signalCh := workflow.GetSignalChannel(ctx, "approval-signal")

    // Use Selector to wait for multiple async events
    s := workflow.NewSelector(ctx)
    s.AddReceive(signalCh, func(c workflow.ReceiveChannel, _ bool) {
        c.Receive(ctx, &approved)
    })

    // Add 72-hour timeout timer
    s.AddReceive(workflow.NewTimer(ctx, 72*time.Hour).GetChannel(), func(c workflow.ReceiveChannel, _ bool) {
        approved = false
    })

    s.Select(ctx)

    if !approved {
        return "rejected", nil
    }
    return "approved", nil
}
```

## Best Practices

- ✅ **Do:** Always handle errors from `ExecuteActivity` and `client.Dial`.
- ✅ **Do:** Use `workflow.Go` and `workflow.Channel` for concurrency.
- ✅ **Do:** Sort map keys before iteration to maintain determinism.
- ✅ **Do:** Use `activity.RecordHeartbeat` for activities lasting > 1 minute.
- ✅ **Do:** Test logic compatibility using `replayer.ReplayWorkflowHistoryFromJSON`.
- ❌ **Don't:** Swallow errors with `_` or `log.Fatal` in production workers.
- ❌ **Don't:** Perform direct Network/Disk I/O inside a Workflow function.
- ❌ **Don't:** Rely on native `time.Now()` or `rand.Int()`.
- ❌ **Don't:** Apply this to simple cron jobs that don't require durability.

## Troubleshooting

- **Panic: Determinism Mismatch**: Usually caused by logic changes without `workflow.GetVersion` or non-deterministic code (e.g., native maps).
- **Error: History Size Exceeded**: History limit reached (default 50K events). Ensure `ContinueAsNew` is implemented.
- **Worker Hang**: Check `WorkerStopTimeout` and ensure all activities handle context cancellation.

## Limitations

- Does not cover Temporal Cloud UI navigation or TLS certificate provisioning workflows.
- Does not cover Temporal Java, Python, or TypeScript SDKs; refer to their dedicated `-pro` skills.
- Assumes Temporal Server v1.20+ and Go SDK v1.25+; older SDK versions may have different APIs.
- Does not cover experimental Temporal features (e.g., Nexus, Multi-cluster Replication).
- Does not address global namespace configuration or multi-region failover setup.
- Does not cover Temporal Worker versioning via the `worker-versioning` feature flag (experimental).

## Resources

- [Implementation Playbook](resources/implementation-playbook.md) - Deep dive into Go SDK patterns.
- [Testing Strategies](resources/testing-strategies.md) - Unit, Replay, and Integration testing for Go.
- [Temporal Go SDK Reference](https://pkg.go.dev/go.temporal.io/sdk)
- [Temporal Go Samples](https://github.com/temporalio/samples-go)

## Related Skills

- `grpc-golang` - Internal transport protocol and Protobuf design.
- `golang-pro` - General Go performance tuning and advanced syntax.
- `workflow-orchestration-patterns` - Language-agnostic orchestration strategy.
