# Parallel Ablation Fan-out — FS-shared deployment, isolated write paths, reconciliation

Run N ablation cells in parallel across instances/queues without corrupting shared state, then
reconcile and re-verify every cell before any teardown. The mechanism is **one job per cell with an
isolated write path**; the discipline is **`superpowers:dispatching-parallel-agents`'s independence
predicate + reconciliation**. **REQUIRED:** `superpowers:dispatching-parallel-agents` and
**REQUIRED:** `superpowers:verification-before-completion`.

To jump: `grep -in <keyword> references/parallel_ablation.md`.

## Table of contents

1. The fan-out model (one job per cell)
2. FS-shared wrapper deployment (place once, never mutate mid-run)
3. The independence predicate (isolated write path = the analogue of a git worktree)
4. The portable job request (describe once, run on any profile)
5. Queue-file format + resume via `start_index`
6. Mandatory post-fan-out reconciliation + full re-verify
7. Gotchas

---

## 1. The fan-out model

Parallelism comes from running **multiple queues on multiple instances simultaneously** — never from
parallel jobs inside one instance (sequential per instance keeps memory predictable and prevents disk
contention). The unit of work is the **ablation cell**: one
`(cfg, task, epochs)` row → one `run_one` invocation → one isolated output directory.

```
shared FS: /path/to/shared/run_one.sh, run_queue.sh   (ONE version, all instances read it)
instance A  tmux ──> run_queue.sh queueA.txt ──> cell a1 ──> cell a2 ──> ...
instance B  tmux ──> run_queue.sh queueB.txt ──> cell b1 ──> cell b2 ──> ...
instance C  tmux ──> run_queue.sh queueC.txt ──> cell c1 ──> ...
                                       each cell writes ONLY to its own /ckpt/<name>/ + FS/<name>/
```

Split the N cells across queue files (one per instance) by cost, not count — route the long cells
(detection at 50 epochs) onto faster/idle instances so the queues finish near-simultaneously.

---

## 2. FS-shared wrapper deployment

Place a **single copy** of `run_one`/`run_queue` on the cross-instance shared filesystem
(`profiles/<platform>.md` STORAGE names the mount; on AutoDL it is the FS tier, on RunPod a Network
Volume, on a bare box a synced NFS/`rsync` target). Every instance reads the **same version** — no
per-instance drift, no "fixed it on A but not B."

**Recall principle #6 — never mutate inputs under a live run.** A running queue holds
`run_queue.sh`/`run_one.sh` in memory by byte-offset; overwriting either mid-run lands bash in the
middle of a *different* file and re-executes blocks (duplicate runs, stalled queues). Therefore:

- **Deploy the wrapper before launching any queue.** Treat the FS copy as immutable for the fan-out's
  lifetime. Edit only when nothing reads it (`pgrep -af run_queue.sh` empty on every instance).
- **Appending to a queue *file* mid-flight is safe** (streaming read re-reads on each iteration);
  editing the *script* is not. New cells → append a line, or start a fresh queue file.
- A fix that must reach in-flight jobs → **version the filename** (`run_one.v2.sh`), drain the old
  queues, point new queues at the new file. Never `scp` over the path a live queue is reading.

The FS copy is also the durable safety net: `run_one`'s post-success step syncs `best.pth` +
metrics + log to `FS/<name>/`, so a released/dead instance still leaves its cell's result on the FS.

---

## 3. The independence predicate

**REQUIRED:** `superpowers:dispatching-parallel-agents` — fan out only over work whose units share no
mutable state. Here the predicate is concrete: **each cell writes to its own output directory and
nothing else.** The per-job output dir is the platform analogue of a **git worktree** — an isolated
workspace where one agent's writes can never collide with another's.

Hold the predicate by routing every per-cell write to a name-scoped path:

| Write target | Isolation key | Set via |
|---|---|---|
| checkpoints | `<ckpt_root>/<name>/` | `training.checkpoint_dir` override (per `<name>`) |
| FS final copy | `FS/final_ckpts/<name>/` | `run_one` post-success sync |
| tracker run | `group=<task>_<cat>`, unique run name | `wandb.group` / `wandb.tags` overrides |
| per-cell log | `<name>.log` | `run_queue` per-line logging |

**Never fan out onto shared mutable output.** Two cells writing `latest.pth`, the same
`checkpoint_dir`, or one tracker run id = the exact shared-state violation the predicate forbids —
it produces silently interleaved checkpoints and unattributable metrics, which no amount of
post-hoc reconciliation can untangle. The `<name>` derives 1:1 from the cfg, so distinct cfgs →
distinct paths automatically; **two queue lines must never share a `<name>`.**

What is read-shared (the immutable wrappers, the dataset, the base image) is fine — the predicate
only forbids shared **mutable** state.

---

## 4. The portable job request

Describe a sweep once so the *same* fan-out runs against any profile (the launcher resolves it
against `profiles/<platform>.md`; the profile supplies paths/verbs, the job supplies the work — see
`profiles/_schema.md`):

```yaml
resources:
  gpu: {name: A100, count: 1, memory: 24GB+}    # a CONSTRAINT, never a platform SKU
  disk: 100GB                                    # ckpt_size × cells_per_instance + scratch
candidates: [autodl, china, runpod]              # ordered fallback → describe once, run anywhere
run: "bash run_queue.sh queue.txt"               # the per-instance entry point
```

