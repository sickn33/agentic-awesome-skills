---
name: gpu-kubernetes-operations
description: Operate GPU-backed Kubernetes clusters for AI inference and training
  with scheduling, autoscaling, node health, MIG partitioning, and cost controls.
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

# GPU Kubernetes Operations

Run resilient and cost-efficient GPU clusters for production AI workloads.

## When to Use This Skill

- Setting up GPU node pools in Kubernetes for AI inference or training
- Configuring NVIDIA device plugin and GPU operator
- Implementing MIG partitioning to share GPUs across workloads
- Building GPU-aware autoscaling policies
- Monitoring GPU health with DCGM and Prometheus
- Troubleshooting GPU scheduling, driver, or OOM issues

## Prerequisites

- Kubernetes 1.28+ cluster with GPU-capable nodes
- NVIDIA GPUs (A10, L4, A100, H100, or similar)
- NVIDIA drivers installed on nodes (535+ recommended)
- Helm 3 for operator and plugin installation
- Prometheus stack for metrics collection

## NVIDIA GPU Operator Installation

The GPU Operator automates driver, toolkit, device plugin, and DCGM deployment.

```bash
# Add NVIDIA Helm repo
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# Install GPU Operator
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --set driver.enabled=true \
  --set toolkit.enabled=true \
  --set devicePlugin.enabled=true \
  --set dcgmExporter.enabled=true \
  --set migManager.enabled=true \
  --set nodeStatusExporter.enabled=true \
  --version v24.3.0

# Verify installation
kubectl get pods -n gpu-operator
kubectl get nodes -o json | jq '.items[].status.allocatable["nvidia.com/gpu"]'
```

## NVIDIA Device Plugin (Standalone)

If not using the GPU Operator, deploy the device plugin directly.

```yaml
# nvidia-device-plugin.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin
  template:
    metadata:
      labels:
        name: nvidia-device-plugin
    spec:
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      priorityClassName: system-node-critical
      containers:
        - name: nvidia-device-plugin
          image: nvcr.io/nvidia/k8s-device-plugin:v0.15.0
          securityContext:
            privileged: true
          env:
            - name: FAIL_ON_INIT_ERROR
              value: "false"
            - name: DEVICE_SPLIT_COUNT
              value: "1"
            - name: DEVICE_LIST_STRATEGY
              value: "envvar"
          volumeMounts:
            - name: device-plugin
              mountPath: /var/lib/kubelet/device-plugins
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
```

## MIG (Multi-Instance GPU) Partitioning

MIG allows a single A100 or H100 to be split into isolated GPU instances.

```yaml
# mig-config.yaml - ConfigMap for MIG Manager
apiVersion: v1
kind: ConfigMap
metadata:
  name: mig-parted-config
  namespace: gpu-operator
data:
  config.yaml: |
    version: v1
    mig-configs:
      # 7 small instances for inference microservices
      all-1g.10gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "1g.10gb": 7

      # 3 medium instances for mid-size models
      all-2g.20gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "2g.20gb": 3

      # Mixed: 1 large + 2 small
      mixed-inference:
        - devices: all
          mig-enabled: true
          mig-devices:
            "3g.40gb": 1
            "1g.10gb": 4

      # Full GPU for training (no partitioning)
      all-disabled:
        - devices: all
          mig-enabled: false
```

```bash
# Apply MIG profile to a node
kubectl label nodes gpu-node-01 nvidia.com/mig.config=all-1g.10gb --overwrite

# Verify MIG instances
kubectl exec -it nvidia-device-plugin-xxxxx -n kube-system -- nvidia-smi mig -lgi

# Check available MIG resources
kubectl get nodes gpu-node-01 -o json | jq '.status.allocatable | with_entries(select(.key | startswith("nvidia.com")))'
```

### Requesting MIG Slices in Pods

```yaml
# pod-with-mig.yaml
apiVersion: v1
kind: Pod
metadata:
  name: inference-small
spec:
  containers:
    - name: model
      image: registry.internal/vllm-server:latest
      resources:
        limits:
          nvidia.com/mig-1g.10gb: 1
      # For medium slice:
      # nvidia.com/mig-2g.20gb: 1
      # For large slice:
      # nvidia.com/mig-3g.40gb: 1
```

## GPU Time-Slicing

For GPUs that do not support MIG (A10, L4), use time-slicing to share a GPU.

```yaml
# time-slicing-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: time-slicing-config
  namespace: gpu-operator
data:
  any: |-
    version: v1
    flags:
      migStrategy: none
    sharing:
      timeSlicing:
        renameByDefault: false
        failRequestsGreaterThanOne: false
        resources:
          - name: nvidia.com/gpu
            replicas: 4
```

```bash
# Apply time-slicing config
kubectl patch clusterpolicy/cluster-policy \
  --type merge \
  -p '{"spec":{"devicePlugin":{"config":{"name":"time-slicing-config","default":"any"}}}}'

# After applying, each physical GPU appears as 4 virtual GPUs
kubectl get nodes -o json | jq '.items[].status.allocatable["nvidia.com/gpu"]'
# Output: "4" per physical GPU
```

## DCGM Monitoring

