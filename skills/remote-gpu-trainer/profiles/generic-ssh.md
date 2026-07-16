---
platform: generic-ssh        # the DEFAULT profile; Slurm / K8s / Colab-Kaggle are thin diffs below
kind: ssh                     # ssh | slurm | kubernetes | notebook (per sub-section)
meter_stop_verb: manual       # nothing reclaims the box — a forgotten instance bills 24/7
meter_stop_irreversible: true # destroying the box deletes its disk; no platform undo
detach_primitive: tmux        # tmux/nohup (bare) | sbatch (Slurm) | k8s-job (K8s) | kaggle-commit
spot_available: false         # bare box: none by default; Slurm scavenger + spot rentals override
spot_grace: n/a               # bare: n/a · Slurm: SIGTERM→KillWait(default 30s)→SIGKILL · K8s: terminationGracePeriodSeconds(default 30s)
shared_fs: host-dependent     # bare: one disk you own · Slurm: parallel /scratch · K8s: a PVC
inode_cap: host-dependent     # measure with df -i; do NOT assume an AutoDL ~200K constant
free_egress: host-dependent
china_mirror_needed: host-dependent  # only if the box sits behind the GFW
host_driver_cuda_max: host-dependent
local_nvme: host-dependent
---

# Profile: generic-SSH — the DEFAULT (bare box) + Slurm / Kubernetes / Colab-Kaggle diffs

One-line purpose: the lowest-common-denominator profile for a box where **SSH is the only control
channel and teardown is manual** — every other platform profile is a *diff* against this baseline.

