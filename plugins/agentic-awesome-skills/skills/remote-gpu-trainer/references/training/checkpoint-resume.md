# Correct checkpointing & idempotent resume — full state, atomic write, sharded checkpoints, framework APIs

Make a training job resume **exactly where it stopped** after any kill — not "reload the weights and
silently restart the epoch." This layer owns the *mechanics*: what FULL state to save, how to write it
without corruption, how to load it unconditionally, and the framework-specific knobs (FSDP / DeepSpeed /
HF Trainer / Accelerate / Lightning) plus the resume **bugs** that make a job look resumed while it
quietly lost progress. **verifying-dl-experiments** (**REQUIRED**) owns *is the resumed number correct* —
e.g. proving step/epoch/loss actually continued instead of resetting is its reproducibility check applied
here. The spot/preemption *cadence* (when + how often, Young/Daly) lives in
`references/spot-resilience.md` (**REQUIRED** for any interruptible/spot tier) — this file is the *content
and correctness* of each checkpoint; that file is the *timing*.

To jump: `grep -in '<keyword>' references/training/checkpoint-resume.md` (e.g. `atomic`, `rename`,
`scaler`, `ema`, `sampler`, `fsdp`, `sharded`, `zero_to_fp32`, `dcp`, `resume_from_checkpoint`,
`save_state`, `ckpt_path`, `save_total_limit`, `reshuffle`).

## Table of contents

- **The contract** — C1 full-state-list · C2 atomic-write · C3 load-latest-unconditionally · C4 durable-location
- **Sharded checkpoints (multi-GPU)** — C5 FSDP-FULL_STATE_DICT-rank0-OOM · C6 FSDP-SHARDED_STATE_DICT · C7 DCP-(dcp.save/load) · C8 DeepSpeed-ZeRO-dir+zero_to_fp32
- **Framework APIs** — C9 HF-Trainer-resume_from_checkpoint+save_total_limit · C10 Accelerate-save_state/load_state · C11 Lightning-ModelCheckpoint+ckpt_path
- **The resume BUGS** — C12 epoch-restarts · C13 data-reshuffles/order · C14 LR-schedule-resets · C15 scaler-not-restored · C16 EMA-not-saved · C17 save_total_limit-deletes-best · C18 strict-load-key-mismatch
- **Pointers** — disk-full on save → gotchas_universal.md U6 · silent sync → U33 · keepable-policy/save_top_k → verifying-dl-experiments (skill) · cadence/Young-Daly → spot-resilience.md

---

## The contract

### C1 — A checkpoint that restores only weights is NOT a resume — save the FULL training state

**Symptom**: resume "works" (no crash) but the loss jumps up, accuracy regresses, or training takes more
total epochs than an uninterrupted run — because the resume silently restarted the epoch, reset the
optimizer momentum, and reshuffled the data.

**Root cause**: `torch.save(model.state_dict())` captures *weights only*. Optimizer momentum/variance,
the LR-scheduler position, the epoch/step counter, RNG state, the AMP scaler, and the dataloader position
are all lost, so the restarted run is a *different* trajectory, not a continuation.

