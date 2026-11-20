# Measured results

Every table here comes from the same host:

- GPU: 1x RTX 3090 24 GB on PCIe 4.0 x16, driver 610.57.
- CPU and RAM: AMD EPYC 7443P (24 cores, 48 threads), 8-channel DDR4, 503 GiB.
- NVMe store: 4x Samsung 9100 PRO 1 TB, md RAID0 (512k chunk), xfs, on a PCIe 4.0 x16 four-slot card.

The NVMe modes run in a container capped with `--memory N --memory-swap N`.

Protocol: `bench/sweep.py --template glm --prefill 8192 32768 --conc 1 2 4 --reps 3 --dec-reps 2`.

- **Prefill** is the median of 3 fresh random-token prompts: tokens divided by the time to first token.
- **Decode** runs greedy chat completions to their natural end, with no output cap and C streams at once. It reports
  aggregate tok/s, with the per-stream rate in brackets, as the median of 2 rounds.
- **Screen** runs measure only the 8k prefill, C1 and C4.
- Every row has a 131,072-token KV cache and 1 GPU.

Arms run hours apart differ by up to ~17 % on this host ("session drift"). Compare two settings only when they ran
back to back in the same session.

## Summary

| RAM | mode | decode C1 | decode C4 | prefill 8k / 32k | quality vs stock exllamav3 | image |
|---|---|---|---|---|---|---|
| ~218 GiB free | `fast` | 28.15 | 33.98 | 710 / 951 | prefill exact; decode KL 0.0053, top-1 0.977 | `ghcr.io/0xsero/glm53-flash-offload@sha256:bb633b0b...` |
| ~111 GiB free | `exact` | 12.57 | 12.64 (serial) | 697 / 945 | bit-exact | same as `fast` |
| 55 GiB cap + NVMe | `nvme` | **19.47** (v4.6; v4.4 same session 17.32) | 19.75 | 664 / 969 | prefill exact; decode KL 0.0077, top-1 0.977 (v4.6; earlier images 0.0047-0.0070) | `ghcr.io/sybil-solutions/glm53-flash-offload@sha256:aa74200f...` (v4.6-nvme) |
| 16 GiB cap + NVMe | `nvme` | **14.38** (v4.6; v4.4 same session 12.89) | not run | 650 / not run | same CPU lane as `nvme` | v4.6-nvme |
| 55 GiB cap + NVMe | `nvme-exact` | 8.28 | 8.28 (serial) | 564 / 806 | bit-exact | v4.2-nvme |

"Serial" means the concurrent streams ran one after another. KL is the mean KL divergence of the next-token
distribution against the exact GPU path on the same tokens, paired, in the same process. The teacher-forced panel
(2,154 positions) gives top-1 1.0000 and KL 0 in every mode.

Full image digests:

