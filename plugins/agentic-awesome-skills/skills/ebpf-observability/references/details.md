# Details (moved from SKILL.md)

> Extended reference content for `ebpf-observability`, kept under `references/` so the entrypoint stays within the audit budget.

## 6. Prometheus Integration

### Hubble Metrics for Prometheus

Hubble automatically exposes Prometheus metrics when configured in the Cilium Helm install. Verify the metrics endpoint:

```bash
# Check that Hubble metrics are being served
kubectl exec -n kube-system ds/cilium -- curl -s http://localhost:9965/metrics | head -50
```

Create a ServiceMonitor for Prometheus Operator:

```yaml
# hubble-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hubble-metrics
  namespace: kube-system
  labels:
    app: cilium
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  endpoints:
    - port: hubble-metrics
      interval: 15s
      path: /metrics
```

### eBPF Exporter for Custom Kernel Metrics

```bash
# Deploy cloudflare/ebpf_exporter for custom kernel metrics
helm repo add ebpf-exporter https://cloudflare.github.io/ebpf_exporter
helm install ebpf-exporter ebpf-exporter/ebpf-exporter \
  --namespace monitoring \
  --set config.programs[0].name=oom_kills \
  --set config.programs[0].metrics.counters[0].name=oom_kill_total \
  --set config.programs[0].metrics.counters[0].help="Total number of OOM kills"
```

Example ebpf_exporter config for tracking OOM kills and run queue latency:

```yaml
# ebpf-exporter-config.yaml
programs:
  - name: oom_kills
    metrics:
      counters:
        - name: oom_kill_total
          help: "Total number of OOM kills"
          labels:
            - name: cgroup
              size: 128
              decoders:
                - name: string
    kprobes:
      oom_kill_process: count_oom
  - name: runqlat
    metrics:
      histograms:
        - name: run_queue_latency_seconds
          help: "Run queue latency histogram in seconds"
          bucket_type: exp2
          bucket_min: 0
          bucket_max: 26
          bucket_multiplier: 0.000000001
    tracepoints:
      sched:sched_wakeup: trace_wakeup
      sched:sched_switch: trace_switch
```

### Grafana Dashboard

Import these community dashboards for eBPF metrics:

```bash
# Hubble dashboard -- Grafana dashboard ID 16611
# Cilium Agent dashboard -- Grafana dashboard ID 16612
# Cilium Operator dashboard -- Grafana dashboard ID 16613

# Or create a ConfigMap for automatic provisioning
kubectl create configmap grafana-cilium-dashboard \
  --from-file=cilium-dashboard.json \
  --namespace monitoring \
  -o yaml --dry-run=client | \
  kubectl label --local -f - grafana_dashboard=1 -o yaml | \
  kubectl apply -f -
```

Key Prometheus queries for eBPF-sourced metrics:

```promql
# Dropped packets rate by reason
rate(hubble_drop_total[5m])

# DNS error rate by query type
sum(rate(hubble_dns_responses_total{rcode!="No Error"}[5m])) by (rcode, qtypes)

# HTTP request latency (p99) from Hubble L7 visibility
histogram_quantile(0.99, sum(rate(hubble_http_request_duration_seconds_bucket[5m])) by (le, destination))

# TCP retransmit rate from eBPF exporter
rate(tcp_retransmits_total[5m])

# Run queue latency p99
histogram_quantile(0.99, sum(rate(run_queue_latency_seconds_bucket[5m])) by (le))
```

---


## 7. Network Observability

### L3/L4 Flow Logging

```bash
# Log all TCP connections with Hubble
hubble observe --type l3/l4 --protocol TCP --follow

# Filter SYN packets only (new connections)
hubble observe --type trace:to-endpoint --tcp-flags SYN --follow

# Export flows to a file for batch analysis
hubble observe --output json --since 1h > network-flows.json

# Count flows by destination service over the last hour
hubble observe --output json --since 1h | \
  jq -r '.destination.labels[] | select(startswith("k8s:app="))' | \
  sort | uniq -c | sort -rn | head -20
```

### L7 Protocol Visibility

Enable L7 visibility with Cilium annotations on target pods:

```yaml
# Annotate a namespace for HTTP visibility
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    policy.cilium.io/proxy-visibility: "<Egress/53/UDP/DNS>,<Ingress/80/TCP/HTTP>,<Ingress/443/TCP/HTTP>"
```

```bash
# Observe L7 HTTP flows
hubble observe --type l7 --protocol HTTP --follow

# Filter by HTTP status code (5xx errors)
hubble observe --type l7 --http-status "500+" --follow

# Filter by HTTP method and path
hubble observe --type l7 --http-method GET --http-path "/api/v1/.*" --follow
```

### DNS Monitoring

