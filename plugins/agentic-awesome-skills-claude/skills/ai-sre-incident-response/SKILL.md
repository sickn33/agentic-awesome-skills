---
name: ai-sre-incident-response
description: Build AI-focused SRE incident response practices for LLM outages, degraded
  quality, runaway cost events, and safety regressions.
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

# AI SRE Incident Response

Apply SRE rigor to AI systems where incidents include quality regressions, unsafe outputs, and budget explosions.

## When to Use This Skill

- An LLM endpoint begins returning degraded or hallucinated answers
- Token spend spikes beyond budget thresholds
- A model provider goes down and traffic must fail over
- Safety guardrails fire at abnormal rates
- A new model deployment causes latency or accuracy regression

## Prerequisites

- Prometheus and Alertmanager deployed with scrape targets for AI services
- Grafana dashboards for golden signals (latency, error rate, cost, quality)
- On-call rotation configured in PagerDuty, Opsgenie, or equivalent
- Runbook repository accessible to responders
- Rollback mechanism for model and prompt versions (GitOps or feature flags)

## AI Incident Classes

- **Availability incident**: model/provider unavailable, timeout storm.
- **Quality incident**: answer accuracy or tool success drops below SLO.
- **Safety incident**: harmful or policy-violating outputs increase.
- **Cost incident**: unexpected token or provider spend spike.

## Severity Framework

| Severity | Criteria | Response Time | Notification |
|----------|----------|---------------|--------------|
| SEV1 | User-facing outage, compliance risk, data leak | 5 min | Page on-call + incident commander |
| SEV2 | Major degradation in key flows | 15 min | Page on-call |
| SEV3 | Limited impact or internal-only issue | 1 hour | Slack alert |
| SEV4 | Cosmetic or low-priority regression | Next business day | Ticket |

## Golden Signals for AI Services

- Request success rate
- Latency (queue + generation + tool execution)
- Hallucination/groundedness proxy metrics
- Cost per minute and per tenant
- Guardrail violation rate

## Prometheus Alert Rules

```yaml
# prometheus-ai-alerts.yaml
groups:
  - name: ai-service-alerts
    rules:
      - alert: ModelEndpointDown
        expr: up{job="llm-inference"} == 0
        for: 2m
        labels:
          severity: sev1
        annotations:
          summary: "LLM inference endpoint {{ $labels.instance }} is down"
          runbook_url: "https://runbooks.internal/ai/model-outage"

      - alert: HighHallucinationRate
        expr: |
          rate(llm_hallucination_detected_total[10m])
          / rate(llm_requests_total[10m]) > 0.15
        for: 5m
        labels:
          severity: sev2
        annotations:
          summary: "Hallucination rate above 15% for {{ $labels.model }}"
          runbook_url: "https://runbooks.internal/ai/quality-regression"

      - alert: TokenCostExplosion
        expr: |
          sum(rate(llm_token_cost_dollars[5m])) by (tenant)
          > 0.50
        for: 3m
        labels:
          severity: sev2
        annotations:
          summary: "Token spend exceeds $0.50/min for tenant {{ $labels.tenant }}"
          runbook_url: "https://runbooks.internal/ai/cost-spike"

      - alert: LatencyP95Exceeded
        expr: |
          histogram_quantile(0.95,
            rate(llm_request_duration_seconds_bucket[5m])
          ) > 5
        for: 5m
        labels:
          severity: sev2
        annotations:
          summary: "LLM p95 latency exceeds 5s for {{ $labels.service }}"

      - alert: GuardrailViolationSpike
        expr: |
          rate(llm_guardrail_violations_total[10m])
          / rate(llm_requests_total[10m]) > 0.05
        for: 5m
        labels:
          severity: sev1
        annotations:
          summary: "Guardrail violations above 5% for {{ $labels.model }}"
          runbook_url: "https://runbooks.internal/ai/safety-incident"

      - alert: ModelQualityDrop
        expr: |
          llm_eval_score{metric="groundedness"} < 0.70
        for: 10m
        labels:
          severity: sev2
        annotations:
          summary: "Groundedness score dropped below 0.70 for {{ $labels.model }}"

      - alert: ProviderErrorRateHigh
        expr: |
          rate(llm_provider_errors_total[5m])
          / rate(llm_provider_requests_total[5m]) > 0.10
        for: 3m
        labels:
          severity: sev2
        annotations:
          summary: "Provider {{ $labels.provider }} error rate above 10%"
```

## Response Playbooks

### Model Outage Runbook

```text
TRIGGER: ModelEndpointDown fires for > 2 minutes
RESPONDER: On-call AI platform engineer

1. Acknowledge alert in PagerDuty.
2. Check provider status page (e.g., status.openai.com).
3. Verify network connectivity:
     curl -s -o /dev/null -w "%{http_code}" https://api.provider.com/health
4. If provider is down:
     a. Enable fallback model route in gateway config.
     b. kubectl set env deployment/llm-gateway FALLBACK_ENABLED=true
     c. Verify fallback traffic is flowing via Grafana dashboard.
5. If self-hosted model is down:
     a. Check pod status: kubectl get pods -l app=llm-inference -n ai
     b. Check GPU health: kubectl logs -l app=llm-inference --tail=50
     c. Restart if OOM: kubectl rollout restart deployment/llm-inference -n ai
6. Freeze all deployments:
     kubectl annotate deployment --all deploy-freeze=true -n ai
7. Communicate ETA in #incident-channel.
8. When resolved, unfreeze and run smoke tests.
```

