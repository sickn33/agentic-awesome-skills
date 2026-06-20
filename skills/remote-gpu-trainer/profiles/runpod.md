---
platform: runpod
kind: ssh-rental
meter_stop_verb: terminate       # stop releases the GPU but STILL bills volume disk at 2×; only terminate halts the meter
meter_stop_irreversible: true    # terminate deletes container + volume disk; only a Network Volume survives
detach_primitive: tmux           # apt-install first; survives SSH drop, NOT a Pod stop/restart
spot_available: true
spot_grace: ~5s                  # SIGTERM → SIGKILL window on Spot/interruptible preemption
shared_fs: false                 # global networking = private IP only; a Network Volume is shared within ONE datacenter, not a global FS
inode_cap: none                  # per-tier GB quotas, no documented inode cap
free_egress: true                # no egress fees; download/upload to the open internet is free
china_mirror_needed: false       # no mainland-China DC, no GFW — use HF_HUB_ENABLE_HF_TRANSFER=1, not a mirror
host_driver_cuda_max: image-dependent   # host driver varies per machine; pick via the CUDA-Version filter (RP9)
local_nvme: true
---

# RunPod — platform profile

One-line purpose: the per-platform substrate for RunPod Pods — **the Docker image IS the env contract**, a three-tier storage model where the durable mount differs from the parking one, and a teardown verb (`terminate`) that DELETES the volume disk. Read this before Phase 0; it owns every path, port, billing verb, and spot rule the SKILL.md phases delegate here. Universal gotchas are NOT repeated — see `references/gotchas_universal.md`.