Per-instance disk budget = `ckpt_size × cells_in_this_queue + scratch` (principle #5). Pre-compute it
in Phase 0; a fan-out that under-budgets disk fails the *last* cells of each queue, not the first.

---

## 5. Queue-file format + resume

One ablation cell per line, whitespace-separated (`while IFS=' ' read -r cfg task epochs`):

```
<cfg_path> <task> [epochs]
```

- `cfg_path` — yaml file relative to repo root; its basename is the cell `<name>` (the isolation key).
- `task` — reconstruction / segmentation / detection (or other supported task) — sets tracker group/tags.
- `epochs` — optional integer; omitted → wrapper default (e.g. `20`). The optional 3rd field lets one
  queue mix per-task budgets (detection 50, recon/seg 20).

```
configs/experiments/ablation/recon/baseline.yaml      reconstruction 20
configs/experiments/ablation/det/baseline.yaml        detection      50
configs/experiments/ablation/seg/no_aug.yaml          segmentation
```

**Resume via `start_index`.** A queue killed at cell k (SSH drop, preemption, OOM) resumes with
`bash run_queue.sh queue.txt <k>` — it skips the first k lines and continues. This is the queue-level
form of principle #8 (idempotent resume); combined with per-cell checkpoint-load-on-startup, a
half-finished cell resumes mid-cell, not from scratch. Keep `start_index` aligned to the queue file:
appending lines is safe, **reordering or deleting earlier lines shifts every index** — append only.

---

## 6. Mandatory post-fan-out reconciliation + full re-verify

**REQUIRED:** `superpowers:dispatching-parallel-agents` (reconcile) and
**REQUIRED:** `superpowers:verification-before-completion` (evidence before any success claim). When
queues report done, the watcher's "done" is a **claim** (principle #3), not ground truth — a cell can
report success on a silently-failed sync, OOM mid-write, or never have run because its instance died.

Reconcile and re-verify **every cell before any teardown** — this is a hard gate, not a spot check:

1. **Roster.** Enumerate the expected cell `<name>` set from all queue files (the ground-truth roster).
2. **Reconcile.** For each `<name>`, confirm `FS/final_ckpts/<name>/` exists and holds `best.pth` +
   metrics + log. List the delta: missing, zero-byte, or duplicate-`<name>` collisions (a predicate
   violation that slipped through — see Gotchas).
3. **Re-verify by load.** Run `scripts/verify_local.py` over the durable copies — *load* each
   checkpoint and metrics file. "The file exists" / "the log said synced" is not evidence; a load
   that succeeds is (principle #3, the `verifying-dl-experiments` boundary owns whether the *number*
   is real — **REQUIRED:** `verifying-dl-experiments`).
4. **Remediate, never blind-retry.** Each missing/failed cell → classify the cause, then re-launch the
   **identical config** (principle #7) on a live instance via `start_index`, or append its line to a
   fresh queue. Do not patch one cell's config to make it pass — that destroys comparability.

Only after the roster is 100% reconciled AND every cell loads does the teardown Iron Law unlock
(SKILL.md Phase 5): no `release`/`terminate`/`destroy` until results are pulled to local AND verified
by load AND the user approves the cost-affecting action.

---

## 7. Gotchas

**Two cells share a `<name>` → interleaved checkpoints, unattributable metrics.**
Symptom: one cell's `best.pth` overwritten, a tracker run with mixed curves, reconciliation finds N-1
output dirs for N cells. → Root cause: independence-predicate violation — two queue lines mapped to
the same isolation key (same cfg basename / hand-set identical `checkpoint_dir`). → Fix: enforce
distinct `<name>` per line *before* launch (the cfg→`<name>` map must be injective); on collision,
rename one cfg and rerun both — interleaved output cannot be un-mixed after the fact.

**Editing the FS wrapper mid-fan-out → duplicate / stalled cells across instances.**
Symptom: cells re-run or queues hang after a "quick fix" to `run_queue.sh`/`run_one.sh` on the FS. →
Root cause: principle #6 — live bash holds the script by byte-offset; overwriting the shared copy
corrupts every reader at once. → Fix: treat the FS wrapper as immutable for the fan-out's lifetime;
version the filename and repoint new queues; edit only when `pgrep -af run_queue.sh` is empty
everywhere.

**Queue reports "all done" but a cell never ran.**
Symptom: roster has N cells, FS has fewer; no error in the surviving logs. → Root cause: the instance
died (released, preempted, host fault) and its queue's "done" was never emitted — absence of failure
is not presence of success (principle #3). → Fix: reconcile against the **roster**, not against the
watcher's last status; re-launch missing cells with `start_index` on a live instance.

**`start_index` resumes the wrong cell after a queue edit.**
Symptom: resume skips or re-runs the wrong rows. → Root cause: a line was inserted/deleted/reordered,
shifting every subsequent index. → Fix: append-only to in-flight queue files; to drop a cell, comment
it (don't delete) so indices stay stable, or start a fresh queue file for the remainder.

> Universal gotchas (SSH drop on `pkill`, CRLF, cgroup OOM, silent sync, inode exhaustion on
> many-small-files eval output across a shared FS) are **not** restated here — see
> `references/gotchas_universal.md`. Shared-FS inode pressure (principle #5) bites hardest exactly
> during fan-out, when N cells write eval artifacts to one FS at once.
