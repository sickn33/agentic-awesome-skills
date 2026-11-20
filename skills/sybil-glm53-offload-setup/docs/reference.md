# glm-flash-lite: full reference

The complete previous README: every campaign table, quality check, image smoke, configuration variable and
reproduction pin. The short start-here page is the [README](../README.md); current tables are in
[results.md](results.md), mechanisms and every NVMe-mode setting in [how-it-works.md](how-it-works.md). Since this page
was written, the NVMe-mode image moved to `ghcr.io/sybil-solutions/glm53-flash-offload@sha256:4732a063...` (v4.2-nvme,
repo `3bdb502`; before it `99b8926e`, repo `7f1ee89`, local-ai-registry lab acceptance PR #187); the commands below
keep the digests they were measured with.

Serve **GLM-5.3-Flash** (EXL3 3.05 bpw, 125.3 GB, 288 routed experts x 42 MoE layers) from **one 24 GB RTX 3090**
plus host DDR4, with an OpenAI-compatible API. All routed experts live in pinned host RAM; the GPU keeps an elastic
cache of hot experts, reads the rest over PCIe (zero-copy), and an AVX2 CPU kernel computes the coldest cache misses
during decode on the host cores.

It is a thin layer of monkeypatches over **stock exllamav3 1.5.1** (no exllamav3 source edits) plus a few small
custom kernels. This is the exact code and configuration of run G067 of the FreeToken-EXL3 campaign.

Four modes, one switch (`GLM53_MODE`):

| mode | what runs | quality vs stock exllamav3 | host RAM |
|---|---|---|---|
| `fast` (default) | GPU expert cache + zero-copy misses + **AVX2 CPU tier** for cold decode misses, batched decode (`-ambs 4`), fused decode kernels | prefill exact; decode **not exact** (see Quality) | ~218 GiB (234 GB) |
| `exact` (`-e GLM53_MODE=exact`) | GPU expert cache + zero-copy misses, nothing else | bit-exact (panel top-1 1.0000, KL 0) | ~111 GiB (119 GB) |
| `nvme` (`-e GLM53_MODE=nvme`) | routed experts from a packed **NVMe store** through a RAM tier sized to the container cap + GPU cache + AVX2 CPU lane, batched decode | prefill exact; decode **not exact** (KL 0.0047) | **55 GiB cap** + 117 GB NVMe store |
| `nvme-exact` | the NVMe tier without the CPU lane | bit-exact | 55 GiB cap + 117 GB NVMe store |

The big-RAM modes (`fast`, G067, the default) are measured below; the NVMe modes (14.85-16.27 tok/s decode in 55 GiB,
image digest `82eef823`) are in [55 GB NVMe mode](#55-gb-nvme-mode).

## Measured

Host: AMD EPYC 7443P (24 cores, SMT on), 8-channel DDR4 (503 GiB), 1x RTX 3090 24 GB on PCIe 4.0 x16, driver
610.57, Samsung 990 PRO NVMe. Stack: lmsysorg/sglang v0.5.20 (CUDA 13.0) + exllamav3 v1.5.1 built for sm_86.
Protocol (campaign `sweep.py --template glm --prefill 8192 32768 --conc 1 2 4 --reps 3 --dec-reps 2`): prefill =
median of 3 fresh random-token prompts, tokens / time-to-first-token; decode = greedy chat completions run to their
natural end, C simultaneous streams, aggregate = all completion tokens / wall time, median of 2 rounds.

**`fast` mode (G067)**: `-cs 131072 --max-batch-size 8 -chunk_size 8192 -ambs 4`; expert cache reserve 1.5 GB,
prefill staging 2 x 2.6 GB, elastic 10 GB; CPU tier on 22 threads (cpus 2-23); `GLM53_K_HCFUSE=1 GLM53_K_FTSPLIT=1
GLM53_K_OVL=1`.

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 710 tok/s | 28.15 tok/s | 1 | 131,072 tokens | 1 |
| 32,768 | 951 tok/s | 26.89 tok/s (C1 at 32k context) | 1 | 131,072 tokens | 1 |
| - | - | 31.57 tok/s aggregate (15.78 per stream) | 2 | 131,072 tokens | 1 |
| - | - | 33.98 tok/s aggregate (8.62 per stream) | 4 | 131,072 tokens | 1 |

Raw sweep / panel JSONs for every table: [`results/`](../results/). Earlier steps of the same configuration: C056 (staging 2.0 GB, no fused kernels) prefill 626 / 808, decode C1 27.20 /
C2 30.72 / C4 34.72 aggregate, C1 at 32k 26.15; C052c (C056 without `-ambs 4`, streams then decode one after
another) C1 27.32 / C2 27.06 / C4 27.45.

**`exact` mode (G066a)**: `-cs 131072 --max-batch-size 8 -chunk_size 8192`; reserve 1.0 GB, staging 2 x 2.6 GB,
elastic 10 GB; no CPU tier, no fused kernels.

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 697 tok/s | 12.57 tok/s | 1 | 131,072 tokens | 1 |
| 32,768 | 945 tok/s | 11.86 tok/s (C1 at 32k context) | 1 | 131,072 tokens | 1 |
| - | - | 12.62 tok/s aggregate | 2 | 131,072 tokens | 1 |
| - | - | 12.64 tok/s aggregate | 4 | 131,072 tokens | 1 |

For reference, stock exllamav3 with the experts it cannot fit in VRAM on its CPU worker decodes this model at
7.5-8.4 tok/s on the same box.

Published image smoke test (the README command on the measured host): see [Image smoke](#image-smoke).

## Quality

Reference: a teacher-forced panel (8 prompts, 2,154 scored positions) from stock exllamav3 1.5.1 on the same
checkpoint; metric = top-1 agreement and mean KL over the reference top-20.

- **Prefill / teacher-forced path, both modes: top-1 1.0000, KL 0** (G067, C056, G066a). The expert cache, zero-copy
  reads and prefill staging only change *where* the bytes are read from; the arithmetic is exllamav3's own kernels.
  The CPU tier and the side-stream shared expert are only active for decode batches (<= 4 / <= 8 tokens), so the
  panel does not exercise them.
- **Decode in `fast` mode is not exact.** Paired check (C052e, same process, same token sequence, CPU tier off vs
  on, 6 prompts, 1,288 decode positions): **mean KL 0.0053 (p99 0.086), top-1 agreement 0.977** vs the exact
  GPU-only path (an earlier paired run, C052d: top-1 0.9837). The CPU kernel itself measures ~1e-3 relative RMS error
  per expert vs an fp64 reference (startup self-test: EXACT 9.9e-4, AFFINE 1.05e-3, I16 1.05e-3), the same class as
  exllamav3's own fused GPU MoE kernel (1.1e-3), which alone would predict a much smaller KL; a decode-path bug
  (handoff / masking / combine) is suspected and being diagnosed. `GLM53_K_OVL=1` (shared expert on a side stream)
  is also not bitwise (~2e-3 relative per layer output, the same as exllamav3's non-fused shared-expert path).
  `GLM53_K_HCFUSE` and `GLM53_K_FTSPLIT` are bit-identical to the kernels they replace. A fixed CPU tier ships as a
  new image digest; until then use `GLM53_MODE=exact` when outputs must match exllamav3.
- The Triton autotune picks of the KDA (linear attention) prefill kernels change rounding: a different pick set
  measured top-1 0.989 / KL 0.0034 on the same panel. The image pins the reference pick set
  (`data/triton_pin_exact.json`, `glm53/triton_pin.py`): a fresh container with an empty Triton cache compiles those
  configs and never benchmarks, and stays exact.

## Known issues

- `fast` mode decode is not exact (CPU tier, see Quality); fix in progress, will ship as a new digest.
- **Streaming in digest `sha256:1159044a…` is delivered at half speed** (fixed in repo `fe97bcf`, shipped and verified in digest `sha256:bb633b0b…`, run P002b below). The
  server generates at the full rate (~29 tok/s), but every streaming endpoint (`/v1/chat/completions`,
  `/v1/completions`, `/generate` with `stream: true`) awaited the client-disconnect check after each event, which let
  the generator run a whole decode step before the next event went out: clients received ~14.4 tok/s and the backlog
  arrived in one burst when the answer finished. Non-streaming responses and every number in this README (sweep
  aggregate and per-stream rates use first/last token times and the server's token counts) are unaffected. Earlier
  versions of this list blamed the elastic cache for the "slow first 30 s after a long prompt"; that was this defect.
  Fix: the disconnect flag is polled by a side task (`GLM53_DISCONNECT_CHECK_S`, default 0.1 s); measured on the
  campaign server with the same change (G072): delivered tok/s per 10-s bin 28.3-29.3 from the first bin after 512 /
  32k / 64k-token prompts (was 14.1-14.9 with a 130-185-token burst at the end). Check any server with
  `python3 bench/stream_rate.py --url http://HOST:30000` (PASS = text arrives evenly, no end burst).
- `fast` mode keeps two copies of the experts in RAM (~235 GB); a single-copy fast mode (~170 GB) is in progress.
- `nvme` mode decode is not exact (CPU lane, paired KL 0.0047 / top-1 0.986); `nvme-exact` is. The `nvme` CPU lane
  applies exllamav3's SwiGLU clamp (`swiglu_limit` 10); the `fast` CPU tier (`kernels/cpu_avx2/`) does not. On the NVMe
  lane the clamp alone moved the paired KL from 0.0063 to 0.0047, so it is a candidate part of the `fast` decode
  difference; not changed in `fast` yet.
- `nvme-exact` (and `nvme` with `-e GLM53_MAX_RQ_TOKENS=0`) decodes concurrent requests one after another: without a
  page-allocation round each job reserves KV pages for its whole remaining context. `nvme` sets 4096.
- The NVMe modes pin threads to fixed CPUs (defaults = the measured 24-core / 48-thread EPYC with `--cpuset-cpus
  2-39`); other CPUs need the `GLM53_NV_*CPU*` / `GLM53_MAIN_CPUS` variables set (the entrypoint checks them). Decode
  speed with a single NVMe drive instead of the measured 4-drive array is not measured.

## Host requirements

| | requirement | measured on |
|---|---|---|
| GPU | 1x NVIDIA 24 GB, sm_86 (RTX 3090 / A5000 class). sm_86 binaries also run on sm_89 (RTX 4090), not measured. Blackwell (sm_120) needs a rebuild with `TORCH_CUDA_ARCH_LIST="8.6;12.0"`, not measured | RTX 3090, driver 610.57 |
| driver | CUDA 13.0 capable (the base image is CUDA 13.0.3) | 610.57 |
| PCIe | 4.0 x16 recommended; cache misses are read over the link (~25 GB/s) | 4.0 x16 |
| host RAM, `fast` | **~218 GiB (~234 GB) for the process today**: pinned home copy of all routed experts (42 x 288 x 9.44 MB = 114.2 GB) + the CPU tier's block-contiguous second copy (114.2 GB). Measured MemAvailable drop from start to ready: 213.2 GiB / 228.9 GB (G067), 218.3 GiB / 234.4 GB (C056); process RSS 216.9 GiB. 256 GiB total is the bare minimum with nothing else running; 320 GB+ recommended. With `--memory`, allow at least 230g (the campaign used 250g). A single-copy fast mode (target ~170 GB) is in progress and will ship as a new image digest / env setting | 503 GiB |
| host RAM, `exact` | **~111 GiB (~119 GB)**: the pinned home copy only (measured drop 111.1 GiB / 119.3 GB, G066a); 128 GiB total is the minimum, 160 GB+ recommended. This is the low-RAM option today | |
| CPU, `fast` | x86-64 with **AVX2 + FMA + F16C**; ~24 physical cores; decode speed scales with cores x per-core decode throughput (~3.6 GB/s per core under all-core load) | EPYC 7443P 24C |
| memory bandwidth | 8-channel DDR4 (or better) recommended: the CPU tier streams ~80 GB/s while PCIe reads ~25 GB/s from the same DRAM (measured 136 GB/s read at 22 threads) | 8ch DDR4 |
| disk | 117 GiB (125.3 GB) checkpoint, NVMe recommended (load 103-113 s from page cache) | 990 PRO |
| limits | `--ulimit memlock=-1` recommended (pinned host memory; the image also loaded without it, driver 610.57) | |

## Run

```bash
# 1. the checkpoint (branch 3.05bpw), or leave the mounted directory empty and the container downloads it
hf download turboderp/GLM-5.3-Flash-exl3 --revision 3.05bpw --local-dir /data/GLM-5.3-Flash-exl3-3.05bpw

# 2. serve on GPU 0, port 30000 (OpenAI API at /v1)
docker run -d --name glm53 --gpus '"device=0"' --ulimit memlock=-1 --shm-size 16g -p 30000:30000 \
  -v /data/GLM-5.3-Flash-exl3-3.05bpw:/models \
  ghcr.io/0xsero/glm53-flash-offload@sha256:bb633b0bcb85573ad40b6c408af5e1036ae062c593e42479f4e4d2ab521e551d

docker logs -f glm53          # ready after ~2 min ("loaded in ... s")
curl -s localhost:30000/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"glm-5.3-flash","messages":[{"role":"user","content":"Hello!"}],"max_tokens":512}'
```

Exact mode: add `-e GLM53_MODE=exact`. Extra arguments after the image name are appended to the server command
(the last value wins), e.g. `... IMAGE -cs 65536` for a 64k KV cache (more expert-cache slots).

Endpoints: `/v1/chat/completions` (stream or not; `tools` -> OpenAI `tool_calls`, parsed from GLM's
`<tool_call>` format; reasoning in `reasoning_content`; disable thinking with
`"chat_template_kwargs": {"enable_thinking": false}`), `/v1/completions`, `/v1/models`, `/health`, `/stats` (cache
hit rate, CPU tier counters), `/server_info`, and SGLang-shaped `/generate` + `/tokenize`. Text only (the
checkpoint's vision tower is not loaded). Requests are not capped: `max_tokens` defaults to the remaining context.

Without Docker: exllamav3 1.5.1 built for your GPU, then `scripts/install.sh` (builds the extensions) and `docker/entrypoint.sh` with `GLM53_ROOT=$PWD GLM53_MODEL_DIR=/path/to/model`.

## 55 GB NVMe mode

`GLM53_MODE=nvme` serves the same checkpoint on the same GPU with the container capped at **55 GiB of host RAM**
(`fast` needs ~218 GiB, `exact` ~111 GiB). The routed experts (42 layers x 288 x 9.44 MB = 114.2 GB) are not loaded
from the checkpoint. They are read with `O_DIRECT` from a packed expert store on NVMe (117.3 GB, built once from the
checkpoint) into three exclusive tiers:

- **VRAM**: the elastic CLOCK expert cache, as in the other modes (1,312 slots = 12.4 GB with the 1.5 GB reserve of
  `nvme`, capped at 1,376 by `GLM53_EC_MAX_SLOTS`).
- **RAM**: a pinned arena sized from the container memory cap (4,831 experts = 42.5 GiB at `--memory 55g`).
  Experts evicted from VRAM are written back into it, so VRAM + RAM hold ~6,100 distinct experts (51 % of 12,096).
- **NVMe**: everything else, read on demand by a 16-thread pread pool, plus a prefetch of predicted picks.

Per decode MoE layer the GPU publishes its unique picks to a mapped ring with no host sync. A controller thread
(`kernels/nv2/nv2_host.cpp`) plans a lane for each pick: VRAM hit, RAM (zero-copy read + admit), AVX2 CPU lane (cold
RAM-resident experts, as the `fast` CPU tier), or NVMe read into a fresh RAM slot. The GPU waits on the reply
device-side, so an NVMe miss stalls that layer instead of being skipped. Prefill stages each layer's experts from RAM
and from a pinned FIFO ring that a reader fills several layers ahead. Code: `glm53/nv2.py` (this mode),
`glm53/nv_tier.py` (loader and store reader), `kernels/nv2/`, the `_stage_hook_nv2` path in `glm53/expert_cache.py`.

| mode | what runs | quality vs stock exllamav3 | host |
|---|---|---|---|
| `nvme` | NVMe tier + AVX2 CPU lane for cold RAM-resident decode picks, batched decode (`-ambs 4`) with concurrent streams (`GLM53_MAX_RQ_TOKENS=4096`) | prefill exact; decode **not exact** (CPU lane; paired KL 0.0047) | `--memory 55g`, 117.3 GB NVMe store |
| `nvme-exact` | NVMe tier, no CPU lane: every pick on exllamav3's GPU kernels | bit-exact (panel 1.0000 / KL 0; greedy answers identical to `exact`) | same |

### Host requirements (in addition to [Host requirements](#host-requirements), RAM rows excepted)

| | requirement | measured on |
|---|---|---|
| NVMe store | **117.3 GB** (109.3 GiB) `glm53_flash_exl3_3.05bpw_experts.bin` + 0.85 MB manifest `.json`, on a filesystem that supports `O_DIRECT` (xfs, ext4; `pack-store`, `verify-store` and the server probe it first and stop with a one-line reason if it does not). Mount it **read-only** at `/nvx`. Build it with `pack-store` (below). The checkpoint is still needed at `/models` for the non-expert weights (its 114.2 GB of expert bytes are never read) | 4x Samsung 9100 PRO 1 TB, md RAID0 (512k chunk), xfs, on a PCIe 4.0 x16 4-slot card; `verify-store` re-read + sha256 6.1-10.9 GB/s |
| NVMe bandwidth | the tier reads ~7 GB/s on average during the sweep (20.2 TB of reads in the 46-minute S3b2 run: demand misses, prefetch and prefill staging). Decode speed on one drive (~7 GB/s peak, lower at queue depth 24) is **not measured** | as above |
| host RAM | `--memory 55g --memory-swap 55g` (Docker's `g` = GiB, so 59.1 GB). `--memory-swap` must equal `--memory`: the default (2x) lets swapped-out pages escape the cap. The RAM tier takes the cap minus what is already used, minus a 3 GiB margin, the 1.7 GiB prefill ring, 0.3 GiB, and the **`-rcs` reserve**: exllamav3's host-side recurrent-state cache (`-rcs` / `--recurrent_cache_size`, default 4 GB) grows while serving, so the tier leaves room for it. Passing `-rcs N` changes the reserve to match. Measured `memory.peak` 51.3 GiB of 55 at the end of the S3b2 sweep. Keep `--shm-size` small (1g; tmpfs pages count against the cap) and `--ulimit memlock=-1` (the RAM tier is `cudaHostRegister`ed) | 503 GiB host, 55 GiB cap |
| GPU | `-e GLM53_EC_MAX_SLOTS=1376` on a 24 GB card that also drives a desktop: it caps the expert cache at the G067 size, so later VRAM use by the display does not run the CUDA graphs out of memory (arm S3b, reserve 1.0 GB with concurrent decode, hit a CUDA OOM in `graph.cu` mid-sweep; S3b2 with 1.5 GB ran clean) | RTX 3090, display on the same GPU |
| CPU | AVX2 + FMA + F16C for the CPU lane. Threads are pinned: CPU lane 22 threads on cpus 2-23, the GPU-feeding main thread on 24, the controller on 25, 16 NVMe reader threads on cpus 26-39. Run with `--cpuset-cpus 2-39` on a 24-core / 48-thread host (the measured layout). With fewer CPUs, or a cpuset that does not hold 2-39, the entrypoint derives the layout from the container's CPU set (`docker/preflight.py cpus`: main thread on its first CPU, controller on the second, CPU lane on the rest, readers on the last up to 14 of those) and logs it; speed with a derived layout is not measured. Variables you set (`GLM53_NV_CPU_CPUS`, `GLM53_MAIN_CPUS`, `GLM53_NV_CTL_CPU`, `GLM53_NV_READER_CPUS`) are kept and must lie inside the cpuset | EPYC 7443P |
| network | measured with `--network host` (`-e PORT=...`): no docker-proxy in the request path. A bridge network with `-p` should also work but was not measured in this mode | host network |

### Run (NVMe mode)

```bash
IMG=ghcr.io/0xsero/glm53-flash-offload@sha256:82eef823f95b89fcb14b8379d45315d3a632aaa054fb04e3418b62a3ec2ff1ff
# 1. once: pack the routed experts into the store (CPU only; pack + O_DIRECT sha256 re-read of every record + byte
#    compare of a sample against the checkpoint; ~1 min from page cache on the measured array)
docker run --rm -v /data/GLM-5.3-Flash-exl3-3.05bpw:/models:ro -v /mnt/nvx/glm53:/nvx "$IMG" pack-store
docker run --rm -v /data/GLM-5.3-Flash-exl3-3.05bpw:/models:ro -v /mnt/nvx/glm53:/nvx:ro "$IMG" verify-store   # re-check any time (~20 s)

# 2. serve on GPU 0, port 30000, inside 55 GiB of host RAM
docker run -d --name glm53-nvme --gpus '"device=0"' --memory 55g --memory-swap 55g --shm-size 1g --ulimit memlock=-1 \
  --cpuset-cpus 2-39 --network host -e PORT=30000 -e GLM53_MODE=nvme -e GLM53_EC_MAX_SLOTS=1376 \
  -v /data/GLM-5.3-Flash-exl3-3.05bpw:/models:ro -v /mnt/nvx/glm53:/nvx:ro "$IMG"
docker logs -f glm53-nvme     # ready after ~80 s ("loaded in ... s"; 76 s in P003)
```

Exact variant: `-e GLM53_MODE=nvme-exact`. The `fast` and `exact` modes in this digest are the same code paths as
`bb633b0b` (the new code only runs when `GLM53_NV` is set by an NVMe mode), but they were not re-measured in it; the
big-RAM default stays [`bb633b0b`](#run). `GLM53_MODE=nvme1/nvme2/nvme3` are the campaign names (N116 S1, S2, S3
without the shipped defaults).

### Measured (NVMe mode)

Same host and protocol as [Measured](#measured) (`sweep.py --template glm --prefill 8192 32768 --conc 1 2 4 --reps 3
--dec-reps 2`, natural completions), container under `--memory 55g --memory-swap 55g`, run as above.

**`nvme` (S3b2, the shipped defaults)**: `-cs 131072 --max-batch-size 8 -chunk_size 8192 -ambs 4`; expert cache
1,312 slots (12.4 GB; reserve 1.5 GB, cap 1,376), staging 2 x 295 experts; RAM tier 4,831 experts (42.5 GiB); CPU
lane 22 threads (cpus 2-23); `GLM53_MAX_RQ_TOKENS=4096`, `GLM53_NV_PREFETCH=1`, `GLM53_NV_VRING=24`, `GLM53_K_OVL=0`.

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 583 tok/s | 14.85 tok/s | 1 | 131,072 tokens | 1 |
| 8,192 | - | 15.62 tok/s aggregate (7.87 per stream) | 2 | 131,072 tokens | 1 |
| 8,192 | - | 16.27 tok/s aggregate (4.63 per stream) | 4 | 131,072 tokens | 1 |
| 32,768 | 812 tok/s | 13.46 tok/s | 1 | 131,072 tokens | 1 |
| 32,768 | - | not run | 2 | 131,072 tokens | 1 |

Where the decode picks were served over the S3b2 run: 39 % VRAM, 54 % RAM (of which the CPU lane computed 41 % of all
picks), 7 % NVMe. Container memory: `memory.current` 48.1 GiB at ready, `memory.peak` 51.3 GiB at the end (cap 55 GiB);
host MemAvailable fell by 48.5 GiB at load. NVMe reads over the 46-minute run: 20.2 TB (~7 GB/s average, demand +
prefetch + prefill staging); 0 read errors, 0 device-side reply timeouts. The published image under the README command
measured 5-8 % lower on a busier host (see [Image smoke](#image-smoke), run P003: same-conditions A/B shows the image
at or above the campaign build).

Without `GLM53_MAX_RQ_TOKENS` (arm S3a: reserve 1.0 GB, otherwise the same) every job reserves KV pages for its whole
remaining context, so a second request does not start until the first finishes: C1 15.30, "C2" 14.68 and "C4" 14.59
tok/s aggregate with up to 455 s to first token, C1 at 32k 13.77, prefill 576 / 814. S3b2 trades 3 % of C1 for real
concurrency (C4 time to first token <= 9.5 s).

**`nvme-exact` (S2a)**: the same without the CPU lane, reserve 1.0 GB, `GLM53_MAX_RQ_TOKENS` unset (streams decode one
after another; `-e GLM53_MAX_RQ_TOKENS=4096` enables concurrent decode, not measured in this mode).

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 564 tok/s | 8.28 tok/s | 1 | 131,072 tokens | 1 |
| 8,192 | - | 8.23 tok/s aggregate (streams ran one at a time) | 2 | 131,072 tokens | 1 |
| 8,192 | - | 8.28 tok/s aggregate (streams ran one at a time) | 4 | 131,072 tokens | 1 |
| 32,768 | 806 tok/s | 7.74 tok/s | 1 | 131,072 tokens | 1 |
| 32,768 | - | not run | 2 | 131,072 tokens | 1 |

For comparison, all experts in RAM: `exact` 12.6 tok/s, `fast` 28.2 tok/s at C1. Prefill is 81-85 % of the all-RAM
modes (697-710 / 945-951).

### Quality (NVMe mode)

- **Prefill / teacher-forced panel, both NVMe modes: top-1 1.0000, KL 0** (2,154 positions; S2a, S3a, S3b2 and the
  image smoke P003). The tiers only change where an expert's bytes come from; the store is a byte copy of the checkpoint's expert tensors
  (verified by sha256 at pack time and by `verify-store`), and the server byte-compares sampled VRAM and RAM slots
  against fresh store reads at start (`/nv_verify` repeats it on demand; every run here: 0 bad).
- **`nvme-exact` decode is exact**: greedy answers to 5 prompts are identical to `exact` mode.
- **`nvme` decode is not exact** (the CPU lane computes ~3.6 experts per layer call in fp32 on the host). Paired
  check in one process with the S3a settings, whose CPU lane is the same as S3b2's (`decode-kl`, 6 prompts, 1,088
  forced decode positions, CPU lane off vs on): **mean KL 0.0047 (p99 0.082, max 0.26), top-1 agreement 0.986**; the
  control pass (lane off in both passes) gives KL 0 / top-1 1.0000. The
  lane applies exllamav3's SwiGLU clamp (`swiglu_limit` 10, `GLM53_NV_CLAMP=1`); without it the same check measures
  KL 0.0063 / top-1 0.983. The `fast` mode CPU tier does not apply this clamp yet (see Known issues). Use
  `nvme-exact` when outputs must match exllamav3.

Raw files: `results/P003-nvme-image-smoke/` (published image), `results/N119-S2a-55g/` (`nvme-exact`),
`results/N119-S3b2-55g/` (`nvme`), `results/N119-S3a-55g/`, `results/N119-S3-decode-kl/decode_kl.json`; each arm has `cmd.txt` (the exact `docker run`), `sweep.json`, `score.json`,
`greedy.json`, `server_info.json`, memcg / MemAvailable / VRAM at start, ready and end, the kernel-log guard before and
after, and tier stats.

## Reproduce

Everything the numbers depend on, pinned:

| piece | pin |
|---|---|
| model | `turboderp/GLM-5.3-Flash-exl3`, branch `3.05bpw`, revision `332ab457b709b7ba30dd9a448be5de03b80a7ac9` (125.3 GB) |
| image | `ghcr.io/0xsero/glm53-flash-offload@sha256:bb633b0bcb85573ad40b6c408af5e1036ae062c593e42479f4e4d2ab521e551d` (tag v3, built from local-ai-images `main` by run [36868783920](https://github.com/0xSero/local-ai-images/actions/runs/36868783920), SLSA provenance attested from `refs/heads/main`; previous digest `1159044a…` = repo `c4b9160`, half-speed streaming), built by [0xSero/local-ai-images](https://github.com/0xSero/local-ai-images) `glm53-flash-offload/Dockerfile` |
| base | `lmsysorg/sglang@sha256:06e4f2ed21afde4ff513cda65070124e727ba23ccaeff7712b8c40e1097d611f` (v0.5.20, SGLang commit 94602c9; CUDA 13.0.3, torch 2.13.0+cu130, Triton 3.7.1, transformers 5.12.1) |
| image, NVMe modes | `ghcr.io/0xsero/glm53-flash-offload@sha256:82eef823f95b89fcb14b8379d45315d3a632aaa054fb04e3418b62a3ec2ff1ff` (tag v4-nvme, built from local-ai-images `main` `8f60eec` by run [37592054786](https://github.com/0xSero/local-ai-images/actions/runs/37592054786), SLSA provenance attested from `refs/heads/main`); this repo at `92698604575f789ecc7a2340480413567e6d05c6` (merge of PR #2). Same base and exllamav3 |
| NVMe store | `scripts/pack_glm53_store.py` (`IMAGE pack-store`): 43 layers (42 MoE + MTP) x 288 records of 9,474,048 B = 117,326,610,432 B, layer-major, 4096-aligned, sha256 per record in the manifest |
| exllamav3 | v1.5.1 = commit `958ec933361b24eb8426ec7222e5b0062a679dcd`, built with `TORCH_CUDA_ARCH_LIST=8.6` |
| this repo | `fe97bcf846347d035859a0610cebbb707fa36caa` for that digest (the image's `GLM53_COMMIT`, also in `/opt/glm53/COMMIT`); later commits here are docs/results only unless a new digest is listed |
| Triton picks | `data/triton_pin_exact.json` (7 FLA/KDA kernels) |
| host | AMD EPYC 7443P 24 cores (AVX2, no AVX-512), 8-channel DDR4 503 GiB (136-140 GB/s measured read), RTX 3090 24 GB PCIe 4.0 x16 (~25 GB/s host-to-device), Samsung 990 PRO 4 TB NVMe, NVIDIA driver 610.57.04, Linux 7.2 |

Run the server as in [Run](#run), then from a clone of this repo (Python 3, standard library only):

```bash
# quality: teacher-forced panel vs the exllamav3 reference (expect top-1 1.0000, KL 0 in both modes)
python3 bench/score_ref_panel.py --url http://127.0.0.1:30000 --panel reference/glm-5.3-flash-exl3-ref-panel.json --out score.json
# speed: the protocol behind every table here (P2)
python3 bench/sweep.py --url http://127.0.0.1:30000 --card rtx-3090-24gb/glm-5.3-flash-offload --template glm \
  --config "<digest> fast" --prefill 8192 32768 --conc 1 2 4 --reps 3 --dec-reps 2 --no-early-exit --out sweep.json
# NVMe mode: the same two commands against the NVMe-mode server; its paired CPU-lane decode check is
#   docker run --rm <the NVMe run flags> -v $PWD:/out IMAGE decode-kl --kl-out /out/decode_kl.json   (bench/decode_kl_nv.py)
# decode quality of the CPU tier: paired tier-off / tier-on decode in one process (stop the server first; ~20 min)
docker run --rm --gpus '"device=0"' --ulimit memlock=-1 --shm-size 16g -v <model dir>:/models -v $PWD:/out \
  ghcr.io/0xsero/glm53-flash-offload@sha256:bb633b0bcb85573ad40b6c408af5e1036ae062c593e42479f4e4d2ab521e551d decode-kl --kl-out /out/decode_kl.json
```

`results/` holds the raw outputs of the campaign runs behind the tables: `G067/` (shipped `fast` defaults), `C056/`
(previous fast config), `G066a/` (`exact` mode) with `sweep.json`, `score.json`, `server_info.json`, the launch
(`launch.txt`: argv + env; `/w` was this repo mounted in the campaign container) and MemAvailable / VRAM at start and
ready; `C052e/decode_kl.json` is the paired decode check. The reference panel (`reference/`) was produced by stock
exllamav3 1.5.1 on the same checkpoint (8 prompts, top-20 logprobs at every position).

## Image smoke

The published image is tested on the measured host exactly as in [Run](#run) (clean pull by digest, bridge
network, model mounted at `/models`; NVMe mode: as in [Run (NVMe mode)](#run-nvme-mode), host network, store at
`/nvx`): health, chat, tool call, the teacher-forced panel and the P2 sweep. Results are recorded here per digest.

| digest | panel top-1 / KL | prefill 8k / 32k | decode C1 / C2 / C4 (aggregate) | C1 at 32k | ready after |
|---|---|---|---|---|---|
| `82eef823` (repo `9269860`, **`nvme` mode**, `--memory 55g`) | 1.0000 / 0 (2,154 positions) | 545.3 / 767.4 tok/s | 13.70 / 14.38 / 15.24 tok/s | 12.40 tok/s | 76 s |
| `bb633b0b` (repo `fe97bcf`, fast mode) | 1.0000 / 0 (2,154 positions) | 700.2 / 958.0 tok/s | 28.88 / 31.27 / 35.00 tok/s | 27.56 tok/s | 201 s |
| `1159044a` (repo `c4b9160`, fast mode) | 1.0000 / 0 (2,154 positions) | 707 / 953 tok/s | 29.03 / 31.38 / 34.88 tok/s | 27.85 tok/s | 141 s |

Run P003, 2026-10-07, digest `82eef823` (tag v4-nvme, `GLM53_MODE=nvme`). Anonymous `docker pull` of the digest
(`/opt/glm53/COMMIT` = `9269860`), `verify-store` (12,384 records, 117.3 GB `O_DIRECT` re-read + sha256 in 11 s, 0
bad), then the [Run (NVMe mode)](#run-nvme-mode) command: `--memory 55g --memory-swap 55g --cpuset-cpus 2-39`, host
network, store at `/nvx` read-only. Ready after 76 s (loaded in 65.5 s). Chat, no-thinking chat and an OpenAI tool
call (`get_weather` with `{"city": "Paris"}`) answered correctly. `bench/stream_rate.py` passed on both endpoints
(half-share 0.51 / 0.53, last-second share 0.6 %). Panel 1.0000 / KL 0. `/nv_verify` byte checks after the panel and
after the sweep: 0 bad. Container memory: `memory.peak` 51.1 GiB of the 55 GiB cap; `memory.swap.max` 0. Kernel-log
guard (no Completion-Wait timeouts, Link Down, Card not present, reboot-needed or non-corrected hardware errors, no
D-state khugepaged/kcompactd) clean before, mid-run and after.

The sweep measured 5-8 % below the campaign arm S3b2 (583 / 812, 14.85 / 15.62 / 16.27, 13.46). The host was busier:
a Sunshine desktop stream was encoding on the same GPU (35 % of a core, 218 MiB more VRAM in use before start, so the
cache got 1,280 slots instead of 1,312), and another agent started a B70 job at 12:05, during the last 32k round. To
separate the image from the host, the same 8k C1 + 32k C1 sweep then ran twice back to back under the same
conditions: the published image (`A`) and the campaign S3b2 setup (`B`: `bb633b0b` with the S3b2 code snapshot and
extensions mounted, S3b2 env). Both arms got 1,280 slots and both ran while the B70 job was active.

| run (same host state, back to back) | prefill 8k | decode C1 | C1 at 32k |
|---|---|---|---|
| A: published `82eef823`, README command | 529.0 tok/s | 13.11 tok/s | 12.44 tok/s |
| B: campaign S3b2 setup | 529.8 tok/s | 12.16 tok/s | 11.62 tok/s |

The image is at or above the campaign build on the same host state, so the gap to S3b2 comes from the host
conditions, not the image. The S3b2 table above stays the measured reference. A re-measure with the desktop
stream and the other slots idle is pending. Raw files, including both scripts:
[`results/P003-nvme-image-smoke/`](../results/P003-nvme-image-smoke/) (`ab/` for the A/B).

Run P002b, 2026-10-01, digest `bb633b0b` (streaming fix), README command on a bridge network. The host had one RTX 3090
left, device 0, which also drives the display (~1 GB less free VRAM than P001's headless GPU 1); every number is within
2 % of P001. Streaming delivery (client-side arrival time of every SSE event, one full greedy answer each, 10-s bins):

| endpoint | prompt | answer | delivered | 10-s bins (tok/s) | last 1 s |
|---|---|---|---|---|---|
| `/generate` | 507 | 2,518 tok | 28.98 tok/s | 29.0 29.5 28.7 29.1 29.4 28.6 28.7 28.9 28.9 | 1.2 % |
| chat | 515 | 3,007 tok | 28.65 tok/s | 30.0 29.9 28.3 28.4 28.5 28.6 26.8 28.1 28.1 29.9 28.4 | 0.9 % |
| `/generate` | 32,314 | 2,605 tok | 28.71 tok/s | 28.6 29.6 29.2 28.7 29.0 28.3 28.4 28.6 28.0 28.4 | 1.1 % |
| chat | 32,224 | 2,525 tok | 28.76 tok/s | 30.2 29.4 30.4 26.9 26.4 28.0 29.6 29.7 28.3 | 1.4 % |

Delivery equals the generation rate from the first bin, with no end-of-answer burst (digest `1159044a`: ~14.4 tok/s
delivered, ~50 % of the text in the final flush). The local-ai-registry lab gates on the registry launch form all pass,
including speed: load, chat, reasoning, tools, context (93,437-token prompt), speed 28.8 tok/s over the first 30 s right
after the context gate; 330 s. Raw files and the bin script: [`results/P002b-stream-fix-smoke/`](../results/P002b-stream-fix-smoke/).

Run P001, 2026-10-01, RTX 3090 (GPU 1 of the measured host), anonymous `docker pull` of the digest, then the README
command on a bridge network; every number within 5 % of the campaign's G067 (710 / 951, 28.15 / 31.57 / 33.98,
26.89). Chat, no-thinking chat, streaming and an OpenAI tool call answered correctly. MemAvailable fell by 221.4 GiB
(237.7 GB) at its lowest; VRAM at ready 22.7 GiB. A second start **without** `--ulimit memlock=-1` (the registry
launch form) also loaded and served, so the flag is recommended but not required with this driver. The
local-ai-registry lab gates on that start: load, chat, reasoning, tools and context (93,437-token prompt, needle
found) pass; the speed gate measured 14.4 tok/s over its first 30 s window: that was the half-speed streaming defect of
this digest (see Known issues), not cache re-warm. Raw files:
[`results/P001-image-smoke/`](../results/P001-image-smoke/).

## Configuration

| env | default (`fast` / `exact`) | meaning |
|---|---|---|
| `GLM53_MODE` | `fast` | `fast` = G067 defaults, `exact` = G066a defaults |
| `GLM53_MODEL_DIR` | `/models` | checkpoint directory; downloaded there if `config.json` is missing |
| `GLM53_MODEL_REPO` / `GLM53_MODEL_REVISION` | `turboderp/GLM-5.3-Flash-exl3` / `332ab457...` (branch 3.05bpw) | download source |
| `GLM53_CPU_TIER` | `1` / `0` | AVX2 CPU tier for cold decode misses |
| `GLM53_CT_CPUS` | `auto` | CPUs for the CPU tier pool; `auto` = one logical CPU per physical core, minus the first 2 cores (left to the Python thread that drives the GPU and the OS); explicit list like `2-23` |
| `GLM53_CT_THREADS` | number of `GLM53_CT_CPUS` | CPU tier threads (one per listed CPU) |
| `GLM53_CT_SWZ` | `1` | `1` = the CPU tier reads its own block-contiguous copy of the experts (+114.2 GB RAM, the measured setup); `0` = it reads the pinned home copy in the native layout (single copy, ~120 GiB total, but ~40 % slower per CPU expert in the kernel benchmark; not measured end to end) |
| `GLM53_CT_A`, `GLM53_CT_B`, `GLM53_CT_TZC` | `0.11`, `0.104`, `0.40` (ms) | cost model: CPU job = A + B x experts; one zero-copy miss = TZC on the GPU |
| `GLM53_EC_RESERVE_GB` | `1.5` / `1.0` | VRAM left free after the expert cache takes the rest |
| `GLM53_EC_STAGE_GB` | `2.6` | prefill staging buffer size (2 buffers, overlap copy with compute) |
| `GLM53_K_HCFUSE`, `GLM53_K_FTSPLIT`, `GLM53_K_OVL` | `1` / `0` | fused hyper-connection decode sites; fast CPU-tier split kernel; shared expert on a side stream |
| `GLM53_EC_ELASTIC_GB` | `10` | cache memory handed back for prefill activations and staging, re-taken for decode |
| `GLM53_TRITON_PIN` | `data/triton_pin_exact.json` | fixed KDA autotune picks (empty = autotune) |
| `GLM53_NV_STORE` | `/nvx/glm53_flash_exl3_3.05bpw_experts.bin` | NVMe modes: the packed store (`.json` manifest next to it) |
| `GLM53_NV_RAM_GB` | `auto` | NVMe modes: RAM tier size; `auto` = container `memory.max` - current - `GLM53_NV_MARGIN_GB` (3) - prefill ring - `-rcs` reserve - 0.3 GiB |
| `GLM53_NV_CPU` | `1` (`nvme`) / `0` (`nvme-exact`) | AVX2 CPU lane on RAM-resident cold decode picks (`GLM53_NV_CLAMP=1`: SwiGLU clamp) |
| `GLM53_NV_CPU_CPUS`, `GLM53_MAIN_CPUS`, `GLM53_NV_CTL_CPU`, `GLM53_NV_READER_CPUS`, `GLM53_NV_THREADS` | `2-23`, `24`, `25`, `26-39`, `16` | NVMe modes: CPU lane threads, GPU-feeding main thread, controller thread, NVMe reader threads |
| `GLM53_NV_PREFETCH`, `GLM53_NV_VRING`, `GLM53_NV_PF_RING` | `1`, `24`, `192` (`nvme`) | layer-ahead NVMe prefetch of predicted picks; VRAM victim ring; prefill NVMe FIFO ring (slots) |
| `GLM53_LA`, `GLM53_LA_BTTRIM` | unset (experimental, N136) | `GLM53_LA=1`: C1 decode lookahead. The next decode forward is enqueued on the device token before the host reads it, and the embedding is looked up on the GPU from a host-mapped table. Runtime switch: `GET /la?on=0\|1`. Bit-exact; greedy equality checked in `nvme-exact`. `GLM53_LA_BTTRIM=1` (needs LA): block-table width = needed pages while the padded width is 16, so the empty flash-decoding splits are skipped |
| `GLM53_NV_PUBFAST`, `GLM53_NV_PFSIDE` | unset (experimental, N136) | NVMe modes: `nv_pub` with warp-ballot compaction (same request bytes); layer-ahead prefetch guess on a side stream, concurrent with the router (hint only; single-row decode only, since exllamav3's multi-row routing projection shares static workspaces) |
| `GLM53_MAX_RQ_TOKENS` | `4096` (`nvme`) / unset | exllamav3 `max_rq_tokens`: page-allocation round per job (not an output cap); lets concurrent jobs decode together |
| `GLM53_EC_MAX_SLOTS` | unset | cap on GPU expert-cache slots; the NVMe Run command sets 1376 (GPU shared with a desktop) |
| `PORT`, `SERVED_NAME`, `GLM53_ARGS` | `30000`, `glm-5.3-flash`, empty | server port, model id, extra args |

**Sizing the CPU tier for another CPU.** The tier is limited by per-core decode throughput, not DRAM (SMT, prefetch
distance and 23-46 threads all measured flat). Give it one thread per physical core and leave 2 cores free; `auto`
does that inside the container's cpuset (24 cores -> cpus 2-23, 22 threads). The per-layer split between CPU and
PCIe uses `GLM53_CT_B` = ms per expert on the CPU at your thread count; it was measured at 22 threads, so for N
threads set roughly `GLM53_CT_B = 0.104 x 22 / N` (e.g. 16 cores -> 14 threads -> 0.16). Fewer than ~12 cores: the
split sends most misses back over PCIe and decode approaches `exact`-mode speed; there `exact` is the better choice.

**Other GPUs.** The expert cache sizes itself from free VRAM after load (minus `GLM53_EC_RESERVE_GB`), so a 32 GB or
48 GB card simply gets more slots (higher hit rate, faster decode); keep the reserve at 1.5 GB unless long prefills
OOM. RTX 4090 (sm_89) runs the sm_86 build unchanged; Blackwell needs the image rebuilt with
`--build-arg TORCH_CUDA_ARCH_LIST="8.6;12.0"`, and a new Triton pin may be needed there (`glm53/make_triton_pin.py`
turns a Triton cache into a pin file; check the panel stays at 1.0000). A slower PCIe link (3.0, or 4.0 x8) costs
decode speed roughly in proportion to the cache-miss traffic.

## Registry and kit

- local-ai-registry recipe: [`rtx-3090-24gb/glm-5.3-flash.exllamav3.128k`](https://github.com/0xSero/local-ai-registry/blob/main/registry/recipes/nvidia/rtx-3090-24gb/glm-5.3-flash.exllamav3.128k.json)
  (launch `registry/launches/exllamav3-glm-5.3-flash-exl3-3.05bpw-offload-128k-rtx-3090-24gb.json`; candidate until
  the CPU-tier decode fix lands)
- local-ai-recipe-kit target: [`targets/glm-5.3-flash-offload.md`](https://github.com/0xSero/local-ai-recipe-kit/blob/main/targets/glm-5.3-flash-offload.md)
  (submit your own measurements of this setup there; PR [local-ai-recipe-kit#3](https://github.com/0xSero/local-ai-recipe-kit/pull/3))

## How it works

- **Zero-copy home** (`glm53/exl3_tiers.py`): at load, every routed expert's trellis goes into one exact-size
  pinned host arena per layer (`cudaHostRegister`), and exllamav3's per-expert pointer tables point at its UVA alias.
  Its MoE kernels can read any expert over PCIe with no copy and no host sync.
- **Elastic CLOCK expert cache** (`glm53/expert_cache.py`): one VRAM slot arena (all free VRAM minus a reserve,
  1,376 slots = 13.0 GB in `fast` mode) shared by all MoE layers. Per layer and decode step a one-block kernel
  dedups the router picks, marks hits, picks CLOCK victims for misses and repoints the tables; a gather kernel
  copies the admitted experts. exllamav3's kernels run unchanged against the live tables, so results are bit-exact.
  Warm-started from routing statistics (`data/stats_own_dec.json`).
- **Prefill staging**: for chunks of >= 8,192 picks per layer, each layer's non-cached experts are copied to a VRAM
  staging buffer on a copy stream one layer ahead, overlapping the previous layer's compute. Elastic mode hands
  10 GB of cache slots back to torch for prefill activations and staging, and re-takes them for decode.
- **CPU tier** (`glm53/cpu_tier.py`, `kernels/cpu_avx2/`): in decode (<= 4 tokens), after routing, a GPU kernel
  splits the misses by a cost model: the warmest go zero-copy and are admitted to the cache, the coldest (~4 per
  layer at C1, more when batched) are published through pinned mapped memory to a C++ worker that computes them with an AVX2 MUL1/K=3 trellis
  kernel (fp32/int16 activations, no int8 quantisation) from a block-contiguous host copy; the GPU removes those
  picks from its own MoE and adds the CPU's fp32 partial back after its experts (device-side flag wait, no host sync).
- **Batched decode**: `-ambs 4` gives the recurrent (KDA) cache 4 slots so up to 4 streams decode in one step and
  share the per-layer expert union.
- **Decode kernels** (`fast` mode): the 4 launches of each mHC hyper-connection site fused into 2 (`k_hcfuse.py`,
  bit-exact), a faster CPU-tier split kernel (`kernels/k110/`, bit-identical), and the shared expert moved out of the
  fused MoE kernel onto a side stream so it overlaps the PCIe miss gather and the CPU wait (`k_overlap.py`).

## Layout

```
glm53/serve.py          OpenAI-compatible server over exllamav3 AsyncGenerator
glm53/exl3_tiers.py     pinned zero-copy home copy of all routed experts
glm53/expert_cache.py   elastic CLOCK GPU expert cache + prefill staging (CUDA source inline)
glm53/cpu_tier.py       CPU tier wiring, cost-model policy, self-test, auto CPU sizing
glm53/triton_pin.py     Triton autotune pinning for the KDA kernels (+ make_triton_pin.py)
glm53/k_hcfuse.py       fused hyper-connection decode sites (CUDA source inline)
glm53/k_ftsplit.py      fast CPU-tier split kernel loader (kernels/k110/ft_split_fast.cu)
glm53/k_overlap.py      shared expert on a side stream in decode
glm53/nv_tier.py        NVMe modes: loader that skips the expert bytes, store manifest, O_DIRECT reader (N116 S1 engine)
glm53/nv2.py            NVMe modes: RAM tier, device-side-stall engine, prefetch, CPU lane, verify (N119)
kernels/nv2/            nv2_host.cpp (controller, readers, CPU lane), nv2_dev.cu (publish / step / copy kernels), ft_core.h
kernels/cpu_avx2/       ft_core.h (AVX2 kernels, pool), ft_tier_ext.cpp (host worker), ft_tier_cu.cu (GPU split/combine)
data/                   routing stats, exllamav3 MoE tune cache, Triton autotune pins
docker/                 Dockerfile (local build), entrypoint.sh
scripts/install.sh      pre-build the extensions
scripts/pack_glm53_store.py  build / verify / byte-compare the NVMe expert store (IMAGE pack-store / verify-store)
bench/                  sweep.py (speed protocol), score_ref_panel.py (quality), decode_kl.py (paired CPU-tier decode check),
                        decode_kl_nv.py (the same for the NVMe CPU lane), stream_rate.py (streaming delivery)
reference/              exllamav3 reference panel for GLM-5.3-Flash 3.05bpw
results/                raw JSONs of the measured runs (G067, C056, G066a, C052e, N119-*) and of the image smokes (P001, P002b, P003)
```

Updating the image: a fix here is a new commit; the image build in
[0xSero/local-ai-images](https://github.com/0xSero/local-ai-images) (directory `glm53-flash-offload/`, the image name) pins this repo by
commit, so bumping that pin produces a new attested digest. To try a checkout without rebuilding, mount it over
`/opt/glm53` (the extensions rebuild on first start; nvcc and ninja are in the image).

## Credits

- [exllamav3](https://github.com/turboderp-org/exllamav3) and the EXL3 format by turboderp (MIT): all model code,
  kernels and the quantised checkpoint [turboderp/GLM-5.3-Flash-exl3](https://huggingface.co/turboderp/GLM-5.3-Flash-exl3);
  the CPU kernel reproduces exllamav3's MUL1 codebook decode.
- FreeToken (FlashML): the idea of serving cold MoE experts from host memory with a GPU-side hot cache and a CPU
  compute tier.
- [SGLang](https://github.com/sgl-project/sglang) (`lmsysorg/sglang` v0.5.20) as the CUDA/torch/Triton base image;
  the server endpoints follow SGLang's `/generate` shape.
- GLM-5.3-Flash by Z.ai.

License: MIT (this repository). The model weights carry their own license.
