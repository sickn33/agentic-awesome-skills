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
- API gateway or LLM gateway (LiteLLM, Bifrost, Envoy, Kong)
- Prometheus + Grafana for per-tenant observability
- Redis or equivalent for rate limiting state
- Billing system or cost attribution database

## Isolation Model

- Strong tenant identity on every request
- Per-tenant API keys and scoped model access
- Namespace/workload isolation plus enforced network and storage boundaries; shared
  engine/GPU memory may require separate processes or nodes for high-risk tenants
- Strict data retention and log partitioning controls

## vLLM Multi-Model Serving

```yaml
# vllm-deployment.yaml - Multi-model serving with vLLM
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-premium
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
        prometheus.io/port: "8000"
    spec:
      containers:
        - name: vllm
          image: YOUR_APPROVED_VLLM_IMAGE@sha256:REPLACE_WITH_VERIFIED_DIGEST
          args:
            - "--model=/models/llama-3.1-70b"
            - "--tensor-parallel-size=2"
            - "--max-model-len=8192"
            - "--gpu-memory-utilization=0.90"
            - "--max-num-seqs=128"
          ports:
            - containerPort: 8000
              name: inference
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
          image: YOUR_APPROVED_VLLM_IMAGE@sha256:REPLACE_WITH_VERIFIED_DIGEST
          args:
            - "--model=/models/llama-3.1-8b"
            - "--max-model-len=4096"
            - "--gpu-memory-utilization=0.85"
            - "--max-num-seqs=256"
          ports:
            - containerPort: 8000
              name: inference
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
              kubernetes.io/metadata.name: llm-gateway
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: llm-serving
      ports:
        - port: 8000
          protocol: TCP
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
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

The previous sample trusted `x_tenant_id` while never checking `x_api_key`,
used racy check-then-increment counters, and treated missing usage as free. Do not
expose an inference service with that pattern. Implement this server-side contract:

1. Authenticate a hashed, revocable virtual key or verified gateway identity; derive
   the tenant from that record. Ignore caller-supplied tenant headers. Apply this to
   every route, including embeddings, models, metrics and streaming endpoints.
2. Validate a bounded request schema, model allowlist, context/output-token limits
   and allowed parameters. Remove caller override URLs/credentials. The endpoint
   table is operator-owned. Reject streaming until accounting/cancellation support
   is implemented; never parse an SSE stream as one JSON object.
3. Atomically reserve RPM, TPM, a concurrency lease and worst-case request spend
   against both daily and monthly budgets in a shared transaction/Lua operation.
   Fail closed when the quota store is unavailable. Use expiring uniquely owned
   leases and an idempotent finalizer so crashes cannot leak or double-release slots.
4. Forward only to the fixed private endpoint with TLS where required, explicit
   deadlines, bounded response size and status checks. Preserve upstream failures;
   never return a provider error body as a successful completion.
5. Reconcile reservation with authoritative usage and an append-only request-ID
   ledger. Missing usage is unresolved accounting, not zero cost. Finalize or retain
   a conservative hold after disconnect/timeouts and reconcile asynchronously.

Worked reservation example (illustrative rates, not provider prices): a tenant
has $1.00 remaining today, $20 monthly and one free concurrency slot. A request
reserves $0.06 and 2,000 total tokens atomically; a simultaneous request must see
$0.94 remaining and the occupied slot. Final verified cost $0.04 refunds $0.02
once by request ID. Repeating finalization must not refund again.

The ConfigMap above is policy data only: it enforces no quotas by itself. The
Deployment fragments are one model per server, not a multi-model process. Supply
a tested image/model/GPU-compatible release, namespace, Service, probes, secrets,
TLS and NetworkPolicies before deployment; placeholders intentionally cannot run.
Prefix caching is disabled until the chosen engine's tenant cache isolation has
been tested. Never infer cache confidentiality from Kubernetes namespaces alone.


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

