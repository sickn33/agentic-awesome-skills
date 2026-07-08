# Throughput & profiling — make training FAST, find the one bottleneck

How to tell *why* a rented GPU is underfed (GPU-bound vs data-bound vs comms-bound), then apply the
right speedup in cost order — from a free dataloader knob to `torch.compile` and fused attention. This
layer owns *making it RUN fast + locating the mechanical bottleneck*; **verifying-dl-experiments** owns
*is the resulting number correct*. Cross-link it (**REQUIRED**) wherever a speedup risks changing the
science (a kernel that alters numerics, a precision swap, dropping samples to "go faster").

> **Size the run to the box — then PIN it for any comparison.** Auto-sizing batch/`num_workers` to the
> measured GPU/VRAM/vCPU (Phase 0) to use the card well is fine for a STANDALONE job; but for an ablation
> or baseline-vs-variant comparison, **pin the same batch across all cells** — auto-maximizing per-box
> silently changes a variable and breaks comparability (**verifying-dl-experiments**, REQUIRED).

To jump: `grep -in '<keyword>' references/training/throughput-profiling.md` (e.g. `bound`, `workers`,
`compile`, `recompile`, `flash`, `sdpa`, `nsys`, `py-spy`, `channels_last`, `tf32`, `overlap`).

## Table of contents