```bash
# All DNS queries and responses
hubble observe --type l7 --protocol DNS --follow

# DNS queries that returned NXDOMAIN
hubble observe --type l7 --protocol DNS --dns-rcode NXDOMAIN --follow

# DNS latency analysis with bpftrace
sudo bpftrace -e 'kprobe:dns_resolve { @start[tid] = nsecs; }
  kretprobe:dns_resolve /@start[tid]/ {
    @dns_latency_us = hist((nsecs - @start[tid]) / 1000);
    delete(@start[tid]);
  }'
```

### Service Dependency Map Generation

Hubble UI automatically generates service maps. For programmatic access:

```bash
# Get a service map via Hubble Relay API
hubble observe --output json --since 24h | \
  jq '{src: .source.labels, dst: .destination.labels, verdict: .verdict}' | \
  jq -s 'group_by(.src, .dst) | map({
    source: .[0].src,
    destination: .[0].dst,
    flow_count: length,
    verdicts: [.[].verdict] | group_by(.) | map({(.[0]): length}) | add
  })' > service-map.json
```

---


## 8. Security Monitoring

### Detect Container Escapes

```yaml
# container-escape-detection.yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: detect-container-escape
spec:
  kprobes:
    - call: "__x64_sys_unshare"
      syscall: true
      args:
        - index: 0
          type: "int"
      selectors:
        - matchActions:
            - action: Post
    - call: "__x64_sys_mount"
      syscall: true
      args:
        - index: 0
          type: "string"
        - index: 1
          type: "string"
        - index: 2
          type: "string"
      selectors:
        - matchArgs:
            - index: 2
              operator: "Equal"
              values:
                - "proc"
                - "sysfs"
                - "cgroup"
          matchActions:
            - action: Post
    - call: "__x64_sys_ptrace"
      syscall: true
      args:
        - index: 0
          type: "int"
      selectors:
        - matchActions:
            - action: Post
```

```bash
kubectl apply -f container-escape-detection.yaml
```

### Unexpected Syscall Detection

```yaml
# unexpected-syscalls.yaml -- alert on dangerous syscalls
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: unexpected-syscalls
spec:
  kprobes:
    - call: "__x64_sys_bpf"
      syscall: true
      args:
        - index: 0
          type: "int"
      selectors:
        - matchNamespaces:
            - namespace: Pid
              operator: NotIn
              values:
                - "host_ns"
          matchActions:
            - action: Post
    - call: "__x64_sys_perf_event_open"
      syscall: true
      selectors:
        - matchNamespaces:
            - namespace: Pid
              operator: NotIn
              values:
                - "host_ns"
          matchActions:
            - action: Post
    - call: "__x64_sys_init_module"
      syscall: true
      selectors:
        - matchActions:
            - action: Sigkill
```

### File Integrity Monitoring

```yaml
# file-integrity-monitor.yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: file-integrity-monitor
spec:
  kprobes:
    - call: "security_file_open"
      syscall: false
      args:
        - index: 0
          type: "file"
      selectors:
        - matchArgs:
            - index: 0
              operator: "Prefix"
              values:
                - "/etc/"
                - "/usr/bin/"
                - "/usr/sbin/"
                - "/usr/lib/"
          matchActions:
            - action: Post
              rateLimit: "1m"
    - call: "security_inode_rename"
      syscall: false
      args:
        - index: 0
          type: "path"
        - index: 1
          type: "path"
      selectors:
        - matchActions:
            - action: Post
```

```bash
kubectl apply -f file-integrity-monitor.yaml

# Stream events to your SIEM
kubectl logs -n kube-system ds/tetragon -c export-stdout -f | \
  jq 'select(.process_kprobe.policy_name == "file-integrity-monitor")' | \
  tee /dev/stderr | \
  curl -X POST -H "Content-Type: application/json" -d @- https://siem.internal/api/events
```

---


## 9. Performance Profiling

### Continuous Profiling with Parca

Parca uses eBPF to collect CPU profiles continuously with minimal overhead.

```bash
# Install Parca Agent via Helm
helm repo add parca https://parca-dev.github.io/helm-charts
helm repo update

helm install parca-agent parca/parca-agent \
  --namespace parca \
  --create-namespace \
  --set config.node=true \
  --set config.store.address="parca-server.parca.svc:7070" \
  --set config.store.insecure=true \
  --set config.debuginfo.strip=true \
  --set config.debuginfo.upload.enabled=true
```

### Continuous Profiling with Pyroscope

```bash
# Install Grafana Pyroscope with eBPF profiling
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install pyroscope grafana/pyroscope \
  --namespace pyroscope \
  --create-namespace \
  --set ebpf.enabled=true \
  --set agent.mode=ebpf
```

