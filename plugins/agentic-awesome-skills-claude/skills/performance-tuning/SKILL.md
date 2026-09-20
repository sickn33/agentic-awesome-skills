---
name: performance-tuning
description: Optimize Linux system performance. Configure kernel parameters, analyze
  bottlenecks, and tune resources. Use when improving system performance.
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

# Performance Tuning

Optimize Linux system performance through kernel parameter tuning, I/O scheduler selection, memory management, CPU governor configuration, and benchmarking. Covers methodology, real sysctl settings, and tool-based validation.

## When to Use

- Server experiencing high latency, throughput bottlenecks, or resource exhaustion
- Preparing infrastructure for high-traffic events or load tests
- Tuning a database server, web server, or application host for production
- Diagnosing whether a bottleneck is CPU, memory, disk I/O, or network
- Establishing baseline performance metrics before and after changes
- Configuring kernel parameters for containers, VMs, or bare-metal hosts

## Prerequisites

- Root or sudo access on the target system
- `sysstat` package installed (provides `sar`, `iostat`, `mpstat`)
- `linux-tools` or `perf` package for CPU profiling
- Benchmarking tools: `fio` (disk), `sysbench` (CPU/memory), `iperf3` (network)
- Baseline metrics collected before making any changes

## Performance Analysis Methodology

Always follow this order:

1. **Collect baseline** -- measure current performance with tools
2. **Identify bottleneck** -- determine if CPU, memory, I/O, or network
3. **Change one parameter** -- apply a single tuning change
4. **Measure impact** -- re-run the same benchmark
5. **Document** -- record the change and its effect
6. **Iterate or revert** -- keep the change if beneficial, revert if not

## System Monitoring Tools

```bash
# CPU and process monitoring
top                              # Interactive process viewer
htop                             # Enhanced interactive viewer
mpstat -P ALL 2                  # Per-CPU utilization every 2 seconds
pidstat -u 2                     # Per-process CPU usage

# Memory monitoring
free -h                          # Memory summary
vmstat 2                         # Virtual memory stats every 2 seconds
# Columns: r=runnable, b=blocked, si/so=swap in/out, bi/bo=block I/O

# Disk I/O monitoring
iostat -xz 2                     # Extended disk stats every 2 seconds
# Key columns: %util, await (latency), r/s, w/s
iotop -oP                        # Show processes doing I/O

# Network monitoring
sar -n DEV 2                     # Network interface stats
ss -s                            # Socket summary
nstat                            # Network counters

# CPU profiling (requires perf)
perf top                         # Real-time function-level CPU profiling
perf stat -a sleep 10            # System-wide counters for 10 seconds
perf record -g -a sleep 30       # Record 30 seconds of call stacks
perf report                      # Analyze recorded data

# One-liner: check all major resources
echo "=== CPU ===" && mpstat 1 1 && echo "=== MEM ===" && free -h && echo "=== DISK ===" && iostat -x 1 1 && echo "=== NET ===" && ss -s
```

## Sysctl Kernel Parameter Tuning

### Network Tuning

```bash
# /etc/sysctl.d/60-network-performance.conf

# Increase the maximum socket receive/send buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576

# TCP buffer auto-tuning (min, default, max in bytes)
net.ipv4.tcp_rmem = 4096 1048576 134217728
net.ipv4.tcp_wmem = 4096 1048576 134217728

# Increase connection backlog for high-traffic servers
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65535

# Enable TCP fast open (client and server)
net.ipv4.tcp_fastopen = 3

# Reuse TIME_WAIT sockets for new connections
net.ipv4.tcp_tw_reuse = 1

# Increase the range of ephemeral ports
net.ipv4.ip_local_port_range = 1024 65535

# TCP keepalive tuning (detect dead connections faster)
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3

# Disable slow start after idle (keeps congestion window open)
net.ipv4.tcp_slow_start_after_idle = 0

# Enable BBR congestion control (requires kernel 4.9+)
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
```

