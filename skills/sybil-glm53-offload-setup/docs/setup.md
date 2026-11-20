# GLM-5.3-Flash single-GPU setup

Adapted from the pinned Sybil Solutions workflow distributed under the accompanying MIT license. Confirm the test host and local workspace before provisioning. Commands assume an approved Linux NVIDIA container runtime and a dedicated benchmark endpoint.

## Pins

| item | value |
|---|---|
| image (NVMe modes) | `ghcr.io/sybil-solutions/glm53-flash-offload@sha256:aa74200f16c86588b101be2315aed2f643d148559179eef52a02599016b56e69` (v4.6-nvme, repo `0fbc0c5`) |
| image (all-RAM `fast` / `exact`) | `ghcr.io/0xsero/glm53-flash-offload@sha256:bb633b0bcb85573ad40b6c408af5e1036ae062c593e42479f4e4d2ab521e551d` |
| weights | `turboderp/GLM-5.3-Flash-exl3`, revision `332ab457b709b7ba30dd9a448be5de03b80a7ac9` (branch 3.05bpw), 125.3 GB |
| expert store | built from the weights by the image: 117.3 GB, 12,384 records of 9,474,048 B |
| Benchmark scripts and quality panel | Included with this skill. The client scripts require Python 3 and its standard library. |

## Step 1: detect the hardware

Run these and keep the answers. Each one says what it is for.

```bash
# GPU: name, VRAM, driver, PCIe link, and what is already running on it
timeout 20 nvidia-smi --query-gpu=index,name,memory.total,memory.used,driver_version,pcie.link.gen.max,pcie.link.gen.current,pcie.link.width.current --format=csv
timeout 20 nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv
# CPU: logical CPUs, cores, AVX2 / FMA / F16C
nproc; lscpu | grep -E 'Model name|^CPU\(s\)|Thread|Core|Socket|NUMA node\(s\)'
grep -o -w -E 'avx2|fma|f16c' /proc/cpuinfo | sort -u
# RAM: total and available, swap/zram, and any cgroup limit on this shell
free -g; swapon --show; cat /sys/fs/cgroup/memory.max 2>/dev/null
# Storage: NVMe drives, filesystems, RAID, free space
lsblk -o NAME,MODEL,SIZE,TYPE,FSTYPE,MOUNTPOINTS,ROTA,TRAN
cat /proc/mdstat; findmnt -t xfs,ext4,btrfs,zfs -o TARGET,SOURCE,FSTYPE,OPTIONS
df -h
for d in /sys/class/nvme/nvme*; do echo "$d $(cat $d/model) link $(cat $d/device/current_link_speed 2>/dev/null) x$(cat $d/device/current_link_width 2>/dev/null)"; done
# Docker and the NVIDIA runtime
timeout 10 docker info --format '{{.ServerVersion}} {{.Runtimes}}' ; nvidia-ctk --version
ls -l /etc/cdi/ /var/run/cdi/ 2>/dev/null; timeout 10 nvidia-ctk cdi list 2>/dev/null
command -v hf || command -v huggingface-cli
```

Then answer these questions:

- **GPU.** Is it 24 GB or more, with a driver that supports CUDA 13.0 (580 or newer)? The image is built for sm_86
  (RTX 3090 / A5000); sm_89 (RTX 4090) runs the same binaries, but not measured. Blackwell (RTX 5090, sm_120) needs
  the image rebuilt with `--build-arg TORCH_CUDA_ARCH_LIST="8.6;12.0"`, also not measured. Below 23,000 MiB the
  entrypoint refuses to start.
- **GPU link.** The reference host runs PCIe 4.0 x16. A Gen3 or x8 link slows the admission copies, which are 28 % of
  a decode token on the reference.
- **CPU.** Does it have AVX2, FMA and F16C (needed by the CPU lane in `nvme` and `fast`)? How many physical cores and
  logical CPUs? The measured layout needs 40 logical CPUs (cpus 2-39).