### CPU Flame Graphs with bpftrace

```bash
# Sample kernel and user stacks at 99Hz for 30 seconds
sudo bpftrace -e 'profile:hz:99 { @[kstack, ustack, comm] = count(); }' \
  -d 30 > stacks.out

# Using perf with BPF for flame graphs
sudo perf record -F 99 -a -g -- sleep 30
sudo perf script > perf.stacks

# Convert to flame graph (using Brendan Gregg's tools)
git clone https://github.com/brendangregg/FlameGraph.git
./FlameGraph/stackcollapse-perf.pl perf.stacks | \
  ./FlameGraph/flamegraph.pl > flamegraph.svg
```

### Off-CPU Analysis

```bash
# Trace off-CPU time to find where threads are blocked
sudo bpftrace -e '
  kprobe:finish_task_switch {
    $prev = (struct task_struct *)arg0;
    if ($prev->__state != 0) {
      @block_start[$prev->pid] = nsecs;
    }
    if (@block_start[tid]) {
      @off_cpu_us[kstack, comm] = sum((nsecs - @block_start[tid]) / 1000);
      delete(@block_start[tid]);
    }
  }
  END { print(@off_cpu_us, 20); }'
```

### Memory Leak Detection

```bash
# Track memory allocations not freed
sudo bpftrace -e '
  kprobe:kmalloc { @allocs[kstack] = count(); @bytes[kstack] = sum(arg0); }
  kprobe:kfree { @frees = count(); }
  interval:s:10 { print(@bytes, 10); }
'

# Per-process heap growth tracking
sudo bpftrace -e '
  uprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc { @size[comm, tid] = sum(arg0); }
  interval:s:5 { print(@size, 10); clear(@size); }
'
```

---


## 10. Troubleshooting

### Common eBPF Issues

**BPF verifier rejects program:**

```bash
# Get verbose verifier output
sudo bpftrace -d -e 'your_program_here' 2>&1 | tail -50

# Common causes:
# - Unbounded loops (BPF requires bounded loops or unrolled iterations)
# - Stack size exceeds 512 bytes
# - Accessing memory without null checks
# - Back-edges in control flow (pre-5.3 kernels)
```

**BTF not available:**

```bash
# Check if BTF is compiled into the kernel
cat /boot/config-$(uname -r) | grep CONFIG_DEBUG_INFO_BTF

# If not, install BTF data from btfhub
# https://github.com/aquasecurity/btfhub
wget "https://github.com/aquasecurity/btfhub-archive/raw/main/ubuntu/22.04/x86_64/$(uname -r).btf.tar.xz"
tar xvf "$(uname -r).btf.tar.xz"
```

**Permission denied:**

```bash
# BPF requires CAP_BPF (or CAP_SYS_ADMIN on older kernels)
# For containers, add to securityContext:
# securityContext:
#   capabilities:
#     add: ["BPF", "PERFMON", "SYS_RESOURCE"]

# Check current capabilities
cat /proc/self/status | grep Cap
capsh --decode=$(cat /proc/self/status | grep CapEff | awk '{print $2}')
```

**Cilium pods not starting:**

```bash
# Check Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=100

# Verify BPF filesystem
kubectl exec -n kube-system ds/cilium -- mount | grep bpf

# Check for conflicting CNIs
ls /etc/cni/net.d/

# Run Cilium connectivity test
cilium connectivity test
```

**Tetragon events missing:**

```bash
# Verify TracingPolicy is loaded
kubectl get tracingpolicies

# Check Tetragon agent logs for verifier errors
kubectl logs -n kube-system ds/tetragon -c tetragon --tail=200 | grep -i error

# Verify the kprobe is attached
kubectl exec -n kube-system ds/tetragon -c tetragon -- \
  cat /sys/kernel/debug/kprobes/list | grep your_function
```

**High overhead from eBPF programs:**

```bash
# List all loaded BPF programs and their run time
sudo bpftool prog show
sudo bpftool prog profile id <PROG_ID> duration 5

# Check map memory usage
sudo bpftool map show
sudo bpftool map dump id <MAP_ID> | wc -l

# If a program is consuming too much CPU, check its run count and time
sudo bpftool prog show id <PROG_ID> --json | jq '{run_cnt, run_time_ns}'

# Detach a misbehaving program
sudo bpftool prog detach id <PROG_ID> type <ATTACH_TYPE>
```

### Kernel Compatibility Matrix

```bash
# Quick check: which eBPF features your kernel supports
sudo bpftool feature probe kernel

# Check specific program types
sudo bpftool feature probe kernel | grep program_type

# Check available map types
sudo bpftool feature probe kernel | grep map_type

# Check available helper functions
sudo bpftool feature probe kernel | grep helper
```

