---
name: ebpf-observability
description: Use eBPF for deep kernel-level observability — trace syscalls, network
  flows, and application behavior without code changes using Cilium, Tetragon, and
  bpftrace.
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

# eBPF Observability

eBPF (extended Berkeley Packet Filter) allows you to run sandboxed programs in the Linux kernel without modifying kernel source code or loading kernel modules. This skill covers using eBPF for deep observability, network monitoring, and security enforcement across cloud-native infrastructure.

---

## 2. Prerequisites

### Kernel Version Requirements

| Feature                  | Minimum Kernel | Recommended Kernel |
|--------------------------|----------------|--------------------|
| Basic BPF maps & probes  | 4.9            | 5.10+              |
| BPF CO-RE (BTF support)  | 5.2            | 5.10+              |
| BPF ring buffer          | 5.8            | 5.10+              |
| BPF LSM hooks            | 5.7            | 5.15+              |
| Cilium full features     | 4.19           | 5.10+              |
| Tetragon                 | 4.19           | 5.13+              |

### Verify Kernel Support

```bash
# Check kernel version
uname -r

# Verify BTF (BPF Type Format) is enabled -- required for CO-RE
ls /sys/kernel/btf/vmlinux

# Check BPF filesystem is mounted
mount | grep bpf

# If not mounted, mount it
sudo mount -t bpf bpf /sys/fs/bpf

# Verify BPF JIT is enabled
cat /proc/sys/net/core/bpf_jit_enable
# Should return 1; if not:
sudo sysctl net.core.bpf_jit_enable=1
```

### Install Toolchain

```bash
# Ubuntu/Debian -- install bpftrace, bcc tools, and libbpf
sudo apt-get update
sudo apt-get install -y bpftrace bpfcc-tools libbpf-dev linux-headers-$(uname -r)

# Fedora/RHEL
sudo dnf install -y bpftrace bcc-tools libbpf-devel kernel-devel

# Verify bpftrace works
sudo bpftrace -e 'BEGIN { printf("eBPF is working\n"); exit(); }'
```

---

## 3. Cilium Setup

Cilium replaces kube-proxy with eBPF-based networking, providing identity-aware security and deep network observability via Hubble.

### Install Cilium on Kubernetes

```bash
# Add the Cilium Helm repo
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with Hubble enabled
helm install cilium cilium/cilium --version 1.16.4 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost="${API_SERVER_IP}" \
  --set k8sServicePort="${API_SERVER_PORT}" \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enableOpenMetrics=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,httpV2:exemplars=true;labelsContext=source_ip\,source_namespace\,source_workload\,destination_ip\,destination_namespace\,destination_workload}"

# Wait for Cilium to be ready
cilium status --wait
```

### Install the Cilium CLI and Hubble CLI

```bash
# Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz"
sudo tar xzvf cilium-linux-amd64.tar.gz -C /usr/local/bin
rm cilium-linux-amd64.tar.gz

# Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name "https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-amd64.tar.gz"
sudo tar xzvf hubble-linux-amd64.tar.gz -C /usr/local/bin
rm hubble-linux-amd64.tar.gz
```

### Hubble Network Observability

```bash
# Port-forward the Hubble Relay
cilium hubble port-forward &

# Observe all flows in real time
hubble observe --follow

# Filter flows by namespace
hubble observe --namespace production --follow

# Filter by verdict (dropped traffic)
hubble observe --verdict DROPPED --follow

# Filter by DNS queries
hubble observe --protocol DNS --follow

# Filter HTTP traffic to a specific service
hubble observe --to-label "app=api-server" --protocol HTTP --follow

# Export flows as JSON for ingestion into SIEM
hubble observe --output json --last 1000 > flows.json
```

### Hubble UI Access

```bash
# Port-forward the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Access at http://localhost:12000 -- provides a real-time service dependency map
```

---

## 4. Tetragon for Security

Tetragon is Cilium's runtime security enforcement engine. It uses eBPF to observe and enforce security policies at the kernel level with zero application changes.

### Install Tetragon

```bash
helm repo add cilium https://helm.cilium.io/
helm repo update

helm install tetragon cilium/tetragon \
  --namespace kube-system \
  --set tetragon.grpc.enabled=true \
  --set tetragon.exportFilename=/var/run/cilium/tetragon/tetragon.log

# Install the tetra CLI
curl -LO "https://github.com/cilium/tetragon/releases/latest/download/tetra-linux-amd64.tar.gz"
sudo tar xzvf tetra-linux-amd64.tar.gz -C /usr/local/bin
rm tetra-linux-amd64.tar.gz
```

### Process Execution Monitoring

```yaml
# process-monitor.yaml -- TracingPolicy to monitor all process executions
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: process-execution-monitor
spec:
  kprobes: []
  tracepoints: []
  uprobes: []
  enforcers: []
  # process_exec and process_exit events are always emitted by default
  # Use tetra CLI to observe them:
```

```bash
# Watch all process executions cluster-wide
kubectl exec -n kube-system ds/tetragon -c tetragon -- tetra getevents -o compact --process-exec

# Filter to a specific namespace
kubectl exec -n kube-system ds/tetragon -c tetragon -- tetra getevents -o compact \
  --namespace production
```

### File Access Tracking

```yaml
# file-access-policy.yaml -- detect reads/writes to sensitive files
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: sensitive-file-access
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
                - "/etc/shadow"
                - "/etc/passwd"
                - "/etc/kubernetes/pki"
                - "/var/run/secrets/kubernetes.io"
                - "/root/.ssh"
```

```bash
kubectl apply -f file-access-policy.yaml

# Observe file access events
kubectl exec -n kube-system ds/tetragon -c tetragon -- tetra getevents -o compact \
  | grep "sensitive-file-access"
```

