# Details (moved from SKILL.md)

> Extended reference content for `opentelemetry`, kept under `references/` so the entrypoint stays within the audit budget.

## Sampling Strategies

```yaml
# Tail-based sampling config (in collector)
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      # Always keep error traces
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Always keep slow traces (> 2s)
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 2000

      # Sample 10% of successful traces
      - name: normal-traffic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

      # Always keep traces with specific attributes
      - name: important-users
        type: string_attribute
        string_attribute:
          key: user.tier
          values: [enterprise, premium]

      # Rate limit per service to prevent one service from dominating
      - name: rate-limit
        type: rate_limiting
        rate_limiting:
          spans_per_second: 500
```


## Best Practices

- Use tail-based sampling for high-volume production traces.
- Tag telemetry with `service.name`, `service.version`, and `deployment.environment`.
- Drop noisy attributes early in the collector.
- Keep metric label cardinality low for stable query performance.
- Use resource detectors to automatically populate cloud metadata.
- Separate collector pools for traces vs metrics if volume requires it.
- Set memory_limiter on every collector pipeline to prevent OOM.
- Use the contrib collector image for production (includes more receivers/exporters).


## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| No traces arriving at backend | Collector logs for export errors | Verify endpoint URL and network policy |
| Missing spans in a trace | Propagation headers stripped by proxy | Configure proxy to pass `traceparent` header |
| High memory on collector | Too many in-flight traces for tail sampling | Reduce `num_traces` or increase memory limit |
| Metric cardinality explosion | Unbounded label values (user IDs, URLs) | Add transform processor to normalize values |
| Auto-instrumentation not working | Pod annotation missing or operator not running | Verify operator is healthy and annotation is correct |
| Duplicate metrics | Both SDK and auto-instrumentation active | Use only one instrumentation method per signal |


## Related Skills

- prometheus-grafana (`prometheus-grafana`) - Dashboarding and alerting
- datadog (`datadog`) - Managed observability backend
- alerting-oncall (`alerting-oncall`) - On-call routing and escalation
- rag-observability-evals (`rag-observability-evals`) - RAG-specific observability
- agent-observability (`agent-observability`) - AI agent tracing