**Fix**: every checkpoint must carry the full state (PyTorch tutorial
[saving multiple / general checkpoint](https://docs.pytorch.org/tutorials/recipes/recipes/saving_and_loading_a_general_checkpoint.html);
the spot-resilience §3 list):

| Must save | Why losing it breaks resume |
|---|---|
| model `state_dict` | the weights (obvious) |
| optimizer `state_dict` | Adam m/v momentum — losing it = a cold optimizer restart (C12) |
| LR-scheduler `state_dict` | step-based LR position — losing it resets the schedule (C14) |
| `epoch` **and** global `step`/iteration | resume the exact position, not the epoch start (C12) |
| RNG state: Python `random`, NumPy, `torch`, **CUDA** (`torch.cuda.get_rng_state_all()`) | reproducible augmentation/dropout stream after restart |
| dataloader / sampler position | so the next batch is the *next* unseen one, not a reshuffle (C13) |
| AMP `GradScaler` `state_dict` | the loss-scale + growth tracker — losing it triggers an inf-scale stall (C15) |
| EMA / SWA shadow weights (if used) | the EMA copy is often what's evaluated — losing it = eval on the wrong weights (C16) |
| best-metric-so-far + `best.pth` selection state | so "best" survives a restart instead of resetting |

The runnable atomic skeleton that assembles this dict is in `references/spot-resilience.md` §5 — do not
duplicate it; this table is the *checklist*, that is the *code*.

### C2 — Write atomically: tmp → fsync → os.replace (a kill mid-write corrupts a naive save)

**Symptom**: after a preemption/OOM, `latest.pth` is truncated/zero-byte or `torch.load` raises
`RuntimeError: PytorchStreamReader failed reading zip archive`; a `latest.pth.tmp` is left behind.

**Root cause**: overwriting `latest.pth` in place is **not** atomic — a kill partway through leaves a
corrupt file and (if it was the only checkpoint) zero good ones. `torch.save` itself does *not* fsync.

**Fix**: write to a temp file, force bytes to disk, then atomically rename (POSIX `rename`/`os.replace`
is atomic on the **same filesystem**):
```python
tmp = ckpt_path + ".tmp"
with open(tmp, "wb") as f:
    torch.save(state, f); f.flush(); os.fsync(f.fileno())   # bytes hit disk BEFORE the swap
os.replace(tmp, ckpt_path)                                   # all-or-nothing; keep prev until this returns
```
Keep the previous `latest.pth` valid until the rename returns (a kill at any instant leaves one intact
file). `os.replace` (not `os.rename`) also works on Windows for the local-test path. Full recipe +
rationale: `references/spot-resilience.md` §3. Disk-full *during* the save is a separate failure with the
same `.tmp` left behind → `references/gotchas_universal.md` U6 (pre-budget + prune `latest`, keep `best`).

### C3 — Load-latest UNCONDITIONALLY on startup → idempotent resume

**Symptom**: a relaunch starts from scratch because the resume is gated behind a `--resume` flag the
launch wrapper forgot to pass; or two code paths (fresh vs resume) diverge.

**Root cause**: making resume *opt-in* means a generic relaunch (spot recovery, SSH-drop restart, queue
retry) re-trains from zero. A divergent "first launch" code path also drifts from the resume path.

**Fix**: one code path that loads the latest checkpoint if it exists, else starts fresh — so the
**identical launch command** converges to the same end state no matter how many times it runs. This is
what makes principle #7's "retry the identical config" actually *resume* instead of restart, and it is the
universal spine (principle #8) under SSH-drop / Slurm-walltime / K8s-reschedule / spot-preemption. Skeleton:
`references/spot-resilience.md` §3 (`load_latest_if_any`).

### C4 — Checkpoint to the platform's DURABLE location, not local scratch

**Symptom**: resume after a managed-spot replacement (or a `terminate`/`destroy`) finds no checkpoint —
the box came up *fresh* and the only copy was on the dead instance's local disk.

**Root cause**: a replacement node is clean; anything not on a cloud bucket / network volume / shared FS
is gone (principle #4 — know what survives stop vs destroy).

**Fix**: write checkpoints to the profile's durable mount (`DURABLE_DIR` in `profiles/<platform>.md` §8),
or mirror local→durable on the checkpoint timer. The single biggest portability trap is assuming local
disk survives — see each profile's STORAGE survival-matrix and the SKILL Quick-reference table. Gate the
sync on the actual copy result, never an unconditional `echo synced` →
`references/gotchas_universal.md` U33.

---

## Sharded checkpoints (multi-GPU)

### C5 — FSDP `FULL_STATE_DICT` OOMs on rank 0 when gathering a large model

**Symptom**: an FSDP job trains fine but **crashes at the first checkpoint** with CUDA OOM on rank 0;
the model is larger than one GPU.

**Root cause**: `StateDictType.FULL_STATE_DICT` all-gathers every shard onto **one rank** to assemble the
unsharded dict. For a model that only fits *because* it's sharded, materializing the whole thing on rank 0
exceeds that GPU's VRAM.

**Fix**: when taking a full (consolidated) dict, offload it to CPU and build it on rank 0 only —
`FullStateDictConfig(offload_to_cpu=True, rank0_only=True)`. This all-gathers parameters one-by-one,
offloading each to CPU on rank 0, so peak GPU memory stays bounded and non-rank-0 workers skip the GPU→CPU
copy entirely
([HF Accelerate FSDP guide](https://huggingface.co/docs/accelerate/en/usage_guides/fsdp),
[Lightning issue #11207](https://github.com/Lightning-AI/pytorch-lightning/issues/11207)). The full dict
is only viable when it fits in CPU RAM; past that, use sharded (C6). Save a full dict only at the **end**
for a portable single-file artifact; checkpoint *during* training as sharded.

### C6 — `SHARDED_STATE_DICT`: each rank saves its own shard (no gather, no rank-0 OOM)

**Symptom**: need to checkpoint a model too big to consolidate even on CPU, or want a fast resume that
re-shards onto a *different* world size.

**Root cause**: `FULL_STATE_DICT` is fundamentally a single-rank materialization; it does not scale and
cannot reshard.

**Fix**: use `StateDictType.SHARDED_STATE_DICT` — every rank writes only its own shard, so there is no
all-gather and no OOM, and the per-rank files load back in parallel. Pair it with Distributed Checkpoint
(C7), which is the production path for sharded save/load and supports **resharding** (resume on a different
GPU count). Tradeoff: a sharded checkpoint is a *directory of N files*, not a single `.pth` — convert to a
full dict for export/inference (C7's `get_model_state_dict`, or the DeepSpeed analogue C8).

### C7 — Distributed Checkpoint (DCP): `dcp.save` / `dcp.load` for FSDP/sharded models

**Symptom**: hand-rolling FSDP state-dict context managers is brittle, slow, and breaks when the world
size changes between save and resume.

**Root cause**: `torch.save` produces a single file and has no notion of sharding or FQN remapping;
manually toggling `FSDP.state_dict_type` is error-prone.

**Fix**: use `torch.distributed.checkpoint` (DCP), the current PyTorch-2.x sharded-checkpoint API
([DCP recipe](https://docs.pytorch.org/tutorials/recipes/distributed_checkpoint_recipe.html),
[2.12 reference](https://docs.pytorch.org/docs/2.12/distributed.checkpoint.html)). **Save**: get canonical
dicts with `get_state_dict(model, optimizer)` from `torch.distributed.checkpoint.state_dict`, then
`dcp.save(state_dict, checkpoint_id=DIR)` — it writes **≥1 file per rank in parallel** and auto-manages FQN
mappings. **Load**: allocate the model first, then `dcp.load(state_dict, checkpoint_id=DIR)` (loads **in
place** and **auto-reshards** to the current world size), then `set_state_dict(...)`. DCP beats
`torch.save` for any distributed model because it shards the write across ranks (no rank-0 gather, C5) and
reshards on load. For a single portable inference file, convert offline with `torch.distributed.checkpoint.format_utils.dcp_to_torch_save(DIR, "out.pt")` (or the CLI `python -m torch.distributed.checkpoint.format_utils dcp_to_torch DIR out.pt`).

### C8 — DeepSpeed ZeRO: a checkpoint *directory* per save + `zero_to_fp32.py` to consolidate

**Symptom**: `model_engine.save_checkpoint(dir)` writes a *folder* of `mp_rank_*` / `zero_pp_rank_*`
files, not a `.pth`; loading the weights into a plain (non-DeepSpeed) model for inference fails.

**Root cause**: ZeRO **partitions** optimizer state (stage 1), gradients (2), and parameters (3) across
ranks; the on-disk checkpoint is inherently sharded across per-rank files — it is not a single fp32 model.

**Fix** ([DeepSpeed model-checkpointing](https://deepspeed.readthedocs.io/en/stable/model-checkpointing.html),
[ZeRO tutorial](https://www.deepspeed.ai/tutorials/zero/)):

- **Save/resume training** — `model_engine.save_checkpoint(save_dir, tag)` /
  `model_engine.load_checkpoint(save_dir, tag)`. **All ranks must call both** (they're collective; rank-0
  only deadlocks/corrupts). Round-trips full sharded optimizer+param state.
- **Export a single fp32 model** — DeepSpeed auto-drops a `zero_to_fp32.py` into the checkpoint dir; run
  `python zero_to_fp32.py <checkpoint_dir> pytorch_model.bin`, or in-process
  `from deepspeed.utils.zero_to_fp32 import get_fp32_state_dict_from_zero_checkpoint(dir)` /
  `convert_zero_checkpoint_to_fp32_state_dict(...)` / `load_state_dict_from_zero_checkpoint(model, dir)`
  (the last returns a model that **can't continue training** without re-init). The consolidated file no
  longer needs DeepSpeed. For ZeRO-3, set
  `"zero_optimization": {"stage3_gather_16bit_weights_on_model_save": true}` + `engine.save_16bit_model(dir)`.

---

## Framework APIs

### C9 — HF Trainer: `resume_from_checkpoint` + `save_total_limit` (and what it actually saves)

**Symptom**: assuming `Trainer.save_model()` is a resume point (it saves *weights only*); or a relaunch
re-trains from step 0 because `resume_from_checkpoint` wasn't passed; or the disk fills with `checkpoint-*`
dirs.

**Root cause**: `save_model` ≠ a training checkpoint. A real Trainer checkpoint dir (`checkpoint-<step>`)
contains the model **plus** `optimizer.pt`, `scheduler.pt`, `rng_state.pth`, `trainer_state.json`, and the
AMP `scaler.pt` — the full state. Without `resume_from_checkpoint` the run starts cold.

**Fix** ([Trainer docs](https://huggingface.co/docs/transformers/main/en/main_classes/trainer)):
`trainer.train(resume_from_checkpoint="path/to/checkpoint-1500")` resumes that exact dir;
`resume_from_checkpoint=True` auto-finds the **last** checkpoint in `args.output_dir` (idempotent spelling,
C3; `trainer_utils.get_last_checkpoint(output_dir)` finds it in code). `save_strategy="steps"` +
`save_steps=N` (or `"epoch"`) sets cadence; **`save_total_limit=k`** keeps only the `k` most-recent
`checkpoint-*` and **deletes older ones in `output_dir`** — the built-in disk-budget knob (pairs with
`references/gotchas_universal.md` U6). `load_best_model_at_end=True` + `metric_for_best_model` +
`greater_is_better` reloads the best checkpoint at the end **and** protects it from `save_total_limit`
deletion (C17).

### C10 — Accelerate: `accelerator.save_state(dir)` / `load_state(dir)` + dataloader skip

**Symptom**: a custom (non-Trainer) Accelerate loop resumes with a cold optimizer/scaler, or the LR
scheduler resets, or it replays already-seen batches.

**Root cause**: saving only `accelerator.get_state_dict(model)` drops optimizer/scaler/RNG; and a
mid-epoch resume re-iterates the dataloader from batch 0.

**Fix** ([Accelerate checkpoint guide](https://huggingface.co/docs/accelerate/en/usage_guides/checkpoint)):
`accelerator.save_state(output_dir)` saves model, optimizer, **GradScaler**, and RNG generators in one
call; `accelerator.load_state(output_dir)` restores all of it (objects must come from the *same* script).
The LR scheduler (and any object with `state_dict`/`load_state_dict`) **must** be registered first —
`accelerator.register_for_checkpointing(my_scheduler)` — or it is not saved and resets (C14). For
mid-epoch resume, skip consumed batches with `accelerator.skip_first_batches(train_dataloader, N)` on the
first resumed epoch, then fall back to the full dataloader (C13).
`ProjectConfiguration(automatic_checkpoint_naming=True, total_limit=k)` gives rolling
`checkpoints/checkpoint_<n>` dirs with a built-in limit.

### C11 — Lightning: `ModelCheckpoint` + `trainer.fit(ckpt_path=...)` (don't use `resume_from_checkpoint`)

**Symptom**: an old tutorial's `Trainer(resume_from_checkpoint=...)` is ignored/deprecated; or
`save_top_k` quietly deletes the checkpoint needed to resume.

**Root cause**: `resume_from_checkpoint` moved to `fit(ckpt_path=...)` (deprecated since 1.x). A Lightning
`.ckpt` is a full dump — epoch, global step, LightningModule `state_dict`, **all** optimizer + LR-scheduler
states, callback states, loop state, and the 16-bit scaling factor (AMP)
([Lightning checkpointing basics](https://lightning.ai/docs/pytorch/stable/common/checkpointing_basic.html)).

**Fix**:
- Configure `ModelCheckpoint(dirpath=..., monitor="val_loss", mode="min", save_top_k=k, save_last=True)`;
  resume with `trainer.fit(model, datamodule, ckpt_path="path/to/last.ckpt")`, or
  `ckpt_path="last"` to auto-pick the `save_last=True` file (the idempotent spelling, C3). Best/last paths
  read back from `cb.best_model_path` / `cb.last_model_path`.
- `save_top_k` keeps only the k best by `monitor`; **always set `save_last=True`** so a resume target
  exists even when the latest step isn't a top-k metric (otherwise resume may have no recent checkpoint).
  Add custom state (EMA, C16) via `on_save_checkpoint` / `on_load_checkpoint` on the module or a stateful
  callback. Lightning's DeepSpeed strategy writes a ZeRO dir — convert with
  `lightning.pytorch.utilities.deepspeed.convert_zero_checkpoint_to_fp32_state_dict` (C8 analogue).

---

## The resume BUGS (looks resumed, silently lost progress)

These are the "it ran without error but the result is wrong" traps — confirm the fix with the
`verifying-dl-experiments` reproducibility check (**REQUIRED**): kill mid-run, relaunch the *identical*
command, and verify step/epoch/loss **continue** rather than reset.

### C12 — Epoch/step restarts from 0 despite "resuming"

**Symptom**: tracker shows a second run starting at epoch 1; total trained epochs exceed the schedule;
LR warm-up replays. (The remote-ops version of this — a tmux script re-executed mid-run — is
`references/gotchas_universal.md` U2.)

**Root cause**: the loop is `for epoch in range(total_epochs)` with a hardcoded `0` start; the saved
`epoch`/`step` was never read back, or was saved but not used to seed the range.

**Fix**: `start_epoch, start_step = load_latest_if_any(...)` then
`for epoch in range(start_epoch, total_epochs)` and seed the step counter from `start_step`. The counter
**must** be in the checkpoint (C1) *and* consumed on load.

### C13 — Data reshuffles / repeats the same order after resume

**Symptom**: resume re-shows already-seen samples (worse, the *same* batch every epoch even without
resume), hurting convergence or leaking.

**Root cause**: two distinct bugs. (a) Resume restarts the epoch from batch 0 without skipping consumed
batches. (b) `DistributedSampler` seeds its shuffle from an internal epoch that defaults to 0 forever
unless `sampler.set_epoch(epoch)` is called each epoch — so every epoch (and every resume) produces the
**identical** order
([PyTorch #31771](https://github.com/pytorch/pytorch/issues/31771),
[DistributedSampler docs](https://docs.pytorch.org/docs/stable/data.html#torch.utils.data.distributed.DistributedSampler)).

**Fix**: call `train_sampler.set_epoch(epoch)` at the top of every epoch (restore the epoch counter on
resume so the shuffle stream continues). For mid-epoch resume, fast-forward consumed batches
(`accelerator.skip_first_batches`, C10) or use a resumable/stateful sampler (`torchdata`
`StatefulDataLoader`) whose offset is in the checkpoint (C1).

### C14 — LR schedule resets (cosine restarts, warm-up replays)

**Symptom**: the LR curve restarts from the initial/warm-up value on resume; final LR is wrong; cosine
decay never reaches its floor.

**Root cause**: the LR scheduler's `state_dict` (its `last_epoch`/step counter) was not saved or not
restored. With Accelerate, the scheduler wasn't `register_for_checkpointing`-ed (C10).

**Fix**: save `scheduler.state_dict()` and call `scheduler.load_state_dict(...)` on resume (C1). Note a
step-based scheduler advanced *per optimizer step* must restore the **step**, not the epoch — restoring
only `epoch` under-/over-shoots the schedule.

### C15 — AMP `GradScaler` not restored → "No inf checks were recorded" / scale stall

**Symptom**: resuming a mixed-precision run raises
`AssertionError: No inf checks were recorded for this optimizer`, or training stalls/NaNs because the
loss-scale snapped back to the default and re-enters the scale-search.

**Root cause**: the `GradScaler` holds dynamic state — `scale`, `growth_factor`, `backoff_factor`,
`growth_interval`, `_growth_tracker` — that evolves during training; dropping it resets the scaler
([PyTorch AMP recipe](https://docs.pytorch.org/tutorials/recipes/recipes/amp_recipe.html),
[forum: No inf checks were recorded](https://discuss.pytorch.org/t/resume-training-with-mixed-precision-lead-to-no-inf-checks-were-recorded-for-this-optimizer/115828)).

**Fix**: save `scaler.state_dict()` (call it **after** `scaler.update()` in the iteration) and
`scaler.load_state_dict(checkpoint["scaler"])` on resume. HF Trainer (`scaler.pt`), Accelerate
(`save_state`), and Lightning (16-bit factor) all do this automatically — the bug bites hand-written loops.
Resuming a *non-AMP* checkpoint into an AMP run has no saved scaler → start a **fresh** `GradScaler`.

### C16 — EMA / SWA shadow weights not saved → eval on the wrong weights after resume

**Symptom**: pre-resume eval (using EMA weights) is good; post-resume eval drops sharply, then recovers
over many steps — because the EMA copy restarted from the raw weights.

**Root cause**: EMA/SWA maintain a *separate* shadow parameter set that is what gets evaluated/exported;
saving only the live model `state_dict` loses it, so EMA reinitializes from the (noisier) live weights.

**Fix**: include `ema.state_dict()` (and SWA `AveragedModel` / `swa_scheduler` state) in the checkpoint
dict (C1) and restore it. In Lightning, persist it via `on_save_checkpoint`/`on_load_checkpoint` (C11).
This is a *which-weights-are-correct* concern at the boundary — cross-link **verifying-dl-experiments**
(**REQUIRED**) for confirming the evaluated weights are the intended ones.

### C17 — `save_total_limit` / `save_top_k` deletes the very checkpoint resume needs

**Symptom**: resume fails because the target checkpoint was auto-pruned; or `load_best_model_at_end`
errors because the best checkpoint was rotated out.

**Root cause**: a rolling limit prunes by *recency* (`save_total_limit`) or by *metric* (`save_top_k`),
and neither guarantees the most-recent-step checkpoint is the one kept — so the resume anchor can be the
one deleted.

**Fix**: keep an explicit `last`/`latest` alongside the top-k (`save_last=True` in Lightning, C11; in HF,
`load_best_model_at_end=True` makes Trainer preserve the best checkpoint past `save_total_limit`). General
keepable-checkpoint *policy* (how many, which selection criterion, `save_top_k ≤ 3`, prune `latest`) is
owned by **verifying-dl-experiments** (**REQUIRED**); the disk-budget consequence is
`references/gotchas_universal.md` U6.

### C18 — `load_state_dict` key mismatch on resume (`module.` prefix, compiled-model prefix)

**Symptom**: resume raises `Missing key(s)` / `Unexpected key(s) ... module.<name>` or
`_orig_mod.<name>`, or strict load fails after switching DDP/`torch.compile` on or off.

**Root cause**: `DataParallel`/DDP wrap adds a `module.` prefix and `torch.compile` adds `_orig_mod.` to
every key; a checkpoint saved wrapped and loaded unwrapped (or vice-versa) won't key-match under
`strict=True`.

**Fix**: save the **unwrapped** module — `model.module.state_dict()` (DDP) /
`accelerator.unwrap_model(model).state_dict()` / `model._orig_mod.state_dict()` (compiled) — so the
checkpoint is wrapper-agnostic. On load, strip the prefix if present
(`{k.replace("module.", "").replace("_orig_mod.", ""): v for k, v in sd.items()}`). Keep `strict=True`
while debugging a resume so a silent partial load can't masquerade as success; only relax it deliberately.

---

## Pointers — owned elsewhere, do NOT restate here

- **Cadence — when/how often** (Young/Daly `W = sqrt(2·mu·C)`, grace windows, opportunistic SIGTERM
  last-flush, the runnable atomic skeleton) → `references/spot-resilience.md` (**REQUIRED**, spot tier).
- **Disk-full on save** (pre-budget, prune `latest`, keep `best`, `.tmp` recovery) →
  `references/gotchas_universal.md` U6; **silent "synced" line** → U33; **inode exhaustion** → U7.
- **Sharding a model that won't fit** (FSDP wrap policy, ZeRO stages, offload) is the *fitting* concern →
  `references/training/oom-memory.md` M9/M10; this file owns *checkpointing* the sharded state.
- **Multi-rank save/load collectives + elastic restart** (torchrun `--max-restarts` restores from the
  checkpoint) → `references/training/distributed-launch.md`, `references/multinode.md`.
- **Keepable-checkpoint policy + "is the resumed/best number real"** (selection criterion, `save_top_k`,
  proving step/epoch/loss continued) → **verifying-dl-experiments** (**REQUIRED**).