- v4.6-nvme: `ghcr.io/sybil-solutions/glm53-flash-offload@sha256:aa74200f16c86588b101be2315aed2f643d148559179eef52a02599016b56e69`.
  It was built by local-ai-images run [37910016883](https://github.com/sybil-solutions/local-ai-images/actions/runs/37910016883)
  from this repo at `0fbc0c5` and is SLSA-attested. `GLM53_MODE=nvme` defaults to the N135 CPU-lane forward and the
  N136 decode switches (PRs #10-#12).

  v4.6-nvme, 55 GiB cap, same session as a v4.4 control (2026-10-09, natural completions):

  | prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
  |---|---|---|---|---|---|
  | 8,192 | 664 tok/s | 19.47 tok/s | 1 | 131,072 | 1 |
  | 8,192 | - | 19.09 tok/s agg (10.02 per stream) | 2 | 131,072 | 1 |
  | 8,192 | - | 19.75 tok/s agg (5.53 per stream) | 4 | 131,072 | 1 |
  | 32,768 | 969 tok/s | 18.30 tok/s | 1 | 131,072 | 1 |
  | 32,768 | - | 18.44 tok/s agg | 2 | 131,072 | 1 |

  v4.4 control in the same session: 8k C1 17.32, C4 19.27. 16 GiB cap: v4.6 C1 14.38 vs v4.4 12.89 (8k prefill 650).
- v4.2-nvme: `ghcr.io/sybil-solutions/glm53-flash-offload@sha256:4732a063fa9e28d4d5dc7b2c3b57cb7ed84ecfff40caeb4b5bc59d71be1882b3`.
  It was built by local-ai-images run [37786722640](https://github.com/sybil-solutions/local-ai-images/actions/runs/37786722640)
  from this repo at `3bdb502` and is SLSA-attested.
- The all-RAM modes: `ghcr.io/0xsero/glm53-flash-offload@sha256:bb633b0bcb85573ad40b6c408af5e1036ae062c593e42479f4e4d2ab521e551d`.
  The v4 images contain the same `fast` / `exact` code paths, but those modes were not re-measured in them.

## `nvme`, 55 GiB

**Full sweep, prefetch on, campaign build (arm n129_pfon, 2026-10-08).** The campaign code ran mounted over
`bb633b0b`, with the shipped `nvme` settings and `--cpuset-cpus 2-39`. The arm was paused partway through C4 to free
the GPU for another job.

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 662 tok/s | 17.27 tok/s | 1 | 131,072 | 1 |
| 8,192 | - | 17.84 tok/s (9.65 per stream) | 2 | 131,072 | 1 |
| 8,192 | - | not run (arm paused) | 4 | 131,072 | 1 |
| 32,768 | 965 tok/s | not run | 1 | 131,072 | 1 |
| 32,768 | - | not run | 2 | 131,072 | 1 |

**Screen, prefetch on, NVMe reads uncapped (n55_pfon_nocap, 2026-10-08).**

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 650 tok/s | 18.23 tok/s | 1 | 131,072 | 1 |
| 8,192 | - | 19.59 tok/s (5.44 per stream) | 4 | 131,072 | 1 |

Per token at C1: 120 picks served from VRAM, 175 from RAM (152 of them computed by the CPU lane), 23 from NVMe.
Container peak was 49.3 GiB of 55, and the RAM tier held 4,830 experts (42.5 GiB).

**Lab acceptance** of image `99b8926e` (v4.1-nvme, the same `nvme` code as v4.2 for caps of 24 GiB and up), in
local-ai-registry PR [#187](https://github.com/sybil-solutions/local-ai-registry/pull/187) on 2026-10-08:

- Decode 17.3 tok/s, and prefill 844 tok/s on a 93,437-token prompt.
- All six gates pass: load, chat, reasoning, tools, context and speed.
- It ran with an 8 GB/s NVMe read cap (below).

**Full sweep, campaign arm S3b2 (2026-10-07).** These are the settings the image ships, measured in an earlier
session.

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 583 tok/s | 14.85 tok/s | 1 | 131,072 | 1 |
| 8,192 | - | 15.62 tok/s (7.87 per stream) | 2 | 131,072 | 1 |
| 8,192 | - | 16.27 tok/s (4.63 per stream) | 4 | 131,072 | 1 |
| 32,768 | 812 tok/s | 13.46 tok/s | 1 | 131,072 | 1 |
| 32,768 | - | not run | 2 | 131,072 | 1 |

Where the S3b2 decode picks were served: 39 % VRAM, 54 % RAM (the CPU lane computed 41 % of all picks), and 7 % NVMe.
NVMe reads totalled 20.2 TB over the 46-minute run, about 7 GB/s on average. Container `memory.peak` was 51.3 GiB.

## `nvme`, 16 GiB

**Screen, campaign build (s16_r48, 2026-10-08).** Run with `--memory 16g --memory-swap 16g`. The small-host budget
was set by hand here; v4.2-nvme applies it automatically below 24 GiB:

- `-rcs 1`
- `GLM53_NV_MARGIN_GB=1.5`
- `GLM53_NV_PF_RING=128`
- 48 readers x 1 MiB (`GLM53_NV_THREADS=48 GLM53_NV_PIECE_KB=1024`)

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 628 tok/s | 12.91 tok/s | 1 | 131,072 | 1 |
| 8,192 | - | not run | 2 | 131,072 | 1 |
| 8,192 | - | not run | 4 | 131,072 | 1 |
| 32,768 | not run | not run | 1 | 131,072 | 1 |
| 32,768 | - | not run | 2 | 131,072 | 1 |

- RAM tier: 970 experts (8.5 GiB). Container memory peaked at 14.4 GiB of 16.
- NVMe reads: 19.9 GB/s during C1 decode, against an array ceiling of about 26 GB/s.
- 16 readers x 2304 KiB (arm s16_r16) gave 12.57 tok/s.
- In local-ai-images PR #30, the v4.2 entrypoint at `--memory 16g` came up with a 955-slot RAM tier, peaked at 13.6
  GiB, and answered a chat correctly.
- No lab acceptance has been run at 16 GiB yet.

## `nvme-exact`, 55 GiB (campaign arm S2a, 2026-10-07)

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 564 tok/s | 8.28 tok/s | 1 | 131,072 | 1 |
| 8,192 | - | 8.23 tok/s (serial) | 2 | 131,072 | 1 |
| 8,192 | - | 8.28 tok/s (serial) | 4 | 131,072 | 1 |
| 32,768 | 806 tok/s | 7.74 tok/s | 1 | 131,072 | 1 |
| 32,768 | - | not run | 2 | 131,072 | 1 |

## `fast`, all experts in RAM (campaign run G067, 2026-10-01)

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 710 tok/s | 28.15 tok/s | 1 | 131,072 | 1 |
| 8,192 | - | 31.57 tok/s (15.78 per stream) | 2 | 131,072 | 1 |
| 8,192 | - | 33.98 tok/s (8.62 per stream) | 4 | 131,072 | 1 |
| 32,768 | 951 tok/s | 26.89 tok/s | 1 | 131,072 | 1 |
| 32,768 | - | not run | 2 | 131,072 | 1 |

Weights were on a Samsung 990 PRO. Run it with:

```bash
docker run -d --name glm53 --gpus '"device=0"' --ulimit memlock=-1 --shm-size 16g -p 127.0.0.1:30000:30000 \
  -e GLM53_MODEL_DOWNLOAD=0 -v /data/glm53:/models:ro \
  ghcr.io/0xsero/glm53-flash-offload@sha256:bb633b0bcb85573ad40b6c408af5e1036ae062c593e42479f4e4d2ab521e551d
```

## `exact`, all experts in RAM (campaign run G066a, 2026-10-01)

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | 697 tok/s | 12.57 tok/s | 1 | 131,072 | 1 |
| 8,192 | - | 12.62 tok/s | 2 | 131,072 | 1 |
| 8,192 | - | 12.64 tok/s | 4 | 131,072 | 1 |
| 32,768 | 945 tok/s | 11.86 tok/s | 1 | 131,072 | 1 |
| 32,768 | - | not run | 2 | 131,072 | 1 |

Run it with the `fast` command plus `-e GLM53_MODE=exact`. Stock exllamav3, with the experts that do not fit in VRAM on
its CPU worker, decodes this model at 7.5-8.4 tok/s on the same host.

## `nvme` + B70 expert tier, 55 GiB (campaign N137, 2026-10-09)

Same session, "tier off / tier on". Full tables, the 120 GiB pair and quality: [b70-tier.md](b70-tier.md).

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8k | 657 / 648-658 | 17.48 / 26.40-26.61 | 1 | 131k fp16 | 1 / 2 |
| 8k | - | 17.84 / 30.34-30.63 | 2 | 131k fp16 | 1 / 2 |
| 8k | - | 19.11 / 33.00-33.54 | 4 | 131k fp16 | 1 / 2 |
| 32k | 966 / 968-974 | 16.28 / 24.60-24.92 | 1 | 131k fp16 | 1 / 2 |
| 32k | - | 17.35 / 29.09 | 2 | 131k fp16 | 1 / 2 |

## Same-session pairs (what a setting is worth)

| pair, same session, 55 GiB `nvme` | A | B | change |
|---|---|---|---|
| layer-ahead prefetch off vs on (C1, 9,300 steady tokens each, 2026-10-08) | 14.21 tok/s, 40.2 NVMe misses/token | 16.04 tok/s, 21.9 misses/token | **+13 % with prefetch on** |
| NVMe reads uncapped vs capped at 8 GB/s (`--device-read-bps`) | C1 18.23, C4 19.59, prefill 650 | C1 16.84, C4 13.04, prefill 473 | **cap: -8 % C1, -33 % C4, -27 % prefill** |
| exact host-stalled NVMe engine (S1c) vs device-side engine + exclusive RAM tier (S2a), 2026-10-07 | C1 7.26, prefill 515 / 762 | C1 8.28, prefill 564 / 806 | +14 % decode |
| S2a vs S2a + CPU lane + prefetch (S3a), 2026-10-07 | C1 8.28 | C1 15.30 | +85 % decode, KL 0.0047 |
| RAM cap 55 vs 58 GiB, prefetch off (2026-10-07) | C1 14.71 | C1 14.75 (+341 RAM experts) | no measurable change |
| CPU-lane kernel ft_core vs N135 (`GLM53_NV_CPU_KERN` 0 vs 1, v4.3 image, 2026-10-09; B70 server on cpus 40-47 in both) | C1 17.70, C4 19.25, prefill 656; CPU 0.209 ms/expert | C1 18.80, C4 19.75, prefill 659; CPU 0.196 ms/expert | **+6.2 % C1, +2.6 % C4**; `MERGE=0` 18.71 / 19.66 (neutral) |

"Prefetch off is faster" (+27-35 %), reported earlier, compared arms run hours apart. The same-session pair above
reverses it. Analysis: `docs/latency-glm53-c1.md` in [moetier](https://github.com/sybil-solutions/moetier).

## Raw files

[`results/`](../results/) holds:

- campaign runs G067, G066a, C056, C052e, N119-S2a-55g, N119-S3a-55g, N119-S3b2-55g and N119-S3-decode-kl;
- the 2026-10-08 arms N129-pfon-55g (n129_pfon), N129-s16-r48-16g and N129-s16-r16-16g;
- the image smokes P001, P002b and P003.

Each campaign arm has:

- `cmd.txt`: the exact `docker run`
- `sweep.json` and `score.json`
- `server_info.json`
- memory and VRAM snapshots
- tier stats

The n55 screens and the same-session pairs are run records in moetier (`registry/runs/glm53-55g-pfon-*-pair.json`,
`glm53-c1lat-*.json`). Image smokes, quality method and reproduction pins: [reference.md](reference.md).
