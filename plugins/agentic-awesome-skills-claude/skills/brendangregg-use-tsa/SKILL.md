---
name: brendangregg-use-tsa
description: "Methodical performance troubleshooting and root-cause analysis with Brendan Gregg's USE and TSA methods, plus evidence-backed RCA and postmortem reports."
category: devops
risk: safe
source: community
source_repo: thecsdoctor/brendangregg-use-tsa-skill
source_type: community
date_added: "2026-07-28"
author: thecsdoctor
tags: [performance, troubleshooting, root-cause-analysis, linux, observability, sre, postmortem]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/thecsdoctor/brendangregg-use-tsa-skill/blob/main/LICENSE"
---

# Brendan Gregg USE+TSA Performance Analysis

## Overview

A fixed, evidence-first procedure for system performance debugging, root-cause analysis (RCA), and incident reporting, distilled from Brendan Gregg's published methodologies. Instead of running whichever commands happen to be familiar, the agent poses questions first and then finds metrics to answer them: the USE Method (Utilization, Saturation, Errors) sweeps every resource, the TSA Method (Thread State Analysis) decomposes thread time, and off-CPU analysis plus flame graphs drill into what the sweeps find. Every investigation ends in a structured triage note, RCA report, or postmortem where each claim traces to a command and its output.