- **RAM.** How much is available for this server, after what the user needs for everything else? Is swap or zram on?
  It is fine to leave it on, as long as the container sets `--memory-swap` equal to `--memory`.
- **NVMe.** Which drive or array is fastest, and is it local NVMe with xfs or ext4? Is there a RAID0? Does it have
  117.3 GB free for the store? The 125.3 GB of weights can go on any disk; only their non-expert part is read, once at
  load.
- **Docker.** Does Docker answer? Is the NVIDIA container toolkit installed, and is the CDI spec current (see
  Troubleshooting)?

## Step 2: choose the mode

**RAM** below means the memory you will give the container (`--memory`). Leave the user's normal working set free.

| situation | mode and cap | expect on the reference host |
|---|---|---|
| ≥ 240 GB free, AVX2, about 24 cores | `fast`, all-RAM image, no cap | 28.2 tok/s C1, 34.0 C4, prefill 710 / 951 |
| needs bit-exact output, ≥ 120 GB free | `exact`, all-RAM image | 12.6 tok/s, bit-exact |
| ≥ 60 GB free + NVMe | `nvme`, `--memory 55g` | 17.3 tok/s C1 (14.9-18.2 across sessions), C4 up to 19.6, prefill 662 / 965 |
| 17-60 GB free + NVMe | `nvme`, `--memory` = what you can spare, at least 15g (the small-host budget applies below 24g) | 16 GiB: 12.9 tok/s C1, prefill 628 |
| bit-exact output in a small cap, or no AVX2 | `nvme-exact`, `--memory 55g` (or less) | 8.3 tok/s, bit-exact |
| under 15 GiB to spare, under 24 GB VRAM, or no NVMe | not supported | the entrypoint refuses |

Notes:

- With 120-240 GB free, `nvme` with a cap of 55g or more beats `exact` (17 vs 12.6 tok/s) unless outputs must be
  bit-exact. Caps above 58 GiB are not measured; 58 vs 55 GiB showed no difference.
- `nvme` decode is near-exact: paired decode KL 0.0047-0.0051, top-1 agreement 0.983-0.986. Prefill is exact in every
  mode.

Reference host: 1x RTX 3090 (PCIe 4.0 x16), EPYC 7443P (24 cores, 48 threads), 8-channel DDR4, and 4x Samsung 9100 PRO
1 TB in md RAID0 (512k chunk, xfs) on a PCIe 4.0 x16 card (~26 GB/s).

**What to expect on weaker hardware.** None of this is measured. Say so to the user, and measure.

- **One NVMe drive instead of a RAID0.** A Gen4 drive peaks around 7 GB/s. On the reference, capping the array at
  8 GB/s cost 8 % of C1, 33 % of C4 and 27 % of prefill at 55 GiB. Expect at least that.
  - At 16 GiB, decode read ~20 GB/s on the reference, so one drive will be much slower there. Give it as much RAM as
    you can.
  - A Gen3 drive (~3.5 GB/s) is worse again.
- **Fewer cores.** The CPU lane runs one thread per physical core (22 on the reference), and it already finishes last
  in 54-86 % of layers. Fewer cores means a slower lane. Measure `nvme` against `nvme-exact`: with very few cores the
  lane may not pay off.
- **2-channel DDR.** At C1 the reference moves ~48 GB/s through DRAM, 35 % of its ~138 GB/s. A 2-channel desktop has a
  much lower peak, so DRAM may become a limit.
- **GPU on PCIe Gen3 or x8.** Admission copies run at ~14.5 GB/s on the reference's Gen4 x16. On a slower link they
  take longer.
- **More VRAM** (32 GB, 48 GB). The cache sizes itself from free VRAM, so you get more slots and more hits. Drop the
  `GLM53_EC_MAX_SLOTS` cap, or raise it.

Tell the user which mode you chose and why, and what to expect. Then continue.

## Step 3: prepare the store location (only if needed)

The store needs a local NVMe filesystem that supports `O_DIRECT`: plain xfs or ext4 on the drive or on an md RAID0.

