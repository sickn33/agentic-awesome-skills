---
name: model-serving-kubernetes
description: Deploy ML models on Kubernetes with KServe (formerly KFServing) and NVIDIA
  Triton Inference Server.
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

# Model Serving on Kubernetes

Production ML model serving with KServe and Triton — canary deployments, autoscaling, and GPU-aware scheduling.

## When to Use This Skill

Use this skill when:
- Serving scikit-learn, PyTorch, TensorFlow, or ONNX models at scale
- Implementing canary deployments and A/B testing for ML models
- Autoscaling inference pods based on request rate or GPU metrics
- Deploying LLMs with Triton or KServe on Kubernetes
- Managing multiple model versions with traffic splitting

## Prerequisites

- Kubernetes 1.28+ with GPU nodes
- KServe installed (or Triton standalone)
- `kubectl` and `helm` configured
- NVIDIA GPU Operator installed on cluster

## KServe Installation

```bash
# Install KServe with Helm
helm repo add kserve https://kserve.github.io/helm-charts
helm repo update

helm install kserve kserve/kserve \
  --namespace kserve \
  --create-namespace \
  --set kserve.controller.gateway.ingressGateway.className=nginx

# Verify
kubectl get pods -n kserve
kubectl get crd | grep kserve
```

## Basic InferenceService (KServe)

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
  namespace: models
spec:
  predictor:
    sklearn:
      storageUri: gs://kfserving-examples/models/sklearn/1.0/model
      resources:
        requests:
          cpu: "1"
          memory: 2Gi
        limits:
          cpu: "2"
          memory: 4Gi
```

```bash
kubectl apply -f inference-service.yaml

# Get inference service URL
kubectl get inferenceservice sklearn-iris -n models
# NAME           URL                                          READY   ...
# sklearn-iris   http://sklearn-iris.models.example.com       True

# Test prediction
curl -X POST http://sklearn-iris.models.example.com/v1/models/sklearn-iris:predict \
  -H "Content-Type: application/json" \
  -d '{"instances": [[6.8, 2.8, 4.8, 1.4]]}'
```

## GPU-Enabled LLM InferenceService

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llama-3-8b
  namespace: models
  annotations:
    serving.kserve.io/enable-prometheus-scraping: "true"
spec:
  predictor:
    containers:
    - name: vllm-container
      image: vllm/vllm-openai:latest
      args:
      - "--model"
      - "meta-llama/Llama-3.1-8B-Instruct"
      - "--tensor-parallel-size"
      - "1"
      - "--gpu-memory-utilization"
      - "0.90"
      ports:
      - containerPort: 8080
        protocol: TCP
      resources:
        requests:
          nvidia.com/gpu: "1"
          memory: "20Gi"
          cpu: "4"
        limits:
          nvidia.com/gpu: "1"
          memory: "24Gi"
          cpu: "8"
      readinessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 60
        periodSeconds: 10
      env:
      - name: HUGGING_FACE_HUB_TOKEN
        valueFrom:
          secretKeyRef:
            name: hf-token
            key: token
    nodeSelector:
      nvidia.com/gpu.present: "true"
  transformer:
    containers:
    - name: kserve-container
      image: kserve/kserve-transformer:latest
```

## Canary Deployment (Traffic Splitting)

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llama-3-8b
  namespace: models
spec:
  predictor:
    canaryTrafficPercent: 20    # 20% to new version, 80% to stable
    containers:
    - name: vllm-container
      image: vllm/vllm-openai:latest
      args:
      - "--model"
      - "meta-llama/Llama-3.1-8B-Instruct-v2"  # new model version
      resources:
        limits:
          nvidia.com/gpu: "1"
```

```bash
# Gradually increase canary traffic
kubectl patch inferenceservice llama-3-8b -n models \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/predictor/canaryTrafficPercent","value":50}]'

# Promote canary to stable
kubectl patch inferenceservice llama-3-8b -n models \
  --type='json' \
  -p='[{"op":"remove","path":"/spec/predictor/canaryTrafficPercent"}]'
