# How it works

GLM-5.3-Flash at EXL3 3.05 bpw is 125.3 GB. Of that, 114.2 GB is routed experts: 42 MoE layers x 288 experts of
9.44 MB each. Every token picks 8 experts per layer, so 336 picks per token. A 24 GB card holds about 1,300 experts.
The question for each pick is **where the expert's bytes are, and who computes it.**

This page covers the NVMe modes (`nvme`, `nvme-exact`). The all-RAM modes (`fast`, `exact`) use the same VRAM cache
and CPU kernel ideas, with every expert pinned in RAM; see [reference.md](reference.md#how-it-works).

Code map:

| file | role |
|---|---|
| `glm53/nv2.py` | RAM tier, engine setup, prefetch predictor, CPU-lane setup, verify |
| `kernels/nv2/nv2_host.cpp` | host engine: controller thread, reader pool, CPU worker, prefill stage engine |
| `kernels/nv2/nv2_dev.cu` | device side: publish, step and copy kernels |
| `glm53/expert_cache.py` | VRAM CLOCK cache, prefill staging, elastic slots |
| `glm53/nv_tier.py` | loader that skips the expert bytes, store manifest |
| `scripts/pack_glm53_store.py` | builds and verifies the store |

## The three tiers

```text
   GPU lane                                       CPU lane
  +-------------------------------+              +---------------------------+
  | VRAM expert cache, ~1,300     |              | 22 AVX2 threads compute   |
  | hottest experts (12.4 GB)     |              | RAM experts in place      |
  +---------------^---------------+              +-------------^-------------+
                  | PCIe copy when admitted                    | reads
  +---------------+--------------------------------------------+-------------+
  | RAM tier, pinned, sized from --memory: ~4,800 experts at 55 GiB          |
  | holds only experts that are NOT in VRAM                                  |
  +---------------^----------------------------------------------------------+
                  | O_DIRECT reads, deep queue, layer-ahead prefetch
  +---------------+----------------------------------------------------------+
  | NVMe store: every expert, 117 GB, one 4K-aligned record each             |
  +--------------------------------------------------------------------------+
```

The numbers in the bullets below are from the measured host in [results.md](results.md): RTX 3090, EPYC 7443P,
8-channel DDR4, 4x 9100 PRO RAID0, 55 GiB cap.

### 1. VRAM expert cache

**What it does.** After the non-expert weights load, the free VRAM becomes one arena of 9.44 MB slots, shared by all
MoE layers. For each MoE layer call, a small kernel does four things:

1. dedups the router's picks;
2. marks the cache hits;
3. picks CLOCK victims for the misses it admits;
4. repoints exllamav3's per-expert pointer tables at the live slots.

exllamav3's own MoE kernels then run unchanged on those tables. The cache starts warm, from routing statistics in
`data/stats_own_dec.json`.

**Why it helps.** A VRAM hit costs nothing extra: no transfer and no host work.

**Measured.** About 120 of the ~318 unique picks per token hit VRAM (38-39 %). On the all-RAM path, the cache plus
direct reads of host memory took decode from 7.5-8.4 tok/s (stock exllamav3) to 12.6 tok/s (`exact`).

### 2. RAM tier, exclusive of VRAM

**What it does.** The RAM tier is a pinned arena of slots (`cudaHostRegister`, mapped). Its size comes from the
container's memory cap; see Sizing below. The GPU can read any RAM slot directly over PCIe.

The tier is **exclusive**:

- When the GPU admits an expert, its RAM copy is freed.
- When the GPU evicts an expert, the bytes go back into a fresh RAM slot.

**Why it helps.** RAM never duplicates what VRAM already holds. With 1,312 VRAM slots and 4,831 RAM slots, ~6,100
different experts are close to the GPU, about half of all 12,096. An inclusive tier would cover ~4,800.

**Measured.** Per token at C1, ~175 picks hit RAM and ~23 go to NVMe. Over the S3b2 sweep, picks were served 39 % from
VRAM, 54 % from RAM and 7 % from NVMe.

### 3. NVMe record store

**What it does.** `pack-store` writes all 12,384 routed experts into one file: the 42 MoE layers plus the MTP layer, x
288. Each record is 9,474,048 B, starts on a 4096-byte boundary, and carries its sha256 in the manifest.

- The first 9,437,184 B of a record are byte-identical to one VRAM slot, so NVMe to RAM to VRAM is one contiguous copy
  at each step.
- Reads use `O_DIRECT`, so there is no page cache and no double buffering inside the memory cap.
- Each read is split into pieces (2,304 KiB by default) and spread over a pool of reader threads (16 by default).
- On a RAID0 with a 512k chunk, one record is spread across all four drives.

**Why it helps.** Reads go straight from the drives into pinned RAM. A deep queue keeps every drive busy, and the
page cache never competes with the RAM tier for the cap.

**Measured.**

- `verify-store` re-reads the whole 117.3 GB store at 6.1-10.9 GB/s.
- While serving, the array reads 6.7-8.9 GB/s at 55 GiB and 19.9 GB/s during C1 decode at 16 GiB. The ceiling is
  about 26 GB/s.
- Capping reads at 8 GB/s with `--device-read-bps` cost 8 % of C1, 33 % of C4 and 27 % of prefill, same session.
- Mean read latency is 1.2-1.4 ms per record under load; the same read takes 0.75 ms alone.

### 4. CPU tier: compute RAM experts where they are

**What it does.** In decode, the planner sends some cold experts that are already in RAM to the CPU instead of
copying them to the GPU. A persistent pool of 22 AVX2 threads (cpus 2-23) runs exllamav3's MUL1 trellis decode and
the expert matmuls in place, from the RAM slot, with fp32 activations. The GPU masks those picks out of its own MoE
kernel, waits on a flag, and adds the CPU's partial sum. Both lanes run at the same time.

**Why it helps.** Copying a 9.4 MB expert over PCIe takes about 0.5 ms. The CPU computes 3-6 such experts per layer
while the GPU works on its own.

**Measured.**

- About 150 experts per token run on the CPU at C1, 41-45 % of all picks.
- Adding the CPU lane, with prefetch, took 55 GiB decode from 8.28 (S2a, exact) to 15.30 tok/s (S3a), same day.
- Cost: decode is not bit-exact. Paired against the exact GPU path in the same process, mean KL is 0.0047 with top-1
  agreement 0.986 (1,088 positions), or 0.0051 / 0.985 (1,825 positions).
- The lane applies exllamav3's SwiGLU clamp. Without it the KL was 0.0063.
- Prefill never uses the CPU lane and is exact. `nvme-exact` turns the lane off.

**Alternative kernel (opt-in, `GLM53_NV_CPU_KERN=1`).** `kernels/nv2/ft_n135.h` runs the same picks with:
- one thread-pool run per layer call, instead of four barrier phases;
- a 16-bit pair decode (p16);
- work units that read whole contiguous rows of the RAM slot when every expert in the call has one token. ft_core's
  128-output blocks read 768 B every 12-24 KB, and that access pattern alone is capped near 89 GB/s.

It also runs the NVMe->CPU picks in the same forward, binding each one when it lands (`GLM53_NV_CPU_MERGE`). The RAM
layout is unchanged.

Numerics:
- one token per expert: 3e-4 relative to the default kernel, the same error class against fp64;
- two or more tokens per expert: bit-identical to the default kernel.

Kernel microbench and logs: `bench/cpu_kernel/`, `results/cpu_kernel/`.

### 5. Host engine: one controller, landed flags, no per-layer host sync

**What it does.** Each decode MoE layer runs this sequence:

1. The device writes the layer's unique picks to a request ring in mapped host memory.
2. One controller thread (`kernels/nv2/nv2_host.cpp`, pinned to cpu 25) sees the request. It drains the device's
   eviction and admission logs and runs the planner. The planner gives each pick a lane: GPU hit, GPU admit from RAM,
   CPU, NVMe then GPU, or NVMe then CPU. It splits the work so the slower lane finishes as early as possible.
3. The controller issues NVMe reads into fresh RAM slots, writes the reply, and hands the CPU job to the worker pool.
4. The device waits for the reply on the device itself. Reads that are still in flight are tracked by a per-expert
   **landed** flag, which the reader thread sets only after the last byte arrives. The copy kernel waits on that flag.

**Why it helps.** The Python thread that drives the GPU never blocks on the host, so kernel launches stay queued. One
rule keeps it correct: **only the host marks an expert resident, and only after its bytes have landed.**

**Measured.**

- Publish to "seen by the host" takes 10 µs at p50. Host plan plus reply costs 1.9 ms per token (3 % of wall time).
- In the same step as the exclusive RAM tier, replacing the older host-stalled engine took exact decode from 7.26
  to 8.28 tok/s and 8k prefill from 515 to 564.
- At start, the server byte-compares 32 sampled VRAM slots and 32 RAM slots against fresh store reads
  (`GLM53_NV_VERIFY_START=1`). `/nv_verify` repeats the check on demand. Every measured run found 0 bad slots.

### 6. Layer-ahead prefetch

**What it does.** While layer *l* runs, the engine runs layer *l+1*'s router on layer *l*'s MoE input. It is one
fused routing kernel, and it predicts *l+1*'s top-8. The predicted experts that are only on NVMe are read now. The
prediction is only a residency hint and never changes what is computed. Setting: `GLM53_NV_PREFETCH=1`, the default
in `nvme`.

**Why it helps.** An NVMe miss on the critical path stalls the layer for 1.5-4.6 ms. A miss read one layer early
lands in the background instead.

**Measured** (same session, three natural-length answers each, ~9,300 tokens per arm):

- NVMe misses fall from 40.2 to 21.9 per token.
- Decode is **13 % faster with prefetch on**: 16.04 vs 14.21 tok/s.

An earlier screen ("prefetch off +27-35 %") compared arms run hours apart. It was session drift. Router-free
predictors were also tried offline: predicting from past routes recalls only 7-20 % of the NVMe-served picks, so
they are not used.

### 7. Victim ring

**What it does.** When a VRAM slot is evicted, the copy kernel first moves the victim's bytes device-to-device into a
VRAM ring: `GLM53_NV_VRING` slots, 24 in `nvme` and 32 otherwise. A host thread then drains the ring to a fresh RAM
slot using a DMA copy engine.

**Why it helps.** SM stores to host memory run at about 4 GB/s. The copy engine runs at about 25 GB/s and keeps the
write-back off the critical path.

**Measured.** 41.5 write-backs per token at S3b2, with 0 dropped for lack of a ring slot. Device-to-host traffic was
7.2 GB/s at C1, none of it on the critical path.

### Prefill

Prefill uses neither the CPU lane nor the decode path. For each layer of a forward:

- RAM-resident experts are pinned for the forward.
- NVMe-only experts are read several layers ahead into a pinned FIFO ring: `GLM53_NV_PF_RING` slots, queue depth
  `GLM53_NV_PF_QD`.
- Both are copied into VRAM staging buffers on a copy stream, overlapped with the previous layer's compute.

During prefill, cache slots are lent back for the staging buffers and activations, then re-taken (empty) for decode.
The amount is sized to the forward, up to `GLM53_EC_ELASTIC_GB` (10 GiB); the slots' experts are written back to RAM
first.

Full 8k chunks are GPU-bound, with PCIe host-to-device near its 28 GB/s limit. The model has recurrent KDA layers, so
exllamav3 prefills the last partial page as a separate small forward. That forward re-streams the non-VRAM experts
and takes a large share of a short prompt's time to first token. It is still open.

## Where the time goes now (C1, prefetch on)

These numbers come from the engine's device timestamps for every layer call, over 9,288 steady tokens.

| component | ms / token | share |
|---|---|---|
| admission copy RAM to VRAM (SM gather, ~14.5 GB/s), excluding NVMe waits | 17.8 | 28 % |
| non-MoE GPU work (attention, norms, shared expert, lm_head, sampling) | 11.2 | 18 % |
| NVMe waits (copy or CPU job waiting for a landing) | 10.1 | 16 % |
| CPU-lane overrun (GPU waits for the CPU partial) | 9.4 | 15 % |
| routed MoE kernel on the GPU | 9.0 | 14 % |
| host plan and reply, launch bubbles, bookkeeping | 4.7 | 8 % |
| **wall** | **62.3** (p50 55.5, p90 83.8) | |

In 54 % of layers the CPU lane finishes last, in 33 % the GPU lane, and in 13 % an NVMe read. Every resource is idle
35-75 % of the time:

| resource | busy |
|---|---|
| PCIe host-to-device | 25 % |
| NVMe | 34 % |
| DRAM | 35 % |
| CPU lane | 65 % duty |

The token is a chain of 42 dependent layer steps, and each step waits on its slowest lane.

Ceilings for C1 on this host, modelled from the same timeline (the model reproduces the measured run within 2 %):

| what changes | tok/s |
|---|---|
| today | ~16 |
| scheduling only: no NVMe stalls, no host waits, CPU job starts with the GPU lane | ~20 |
| every lane at its hardware floor, same bytes per token, same per-layer order | ~43 |
| DRAM traffic bound with perfect overlap (~2.7 GB through DRAM per token) | ~52 |

The hardware floors in the third row are PCIe at 25 GB/s, the CPU at 98 GB/s, VRAM at roofline, and non-MoE work at
6.4 ms. Going past ~50 tok/s at C1 needs fewer slow-tier bytes per token: more VRAM hits, or fewer bytes per cold
expert.

Full analysis: `docs/latency-glm53-c1.md` and `docs/utilization-glm53-s3b*.md` in
[moetier](https://github.com/sybil-solutions/moetier).

## Sizing: what is derived from the cap and from VRAM

Nothing is hard-coded to 55 GiB. At start the entrypoint and `glm53/nv2.py` derive every size from the container
(`docker/entrypoint.sh`, `docker/preflight.py`).

### The memory cap

- NVMe modes require a cap: `--memory`. Set `--memory-swap` to the same value. Otherwise pages swap out (zram, swap
  files) and escape the cap, and the entrypoint warns.
- Caps under `GLM53_NV_MIN_GB` (15 GiB) are refused.
- Caps under `GLM53_NV_SMALL_BELOW_GB` (24 GiB) get the small-host budget. Each value can be overridden with `-e`:

| setting | small-host value | default (24 GiB and up) |
|---|---|---|
| `-rcs` (exllamav3's host recurrent-state cache, `GLM53_RCS_GB`) | 1 GiB | exllamav3 default, 4 GiB |
| `GLM53_NV_MARGIN_GB` | 1.5 GiB | 3 GiB |
| `GLM53_NV_PF_RING` | 128 slots (1.1 GiB) | 192 slots (1.7 GiB) |
| `GLM53_NV_THREADS` x `GLM53_NV_PIECE_KB` | 48 readers x 1,024 KiB | 16 x 2,304 KiB |

At 16 GiB most decode picks come from NVMe, so a deeper reader pool helps there: 12.91 tok/s with 48 readers vs 12.57
with 16.

### The RAM tier

Unless `GLM53_NV_RAM_GB` is set, the RAM tier is sized when the engine starts, after the non-expert weights and the
CPU lane's scale copies are loaded:

```text
RAM tier slots = floor( (memory.max - memory.current - margin - prefill ring - rcs reserve - 0.3 GiB) / 9,437,184 B )
```

| cap | RAM tier | container peak |
|---|---|---|
| 55 GiB | 4,830-4,831 slots (42.5 GiB) | 49.3-51.3 GiB |
| 16 GiB, small-host budget | 955-970 slots (8.4-8.5 GiB) | 13.6-14.4 GiB |
| 58 GiB, measured | 5,172 slots (45.5 GiB) | not reported |

### The VRAM expert cache

`glm53/expert_cache.py` measures free VRAM once the model is loaded.

```text
cache slots = (free VRAM - GLM53_EC_RESERVE_GB) / 9,437,184 B, capped at GLM53_EC_MAX_SLOTS
```

The count is rounded to whole 32-slot chunks.

- **Reserve** (`GLM53_EC_RESERVE_GB`): 1.5 GB for `nvme`, 1.0 GB for `nvme-exact`.
- **The 3090.** A 1.5 GB reserve gives 1,312 slots (12.4 GB). With a desktop on the same GPU, set
  `GLM53_EC_MAX_SLOTS=1376` so later display allocations cannot run the CUDA graphs out of memory. A 1.0 GB reserve
  with batched decode hit a CUDA OOM in `graph.cu` mid-sweep.
- **Larger cards** get more slots without any change.
- **Elastic chunks.** Up to `GLM53_EC_ELASTIC_GB` (10 GiB) of the last chunks are lent to each prefill forward,
  sized to its tokens. They hold the two `GLM53_EC_STAGE_GB` (2.6 GiB) staging buffers and the activations, and are
  re-taken for decode.

Two more VRAM costs come out of the reserve after the cache is built:

- the victim ring (`GLM53_NV_VRING` x 9.44 MB, 226 MB at 24 slots);
- one 9.44 MB **bounce slot**. At load, every expert linear points at the bounce slot, so exllamav3 builds its tables
  without the 114 GB of expert bytes ever being read from the checkpoint. A proxy copies the live expert into it
  whenever exllamav3 needs a dequantised expert.

### Threads

nv2 pins its threads. When the container's CPU set contains CPUs 2-39, the measured layout is used:

| threads | CPUs |
|---|---|
| CPU lane | 2-23 |
| GPU-feeding main thread | 24 |
| controller | 25 |
| NVMe readers | 26-39 |

Otherwise `preflight.py cpus` derives a layout from the CPUs the container has:

- main thread on the first CPU;
- controller on the second;
- CPU lane on the rest;
- readers on the last 14 or fewer of those.

It logs the result as `[glm53] nv2 CPU layout, ...`. Speed with a derived layout is not measured. Variables you set
yourself are kept, and must lie inside the CPU set.

## Settings

These are the settings for the NVMe modes. Defaults are what the entrypoint sets for `GLM53_MODE=nvme`, with
`nvme-exact` in brackets where it differs. Settings for the all-RAM modes (`GLM53_CT_*`, `GLM53_K_*`) are in
[reference.md](reference.md#configuration).

| env | default | what it does |
|---|---|---|
| `GLM53_MODE` | `fast` (image default) | `fast`, `exact`, `nvme`, `nvme-exact` |
| `GLM53_NV_STORE` | `/nvx/glm53_flash_exl3_3.05bpw_experts.bin` | the packed store; its `.json` manifest sits next to it |
| `GLM53_NV_RAM_GB` | `auto` | RAM tier size; `auto` derives it from the cap (formula above) |
| `GLM53_NV_MARGIN_GB` | 3 (1.5 under 24 GiB) | RAM left free inside the cap |
| `GLM53_NV_MIN_GB` / `GLM53_NV_SMALL_BELOW_GB` | 15 / 24 | refuse below this cap / small-host budget below this cap |
| `GLM53_RCS_GB` | 1 (small-host only) | `-rcs` value applied by the small-host budget |
| `GLM53_NV_THREADS` | 16 (48 under 24 GiB) | NVMe reader threads |
| `GLM53_NV_PIECE_KB` | 2304 (1024 under 24 GiB) | read piece size |
| `GLM53_NV_PF_RING` / `GLM53_NV_PF_QD` | 192 (128 under 24 GiB) / 24 | prefill NVMe ring slots / its queue depth |
| `GLM53_NV_PREFETCH` | 1 (0) | layer-ahead NVMe prefetch in decode |
| `GLM53_NV_VRING` | 24 (32) | VRAM victim ring slots |
| `GLM53_NV_EXCL` | 1 | exclusive RAM tier (write-back of VRAM victims) |
| `GLM53_NV_CPU` | 1 (0) | AVX2 CPU lane on RAM-resident decode picks |
| `GLM53_NV_CPU_THREADS` | 0 = one per CPU in `GLM53_NV_CPU_CPUS` | CPU-lane threads |
| `GLM53_NV_CPU_KERN` | 0 | 1 = N135 CPU-lane forward (`ft_n135.h`); 0 = ft_core `moe_forward` |
| `GLM53_NV_CPU_MERGE` / `GLM53_NV_CPU_BANDMAXM` | 1 / 1 | with `KERN=1`: NVMe->CPU picks in the same forward / use full-row units up to this many tokens per expert |
| `GLM53_NV_CLAMP` | 1 | SwiGLU clamp on the CPU share (matches exllamav3) |
| `GLM53_NV_CPU_CPUS`, `GLM53_MAIN_CPUS`, `GLM53_NV_CTL_CPU`, `GLM53_NV_READER_CPUS` | 2-23, 24, 25, 26-39 (or derived) | thread pinning |
| `GLM53_NV_VERIFY_START` | 1 | byte-check sampled VRAM and RAM slots against the store at start |
| `GLM53_NV_TIMEOUT_S` | 5 | device-side wait limit before the engine reports an error and exits |
| `GLM53_EC_RESERVE_GB` | 1.5 (1.0) | VRAM left free after the expert cache |
| `GLM53_EC_MAX_SLOTS` | unset (no cap) | cap on VRAM cache slots; the README command sets 1376 |
| `GLM53_EC_ELASTIC_GB` / `GLM53_EC_STAGE_GB` / `GLM53_EC_STAGE_MIN` | 10 / 2.6 / 512 | slots lent to prefill / staging buffer size / picks per layer that switch to staged prefill |
| `GLM53_MAX_RQ_TOKENS` | 4096 (unset) | page-allocation round per job, not an output cap; lets C2/C4 decode together |
| `GLM53_PACK_THREADS` / `GLM53_PACK_SAMPLE` | 8 / 300 | `pack-store` threads / records byte-compared against the checkpoint |
| `GLM53_MODEL_DIR`, `GLM53_MODEL_DOWNLOAD`, `PORT`, `SERVED_NAME`, `GLM53_ARGS` | `/models`, 1, 30000, `glm-5.3-flash`, empty | paths, port, model id, extra server args |
