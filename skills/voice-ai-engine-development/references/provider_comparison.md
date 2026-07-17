# Provider Evaluation Worksheet

Provider capabilities, model names, pricing, quotas, regions, and data terms change too often for a static ranking. Use this worksheet with current primary documentation and record the review date.

## Required Evidence

For every transcription, model, and synthesis candidate, record:

- provider, product, exact API and model or voice ID;
- documentation and pricing URLs plus access date;
- supported input/output formats, sample rates, streaming mode, and cancellation behavior;
- measured first-result, first-audio, and end-to-end latency on representative audio;
- accuracy or quality evaluation on consented, domain-representative samples;
- language, accent, diarization, pronunciation, and accessibility requirements;
- region availability, subprocessors, training/data-use controls, encryption, retention, deletion, and compliance terms;
- concurrency, rate, duration, payload, and spend limits for the actual account tier;
- failure behavior, retries, idempotency, fallback, health status, and support path;
- voice rights, cloning consent, disclosure, and prohibited-use rules;
- total unit economics including network, orchestration, storage, and fallback costs.

## Selection Process

1. Define acceptance thresholds before testing.
2. Use the same consented test set and network conditions for each candidate.
3. Separate provider measurements from marketing claims.
4. Test interruption, cancellation, timeout, malformed audio, quota exhaustion, provider outage, and partial response behavior.
5. Verify that failover does not silently change privacy region, retention, voice, safety policy, or cost.
6. Obtain security, privacy, legal, and product approval appropriate to the use case.
7. Pin chosen contracts and model IDs in configuration and monitor lifecycle notices.

## Configuration Shape

```python
provider_config = {
    "provider": "selected-provider",
    "model": "explicit-current-model-id",
    "region": "approved-region",
    "audio": {"encoding": "linear16", "sample_rate_hz": 16000},
    "timeouts": {"connect_seconds": 5, "operation_seconds": 30},
    "limits": {"max_session_seconds": 900, "max_concurrent_sessions": 5},
}
```

Load credentials from the deployment's secret manager; never place them in this configuration, source files, URLs, logs, or transcripts.

## Decision Record

Document the selected provider and rejected alternatives, evidence gaps, residual risks, owner, reevaluation date, lifecycle-monitoring source, and tested fallback. Terms such as "fastest," "highest quality," "enterprise-grade," or "cheapest" require dated comparative evidence for the specific workload and account tier.
