---
name: debug-buttercup
description: "All pods run in namespace crs. Use when pods in the crs namespace are in CrashLoopBackOff, OOMKilled, or restarting, multiple services restart simultaneously (cascade failure), or redis is unresponsive or showing AOF warnings."
risk: unknown
source: community
---

# Debug Buttercup

## When to Use
- Pods in the `crs` namespace are in CrashLoopBackOff, OOMKilled, or restarting
- Multiple services restart simultaneously (cascade failure)
- Redis is unresponsive or showing AOF warnings
- Queues are growing but tasks are not progressing
- Nodes show DiskPressure, MemoryPressure, or PID pressure
- Build-bot cannot reach the Docker daemon (DinD failures)
- Scheduler is stuck and not advancing task state
- Health check probes are failing unexpectedly
- Deployed Helm values don't match actual pod configuration

## When NOT to Use

- Deploying or upgrading Buttercup (use Helm and deployment guides)
- Debugging issues outside the `crs` Kubernetes namespace
- Performance tuning that doesn't involve a failure symptom

## Namespace and Services

All pods run in namespace `crs`. Key services:

| Layer | Services |
|-------|----------|
| Infra | redis, dind, litellm, registry-cache |
| Orchestration | scheduler, task-server, task-downloader, scratch-cleaner |
| Fuzzing | build-bot, fuzzer-bot, coverage-bot, tracer-bot, merger-bot |
| Analysis | patcher, seed-gen, program-model, pov-reproducer |
| Interface | competition-api, ui |

## Triage Workflow

Always start with triage. Run these three commands first:

```bash
# 1. Pod status - look for restarts, CrashLoopBackOff, OOMKilled
kubectl get pods -n crs -o wide

# 2. Events - the timeline of what went wrong
kubectl get events -n crs --sort-by='.lastTimestamp'

# 3. Warnings only - filter the noise
kubectl get events -n crs --field-selector type=Warning --sort-by='.lastTimestamp'
```

Then narrow down:

```bash
# Why did a specific pod restart? Check Last State Reason (OOMKilled, Error, Completed)
kubectl describe pod -n crs <pod-name> | grep -A8 'Last State:'

# Check actual resource limits vs intended
kubectl get pod -n crs <pod-name> -o jsonpath='{.spec.containers[0].resources}'

# Crashed container's logs (--previous = the container that died)
kubectl logs -n crs <pod-name> --previous --tail=200

# Current logs
kubectl logs -n crs <pod-name> --tail=200
```

### Historical vs Ongoing Issues

High restart counts don't necessarily mean an issue is ongoing -- restarts accumulate over a pod's lifetime. Always distinguish:
- `--tail` shows the end of the log buffer, which may contain old messages. Use `--since=300s` to confirm issues are actively happening now.
- `--timestamps` on log output helps correlate events across services.
- Check `Last State` timestamps in `describe pod` to see when the most recent crash actually occurred.

### Cascade Detection

When many pods restart around the same time, check for a shared-dependency failure before investigating individual pods. The most common cascade: Redis goes down -> every service gets `ConnectionError`/`ConnectionRefusedError` -> mass restarts. Look for the same error across multiple `--previous` logs -- if they all say `redis.exceptions.ConnectionError`, debug Redis, not the individual services.

## Log Analysis

```bash
# All replicas of a service at once
kubectl logs -n crs -l app=fuzzer-bot --tail=100 --prefix

# Stream live
kubectl logs -n crs -l app.kubernetes.io/name=redis -f

# Collect all logs to disk (existing script)
bash deployment/collect-logs.sh
```

## Resource Pressure

```bash
# Per-pod CPU/memory
kubectl top pods -n crs

# Node-level
kubectl top nodes

# Node conditions (disk pressure, memory pressure, PID pressure)
kubectl describe node <node> | grep -A5 Conditions

# Disk usage inside a pod
kubectl exec -n crs <pod> -- df -h

# What's eating disk
kubectl exec -n crs <pod> -- sh -c 'du -sh /corpus/* 2>/dev/null'
kubectl exec -n crs <pod> -- sh -c 'du -sh /scratch/* 2>/dev/null'
```

## Redis Debugging

Redis is the backbone. When it goes down, everything cascades.

```bash
# Redis pod status
kubectl get pods -n crs -l app.kubernetes.io/name=redis

# Redis logs (AOF warnings, OOM, connection issues)
kubectl logs -n crs -l app.kubernetes.io/name=redis --tail=200

# Connect to Redis CLI
kubectl exec -n crs <redis-pod> -- redis-cli

# Inside redis-cli: key diagnostics
INFO memory          # used_memory_human, maxmemory
INFO persistence     # aof_enabled, aof_last_bgrewrite_status, aof_delayed_fsync
INFO clients         # connected_clients, blocked_clients
INFO stats           # total_connections_received, rejected_connections
CLIENT LIST          # see who's connected
DBSIZE               # total keys

# AOF configuration
CONFIG GET appendonly     # is AOF enabled?
CONFIG GET appendfsync   # fsync policy: everysec, always, or no

# What is /data mounted on? (disk vs tmpfs matters for AOF performance)
```

