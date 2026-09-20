---
name: llmops-platform-engineering
description: Build production LLMOps platforms with CI/CD, model promotion workflows,
  evaluation gates, rollback, and governance across cloud and self-hosted inference.
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

# LLMOps Platform Engineering

Design and operate an internal LLM platform that supports rapid experimentation without compromising reliability, cost, or compliance.

## When to Use This Skill

- Building an internal platform for teams to deploy and manage LLM-powered features
- Designing CI/CD pipelines that include model evaluation gates
- Setting up A/B testing infrastructure for model versions
- Creating Kubernetes-based model serving infrastructure
- Establishing governance workflows for model promotion

## Prerequisites

- Kubernetes cluster with GPU node pools (or cloud inference API access)
- Container registry (Harbor, ECR, GCR, or ACR)
- CI/CD system (GitHub Actions, GitLab CI, or Argo Workflows)
- Observability stack (Prometheus + Grafana + OpenTelemetry)
- Model registry (MLflow or custom metadata store)

## Outcomes

- Standardized path from experiment to production
- Safe model rollout with quality and safety gates
- Repeatable infra modules for inference, vector DB, and observability
- Clear ownership model across platform, app, and security teams

## Reference Architecture

1. **Control Plane**: model registry, prompt/version catalog, policy checks, eval pipeline.
2. **Data Plane**: inference gateway, vector database, cache, feature store.
3. **Ops Plane**: telemetry, alerting, SLO dashboards, cost analytics.
4. **Security Plane**: IAM boundaries, secret rotation, content filters, audit logs.

## Model Promotion Pipeline

```yaml
# .github/workflows/model-promotion.yaml
name: Model Promotion Pipeline
on:
  workflow_dispatch:
    inputs:
      model_name:
        description: "Model identifier"
        required: true
      model_version:
        description: "Model version to promote"
        required: true
      target_env:
        description: "Target environment"
        required: true
        type: choice
        options: [staging, production]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run quality evaluation suite
        run: |
          python -m evals.run \
            --model "${{ inputs.model_name }}:${{ inputs.model_version }}" \
            --suite quality \
            --output results/quality.json

      - name: Run safety evaluation suite
        run: |
          python -m evals.run \
            --model "${{ inputs.model_name }}:${{ inputs.model_version }}" \
            --suite safety \
            --output results/safety.json

      - name: Run latency benchmark
        run: |
          python -m evals.benchmark \
            --model "${{ inputs.model_name }}:${{ inputs.model_version }}" \
            --concurrent-users 50 \
            --duration 300 \
            --output results/latency.json

      - name: Gate check - quality
        run: |
          python -m evals.gate_check \
            --results results/quality.json \
            --threshold-file thresholds/quality.yaml

      - name: Gate check - safety
        run: |
          python -m evals.gate_check \
            --results results/safety.json \
            --threshold-file thresholds/safety.yaml

      - name: Gate check - latency
        run: |
          python -m evals.gate_check \
            --results results/latency.json \
            --threshold-file thresholds/latency.yaml

      - name: Upload eval evidence
        uses: actions/upload-artifact@v4
        with:
          name: eval-results-${{ inputs.model_version }}
          path: results/

  approve:
    needs: evaluate
    runs-on: ubuntu-latest
    environment: ${{ inputs.target_env }}
    steps:
      - name: Record approval
        run: |
          echo "Approved by: ${{ github.actor }}"
          echo "Model: ${{ inputs.model_name }}:${{ inputs.model_version }}"
          echo "Target: ${{ inputs.target_env }}"
          echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

  deploy:
    needs: approve
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy canary
        run: |
          kubectl set image deployment/${{ inputs.model_name }}-canary \
            model=${{ inputs.model_name }}:${{ inputs.model_version }} \
            -n ai-${{ inputs.target_env }}

      - name: Wait for canary validation (15 min)
        run: |
          python -m canary.validate \
            --deployment ${{ inputs.model_name }}-canary \
            --namespace ai-${{ inputs.target_env }} \
            --duration 900 \
            --quality-threshold 0.85 \
            --error-rate-threshold 0.02

      - name: Promote to full rollout
        run: |
          kubectl set image deployment/${{ inputs.model_name }} \
            model=${{ inputs.model_name }}:${{ inputs.model_version }} \
            -n ai-${{ inputs.target_env }}
          kubectl rollout status deployment/${{ inputs.model_name }} \
            -n ai-${{ inputs.target_env }} --timeout=300s
```

## Evaluation Gate Thresholds

```yaml
# thresholds/quality.yaml
gates:
  groundedness:
    metric: groundedness_score
    min: 0.85
    comparison: gte
  task_success:
    metric: task_success_rate
    min: 0.90
    comparison: gte
  hallucination:
    metric: hallucination_rate
    max: 0.08
    comparison: lte
  regression:
    metric: quality_delta_vs_baseline
    min: -0.02
    comparison: gte
    description: "Must not regress more than 2% vs current production"

# thresholds/latency.yaml
gates:
  p50_latency:
    metric: latency_p50_ms
    max: 800
    comparison: lte
  p95_latency:
    metric: latency_p95_ms
    max: 2000
    comparison: lte
  p99_latency:
    metric: latency_p99_ms
    max: 5000
    comparison: lte
  throughput:
    metric: requests_per_second
    min: 50
    comparison: gte
```

