# Spot / Preemption Resilience

Make a job survive being killed at a random instant — the price of riding the 50–90 %-cheaper
spot/preemptible/interruptible tier. The whole layer reduces to **principle #8**
(`references/principles.md`): checkpoint full state to durable storage on a Young/Daly timer, load-latest
unconditionally on startup, write atomically, treat the preemption signal only as an opportunistic
last-flush. This file is the deep form: per-platform grace windows, the cadence formula with a worked
number, the atomic-write resume recipe, and a commented Python skeleton.

To jump: `grep -in '<keyword>' references/spot-resilience.md` — keywords: `grace`, `signal`, `young`,
`daly`, `cadence`, `atomic`, `rename`, `resume`, `skeleton`, `managed`, `skypilot`, `sagemaker`, `slurm`.

## Table of contents

1. [Preemption signals + grace windows (per platform)](#1-preemption-signals--grace-windows-per-platform)
2. [Checkpoint cadence — the Young/Daly formula](#2-checkpoint-cadence--the-youngdaly-formula)
3. [The atomic-write resume recipe](#3-the-atomic-write-resume-recipe)
4. [Managed-spot frameworks move the box; the checkpoint-load restores the state](#4-managed-spot-frameworks-move-the-box-the-checkpoint-load-restores-the-state)
5. [Python checkpoint/resume skeleton](#5-python-checkpointresume-skeleton)

---

## 1. Preemption signals + grace windows (per platform)

The grace window dictates the design: it decides whether checkpoint-on-signal is even possible, or
whether the timer is the *only* durability. **The window is NOT the safety net** — see the design-breaking
gotcha below the table. Concrete per-platform reach/billing detail lives in each `profiles/<platform>.md`
§4; this is the cross-platform signal map.

| Platform | Detection signal | Grace window | Implication |
|---|---|---|---|
| **AWS EC2 Spot** | IMDS `http://169.254.169.254/latest/meta-data/spot/instance-action` (404 = none, 200 = pending); rebalance-recommendation fires ~10–20 min earlier | **~120 s** | On-signal flush of a *small* checkpoint is viable; still timer-checkpoint for the big one |
| **GCP Spot** | metadata preemption flag + ACPI G2 Soft Off → shutdown script | **~30 s** default (configurable up to 120 s, Preview) | Timer-primary; on-signal flush only if checkpoint write < window |
| **GCP Preemptible (legacy)** | same signal, **plus a hard 24 h cap** regardless of capacity | ~30 s **+ guillotined at 24 h** | Prefer Spot for long runs; Preemptible dies at 24 h even idle |
| **Azure Spot** | IMDS Scheduled Events `/metadata/scheduledevents`, event type `Preempt` | **≥30 s** (Preempt is the short event; others give ≥5 min) | Timer-primary |
| **Slurm preemption / walltime** | `SIGTERM` (then `SIGKILL`); with `#SBATCH --signal=B:SIGTERM@360` the batch step gets SIGTERM ~360 s before the kill | **SIGTERM → ~30 s** default; widen via `--signal` lead time | `--requeue` + an in-script SIGTERM trap to checkpoint, then resume on requeue |
| **RunPod Spot** | OS **SIGTERM → SIGKILL** (also "interruptible without notice") | **~5 s** | Far too short to flush a large checkpoint — timer is the only real durability |
| **vast.ai Interruptible** | **no signal** — bid-based; instance is *paused* (processes killed) the instant it is outbid | **~0 s (abrupt)** | Pure timer; assume cold restart + reload every time |

URLs: AWS [spot-instance-termination-notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html),
[rebalance-recommendations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/rebalance-recommendations.html);
GCP [preemptible](https://docs.cloud.google.com/compute/docs/instances/preemptible),
[spot](https://docs.cloud.google.com/compute/docs/instances/spot);
Azure [scheduled-events](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/scheduled-events);
Slurm [sbatch `--signal`](https://slurm.schedmd.com/sbatch.html);
RunPod [spot-vs-on-demand](https://www.runpod.io/blog/spot-vs-on-demand-instances-runpod);
vast.ai [Rental-Types](https://vast.ai/article/Rental-Types).

**Gotcha — the design-breaking one.**
Symptom: a "catch SIGTERM, flush the 40 GB checkpoint to durable storage" handler works in testing on AWS
(120 s) but the job dies before the flush completes on RunPod (5 s) / vast.ai (0 s).
Root cause: treating the grace window as the *primary* durability mechanism — it spans 2 min down to ~0
across platforms, so any handler that needs more than a few seconds is a coin flip.
Fix: checkpoint on a **periodic timer to durable storage** (§2); use the signal trap **only** as an
opportunistic "save a final partial checkpoint if there is time" bonus, never as the safety net.

**Gotcha — GCP Preemptible 24 h guillotine.**
Symptom: a multi-day run on a Preemptible VM stops dead at 24 h even though nothing reclaimed it.
Root cause: legacy Preemptible has a hard 24 h max runtime; Spot VMs have no cap.
Fix: use **Spot, not Preemptible** for anything past a day (prefer Spot over legacy Preemptible for any run past a day).

---

## 2. Checkpoint cadence — the Young/Daly formula

Cadence is a **formula, not a guess.** The optimal checkpoint interval that minimizes total wasted
wall-clock (rollback re-compute after a kill **plus** checkpoint-write overhead) is the Young/Daly result:

```
W = sqrt(2 * mu * C)
```

- `mu` = mean time between preemptions (MTBF), in seconds.
- `C`  = time to write one checkpoint to durable storage, in seconds.
- `W`  = checkpoint interval (write a checkpoint every `W` seconds).

**Worked example.** A checkpoint takes `C = 30 s` to write; the instance is preempted on average every
`mu = 3 h = 10800 s`. Then:

```
W = sqrt(2 * 10800 * 30) = sqrt(648000) ≈ 805 s ≈ 13.4 min  →  checkpoint every ~13 min.
```

Higher preemption rate (smaller `mu`) → shorter interval. Slower checkpoint (larger `C`) → longer interval
(each save costs more, so amortize it over more progress).

**Round W DOWN to an iteration/epoch boundary.** Young/Daly assumes a checkpoint can be taken at *any*
instant, but real iterative training can only snapshot at a step or epoch boundary. So convert `W` to an
integer number of iterations and round *down*: at ~2 s/iteration, `805 s → 402 iters → checkpoint every
400 iters`. Rounding down checkpoints slightly more often than optimal, which is the safe direction.

**Distributed multiplier.** With `N` workers, one preemption wastes `N×` the compute (the whole group rolls
back), so distributed jobs should checkpoint *more* frequently than the single-GPU `W` suggests.

URLs: Young/Daly [robustness paper, INRIA](https://people.bordeaux.inria.fr/gaupy/ressources/pub/confs/icpp20_robustness.pdf),
[Optimal Checkpointing Period, LAWN 281](https://www.netlib.org/lapack/lawnspdf/lawn281.pdf),
[Optimal Checkpointing for Iterative Applications, IEEE](https://ieeexplore.ieee.org/document/9495174/).

---

## 3. The atomic-write resume recipe

Two failure modes turn "I have checkpoints" into "my resume is broken": a **partial weight save** and a
**corrupt-on-kill checkpoint**. The recipe fixes both.

**Save FULL training state, not just model weights.** A resume that restores only weights silently
restarts the epoch, reshuffles data, and degrades accuracy. The checkpoint must include:

- model `state_dict`
- optimizer `state_dict`
- LR-scheduler `state_dict`
- epoch **and** global step/iteration counter
- RNG state (Python `random`, NumPy, `torch`, and CUDA)
- dataloader position (sampler epoch / resumable-sampler offset)

**Write atomically: tmp → fsync → os.replace.** A preemption mid-write corrupts the file, and a naive
overwrite can leave zero good checkpoints. `os.replace` maps to the atomic POSIX `rename(2)` on the same
filesystem (and, unlike `os.rename`, overwrites atomically on Windows too), so:

1. Write the whole state to `latest.pt.tmp`.
2. `fsync` the file (and the directory) so bytes hit disk before the rename.
3. `os.replace("latest.pt.tmp", "latest.pt")` — the swap is all-or-nothing.
4. Keep the previous `latest.pt` until the new one is committed; a kill at any point leaves one intact file.

**Checkpoint to the platform's DURABLE location, not local scratch** (principle #4). A managed replacement
node is *fresh* — anything not on a cloud bucket / network volume / shared FS is gone. On a marketplace box
where local disk persists across a pause, still mirror to durable storage at intervals.

**Load-latest UNCONDITIONALLY on startup.** Use the *same code path* for first launch (no checkpoint →
start fresh) and every restart-after-preemption (checkpoint exists → resume). This is what makes the job
idempotent: the **identical launch command** run any number of times converges to the same end state, which
is exactly what makes principle #7's "retry the identical config" actually resume progress instead of
restarting from zero.

URLs: [Check-N-Run, arXiv](https://arxiv.org/pdf/2010.08679),
[SkyPilot training-guide](https://docs.skypilot.co/en/latest/reference/training-guide.html),
[SageMaker resume-from-checkpoint](https://docs.aws.amazon.com/sagemaker/latest/dg/model-checkpoints-resume.html).

---

## 4. Managed-spot frameworks move the box; the checkpoint-load restores the state

Managed frameworks **auto-provision a replacement** on preemption — but they restart the **process from
scratch**. The framework moves the box; the checkpoint-load written in §3/§5 is what restores progress.
This is the single most-misunderstood point: the framework does **not** resume training on its own.

- **SkyPilot Managed Jobs** — strongest cross-cloud recommendation (re-provisions in a different
  region/cloud to chase capacity, then re-runs the task). Caveat: it auto-recovers **only**
  preemption/hardware failures — a user-code non-zero exit is **not** auto-recovered.
  [managed-jobs](https://docs.skypilot.co/en/latest/examples/managed-jobs.html).
- **AWS SageMaker Managed Spot** — set `use_spot_instances=True` + `checkpoint_s3_uri`; SageMaker syncs the
  checkpoint dir to S3 during training and copies it back on restart (up to ~90 % savings). Gotcha:
  **`max_wait` must be greater than `max_run`** — `max_wait` covers wait-for-capacity *plus* run time
  *plus* interruption gaps; set it too tight and the job is killed mid-resume.
  [managed-spot docs](https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html).

Universal multi-cloud auto-failover is **out of scope for this skill** — use SkyPilot/dstack for that, then
return here to make the *code* resume-correct so their recovery actually lands on progress
(`superpowers:verification-before-completion` gates the "it resumed" claim against a loaded checkpoint, not
a log line). For the elastic / multi-node tier (torchrun `--max-restarts`, Elastic Horovod) see
`references/multinode.md`; the same invariant holds — the framework restarts processes, the per-epoch
snapshot restores state.

---

## 5. Python checkpoint/resume skeleton

Read this for the algorithm; adapt into the training script. The shape is platform-agnostic — only
`DURABLE_DIR` changes per profile (§8 SCRIPT OVERRIDES).

```python
import os, random, signal, time
import numpy as np
import torch

DURABLE_DIR = os.environ["DURABLE_DIR"]   # profile-supplied bucket/FS/volume mount, NOT local scratch
CKPT = os.path.join(DURABLE_DIR, "latest.pt")
CKPT_EVERY_ITERS = 400                     # = round_down(Young/Daly W / sec_per_iter); see section 2

def save_full_state(model, opt, sched, epoch, step):
    """Atomic write: tmp -> fsync -> os.replace. A kill at any point leaves one intact file."""
    state = {
        "model": model.state_dict(),
        "opt": opt.state_dict(),
        "sched": sched.state_dict(),
        "epoch": epoch, "step": step,        # resume the exact position, not the epoch start
        "rng_python": random.getstate(),
        "rng_numpy": np.random.get_state(),
        "rng_torch": torch.get_rng_state(),
        "rng_cuda": torch.cuda.get_rng_state_all(),
    }
    tmp = CKPT + ".tmp"
    with open(tmp, "wb") as f:
        torch.save(state, f)
        f.flush()
        os.fsync(f.fileno())                 # bytes hit disk BEFORE the rename
    os.replace(tmp, CKPT)                     # POSIX-atomic swap; prev file valid until this returns

def load_latest_if_any(model, opt, sched):
    """Unconditional load-latest: identical command resumes OR starts fresh. Returns (epoch, step)."""
    if not os.path.exists(CKPT):
        return 0, 0                          # first run, no checkpoint -> start from scratch
    s = torch.load(CKPT, map_location="cpu")
    model.load_state_dict(s["model"])
    opt.load_state_dict(s["opt"])
    sched.load_state_dict(s["sched"])
    random.setstate(s["rng_python"])
    np.random.set_state(s["rng_numpy"])
    torch.set_rng_state(s["rng_torch"])
    torch.cuda.set_rng_state_all(s["rng_cuda"])
    return s["epoch"], s["step"]             # caller skips dataloader to this position

# --- opportunistic last-flush only; NOT the safety net (section 1) ---
_preempted = {"flag": False}
def _on_sigterm(signum, frame):
    _preempted["flag"] = True                # set a flag; flush at the next safe boundary, do not block here
signal.signal(signal.SIGTERM, _on_sigterm)

def train(model, opt, sched, dataloader, total_epochs):
    start_epoch, start_step = load_latest_if_any(model, opt, sched)
    step = start_step
    for epoch in range(start_epoch, total_epochs):
        for batch in dataloader:             # a resumable sampler should fast-forward to start_step
            # ... forward / backward / opt.step() / sched.step() ...
            step += 1
            if step % CKPT_EVERY_ITERS == 0 or _preempted["flag"]:
                save_full_state(model, opt, sched, epoch, step)
                if _preempted["flag"]:
                    return                   # grace window may be ~0s; exit cleanly after the flush
```

Verify the resume path before trusting it: kill the process mid-epoch, relaunch the *identical* command,
and confirm step/epoch/loss continue rather than reset (this is the `verifying-dl-experiments`
reproducibility check, applied to preemption). Trust the **loaded** checkpoint, not the "resumed" log line
(principle #3).
