# Troubleshooting

The container prints one `[glm53] ...` line for every check it makes at start. Run `docker logs glm53` first.

| symptom | cause | fix |
|---|---|---|
| `docker run` fails naming `/dev/nvidia1` or another GPU device that is not there | the CDI spec is stale after a GPU or driver change | `sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml` |
| `[glm53] ERROR: /nvx (...) does not support O_DIRECT reads/writes` | the store is on a filesystem that refuses `O_DIRECT`, such as a loop file on btrfs or a path inside some LUKS/FUSE setups | put the store on xfs or ext4 on a local NVMe drive and mount that directory at `/nvx`. `pack-store`, `verify-store` and the server all run this probe first |
| `[glm53] ERROR: /nvx is not a writable directory` during `pack-store` | the store directory is mounted read-only, or not mounted | mount it read-write for `pack-store` and `:ro` for serving |
| `NVMe store not found: /nvx/glm53_flash_exl3_3.05bpw_experts.bin` | the store was never packed, or a different directory is mounted | run `pack-store` and mount the same directory at `/nvx` |
| `GLM53_MODE=nvme sizes its RAM tier from the container memory cap` | no `--memory` was given | add `--memory 55g --memory-swap 55g`, or `16g`, or anything from 15g up |
| `container memory limit N GiB < ~15 GiB needed` | the cap is under `GLM53_NV_MIN_GB` | raise `--memory` |
| `container memory limit N GiB < ~24 GiB needed` | an image from before v4.2-nvme | use the v4.2-nvme digest from the README, or a cap of at least 24 GiB |
| `WARNING: memory.swap.max is ...`, or the container is OOM-killed (exit 137) | `--memory-swap` is not equal to `--memory`, so pages swap out to zram or swap files and escape the cap | set them equal. Keep `--shm-size 1g`: tmpfs pages count against the cap |
| `WARNING: locked-memory limit is ...` | the RAM tier is pinned with `cudaHostRegister` | add `--ulimit memlock=-1` |
| CUDA out of memory in `graph.cu` partway through a run, with a desktop on the same GPU | the display took VRAM after the cache sized itself | keep `-e GLM53_EC_MAX_SLOTS=1376`, or raise `GLM53_EC_RESERVE_GB`, or free VRAM |
| `[glm53] ERROR: CPUs outside this container's cpuset` | `GLM53_NV_CPU_CPUS`, `GLM53_MAIN_CPUS`, `GLM53_NV_CTL_CPU` or `GLM53_NV_READER_CPUS` name CPUs the container does not have | unset them to get a derived layout, or set them inside `--cpuset-cpus` |
| `CPU lacks avx2` (or `fma`, `f16c`) | the CPU lane needs AVX2, FMA and F16C | use `-e GLM53_MODE=nvme-exact`, which has no CPU lane |
| `no NVIDIA GPU visible` / `WARNING: N GPUs visible` | no GPU, or more than one, was passed in | pass exactly one: `--gpus '"device=0"'` |
| ` !! nv2 ERROR flag N` followed by an exit | a device-side wait passed `GLM53_NV_TIMEOUT_S`: 1 reply timeout, 2 ring full, 3-5 fix, copy or CPU wait, 16-19 a read or allocation error | check `dmesg` for NVMe or PCIe errors (`nvme ... timeout`, `AER`, `pciehp`). Run `verify-store`. Stop serving if the kernel log shows link faults |
| decode far below [results.md](results.md) | usually slow NVMe, a derived CPU layout, or a busy host | see "Slow decode" below |
| first answer after a long prompt arrives in bursts | an image older than `bb633b0b` (half-speed streaming) | use a current image. `python3 bench/stream_rate.py --url http://127.0.0.1:30000` passes when text arrives evenly |

## Slow decode

1. **The store drive.** Watch `iostat -x 1` (sysstat) on the NVMe devices during a request. At 55 GiB the measured
   array reads 7-9 GB/s on average, with bursts near 20 GB/s. At 16 GiB it reads ~20 GB/s during C1 decode. An 8 GB/s
   read cap alone cost 8 % of C1, 33 % of C4 and 27 % of prefill.
   - One PCIe 4.0 drive peaks around 7 GB/s, and lower at the queue depths used here. That configuration is not
     measured: expect the C4 and prefill losses of the 8 GB/s cap, or worse.
   - RAID0 across several drives helps most at small RAM caps.
2. **The CPU layout.** Look for the startup line `[glm53] nv2 CPU layout, ...`:
   - `measured layout`: the 40-CPU layout used for every table.
   - `derived from the container's N CPUs`: not measured. With fewer cores the CPU lane is slower, and it already
     finishes last in most layers on the measured 24-core EPYC.
3. **Other load.** Look for another process on the GPU (`nvidia-smi`), CPU-heavy jobs on the CPU-lane cores, or a
   desktop encoder. One busy host measured 5-8 % lower. Compare settings only back to back in the same session.
4. **The cache.** `curl -s localhost:30000/stats` shows the following:
   - `expert_cache[0].slots` and `hit_rate`. Fewer slots than expected means less free VRAM at start.
   - `nv2.ram_slots`, the size of the RAM tier.
   - `nv2.decode_per_token`: VRAM hits, RAM hits, NVMe reads and CPU experts per token. On the measured host at 55
     GiB these are about 120, 175, 23 and 150.

## Kernel-log guard

Before and after a long run, check that the host is healthy:

```bash
sudo dmesg --since "-10min" | grep -iE 'nvme.*timeout|AER|pciehp|Link Down|Card not present|mce|hung_task'
```

PCIe link faults during heavy NVMe and GPU traffic mean the bus is marginal. Stop the run; do not retry in a loop. Check
the slot's link speed with `sudo lspci -vv | grep -E 'LnkCap|LnkSta'`. Check the BIOS bifurcation setting for quad-M.2
cards (x4x4x4x4) and the PCIe generation.