## A/B Testing Configuration

```yaml
# ab-test-config.yaml
apiVersion: gateway.ai/v1
kind: ABTest
metadata:
  name: model-comparison-q1
  namespace: ai-production
spec:
  duration: 7d
  traffic_split:
    control:
      model: gpt-4o-2024-08-06
      weight: 70
    treatment:
      model: gpt-4o-2025-01-15
      weight: 30
  metrics:
    primary:
      - task_success_rate
      - user_satisfaction_score
    secondary:
      - latency_p95
      - cost_per_request
      - hallucination_rate
  guardrails:
    auto_rollback_if:
      - metric: task_success_rate
        threshold: 0.80
        window: 1h
      - metric: hallucination_rate
        threshold: 0.15
        window: 30m
  assignment:
    strategy: sticky_user
    hash_key: user_id
```

## Kubernetes Model Serving Deployment

```yaml
# model-serving-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-inference
  namespace: ai-production
  labels:
    app: llm-inference
    model: gpt-4o
    version: "2025-01"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: llm-inference
  template:
    metadata:
      labels:
        app: llm-inference
        model: gpt-4o
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: llm-inference
      containers:
        - name: model
          image: registry.internal/vllm-server:0.4.1
          args:
            - "--model=/models/current"
            - "--tensor-parallel-size=1"
            - "--max-model-len=8192"
            - "--gpu-memory-utilization=0.90"
          ports:
            - containerPort: 8000
              name: inference
            - containerPort: 8080
              name: metrics
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
              nvidia.com/gpu: "1"
            limits:
              cpu: "8"
              memory: "32Gi"
              nvidia.com/gpu: "1"
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 60
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 120
            periodSeconds: 30
          volumeMounts:
            - name: model-weights
              mountPath: /models
              readOnly: true
            - name: config
              mountPath: /etc/vllm
      volumes:
        - name: model-weights
          persistentVolumeClaim:
            claimName: model-weights-pvc
        - name: config
          configMap:
            name: vllm-config
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      nodeSelector:
        gpu-type: a100
---
apiVersion: v1
kind: Service
metadata:
  name: llm-inference
  namespace: ai-production
spec:
  selector:
    app: llm-inference
  ports:
    - name: inference
      port: 8000
      targetPort: 8000
    - name: metrics
      port: 8080
      targetPort: 8080
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-inference-hpa
  namespace: ai-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llm-inference
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: llm_queue_depth
        target:
          type: AverageValue
          averageValue: "5"
    - type: Pods
      pods:
        metric:
          name: gpu_utilization_percent
        target:
          type: AverageValue
          averageValue: "75"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 120
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 300
```

## CI/CD Design for AI Services

- Build immutable containers with pinned dependencies and model hashes.
- Use environment promotion: `dev -> stage -> prod`.
- Fail deployment if:
  - regression evals drop below baseline,
  - safety tests exceed risk threshold,
  - p95 latency exceeds SLO budget.
- Store deployment evidence for audits (commit SHA, eval report, approver).

## Operational SLOs

| Signal | Target | Measurement Window |
|--------|--------|--------------------|
| Availability | 99.9% | 30-day rolling |
| p95 Latency | < 1200ms | 5-min buckets |
| Cost per request | < $0.05 | 1-hour average |
| Task success rate | > 90% | 24-hour rolling |
| Groundedness | > 85% | 24-hour rolling |

## Platform Guardrails

- Enforce tenant quotas and model allow-lists.
- Require structured output contracts for automation paths.
- Default to low-risk model settings for critical workflows.
- Disable unconstrained tool execution in production.

## Tooling Stack (Example)

| Layer | Tools |
|-------|-------|
| Orchestration | Argo Workflows, GitHub Actions, Airflow |
| Model Registry | MLflow, custom metadata DB |
| Gateway | LiteLLM, Envoy-based API gateway |
| Observability | OpenTelemetry + Prometheus + Grafana + Langfuse |
| Policy | OPA/Rego for deployment and runtime checks |
| Evaluation | RAGAS, custom eval harness, Promptfoo |
| Serving | vLLM, TGI, Triton Inference Server |

## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|------------|
| Canary fails quality gate | Compare eval results with baseline | Adjust model config or revert version |
| Deployment stuck in rollout | Check pod events and resource quotas | Fix resource limits or node availability |
| A/B test shows no significant difference | Verify traffic split and sample size | Extend test duration or increase treatment weight |
| Model cold start too slow | Large model weight download | Use pre-cached PVCs or init containers |
| Eval pipeline flaky | Non-deterministic model outputs | Set temperature=0 for evals, increase sample size |

## Related Skills

- ai-pipeline-orchestration (`ai-pipeline-orchestration`) - Orchestrate ingestion and inference workflows
- agent-evals (`agent-evals`) - Build evaluation gates for releases
- llm-gateway (`llm-gateway`) - Route and control LLM traffic
- model-registry-governance (`model-registry-governance`) - Model lifecycle and approval workflows
- ai-sre-incident-response (`ai-sre-incident-response`) - AI-specific incident response

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