### Network Connection Enforcement

```yaml
# restrict-egress.yaml -- block unexpected outbound connections
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: restrict-egress-connections
spec:
  kprobes:
    - call: "tcp_connect"
      syscall: false
      args:
        - index: 0
          type: "sock"
      selectors:
        - matchArgs:
            - index: 0
              operator: "DAddr"
              values:
                - "169.254.169.254"  # Block IMDS access
          matchActions:
            - action: Sigkill
        - matchNamespaces:
            - namespace: Mnt
              operator: NotIn
              values:
                - "host_mnt"
```

```bash
kubectl apply -f restrict-egress.yaml
```

### Privileged Escalation Detection

```yaml
# detect-privilege-escalation.yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: detect-privilege-escalation
spec:
  kprobes:
    - call: "__x64_sys_setuid"
      syscall: true
      args:
        - index: 0
          type: "int"
      selectors:
        - matchArgs:
            - index: 0
              operator: "Equal"
              values:
                - "0"
          matchActions:
            - action: Post
              rateLimit: "1m"
    - call: "__x64_sys_setns"
      syscall: true
      args:
        - index: 1
          type: "int"
      selectors:
        - matchActions:
            - action: Post
```

```bash
kubectl apply -f detect-privilege-escalation.yaml
```

---

## 5. bpftrace One-Liners

These are practical bpftrace commands you can run directly in production for targeted debugging.

### Syscall Latency

```bash
# Trace read() syscall latency distribution (microseconds)
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; }
  tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    @usecs = hist((nsecs - @start[tid]) / 1000);
    delete(@start[tid]);
  }'

# Top 10 slowest syscalls by total time
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @start[tid] = nsecs; }
  tracepoint:raw_syscalls:sys_exit /@start[tid]/ {
    @ns[probe] = sum(nsecs - @start[tid]);
    delete(@start[tid]);
  } END { print(@ns, 10); }'
```

### DNS Tracing

```bash
# Trace DNS queries via UDP port 53 sends
sudo bpftrace -e 'kprobe:udp_sendmsg {
    $sk = (struct sock *)arg0;
    $dport = ($sk->__sk_common.skc_dport >> 8) | (($sk->__sk_common.skc_dport & 0xff) << 8);
    if ($dport == 53) {
      printf("%-8d %-16s DNS query to %s\n", pid, comm,
        ntop($sk->__sk_common.skc_daddr));
    }
  }'

# Count DNS queries by source process
sudo bpftrace -e 'kprobe:udp_sendmsg {
    $sk = (struct sock *)arg0;
    $dport = ($sk->__sk_common.skc_dport >> 8) | (($sk->__sk_common.skc_dport & 0xff) << 8);
    if ($dport == 53) { @dns[comm] = count(); }
  }'
```

### TCP Retransmits

```bash
# Trace TCP retransmits with source/destination
sudo bpftrace -e 'kprobe:tcp_retransmit_skb {
    $sk = (struct sock *)arg0;
    $daddr = ntop($sk->__sk_common.skc_daddr);
    $saddr = ntop($sk->__sk_common.skc_rcv_saddr);
    $dport = ($sk->__sk_common.skc_dport >> 8) | (($sk->__sk_common.skc_dport & 0xff) << 8);
    $sport = $sk->__sk_common.skc_num;
    printf("%-20s %-6d -> %-20s %-6d (%s)\n", $saddr, $sport, $daddr, $dport, comm);
  }'
```

### Disk I/O Latency

```bash
# Block I/O latency histogram by device
sudo bpftrace -e 'tracepoint:block:block_rq_issue { @start[args->dev, args->sector] = nsecs; }
  tracepoint:block:block_rq_complete /@start[args->dev, args->sector]/ {
    @usecs[args->dev] = hist((nsecs - @start[args->dev, args->sector]) / 1000);
    delete(@start[args->dev, args->sector]);
  }'

# Top processes by disk I/O bytes
sudo bpftrace -e 'tracepoint:block:block_rq_issue {
    @bytes[comm] = sum(args->bytes);
  } interval:s:5 { print(@bytes, 10); clear(@bytes); }'
```

### Container-Aware Tracing

```bash
# Trace process exec inside containers (cgroup-filtered)
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_execve {
    printf("%-8d %-8d %-16s %s\n", pid, cgroup, comm, str(args->filename));
  }'

# Memory allocation hotspots per container
sudo bpftrace -e 'kprobe:__alloc_pages { @pages[cgroup] = count(); }
  interval:s:10 { print(@pages, 10); clear(@pages); }'
```

---


## Contents

- [6. Prometheus Integration](references/details.md)
- [7. Network Observability](references/details.md)
- [8. Security Monitoring](references/details.md)
- [9. Performance Profiling](references/details.md)
- [10. Troubleshooting](references/details.md)

## When to Use

Use eBPF-based observability when you need:

- **Deep performance debugging** -- trace kernel-level latency, syscall overhead, and scheduling delays that application-level metrics cannot reveal.
- **Network observability without sidecars** -- capture L3/L4/L7 flows, DNS queries, and TCP state transitions directly from the kernel, eliminating the CPU and memory overhead of sidecar proxies.
- **Security monitoring at the kernel boundary** -- detect container escapes, unexpected process execution, sensitive file access, and anomalous syscall patterns in real time.
- **Continuous profiling in production** -- generate CPU flame graphs and memory allocation profiles with negligible overhead (typically under 1% CPU).
- **Service mesh replacement or augmentation** -- Cilium can replace kube-proxy and provide identity-aware network policies enforced at the kernel level.

Avoid eBPF when your kernel version is below 4.19, when you are running on managed platforms that restrict BPF capabilities, or when your debugging needs are fully met by application-level tracing.

---

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
