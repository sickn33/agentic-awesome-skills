# OOM & fitting a model that doesn't — VRAM + host-RAM out-of-memory during training

How to read a CUDA OOM trace, understand *what* fills the card (params vs optimizer vs gradients vs
activations vs fragmentation), and apply the fixes **in cost order** — from a free batch-size cut to
ZeRO-3/QLoRA sharding. This layer owns *making training RUN and fit*; **verifying-dl-experiments** owns
*is the resulting number correct*. Cross-link it (**REQUIRED**) wherever a "fix" risks changing the
science (shrinking the one variable under test, swapping precision, changing seq-len).

To jump: `grep -in '<keyword>' references/training/oom-memory.md` (e.g. `expandable`, `checkpoint`,
`zero`, `validation`, `snapshot`, `lora`, `empty_cache`, `longest`, `fragment`).

## Table of contents

- **Read it first** — M1 anatomy (where VRAM goes) · M2 reading the OOM trace · M3 VRAM-OOM vs host-RAM-OOM
- **Fixes in order** — M4 the ladder (do these top-down) · M5 batch/grad-accum · M6 bf16 mixed precision · M7 activation/gradient checkpointing · M8 expandable_segments · M9 FSDP / ZeRO sharding · M10 CPU/NVMe offload · M11 seq-len/resolution · M12 8-bit & paged optimizers · M13 LoRA/QLoRA
- **OOM at a specific step** — M14 first backward · M15 validation/eval · M16 the longest batch · M17 step-2 (optimizer alloc)
- **Debugging** — M18 memory_summary · M19 the snapshot + visualizer · M20 empty_cache & "leak" myths
- **Pointers** — host-RAM cgroup-OOM → gotchas_universal.md U9 · VRAM-vs-cgroup → U10 · zombie-VRAM → U11

---

## Read it first

### M1 — Anatomy: where the VRAM actually goes (a model that runs inference OOMs in training)

Training memory is **not** just weights. For **Adam mixed-precision**, per parameter:

| Bucket | Bytes/param | Note |
|---|---|---|
| Weights (fp16/bf16 + fp32 master) | **6** | 2 B working copy + 4 B fp32 master for stable updates |
| Optimizer states (Adam m, v, fp32) | **8** | momentum 4 B + variance 4 B |
| Gradients (fp32) | **4** | one per param, backward pass |
| **Subtotal (fixed, batch-independent)** | **~18 B/param** | a 4 B-param model ≈ 72 GB *before any activation* |
| Forward **activations** (cached for backward) | **varies** | scales with `batch × seq_len × depth × hidden`; the part that explodes |
| Temporary buffers (softmax, matmul scratch) | spikes | a single peak op can OOM even when steady-state fits |

