---
name: sre-dashboards
description: Design and operationalize SRE dashboards that surface reliability, latency,
  error, saturation, and capacity signals across services.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# SRE Dashboards

Build dashboards that help teams detect, triage, and prevent reliability incidents.

## When to Use This Skill

Use this skill when:
- Defining service-level dashboards for production systems
- Tracking SLO health and error-budget burn
- Creating incident command-center views
- Standardizing dashboard patterns across teams

## Prerequisites

- Metrics pipeline (Prometheus, OpenTelemetry, or vendor equivalent)
- Logs/traces linked to services and environments
- Agreed service taxonomy (team, service, tier, environment)

## Dashboard Architecture

Structure dashboards in layers:

1. **Executive Reliability View**: SLO attainment, incident counts, MTTR trends.
2. **Service Health View**: RED/USE metrics, dependency health, release markers.
3. **Deep-Dive View**: Per-endpoint latency, resource saturation, error categories.

Keep each view answer-oriented:
- *Are customers impacted?*
- *What changed?*
- *Where is the bottleneck?*

## Core SRE Panels

### Golden Signals

- **Latency**: p50/p95/p99 request duration by endpoint
- **Traffic**: request throughput and queue depth
- **Errors**: 5xx rate, failed jobs, timeout ratio
- **Saturation**: CPU, memory, disk I/O, thread/connection pool exhaustion

### SLO Panels

- Current SLI value (rolling windows: 5m, 1h, 24h, 30d)
- Error-budget remaining (%)
- Burn-rate panels (fast and slow windows)
- Multi-window burn alert status

### Change Correlation

- Deployment markers and config-change annotations
- Feature flag state overlays
- Upstream/downstream dependency error rates

## Example PromQL Snippets

```promql
# API error rate (%)
100 * sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))
```

```promql
# p95 latency by route
histogram_quantile(0.95,
  sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))
)
```

```promql
# Fast burn rate (5m / 1h)
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))
)
/
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  / sum(rate(http_requests_total[1h]))
)
```

## Operational Guidelines

- Use consistent color semantics (green=healthy, yellow=degrading, red=breach)
- Label units explicitly (ms, req/s, %, cores)
- Default time windows to incident-friendly ranges (15m, 1h, 6h, 24h)
- Minimize panel count per dashboard to reduce cognitive load
- Add runbook links directly in panel descriptions

## Troubleshooting

### Panel appears flat or empty

- Verify label cardinality and filters (`service`, `env`, `region`)
- Confirm scrape/ingest latency is within expected range
- Check metric rename regressions after instrumentation updates

### High cardinality slows dashboards

- Aggregate by stable dimensions (`service`, `route_group`) instead of raw IDs
- Use recording rules for expensive percentile and ratio queries
- Split deep-dive dashboards from NOC summary dashboards

## Related Skills

- prometheus-grafana (`prometheus-grafana`) - Dashboard implementation and PromQL
- opentelemetry (`opentelemetry`) - Standardized telemetry instrumentation
- alerting-oncall (`alerting-oncall`) - Reliability alert routing and escalation
- agent-observability (`agent-observability`) - AI workload reliability telemetry

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