```yaml
# dcgm-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dcgm-exporter
  namespace: gpu-operator
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: nvidia-dcgm-exporter
  endpoints:
    - port: gpu-metrics
      interval: 15s
      path: /metrics
```

### Key DCGM Metrics and Alert Rules

```yaml
# gpu-alerts.yaml
groups:
  - name: gpu-health
    rules:
      - alert: GPUHighTemperature
        expr: DCGM_FI_DEV_GPU_TEMP > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GPU {{ $labels.gpu }} temperature above 85C on {{ $labels.node }}"

      - alert: GPUMemoryPressure
        expr: (DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_FREE) > 0.90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GPU memory above 90% on {{ $labels.node }} GPU {{ $labels.gpu }}"

      - alert: GPUECCErrors
        expr: increase(DCGM_FI_DEV_ECC_DBE_VOL_TOTAL[1h]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Double-bit ECC errors detected on {{ $labels.node }} GPU {{ $labels.gpu }}"

      - alert: GPUXidErrors
        expr: increase(DCGM_FI_DEV_XID_ERRORS[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "Xid error on {{ $labels.node }} GPU {{ $labels.gpu }}: {{ $labels.xid }}"

      - alert: GPULowUtilization
        expr: DCGM_FI_DEV_GPU_UTIL < 10 and on(pod) kube_pod_status_phase{phase="Running"} == 1
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "GPU underutilized on {{ $labels.node }} - consider rightsizing"

      - alert: GPUDriverMismatch
        expr: count(count by (driver_version)(DCGM_FI_DRIVER_VERSION)) > 1
        labels:
          severity: warning
        annotations:
          summary: "Multiple GPU driver versions detected across cluster"
```

## GPU Node Pool Configuration

```yaml
# gpu-nodepool.yaml
apiVersion: v1
kind: Node
metadata:
  labels:
    gpu-type: a100
    gpu-memory: "80gb"
    gpu-mig-capable: "true"
    node-role: gpu-inference
spec:
  taints:
    - key: nvidia.com/gpu
      value: "true"
      effect: NoSchedule
---
# Inference deployment with GPU scheduling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-inference
  namespace: ai-serving
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-inference
  template:
    metadata:
      labels:
        app: llm-inference
    spec:
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      nodeSelector:
        gpu-type: a100
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: llm-inference
                topologyKey: kubernetes.io/hostname
      containers:
        - name: vllm
          image: registry.internal/vllm-server:0.4.1
          resources:
            requests:
              nvidia.com/gpu: 1
              cpu: "4"
              memory: "32Gi"
            limits:
              nvidia.com/gpu: 1
              cpu: "8"
              memory: "64Gi"
          env:
            - name: CUDA_VISIBLE_DEVICES
              value: "all"
```

## GPU Autoscaling

```yaml
# gpu-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-inference-hpa
  namespace: ai-serving
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llm-inference
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Pods
      pods:
        metric:
          name: DCGM_FI_DEV_GPU_UTIL
        target:
          type: AverageValue
          averageValue: "75"
    - type: Pods
      pods:
        metric:
          name: inference_queue_depth
        target:
          type: AverageValue
          averageValue: "10"
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
---
# Cluster Autoscaler config for GPU node pools
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  config: |
    expander: priority
    scale-down-delay-after-add: 10m
    scale-down-unneeded-time: 10m
    skip-nodes-with-local-storage: false
    balance-similar-node-groups: true
    expendable-pods-priority-cutoff: -10
    gpu-total:
      - min: 2
        max: 16
        gpu: nvidia.com/gpu
```

## Scheduling Patterns

- Use node affinity by GPU type (A10/L4/A100/H100).
- Separate latency-critical inference from batch training.
- Pin model replicas with anti-affinity for availability.
- Reserve headroom for failover and rolling updates.

## Cost Optimization

- Prefer MIG slices for smaller inference services.
- Schedule batch jobs in off-peak windows.
- Route low-priority traffic to cheaper model tiers.
- Use spot/preemptible instances for training workloads.
- Monitor GPU utilization and rightsize deployments.

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| Pod stuck in Pending | `kubectl describe pod` for GPU resource events | Verify node has allocatable GPUs, check taints/tolerations |
| CUDA OOM during inference | Model too large for GPU memory | Reduce batch size, use quantization, or use MIG slice |
| DCGM metrics missing | ServiceMonitor labels matching | Verify DCGM exporter pod is running and scrape config |
| Driver mismatch after upgrade | `nvidia-smi` on each node | Cordon node, drain, upgrade driver, uncordon |
| GPU not detected | Device plugin pod logs | Restart device plugin, check NVIDIA container toolkit |
| Time-slicing not working | ConfigMap applied but no extra GPUs | Restart device plugin pods after config change |
| ECC errors increasing | `nvidia-smi -q -d ECC` | Schedule node drain and hardware replacement |

## Related Skills

- llm-inference-scaling (`llm-inference-scaling`) - Autoscale inference workloads
- model-serving-kubernetes (`model-serving-kubernetes`) - Production model serving patterns
- gpu-server-management (`gpu-server-management`) - Host-level GPU management fundamentals
- multi-tenant-llm-hosting (`multi-tenant-llm-hosting`) - Multi-tenant GPU sharing
- llm-cost-optimization (`llm-cost-optimization`) - Cost optimization strategies

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

