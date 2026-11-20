#!/usr/bin/env bash
# Print the real memory footprint (bytes) of a containerised model server, for bench.py's memory watchdog.
#   mem.sh CONTAINER [unified]
# Discrete NVIDIA GPU: sums nvidia-smi used memory of the container's processes + container anon RSS.
# Unified memory (Intel/AMD iGPU, Linux DRM drivers): sums drm-resident-* (deduplicated by drm-client-id)
# over the container's processes + cgroup anon. Use an authorized probe for your own
# disposable test container. A partial residency reading cannot establish a memory ceiling.
set -euo pipefail
c=${1:?container name}; mode=${2:-auto}
pids=$(docker top "$c" -eo pid 2>/dev/null | tail -n +2 | tr '\n' ' ')
[ -z "$pids" ] && { echo 0; exit 0; }
cid=$(docker inspect -f '{{.Id}}' "$c")
cg=$(ls -d /sys/fs/cgroup/system.slice/docker-"$cid".scope /sys/fs/cgroup/docker/"$cid" 2>/dev/null | head -1 || true)
anon=$(awk '/^anon /{print $2}' "$cg/memory.stat" 2>/dev/null || echo 0)
gpu=0
if [ "$mode" != unified ] && command -v nvidia-smi >/dev/null; then
  for p in $pids; do
    m=$(nvidia-smi --query-compute-apps=pid,used_memory --format=csv,noheader,nounits | awk -F', ' -v p="$p" '$1==p{print $2}')
    gpu=$((gpu + ${m:-0} * 1048576))
  done
else
  declare -A seen
  for p in $pids; do
    for f in /proc/"$p"/fdinfo/*; do
      id=$(awk '/drm-client-id/{print $2}' "$f" 2>/dev/null) || continue
      [ -z "$id" ] && continue; [ -n "${seen[$id]:-}" ] && continue; seen[$id]=1
      kb=$(awk '/drm-resident-/{s+=$2} END{print s+0}' "$f"); gpu=$((gpu + kb * 1024))
    done
  done
fi
echo $((gpu + ${anon:-0}))