- **Not suitable:** a loop file on btrfs, network filesystems, FUSE, or tmpfs. Some LUKS setups refuse `O_DIRECT` too.
- **Check it** with the image's own probe. It needs no GPU:
  ```bash
  IMG=ghcr.io/sybil-solutions/glm53-flash-offload@sha256:aa74200f16c86588b101be2315aed2f643d148559179eef52a02599016b56e69
  timeout 900 docker pull "$IMG"
  mkdir -p /path/on/nvme/glm53 && docker run --rm -v /path/on/nvme/glm53:/nvx "$IMG" python3 /opt/glm53/docker/preflight.py odirect /nvx && echo O_DIRECT_OK
  ```
Use an existing scratch filesystem. Modifying system storage or firmware requires its own procedure.

## Step 4: download the weights (pinned)

```bash
W=/path/to/GLM-5.3-Flash-exl3-3.05bpw     # 125.3 GB, any local disk
hf download turboderp/GLM-5.3-Flash-exl3 --revision 332ab457b709b7ba30dd9a448be5de03b80a7ac9 --local-dir "$W"
test -f "$W/config.json" && test -f "$W/quantization_config.json" && du -sh "$W"
```

If the `hf` CLI is missing, use a project-approved installation in an isolated environment. Confirm download scope and capacity first.

## Step 5: pack and verify the store

```bash
S=/path/on/nvme/glm53
docker run --rm -v "$W":/models:ro -v "$S":/nvx "$IMG" pack-store
docker run --rm -v "$W":/models:ro -v "$S":/nvx:ro "$IMG" verify-store
ls -l "$S"    # glm53_flash_exl3_3.05bpw_experts.bin (117,326,610,432 B) + .json
```

`pack-store` does three things: it writes every record, re-reads each one with `O_DIRECT` and checks its sha256, and
byte-compares 300 sampled records against the checkpoint. It runs on the CPU only. `verify-store` repeats the sha256
pass; it took 11 s on the reference array.

- Any `bad` count above 0 is a failure. Do not serve from that store.
- The `verify-store` speed is a first read on the drive's speed: 6-11 GB/s on the reference. A much lower number
  predicts slow decode.

## Step 6: run

Set `CONTAINER` to a unique name for this test. Check that the selected GPU and loopback port are free.

```bash
docker run -d --name "$CONTAINER" --gpus '"device=0"' \
  --memory 55g --memory-swap 55g --shm-size 1g --ulimit memlock=-1 \
  -e GLM53_MODE=nvme -e GLM53_EC_MAX_SLOTS=1376 \
  -p 127.0.0.1:30000:30000 -v "$W":/models:ro -v "$S":/nvx:ro "$IMG"
timeout 600 sh -c 'until curl --max-time 4 -sf http://127.0.0.1:30000/health >/dev/null; do sleep 5; done' && echo READY
docker logs "$CONTAINER" 2>&1 | grep -E '^\[glm53\]|nv2: rcs|RAM tier|nv2 CPU tier|startup verify|loaded in'
```

Adjust the command:

- **Device.** `device=N` is the idle GPU from step 1.
- **Memory.** `--memory` and `--memory-swap` take the same value: your cap from step 2.
- **Mode.** `GLM53_MODE` is `nvme` or `nvme-exact`.
- **Expert cache cap.** Keep `GLM53_EC_MAX_SLOTS=1376` when a desktop runs on the same GPU. On a headless GPU you can
  leave it out.
- **CPU pinning.** With 40 or more logical CPUs, add nothing, or add `--cpuset-cpus 2-39` to fence the server's
  threads off the rest of the system as the reference did. With fewer CPUs, add nothing; the layout is derived.
- **All-RAM modes.** Use the all-RAM image with `--shm-size 16g --ulimit memlock=-1`, no `--memory`, no `/nvx`, and
  `-e GLM53_MODE=exact` when needed.

Check the startup lines. Write down these values for the report:

- the RAM tier size (`-> RAM tier N slots`)
- the expert-cache slots (`curl -s localhost:30000/stats`, `expert_cache[0].slots`)
- the CPU layout line (`measured layout` or `derived`)
- the startup verify result: the `nv2 startup verify` line should show `'vram_bad': 0` and `'ram_bad': 0`