> **Surface to the user up front (principle #10):** ⚠️ Danger clock — there is usually **no auto-release / idle timer to save you**: a forgotten box **bills 24/7** until you tear it down, and teardown is entirely manual (no platform safety net). Reality — you **expose ports yourself** (an `ssh -L` tunnel for TB/Jupyter); on Slurm a job dies at **walltime** — design the requeue.

Read this whole file before Phase 0 on any unbranded rental, then jump to the matching sub-section
(Slurm / Kubernetes / Colab-Kaggle) if the backend is a scheduler, a cluster, or a notebook.
**Universal gotchas are NOT restated here** — see `references/gotchas_universal.md`.

**Table of contents** (`grep -in '<keyword>' profiles/generic-ssh.md` to jump):
- BASELINE: 8-field schema for the bare-SSH box (sections 1–8)
- THIN DIFF — SLURM (sbatch replaces tmux)
- THIN DIFF — KUBERNETES (a Job manifest replaces the shell)
- THIN DIFF — COLAB / KAGGLE (not SSH-orchestratable)

The one load-bearing abstraction every backend below solves differently: **detach the job from the
connection, and make the result survive the session ending.** Checkpoint-to-durable + idempotent
resume (principle #8) is the invariant; the detach primitive (tmux / sbatch / Job / commit) is the
swappable plug.

---

## 1. LAUNCH

- **Entry point:** `ssh user@host` — key-based, fronted by an `~/.ssh/config` alias so the rest of
  the workflow says `ssh gpu-box`. There is **no platform API, console, or CLI** — SSH is the *only*
  control channel (this is what makes the box "generic"). Set the alias per `references/ssh_transport.md`.
- **Push code:** `rsync -avz --partial ./proj/ gpu-box:~/proj/` — resumable, delta-only on re-syncs;
  prefer over `scp` (a reset `scp` restarts from zero). Pull results the same way, reversed.
- **Download weights/datasets ON the box**, not over the local uplink: `ssh gpu-box 'cd ~/proj &&
  hf download <repo> --local-dir data'` (or `aws s3 cp`, `wget`). The box almost always has a fatter,
  cheaper pipe to HF/S3 than a home connection — pushing a 50 GB checkpoint over a residential uplink
  is the classic self-inflicted stall. Transport verbs → **REQUIRED:** `huggingface-skills:hf-cli`.
- **Env contract:** whatever the host ships. There is no prebuilt "base" guarantee — inspect
  `which python && python -V && nvidia-smi` first. If the image has a usable env, treat it as AutoDL's
  base (do not `conda create` on a throwaway box); if it is bare, `conda create` / `venv` once and
  pin it. State the seed/determinism in the run itself — no platform does it here (**REQUIRED:**
  `verifying-dl-experiments`).

→ **verify:** `ssh gpu-box 'python -c "import torch;print(torch.cuda.is_available())"'` prints `True`.

## 2. STORAGE MODEL  *(the survival matrix — principle #4)*

The box gives **one persistent disk that is yours to manage** — no shared FS, no platform quota
service, no automatic reclamation. *Measure, never assume:* run `df -h && df -i <mount>` live on the
box. Caps are host-dependent — do **not** carry over an AutoDL ~200K-inode or ~200 GB constant.

| Tier | Path | Survives STOP? | Survives DESTROY? | Cap |
|---|---|---|---|---|
| Root / home disk | `/` , `~` | yes (box keeps running) | **no** (destroy deletes the box) | host-dependent — `df -h`/`df -i` |
| Attached block volume (if any) | `/path/to/mount` | yes | depends on provider — verify before destroy | host-dependent |

The only "survival matrix" subtlety on a bare box: there is **no stop/destroy distinction the
platform enforces** — the box runs until *manually* stopped, and a destroy wipes the disk with no
undo. So checkpoints must land on a mount that gets `rsync`-pulled to local **before** teardown
(§5). Disk fails on inodes before bytes and the real hog hides in a symlinked cache — audit the
actual mount with `du`, clean by value (keep tiny eval JSONs, prune large periodic checkpoints).

## 3. NETWORK

- **Egress/proxy:** host-dependent; there is no platform proxy hook. If the box sits behind the GFW,
  set the mirror manually — `export HF_ENDPOINT=https://hf-mirror.com` (or `HF_HUB_ENABLE_HF_TRANSFER=1`
  off-GFW) — and validate the speed test on the **same route** the real transfer uses (principle #7).
- **Port exposure:** expose services yourself. TensorBoard / Jupyter ride an SSH tunnel from the
  local machine: `ssh -L 6006:localhost:6006 gpu-box` then open `http://<localhost>:6006`. There is
  no console port-forward button.
- **SSH flavor:** direct-TCP key-based SSH — `scp`/`rsync` work normally (unlike the proxied SSH on
  some rental platforms). If the provider hands out a non-standard port, pin it in the alias.

## 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*

A bare on-demand box has **no spot/preemption model by default** — it runs until manually stopped, so
the interruption to design against is an **SSH drop**, not an eviction. Without a detach primitive an
SSH drop sends SIGHUP and kills the job; `tmux` (§6) is what severs the job from the connection.

Resume is **self-built**: checkpoint full state (model + optimizer + scheduler + epoch/step + RNG +
dataloader position) atomically (`tmp`→`fsync`→`os.rename`) on a periodic timer, and load-latest
unconditionally on startup so the *identical launch command* resumes. Cadence formula + atomic-write
pattern → `references/spot-resilience.md`. (Spot-rented bare boxes exist — if the provider can evict,
treat it like the vast.ai profile: tiny/zero grace, checkpoint continuously.)

## 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law)*

**Teardown is MANUAL and is the number-one cost failure on this profile.** Nothing reclaims the box:
no idle timer, no auto-release, no scheduler that ends the job. **A forgotten box bills 24/7** — an
overnight idle instance is the most expensive single mistake on metered hardware.

- The meter-stopping action is **provider-manual** (a console "stop"/"destroy", a `terminate` API, or
  a phone call) — and on most bare rentals it is **irreversible** (deletes the disk).
- "Stop after pulling results" is a **mandatory final phase**, not an afterthought. Honor the
  **teardown Iron Law**: no stop/destroy until checkpoints are **pulled to local AND verified by
  load** (`scripts/verify_local.py`) **AND** the user has approved the cost-affecting action.
  "It looked done in the log" is not evidence (principle #3). **REQUIRED:**
  `superpowers:verification-before-completion`.

## 6. DAEMON TOOL

- **`tmux`** is the detach primitive: `tmux new -s train` → run inside → `Ctrl-b d` to detach;
  `tmux attach -t train` to reattach, `tmux ls` to reconcile a watcher against the real session
  (principle #3). It survives an SSH drop; it does **not** survive a box reboot — relaunch after one.
- **Fallback** when tmux is absent and cannot be installed: `nohup <cmd> </dev/null >log 2>&1 &` then
  `disown`. Always redirect stdin from `/dev/null` so the job never blocks reading the terminal.
- **No native queue** — the operator IS the scheduler, monitor, and janitor. Use the parameterized
  `scripts/run_queue.sh.template` for a resumable serial queue; never edit a queue script while it is
  being read (principle #6 — version the filename).

## 7. TOP GOTCHAS  (platform-pinned; universal ones → `references/gotchas_universal.md`)

- **GEN1 — Forgotten box bills 24/7.** Symptom: a week-old invoice for an instance that finished
  training on day one. → Root cause: nothing on a bare box reclaims it; the human is the only janitor.
  → Fix: make teardown a tracked Phase-5 step; after the verified pull, prompt the user to stop/destroy
  (never auto-act — principle #9); for cross-session safety set a `/schedule` reminder to re-check.
- **GEN2 — SSH drop kills the run (no tmux).** Symptom: training dies the moment the laptop sleeps or
  the network blips. → Root cause: the job is a child of the SSH shell; the drop sends SIGHUP.
  → Fix: launch inside `tmux` (or `nohup … & disown`) **before** the long run starts — not after it is
  already orphaned.
- **GEN3 — `scp` restarts from zero on a reset; `rsync` does not.** Symptom: a 40 GB re-sync that
  never finishes over a flaky link. → Root cause: `scp` has no resume. → Fix: `rsync -avz --partial`
  for every code/data/result transfer; wrap bulk pulls in a `timeout`+resume loop (principle #7).
- **GEN4 — CRLF breaks `.sh` on the Linux box.** Symptom: `bash: $'\r': command not found`, or a
  shebang that "isn't found." → Root cause: a script authored on Windows carries CRLF line endings.
  → Fix: `.gitattributes` with `*.sh text eol=lf`; on-box unblock `sed -i 's/\r$//' run.sh`.
- **GEN5 — Heavy DL static-checked on the wrong machine.** Symptom: an OOM or a CUDA mismatch only
  reproduces on the box. → Root cause: static/import checks ran locally, the real compute is remote.
  → Fix: run the cheap CPU smoke locally (Phase 2), run the heavy DL **on the box**; for the
  bug-vs-effect call once it runs, defer to **REQUIRED:** `verifying-dl-experiments`.
- **GEN6 — A box reboot silently orphans the run (`tmux` does not survive it).** Symptom: a detached
  job vanishes with a clean `dmesg`, idle GPU, and low `uptime`; `tmux ls` shows no sessions.
  → Root cause: `tmux`/`nohup` survive an SSH drop but **not** a host reboot — the rental rebooted (host
  maintenance, kernel update, or an OOM that took the box) and every session died. → Fix: treat reboot
  as one of the four "vanished process" causes (cross-link `references/gotchas_universal.md` U3); make
  resume idempotent (§4) so the *same* launch command continues from the last checkpoint; for a box that
  reboots often, add an `@reboot` cron or a systemd unit that re-launches the detached queue.
- **GEN7 — A second concurrent run silently halves throughput by oversubscribing the GPU.** Symptom: two
  training runs on the "same idle GPU" both crawl, or the second OOMs on a card that looked free.
  → Root cause: a bare box has **no scheduler** — nothing prevents two processes sharing one GPU, so they
  contend for VRAM and SM time. → Fix: the operator *is* the scheduler — serialize with the
  `run_queue.sh` template, or pin each run to a distinct card with `CUDA_VISIBLE_DEVICES=<n>`; check
  `nvidia-smi` for an existing holder before every launch (zombie holders → U11).
- **GEN8 — Watching a poll connection, not the run, declares a false death.** Symptom: the ssh-poll
  drops and the run is pronounced dead, but the job finished fine and wrote `best.pth`. → Root cause: a
  dropped *poll* connection ≠ the training dying; the two failure modes are conflated. → Fix: on any poll
  drop, re-ssh and check ground truth directly (`pgrep -af train`, log tail, `best.pth` mtime) before
  concluding anything (principle #3); robust short-connection poll template → U17.

### Platform-specific debugging (bare SSH)

The box has no console — every diagnostic is an ssh one-liner. Run these *separately* (a kill drops the
SSH, U1/U4), and bound each with `ssh -o ConnectTimeout=15 -o ServerAliveInterval=10` so a blip
self-kills instead of half-open hanging:

- **Is the run alive or orphaned?** `ssh gpu-box 'tmux ls; pgrep -af <train-script> | head'` — empty
  `tmux ls` after a vanished log ⇒ reboot/HUP (GEN6); reconcile the watcher against the real session.
- **Why did it die (the 4-cause ladder)?** `ssh gpu-box 'dmesg 2>/dev/null | grep -iE "killed process|out of memory|Xid" | tail; uptime'` — OOM line ⇒ U9/U10; clean dmesg + low uptime ⇒ reboot (GEN6); `Xid 48/79` ⇒ dead GPU, re-rent (U22).
- **GPU health, not just util%:** `ssh gpu-box 'nvidia-smi dmon -s pucvmet -d 1 -c 5'` — read SM clock + power, not `GPU-Util` (a liar, U21); a holder `nvidia-smi` cannot see ⇒ `fuser -v /dev/nvidia*` (U11).
- **Disk before it bites:** `ssh gpu-box 'df -h <mount>; df -i <mount>'` — inodes hit 100% before bytes (U7); the byte-hog often hides in `~/.cache/huggingface` (`du -sh ~/.cache/huggingface/hub/models--* | sort -rh`).
- **Stuck download?** A transfer with a live process but a flat `df` is stalled, not progressing —
  `ssh gpu-box 'ls -la --time-style=+%H:%M data/*.tmp; df -h <mount>'`; if the size has not moved, kill and
  resume the per-dir loop (`scripts/download_loop.sh`, U12), never restart from zero.

## 8. SCRIPT OVERRIDES

Values to parameterize the `scripts/` templates for a bare-SSH box:

```
DATA_DIR=$HOME/proj    (working dir / data disk on the box)
DURABLE_DIR=$HOME/proj (durable mount = the measured persistent disk; pull to local before teardown)
PROXY_HOOK=        (none by default; set HF_ENDPOINT=https://hf-mirror.com only if behind the GFW)
CRED_FILE=~/.netrc on the box's local disk, streamed in via stdin — never onto a shared/durable FS
SCRATCH=*.latest.pth and periodic checkpoints  (prune on success; keep best + tiny eval JSONs)
HF_HOME=$HOME/proj/.hf  (redirect off the default ~/.cache so it lands on the data disk)
DETACH=tmux            (the swappable plug — replaced by sbatch / Job / commit in the diffs below)
```

---

# THIN DIFF — SLURM  *(sbatch replaces tmux)*

`kind: slurm` · meter = walltime/fairshare **quota, not dollars** · detach = `sbatch` · no teardown.

The scheduler owns the job's lifecycle: the operator **submits**, Slurm runs and detaches it.
`tmux+nohup` is **replaced** (not supplemented) by `sbatch` — a submitted batch job survives logout
with no tmux. A bare `srun` still **blocks and dies on terminal close** like a foreground process, so
wrap `srun` *inside* an `sbatch` script for long runs.

- **Submit / monitor / kill:** `sbatch job.sh` (returns a jobid immediately) · `squeue -u $USER`
  (status — replaces "reattach tmux") · `sacct -j <jobid>` (post-mortem: exit code, maxRSS, elapsed)
  · `scancel <jobid>` (kill). Logs go to `slurm-%j.out` (arrays: `slurm-%A_%a.out`) — file-based, same
  logs-to-file contract as the baseline.
- **GPUs are declarative:** `#SBATCH --gres=gpu:a100:2` (or `--gpus=volta:3`); request, do not place.
  Slurm's GRES plugin sets `CUDA_VISIBLE_DEVICES` per step (verified slurm.schedmd.com/gres.html 2026-06).
- **Walltime ceiling — the hard new constraint:** `#SBATCH --time=HH:MM:SS` and at the limit each task
  is sent **SIGTERM, then SIGKILL after `KillWait` (default 30 s)** (verified slurm.schedmd.com/sbatch.html
  + slurm.conf 2026-06). Long training MUST checkpoint and requeue, not "run until done."
- **Preemption + checkpoint-on-signal:** on time-limit or scavenger-partition eviction the same
  SIGTERM→KillWait→SIGKILL sequence applies. Arm `#SBATCH --signal=B:SIGTERM@360` for a ~6-minute warning
  (the `B:` prefix signals the **batch shell**, not the steps; **Slurm may fire it up to 60 s EARLY** —
  size the warning with that slack, verified slurm.schedmd.com/sbatch.html 2026-06), trap it to set a flag,
  and `#SBATCH --requeue` to auto-return to the queue (the script restarts **from its beginning with the
  same job ID**) and resume from the last checkpoint. Cadence formula → `references/spot-resilience.md`.
- **Native orchestration replaces hand-rolled fan-out:** `--array=0-15` (rate-limit with `%4`) fans out
  ablation cells, `--dependency=afterok:<jobid>` chains stages (runs only on exit-code-0).
- **No per-hour teardown — watch fairshare.** Nodes are not `shutdown`; the job just ends. The
  baseline's #1 risk (forgotten box) **disappears**, replaced by "don't blow the walltime/fairshare
  allocation." There is nothing to stop.
- **No root, shared multi-tenant node:** cannot `apt install`. Use `module load cuda` or a container
  (**Apptainer/Singularity** — Docker is usually banned).
- **Filesystem split:** the shared parallel FS (`$HOME`, `/scratch`) persists and is where checkpoints
  go; node-local **`$TMPDIR` is wiped when the job ends** — stage scratch to `$TMPDIR`, checkpoint to
  `/scratch`. Multi-node NCCL/fabric specifics → `references/multinode.md`.

### Slurm gotchas (platform-pinned; universal → `references/gotchas_universal.md`)

- **SLURM1 — Checkpoint *inside* the signal handler corrupts the checkpoint.** Symptom: `--requeue`
  works most of the time, then intermittently writes a corrupt `hpc_ckpt` and the requeued job won't
  load. → Root cause: a Python signal handler can fire **after any bytecode instruction** — including
  mid-backward-pass — so checkpointing directly in the handler races with training (verified
  github.com/Lightning-AI/pytorch-lightning#21406 2026-06). → Fix: the handler does the **minimum** —
  set a flag; poll the flag in the training loop and checkpoint at a **safe point** (end of step), then
  `scontrol requeue $SLURM_JOB_ID` or exit so `--requeue` returns it.
- **SLURM2 — Warning signal arrives too late; the SIGKILL lands mid-write.** Symptom: the
  `--signal@360` trap fires but the checkpoint is half-written when SIGKILL hits. → Root cause: two
  slacks compound — Slurm may send the warning **up to 60 s early OR late**, and at the actual wall the
  `KillWait` grace is only ~30 s (verified slurm.schedmd.com 2026-06). → Fix: budget the warning so a
  full checkpoint fits *before* the wall even with the 60 s jitter; checkpoint *periodically* too (never
  rely on the one signal); make the write atomic (`tmp`→`fsync`→`rename`, U6) so a truncated file is
  never loaded.
- **SLURM3 — `srun` inside `sbatch` no longer inherits `--cpus-per-task` (Slurm ≥ 22.05).** Symptom: a
  nested `srun` hangs, sees one CPU, or under-threads the dataloader. → Root cause: since 22.05 `srun`
  stopped reading `SLURM_CPUS_PER_TASK` and must be told explicitly (verified docs.icer.msu.edu 2026-06).
  → Fix: `srun -c $SLURM_CPUS_PER_TASK …`, or set `export SRUN_CPUS_PER_TASK=$SLURM_CPUS_PER_TASK`; pass
  `--gpus-per-task`/`--gres` on the `srun` too — a step does not inherit the allocation's GRES by default.
- **SLURM4 — OOM is a job STATE, not a Python traceback.** Symptom: the job dies with no error in the
  log; `sacct` shows `State=OUT_OF_MEMORY` (or `slurmstepd: Detected 1 oom-kill event(s)`). → Root cause:
  Slurm cgroup sets a hard memory limit at (a fraction of) the requested `--mem`; exceeding it is an
  OOM-kill the kernel performs (verified osc.edu / icer.msu.edu 2026-06). → Fix: read `sacct -o
  MaxRSS,ReqMem` and raise `--mem`/`--mem-per-cpu` to MaxRSS×1.2; this is the cgroup-RAM OOM of U9
  (dataloader workers × a big tensor), distinct from VRAM OOM (U10) — **do not** shrink batch for a
  host-RAM OOM.
- **SLURM5 — `$TMPDIR` checkpoints evaporate when the job ends.** Symptom: a requeued/array job finds an
  empty checkpoint dir. → Root cause: node-local `$TMPDIR` is wiped at job end; only the shared parallel
  FS persists across a requeue or a different node. → Fix: stage *scratch* to `$TMPDIR` for speed, but
  write **checkpoints to `/scratch/$USER`**; never point `DURABLE_DIR` at node-local storage.

### Slurm debugging (squeue / sacct / cgroup triage)

- **Still queued or running?** `squeue -u $USER -o '%i %T %r %M %l %R'` — the `%r` Reason column explains
  a `PENDING` (e.g. `Resources`, `Priority`, `QOSMaxGPUPerUserLimit`); `%R` on a running job is the nodelist.
- **Post-mortem (why it ended):** `sacct -j <jobid> --format=JobID,State,ExitCode,DerivedExitCode,Elapsed,MaxRSS,ReqMem,Timelimit,NodeList`
  — `State=TIMEOUT` ⇒ walltime kill (raise `--time` or requeue); `OUT_OF_MEMORY` ⇒ SLURM4; `PREEMPTED`/`NODE_FAIL`
  ⇒ requeue territory; `ExitCode` like `0:9` means killed by **signal 9** (SIGKILL — the KillWait expired).
- **Live resource use:** `sstat -j <jobid>.batch --format=JobID,MaxRSS,MaxVMSize` on a *running* step
  (sacct only finalizes at exit); cross-check against `ReqMem` to catch a creeping leak before the cgroup kills it.
- **GPU actually allocated to the step?** inside the job: `echo $CUDA_VISIBLE_DEVICES && nvidia-smi -L`
  — a mismatch ⇒ SLURM3 (`--gres`/`--gpus-per-task` not on the `srun`).
- **Multi-node hang** (job RUNNING, no progress) ⇒ NCCL/fabric, not Slurm → `references/multinode.md`.

**Slurm OVERRIDES:** `DETACH=sbatch` · `DURABLE_DIR=/scratch/$USER/proj` (durable) + `DATA_DIR=$TMPDIR`
(node-local, wiped) · `PROXY_HOOK=module load cuda` · teardown=`n/a (watch sacct + fairshare)`.

---

# THIN DIFF — KUBERNETES  *(a Job manifest replaces the shell)*

`kind: kubernetes` · detach = a `Job` manifest (no shell) · persistence = a **PVC, non-optional**.

The unit of work is a **manifest**, not a session: `kubectl apply -f job.yaml`; the control plane
schedules a pod and a `Job` controller **replaces it on failure** up to `backoffLimit` (**default 4** —
each failure creates a *new* pod, it does not restart the old one; verified kubernetes.io Jobs doc
2026-06). The "detach from my connection" problem vanishes — the pod never had a connection to the shell.

- **GPUs:** `resources.limits: nvidia.com/gpu: 1`. Quirk (verified kubernetes.io scheduling-gpus 2026-06):
  GPUs go in **`limits` only**; if `requests` is set it must **equal** `limits`, and you cannot set
  `requests` without `limits`; GPUs are **integer, not shared or overcommitted** — one whole GPU per
  container (absent MIG/time-slicing, which K8s does not provide out of the box). Provided by the NVIDIA
  device-plugin DaemonSet.
- **Code delivery is different — no `rsync` into a pod.** Code is **baked into a container image**
  (build → push to a registry) or pulled at pod start. This is the biggest workflow shift from the
  baseline; pin the base image by `@sha256:` digest, not `:latest` (U30).
- **Persistence is the headline risk:** the **pod filesystem is EPHEMERAL by design.** On
  death/restart/reschedule, anything written outside a mounted volume is **gone**. Checkpoints **must**
  mount a **PersistentVolumeClaim** (or object storage) at `/checkpoints` — this is non-optional and is
  the single most common way ML-on-K8s loses work.
- **Monitor:** `kubectl get pods` · `kubectl logs -f <pod>` (replaces `tail -f`). `kubectl exec -it …
  -- bash` is a debugging tool, not the run mechanism — an exec session is not durable.
- **Declarative parallelism:** `Job` `parallelism`/`completions` (both default 1) for fan-out (the K8s
  analog of Slurm arrays).
- **Lifecycle knobs:** `activeDeadlineSeconds` is the walltime analog (terminates the Job past the
  deadline); `ttlSecondsAfterFinished` auto-GCs a finished Job; `terminationGracePeriodSeconds` (**default
  30 s**, verified kubernetes.io 2026-06) is the SIGTERM→SIGKILL window — the K8s analog of Slurm
  `KillWait`, so the same checkpoint-on-SIGTERM discipline applies.
- **Teardown is two-layered:** `kubectl delete job <name>` frees the *pod* (cheap), but the underlying
  **node/cluster keeps costing** unless an autoscaler scales it down. **delete ≠ scale-down** — the
  node release is the real cost lever, distinct from the baseline's single "destroy the box."

### Kubernetes gotchas (platform-pinned; universal → `references/gotchas_universal.md`)

- **K8S1 — Pod stuck `Pending`: `Insufficient nvidia.com/gpu`.** Symptom: `kubectl get pods` shows
  `Pending`; the events read `0/N nodes are available: N Insufficient nvidia.com/gpu`. → Root cause:
  *usually not* missing hardware — the **device-plugin DaemonSet** isn't running, so no node advertises
  allocatable GPUs; or a taint blocks scheduling (verified kubenatives.com + GKE troubleshooting 2026-06).
  → Fix: `kubectl describe node <n> | grep -A4 -E 'Capacity|Allocatable'` — if `nvidia.com/gpu` is `0`,
  the plugin is down: `kubectl get ds -n kube-system | grep nvidia` and `kubectl logs -n kube-system -l
  k8s-app=nvidia-device-plugin`; add the matching toleration if the GPU nodes are tainted.
- **K8S2 — `RestartPolicy: Always` is rejected on a Job.** Symptom: `kubectl apply` errors that a Job's
  pod template may only use `Never` or `OnFailure`. → Root cause: a Job is not a Deployment; only those
  two restart policies are legal (verified kubernetes.io Jobs doc 2026-06). → Fix: use `OnFailure`
  (restart the *container* in place — keeps `/checkpoints` warm) or `Never` (a fresh pod per attempt,
  cleaner logs); never copy a Deployment's `Always`.
- **K8S3 — `ImagePullBackOff` / `ErrImagePull` after a registry push.** Symptom: the pod never starts;
  events show `Back-off pulling image`. → Root cause: a private registry without an `imagePullSecrets`,
  a wrong tag/digest, or a too-big layer timing out the pull. → Fix: `kubectl describe pod <p>` reads the
  exact pull error; attach `imagePullSecrets`, pin a real `@sha256:` digest (U30), and pre-warm large
  images onto the node pool.
- **K8S4 — `Multi-Attach error` on a rescheduled pod (RWO PVC).** Symptom: a pod stuck
  `ContainerCreating` after a node failure: `Volume is already exclusively attached to one node`. → Root
  cause: a **ReadWriteOnce** PVC can attach to **one node at a time**; on failover the old attachment
  hasn't released, and two distributed-training pods on different nodes can never share an RWO volume
  (verified discuss.kubernetes.io / bobcares.com 2026-06). → Fix: for multi-node training use
  **ReadWriteMany** (NFS/EFS/CephFS) for the shared checkpoint dir, or pin co-dependent pods to one node
  with affinity; on a stuck failover, force-detach via the cloud console or delete the old `VolumeAttachment`.
- **K8S5 — Pod `Evicted` mid-training under node disk pressure.** Symptom: a long run dies with
  `status: Evicted, reason: The node was low on resource: ephemeral-storage`. → Root cause: container
  logs, the writable layer, and `emptyDir` count as **ephemeral storage**; checkpoints/caches written
  outside the PVC fill the node and the kubelet evicts the pod (verified jorijn.com / oneuptime.com
  2026-06). → Fix: write **everything large to the PVC**, set `resources.limits.ephemeral-storage`,
  rotate logs, and back `emptyDir` scratch with `sizeLimit`; this is the K8s face of the disk-full crash
  (U6/U7).
- **K8S6 — Container runs but trains on CPU (GPU never attached).** Symptom: a pod runs to completion,
  loss curves normal, ~100× too slow. → Root cause: the GPU limit was omitted, or `nvidia-smi` works on
  the *node* but the container lacks the runtime/library path. → Fix: **validate `kubectl exec <p> --
  nvidia-smi` before trusting a run**; ensure `resources.limits.nvidia.com/gpu` is set and the NVIDIA
  container runtime is the default (this is U31 surfaced through K8s).

### Kubernetes debugging (kubectl triage)

- **Why is it Pending / not starting?** `kubectl describe pod <p>` — the **Events** section names it
  directly (Insufficient GPU ⇒ K8S1; FailedScheduling taint; ImagePullBackOff ⇒ K8S3; FailedMount ⇒ K8S4).
- **Why did it die?** `kubectl get pod <p> -o jsonpath='{.status.containerStatuses[0].lastState.terminated}'`
  — `reason: OOMKilled` ⇒ raise `resources.limits.memory` (cgroup-RAM, U9); `Error` + exit code ⇒ read logs.
- **Logs of a crashed/previous attempt:** `kubectl logs <p> --previous` (the current pod may be a fresh
  retry with an empty log); `kubectl get events --sort-by=.lastTimestamp` for the cluster-wide timeline.
- **Did the node even offer GPUs?** `kubectl describe node <n> | grep -A4 Allocatable` — `nvidia.com/gpu: 0`
  ⇒ device plugin down (K8S1).
- **Is the PVC bound and mounted?** `kubectl get pvc` (`Bound`?) and `kubectl describe pod <p>` Volumes
  section — an unbound PVC stalls the pod in `Pending`.

**K8s OVERRIDES:** `DETACH=k8s-job` · `DURABLE_DIR=/checkpoints` (PVC mount — required; RWX for multi-node)
· `CRED_FILE=""` — credentials arrive as a K8s Secret mounted as an env var (WANDB_API_KEY / HF_TOKEN),
never a file on disk and never baked into the image layer, so run_one's `[ -n "$CRED_FILE" ]` guard skips
the file read and the env var passes through · teardown=`kubectl delete` **+** scale the node pool down.

---

# THIN DIFF — COLAB / KAGGLE  *(not SSH-orchestratable)*

`kind: notebook` · **no SSH, no tmux, no persistent disk, no real job abstraction.** The generic
core's central primitive ("detach + survive the session") cannot be satisfied directly — degrade to
**checkpoint-to-cloud + idempotent resume**. Teardown is automatic and free; the *opposite* problem to
the baseline — the work cannot be kept alive long enough.

**Colab (free tier):**
- **Idle timeout ~90 min** (no cell activity) and a hard **~12 h max VM lifetime**; on disconnect all
  RAM, variables, models, and the local `/content` filesystem are **lost**. Limits are **dynamic and
  unpublished** — GPU type/availability and the exact ceilings "vary over time" and GPU is best-effort,
  can be denied or downgraded (verified research.google.com/colaboratory/faq.html 2026-06).
- **Free tier requires the browser tab to STAY OPEN** — *(verified — corrects the draft's "anti-idle
  tricks are unreliable" framing)*: **background execution is a Pro+ paid feature**; on free tier closing
  the tab stops the runtime shortly after (verified github.com/googlecolab/colabtools#4151 + community
  reports 2026-06). So keep-alive hacks aren't merely *unreliable* — there is **no supported headless
  background run at all** on free Colab. Design for the disconnect, do not fight it.
- **Only survival mechanism:** mount Google Drive and **checkpoint every epoch to Drive**; make the
  entrypoint **resume-from-Drive idempotent** so the inevitable reconnect continues, not restarts.

**Kaggle (free tier) — slightly better, because of one real primitive:**
- **30 GPU-hours/week** floating quota (T4×2 or P100; resets weekly); **interactive idle timeout ~60 min**
  and a **~9 h** session cap (verified kaggle.com/docs/efficient-gpu-usage + product-feedback 2026-06).
- **The one genuine headless-background primitive: "Save Version → Save & Run All (commit)."** It
  snapshots the notebook and runs it **on a separate machine with no idle timer, surviving browser
  close**, and **persists `/kaggle/working` (20 GB) as the committed version's output** (commit times out
  at ~9 h GPU / ~12 h CPU). This is the closest thing to `sbatch` in the free-tier world — single it out
  as Kaggle's detach primitive. Live monitoring is weak (Colab: watch the cell; Kaggle commit: inspect
  only the finished version's logs).
- **Code delivery:** clone from GitHub or pull the platform's dataset mounts — no scp.

### Colab / Kaggle gotchas (platform-pinned; universal → `references/gotchas_universal.md`)

- **NB1 — Drive sync lag silently loses the "saved" checkpoint.** Symptom: training logs
  `saved best.pth to /content/drive/...`, the runtime disconnects an hour later, and the file is **0 bytes
  or absent** in Drive. → Root cause: writes to mounted Drive are **buffered and sync asynchronously** —
  large files can take up to ~30 min to actually land, and an unmount/disconnect before the flush loses
  them (verified github.com/googlecolab/colabtools#2607 + #4426 2026-06). → Fix: call
  `drive.flush_and_unmount()` (or `os.fsync`) right after each checkpoint, keep checkpoints small, and
  treat a checkpoint as durable **only after** it is visible in Drive — re-list it before trusting resume.
- **NB2 — Kaggle commit fails if any cell errors → the whole output is lost.** Symptom: "Save & Run All"
  shows `committing…` forever or fails with a non-zero/`Code 0` error, and **nothing** in `/kaggle/working`
  is saved. → Root cause: a commit re-runs the notebook **top-to-bottom on a fresh machine**; one failing
  cell (or an interactive-only state, or a flaky cell) aborts the commit and discards its output (verified
  kaggle.com/product-feedback/334753 + 59557 2026-06). → Fix: before committing, **Run All interactively**
  end-to-end on a clean kernel (catch order/state bugs); guard long sections so a late failure still writes
  partial results to `/kaggle/working`; rely on `/kaggle/working` (persisted), not in-memory variables.
- **NB3 — Kaggle batch (commit) run picks the WRONG accelerator / has no internet.** Symptom: a committed
  run is glacial (ran on CPU) or fails to `pip install`/download. → Root cause: the **accelerator and
  internet toggle are notebook settings the commit inherits** — a notebook left on "None"/internet-off
  commits that way; internet also requires phone verification on the account. → Fix: set Accelerator =
  GPU and Internet = On in the notebook *before* committing; verify with `torch.cuda.is_available()` in an
  early cell so a CPU commit fails fast instead of wasting the 9 h.
- **NB4 — `/content` (Colab) and `/kaggle/temp` are scratch, not durable.** Symptom: results written to
  `/content/...` or `/kaggle/temp` vanish on disconnect. → Root cause: only Drive (Colab) and
  `/kaggle/working` (Kaggle committed output) survive the session; everything else is ephemeral. → Fix:
  point `DURABLE_DIR` at the surviving path; never let the final artifact land only on scratch.
- **NB5 — Free Colab disconnect mid-epoch with no warning.** Symptom: the session simply dies; there is
  **no SIGTERM, no grace window** to catch. → Root cause: unlike Slurm/K8s, a notebook eviction gives no
  signal — the resume contract is the *only* defense. → Fix: checkpoint every N steps to Drive
  (NB1-safe), make cell-1 resume-from-latest idempotent, and chain runs across sessions under the
  per-session ceiling. There is no checkpoint-on-signal here (contrast Slurm `--signal` / K8s SIGTERM).

### Colab / Kaggle debugging (session-death triage)

- **What am I actually on?** First cell: `import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))`
  and `!nvidia-smi` — catches a CPU-only Colab assignment or a CPU Kaggle commit (NB3) before wasting the session.
- **Is the checkpoint really in Drive?** `!ls -la /content/drive/MyDrive/proj/*.pth` *after* a
  `drive.flush_and_unmount()` — a 0-byte or missing file ⇒ sync lag (NB1), do not teardown trusting it.
- **Did the Kaggle commit succeed?** Open the Version's **Logs** tab (the only post-mortem for a committed
  run) — a failed cell shows there; the committed `/kaggle/working` is the artifact, not the editor state.
- **Disk full inside the notebook?** `!df -h` — `/kaggle/working` caps at 20 GB; HF cache and intermediate
  files exhaust it fast (U6/U7), prune before the commit's final write.

**Colab/Kaggle OVERRIDES:** `DETACH=`Drive-checkpoint loop (Colab) / Save&Run-All commit (Kaggle) ·
`DURABLE_DIR=`Drive `/content/drive/MyDrive/proj` (Colab) / `/kaggle/working` (Kaggle) · teardown=`automatic`
· the pattern, every run: checkpoint every N steps → idempotent resume from cell 1 → keep each run
under the per-session ceiling → chain runs across sessions.