This skill adapts material from the community repository
[thecsdoctor/brendangregg-use-tsa-skill](https://github.com/thecsdoctor/brendangregg-use-tsa-skill)
(full checklists, reference library, and report templates live there).

## When to Use This Skill

- Use when a server, VM, or container is "slow" and the cause is unknown
- Use when latency or throughput regressed after a deploy, config change, or load shift
- Use when CPU, memory, disk, or network metrics look abnormal and need interpretation
- Use when an application hangs or threads pile up
- Use when the user asks for debugging, triage, or root-cause analysis of a performance issue
- Use when an incident needs an RCA report or a blameless postmortem with an evidence trail

## How It Works

### Step 0: Problem Statement

Define the problem before measuring. Ask: What makes you think there is a problem? Has it ever performed well? What changed recently (software, hardware, load)? Can it be expressed as latency or run time — quantify it. Who else is affected? What is the environment (OS, versions, config, container/VM limits)?

### Step 1: 60-Second Triage (Linux)

Run the ten-command sweep, checking **errors and saturation first** (easiest to interpret), then utilization. Record every exonerated resource.

```bash
uptime                 # load trend (includes uninterruptible I/O on Linux)
dmesg | tail           # kernel errors: oom-killer, SYN flooding, hardware
vmstat 1               # r > CPU count = CPU saturation; si/so = swapping; wa = disk
mpstat -P ALL 1        # per-CPU imbalance (single hot CPU = single-threaded app)
pidstat 1              # per-process CPU over time
iostat -xz 1           # await (app-suffered latency), avgqu-sz, %util
free -m                # memory; buffers/cache near zero hurts
sar -n DEV 1           # NIC throughput vs link limit
sar -n TCP,ETCP 1      # active/passive connections, retransmits
top                    # spot variable load
```

### Step 2: USE Sweep (resource-oriented)

**For every resource, check Utilization, Saturation, and Errors.** Iterate CPUs, memory capacity, network interfaces, storage I/O and capacity, controllers, interconnects — plus software resources (mutex locks, thread pools, process/file-descriptor capacity) and imposed limits (cgroup quotas, hypervisor caps, ulimits). Check errors before utilization. Interpretations: 100% utilization is usually a bottleneck (confirm via saturation); any non-zero saturation can be a problem; non-zero, still-increasing error counters are worth investigating; and a clean sweep is a result — it narrows the search space.

### Step 3: TSA Sweep (thread-oriented)

**For each thread of interest, split time into: Executing / Runnable / Anonymous Paging / Sleeping / Lock / Idle.** Investigate states from most to least frequent with state-appropriate tools. If more than ~10% of time is Runnable or Anonymous Paging, fix those first — latency states can be tuned to zero. Linux instruments: `/proc/PID/schedstat` run_delay and `perf sched latency` (Runnable), `vmstat` si/so and per-process `min_flt` (Paging), `offcputime`/`cpudist` from bcc (Sleeping), `/proc/lock_stat` and `valgrind --tool=drd` (Lock), `pidstat`/flame graphs (Executing).

### Step 4: Drill Down

Follow the biggest contributor: Executing → CPU profile + flame graph; Sleeping/Lock → off-CPU stacks (`offcputime -p PID`, render with `flamegraph.pl --color=io`); latency complaints → time-division decomposition; microservices → RED method (Rate, Errors, Duration). Prefer eBPF in-kernel aggregation over per-event dumps; start with sub-second traces in production.

### Step 5: Confirm Root Cause

State the causal chain (trigger → mechanism → symptom) with every link evidence-backed. Keep falsifiable hypotheses on record even when ruled out. Ask "why" up to five times. Would removing this cause prevent recurrence? Does it explain all primary evidence?

### Step 6: Fix and Verify

Apply the cheapest effective fix (mantra order: don't do it → cache it → do it less → do it later → off-peak → concurrently → cheaper). Re-measure with the **same instruments** as the evidence and show before/after. "Deployed" is not "verified".

### Step 7: Report

Produce the report the situation calls for — triage note, RCA report, or full postmortem (summary, impact, root cause, detection, investigation log, evidence table, resolution, prevention actions). Absolute dates everywhere; unknowns marked as known-unknowns.

## Examples

### Example 1: "This server feels slow"

```
User: prod-web-02 feels slow. Triage it and tell me what you ruled out.

Agent: runs the 60s sweep → dmesg shows oom-killer events at 09:41 UTC;
vmstat si/so non-zero; free -m shows 120MB free with page cache near zero.
Conclusion: memory capacity saturation (USE), host CPU/disk/network exonerated
with numbers. Report lists each exonerated resource next to its evidence.
```

**Explanation:** Errors-and-saturation-first finds the OOM events in step 1, and the exonerated resources stay on the record.

### Example 2: Post-deploy latency regression

```
User: API p99 went 95ms → 1.9s after the 14:02 deploy. Root cause + RCA.

Agent: host sweep clean (CPU 48%, no iowait, 0 retransmits) → TSA on app
threads shows 61% Runnable on a half-idle host → checks resource controls:
/sys/fs/cgroup cpu.max = 1.5 CPUs, cpu.stat nr_throttled +54k/min → cgroup
CPU throttling after the replica increase. Fix: raise limit; verify:
nr_throttled 0/s for 72h, p99 110ms under 1.4x load. RCA report includes the
causal chain, the ruled-out hypotheses, and the command→output table.
```

**Explanation:** Runnable-dominant TSA on an under-utilized host is the signature of a resource-control limit, not a busy machine — the method routes around the wrong diagnosis.

## Best Practices

- ✅ **Do:** Diagnose with read-only commands before changing anything
- ✅ **Do:** Check errors and saturation before utilization — they interpret fastest
- ✅ **Do:** Quantify everything ("p99 240ms → 2.1s", "run-queue 9 on 4 CPUs")
- ✅ **Do:** Record what was ruled out, with the evidence — exoneration narrows the search
- ✅ **Do:** Re-measure after the fix with the same instruments as the evidence
- ❌ **Don't:** Change tunables at random until the symptom stops (drunk-man anti-method)
- ❌ **Don't:** Trust low *average* utilization to rule out saturation — bursts hide in long intervals
- ❌ **Don't:** Treat "package installed" or "dashboard green" as "working" — verify runtime state
- ❌ **Don't:** Blame a component another team owns without data (blame-someone-else anti-method)

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Some metrics require privileges or tooling that may be absent (eBPF/bcc needs Linux ≥ 4.8 and usually root; `perf` needs perf_events access; sar needs sysstat). Missing instruments are reported as known-unknowns, not silently skipped.
- The deepest checklists target Linux; other OSes follow the same resource × metric matrix with different instruments.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- Diagnostics are read-only first. Any remediation (config edits, restarts, limit changes) requires explicit user confirmation before execution — the skill's own golden rules mandate this gate.
- Production tracing has overhead: scheduler events can reach millions/sec. The skill instructs eBPF in-kernel aggregation over per-event dumping, starting with sub-second traces while watching system CPU.
- All commands shown are standard local observability tools (`vmstat`, `iostat`, `sar`, `perf`, bcc tools, `/proc` reads); there are no network fetches, no credential handling, and no destructive examples. Intended usage is on systems the user is authorized to operate.

## Common Pitfalls

- **Problem:** Linux load averages look alarming but the CPUs are idle.
  **Solution:** Linux load includes uninterruptible (usually disk) tasks — check `vmstat` "r" for CPU saturation and `iostat` await for disk instead.
- **Problem:** Host CPU looks fine but the application starves.
  **Solution:** Check resource controls, not just the host: cgroup `cpu.max` and `cpu.stat nr_throttled` (Runnable-dominant TSA is the tell).
- **Problem:** "Time spent in MySQL" sends the investigation into the database.
  **Solution:** Component timers are request-oriented; run TSA on the threads — the time may be Runnable (a noisy neighbor), not execution.
- **Problem:** Off-CPU stacks are polluted with nonsense frames on a busy box.
  **Solution:** Filter involuntary context switches: `offcputime --state 2` (TASK_UNINTERRUPTIBLE) and fix frame pointers (`-fomit-frame-pointer` breaks user stacks).

## Related Skills

- `@devops-troubleshooter` - Broader DevOps incident response; use this skill for the performance-methodology core
- `@incident-responder` - General incident command workflow; pairs with this skill's evidence discipline
- `@application-performance-performance-optimization` - Application-level optimization after systemic bottlenecks are ruled out

## Additional Resources

- [Full skill repository: checklists, references, and report templates](https://github.com/thecsdoctor/brendangregg-use-tsa-skill)
- [The USE Method — Brendan Gregg](https://www.brendangregg.com/usemethod.html)
- [The TSA Method — Brendan Gregg](https://www.brendangregg.com/tsamethod.html)
- [Linux Performance Analysis in 60,000 Milliseconds](https://www.brendangregg.com/Articles/Netflix_Linux_Perf_Analysis_60s.pdf)
- [Off-CPU Analysis](https://www.brendangregg.com/offcpuanalysis.html)
- [Thinking Methodically about Performance (ACM Queue)](https://queue.acm.org/detail.cfm?id=2413037)
