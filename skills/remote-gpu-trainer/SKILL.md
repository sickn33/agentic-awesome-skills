---
name: remote-gpu-trainer
description: "Deploy, monitor, and debug long GPU jobs on RENTED/remote instances (AutoDL, RunPod, vast.ai, Lambda, Slurm, K8s): teardown/billing safety, spot resilience, resumable checkpointing, OOM/NaN triage."
risk: safe
source: community
source_type: community
source_repo: Hanyuyuan6/remote-gpu-trainer
date_added: "2026-06-20"
category: ml-ops
license: "MIT"
license_source: "https://github.com/Hanyuyuan6/remote-gpu-trainer/blob/main/LICENSE"
compatibility: |
  Any Agent-Skills (SKILL.md)-compatible agent — Claude Code, Codex, Cursor, Trae, Gemini CLI, etc.
  Needs a shell + SSH (or a platform CLI/API) to drive the remote box; scripts are bash/python. A few
  durable-monitoring recipes assume a host background-task runner + scheduler — map to the running
  agent's equivalents (references/monitoring_patterns.md §7). Companion skills (verifying-dl-experiments,
  superpowers:*, huggingface-skills:*) are optional separate installs.
---

# remote-gpu-trainer — Remote GPU Job Orchestration

## Overview

Deploy and babysit long-running GPU jobs on **rented boxes you don't own**, across any platform, and
get the result off the box before the meter or a preemption kills it. The core insight: **you are a
short-term tenant on someone else's machine** — so the job is to *detach the work, make the result
outlive the instance, and stop the meter safely*, not to provision a cluster.

This skill is **platform-agnostic at the core, platform-specific at the edges**: a fixed set of
operating principles + a 6-phase lifecycle that hold everywhere, plus one **profile per platform**
(`profiles/<platform>.md`) that owns every concrete path, proxy, billing verb, and spot semantic. Its
defensible value is the union the big orchestrators skip: **Chinese cgroup-isolated rentals + bare-SSH
cheap boxes + the disk-budget / monitoring / teardown reality** that *is* the job on metered hardware.

## When to Use This Skill

