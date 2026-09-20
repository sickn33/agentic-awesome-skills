---
name: multi-tenant-llm-hosting
description: Design secure, multi-tenant LLM hosting platforms with tenant isolation,
  quotas, billing attribution, noisy-neighbor protection, and per-tenant policy controls.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Multi-Tenant LLM Hosting

Host many teams/customers on shared inference infrastructure without sacrificing security, performance, or cost governance.

## Prerequisites

- Kubernetes cluster with GPU node pools
- API gateway or LLM gateway (LiteLLM, Envoy, Kong)
- Prometheus + Grafana for per-tenant observability
- Redis or equivalent for rate limiting state
- Billing system or cost attribution database

## Isolation Model

- Strong tenant identity on every request
- Per-tenant API keys and scoped model access
- Namespace or workload isolation for high-risk tenants
- Strict data retention and log partitioning controls

## vLLM Multi-Model Serving

```yaml
# vllm-deployment.yaml - Multi-model serving with vLLM
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-gpt4o-equivalent
  namespace: llm-serving
  labels:
    app: vllm
    model-tier: premium
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vllm
      model-tier: premium
  template:
    metadata:
      labels:
        app: vllm
        model-tier: premium
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.4.1
          args:
            - "--model=/models/llama-3.1-70b"
            - "--tensor-parallel-size=2"
            - "--max-model-len=8192"
            - "--gpu-memory-utilization=0.90"
            - "--max-num-seqs=128"
            - "--enable-prefix-caching"
          ports:
            - containerPort: 8000
              name: inference
            - containerPort: 8080
              name: metrics
          resources:
            requests:
              nvidia.com/gpu: 2
              cpu: "8"
              memory: "64Gi"
            limits:
              nvidia.com/gpu: 2
              cpu: "16"
              memory: "128Gi"
          volumeMounts:
            - name: model-weights
              mountPath: /models
              readOnly: true
      volumes:
        - name: model-weights
          persistentVolumeClaim:
            claimName: premium-model-weights
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      nodeSelector:
        gpu-type: a100
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-economy
  namespace: llm-serving
  labels:
    app: vllm
    model-tier: economy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vllm
      model-tier: economy
  template:
    metadata:
      labels:
        app: vllm
        model-tier: economy
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.4.1
          args:
            - "--model=/models/llama-3.1-8b"
            - "--max-model-len=4096"
            - "--gpu-memory-utilization=0.85"
            - "--max-num-seqs=256"
            - "--enable-prefix-caching"
          ports:
            - containerPort: 8000
              name: inference
            - containerPort: 8080
              name: metrics
          resources:
            requests:
              nvidia.com/gpu: 1
              cpu: "4"
              memory: "32Gi"
            limits:
              nvidia.com/gpu: 1
              cpu: "8"
              memory: "64Gi"
          volumeMounts:
            - name: model-weights
              mountPath: /models
              readOnly: true
      volumes:
        - name: model-weights
          persistentVolumeClaim:
            claimName: economy-model-weights
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
```

## Per-Tenant Quota Configuration

```yaml
# tenant-quotas-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tenant-quotas
  namespace: llm-serving
data:
  quotas.yaml: |
    tenants:
      acme-corp:
        tier: enterprise
        models_allowed:
          - llama-3.1-70b
          - llama-3.1-8b
          - nomic-embed-text
        rate_limits:
          requests_per_minute: 300
          tokens_per_minute: 500000
          concurrent_requests: 50
        budget:
          daily_limit_usd: 500.00
          monthly_limit_usd: 10000.00
          alert_threshold_percent: 80
        priority: high

      startup-xyz:
        tier: standard
        models_allowed:
          - llama-3.1-8b
          - nomic-embed-text
        rate_limits:
          requests_per_minute: 60
          tokens_per_minute: 100000
          concurrent_requests: 10
        budget:
          daily_limit_usd: 50.00
          monthly_limit_usd: 1000.00
          alert_threshold_percent: 80
        priority: medium

      internal-dev:
        tier: free
        models_allowed:
          - llama-3.1-8b
        rate_limits:
          requests_per_minute: 20
          tokens_per_minute: 50000
          concurrent_requests: 5
        budget:
          daily_limit_usd: 10.00
          monthly_limit_usd: 200.00
          alert_threshold_percent: 90
        priority: low
```

## Namespace Isolation for High-Risk Tenants

```yaml
# tenant-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme-corp
  labels:
    tenant: acme-corp
    isolation: strict
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: llm-gateway
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: llm-serving
      ports:
        - port: 8000
          protocol: TCP
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-dns
      ports:
        - port: 53
          protocol: UDP
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-acme-corp
spec:
  hard:
    requests.cpu: "16"
    requests.memory: "64Gi"
    limits.cpu: "32"
    limits.memory: "128Gi"
    requests.nvidia.com/gpu: "4"
    pods: "20"
```

## Request Routing and Rate Limiting

