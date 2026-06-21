#!/usr/bin/env bash
# 5-second resolution memory + CPU + GPU profiler for AutoDL training.
# Catches val-phase memory spikes that can cgroup-wedge an instance.
#
# Usage: bash mem_monitor.sh > /root/autodl-tmp/runs/logs/mem.tsv 2>&1 &
#   Run in tmux session (separate from training tmux).
#
# Output: TSV with columns:
#   timestamp  cgroup_gb  cpu_pct  main_pid  main_rss_gb  main_threads  main_fds  n_python  total_python_rss_gb  wandb_pid  wandb_rss_gb  gpu_util_pct  gpu_mem_mb

set -u

# Header
printf "timestamp\tcgroup_gb\tcpu_pct\tmain_pid\tmain_rss_gb\tmain_threads\tmain_fds\tn_python\ttotal_python_rss_gb\twandb_pid\twandb_rss_gb\tgpu_util_pct\tgpu_mem_mb\n"

while true; do
    ts=$(date '+%Y-%m-%d %H:%M:%S')

    # cgroup current memory (bytes → GB)
    cgroup_bytes=$(cat /sys/fs/cgroup/memory.current 2>/dev/null || echo 0)
    cgroup_gb=$(awk "BEGIN{printf \"%.2f\", $cgroup_bytes/1073741824}")

    # Total CPU usage from /proc/stat (rough; just diff once)
    cpu_pct=$(top -bn1 | grep "Cpu(s)" | awk '{print $2+$4}')

    # Main src.train python PID + RSS
    main_pid=$(pgrep -f 'src.train' | head -1)
    if [ -n "$main_pid" ]; then
        main_rss=$(awk '/VmRSS/ {print $2}' /proc/$main_pid/status 2>/dev/null || echo 0)
        main_rss_gb=$(awk "BEGIN{printf \"%.2f\", $main_rss/1048576}")
        main_threads=$(awk '/Threads/ {print $2}' /proc/$main_pid/status 2>/dev/null || echo 0)
        main_fds=$(ls /proc/$main_pid/fd 2>/dev/null | wc -l)
    else
        main_pid=0; main_rss_gb=0; main_threads=0; main_fds=0
    fi

    # All python processes total RSS
    n_python=$(pgrep -f python | wc -l)
    total_python_rss_kb=$(ps -eo rss,comm | awk '$2 ~ /python/ {sum+=$1} END {print sum+0}')
    total_python_rss_gb=$(awk "BEGIN{printf \"%.2f\", $total_python_rss_kb/1048576}")

    # wandb process
    wandb_pid=$(pgrep -f wandb-service | head -1)
    if [ -n "$wandb_pid" ]; then
        wandb_rss=$(awk '/VmRSS/ {print $2}' /proc/$wandb_pid/status 2>/dev/null || echo 0)
        wandb_rss_gb=$(awk "BEGIN{printf \"%.2f\", $wandb_rss/1048576}")
    else
        wandb_pid=0; wandb_rss_gb=0
    fi

    # GPU util + memory
    gpu_info=$(nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits 2>/dev/null | head -1)
    gpu_util=$(echo "$gpu_info" | cut -d',' -f1 | tr -d ' ')
    gpu_mem=$(echo "$gpu_info" | cut -d',' -f2 | tr -d ' ')
    gpu_util=${gpu_util:-0}
    gpu_mem=${gpu_mem:-0}

    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
        "$ts" "$cgroup_gb" "$cpu_pct" "$main_pid" "$main_rss_gb" "$main_threads" "$main_fds" \
        "$n_python" "$total_python_rss_gb" "$wandb_pid" "$wandb_rss_gb" "$gpu_util" "$gpu_mem"

    sleep 5
done