Use whenever the user deploys, trains, monitors, or troubleshoots a long-running GPU job on a **RENTED
or remote instance they do not own** — training, eval, ablation sweeps, batch inference, or large data
processing — on AutoDL, RunPod, vast.ai, Lambda, Paperspace, Chinese platforms (恒源云/矩池云/Featurize/
揽睿星舟), a bare SSH box, Slurm, or Kubernetes; single OR multi-instance. Triggers (multilingual):
"远程 GPU 训练", "GPU 租赁", "GPU rental", "租卡", "spot 抢占", "spot preemption", "断点续训",
"resumable training", "tmux 训练守护", "防 SSH 断线", "scp/rsync 上传", "多实例 ablation",
"远程 GPU 监控", "省钱关机/销毁实例", "stop vs terminate billing", "checkpoint 磁盘满",
"CUDA OOM/显存不足", "loss NaN/loss spike", "loss 不下降/不收敛", "overfit 单 batch",
"FSDP/DeepSpeed 配置", "多卡训练 hang", "dataloader worker/数据增广 bug". **NOT** for purely local
single-GPU training, in-instance multi-GPU DDP (use torchrun/accelerate), managed multi-cloud
price-shopping (use SkyPilot's skill), or zero-ops serverless (use Modal).

## When NOT to use — and what to use instead

| Situation | Use instead |
|---|---|
| Local single-GPU, or multi-GPU **DDP inside one box** | `torchrun` / `accelerate` directly |
| Managed multi-cloud price-shopping + auto spot-recovery across **Western** clouds | **SkyPilot** (has its own Agent Skill) — then come back here to make your *code* resume-correct so its recovery actually works |
| Open BYOC dev environments | **dstack** |
| Zero-ops serverless inference | **Modal** |
| "Is this metric / ablation delta real?" | **REQUIRED:** `verifying-dl-experiments` (this skill owns *running* the job; that one owns *whether the number is true*) |

**This skill is for the blind spot those tools leave:** AutoDL + Chinese platforms, bare SSH/Slurm/K8s
rentals, and the operational gotchas (inode caps, mirror stalls, cgroup OOM, silent sync, spot grace
windows, irreversible teardown) that survive whichever provisioner you use.

## Operating principles (the WHY — 10 invariants)

These hold on every metered, isolated, rented GPU; only the paths/CLI change. One line each; the deep
form with cross-platform nuance is in **`references/principles.md`** (read it before Phase 0).

1. **Minimize paid wall-clock.** The meter runs the whole time — smoke locally on CPU before renting, launch detached, release the instant verification passes.
2. **Cheap checks before expensive compute.** A 1–2 batch CPU smoke (logger off) kills import/config/shape/scale bugs for ~free. (Smoke *content* → `verifying-dl-experiments`.)
3. **Trust artifacts you loaded, not log lines that claim success.** "synced/saved/done" lies under a silently-failed write; a watcher's own state is also a claim — reconcile it against the real process/artifact.
4. **Know what survives stop vs destroy.** Per platform, identify exactly which mount survives a *stop* and which survives a *terminate* — the data you need often lives on the volatile one. (The single biggest portability trap.)
5. **Storage fails on the dimension you're not watching.** Disk dies on **inodes** before bytes; the real hog hides in a symlinked cache; clean by value (keep tiny evidence, drop big scratch); monitor `df -i`, not just `df -h`.
6. **Never mutate inputs under a live run.** A running job holds its scripts in memory by byte-offset; overwriting one mid-run re-executes blocks. Version filenames.
7. **Design for retry — failure is probabilistic, transfers are flaky, mirrors are route-specific.** Make wrappers idempotent + resumable; retry the *identical* config; wrap bulk transfers in `timeout`+resume loops; a mirror/proxy speeds ONE route — validate on the same route the real transfer uses.
8. **Checkpoint-to-durable + idempotent resume is the universal spine.** File checkpoint to the platform's durable location + unconditional load-latest-on-startup is the *one* mechanism that survives an SSH drop, a Slurm walltime kill, a K8s reschedule, a spot preemption, and a Colab disconnect. The detach primitive (tmux/sbatch/Job/commit) is the swappable plug; this is the invariant.
9. **Cost and destructive actions are the user's call.** Never auto-release/terminate, never delete durable files without confirmation; if cleanup can't free space, **ask to expand the disk** rather than silently shrink the experiment.
10. **Teach the user the platform, don't just drive it.** Most users don't know a platform's non-obvious **conveniences** (one-click SSH-key registration, GPU-availability notifications, built-in panels) or its **danger clocks** (auto-release/auto-delete timers on a *stopped* box — AutoDL releases a 关机 instance after 15 days → data disk gone; a stop that keeps billing; low-balance purge). Surface them on first contact — #9 stops the agent *doing* the dangerous thing, #10 *warns the human* before the clock fires. Per-platform list → each profile's **Surface to the user** block.

> **Monitoring physics (substrate for #3):** foreground Bash hard-caps at 600 s; `run_in_background` has no cap and notifies on exit; a never-exiting watcher never notifies; an unquoted `|` in a poll regex reads stdin and hangs forever. The four-layer monitoring architecture is built on these facts → `references/monitoring_patterns.md`.

## Code discipline (the wrapper & training scripts you write)

Two rules govern the launch/wrapper/training code this skill has you write — corollaries of #1 and #8, not new invariants:

1. **Reuse before writing.** Take the lowest rung that already works before adding code: the base image's pre-installed stack + platform features → a framework/library utility (`torchrun` / `accelerate` / HF) → your existing `scripts/` templates → minimal new code. On a metered box a needless `pip install` also burns paid wall-clock and can break the image's ABI — Phase 1's rule (*the prebuilt image **is** the env; don't `conda create` on a rental*) is exactly this principle applied to dependencies.
2. **Floor — `minimum` bounds scope, not correctness.** Shrinking code must never drop what makes an expensive run survivable: checkpoint-to-durable + idempotent resume (#8), atomic writes, the error handling that prevents losing a long run, or seed/determinism logging. Keep one minimal self-check for non-trivial logic.

## Pick your platform profile FIRST

Read the matching profile **before Phase 0** — it owns every path, proxy, credential location, billing
verb, and spot rule the phases below delegate to. Each follows the same 8-field schema
(`profiles/_schema.md`).

> **New here? The path is:** (1) find your platform in the table below → (2) read that profile's **LAUNCH**
> section (it walks rent → register SSH key → reach the box) → (3) come back and run the 6 phases from Phase 0.
> Already have a box you can `ssh` into? Skip straight to Phase 0.

| You're on… | Profile | Kind | Detach primitive | Meter-stop verb |
|---|---|---|---|---|
| AutoDL (deepest, battle-tested) | `profiles/autodl.md` | ssh-rental | tmux | 关机 (stops meter, **keeps disk** — the AutoDL exception) |
| RunPod | `profiles/runpod.md` | ssh-rental | tmux | **terminate** (stop still bills 2×; destroys volume disk) |
| vast.ai | `profiles/vastai.md` | ssh-rental (spot) | tmux | **destroy** (stop bills disk forever) |
| Lambda | `profiles/lambda.md` | cloud-api | tmux | **terminate** (no stop state) |
| Paperspace | `profiles/paperspace.md` | cloud-api | tmux | **destroy + release IP + delete storage** (shut-down stops compute only) |
| 恒源云 / 矩池云 / Featurize / 揽睿星舟 | `profiles/china.md` | ssh-rental | tmux | per-platform (data disk often bills while stopped) |
| Bare SSH box / Slurm / K8s / Colab-Kaggle | `profiles/generic-ssh.md` | ssh / slurm / k8s | tmux / sbatch / Job / commit | **manual** (a forgotten box bills 24/7) |

> **Profile confidence:** AutoDL is battle-tested from the author's daily use; the other six profiles are
> built from each platform's official docs + community reports (cited inline, `verified <month>`) and not
> yet independently live-tested — lean on the Phase-0 live measurements and **re-verify any teardown/
> billing fact against current docs before betting money or data** (`references/self-improvement.md` §5).

**Mental verb model** (one API across all platforms; the profile binds each verb to real commands):
`up` (rent+reach) → `push` (code/data on) → `run` (detached + checkpointing) → `watch` (durable monitor) → `pull` (results off + verify) → `down` (stop the meter).

## Default workflow (6 phases)

Skip phases already done. Each phase delegates substrate to the profile and **ends in a runnable check**.

**Phase 0 — Environment audit.** Read the profile's STORAGE survival-matrix + region/DC-lock. Measure live:
`df -h && df -i <data-mount>`, cgroup `memory.max`, `nvidia-smi`. Pre-compute the checkpoint disk budget
(`ckpt_size × N + scratch`). → **verify:** `nvidia-smi` shows the expected GPU and `df -i` is not near 100%.

**Phase 1 — SSH + credentials.** Set the alias/env per the profile (the prebuilt image/base IS the env —
do not `conda create` on a rental). **Never rented before? the profile's LAUNCH section walks rent → register SSH key → connect.** Push secrets via **stdin, never onto a shared/durable FS**
(`references/ssh_transport.md`). → **verify:** `ssh <alias> 'python -c "import torch;print(torch.cuda.is_available())"'`.

**Phase 2 — Wrapper + CPU-smoke gate.** Build an idempotent `run_one`/`run_queue` from `scripts/` (parameterized
from the profile's OVERRIDES; **size batch/workers to the box for a standalone run, but PIN them across cells for a fair comparison** — `references/training/throughput-profiling.md`). **Run the cheap CPU smoke locally BEFORE renting** — it kills the dumb,
expensive failures (e.g. `python -m <your.train.module> --limit-batches 2 --epochs 1` — substitute your own entrypoint; this gate needs your training code plugged in). → **verify:** that smoke exits 0 on 2 batches with the logger disabled.

**Phase 3 — Detached launch.** Launch via the profile's detach primitive; probe briefly (log head + alive +
no traceback), then **hand back** — never a blocking foreground `sleep`. → **verify:** within 60 s, the detach
session is alive and the first log line shows the expected step/epoch.

**Phase 4 — Durable monitoring.** For anything over ~1–2 h, deploy the **four-layer architecture**
(`references/monitoring_patterns.md`): on-box self-completion chain + session patrol loop + event sentinels +
recovery handbook. **On Claude Code, fire the L2 patrol via `/loop 30m` (or `ScheduleWakeup`) running `scripts/health_patrol.sh.template`**; a host with no local recurring runner wires the on-box self-push instead (`references/monitoring_patterns.md` §7). A session-bound watcher alone dies with the session. Classify each outcome →
fixed remediation; **never blind-retry**. → **verify:** the patrol reports even when nothing changed.

**Phase 5 — Aggregate + verify + teardown.** Checked-sync to durable storage (gate the success line on the
copy result — principle #3), then **load-and-verify each artifact** (`scripts/verify_local.py`), THEN the profile's
meter-stopping action. → **verify:** `verify_local.py` reports 100% OK *before* any teardown.

> **Iron Law — teardown gate:** NO `release` / `terminate` / `destroy` / file-delete until checkpoints are
> **pulled to local AND verified by load**, and the user has explicitly approved the cost-affecting action.
> "It looked done in the log" is not evidence (principle #3). On most platforms the meter-stopping action is
> **irreversible** (deletes the disk) — confirmation matters more, not less.

## Parallel ablation fan-out

For N ablation cells: one job per cell, an **isolated write path per job** (no shared mutable output), launched
across instances/queues. **REQUIRED:** `superpowers:dispatching-parallel-agents` supplies the independence
predicate (don't fan out onto shared state) and the mandatory post-fan-out reconciliation. FS-shared deployment
pattern → `references/parallel_ablation.md`.

## Quick reference — the four facts that bite per platform

Full detail in each profile; this table is the at-a-glance.

| Platform | Survives **stop** | Survives **destroy** | Spot grace | China mirror needed |
|---|---|---|---|---|
| AutoDL | /root + data + FS | FS only | n/a | yes (`/etc/network_turbo`, hf-mirror) |
| RunPod | volume disk (bills 2×) | Network Volume only | ~5 s SIGTERM→KILL | no (`hf_transfer`) |
| vast.ai | disk (bills forever) | nothing | ~0 s (abrupt) | no |
| Lambda | n/a (no stop) | nothing | n/a (on-demand) | no |
| China (恒源云/矩池云/…) | varies; data disk bills | per-platform persistent vol | n/a | yes |
| generic-SSH/Slurm/K8s | you own it | you own it | Slurm SIGTERM→KillWait (def 30 s) | only if in China |

## Common gotchas (top 8 inline — full catalog in references/)

The universal ones that cost the most GPU-hours. Symptom → fix; root cause + the rest in
**`references/gotchas_universal.md`** (run `grep -i '<keyword>' references/gotchas_universal.md` to jump).

1. **SSH drops on `pkill -9`** (exit 255 + "Connection reset") — normal; re-ssh to verify, don't panic.
2. **tmux holds the script in memory** — editing it mid-run re-executes blocks; version the filename.
3. **Disk-full crashes `torch.save`** (`iostream error`) — pre-budget; auto-prune `latest.pth`, keep `best`.
4. **cgroup OOM with no traceback** (bare `Killed` / exit 137) — `num_workers × big-tensor`; size workers vs `memory.max`, not CPU count.
5. **Silent sync failure** — `cp … 2>/dev/null; echo synced` lies on a full/inode-exhausted FS; gate the success line on the actual copy result.
6. **Spot preemption grace is tiny (~5 s → ~0 s on the platforms profiled here; AWS-style 2-min grace only on clouds not profiled)** — a SIGTERM-flush handler is NOT a safety net; checkpoint on a timer to durable storage, load-latest unconditionally (`references/spot-resilience.md`).
7. **"Stop" rarely stops the meter** — only `terminate`/`destroy` does, and it's irreversible (deletes the disk). Know the verb from the profile before you click, and on RunPod a stopped Pod can even restart with zero GPUs.
8. **CRLF breaks `.sh` on Linux** — author on Windows → `.gitattributes` `*.sh text eol=lf`; on-box unblock `sed -i 's/\r$//'`.

## When training itself breaks (the model, not the platform)

Platform ops is only half the job — once the box is running, training breaks in its own ways. The
`references/training/` layer is the debug knowledge for the run itself. Boundary: **this layer owns
"make it run, fast, and not crash"; `verifying-dl-experiments` owns "is the *number* real"** —
cross-link it for collapse / leakage / metric-validity. Every entry is symptom → root cause → fix with
cited current docs.

- `references/training/oom-memory.md` — CUDA/VRAM + host-RAM OOM and the fit-it ladder (grad-accum → bf16 → activation-checkpointing → `expandable_segments` → FSDP/ZeRO → CPU/NVMe offload → LoRA/QLoRA); OOM-at-a-specific-step (first backward / val / longest batch); the memory snapshot + visualizer.
- `references/training/distributed-launch.md` — `torchrun`/`accelerate`/`deepspeed` launch + env contract, DDP/FSDP/ZeRO config, and the multi-GPU **HANGS** toolkit (one-rank-diverged, rank-conditional collective, dataloader-length mismatch). Multi-node wire → `references/multinode.md`.
- `references/training/precision-stability.md` — fp16/bf16/tf32 + AMP/GradScaler, NaN/Inf hunting (`detect_anomaly`), LLM **loss spikes** + divergence (warmup, clip, init, z-loss).
- `references/training/throughput-profiling.md` — GPU-bound vs data-bound vs comms-bound; dataloader knobs; `torch.compile` traps; flash-attention; `torch.profiler` / Nsight.
- `references/training/checkpoint-resume.md` — full-state save/resume mechanics, sharded (FSDP/DeepSpeed) checkpoints, and the resume bugs (epoch restart, data reshuffle, scaler/EMA dropped). Spot cadence → `references/spot-resilience.md`.
- `references/training/by-domain.md` — per-domain gotchas: LLM/transformer, vision (det/seg), diffusion, RL, multimodal/VLM.
- `references/training/convergence-debugging.md` — the **"runs but won't learn / learns badly"** layer: the overfit-one-batch smoke, params-not-updating, optimizer/LR/weight-decay/schedule config, loss-function footguns (double-softmax, BCEWithLogits, CE-target form), fine-tuning/freezing (frozen-BN drift, discriminative LR, LoRA wiring), and the training-dynamics dashboard (update:weight ratio, dead-ReLU, GradScaler-scale).
- `references/training/data-pipeline.md` — dataloader/dataset **correctness** (not speed): the worker-RNG augmentation-duplication bug, IterableDataset worker/rank sharding, collate/`__len__`/`pin_memory`/`spawn` contracts, and preprocessing/label/shuffle traps (RGB-vs-BGR, ToTensor ÷255, `set_epoch`).

## Companion skills (separate installs; REQUIRED reading where present)

These are **separate** Agent Skills, not bundled here — install them for the full experience. On an
agent where a companion isn't installed, treat its pointer below as an optional cross-reference; this
skill still works standalone.

- **`verifying-dl-experiments`** — owns *is-the-number-real*: smoke content, retry-vs-safeguard, keepable-checkpoint, eval sizing, tracker forensics, GPU-0%-util diagnosis. This skill owns *where/when/how-much-$*.
- **`huggingface-skills:hf-cli`** — the transport verbs (`hf download --resume`, `hf upload-large-folder`, `hf cache verify`); this skill owns the China-mirror swap + stall-retry (`references/china-network.md`).
- **`huggingface-skills:huggingface-trackio`** — hosted tracker so metrics survive teardown (gotcha U20); poll `trackio` alerts as a structured monitor instead of brittle ssh-tail.
- **`superpowers:verification-before-completion`** — the Iron Law's general form; gates every "training done / synced / teardown complete" claim.
- **`superpowers:dispatching-parallel-agents`** — independence predicate + reconciliation for ablation fan-out.

## Getting better over time (capture new gotchas + personalize)

This skill is static, but every run can teach it something — without corrupting it.
Protocol → **`references/self-improvement.md`**. In short: when a run surfaces a gotcha the catalog
lacks, **only sediment a root-caused, reproduced, generalizable one** (a one-off flake is a hypothesis,
not a gotcha — principle #3); **route it** — user/project-specific → the host's memory system,
generalizable → propose adding to `references/gotchas_universal.md` / the profile §7 /
`references/training/` (and offer an upstream PR); **never silently rewrite a skill file — draft the
`symptom → root cause → fix` and let the user approve.** On first use, capture the user's platforms +
paths + tracker entity into memory so later runs are pre-parameterized. Platform facts carry a `verified
<month>` stamp — re-verify any teardown/billing fact against current docs before betting money or data.

## Limitations

- Does not replace a real cloud orchestrator or managed provisioner; use it to make rented-box work survivable, not to optimize multi-cloud procurement.
- Platform billing, stop, destroy, and data-retention behavior can drift; re-check current provider docs before destructive or money-impacting actions.
- Requires user-owned credentials, SSH/API access, and explicit confirmation before teardown, deletion, or other irreversible cleanup.
- Companion skills named above are not bundled here; treat them as optional references unless installed in the current agent environment.

## Bundled resources

Load only what the current phase needs.

- `references/principles.md` — the 10 invariants expanded, with the cross-platform nuance behind each.
- `references/lifecycle_checklist.md` — the 6-phase runbook as a per-platform checklist.
- `references/gotchas_universal.md` — universal + mixed gotchas (TOC + grep index at top).
- `references/monitoring_patterns.md` — the four-layer durable-monitoring architecture + robust ssh-poll template.
- `references/ssh_transport.md` — ssh config, rsync/scp resumable patterns, secrets-via-stdin, CRLF, two-SSH-flavor caveat.
- `references/china-network.md` — mirrors table + HF_ENDPOINT + resumable-download ladder + the `no_proxy` trap (all CN platforms).
- `references/spot-resilience.md` — preemption signals, Young/Daly checkpoint cadence, atomic-write resume.
- `references/parallel_ablation.md` — FS-shared fan-out + the independence predicate + reconciliation.
- `references/multinode.md` — (advanced) NCCL / fabric-manager / elastic-training gotchas; single-box users skip.
- `references/training/` — the **DL-training debug layer** (8 files: oom-memory, distributed-launch, precision-stability, throughput-profiling, checkpoint-resume, by-domain, convergence-debugging, data-pipeline) — see "When training breaks" above.
- `references/self-improvement.md` — the feedback loop: capture a new gotcha (at a bar) into memory or the catalog, personalize on first run, keep platform facts fresh.
- `scripts/` — wrapper templates (`run_one`/`run_queue`), monitors (`mem_monitor`, `gpu_health`, `reap_vram_zombies`), the read-only patrol (`health_patrol.sh.template`), transfer/aggregation (`download_loop`, `aggregate_to_fs`, `setup-china-mirrors`), the load-and-verify checker (`verify_local.py`), and the `verified`-stamp freshness linter (`check_staleness.py`).
- `profiles/<platform>.md` — the per-platform substrate (one per platform; `_schema.md` defines the 8 fields).
- `examples/autodl_sweep/` — one complete, runnable worked case end to end.