```python
# gateway_router.py
"""Multi-tenant request router with rate limiting and model routing."""
import time
import json
import redis
from fastapi import FastAPI, HTTPException, Header, Request
from typing import Optional
import httpx
import yaml

app = FastAPI()
redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)

# Load tenant config
with open("/etc/config/quotas.yaml") as f:
    TENANT_CONFIG = yaml.safe_load(f)["tenants"]

MODEL_ENDPOINTS = {
    "llama-3.1-70b": "http://vllm-gpt4o-equivalent:8000",
    "llama-3.1-8b": "http://vllm-economy:8000",
    "nomic-embed-text": "http://embedding-service:8000",
}

def check_rate_limit(tenant_id: str, config: dict) -> bool:
    """Check and update rate limit for a tenant."""
    key = f"ratelimit:{tenant_id}:{int(time.time() // 60)}"
    current = redis_client.incr(key)
    if current == 1:
        redis_client.expire(key, 120)
    return current <= config["rate_limits"]["requests_per_minute"]

def check_concurrent(tenant_id: str, config: dict) -> bool:
    """Check concurrent request limit."""
    key = f"concurrent:{tenant_id}"
    current = int(redis_client.get(key) or 0)
    return current < config["rate_limits"]["concurrent_requests"]

def check_budget(tenant_id: str, config: dict) -> bool:
    """Check if tenant is within daily budget."""
    key = f"spend:{tenant_id}:{time.strftime('%Y-%m-%d')}"
    current_spend = float(redis_client.get(key) or 0)
    return current_spend < config["budget"]["daily_limit_usd"]

def record_usage(tenant_id: str, model: str, prompt_tokens: int, completion_tokens: int):
    """Record token usage and cost for billing."""
    # Cost rates per 1K tokens
    rates = {
        "llama-3.1-70b": {"prompt": 0.004, "completion": 0.012},
        "llama-3.1-8b": {"prompt": 0.0005, "completion": 0.0015},
        "nomic-embed-text": {"prompt": 0.0001, "completion": 0.0},
    }
    rate = rates.get(model, {"prompt": 0.001, "completion": 0.003})
    cost = (prompt_tokens * rate["prompt"] + completion_tokens * rate["completion"]) / 1000

    # Update daily spend
    spend_key = f"spend:{tenant_id}:{time.strftime('%Y-%m-%d')}"
    redis_client.incrbyfloat(spend_key, cost)
    redis_client.expire(spend_key, 172800)

    # Record for billing export
    billing_key = f"billing:{tenant_id}:{time.strftime('%Y-%m')}"
    redis_client.rpush(billing_key, json.dumps({
        "timestamp": time.time(),
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cost_usd": cost,
    }))

@app.post("/v1/chat/completions")
async def chat_completions(
    request: Request,
    x_tenant_id: str = Header(...),
    x_api_key: str = Header(...),
):
    """Route chat completion request with tenant controls."""
    if x_tenant_id not in TENANT_CONFIG:
        raise HTTPException(status_code=403, detail="Unknown tenant")

    config = TENANT_CONFIG[x_tenant_id]
    body = await request.json()
    model = body.get("model", "llama-3.1-8b")

    # Check model access
    if model not in config["models_allowed"]:
        raise HTTPException(status_code=403, detail=f"Model {model} not allowed for tenant")

    # Check rate limit
    if not check_rate_limit(x_tenant_id, config):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    # Check concurrent requests
    if not check_concurrent(x_tenant_id, config):
        raise HTTPException(status_code=429, detail="Concurrent request limit exceeded")

    # Check budget
    if not check_budget(x_tenant_id, config):
        raise HTTPException(status_code=402, detail="Daily budget exceeded")

    # Route to model endpoint
    endpoint = MODEL_ENDPOINTS.get(model)
    if not endpoint:
        raise HTTPException(status_code=404, detail=f"Model {model} not available")

    # Track concurrent requests
    concurrent_key = f"concurrent:{x_tenant_id}"
    redis_client.incr(concurrent_key)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{endpoint}/v1/chat/completions",
                json=body,
                headers={"Content-Type": "application/json"},
            )
            result = response.json()

            # Record usage
            usage = result.get("usage", {})
            record_usage(
                x_tenant_id, model,
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
            )

            return result
    finally:
        redis_client.decr(concurrent_key)
```


## Contents

- [Rate Limiting with Envoy](references/details.md)
- [Billing Integration](references/details.md)
- [Noisy-Neighbor Controls](references/details.md)
- [Per-Tenant Monitoring](references/details.md)
- [Security Baseline](references/details.md)
- [Operational Runbook](references/details.md)
- [Troubleshooting](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

- Building an internal LLM platform shared by multiple teams
- Hosting LLM inference for external customers with isolation requirements
- Implementing per-tenant quotas, billing, and rate limiting
- Designing request routing for multi-model, multi-tenant environments
- Preventing noisy-neighbor issues on shared GPU infrastructure

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