### Memory Tuning

```bash
# /etc/sysctl.d/60-memory-performance.conf

# Reduce swappiness (0-100, lower = less swap usage)
# 10 for general servers, 1 for database servers
vm.swappiness = 10

# Dirty page ratios (controls when dirty data is flushed to disk)
# Lower values = more frequent, smaller writes (better for SSDs)
vm.dirty_ratio = 20
vm.dirty_background_ratio = 5

# For large-memory systems writing to fast storage
# vm.dirty_ratio = 40
# vm.dirty_background_ratio = 10

# Increase inotify limits (for apps watching many files)
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 1024

# Maximum number of open file descriptors system-wide
fs.file-max = 2097152

# Virtual memory overcommit
# 0 = heuristic (default), 1 = always overcommit, 2 = never overcommit
vm.overcommit_memory = 0

# For Redis or similar in-memory stores, use:
# vm.overcommit_memory = 1

# Disable Transparent Huge Pages if it causes latency spikes (common with databases)
# Done via boot parameter or runtime:
# echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
```

### Applying Sysctl Changes

```bash
# Apply all sysctl files
sysctl --system

# Apply a specific file
sysctl -p /etc/sysctl.d/60-network-performance.conf

# Set a parameter temporarily (lost on reboot)
sysctl -w vm.swappiness=10

# Verify a parameter
sysctl vm.swappiness
sysctl net.ipv4.tcp_congestion_control
```

## I/O Scheduler Configuration

```bash
# Check the current scheduler for a device
cat /sys/block/sda/queue/scheduler
# Output example: [mq-deadline] none kyber bfq

# Set the scheduler temporarily
echo mq-deadline > /sys/block/sda/queue/scheduler   # Good for databases
echo none > /sys/block/nvme0n1/queue/scheduler       # Best for NVMe SSDs
echo bfq > /sys/block/sda/queue/scheduler            # Good for interactive desktop

# Scheduler recommendations:
# NVMe SSD:  none (noop)    -- minimal overhead, hardware handles scheduling
# SATA SSD:  mq-deadline    -- provides fairness with low latency
# HDD:       mq-deadline    -- prevents starvation, good for databases
# Desktop:   bfq            -- prioritizes interactive I/O

# Make persistent via udev rule
cat <<'EOF' > /etc/udev/rules.d/60-io-scheduler.rules
# Set mq-deadline for rotational (HDD) devices
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"
# Set none for non-rotational (SSD/NVMe) devices
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
EOF

udevadm control --reload-rules

# Tune read-ahead for sequential workloads (database sequential scans)
blockdev --setrahead 4096 /dev/sda    # 4096 sectors = 2 MB

# Enable TRIM for SSDs (weekly via systemd timer)
systemctl enable --now fstrim.timer
fstrim -av    # Manual run
```

## CPU Governor Configuration

```bash
# Check available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
# Output: performance powersave schedutil

# Check current governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Set all CPUs to performance mode (maximum frequency)
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
  echo performance > "$cpu"
done

# Set using cpupower (if installed)
cpupower frequency-set -g performance

# Governor recommendations:
# Server (production):   performance    -- max frequency, lowest latency
# Server (general):      schedutil      -- kernel-driven dynamic scaling
# Laptop / idle server:  powersave      -- minimize power consumption

# Make persistent via systemd service
cat <<'EOF' > /etc/systemd/system/cpu-governor.service
[Unit]
Description=Set CPU governor to performance

[Service]
Type=oneshot
ExecStart=/usr/bin/cpupower frequency-set -g performance
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now cpu-governor

# Disable CPU boost (turbo) if consistent latency is needed
echo 1 > /sys/devices/system/cpu/intel_pstate/no_turbo
```

## Benchmarking Tools

### fio -- Disk I/O Benchmarking

