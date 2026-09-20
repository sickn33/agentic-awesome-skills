---
name: llm-inference-scaling
description: Auto-scale LLM inference clusters on Kubernetes using KEDA, custom GPU
  metrics, and horizontal pod autoscaling.
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

# LLM Inference Scaling

Scale LLM inference horizontally on Kubernetes with GPU-aware autoscaling, request queuing, and cost-efficient spot instance strategies.

## When to Use This Skill

Use this skill when:
- LLM API traffic is unpredictable and you need to scale up/down automatically
- Managing a fleet of vLLM or TGI inference pods on Kubernetes
- Reducing inference costs with spot/preemptible GPU instances
- Implementing queue-based autoscaling for batch inference jobs
- Building a multi-model serving platform that shares GPU resources

## Prerequisites

- Kubernetes cluster with GPU nodes (NVIDIA operator installed)
- KEDA (Kubernetes Event-Driven Autoscaler) installed
- Prometheus with GPU metrics (`dcgm-exporter` or `gpu-operator`)
- Helm 3+ for chart deployments

## GPU Node Setup

```bash
# Install NVIDIA GPU Operator (handles drivers, container toolkit, DCGM)
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --set driver.enabled=true \
  --set dcgm.enabled=true \
  --set devicePlugin.enabled=true

# Verify GPU nodes are recognized
kubectl get nodes -l nvidia.com/gpu.present=true
kubectl describe node <gpu-node> | grep nvidia
```

## vLLM Deployment with GPU Resources

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-llama-8b
  labels:
    app: vllm
    model: llama-3.1-8b
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm
      model: llama-3.1-8b
  template:
    metadata:
      labels:
        app: vllm
        model: llama-3.1-8b
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: vllm
        image: vllm/vllm-openai:latest
        args:
        - "--model"
        - "meta-llama/Llama-3.1-8B-Instruct"
        - "--tensor-parallel-size"
        - "1"
        - "--gpu-memory-utilization"
        - "0.90"
        - "--max-num-seqs"
        - "128"
        resources:
          requests:
            nvidia.com/gpu: "1"
            memory: "20Gi"
            cpu: "4"
          limits:
            nvidia.com/gpu: "1"
            memory: "24Gi"
            cpu: "8"
        ports:
        - containerPort: 8000
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 10
        env:
        - name: HUGGING_FACE_HUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: hf-token
              key: token
```

## KEDA Autoscaling on Prometheus Metrics

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: vllm-scaledobject
spec:
  scaleTargetRef:
    name: vllm-llama-8b
  minReplicaCount: 1
  maxReplicaCount: 8
  cooldownPeriod: 300          # 5 min before scale-down
  pollingInterval: 15
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus-server.monitoring:9090
      metricName: vllm_num_requests_waiting
      threshold: "10"           # scale up if >10 requests waiting
      query: |
        sum(vllm:num_requests_waiting{deployment="vllm-llama-8b"})
  - type: prometheus
    metadata:
      serverAddress: http://prometheus-server.monitoring:9090
      metricName: vllm_gpu_cache_usage
      threshold: "0.8"          # scale up if KV cache >80% full
      query: |
        avg(vllm:gpu_cache_usage_perc{deployment="vllm-llama-8b"})
```

## Queue-Based Scaling (Redis + KEDA)

```yaml
# ScaledJob for async batch inference
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: llm-batch-inference
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: inference-worker
          image: myapp/inference-worker:latest
          env:
          - name: REDIS_URL
            value: redis://redis:6379
          - name: QUEUE_NAME
            value: inference-jobs
        restartPolicy: OnFailure
  minReplicaCount: 0
  maxReplicaCount: 20
  pollingInterval: 5
  successfulJobsHistoryLimit: 3
  triggers:
  - type: redis
    metadata:
      address: redis:6379
      listName: inference-jobs
      listLength: "5"           # 1 worker per 5 queued jobs
```

## Spot Instance Strategy

```yaml
# Mixed node pool: on-demand + spot GPUs
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-config
data:
  priorities: |
    10:  # low priority = prefer
    - .*spot.*
    50:
    - .*on-demand.*
---
# Node affinity for spot with on-demand fallback
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        preference:
          matchExpressions:
          - key: node.kubernetes.io/lifecycle
            operator: In
            values: [spot]
      - weight: 20
        preference:
          matchExpressions:
          - key: node.kubernetes.io/lifecycle
            operator: In
            values: [on-demand]
```

## Cluster Autoscaler for GPU Nodes

```bash
# AWS EKS — enable cluster autoscaler for GPU node group
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=my-cluster \
  --set awsRegion=us-east-1 \
  --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::ACCOUNT:role/ClusterAutoscalerRole \
  --set extraArgs.skip-nodes-with-local-storage=false \
  --set extraArgs.expander=least-waste

# Annotate GPU node group for autoscaler
kubectl annotate node <node> \
  cluster-autoscaler.kubernetes.io/safe-to-evict="false"
```

## Scaling Metrics to Monitor

```bash
# Prometheus queries for scaling decisions
# Requests waiting in vLLM queue
sum(vllm:num_requests_waiting) by (model)

# GPU KV cache utilization (>80% = bottleneck)
avg(vllm:gpu_cache_usage_perc) by (pod)

# Tokens per second throughput
sum(rate(vllm:generation_tokens_total[5m])) by (model)

# P99 time-to-first-token
histogram_quantile(0.99, rate(vllm:time_to_first_token_seconds_bucket[5m]))
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Pods stuck in `Pending` | No GPU nodes available | Check cluster autoscaler logs; verify node group limits |
| Scale-up too slow | Cluster autoscaler delay + model load time | Pre-warm replicas; increase `minReplicaCount` |
| GPU fragmentation | Multiple small models on large GPUs | Use MIG partitioning or consolidate model sizes |
| Spot eviction causes errors | Spot instance reclamation | Add `PodDisruptionBudget`; use graceful shutdown |
| KEDA not scaling | Prometheus query returns no data | Test query in Prometheus UI first |

## Best Practices

- Set `minReplicaCount: 1` to avoid cold starts; scale to 0 only for batch jobs.
- Use `PodDisruptionBudget` with `minAvailable: 1` to survive spot evictions.
- Pre-pull model weights into a shared PVC to speed up pod startup by 5–10×.
- Separate model families across node pools (A10G for 7B, A100 for 70B).
- Use Kubernetes VPA for CPU/memory right-sizing alongside KEDA for replica count.

## Related Skills

- vllm-server (`vllm-server`) - vLLM configuration and tuning
- gpu-server-management (`gpu-server-management`) - GPU node setup
- model-serving-kubernetes (`model-serving-kubernetes`) - KServe
- kubernetes-ops (`kubernetes-ops`) - Core Kubernetes
- llm-cost-optimization (`llm-cost-optimization`) - Cost strategies

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