### Quality Regression Runbook (Hallucination Spike)

```text
TRIGGER: HighHallucinationRate or ModelQualityDrop fires
RESPONDER: On-call AI engineer + ML lead

1. Acknowledge alert. Open incident ticket.
2. Identify scope:
     - Which model version? Check deployment metadata.
     - Which routes/tenants affected? Filter by labels in Grafana.
3. Check recent changes:
     - Model version promotion in last 24h?
     - Prompt template changes in last 24h?
     - Retrieval index rebuild in last 24h?
4. If recent model change:
     kubectl rollout undo deployment/llm-inference -n ai
5. If recent prompt change:
     git revert <commit> && git push  # triggers GitOps redeploy
6. Increase trace sampling to 100% for affected route:
     kubectl set env deployment/llm-gateway TRACE_SAMPLE_RATE=1.0
7. Run offline eval suite against current production:
     python run_evals.py --target prod --suite quality --compare baseline
8. Confirm metrics return to baseline before closing.
```

### Token Cost Explosion Runbook

```text
TRIGGER: TokenCostExplosion fires
RESPONDER: On-call platform engineer

1. Identify top consumers:
     Query: topk(10, sum(rate(llm_token_cost_dollars[15m])) by (tenant, model, route))
2. Check for runaway loops:
     - Agent retry storms (exponential token growth per request)
     - Missing max_tokens caps on new routes
     - Cache bypass due to config change
3. Apply immediate caps:
     kubectl patch configmap llm-quotas -n ai --patch '
       data:
         max_tokens_per_request: "4096"
         rpm_limit: "60"
     '
4. Enable semantic cache if disabled:
     kubectl set env deployment/llm-gateway CACHE_ENABLED=true
5. Route traffic to cheaper model tier:
     kubectl set env deployment/llm-gateway DEFAULT_MODEL=gpt-4o-mini
6. Notify affected tenants of temporary limits.
7. Open postmortem with cost attribution analysis.
```

## Escalation Procedures

```text
Level 1 (0-15 min):  On-call AI platform engineer
Level 2 (15-30 min): AI platform team lead + affected product owner
Level 3 (30-60 min): Engineering director + security (if safety incident)
Level 4 (60+ min):   VP Engineering + legal (if compliance/data incident)

Safety incidents always start at Level 2 minimum.
Provider-side incidents: open support ticket immediately at Level 1.
```

## Detection Queries (PromQL)

```promql
# Request success rate by model
1 - (
  sum(rate(llm_requests_total{status="error"}[5m])) by (model)
  / sum(rate(llm_requests_total[5m])) by (model)
)

# Cost per successful answer
sum(rate(llm_token_cost_dollars[5m])) by (route)
/ sum(rate(llm_requests_total{status="success"}[5m])) by (route)

# Hallucination rate trend (1h window, 5m steps)
rate(llm_hallucination_detected_total[1h])
/ rate(llm_requests_total[1h])

# Latency breakdown by stage
histogram_quantile(0.95, rate(llm_retrieval_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(llm_generation_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(llm_tool_execution_duration_seconds_bucket[5m]))

# Tenant cost leaderboard
topk(10, sum(rate(llm_token_cost_dollars[1h])) by (tenant))
```

## Postmortem Requirements

- Timeline with detector and responder timestamps
- Blast radius by tenant and feature
- Missed signals and alert tuning actions
- Concrete hardening tasks with owners and due dates
- Cost impact (dollars, tokens, affected requests)
- Customer communication log

## Postmortem Template

```markdown
## Incident Summary
- **Severity**: SEVx
- **Duration**: start_time - end_time (Xh Ym)
- **Detection**: How was it detected? (alert / customer report / manual)
- **Impact**: X tenants, Y requests, $Z cost

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert fired |
| HH:MM | Responder acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Incident resolved |

## Root Cause
[Description]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Tune alert threshold | @engineer | YYYY-MM-DD | Open |
| Add fallback route | @platform | YYYY-MM-DD | Open |
```

## Chaos Engineering for AI Systems

Regularly test incident readiness:

- **Provider failover drill**: block provider API at network level, verify fallback activates within SLO.
- **Model rollback drill**: deploy known-bad model version, verify automated quality gate catches it.
- **Cost cap drill**: simulate runaway token usage, verify quotas trigger before budget threshold.
- **Cache failure drill**: disable semantic cache, verify system degrades gracefully.

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| All requests timing out | Provider status page, DNS resolution | Enable fallback provider |
| Gradual quality decline | Recent model/prompt deployments | Roll back to last known good |
| Sudden cost spike | Per-tenant token usage dashboard | Apply emergency token caps |
| Guardrail violations spike | Model version, prompt injection logs | Enable stricter input filtering |
| Intermittent 503 errors | Pod restarts, GPU OOM events | Increase memory limits or reduce batch size |

## Related Skills

- incident-response (`incident-response`) - Standard incident process and evidence
- alerting-oncall (`alerting-oncall`) - Paging and escalation policy
- llm-cost-optimization (`llm-cost-optimization`) - Spend controls and efficiency patterns
- agent-observability (`agent-observability`) - Instrument requests, traces, and costs
- rag-observability-evals (`rag-observability-evals`) - RAG quality monitoring

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