```bash
# Install fio
apt install -y fio    # Debian/Ubuntu
dnf install -y fio    # RHEL/CentOS

# Sequential read test (simulates backup reads)
fio --name=seq-read --ioengine=libaio --direct=1 --rw=read \
  --bs=1M --numjobs=4 --size=1G --runtime=60 --time_based --group_reporting

# Sequential write test
fio --name=seq-write --ioengine=libaio --direct=1 --rw=write \
  --bs=1M --numjobs=4 --size=1G --runtime=60 --time_based --group_reporting

# Random read (4K blocks -- simulates database IOPS)
fio --name=rand-read --ioengine=libaio --direct=1 --rw=randread \
  --bs=4k --numjobs=16 --iodepth=64 --size=1G --runtime=60 --time_based --group_reporting

# Random write (4K blocks)
fio --name=rand-write --ioengine=libaio --direct=1 --rw=randwrite \
  --bs=4k --numjobs=16 --iodepth=64 --size=1G --runtime=60 --time_based --group_reporting

# Mixed random read/write (70/30 -- typical database workload)
fio --name=mixed --ioengine=libaio --direct=1 --rw=randrw --rwmixread=70 \
  --bs=4k --numjobs=8 --iodepth=32 --size=1G --runtime=60 --time_based --group_reporting
```

### sysbench -- CPU and Memory Benchmarking

```bash
# Install: apt install -y sysbench (Debian) / dnf install -y sysbench (RHEL)

# CPU benchmark
sysbench cpu --threads=4 --time=30 run

# Memory benchmark
sysbench memory --threads=4 --time=30 --memory-block-size=1K --memory-total-size=100G run
```

### iperf3 -- Network Benchmarking

```bash
# Install iperf3
apt install -y iperf3

# Start server on one host
iperf3 -s

# Run client test from another host
iperf3 -c <server-ip> -t 30 -P 4    # 30 seconds, 4 parallel streams

# Test with UDP (measure packet loss)
iperf3 -c <server-ip> -u -b 1G -t 30

# Reverse mode (server sends to client)
iperf3 -c <server-ip> -R -t 30
```

## Quick-Reference Tuning Profiles

### Web Server (nginx/Apache)

```bash
# /etc/sysctl.d/60-webserver.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fastopen = 3
net.ipv4.ip_local_port_range = 1024 65535
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
fs.file-max = 2097152
vm.swappiness = 10
```

### Database Server (PostgreSQL/MySQL)

```bash
# /etc/sysctl.d/60-database.conf
vm.swappiness = 1
vm.dirty_ratio = 15
vm.dirty_background_ratio = 3
vm.overcommit_memory = 2
vm.overcommit_ratio = 80
net.core.somaxconn = 4096
fs.file-max = 2097152
# Disable THP for databases
# echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| High CPU, no obvious process | `perf top`, `mpstat -P ALL 2` | Check for kernel-level issues: softirqs, interrupts |
| High load avg, low CPU usage | `vmstat 2` (check `b` column) | I/O bottleneck: tune scheduler, check disk health |
| System swapping heavily | `free -h`, `vmstat 2` (check si/so) | Reduce `vm.swappiness`, add RAM, find memory leak |
| Disk latency spikes | `iostat -x 2` (check await) | Switch I/O scheduler, reduce dirty ratio, add SSD |
| "Too many open files" error | `cat /proc/sys/fs/file-nr` | Increase `fs.file-max` and `LimitNOFILE` |
| Network throughput low | `iperf3 -c <server>`, `ethtool` | Increase buffer sizes, enable BBR, check MTU |
| Application timeout under load | `ss -s`, `sysctl net.core.somaxconn` | Increase `somaxconn` and `tcp_max_syn_backlog` |
| Inconsistent latency | Check CPU governor | Set governor to `performance`, disable turbo boost |

## Related Skills

- `linux-administration` -- General system monitoring and management
- `systemd-services` -- Resource limits via cgroups in unit files
- `block-storage` -- Storage-level performance (LVM, RAID, filesystems)
- `nfs-storage` -- NFS-specific performance tuning

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