```bash
kubectl exec -n crs <redis-pod> -- mount | grep /data
kubectl exec -n crs <redis-pod> -- du -sh /data/
```

### Queue Inspection

Buttercup uses Redis streams with consumer groups. Queue names:

| Queue | Stream Key |
|-------|-----------|
| Build | fuzzer_build_queue |
| Build Output | fuzzer_build_output_queue |
| Crash | fuzzer_crash_queue |
| Confirmed Vulns | confirmed_vulnerabilities_queue |
| Download Tasks | orchestrator_download_tasks_queue |
| Ready Tasks | tasks_ready_queue |
| Patches | patches_queue |
| Index | index_queue |
| Index Output | index_output_queue |
| Traced Vulns | traced_vulnerabilities_queue |
| POV Requests | pov_reproducer_requests_queue |
| POV Responses | pov_reproducer_responses_queue |
| Delete Task | orchestrator_delete_task_queue |

```bash
# Check stream length (pending messages)
kubectl exec -n crs <redis-pod> -- redis-cli XLEN fuzzer_build_queue

# Check consumer group lag
kubectl exec -n crs <redis-pod> -- redis-cli XINFO GROUPS fuzzer_build_queue

# Check pending messages per consumer
kubectl exec -n crs <redis-pod> -- redis-cli XPENDING fuzzer_build_queue build_bot_consumers - + 10

# Task registry size
kubectl exec -n crs <redis-pod> -- redis-cli HLEN tasks_registry

# Task state counts
kubectl exec -n crs <redis-pod> -- redis-cli SCARD cancelled_tasks
kubectl exec -n crs <redis-pod> -- redis-cli SCARD succeeded_tasks
kubectl exec -n crs <redis-pod> -- redis-cli SCARD errored_tasks
```

Consumer groups: `build_bot_consumers`, `orchestrator_group`, `patcher_group`, `index_group`, `tracer_bot_group`.

## Health Checks

Pods write timestamps to `/tmp/health_check_alive`. The liveness probe checks file freshness.

```bash
# Check health file freshness
kubectl exec -n crs <pod> -- stat /tmp/health_check_alive
kubectl exec -n crs <pod> -- cat /tmp/health_check_alive
```

If a pod is restart-looping, the health check file is likely going stale because the main process is blocked (e.g. waiting on Redis, stuck on I/O).

## Telemetry (OpenTelemetry / Signoz)

All services export traces and metrics via OpenTelemetry. If Signoz is deployed (`global.signoz.deployed: true`), use its UI for distributed tracing across services.

```bash
# Check if OTEL is configured
kubectl exec -n crs <pod> -- env | grep OTEL

# Verify Signoz pods are running (if deployed)
kubectl get pods -n platform -l app.kubernetes.io/name=signoz
```

Traces are especially useful for diagnosing slow task processing, identifying which service in a pipeline is the bottleneck, and correlating events across the scheduler -> build-bot -> fuzzer-bot chain.

## Volume and Storage

```bash
# PVC status
kubectl get pvc -n crs

# Check if corpus tmpfs is mounted, its size, and backing type
kubectl exec -n crs <pod> -- mount | grep corpus_tmpfs
kubectl exec -n crs <pod> -- df -h /corpus_tmpfs 2>/dev/null

# Check if CORPUS_TMPFS_PATH is set
kubectl exec -n crs <pod> -- env | grep CORPUS

# Full disk layout - what's on real disk vs tmpfs
kubectl exec -n crs <pod> -- df -h
```

`CORPUS_TMPFS_PATH` is set when `global.volumes.corpusTmpfs.enabled: true`. This affects fuzzer-bot, coverage-bot, seed-gen, and merger-bot.

### Deployment Config Verification

When behavior doesn't match expectations, verify Helm values actually took effect:

```bash
# Check a pod's actual resource limits
kubectl get pod -n crs <pod-name> -o jsonpath='{.spec.containers[0].resources}'

# Check a pod's actual volume definitions
kubectl get pod -n crs <pod-name> -o jsonpath='{.spec.volumes}'
```

Helm values template typos (e.g. wrong key names) silently fall back to chart defaults. If deployed resources don't match the values template, check for key name mismatches.

## Service-Specific Debugging

For detailed per-service symptoms, root causes, and fixes, see references/failure-patterns.md.

Quick reference:

- **DinD**: `kubectl logs -n crs -l app=dind --tail=100` -- look for docker daemon crashes, storage driver errors
- **Build-bot**: check build queue depth, DinD connectivity, OOM during compilation
- **Fuzzer-bot**: corpus disk usage, CPU throttling, crash queue backlog
- **Patcher**: LiteLLM connectivity, LLM timeout, patch queue depth
- **Scheduler**: the central brain -- `kubectl logs -n crs -l app=scheduler --tail=-1 --prefix | grep "WAIT_PATCH_PASS\|ERROR\|SUBMIT"`

## Diagnostic Script

Run the automated triage snapshot:

```bash
bash {baseDir}/scripts/diagnose.sh
```

Pass `--full` to also dump recent logs from all pods:

```bash
bash {baseDir}/scripts/diagnose.sh --full
```

This collects pod status, events, resource usage, Redis health, and queue depths in one pass.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