## Step 7: smoke test

Send one chat request with no output limit, and let it finish:

```bash
curl --max-time 300 -sf http://127.0.0.1:30000/v1/chat/completions -H 'content-type: application/json' -d '{"model": "glm-5.3-flash",
  "messages": [{"role": "user", "content": "Explain in a few paragraphs how a jet engine works."}]}' \
  | python3 -c 'import json,sys; r=json.load(sys.stdin); m=r["choices"][0]; print(m["finish_reason"], r.get("usage")); print((m["message"]["content"] or "")[:600])'
```

Pass when `finish_reason` is `stop` and the text reads as coherent English. The reasoning is in
`message.reasoning_content`. To turn thinking off, add `"chat_template_kwargs": {"enable_thinking": false}`.

The server speaks OpenAI Chat Completions, with streaming and `tools`, plus `/v1/completions` and `/v1/models`. Base
URL: `http://127.0.0.1:30000/v1`. Model: `glm-5.3-flash`. Any API key works.

## Step 8: measure (the standard table)

From the experiment directory, with the server idle, set `SKILL_DIR` to the installed skill folder and run:

```bash
python3 "$SKILL_DIR/bench/sweep.py" --url http://127.0.0.1:30000 --card mybox --config "v4.6-nvme nvme 55g" --template glm \
  --prefill 8192 32768 --conc 1 2 4 --reps 3 --dec-reps 2 --no-early-exit --out sweep_A.json
python3 "$SKILL_DIR/bench/score_ref_panel.py" --url http://127.0.0.1:30000 --panel "$SKILL_DIR/reference/glm-5.3-flash-exl3-ref-panel.json" --out score_A.json
```

The sweep measures:

- prefill at 8k and 32k: 3 fresh prompts each, median;
- decode at C1, C2 and C4: chat answers run to their natural end, 2 rounds;
- C1 decode with a 32k-token context.

It takes 30-60 minutes. The panel should give top-1 1.0000 and KL 0, because prefill is exact in every mode.

Report the result in this table. Fill one row per cell, and write "not run" for anything the sweep does not cover.
`sweep.py` has no C2 at 32k.

| prefill size | prefill speed | decode speed | concurrency | kv cache | gpu count |
|---|---|---|---|---|---|
| 8,192 | `prefill["8192"].median` | `decode["C1"].aggregate.median` | 1 | 131,072 | 1 |
| 8,192 | - | `decode["C2"]` aggregate (per stream) | 2 | 131,072 | 1 |
| 8,192 | - | `decode["C4"]` aggregate (per stream) | 4 | 131,072 | 1 |
| 32,768 | `prefill["32768"].median` | `decode["C1@32k"]` | 1 | 131,072 | 1 |
| 32,768 | - | not run | 2 | 131,072 | 1 |

Also save `curl -s localhost:30000/stats`. It holds the hit rates, the picks served per token from each tier, and the
container memory peak.

## Step 9: tune one setting at a time

Rules:

- Change one setting per arm.
- Run a control with the current best settings in the same session, right before or after the arm. On the reference,
  arms run hours apart differed by up to 17 % with no change at all.
- To screen, use `--prefill 8192 --conc 1 4` (about 15 minutes). Then run the full table for the winner.
- Restart the container for every arm, because settings are read at start.
- Keep a change only if it beats the same-session control by more than the run-to-run spread, about ±5 %.