> **Surface to the user up front (principle #10):** convenience — RunPod's HTTP proxy auto-HTTPS-exposes TB/Jupyter (no tunnel). ⚠️ Danger clocks — a **stopped Pod still bills its volume disk at 2×** and may restart with **zero GPUs** (RP1/RP4), so stop is NOT safe parking; a **low account balance auto-deletes** the Pod; the **~5 GB container disk** silently fills (redirect caches, §8). Decouple durable state onto a Network Volume + **terminate** to truly stop the meter.

To jump: `grep -in <keyword> profiles/runpod.md` (e.g. `terminate`, `network volume`, `scp`, `zero-gpu`, `CUDA`, `interruptible`).

Table of contents: 1 LAUNCH · 2 STORAGE MODEL · 3 NETWORK · 4 SPOT / INTERRUPTION + RESUME · 5 TEARDOWN / BILLING · 6 DAEMON TOOL · 7 TOP GOTCHAS (+ Platform-specific debugging) · 8 SCRIPT OVERRIDES

**Mental-model shift vs AutoDL (the one fact that breaks portability):** AutoDL persists `/root` across a power-off, so "关机 to save money, restart later" is safe. On RunPod a stopped Pod is **pinned to one physical machine and its GPU can be rented away** (zero-GPU-on-restart, RP1), AND it still bills the volume disk at 2× (RP4). Stop is *not* a safe parking spot. Decouple durable state onto a **Network Volume** and **terminate** to truly stop the meter.

---

## 1. LAUNCH

A Pod = one Docker container on a GPU host. Five entry points to the same primitive:

- **Web console** — pick GPU + a template (Docker image), Secure or Community Cloud, On-Demand or Spot/interruptible. A template (image + ports + env + volume mount) is the unit of reproducibility.
- **`runpodctl` CLI** — `runpodctl create pod --imageName=<img> --gpuType=<id>`, then `start|stop|remove pod <id>`, `get pod`. Every official-template Pod ships `runpodctl` pre-installed with a pod-scoped key (verified docs.runpod.io/runpodctl 2026-06).
- **REST API** — the current first-class automation surface: `POST /v2/pods` (and `/pods/{id}/start|stop`, `DELETE`). The create body takes `cloudType: SECURE|COMMUNITY` and **`interruptible: true|false`** for Spot (verified docs.runpod.io/api-reference/pods/POST/pods 2026-06). **(NEW — current fact)** The newer REST create-Pod input has **no `bidPerGpu` field**; interruptible is a plain boolean. The legacy **GraphQL** `podRentInterruptable`/`bidPerGpu` bid mutation still exists for the old API surface — if a script sets a bid, it is on the GraphQL path, not REST.
- **Python SDK** — `runpod` pip package, wraps the API + the serverless-worker SDK.
- **Custom Docker image** — any image works; official RunPod templates pre-configure an SSH daemon + a `/start.sh`, but a **custom image must start `sshd` itself** and must use **`CMD`, not `ENTRYPOINT`** (RP10).

**Env contract — the image IS the env.** RunPod hands over a container the caller specifies, not a prebuilt base conda env (the AutoDL model). Pin the image by `@sha256:` digest, not `:latest`, for reproducibility. "Running in `base` is fine" still holds (the container is ephemeral) — but any env, conda/pip install, or code that lives **outside the volume mount (`/workspace`)** vanishes on stop (§2). Install long-lived envs under `/workspace`, or bake them into the image.

---

## 2. STORAGE MODEL  *(survival matrix — principle #4)*

Three tiers, each with different survival semantics. This is the most error-prone area on RunPod.

| Tier | Path | Speed | Cap | Price (verified docs.runpod.io/pods/pricing + storage/types 2026-06) |
|---|---|---|---|---|
| Container disk | `/` (overlay fs, system-managed) | local NVMe | GB quota; **default ~5 GB if not raised** | $0.10/GB/mo running, **not charged when stopped** |
| Volume disk (per-Pod) | `/workspace` (default) | local NVMe | GB quota, **grow-only** | $0.10/GB/mo running, **$0.20 stopped (2×)** |
| Network Volume | `/workspace` (Pods) · `/runpod-volume` (Serverless) · `/workspace` per-node (Instant Clusters) | networked | 4 TB soft ceiling (**>4 TB needs support**) | Standard $0.07/GB/mo (→$0.05 over 1 TB); **High-Performance $0.14/GB/mo (~3× throughput)** |

**Survival matrix:**

| Tier | Survives STOP? | Survives TERMINATE? | Portable across Pods? |
|---|---|---|---|
| Container disk | **No** (wiped on stop) | No | No |
| Volume disk | **Yes** (retained until Pod deleted) | **No** (deleted on terminate) | No (pinned to that Pod) |
| Network Volume | Yes | **Yes** | **Yes** (shareable within ONE datacenter) |

**Checkpoints MUST go to a Network Volume** if `terminate` is the intended teardown verb (§5) — the per-Pod volume disk is deleted by terminate, so durable-but-only-stop-safe state on `/workspace` is lost the moment the meter is truly stopped.

Critical properties:
- **Container disk default is tiny (~5 GB)** — pip wheels, the HF cache, apt and conda all land on `/` by default and silently fill it; raise container-disk size at create time OR redirect every cache onto `/workspace` (RP11, §7-debug).
- **Volume disk grows, never shrinks** — over-provision conservatively; shrinking requires a fresh Pod (verified docs.runpod.io/pods/storage/types: "Increase only" 2026-06).
- **Network Volume is datacenter-locked** — attaching one constrains all future GPU deployment to that DC, which "may limit GPU availability and reduce failover options" (verified docs.runpod.io/pods/storage/create-network-volumes 2026-06); on a Pod it must be attached **at creation and cannot be detached later** (RP7). Cross-DC moves are manual: rsync/`runpodctl` between two bridge Pods, or the **S3-compatible API** (manage files without launching compute).
- **Concurrent-write corruption** — "writing to the same volume from multiple workers simultaneously may cause data corruption" (verified same page 2026-06). Serialize writers; for parallel-ablation fan-out give each cell an **isolated write path** (see `references/parallel_ablation.md`).
- **No documented inode cap** — RunPod specs GB quotas, not inode counts. Audit GB usage with `du` on the actual mount; the `df -i` discipline from `references/gotchas_universal.md` still applies on any small-many-files eval tree, but there is no AutoDL-style hard ~200K ceiling.
- **Network Volumes cannot be encrypted** and are visible to every attached Pod — never write a secret there (§8).
- **Global networking ≠ shared FS** — RunPod global networking gives Pods a private IP (`<POD_ID>.runpod.internal`) for Pod-to-Pod traffic, NOT a shared filesystem (verified docs.runpod.io/pods/networking 2026-06). Shared *storage* is still a Network Volume, single-DC.

---

## 3. NETWORK

- **Egress / proxy / China mirror: N/A.** Free egress, regions across NA + Europe + Oceania + Asia-Pacific (e.g. `AP-IN-1` India added 2026-04), **no mainland-China datacenter** (verified runpod.io/blog/new-runpod-datacenter-now-live-ap-in-1 2026-06). No `/etc/network_turbo` equivalent and no China mirror needed; `pip`/`hf`/`apt` reach the open internet directly. For HF big-shard stalls the fix is **not** a mirror — `pip install huggingface_hub[hf_transfer]` + `export HF_HUB_ENABLE_HF_TRANSFER=1`, and point `HF_HOME` at the Network Volume so re-downloads survive Pod churn (RP-G4 / RP11 below; transport verbs → huggingface-skills:hf-cli **REQUIRED**).
- **Two ways to expose a service** (verified docs.runpod.io/pods/configuration/expose-ports 2026-06):
  1. **HTTP proxy** — `https://<POD_ID>-<INTERNAL_PORT>.proxy.runpod.net`, auto-HTTPS. **Hard 100 s Cloudflare timeout** — a service that doesn't respond within 100 s closes with a **524**; long/streaming/large-payload requests die. Fine for TensorBoard (6006) / Jupyter (8888) UI; bites WebSockets and long polls.
  2. **Direct TCP** — public IP + a **random external port** that changes on every Pod reset. Required for SSH-scp, DBs, WebSockets, long polls. Request a port number **above 70000** in the TCP config to get a **symmetric (external == internal) mapping** ("not valid port numbers, but signal Runpod to allocate matching internal and external ports").
- One port cannot be exposed on both HTTP and TCP simultaneously.
- **Public IP stability differs by cloud (NEW — current fact):** Community Cloud public IPs **may change on migration/restart**; Secure Cloud IPs "should remain stable" (verified expose-ports 2026-06). A pinned SSH target is safer on Secure Cloud.
- **SSH flavors — proxied SSH cannot transfer files.** *Basic SSH* proxies through `ssh.runpod.io` (works everywhere but **does NOT support `scp`/`sftp`/`rsync`**). *Full SSH* is direct-TCP to the Pod's public IP on exposed port 22 (supports `scp`/`rsync`, needs a public-IP Pod + TCP 22 exposed + SSH daemon running + the key on the account). For bulk code/data transfer, full SSH is mandatory (RP6). Without a public IP, **`runpodctl send` / `receive`** (one-time code, no API key, pre-installed) moves files — but it is rated for **small-to-medium files only**; use full-SSH rsync for large datasets (RP12). SSH-config + resumable-rsync patterns → `references/ssh_transport.md`.

---

## 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*

Two purchase modes, two distinct interruption vectors:

- **Spot / interruptible** — set `interruptible: true` (REST) or bid via legacy GraphQL. Roughly **~50% cheaper** than On-Demand (verified runpod.io/blog/spot-vs-on-demand-instances-runpod: e.g. A6000 spot $0.232 vs on-demand $0.491/gpu/hr 2026-06; marketing elsewhere cites "up to 60%"). Interruption is **"without notice"** — another user's On-Demand request can reclaim the GPU. Detection signal: **`SIGTERM`, then `SIGKILL` ~5 s later** — only enough to flush a flag or trigger an already-frequent checkpoint, NOT to write a fresh large checkpoint.
- **On-Demand** — non-interruptible while running, but carries the sneakier **zero-GPU-on-restart** trap (RP1): a stopped Pod is pinned to its host, and if that GPU is rented away the Pod can only restart **with zero GPUs** ("there are no GPUs available on the machine where your Pod was running" — verified docs.runpod.io/references/faq 2026-06). Use it as a data-recovery startup, not a compute one.

**Both vectors demand the same design:** checkpoint full state **continuously on a timer to a Network Volume** (atomic temp→fsync→rename), load-latest **unconditionally** on startup, and relaunch on a **fresh host** — never assume the same machine/GPU is available after a stop. The ~5 s grace is an opportunistic last-flush only, never the primary durability mechanism. Cadence formula (Young/Daly) and atomic-resume pattern → `references/spot-resilience.md`.

---

## 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law)*

| Action | Stops compute billing? | Stops storage billing? | Deletes data? |
|---|---|---|---|
| **Stop** | Yes (releases GPU) | **No — bills volume disk at 2× ($0.20/GB/mo)** | No, but GPU may be lost on restart (zero-GPU, RP1) |
| **Terminate** | Yes | Yes (for that Pod) | **Yes — deletes container + volume disk, irreversible.** Only a Network Volume survives |

- **Stop is a trap, not a safe park.** It does not stop the meter (volume disk keeps billing, *doubled*), and it risks zero-GPU lock-out. A long-stopped Pod quietly bleeds money — `terminate` + Network Volume is cheaper for any idle gap longer than a short pause.
- **Terminate is the meter-stop verb AND it is destructive.** "Terminating permanently deletes all data not stored in a network volume. Export important data first." (verified docs.runpod.io/pods/manage-pods 2026-06). Move every needed artifact to a Network Volume (then billed at $0.07/GB/mo) or off-platform **before** terminating. If checkpoints are still only on the per-Pod **volume disk** at teardown time, `rsync` them to a Network Volume **or pull them local first** — a Network Volume cannot be attached to an existing Pod after creation (§2 / RP7), so this rescue must happen while the Pod is still alive.
- **Low-balance auto-stop → silent deletion (NEW — billing trap).** When the account balance can no longer cover remaining runtime, RunPod **auto-stops all Pods**; storage then keeps accruing on the stopped volume disk, and **a depleted balance can have Pods + storage deleted with no backup** ("Runpod cannot restore data once a resource has been terminated due to insufficient balance… does not maintain backups" — verified contact.runpod.io Data-Loss-on-Low-Balance 2026-06). Separately, **stale stopped Pods are removed after ~30 days** of non-use. Disk charges are **non-refundable**. Net: a forgotten Pod first drains credit, then loses data — enable Auto-Pay or terminate-with-Network-Volume before walking away.
- **Billing granularity:** compute + container/volume disk bill **per second**; Network Volumes bill **hourly** (verified docs.runpod.io/references/billing-information 2026-06).
- Savings Plans are prepaid 3- or 6-month non-refundable commitments — a separate billing knob, orthogonal to stop/terminate.

> **Teardown Iron Law (SKILL.md Phase 5):** NO `terminate` until checkpoints are **pulled to local OR confirmed present on a Network Volume, AND verified by load**, and the user has explicitly approved the cost-affecting action. On RunPod the meter-stop verb is irreversible by design and there is **no backup safety net** (low-balance deletion above) — "it looked done in the log" is not evidence (principle #3). Cross-link: superpowers:verification-before-completion **REQUIRED**.

---

## 6. DAEMON TOOL

- **tmux** — available but **not installed by default**: `apt-get update && apt-get install -y tmux`. Survives an SSH disconnect; **does NOT survive a Pod restart/stop** (sessions are process-scoped to the container). `screen`/`nohup` are likewise process-scoped — use `nohup <cmd> </dev/null >log 2>&1 &` if tmux is unavailable.
- **Native queue: Serverless** — RunPod's request→worker→result→scale-to-zero system. `executionTimeout` and `ttl` each cap at **7 days** (TTL is a hard kill even mid-job). It is request/response-shaped, designed for inference/batch — **the wrong tool for interactive long training**.
- **For multi-day training: Pod + tmux + frequent checkpoints to a Network Volume**, orchestrated via `runpodctl`/REST. The detach primitive (tmux) is the swappable plug; the checkpoint-to-durable + resume-from-latest spine (principle #8) is what actually survives the restart tmux cannot.

---

## 7. TOP GOTCHAS  (platform-pinned; universal ones → `references/gotchas_universal.md`)

- **RP1 — Zero-GPU-on-restart.** Symptom: a stopped Pod restarts with no GPU attached and refuses compute work ("Zero GPU Pods"). Root cause: a stopped Pod stays bound to its physical host; another user rented that GPU while it was stopped. Fix: keep all durable state on a **Network Volume**, terminate instead of stop, relaunch on a fresh host. (verified docs.runpod.io/references/faq 2026-06)
- **RP2 — Container disk wiped on stop.** Symptom: code, conda/pip env, or checkpoints gone after a stop. Root cause: only `/workspace` (volume disk) or a Network Volume survives a stop; container disk (`/`) is cleared. Fix: install envs and write all state under `/workspace` (or the Network Volume).
- **RP3 — Terminate deletes the volume disk irreversibly.** Symptom: one `remove pod` loses all checkpoints. Root cause: terminate permanently deletes container + volume disk; only a Network Volume persists. Fix: move artifacts to a Network Volume (or local) and verify-by-load before terminating (Iron Law, §5).
- **RP4 — Stopped storage costs double.** Symptom: a "stopped to save money" Pod keeps charging, faster than expected. Root cause: stopped volume disk bills at $0.20/GB/mo (2× the running rate) and never reaches zero. Fix: for idle gaps, terminate-with-Network-Volume instead of stopping.
- **RP5 — HTTP-proxy 100 s Cloudflare timeout.** Symptom: long/streaming/large-payload requests return 524 through `*.proxy.runpod.net`. Root cause: a fixed 100 s Cloudflare proxy timeout. Fix: use direct TCP (a port above 70000) for WebSockets, long polls, and big payloads; reserve the HTTP proxy for short UI requests.
- **RP6 — Basic (proxied) SSH cannot scp/rsync; external TCP port changes on every reset.** Symptom: bulk upload/download fails over `ssh.runpod.io`, or a hardcoded external SSH/service port stops working after a restart. Root cause: proxied basic SSH does not support `scp`/`sftp`/`rsync`, and external port mappings (and Community-Cloud public IPs) are re-assigned on every reset. Fix: use full direct-TCP SSH (public IP + TCP 22 + key on account), and never hardcode the external port — re-read it from Connect → TCP after each (re)start (Secure Cloud IPs are stabler than Community).
- **RP7 — Network Volume is DC-locked and cannot detach.** Symptom: GPU availability is unexpectedly constrained, or a Network Volume cannot be moved off a Pod. Root cause: a Network Volume pins all future deployment to its datacenter and must be attached at Pod creation, never detached. Fix: choose the DC deliberately up front; do cross-DC moves via bridge-Pod rsync or the S3 API.
- **RP8 — Low-balance auto-stop then silent deletion.** Symptom: Pods vanish and unrecoverable data is gone after the account ran low; or a Pod kept charging "daily" while doing nothing. Root cause: a depleted balance auto-stops Pods (storage still billing), and depleted-balance / 30-day-stale Pods get deleted with **no backups kept**. Fix: enable Auto-Pay or terminate-with-Network-Volume before leaving a Pod idle; treat the Network Volume / local pull as the only safety net (§5). (verified contact.runpod.io 2026-06)
- **RP9 — CUDA forward-compat error (host driver too old).** Symptom: container runs locally but on RunPod throws `CUDA failure 804: forward compatibility was attempted on non supported HW`, or `cuda>=12.x, please update your driver`, or `OCI runtime create failed`. Root cause: the assigned machine's NVIDIA host driver is older than the image's CUDA needs (e.g. driver 525.x under a CUDA 12.1 image). Fix: in the deploy dialog use **Additional filters → CUDA Version** to require a machine whose driver meets the image's minimum; or pick an image matching the available driver. (verified github.com/runpod/containers/issues/67 2026-06)
- **RP10 — `ENTRYPOINT` in a custom image silences the template start command.** Symptom: a custom image deploys but never starts `sshd` / the handler / `/start.sh`; the container runs the wrong process and SSH never comes up. Root cause: an image `ENTRYPOINT` cannot be overridden by the RunPod template's "container start command" (which only overrides `CMD`). Fix: use `CMD ["/start.sh"]` (not `ENTRYPOINT`) in the Dockerfile so the template override works. (verified github.com/runpod/runpodctl/issues/170 2026-06)
- **RP11 — Container disk (~5 GB) fills, not the volume disk.** Symptom: "No space left on device" mid-`pip install` / mid-download even though `/workspace` has free GB. Root cause: pip wheels, the HF cache, apt and conda default to `/` (the small ~5 GB overlay), not `/workspace`. Fix: raise container-disk size at create time, AND redirect caches onto the volume — `export HF_HOME=/workspace/hf PIP_CACHE_DIR=/workspace/.cache/pip`, install conda envs under `/workspace`. Diagnose with the §7-debug commands. (verified docs.runpod.io/pods/troubleshooting/storage-full 2026-06)
- **RP12 — Env vars set on the Pod are missing inside a full-SSH (over-TCP) session.** Symptom: `WANDB_API_KEY` / `HF_TOKEN` / template env vars are empty when reached via full SSH, though they exist in the web terminal / basic SSH. Root cause: the SSH daemon's login shell does not inherit the container env set on PID 1 at startup. Fix: snapshot at boot in the start command (`env > /workspace/.env_vars.txt`) and source it in the SSH session, or write the vars into `/etc/environment` / `~/.bashrc`. (verified leimao.github.io Setting-Up-Environment-Variables-SSH-Over-TCP-Runpod 2026-06)
- **RP13 — `runpodctl send/receive` is only for small/medium files.** Symptom: a large dataset transfer via `runpodctl send` is slow or unreliable. Root cause: the one-time-code transfer is positioned for "quick, occasional, small-to-medium" exchanges, not bulk data. Fix: use full-SSH `rsync` (RP6) or the Network-Volume S3 API for large datasets; keep `send/receive` for keyless one-off pulls on no-public-IP Pods. (verified docs.runpod.io/runpodctl/transfer-files 2026-06)

### Platform-specific debugging

Quick checks when a RunPod Pod misbehaves (run inside the Pod unless noted):

- **Which disk is full?** `df -h` — read the **`overlay`** row (= container disk `/`, often only ~5 GB) separately from the **`/workspace`** row (volume / Network Volume). A full `overlay` with a near-empty `/workspace` is RP11, not a real out-of-space. Largest offenders: `find /workspace -type f -exec du -h {} + | sort -rh | head -n 10` (swap `/workspace` for `/` to hunt container-disk bloat). If files deleted in JupyterLab didn't free space, empty `~/.local/share/Trash/` and `/workspace/.Trash*`. (verified docs.runpod.io/pods/troubleshooting/storage-full 2026-06)
- **GPU actually attached?** `nvidia-smi` — if it errors or shows no device, suspect zero-GPU-on-restart (RP1) or a driver/CUDA mismatch (RP9). Cross-check the image's CUDA vs the host driver: `nvcc --version` (image) against the driver line in `nvidia-smi` (host).
- **Stuck initializing / image pull?** A Pod looping in "initializing" is usually a slow/failing image pull or a throttled machine. Watch the **container logs** (web console → the Pod's *Logs* tab, or `runpodctl get pod <id>`); cloning the template to a different machine / cloud often unsticks it.
- **SSH won't connect on a custom image?** Confirm `sshd` is actually running (`ps aux | grep sshd`), TCP 22 is exposed, and the Dockerfile used `CMD` not `ENTRYPOINT` (RP10); confirm the public key is on the account and matches the local private key.
- **Env var missing over SSH?** `env | grep <VAR>` in the SSH shell vs the web terminal — divergence is RP12.
- **Detect a stuck/zombie download:** watch the target grow — `watch -n5 'du -sh /workspace/hf 2>/dev/null; ls -la <partial-file>'`; a `.incomplete`/`.part` file whose size is frozen means a stalled HF pull → re-run with `HF_HUB_ENABLE_HF_TRANSFER=1` (§3). For a robust remote ssh-poll loop, see `references/gotchas_universal.md` U17.
- **Billing reality check:** the running meter and remaining-balance runtime live in the web console billing page; do not trust "it should be cheap because it's stopped" — a stopped Pod still bills the volume disk at 2× (RP4) and a low balance silently deletes (RP8).

---

## 8. SCRIPT OVERRIDES

Values to parameterize the `scripts/` templates for RunPod:

- `DATA_DIR=` `/workspace` (the per-Pod volume disk) — stop-safe working state (code, conda/pip env, in-progress outputs survive a stop, not a terminate).
- `DURABLE_DIR=` a **Network Volume** mount (`/workspace` on Pods, `/runpod-volume` on Serverless) — terminate-safe durable checkpoints. Point `DURABLE_DIR` at the Network Volume when `terminate` is the teardown verb so `best` checkpoints survive Pod deletion AND the low-balance auto-delete (RP8).
- `PROXY_HOOK=` none. No China mirror. Instead `export HF_HUB_ENABLE_HF_TRANSFER=1` (after `pip install huggingface_hub[hf_transfer]`).
- `CRED_FILE=""` — no credential file on disk; the key is a RunPod secret / env var injected at Pod creation, so `WANDB_API_KEY` / `HF_TOKEN` arrive via the platform env and `run_one`'s `[ -n "$CRED_FILE" ]` guard skips the file read. **Caveat (RP12):** a full-SSH-over-TCP login shell may NOT see these env vars — snapshot them at boot (`env > /workspace/.env_vars.txt`) and source in the SSH session if a script reads them there. **NEVER** write a key to a Network Volume — it is unencryptable and shared across every attached Pod.
- `SCRATCH=` periodic/`latest` checkpoints under the Network Volume; keep `best` only (`save_top_k` small). Pruning matters more here — the volume disk grows-only and stopped storage is double-priced (RP4).
- `HF_HOME=` a path on the Network Volume (e.g. `/workspace/hf` on a Network-Volume-backed Pod) so model caches survive Pod churn instead of re-downloading — AND to keep the cache off the tiny ~5 GB container disk (RP11). Likewise `PIP_CACHE_DIR=/workspace/.cache/pip`.
- `DETACH=` `tmux` (after `apt-get install -y tmux`); fall back to `nohup … </dev/null >log 2>&1 &`. Neither survives a Pod restart — checkpoint-to-Network-Volume is the resilience layer.
