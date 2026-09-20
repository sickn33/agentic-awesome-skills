# Details (moved from SKILL.md)

> Extended reference content for `multi-tenant-llm-hosting`, kept under `references/` so the entrypoint stays within the audit budget.

## Rate Limiting with Envoy

```yaml
# envoy-ratelimit.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-ratelimit-config
  namespace: llm-serving
data:
  config.yaml: |
    domain: llm-gateway
    descriptors:
      # Per-tenant rate limits
      - key: tenant_id
        value: acme-corp
        rate_limit:
          unit: minute
          requests_per_unit: 300
      - key: tenant_id
        value: startup-xyz
        rate_limit:
          unit: minute
          requests_per_unit: 60
      - key: tenant_id
        value: internal-dev
        rate_limit:
          unit: minute
          requests_per_unit: 20

      # Global rate limit as safety net
      - key: global
        rate_limit:
          unit: second
          requests_per_unit: 100
```


## Billing Integration

```python
# billing_export.py
"""Export tenant usage data for billing systems."""
import redis
import json
from datetime import datetime, timedelta
from typing import Dict, List

redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)

def generate_tenant_invoice(tenant_id: str, month: str) -> Dict:
    """Generate monthly invoice for a tenant."""
    billing_key = f"billing:{tenant_id}:{month}"
    records = redis_client.lrange(billing_key, 0, -1)

    usage_by_model = {}
    total_cost = 0.0
    total_requests = 0

    for record_json in records:
        record = json.loads(record_json)
        model = record["model"]

        if model not in usage_by_model:
            usage_by_model[model] = {
                "requests": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "cost_usd": 0.0,
            }

        usage_by_model[model]["requests"] += 1
        usage_by_model[model]["prompt_tokens"] += record["prompt_tokens"]
        usage_by_model[model]["completion_tokens"] += record["completion_tokens"]
        usage_by_model[model]["cost_usd"] += record["cost_usd"]

        total_cost += record["cost_usd"]
        total_requests += 1

    return {
        "tenant_id": tenant_id,
        "billing_period": month,
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_requests": total_requests,
            "total_cost_usd": round(total_cost, 4),
        },
        "usage_by_model": usage_by_model,
    }

def get_tenant_spend_today(tenant_id: str) -> float:
    """Get current day spend for budget alerts."""
    key = f"spend:{tenant_id}:{datetime.utcnow().strftime('%Y-%m-%d')}"
    return float(redis_client.get(key) or 0)
```


## Noisy-Neighbor Controls

- Per-tenant RPM/TPM limits
- Concurrency caps and queue isolation
- Fair scheduling with weighted priority classes
- Backpressure and graceful degradation policies

```yaml
# priority-classes.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: tenant-enterprise
value: 1000
globalDefault: false
description: "Enterprise tenant workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: tenant-standard
value: 500
globalDefault: false
description: "Standard tenant workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: tenant-free
value: 100
globalDefault: false
description: "Free tier tenant workloads"
```


## Per-Tenant Monitoring

```yaml
# tenant-alerts.yaml
groups:
  - name: tenant-alerts
    rules:
      - alert: TenantBudgetWarning
        expr: |
          llm_tenant_daily_spend_usd
          / llm_tenant_daily_budget_usd > 0.80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tenant {{ $labels.tenant }} at 80% of daily budget"

      - alert: TenantRateLimitHitting
        expr: |
          rate(llm_rate_limit_rejections_total[5m]) > 1
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Tenant {{ $labels.tenant }} hitting rate limits"

      - alert: TenantErrorRateHigh
        expr: |
          rate(llm_tenant_errors_total[5m])
          / rate(llm_tenant_requests_total[5m]) > 0.10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tenant {{ $labels.tenant }} error rate above 10%"
```


## Security Baseline

- Encrypt data in transit and at rest.
- Disallow cross-tenant cache leakage.
- Restrict debug data access by role.
- Audit all privileged administrative actions.


## Operational Runbook

1. Onboard tenant with policy template.
2. Issue virtual key and quota profile.
3. Validate observability and billing tags.
4. Run tenant-specific load/safety tests.
5. Enable production traffic with canary limits.


## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| Tenant getting 429 errors | Rate limit counters in Redis | Increase RPM/TPM limits or upgrade tier |
| One tenant slowing others | Concurrent request counts per tenant | Reduce concurrency cap for offending tenant |
| Billing data missing | Redis billing keys and export job logs | Check billing export CronJob and Redis connectivity |
| Tenant cannot access model | Tenant config in ConfigMap | Add model to `models_allowed` list |
| Cross-tenant data leakage | Cache key prefixes and namespace isolation | Ensure cache keys include tenant_id prefix |
| Budget alerts not firing | Prometheus scrape targets and alert rules | Verify metric export and Alertmanager config |


## Related Skills

- llm-gateway (`llm-gateway`) - Key management and traffic routing
- llm-cost-optimization (`llm-cost-optimization`) - Cost controls and optimization tactics
- zero-trust (`zero-trust`) - Identity-centric network and access patterns
- gpu-kubernetes-operations (`gpu-kubernetes-operations`) - GPU cluster management
- llm-inference-scaling (`llm-inference-scaling`) - Autoscaling inference workloads