| setting | try | why | watch |
|---|---|---|---|
| `GLM53_EC_MAX_SLOTS` / `GLM53_EC_RESERVE_GB` | headless GPU: drop the cap. Larger card: let it grow. Shared GPU: keep 1376 and a 1.5 GB reserve | more VRAM slots, more hits | `expert_cache[0].slots`. A CUDA OOM in `graph.cu` means the reserve is too small |
| `--memory` (RAM tier) | as much as the user can spare | more RAM hits, fewer NVMe reads | `nv2.decode_per_token.nvme`, container peak |
| `GLM53_NV_CPU_CPUS` / `GLM53_NV_CPU_THREADS` | one thread per physical core, leaving 2 cores for the main and controller threads. Keep readers on the SMT siblings | CPU-lane speed | `nv2.decode_per_token.cpu_busy_ms`, the CPU layout line |
| `GLM53_NV_PREFETCH` | 1 (default) vs 0 | NVMe misses vs extra reads | `nvme` per token. On the reference, 1 is 13 % faster at C1 in the same session |
| `GLM53_NV_THREADS` / `GLM53_NV_PIECE_KB` | 16 x 2304 vs 32-48 x 1024 | queue depth on your drives | `iostat -x 1` read GB/s; reference at 16 GiB: 48 x 1024 gave 12.91 vs 12.57 tok/s |
| `GLM53_MODE` | `nvme` vs `nvme-exact` on weak CPUs | whether the CPU lane pays off | C1, and exactness if the user needs it |

About prefetch: `GLM53_NV_PREFETCH` accepts only `0` and `1` in v4.2-nvme. The campaign code had an adaptive mode `2`,
on only at C1, but v4.2 reads `2` as off. Do not use it unless the user runs a build that has it.

**Quality check after any change.** Run the panel (`score_ref_panel.py`); expect 1.0000 / 0. For changes that touch
the CPU lane, also run the paired decode-KL check. Stop the server first, because it needs the GPU. Use the same flags
as the server:

```bash
docker run --rm --gpus '"device=0"' --memory 55g --memory-swap 55g --shm-size 1g --ulimit memlock=-1 \
  -e GLM53_MODE=nvme -e GLM53_EC_MAX_SLOTS=1376 -v "$W":/models:ro -v "$S":/nvx:ro -v "$PWD":/out "$IMG" \
  decode-kl --kl-out /out/decode_kl.json
```

The reference gives mean KL 0.0047-0.0051 and top-1 0.983-0.986 with the CPU lane on. The control pass gives 0 / 1.0.

## Troubleshooting

| symptom | fix |
|---|---|
| `docker run` names a missing `/dev/nvidiaN` | stale CDI spec: `sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml` (ask first) |
| `does not support O_DIRECT` | move the store to xfs or ext4 on local NVMe (step 3) |
| OOM kill (exit 137), or `memory.swap.max` warning | set `--memory-swap` equal to `--memory`, and keep `--shm-size 1g`. zram or swap otherwise lets pages escape the cap |
| `container memory limit ... needed` | the cap is under 15 GiB, or the image is older than v4.2-nvme |
| decode far below expectation | 1. run `iostat -x 1` during decode, to check the store drive is the fast one and not throttled; 2. check the CPU layout line; 3. look for other GPU or CPU load; 4. compare in the same session (see [troubleshooting](troubleshooting.md)) |
| `nv2 ERROR flag` and exit | check `dmesg` for NVMe or PCIe errors and run `verify-store`. If the kernel log shows link faults (`AER`, `pciehp`, `Link Down`), stop GPU and NVMe load and tell the user. Do not loop restarts |
| first answer is slow after a short prompt | expected: the recurrent-state tail forward re-streams experts (~4 s time to first token on short prompts at the reference) |

## Report to the user

Keep it short:

1. **Hardware found.** GPU and link, CPU cores and threads, RAM, store drive or array and filesystem.
2. **Mode and settings.** Mode, `--memory`, image digest, any `-e` you changed, RAM tier slots, cache slots, CPU layout.
3. **The standard table** from step 8, for the final settings.
4. **Against the reference.** Your C1, C4 and prefill next to the reference row for the same mode, with the likely
   reason for any gap: drive speed, cores, DRAM channels, PCIe, or VRAM.
5. **Tuning arms.** Setting, control, arm, result, and kept or not.
6. **Quality.** The panel result, and the decode KL if you ran it.
7. **How to use it.** Base URL `http://127.0.0.1:30000/v1`, model `glm-5.3-flash`.
