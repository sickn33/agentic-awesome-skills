---
name: gpu-server-management
description: Set up and manage NVIDIA GPU servers for AI workloads
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

# GPU Server Management

Provision, configure, and monitor NVIDIA GPU servers for AI inference and training workloads.

## When to Use This Skill

Use this skill when:
- Setting up a new GPU server for LLM inference or model training
- Installing or upgrading NVIDIA drivers and CUDA toolkit
- Configuring Docker with NVIDIA Container Toolkit for GPU workloads
- Partitioning A100/H100 GPUs with MIG for multi-tenant workloads
- Troubleshooting GPU errors, driver issues, or thermal throttling

## Prerequisites

- Ubuntu 22.04 LTS (recommended) or RHEL 8/9
- NVIDIA GPU (A10G, A100, H100, RTX 4090, or L40S recommended)
- Root or sudo access
- Internet access for package downloads

## Driver Installation (Ubuntu)

```bash
# Remove old drivers
sudo apt purge -y 'nvidia*' 'cuda*' 'libcuda*'
sudo apt autoremove -y

# Add NVIDIA package repository
distribution=$(. /etc/os-release; echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt update

# Install latest driver (560.x as of 2025)
sudo apt install -y nvidia-driver-560 cuda-toolkit-12-6

# Install NVIDIA Container Toolkit (Docker GPU support)
sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify
nvidia-smi
nvcc --version
docker run --rm --gpus all nvidia/cuda:12.6.0-base-ubuntu22.04 nvidia-smi
```

## Post-Install Configuration

```bash
# Enable persistence mode (reduces driver initialization latency)
sudo nvidia-smi -pm 1

# Set power limit (reduce heat/noise on inference servers)
sudo nvidia-smi -pl 350          # watts; check TDP for your GPU model

# Disable ECC on inference servers (frees ~6% VRAM, less safe)
sudo nvidia-smi --ecc-config=0   # requires reboot

# Enable P2P for multi-GPU NVLink training
sudo nvidia-smi topo -m          # check NVLink topology
```

## GPU Health Monitoring

```bash
# Real-time monitoring (like htop for GPUs)
watch -n 1 nvidia-smi

# Detailed stats
nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,\
utilization.memory,memory.used,memory.free,power.draw,clocks.current.graphics \
--format=csv --loop=1

# DCGM — production monitoring daemon (for clusters)
sudo apt install -y datacenter-gpu-manager
sudo systemctl start dcgm
dcgmi discovery -l                # list GPUs
dcgmi diag -r 1                  # quick health check
dcgmi diag -r 3                  # full diagnostic (takes ~20 min)

# Check GPU errors (XID errors — important for stability)
sudo dmesg | grep -i "NVRM\|nvidia\|XID"
nvidia-smi --query-gpu=ecc.errors.corrected.volatile.total \
  --format=csv,noheader
```

## Prometheus GPU Metrics (DCGM Exporter)

```bash
# Deploy DCGM Exporter for Prometheus scraping
docker run -d \
  --name dcgm-exporter \
  --gpus all \
  --cap-add SYS_ADMIN \
  -p 9400:9400 \
  --restart unless-stopped \
  nvcr.io/nvidia/k8s/dcgm-exporter:latest

# Key metrics exposed:
# DCGM_FI_DEV_GPU_UTIL          - GPU utilization %
# DCGM_FI_DEV_MEM_COPY_UTIL     - Memory bandwidth utilization
# DCGM_FI_DEV_FB_USED           - Framebuffer memory used (MB)
# DCGM_FI_DEV_SM_CLOCK          - SM clock speed (MHz)
# DCGM_FI_DEV_GPU_TEMP          - Temperature (°C)
# DCGM_FI_DEV_POWER_USAGE       - Power draw (W)
# DCGM_FI_DEV_XID_ERRORS        - XID error count (0 = healthy)
```

## MIG Partitioning (A100/H100)

MIG (Multi-Instance GPU) allows slicing one GPU into isolated smaller GPUs.

```bash
# Enable MIG mode (requires reboot or restart of all processes)
sudo nvidia-smi -mig 1
sudo systemctl restart nvidia-persistenced

# List available MIG profiles (A100 80GB example)
nvidia-smi mig -lgip
# 1g.10gb   — 1 slice,  10GB (max 7 instances)
# 2g.20gb   — 2 slices, 20GB (max 3 instances)
# 3g.40gb   — 3 slices, 40GB (max 2 instances)
# 7g.80gb   — full GPU, 80GB (max 1 instance)

# Create MIG instances (e.g., 3× 2g.20gb + 1× 2g.20gb = multi-tenant)
sudo nvidia-smi mig -cgi 2g.20gb,2g.20gb,2g.20gb,2g.20gb -C

# List created instances
nvidia-smi mig -lgi
nvidia-smi mig -lcgi

# Use in Docker
docker run --gpus '"device=MIG-GPU-xxx/0/0"' ...

# Disable MIG
sudo nvidia-smi mig -i 0 -dci
sudo nvidia-smi mig -i 0 -dgi
sudo nvidia-smi -mig 0
```

## Kernel & OS Tuning for GPU Servers

```bash
# Increase file descriptor limits
echo '* soft nofile 1048576' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 1048576' | sudo tee -a /etc/security/limits.conf

# Disable transparent huge pages (reduces latency jitter)
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Persist via rc.local or systemd unit:
cat <<'EOF' | sudo tee /etc/rc.local
#!/bin/bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
nvidia-smi -pm 1
exit 0
EOF
sudo chmod +x /etc/rc.local

# PCIe performance mode
sudo nvidia-smi --auto-boost-default=0
sudo nvidia-smi --auto-boost-permission=0
```

## Multi-GPU Topology Check

```bash
# Check NVLink and PCIe topology
nvidia-smi topo -m
# Output shows interconnect type:
# NV4 = NVLink 4.0 (H100 SXM)
# NV2 = NVLink 2.0 (A100 SXM)
# PHB = PCIe bus (slower; avoid for tensor parallel training)
# PIX = same PCIe switch (fast)

# Bandwidth test between GPUs
/usr/local/cuda/samples/bin/x86_64/linux/release/p2pBandwidthLatencyTest
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `nvidia-smi: command not found` | Driver not installed | Follow driver installation steps above |
| Driver version mismatch | CUDA/driver incompatibility | Check compatibility matrix at developer.nvidia.com |
| GPU temperature >85°C | Poor airflow or fan failure | Check `nvidia-smi -q -d TEMPERATURE`; reseat cooler |
| XID 79 errors | GPU hardware error | Run `dcgmi diag -r 3`; may need GPU replacement |
| `failed to open device` in container | Container toolkit not configured | Run `nvidia-ctk runtime configure --runtime=docker` |
| Low PCIe bandwidth | Wrong slot or power limit | Check `nvidia-smi -q | grep PCIe`; use x16 slot |

## Best Practices

- Always enable persistence mode (`nvidia-smi -pm 1`) — reduces first-request latency.
- Monitor XID errors; persistent XID 79/94 indicates hardware failure.
- For training: use NVLink-connected GPUs; for inference: PCIe is usually fine.
- Set up DCGM alerts on temperature >80°C and power draw near TDP.
- Use MIG for multi-tenant inference to provide GPU isolation between models.

## Related Skills

- vllm-server (`vllm-server`) - LLM inference on GPUs
- llm-fine-tuning (`llm-fine-tuning`) - GPU training setup
- linux-hardening (`linux-hardening`) - Secure the host OS
- prometheus-grafana (`prometheus-grafana`) - Metrics dashboards

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

