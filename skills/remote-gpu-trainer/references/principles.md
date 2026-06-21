# Operating Principles — the 10 invariants, expanded

These are the *why* behind every phase and gotcha. They hold on any **metered, isolated, rented GPU**
— AutoDL, RunPod, vast.ai, Lambda, Paperspace, a Chinese platform, a bare SSH box, Slurm, or K8s. Only
the concrete paths/CLI change (those live in `profiles/<platform>.md`). Internalize these; the recipes
follow. The one-line form is in `SKILL.md`; this file carries the cross-platform nuance.

To jump: `grep -n '^## ' references/principles.md`.

---

## 1. Minimize paid wall-clock

The meter runs the *entire* time the box is up, not just while the GPU computes. Three consequences:
smoke-test correctness **locally on CPU before renting** (principle #2); **launch detached and hand
control back** rather than babysitting a blocking `sleep`; and **release the instant verification
passes** (principle #9 governs the *who-decides*). Every idle paid minute — a stuck download, a forgotten
box overnight, a human-in-the-loop pause on a live instance — is money.

*Universal.* Even on Slurm where the "meter" is walltime/fairshare quota rather than dollars, the same
discipline applies: don't hold an allocation idle.

---

## 2. Cheap checks before expensive compute

A CPU smoke (1–2 batches, logger disabled, tiny shapes) kills import errors, config drift, tensor-shape
and measurement-**scale** bugs for ~free, **before** they bill GPU-hours. It is *necessary, not
sufficient* — it won't catch convergence — but it catches the dumb-and-expensive failures that otherwise
only surface after an instance spins up.

*Boundary:* this skill owns *when* to run the smoke (the pre-rent gate). The smoke's *content* — what to
assert, how to shrink the problem — belongs to **`verifying-dl-experiments`**. Don't duplicate it here.

---

## 3. Trust artifacts you loaded, not log lines that claim success

"synced / saved / done / 100% complete" is a **claim**, and claims lie under a silently-failed write —
a full disk, exhausted inodes, a swallowed error, a half-uploaded blob. Confirm the file **exists and
loads** before releasing the only copy.

**A watcher's own state is also a claim**, not ground truth. An async condition-waiter whose job you
superseded polls a marker that will never arrive (a zombie that loops forever). A session-scoped monitor
dies on context reset while the job runs on. Reconcile watchers against the job's *real* process and
artifacts (`tmux ls` / `squeue` / `pgrep`, output `mtime`, a load-test), tear a watcher down when you
supersede its job, and match a watcher's lifetime to the wait's duration.

> **Monitoring physics this rests on** (the 600 s cap and `run_in_background` are **Claude Code** harness
> primitives — on another Agent-Skills host map them per `references/monitoring_patterns.md` §7; the
> hang-physics below are pure shell and hold everywhere): foreground Bash hard-caps at 600 s (a long
> foreground wait is killed at 10 min); `run_in_background` has **no** cap and notifies on exit; a
> never-*exiting* watcher never notifies; an unquoted `|` inside a poll regex splits into piped commands
> and the first reads stdin → hangs forever. See `references/monitoring_patterns.md`.

*Universal — the load-bearing spine.* It is the platform instance of
`superpowers:verification-before-completion`'s Iron Law ("no completion claim without fresh verification
evidence"). Shared with `verifying-dl-experiments`.

---

## 4. Know what survives stop vs destroy

**The single biggest portability trap.** AutoDL persists `/root` across a power-off — so the AutoDL
habit is "just 关机, my data's fine." That assumption is **false almost everywhere else**:

- **RunPod** wipes the *container disk* on stop; only the *volume disk* (`/workspace`) survives a stop,
  and only a **Network Volume** survives a terminate.
- **vast.ai** keeps disk across a stop but **bills it forever**; a destroy loses everything.
- **K8s** wipes the pod filesystem on every reschedule unless a PVC is mounted.
- **Colab** loses `/content` and RAM on disconnect.

So the principle is not a path — it's a **discipline**: for each platform, before Phase 0, read the
profile's STORAGE survival-matrix and write your checkpoints to the mount that survives the teardown verb
you intend to use. The data you need most often lives on the *volatile* tier by default.

*Mixed:* the *rule* is universal; the *which-mount* value is a profile fact.

---

## 5. Storage fails on the dimension — and the location — you're not watching

Disk dies on **inodes before bytes** (`df -h` shows 34% while `cp` fails "No space left" because `df -i`
is at 100% — classic on a shared FS full of many-small-files eval output). The real space hog often
lives where you didn't look — a **symlinked cache** (`~/.cache/huggingface` mapped onto the data disk)
can outweigh the `runs/` you created. **Audit with `du` on the actual mount, not assumptions.** Clean by
**value**: keep the tiny irreplaceable evidence (metric/eval JSONs), discard the large reproducible
scratch (periodic checkpoints, unused model caches — one observed sweep left **179 GB** of superseded `latest.pt`/`epoch_*.pt` while the real evidence was **<200 MB** of JSON). Pre-compute the budget; monitor `df -i`, not just
`df -h`.

*Mixed:* the inode-cap *number* is a profile fact (AutoDL/China enforce ~200K; RunPod/vast/Lambda spec
GB quotas with no documented inode cap). The "audit the real mount, clean by value" discipline is core.
The general form of the many-small-files trap is **shard into tar** (WebDataset) — see
`references/gotchas_universal.md` U25.

---

## 6. Never mutate inputs under a live run

A running job holds its scripts **in memory by byte-offset**. tmux keeps `run_queue.sh` as-loaded; bash
reads a script by seeking to a saved offset, so `scp`-ing a new version mid-run makes bash land in the
middle of a *different* file and re-execute blocks (duplicate runs, stalled queues). Version filenames;
edit only when nothing is reading them (`pgrep -af <script>` empty).

*Universal — pure bash/tmux physics.* Identical across every SSH backend.

---

## 7. Design for retry — failure is probabilistic, transfers are flaky, mirrors are route-specific

Some fraction of identical launches die (a network blip during `wandb.init`, a transient kernel fault, a
spot preemption). Wrappers must be **idempotent and resumable**; retry the **identical config** rather
than hand-patching one run (which destroys comparability — see `verifying-dl-experiments`).

**Bulk transfers are the prototypical flaky step:** wrap them in `timeout`+resume retry loops — a stall
≠ permanent failure, and resumable downloads accumulate progress across kills. An acceleration
**mirror/proxy/cache speeds ONE route, not all** — it may cover the metadata/API path while the bulk-data
path (a CDN/blob backend) still fails, and a *domestic* source routed through a *foreign*-acceleration
proxy is slower. Match the route to the origin; validate a speed test on the **same route** the real
transfer uses (a no-proxy probe of a proxied transfer measures nothing).

*Universal.* The **spot/preemption** sub-case is profile-parameterized (central on vast/RunPod; on
Lambda/Paperspace/China the interruption is auto-shutdown/auto-release/capacity instead) — see principle
#8 and `references/spot-resilience.md`.

---

## 8. Checkpoint-to-durable + idempotent resume is the universal spine

Detaching the job is necessary but not sufficient. The **one** mechanism that survives every failure
mode — SSH drop, Slurm walltime kill, K8s pod reschedule, spot preemption, Colab disconnect — is:

1. **Checkpoint full state to the platform's durable location** on a periodic timer (model + optimizer +
   LR-scheduler + epoch/step + RNG + dataloader position), written **atomically** (`tmp`→`fsync`→
   `os.rename`) so a mid-write kill never corrupts the latest good checkpoint.
2. **Load-latest-on-startup unconditionally**, so the *identical launch command* resumes instead of
   restarting. This is what makes principle #7's "retry the identical config" actually resume progress.

The **detach primitive is the swappable plug** — tmux on a bare box, `sbatch --requeue` on Slurm, a Job
manifest on K8s, a Save&Run commit on Kaggle, a checkpoint-to-Drive loop on Colab. Checkpoint+resume is
the invariant underneath all of them.

*Universal.* Cadence is a formula, not a guess — Young/Daly `W = √(2·μ·C)` (μ = mean time between
preemptions, C = checkpoint write time); round *down* to an iteration boundary. Managed frameworks
(SkyPilot Managed Jobs, SageMaker) move the box for you but **restart your process from scratch — your
checkpoint-load is what restores progress.** Details + worked numbers in `references/spot-resilience.md`.

---

## 9. Cost and destructive actions are the user's call

Never auto-release/terminate an instance, never delete durable/shared files without explicit
confirmation, and if your own cleanup can't free enough space, **ask to expand the disk** (state the GB
needed) rather than silently shrinking the experiment (fewer seeds, smaller eval, capped vis).