```

## Autoscaling with KEDA

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: llama-scaler
  namespace: models
spec:
  scaleTargetRef:
    apiVersion: serving.kserve.io/v1beta1
    kind: InferenceService
    name: llama-3-8b
  minReplicaCount: 1
  maxReplicaCount: 5
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus-server.monitoring:9090
      metricName: kserve_request_count
      threshold: "10"
      query: |
        sum(rate(kserve_request_count_total{namespace="models",
            service="llama-3-8b"}[1m]))
```

## NVIDIA Triton Inference Server

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-server
  namespace: models
spec:
  replicas: 2
  selector:
    matchLabels:
      app: triton
  template:
    metadata:
      labels:
        app: triton
    spec:
      containers:
      - name: triton
        image: nvcr.io/nvidia/tritonserver:24.05-py3
        args:
        - "tritonserver"
        - "--model-store=s3://my-model-store/models"
        - "--model-control-mode=poll"        # auto-load new model versions
        - "--repository-poll-secs=30"
        - "--metrics-port=8002"
        ports:
        - containerPort: 8000   # HTTP
        - containerPort: 8001   # gRPC
        - containerPort: 8002   # Metrics
        resources:
          limits:
            nvidia.com/gpu: "1"
        readinessProbe:
          httpGet:
            path: /v2/health/ready
            port: 8000
          initialDelaySeconds: 30
```

## Triton Model Repository Structure

```
s3://my-model-store/models/
├── text-classifier/
│   ├── config.pbtxt
│   ├── 1/
│   │   └── model.onnx
│   └── 2/
│       └── model.onnx          # new version; auto-loaded
├── embedding-model/
│   ├── config.pbtxt
│   └── 1/
│       └── model.onnx
```

```protobuf
# config.pbtxt for ONNX model
name: "text-classifier"
backend: "onnxruntime"
max_batch_size: 64
dynamic_batching {
  preferred_batch_size: [16, 32]
  max_queue_delay_microseconds: 1000
}
input [
  { name: "input_ids" data_type: TYPE_INT64 dims: [-1] }
  { name: "attention_mask" data_type: TYPE_INT64 dims: [-1] }
]
output [
  { name: "logits" data_type: TYPE_FP32 dims: [-1] }
]
instance_group [
  { kind: KIND_GPU count: 2 }   # 2 model instances on GPU
]
```

## Model Management Commands

```bash
# List loaded models (Triton)
curl http://triton:8000/v2/models

# Load a new model version
curl -X POST http://triton:8000/v2/repository/models/text-classifier/load

# Unload a model
curl -X POST http://triton:8000/v2/repository/models/text-classifier/unload

# KServe — watch rollout status
kubectl rollout status deployment/llama-3-8b-predictor -n models
kubectl get inferenceservice llama-3-8b -n models -w
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `InferenceService not ready` | Model loading or OOM | Check predictor pod logs; increase memory limits |
| Canary stuck at 0% | KNative routing issue | Check `kubectl get ksvc -n models` |
| Triton missing model | S3 permissions or path | Verify IAM role; check `--model-store` path |
| Low GPU utilization | Dynamic batching off | Enable `dynamic_batching` in Triton config |
| Autoscaler not triggering | Prometheus query wrong | Test query in Prometheus UI |

## Best Practices

- Use canary deployments for all model updates — roll back in seconds if metrics degrade.
- Enable Triton dynamic batching — it can increase GPU throughput 5–10× for small models.
- Store models in S3/GCS with versioned paths (`s3://bucket/model/v1/`, `v2/`).
- Pin GPU node selectors to prevent model pods landing on CPU-only nodes.
- Monitor p99 latency and error rates per model version during canary rollouts.

## Related Skills

- vllm-server (`vllm-server`) - vLLM for LLM serving
- llm-inference-scaling (`llm-inference-scaling`) - KEDA autoscaling
- kubernetes-ops (`kubernetes-ops`) - Core Kubernetes operations
- gpu-server-management (`gpu-server-management`) - GPU nodes

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
