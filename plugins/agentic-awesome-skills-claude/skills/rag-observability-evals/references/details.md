# Details (moved from SKILL.md)

> Extended reference content for `rag-observability-evals`, kept under `references/` so the entrypoint stays within the audit budget.

## Alerting Strategy

```yaml
# rag-alerts.yaml
groups:
  - name: rag-quality-alerts
    rules:
      - alert: GroundednessDropped
        expr: rag_groundedness_score < 0.75
        for: 10m
        labels:
          severity: sev2
        annotations:
          summary: "Groundedness score dropped below 0.75 for {{ $labels.route }}"

      - alert: HallucinationSpike
        expr: |
          rate(rag_hallucination_detected_total[15m])
          / rate(rag_requests_total[15m]) > 0.10
        for: 5m
        labels:
          severity: sev1

      - alert: IndexStale
        expr: rag_index_staleness_seconds > 86400
        for: 5m
        labels:
          severity: sev3
        annotations:
          summary: "Index {{ $labels.index_name }} not updated in 24h"

      - alert: HighFallbackRate
        expr: |
          rate(rag_fallback_triggered_total[10m])
          / rate(rag_requests_total[10m]) > 0.20
        for: 10m
        labels:
          severity: sev2

      - alert: RetrievalLatencyHigh
        expr: |
          histogram_quantile(0.95,
            rate(rag_retrieval_duration_seconds_bucket[5m])
          ) > 2.0
        for: 5m
        labels:
          severity: sev2
```


## Practical Guardrails

- Force citations for high-risk domains.
- Return abstain/fallback when confidence is below threshold.
- Re-rank retrieved chunks before final generation.
- Use query rewriting only with strict regression tests.


## Incident Triage Checklist

| Symptom | Check First | Check Second |
|---------|-------------|--------------|
| Groundedness dropped | Embedding model change? | Chunking/indexing logic change? |
| Retrieval returning irrelevant docs | Index freshness and document count | Embedding model version mismatch |
| Latency spike in retrieval | Vector DB connection pool and load | Index size growth beyond threshold |
| Cost per answer increasing | Token usage per stage breakdown | Cache hit rate decline |
| Hallucination spike | Model version or temperature change | Context window overflow (truncated docs) |


## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|------------|
| RAGAS eval returns 0 for all metrics | Check dataset format matches expected schema | Ensure contexts are lists, not strings |
| Groundedness score unreliable | LLM judge inconsistency | Increase judge sample size, set temperature=0 |
| Index staleness alert firing | Ingestion pipeline failure | Check data source connectivity and ingestion logs |
| Retrieval recall dropping | Embedding drift after model update | Re-index corpus with current embedding model |
| High latency in generation | Context too large for model | Reduce top-k or add summarization step |


## Related Skills

- rag-infrastructure (`rag-infrastructure`) - Deploy robust RAG backends
- agent-observability (`agent-observability`) - Instrument requests, traces, and costs
- agent-evals (`agent-evals`) - Build repeatable eval suites
- ai-sre-incident-response (`ai-sre-incident-response`) - Incident response for quality regressions
- opentelemetry (`opentelemetry`) - Distributed tracing for RAG pipelines