This is sharpened, not softened, by going multi-platform: on RunPod/vast/Lambda the meter-stopping action
is the **irreversible** `terminate`/`destroy` that deletes the disk — so the confirmation gate matters
*more*. Operationalize it as the **teardown Iron Law** (SKILL.md Phase 5): no teardown before checkpoints
are pulled to local AND verified by load AND the user approves the specific cost-affecting action.

*Universal.* A shared FS is also multi-project: work inside your project's own folder, delete only your
own redundancy, never a top-level dir you didn't create.

---

## 10. Teach the user the platform, don't just drive it

Most users — especially on a platform they rent only occasionally — don't know its non-obvious
**conveniences** or its **danger clocks**, and the skill's job is not just to operate the box but to *tell
them*. On first contact with a platform, proactively surface:
- **Conveniences they'd otherwise miss:** one-click SSH-key registration (so the agent can connect
  non-interactively), GPU-availability notifications, the built-in panels (JupyterLab / the TensorBoard tile).
- **Danger clocks that cost data or money:** auto-release / auto-delete timers on *stopped* instances
  (AutoDL releases a 关机 box after **15 days** → the data disk is gone; several CN platforms in ~10), a
  stop that keeps billing (vast.ai forever, RunPod 2×), low-balance / arrears purge.

The per-platform list lives in each profile's **Surface to the user** block. This pairs with #9: #9 stops
the agent from *doing* the dangerous thing; #10 makes the agent *warn the human* about the danger clock
before it fires. The most expensive surprises on rented hardware are the silent timers (a parked box
released, a stopped disk still billing), not the visible failures — surfacing them early is the cheapest
insurance.