Source: HF model-memory-anatomy (https://huggingface.co/docs/transformers/en/model_memory_anatomy) gives
the 6+8+4 split and the "4B params, batch 16 ≈ 85 GB" worked figure. **Why a model that *infers* in 16 GB
OOMs in training:** inference is just the 2 B/param working copy + small activations; training adds the
+12 B/param of grads+optimizer **and** keeps the entire forward activation graph alive for backward.
The fixed 18 B/param is attacked by M9/M12/M13; the activation term by M5/M6/M7/M11.

### M2 — Reading the CUDA OOM trace (the numbers tell you which fix)

**Symptom**: `torch.OutOfMemoryError: CUDA out of memory. Tried to allocate X MiB (GPU 0; Y GiB total
capacity; Z GiB already allocated; A GiB free; B GiB reserved in total by PyTorch ...)`.

**Root cause — decode the four numbers**:
- **Tried to allocate X** — the size of the *single* failing request. Large X = a big tensor (long-seq
  attention score matrix, the longest batch M16); tiny X failing with GBs "free" = **fragmentation**.
- **reserved B vs allocated Z** — `reserved` = total the caching allocator grabbed from the driver;
  `allocated` = live tensors. **`reserved` ≫ `allocated` with a small failing X ⇒ fragmentation** (free
  blocks exist but none is contiguous enough). This is the explicit PyTorch diagnostic: "if reserved but
  unallocated is large, set `expandable_segments:True`" (M8).
- **free A** — driver-visible free on the card; if A is large but the alloc still fails, suspect another
  process (M3) or a zombie holding VRAM (gotchas_universal.md **U11**).

Sources: PyTorch forums thread on the trace fields
(https://discuss.pytorch.org/t/torch-outofmemoryerror-cuda-out-of-memory/217669); the reserved-vs-allocated
→ fragmentation rule is from the allocator docs (M8 URL).

### M3 — VRAM OOM is not host-RAM OOM (distinct failure, distinct fix)

A `torch.OutOfMemoryError: CUDA out of memory` (a Python traceback) is **VRAM** exhaustion. A bare `Killed`
/ **exit 137** with **no traceback** is the Linux kernel killing the process for **host-RAM**
(cgroup `memory.max`) exhaustion — almost always `num_workers × a big in-RAM object`. These have opposite
fixes and live in the universal catalog:
- host-RAM cgroup-OOM (`Killed`, exit 137, dataloader workers) → **gotchas_universal.md U9**.
- VRAM-OOM distinct from cgroup, fragmentation, concurrent-job sizing → **gotchas_universal.md U10**.
- "empty GPU" still OOMs (a zombie holds VRAM nvidia-smi can't attribute) → **gotchas_universal.md U11**.

Confirm which one before "fixing": `dmesg | grep -iE 'killed process|out of memory'` non-empty ⇒ host-RAM
kernel kill (U9), **not** a CUDA OOM. Do not shrink the model to "fix" a host-RAM kill.

---

## Fixes, in order (cheapest / least-science-disturbing first)

### M4 — The ladder: apply top-down, stop when it fits

Each rung costs more (speed, complexity, or risk to the result). Climb only as far as needed:

1. **Reduce micro-batch + grad-accumulation** (M5) — free, exact same effective batch, zero accuracy change.
2. **bf16 mixed precision** (M6) — halves activations, usually a speedup; bf16 needs no loss scaling.
3. **Activation / gradient checkpointing** (M7) — trades ~20–30% compute for a large activation cut.
4. **`PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`** (M8) — free; fixes *fragmentation* OOM only.
5. **SDPA / FlashAttention** — stop materializing the full O(seq²) attention matrix (M11).
6. **Shorter seq-len / lower resolution** (M11) — cheap but **changes the science** → verify (REQUIRED).
7. **8-bit / paged optimizer** (M12) — cuts the 8 B/param optimizer state to ~2 B with ~no accuracy loss.
8. **FSDP / DeepSpeed ZeRO-1→2→3** (M9) — shard optimizer→grads→params across GPUs (needs ≥2 GPUs).
9. **CPU / NVMe offload** (M10) — last resort on a single GPU; trades a large speed hit for fit.
10. **LoRA / QLoRA** (M13) — for *finetuning*: freeze base, train adapters; QLoRA quantizes base to 4-bit.

Rungs 1–4 and 7 do **not** alter the model/optimization math; rung 6 does (declare it, re-verify per
verifying-dl-experiments). Rungs 8–10 change *where* state lives, not the math (LoRA changes capacity).

### M5 — Reduce micro-batch + gradient accumulation (the free first move)

**Symptom**: OOM scales with batch size; effective batch must stay fixed for the result to hold.

**Fix**: drop `per_device_train_batch_size` to what fits, raise `gradient_accumulation_steps` to keep the
*effective* batch identical (`effective = micro_batch × accum × world_size`). Gradients accumulate over
sub-batches before one optimizer step — same math, lower peak activation memory. Keep micro-batch as large
as fits (batch 4 × accum 16 beats batch 1 × accum 64 — better GPU utilization).
Source: https://huggingface.co/docs/transformers/main/en/perf_train_gpu_one (gradient accumulation).
Caveat: with token-level loss + a custom loop, naive accumulation can mis-weight the loss across uneven
sub-batch token counts — a correctness issue owned by **verifying-dl-experiments** (REQUIRED).

### M6 — bf16 mixed precision (prefer bf16 over fp16 on Ampere+)

**Symptom**: fp32 training; activations dominate; the GPU is Ampere (A100/30xx) or newer.

**Fix**: `bf16=True` (HF `TrainingArguments`) or `torch.autocast("cuda", dtype=torch.bfloat16)`. The main
win is **activations stored in 16-bit**. **bf16 over fp16**: bf16 has fp32's exponent range, so it needs no
loss-scaling and won't overflow/underflow — fewer NaN failures. Note fp16 can *increase* memory at small
batch (it keeps both fp16 and fp32 weight copies); bf16 is the safer default where supported.
Source: https://huggingface.co/docs/transformers/main/en/perf_train_gpu_one (mixed precision; bf16 needs
Ampere+). NaN/divergence after switching precision = a numerics question → **verifying-dl-experiments**.

### M7 — Activation / gradient checkpointing (trade compute for activation memory)

**Symptom**: the 18 B/param fixed cost fits but **activations** OOM (deep model, long seq, big batch).

**Fix**: `gradient_checkpointing=True` (HF), `model.gradient_checkpointing_enable()`, or
`torch.utils.checkpoint.checkpoint(...)` manually. Only a subset of activations is stored; the rest are
**recomputed** during backward — cuts activation memory substantially at **~20–30% slower** training.
Source: https://huggingface.co/docs/transformers/main/en/perf_train_gpu_one ("~20% slower"). Gotcha: with
HF generate/caching set `model.config.use_cache=False` when checkpointing, or it warns and ignores; with
DDP, reentrant checkpointing can break — use `use_reentrant=False`.

### M8 — `expandable_segments:True` (the free fragmentation fix)

**Symptom**: OOM where the **failing alloc is small** yet `reserved` ≫ `allocated` and GBs look "free"
(M2); common with **variable shapes** (changing batch/seq-len, dynamic padding).

**Fix**: launch with `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` (env var, set *before* the process
starts; the modern alias is `PYTORCH_ALLOC_CONF`). It backs segments with CUDA VMM so they grow/shrink
instead of each `cudaMalloc` being an unmergeable block — which is the root of fragmentation.
Source: PyTorch CUDA notes (https://docs.pytorch.org/docs/stable/notes/cuda.html) and the allocator devlog
(https://docs.pytorch.org/devlogs/eager/2026-06-01-cuda-caching-allocator/). Alternative knob if fragmenting
on *large* blocks: `max_split_size_mb:<N>` (stops the allocator splitting blocks above N MiB). This is the
same knob referenced in **gotchas_universal.md U10** — set it as a default on the box, it is nearly free.
Version note: `expandable_segments` is still flagged experimental; it has known interop edges with some VMM
allocators (e.g. NCCL `ncclMemAlloc`, pytorch/pytorch#165419) — if a custom-allocator stack misbehaves,
drop it.

### M9 — FSDP / DeepSpeed ZeRO sharding (≥2 GPUs: shard the 18 B/param)

**Symptom**: the fixed 18 B/param state alone won't fit one card; multiple GPUs available.

**Fix — shard training state across the data-parallel group**, escalating by stage:
- **ZeRO-1 / `optim_state_dict` shard** — partition **optimizer states** (the 8 B/param). Smallest comms
  change; start here if DP OOMs on optimizer state.
- **ZeRO-2 / FSDP `SHARD_GRAD_OP`** — also partition **gradients** (the 4 B). Good memory/comms balance.
- **ZeRO-3 / FSDP `FULL_SHARD`** — also partition **parameters** (the 6 B). Maximum savings; needs
  high-bandwidth interconnect (NVLink/NVSwitch) because params are all-gathered per layer.
Source: DeepSpeed ZeRO tutorial (https://www.deepspeed.ai/tutorials/zero/) and HF DeepSpeed integration
(https://huggingface.co/docs/transformers/en/deepspeed); FSDP's `ShardingStrategy` maps 1:1 to these stages.
Multi-GPU launch + NCCL fabric gotchas (wrong NIC, timeout, MTU) → **references/multinode.md**.

### M10 — CPU / NVMe offload (single-GPU last resort)

**Symptom**: even ZeRO-3 (or single GPU) can't hold params/optimizer; willing to trade large speed for fit.

**Fix**: offload optimizer states (and with ZeRO-3, parameters) to **CPU RAM or NVMe**. DeepSpeed
`offload_optimizer: {device: cpu|nvme}` (valid ZeRO-1/2/3), `offload_param: {device: nvme}` (ZeRO-3 only);
**ZeRO-Infinity** offloads to both for huge models. QLoRA's **paged optimizers** (M12) are a lighter form —
optimizer state pages to CPU only on memory spikes. Source: DeepSpeed ZeRO docs
(https://deepspeed.readthedocs.io/en/stable/zero3.html); ZeRO-Infinity
(https://www.deepspeed.ai/2021/03/07/zero3-offload.html). Cost: PCIe/NVMe bandwidth becomes the bottleneck —
expect a multi-× slowdown; on a metered box, weigh it against renting a bigger card (principle #1, #9).

### M11 — Reduce sequence length / resolution / attention footprint

**Symptom**: activations (esp. the **O(seq²)** attention score matrix) dominate; OOM grows super-linearly
with seq-len/resolution.

**Fix (cheapest variant first)**:
- **Use SDPA / FlashAttention** to avoid materializing the full seq² attention matrix —
  `attn_implementation="sdpa"` (default in PyTorch 2.1.1+) or `"flash_attention_2"`. No accuracy change.
- Only then **shorten seq-len / lower image resolution / patchify** — this **changes the task/science**;
  declare it and re-verify (the resolution-change-broke-training failure mode is owned by
  **verifying-dl-experiments**, REQUIRED).
Source: https://huggingface.co/docs/transformers/main/en/perf_train_gpu_one (SDPA, attention backends) and
model-memory-anatomy (attention score matrix grows with seq²).

### M12 — 8-bit & paged optimizers (cut the 8 B/param optimizer state to ~2 B)

**Symptom**: optimizer states are the largest single bucket (M1); want the cut with ~no accuracy loss.

**Fix**: swap AdamW for a **quantized** optimizer — HF `optim="adamw_bnb_8bit"` / `"paged_adamw_8bit"`
(bitsandbytes 8-bit Adam, states held in 8-bit, dequantized per step → ~2 B/param vs 8 B), or
`optim="adafactor"` (stores row/column moments instead of per-element → much less memory, **slower
convergence**). **Paged** variants additionally page optimizer state to CPU on spikes to survive transient
peaks. Source: https://huggingface.co/docs/transformers/main/en/perf_train_gpu_one (optimizers) and
model-memory-anatomy ("quantized Adam → 2 bytes/param"). Adafactor's convergence change is a science
question → **verifying-dl-experiments** (REQUIRED) before trusting its ablation deltas.

### M13 — LoRA / QLoRA (finetuning only: don't train the full model)

**Symptom**: *finetuning* a large pretrained model; full-finetune state won't fit.

**Fix**: **LoRA** freezes the base weights and trains small low-rank adapters → grads+optimizer exist only
for the adapter (a tiny fraction of params), so the 18 B/param cost nearly vanishes for the base.
**QLoRA** goes further: quantize the **frozen base to 4-bit NF4** (+ double quantization + paged
optimizers), train fp16/bf16 adapters on top — reported to finetune a **65B model on a single 48 GB GPU**
with no accuracy degradation vs 16-bit. Source: QLoRA paper
(https://arxiv.org/abs/2305.14314) and repo (https://github.com/artidoro/qlora). Note: LoRA *changes model
capacity* — it is a different optimization target, not a free OOM trick. Whether the LoRA result matches
full-finetune is a science claim → **verifying-dl-experiments** (REQUIRED).

---

## OOM at a SPECIFIC step (the step number is the diagnosis)

### M14 — OOM on the **first backward** (not the forward)

**Symptom**: forward pass completes, OOM hits at `.backward()`.

**Root cause**: forward only allocates activations; **backward** additionally allocates the full
**gradient** buffers (4 B/param) and needs every cached activation live simultaneously — peak memory is at
backward, not forward. A model that forwards fine still OOMs here.

**Fix**: M7 (checkpointing — recompute instead of store activations) is the targeted fix; then M5/M6. If the
peak is a single huge layer, gradient-checkpoint *that block* specifically.

### M15 — OOM only during **validation / eval**, training was fine

**Symptom**: training epochs run; the first eval pass OOMs — even with `torch.no_grad()` / `model.eval()`,
sometimes even at eval batch size 1.

**Root cause — two distinct ones**:
1. **Eval batch > train batch**, or no-grad eval lets a *larger* batch be attempted that exceeds the train
   peak. The activation graph isn't kept, but a big single forward + its temporary buffers can still OOM.
2. **HF Trainer accumulates predictions on the GPU**: by default eval logits/labels are concatenated **on
   the GPU** for the whole eval set before moving to CPU — a large eval set OOMs regardless of batch size
   (huggingface/transformers#7232).

**Fix**: set `per_device_eval_batch_size` explicitly (don't inherit a too-large value); set
**`eval_accumulation_steps=N`** so predictions move to CPU every N steps instead of piling on the GPU
(https://huggingface.co/docs/transformers/main_classes/trainer). In a custom loop: wrap eval in
`torch.no_grad()` / `torch.inference_mode()`, and `.cpu()` / `.detach()` outputs before appending to any
list. Eval-artifact *sizing* (per-sample dumps blowing up) is owned by **verifying-dl-experiments**.

### M16 — OOM mid-epoch on the **longest batch** (variable-length / bucketed data)

**Symptom**: thousands of steps succeed, then a random step OOMs; restarting from there OOMs again at the
same data; fixed batches never OOM.

**Root cause**: with variable-length inputs (NLP token batches, point clouds, variable-resolution images),
peak activation memory is set by the **longest sequence in the batch**, not the average. Memory is sized for
the worst case, which only appears on certain batches.

**Fix**: size everything for the **max** length, not the mean: cap `max_length` / use **length bucketing or
sorted batching** so long samples share small batches; set `group_by_length=True` (HF) and a hard
`max_length`. A `expandable_segments:True` (M8) also helps because the variable shapes otherwise fragment.
Don't conclude "data corruption" from a step-N OOM — it's the longest batch.

### M17 — OOM on **step 2** (after the first optimizer step), step 1 fine

**Symptom**: step 1 trains; OOM on step 2 or at the first `optimizer.step()`.

**Root cause**: Adam **lazily allocates** its m/v state (the 8 B/param) on the *first* `optimizer.step()`,
not at construction. Peak therefore jumps after step 1. Reserved memory also climbs as the allocator caches
backward buffers. Source: the memory-snapshot timeline shows optimizer state appearing after iter 1
(https://pytorch.org/blog/understanding-gpu-memory-1/).

**Fix**: budget for the **post-step** peak, not step-1 — measure peak with `max_memory_allocated()` *after*
two full steps, not one. Then apply M12 (8-bit optimizer halves this jump) or M5.

---

## Debugging tools (measure, don't guess)

### M18 — `torch.cuda.memory_summary()` + the stat functions (first look)

**Symptom**: need to know *what* is resident before choosing a fix.

**Fix**: print `torch.cuda.memory_summary()` at the OOM point (or in an `except torch.cuda.OutOfMemoryError`)
for a table of allocated/reserved/active by size class. Programmatic: `torch.cuda.memory_allocated()` (live
tensors) vs `torch.cuda.memory_reserved()` (allocator total) — a big gap = fragmentation/caching (→ M8);
`torch.cuda.max_memory_allocated()` for the true peak (reset with `reset_peak_memory_stats()` between phases
to isolate forward vs backward vs optimizer). Source:
https://docs.pytorch.org/docs/stable/notes/cuda.html (memory management functions).

### M19 — The CUDA memory snapshot + visualizer (find the exact culprit allocation)

**Symptom**: summary stats aren't enough — need *which line of code* allocated the memory that OOMs.

**Fix — record a snapshot around the OOM and view the timeline**:
```python
torch.cuda.memory._record_memory_history(max_entries=100000)   # start before the step(s)
try:
    train_a_few_steps()
finally:
    torch.cuda.memory._dump_snapshot("oom_snapshot.pickle")     # write history
    torch.cuda.memory._record_memory_history(enabled=None)      # stop
```
Drag `oom_snapshot.pickle` onto **https://pytorch.org/memory_viz** (snapshots are not uploaded server-side),
or `python torch/cuda/_memory_viz.py trace_plot oom_snapshot.pickle -o snapshot.html`. The timeline colors
**parameters / gradients / optimizer state / activations / temporaries** separately, so the tallest band at
the OOM moment names the bucket to attack (→ map back to M5–M13). Available PyTorch **2.1+**. Source:
https://pytorch.org/blog/understanding-gpu-memory-1/. On a remote box: dump the pickle, `scp` it down
(references/ssh_transport.md), view locally — don't try to run the visualizer over ssh.

### M20 — `empty_cache()` and the "memory leak" myths

**Symptom**: belief that `torch.cuda.empty_cache()` "frees memory and fixes OOM," or that steadily-rising
reserved memory is a leak.

**Root cause / myth-busting**:
- `torch.cuda.empty_cache()` returns cached-but-unused blocks **to the driver**; it does **not** free live
  tensors and does **not** make more room for *your own* process (the allocator would reuse that cache
  anyway). It only helps a *second* process on the same GPU, or it reduces fragmentation at a ~10% speed
  cost (HF `torch_empty_cache_steps=N` runs it every N steps —
  https://huggingface.co/docs/transformers/main/en/perf_train_gpu_one). It is **not** a fix for a model that
  genuinely doesn't fit.
- **Rising `reserved` ≠ leak.** The caching allocator holds freed blocks for reuse; reserved climbing then
  plateauing is normal. A *true* leak is **rising `memory_allocated()`** across steps with constant batch —
  usually accumulating tensors that still require grad (appending `loss` instead of `loss.item()`, keeping
  references in a Python list). Fix the reference, not with `empty_cache()`.
- Calling `empty_cache()` every step to "stay safe" just slows training and can *increase* fragmentation.

Real OOM-mechanics leaks (accumulate-loss-tensor, no `detach`) belong here; whether a *metric* drift is a
real effect vs a bug belongs to **verifying-dl-experiments** (REQUIRED).

---

## Pointers — memory gotchas catalogued elsewhere (do NOT restate)

- **Host-RAM cgroup-OOM** (bare `Killed` / exit 137, `num_workers × big tensor`) → **gotchas_universal.md U9**.
- **VRAM-OOM vs cgroup-OOM**, concurrent-job sizing, the `expandable_segments` one-liner → **gotchas_universal.md U10**.
- **Zombie holds VRAM nvidia-smi can't see** (OOM on an "empty" GPU) → **gotchas_universal.md U11**.
- **Disk-full crashes `torch.save`** (not memory, but the other "out of space") → **gotchas_universal.md U6**.
- **Multi-GPU NCCL / fabric** for FSDP/ZeRO launches → **references/multinode.md**.
- **Is the post-fit number correct** (precision swap, seq-len change, LoRA-vs-full, accumulation loss
  weighting, determinism) → **verifying-dl-experiments** (REQUIRED — this layer makes it *fit and run*; that
  one decides if the *result is true*).