- **Diagnose first** — T1 the 3-way split (GPU/data/comms-bound) · T2 util%-is-a-liar pointer · T3 the cheap CPU/GPU-busy triage
- **Dataloader (the #1 cause of a starved GPU)** — T4 num_workers · T5 persistent_workers · T6 pin_memory + non_blocking · T7 prefetch_factor · T8 IO-bound vs CPU-transform-bound
- **Free / near-free knobs** — T9 TF32 + matmul precision · T10 cudnn.benchmark · T11 channels_last · T12 set_to_none + disable debug APIs
- **Mixed precision for speed** — T13 bf16/fp16 throughput
- **Kernels** — T14 SDPA / FlashAttention · T15 torch.compile gains · T16 torch.compile recompilation traps
- **Memory↔speed trades** — T17 activation checkpointing speed cost · T18 batch size vs throughput
- **Profilers** — T19 torch.profiler (is-it-data-bound) · T20 nsys / Nsight Systems · T21 py-spy (live, no restart) · T22 memory-snapshot pointer
- **Multi-GPU / multi-node comms** — T23 DDP/FSDP compute-comm overlap
- **Pointers** — gotchas_universal.md U8/U21/U24/U25/U38 · oom-memory.md · distributed-launch.md · multinode.md · verifying-dl-experiments (skill)

---

## Diagnose first — do NOT tune blind

### T1 — The 3-way split: GPU-bound vs data-bound vs comms-bound (decide before touching a knob)

**Symptom**: training is "slow" and the instinct is to change the model or batch size at random.

**Root cause**: throughput is gated by exactly one of three resources at a time; the fix for each is
disjoint, so guessing wastes paid wall-clock (principle #1).

**Fix — classify with one cheap reading each** (heuristic: util consistently >90% ⇒ GPU-bound;
low/fluctuating ⇒ elsewhere; both CPU+GPU low ⇒ I/O —
https://apxml.com/courses/planning-optimizing-ai-infrastructure/chapter-5-strategies-for-performance-optimization/identifying-performance-bottlenecks):
- **GPU-bound** (the good case): util high *and* SM clock/power high (T2); adding workers doesn't help. Only
  levers left: kernels (T14–T15), precision (T13), a bigger card.
- **Data-bound**: util low-but-nonzero or sawtoothing, host CPU busy in `DataLoader`/transforms; a trace
  shows GPU-idle gaps lining up with CPU data work (T19). Go to T4–T8.
- **Comms-bound** (multi-GPU/-node only): per-GPU util high, scaling efficiency poor; time in
  `nccl:all_reduce`/`all_gather` not overlapped with compute. Go to T23.

The highest-signal instrument is a **profiler trace** (T19) — read it before changing anything.

### T2 — `nvidia-smi` GPU-Util % lies; correlate clock + power → gotchas_universal.md U21

A 100%-util tile can hide a starved GPU (a trickle of tiny kernels reads as 100%). The full diagnosis —
correlate `clocks.current.sm` + mem-bandwidth util + power via `nvidia-smi dmon -s pucvmet -d 1`, and the
thermal/power-throttle slowdown — lives in **gotchas_universal.md U21/U23**; read it before concluding a run
is GPU-bound. The *0%-util-but-running* (CPU-data-bound) inverse is **U38**, owned by verifying-dl-experiments.

### T3 — Cheap triage when no profiler is wired yet: is the host CPU busy?

**Symptom**: need a 30-second answer to "GPU or data?" before instrumenting.

**Fix**: watch GPU and CPU at once for ~10 s —
```bash
nvidia-smi dmon -s pu -d 1 -c 10          # per-second SM% + power; sawtooth/low = starved
top -b -n 1 | grep -i python | head        # a worker pegged at ~100% CPU = CPU-transform-bound
```
GPU SM% high and steady ⇒ GPU-bound (stop here, go to kernels/precision). GPU SM% sawtoothing while a
python worker is CPU-pegged ⇒ data-bound (T4–T8). Both idle ⇒ I/O-bound (stage to NVMe, U8). Then confirm
with a real trace (T19) before investing in a fix. **GPU SM% low while *many* python threads thrash a few
cores (not one worker pegged) ⇒ intra-op thread oversubscription** on a vCPU slice, not data-bound — cap
`OMP_NUM_THREADS` to your cgroup quota (gotchas_universal.md **U40**), don't add dataloader workers.

---

## Dataloader — the #1 reason a rented GPU sits idle

The partial-starve knob set (and its order) is **gotchas_universal.md U24**; this section is the per-knob
*why/when*. Each helps a *different* failure, so apply by symptom, not as a blanket cargo-cult.

### T4 — `num_workers`: 0 means the main process loads serially (the default starves the GPU)

**Symptom**: `DataLoader(num_workers=0)` (the default) — every batch is fetched on the main thread, GPU
waits the whole fetch.

**Root cause**: with `num_workers=0` "the data will be loaded in the main process" — no overlap between
data prep and compute (https://docs.pytorch.org/docs/2.12/data.html).

**Fix**: set `num_workers > 0` to load asynchronously and overlap fetch with the GPU step. Start at
`cores − 1`, but **size against per-worker RAM, not CPU count** — each worker `fork`s a full copy of any
large in-dataset object; too many OOM the cgroup with a bare `Killed` (the quadratic trap + sizing rule are
**gotchas_universal.md U9**). Not monotonic: past the point where the GPU is fed, extra workers only add RAM
and startup cost.

### T5 — `persistent_workers=True`: stop paying worker-startup every epoch

**Symptom**: a visible stall at the **start of every epoch** (especially short epochs / many epochs); GPU
idle while workers respawn.

**Root cause**: default `persistent_workers=False` shuts down all workers after the dataset is consumed
once and **re-forks them next epoch** — re-importing, re-opening files, rebuilding the dataset object each
time (https://docs.pytorch.org/docs/2.12/data.html).

**Fix**: `persistent_workers=True` keeps the worker Dataset instances alive between epochs, removing the
per-epoch respawn cost. Requires `num_workers > 0`. Biggest win when epochs are short or the dataset's
`__init__` is heavy (loads an index/manifest).

### T6 — `pin_memory=True` + `non_blocking=True`: overlap the host→device copy

**Symptom**: the H2D copy (`x.to('cuda')`) sits on the critical path between fetch and forward.

**Root cause**: a pageable-memory tensor must be staged through a pinned buffer by the driver before DMA;
a synchronous `.to(device)` blocks the step. "When using a GPU it's better to set `pin_memory=True`"
(https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html).

**Fix**: `DataLoader(pin_memory=True)` allocates batches page-locked, **then** transfer
`x = x.to(device, non_blocking=True)` so the copy runs async on a copy stream and overlaps compute. Both
halves needed — `pin_memory` alone still blocks; `non_blocking` without pinned memory silently falls back to
a blocking copy. Costs host RAM (pinned pages aren't swappable) — back off if it pressures the cgroup (U9).

### T7 — `prefetch_factor`: deepen the queue when fetch time is bursty

**Symptom**: with workers on, the GPU still periodically stalls — every *Nth* step (N = `num_workers`) has
a long idle gap because all workers were busy producing the next batch when the GPU asked
(https://docs.pytorch.org/tutorials/intermediate/tensorboard_profiler_tutorial.html).

**Root cause**: `prefetch_factor` defaults to **2** when `num_workers>0` (None when 0) — "2 means there
will be a total of `2 * num_workers` batches prefetched across all workers"
(https://docs.pytorch.org/docs/2.12/data.html). A shallow queue can't absorb a variance spike in
per-sample fetch/decode time.

**Fix**: raise `prefetch_factor` (3–4) so workers run ahead and bursts hide — at the cost of more resident
batches in RAM (re-check U9). A *smoothing* knob, not a multiplier: if the **average** fetch rate is below
the GPU's consume rate, no depth helps — fix the rate (workers T4, GPU transform T8, NVMe U8) instead.

### T8 — IO-bound vs CPU-transform-bound are different data-bound cases (different fix)

**Symptom**: data-bound (T1), but adding workers barely helps.

**Root cause — split the case**:
- **IO-bound**: bytes arrive slowly from network/HDD/object store; workers sit in `read`. Stage the working
  set to instance-local **NVMe** (HDD→NVMe gaps reach ~35×) = **gotchas_universal.md U8**; the many-tiny-files
  transaction death + **shard-into-tar / WebDataset** fix = **U25**.
- **CPU-transform-bound**: a heavy per-sample augment (resize/decode/FFT) saturates CPU; workers CPU-pegged
  (T3), capping at core count. Move the transform to the **GPU** (NVIDIA DALI, `torchvision.transforms.v2`
  on tensors, kornia) onto idle GPU cycles. The *0%-util* serialized-transform variant is **U38**, owned by
  verifying-dl-experiments **REQUIRED** (which also owns whether a GPU-side transform shifted the data
  distribution).

**Fix**: read the trace (T19) — time in `read`/`stat` ⇒ U8/U25; time in a transform fn ⇒ move to GPU.

---

## Free / near-free knobs (set these once at startup on any box)

### T9 — TF32 / `set_float32_matmul_precision("high")` — the "why is my A100 slow" footgun

The biggest free speedup on Ampere+ for any fp32 matmul path; **OFF by default since PyTorch 1.12**. The
decision and exact knobs (`torch.set_float32_matmul_precision("high")`, the legacy `allow_tf32` flags,
`--tf32 1` in HF Trainer, convergence impact) are owned by **references/training/precision-stability.md P2**
(cross-link there; do NOT restate). If a fresh PyTorch 2.x rental's fp32-heavy run is 2–4× slow with no bug,
this is the first suspect.

### T10 — `cudnn.benchmark=True`: autotune conv algorithms (fixed input shapes only)

**Symptom**: a conv-heavy net (CNN/UNet) is slower than it should be; input shapes are constant.

**Root cause**: by default cuDNN picks a generic conv algorithm; the autotuner benchmarks variants on the
first batch of each new shape and caches the fastest
(https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html).

**Fix**: `torch.backends.cudnn.benchmark = True` once at startup. **Only helps when input shapes are
stable** — with variable shapes (dynamic resolution, ragged batches) it re-benchmarks every new shape and
*loses* time. Trade-off: it is **nondeterministic** (picks by first-batch timing), so it fights the
determinism knobs — whether to enable it for a clean datapoint is owned by precision-stability P19 /
verifying-dl-experiments (U36, **REQUIRED**).

### T11 — `channels_last`: free Tensor-Core speedup for conv nets under AMP

**Symptom**: a CNN under mixed precision isn't hitting Tensor Cores; throughput below the card's potential.

**Root cause**: default NCHW contiguous layout forces layout transposes around Tensor-Core convolutions.

**Fix**: convert model and inputs to `memory_format=torch.channels_last` —
`model = model.to(memory_format=torch.channels_last)` and `x = x.to(memory_format=torch.channels_last)`.
Optimizes convolutional networks with Tensor Cores + AMP
(https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html). Marked experimental and CNN-specific
(no benefit for pure transformers). No numerics change — purely a layout speedup.

### T12 — `set_to_none` + disable debug APIs (two free per-step taxes to remove)

- **`optimizer.zero_grad(set_to_none=True)`** (the **default** since PyTorch 2.0) over zero-filling —
  assigning `None` skips a memory-write kernel per param and lets the next backward write fresh
  (https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html). Edge case: code reading `.grad`
  between steps must tolerate `None`.
- **Turn OFF debug APIs for the real run** — `torch.autograd.set_detect_anomaly(True)`,
  `torch.autograd.profiler.profile`, `gradcheck` add per-op bookkeeping (anomaly detection is ~10× slower,
  precision-stability P9). Grep `detect_anomaly` / leftover `with profile(` wrappers before a long launch
  (https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html); easy to leave on after a NaN hunt.

---

## Mixed precision for speed

### T13 — bf16/fp16 is a throughput lever, not just a memory lever

**Symptom**: fp32 training under-uses Tensor Cores; the GPU has bf16/fp16 tensor cores.

**Root cause**: 16-bit matmuls run on Tensor Cores at much higher FLOP/s and halve activation
read/write bandwidth — a speedup *on top of* the memory saving (oom-memory.md M6).

**Fix**: `torch.autocast("cuda", dtype=torch.bfloat16)` on Ampere+ (the modern default; no GradScaler —
precision-stability P6) or `bf16=True` in HF `TrainingArguments`. The full precision decision (bf16 vs fp16
vs the V100/T4 fp16-only path, GradScaler mechanics, NaN/overflow) is owned by
**references/training/precision-stability.md P1–P10** (cross-link; do NOT restate). The *memory* angle and
the activation-bucket math is **oom-memory.md M6**. A NaN/divergence after the swap is a numerics question →
precision-stability / verifying-dl-experiments (**REQUIRED**).

---

## Kernels — the levers left once the GPU is fed

### T14 — SDPA / FlashAttention: stop materializing the O(seq²) attention matrix

**Symptom**: a transformer is attention-bound; long sequences are slow and memory-heavy; or `flash_attn`
"installed" but the run is no faster.

**Root cause**: the eager/`math` attention path materializes the full `seq×seq` score matrix. The fused
**FlashAttention** / **memory-efficient** backends never do, but PyTorch's `scaled_dot_product_attention`
**silently falls back to the slow `math` backend** when the fused kernel's input constraints aren't met
(wrong dtype, head dim, mask shape) — "if a fused implementation is not available, a warning will be
raised" (https://docs.pytorch.org/docs/2.12/generated/torch.nn.functional.scaled_dot_product_attention.html).

**Fix**:
- Use `F.scaled_dot_product_attention(q,k,v)` (or `attn_implementation="sdpa"`, the HF default on 2.1.1+),
  which auto-picks FlashAttention / memory-efficient / cuDNN / math. Feed it **fp16/bf16** inputs — the
  fused backends need 16-bit (the `math` fallback is what runs in fp32).
- **Force-verify** the fast backend instead of trusting silence:
  ```python
  from torch.nn.attention import sdpa_kernel, SDPBackend
  with sdpa_kernel(backends=[SDPBackend.FLASH_ATTENTION]):   # errors loudly if it can't be used
      out = F.scaled_dot_product_attention(q, k, v, is_causal=True)
  ```
- **Installing `flash_attn` from source is a trap**: without `ninja` (`pip install ninja`) the CUDA
  extension compiles single-threaded ~2 h; with ninja ~3–5 min on a 64-core box. With many cores but
  `<96 GB` RAM ninja over-parallelizes and OOMs the build — cap `MAX_JOBS=4 pip install flash-attn
  --no-build-isolation`. Prefer a **prebuilt wheel** matching the `cuXX/torchYY/cpZZ` triple
  (https://github.com/Dao-AILab/flash-attention/issues/1038, https://pypi.org/project/flash-attn/). A
  torch/CUDA mismatch is **gotchas_universal.md U28**. Whether the fused kernel changes outputs (causal-mask
  edge cases) is a numerics check → verifying-dl-experiments (**REQUIRED**).

### T15 — `torch.compile`: fuse kernels + cut launch overhead (one line, real gains)

**Symptom**: many small pointwise/elementwise ops; Python/launch overhead dominates between big matmuls.

**Root cause**: eager launches each op separately; Inductor fuses adjacent ops into Triton kernels and
(in CUDA-graph modes) eliminates per-step launch overhead, reusing the execution plan across steps.

**Fix**: wrap the model — `model = torch.compile(model)`. Modes
(https://huggingface.co/docs/transformers/en/perf_torch_compile):
- `default` — balanced speed/memory.
- `mode="reduce-overhead"` — uses **CUDA graphs** to kill Python overhead (best for many tiny ops /
  small-batch / inference), at a little more memory.
- `mode="max-autotune"` — longest compile, fastest steady-state.
- HF `TrainingArguments(torch_compile=True, torch_compile_mode="reduce-overhead")`.

Reported ~2.2× mean-inference speedups; training gains real but model-dependent. **First step(s) are slow**
— compilation is lazy on first call (https://huggingface.co/docs/transformers/en/perf_torch_compile); exclude
warm-up from any throughput measurement. Set `fullgraph=True` while developing to surface graph breaks loudly
instead of silently losing speed. Whether the compiled *numbers* match eager → verifying-dl-experiments
(**REQUIRED**).

### T16 — `torch.compile` recompilation trap: variable shapes silently blow the cache → eager

**Symptom**: a compiled run is *slower* than eager, or stutters periodically; throughput never stabilizes.
Common with variable batch/seq-len, dynamic padding, or per-step changing shapes.

**Root cause**: compile creates **guards** on traced shapes; a new shape violates a guard and triggers a
**recompile**. Past the recompile cap (`torch._dynamo.config.recompile_limit`, default **8**; legacy
`cache_size_limit`) Dynamo **stops compiling that function and runs it eagerly** — paying all the compile
cost and getting none of the benefit
(https://docs.pytorch.org/docs/stable/compile/programming_model.recompilation.html,
https://github.com/pytorch/pytorch/issues/93457).

**Fix**:
- **See it**: `TORCH_LOGS=recompiles python train.py` logs which function recompiled and the failed guard;
  `TORCH_LOGS=graph_breaks` and `torch._dynamo.explain(...)` locate graph breaks
  (https://docs.pytorch.org/docs/stable/torch.compiler_troubleshooting.html).
- **Tame shapes**: pad/bucket to a few fixed shapes so guards stop firing; or mark the varying dim dynamic
  — `torch.compile(model, dynamic=True)` (or `mark_dynamic` / `TORCH_COMPILE_DYNAMIC_SOURCES`) compiles
  one shape-generic graph instead of one per size. `dynamic=False` forces a fresh recompile per distinct
  size (use only with truly few shapes)
  (https://docs.pytorch.org/docs/stable/compile/programming_model.html).
- **Last resort**: raise `torch._dynamo.config.recompile_limit` only if a handful of *stable* extra shapes
  legitimately exist — raising it to mask genuinely unbounded shapes just thrashes.

---

## Memory ↔ speed trades

### T17 — Activation checkpointing buys memory by spending ~20–30% compute (know the cost)

**Symptom**: gradient/activation checkpointing is on "to be safe" and training is slow — but the model
actually fits without it.

**Fix**: checkpointing **recomputes** activations in backward instead of storing them — trading **~20–30%
extra compute** for a large memory cut (https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html,
oom-memory.md M7). Enable it **only when activations actually OOM** (full rationale + `use_reentrant=False` /
`use_cache=False` gotchas = **oom-memory.md M7**); if it fits without, turning it off is a free ~25% speedup.
On the frontier, checkpoint only the *fewest/heaviest* blocks needed to fit, not the whole model.

### T18 — Bigger micro-batch ≈ better GPU utilization (up to the memory wall)

**Symptom**: tiny batches under-feed the GPU; util and throughput both low though VRAM is mostly free (small
batches under-fill Tensor Cores and amortize launch/sync overhead poorly).

**Fix**: raise micro-batch toward the VRAM limit; keep the **effective** batch fixed with grad-accum if the
result depends on it (`batch 4 × accum 16` beats `batch 1 × accum 64` — oom-memory.md M5). Accuracy/effective-
batch implications (LR scaling, accumulation loss-weighting) → verifying-dl-experiments (**REQUIRED**).
Sizing alongside a concurrent job + `expandable_segments` = **gotchas_universal.md U10** / oom-memory.md M8.

---

## Profilers — measure the bottleneck, don't guess it

### T19 — `torch.profiler`: the definitive data-bound vs compute-bound verdict

**Symptom**: need to *prove* where time goes (which T1 case), not infer from util%.

**Fix — scheduled profile of a few steps**
(https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html):
```python
from torch.profiler import profile, schedule, ProfilerActivity, tensorboard_trace_handler
with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    schedule=schedule(wait=1, warmup=1, active=3),     # skip warm-up; record 3 steps
    on_trace_ready=tensorboard_trace_handler("./tb_trace"),
    record_shapes=True, with_stack=True,
) as prof:
    for step, batch in enumerate(loader):
        train_step(batch); prof.step()
        if step >= 6: break
print(prof.key_averages().table(sort_by="self_cuda_time_total", row_limit=15))
```
**Read it**: large **GPU-timeline gaps** with CPU busy in `DataLoader`/transforms during the gap ⇒
**data-bound** (T4–T8); the TensorBoard "Performance Recommendation" panel names the DataLoader directly
(https://docs.pytorch.org/tutorials/intermediate/tensorboard_profiler_tutorial.html). Densely-packed GPU
timeline ⇒ GPU-bound; sort by `self_cuda_time_total` for the hottest kernel (T14/T15). Time in `nccl:*` not
overlapped ⇒ comms-bound (T23). On a remote box write the trace and view locally — for raw
`export_chrome_trace("trace.json")` open at `chrome://tracing`; `scp` it down (references/ssh_transport.md),
never run a viewer over ssh.

### T20 — `nsys` / Nsight Systems: system-wide timeline when the gap is below PyTorch's view

**Symptom**: torch.profiler shows GPU-idle gaps but not *why* (CPU launch latency, a hidden sync, a memcpy,
a kernel-launch storm); or want CUDA-API + NVTX + OS-runtime on one timeline.

**Root cause**: torch.profiler sees PyTorch ops; `nsys` traces the whole system — CUDA API, kernels,
memcpy, NVTX ranges, OS-runtime — so it exposes launch-bound stalls and CPU↔GPU sync that PyTorch can't.
"Periodic gaps in the CUDA HW row are moments when the GPU is idle — a red flag"
(https://docs.lxp.lu/howto/pytorch-profiling-with-nsight/).

**Fix — profile a bounded window on the box, view locally** (canonical PyTorch recipe,
https://gist.github.com/mcarilli/376821aa1a7182dfcf59928a7cde3223):
```bash
nsys profile -w true -t cuda,nvtx,osrt,cudnn,cublas -s cpu \
  --capture-range=cudaProfilerApi -x true -o report python train.py
```
In the script, bound the window so the `.nsys-rep` stays small:
```python
torch.cuda.profiler.cudart().cudaProfilerStart()   # after warm-up
# ... a handful of steps, optionally wrapped in torch.cuda.nvtx.range_push/pop ...
torch.cuda.profiler.cudart().cudaProfilerStop()
```
`scp` the `.nsys-rep` down, open in the Nsight Systems GUI. Nsight **Systems** finds *which* kernel is slow;
Nsight **Compute** (`ncu`) finds *why* (occupancy, bandwidth, warp stalls) — but `ncu` is heavy, reserve it
for one hot kernel (https://www.spheron.network/blog/gpu-profiling-ai-workloads-nsight-compute-pytorch-profiler-guide/).

### T21 — `py-spy`: profile a LIVE training process with no restart, no code change

**Symptom**: a long run is mysteriously slow or apparently hung; restarting it to add a profiler would cost
hours and might not reproduce.

**Root cause**: a Python-side bottleneck or deadlock (a slow transform, a lock, a blocking collective) that
needs inspection *in situ*.

**Fix — attach by PID, zero instrumentation** (https://github.com/benfred/py-spy):
```bash
py-spy dump --pid <PID>            # one-shot stack of every thread → where it's hung RIGHT NOW
py-spy top  --pid <PID>            # live "which functions burn time" (Unix top-style)
py-spy record -o prof.svg --pid <PID>   # flame graph over a window
```
"The profiled program needs no import, no decorator, and no restart." On a rented box mid-run, `py-spy dump`
instantly distinguishes a *hung* process (stuck in `recv`/lock/`all_reduce`) from a *slow* one (busy in a
transform) — pairs with the "is it actually hung?" check (gotchas_universal.md U17, verifying-dl-experiments
**REQUIRED**). May need `--native` for C-extension frames and `sudo`/`SYS_PTRACE` to attach.

### T22 — CUDA memory snapshot/visualizer → oom-memory.md M19

For *what allocated the memory* (not time), the `torch.cuda.memory._record_memory_history` snapshot +
https://pytorch.org/memory_viz timeline is owned by **references/training/oom-memory.md M19/M18**. It is a
memory tool, not a throughput tool — listed here only so the profiler menu is complete. Do NOT restate.

---

## Multi-GPU / multi-node communication

### T23 — Compute-comms overlap: DDP overlaps by default; tune the bucket, watch for breakers

**Symptom**: scaling efficiency is poor — per-GPU util high, but N GPUs deliver far less than N× throughput;
trace shows `all_reduce`/`all_gather` *not* overlapped with backward compute.

**Root cause**: DDP overlaps gradient all-reduce with backward by bucketing gradients and launching each
bucket's reduce on a separate CUDA stream as soon as it's ready
(https://github.com/pytorch/pytorch/issues/67570). Overlap *breaks* when something forces a sync: an
unused-parameter recompute, an off-by-default `find_unused_parameters=True`, a `.item()`/print/`.cpu()` in
the step, or too-small/too-large buckets.

**Fix (single box, DDP/FSDP — the launch/sharding mechanics live in
references/training/distributed-launch.md, REQUIRED)**:
- Tune `bucket_cap_mb` (DDP) to batch gradient chunks into fewer, larger all-reduces; set
  `gradient_as_bucket_view=True` to cut a copy. Buckets too small = launch overhead; too large = late
  overlap.
- FSDP: enable `backward_prefetch` (prefetch the next layer's all-gather during current backward) and
  `forward_prefetch` so comms hide under compute; `limit_all_gathers` if memory-pressured.
- Remove per-step host syncs (`loss.item()` every step, prints, eager `.cpu()`) that serialize the stream.

**Inter-node** transport (NCCL picking the wrong NIC, fabric-manager hang, 1800 s timeout masking a
straggler, MTU mismatch) is **references/multinode.md** (**REQUIRED** for ≥2 instances) — a comms "slowdown"
across boxes is usually one of those, not a bucket-size tune. Whether a world-size change silently rescaled
the effective batch/LR is a science question → verifying-dl-experiments (**REQUIRED**).

---

## Pointers — throughput gotchas catalogued elsewhere (do NOT restate)

- **gotchas_universal.md** — **U8** stage hot data to local NVMe (IO-bound) · **U21** `nvidia-smi` util% is
  a liar (+ **U23** thermal/power throttle) · **U24** dataloader-starvation knob order · **U25** millions of
  small files → shard into tar/WebDataset · **U38** GPU 0%-util CPU-data-bound (owned by verifying-dl).
- **references/training/oom-memory.md** — M5 micro-batch/grad-accum · M6 bf16 activations · M7 activation
  checkpointing memory rationale · M8 `expandable_segments` · M19 memory snapshot/visualizer.
- **references/training/precision-stability.md** — P1–P10 the precision decision + AMP mechanics · P2 the
  TF32-off footgun · P19 determinism-vs-`cudnn.benchmark` speed trade.
- **references/training/distributed-launch.md** — torchrun/Accelerate/DeepSpeed launch, DDP/FSDP sharding,
  and the desync/hang toolkit (the launch substrate this file's T23 sits on).
- **references/multinode.md** — inter-node NCCL/NIC/fabric/timeout/MTU (the wire between boxes). Single-box
  users skip.
- **verifying-dl-experiments** (**REQUIRED**) — owns *is-the-number-real*: whether a kernel/precision/compile
  swap changed the result, whether dropping samples or a GPU-side transform shifted the distribution, the
  0%-util diagnosis (U38), determinism (U36). This file makes training *fast*; that skill decides if the
  *faster result is still true*.
