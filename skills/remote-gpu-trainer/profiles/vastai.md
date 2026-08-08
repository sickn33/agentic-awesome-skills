---
platform: vastai
kind: ssh-rental
meter_stop_verb: destroy        # the action that STOPS billing; stop keeps billing disk forever (compute off, storage on)
meter_stop_irreversible: true   # destroy permanently deletes container disk
detach_primitive: tmux          # auto-attached on login; dies on container restart → onstart.sh is the durable hook
spot_available: true            # interruptible (bid) auction — central to the platform
spot_grace: ~0s                 # preemption is an abrupt pause, no documented notice / no SIGTERM
shared_fs: false               # NO platform-wide FS; Volumes are machine-locked (per-GPU bound on restart)
inode_cap: host-dependent       # undocumented; whatever the host's Docker storage driver gives
free_egress: host-dependent     # CORRECTED: host-set bandwidth price; billed per byte in AND out, often $0 but not guaranteed
china_mirror_needed: false      # no China DCs and no platform proxy; fix HF at workload level
host_driver_cuda_max: image-dependent  # CUDA ships in the chosen Docker image; must be ≤ host driver
local_nvme: host-dependent
---

# vast.ai — platform profile

One-line purpose: rent a marketplace GPU as a **Docker image on a third-party host**, run a spot-resumable
job, and **copy results off before `destroy`** — the only verb that stops the full meter.

> **Surface to the user up front (principle #10):** ⚠️ Danger clocks — a **`stop`ped instance bills its disk FOREVER** (only `destroy` stops the full meter, and `destroy` deletes everything); **bandwidth/egress bills continuously**, host-priced. Risk — rent only **verified, high-reliability** hosts with a direct port (an unverified host can vanish mid-run); cloud-sync works even while stopped (§5), the cleanest durable target.

**Table of contents** (`grep -in '^## ' profiles/vastai.md` to jump):
- §1 LAUNCH — offer-driven, Docker-image-is-the-env
- §2 STORAGE MODEL — per-machine-local disk; survival matrix; cloud-sync escape hatch
- §3 NETWORK — proxy vs direct SSH; random ports; host-set bandwidth; no China proxy
- §4 SPOT / INTERRUPTION + RESUME — bid auction, ~0 s pause, GPU-bound resume, status-poll loop
- §5 TEARDOWN / BILLING — `destroy` is the meter-stop; `stop` bills disk forever; bandwidth bills always
- §6 DAEMON TOOL — tmux dies on restart; `onstart.sh` is the durable relaunch
- §7 TOP GOTCHAS — VAST1–VAST13, platform-pinned + Platform-specific debugging
- §8 SCRIPT OVERRIDES — values to parameterize `scripts/`

Universal gotchas are NOT restated here — see `references/gotchas_universal.md`. Spot cadence math and
atomic-resume live in `references/spot-resilience.md`.

**The one fact that reshapes everything:** vast.ai is a **decentralized marketplace of third-party hosts**,
not a uniform first-party cloud. Consequences that diverge from AutoDL: **no platform-wide shared FS**, **no
China-mirror proxy**, **no single prebuilt conda env** (the Docker image IS the env), **storage is locked to
one physical host and even one GPU ID**, **bandwidth is host-priced (not free by fiat)**, and
**interruptible (bid) preemption is a real, central, abrupt model**.

---

## 1. LAUNCH

**Entry points** (all equivalent): web console (`cloud.vast.ai`), the `vastai` CLI / Python SDK, the REST
API (`https://console.vast.ai/api/v1/...`, Bearer token), and SSH into the running container. The CLI is the
orchestration surface: `pip install vastai`, then `vastai set api-key $VAST_API_KEY` (env-var name only —
never inline the key).

**Env contract — the Docker image IS the env.** A bare VM is not offered by default; the create call MUST
specify `--image` (e.g. `pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime`). **CUDA version is whatever the
image ships** — a mismatch with the host driver is a real failure mode (VAST5). The image's default Python
env is the low-friction place to run — do not `conda create` on a rental (the remote-base exception holds).
Note: **Docker-in-Docker is not supported** "due to security constraints" (verified
docs.vast.ai/.../faq/instances 2026-06) — a containerized inner runtime is not an option here.

**Launch is offer-driven and two-step** (search a marketplace offer → create onto it):

```bash
#!/usr/bin/env bash
set -u
# 1) find a verified, rentable offer with at least one direct port, cheapest $/dlperf first
vastai search offers 'gpu_name=RTX_4090 num_gpus=1 verified=true rentable=true direct_port_count>=1' -o 'dlperf_usd-'
# 2) create onto the chosen OFFER_ID; --direct enables direct-TCP SSH (see §3)
vastai create instance OFFER_ID --image pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime \
  --disk 50 --ssh --direct --onstart-cmd 'nvidia-smi && bash /workspace/onstart.sh'
```

`--onstart-cmd` (**max 16 KB**; for a longer script, gzip+base64-encode it) is written to `/root/onstart.sh`
and **re-runs on every container start** — this is the platform-native boot hook and the durable relaunch
path (§6) (verified docs.vast.ai/cli/commands 2026-06). Filter offers hard: an unverified, low-reliability
host can simply vanish (`Offline`) mid-run (VAST7). Boot is not instant: the host must **pull the Docker
image and boot — typically 1–5 min depending on image size** (verified docs.vast.ai CLI Hello World 2026-06);
a fat image stuck in `Loading` is the slow-download symptom (VAST13).

→ **verify:** `vastai show instance OFFER_ID` lists the new instance `running`, and an in-container
`nvidia-smi` (via `--onstart-cmd` or first SSH) shows the expected GPU with a CUDA that matches the image.

---

## 2. STORAGE MODEL  *(survival matrix — principle #4)*

Three tiers; the persistence + region story is the single biggest divergence from AutoDL — **there is no
region-wide shared FS** to sync to. (verified docs.vast.ai/.../storage/types 2026-06)

| Tier | Path | Speed | Survives STOP? | Survives DESTROY? | Cap |
|---|---|---|---|---|---|
| Container / instance disk (`--disk N`) | `/` + `/workspace` | local | **yes** (bills) | **NO — gone** | fixed at create, **non-resizable**, min **10 GB** (default) |
| Volume (local) | mounted path | local | yes | **yes, until volume deleted** (bills per-GB while it exists) | fixed; **machine-locked**, non-resizable |
| Cloud sync (S3 / GDrive / Backblaze / Dropbox) | off-box bucket | network | yes | **yes — fully off-box** | provider's; **works even while instance is stopped** |
| Network Volume (cross-machine) | — | — | — | — | **not in current storage docs — treat as unavailable** |

**Machine-lock — and per-GPU-lock — is the trap.** A Volume "is tied to the physical machine where created"
and "cannot migrate between different physical machines." Worse, a stopped instance is **bound to a specific
GPU ID**, not just the machine: "When an instance is created, it is bound to a specific GPU ID. If the
instance is stopped, it remains bound to the same GPU ID and waits for that GPU to become available again"
(verified vast-ai.crisp.help scheduling article 2026-06). So a machine can show **available for rent** (other
GPUs free) while the stopped instance is stuck in `Scheduling` waiting for *its* GPU (VAST3).

**Where checkpoints MUST go for the §5 verb:** there is **no durable mount that survives `destroy`** on the
container disk — so the durable target is **off-box**. Two real off-box paths: (a) `vastai copy` the result
to local / another instance / a Volume **before** `destroy`; (b) **Cloud sync** (`vastai cloud copy`) to
S3/GDrive/Backblaze/Dropbox — notably **works even while the instance is stopped** (verified
docs.vast.ai/.../data-movement 2026-06), which makes it the cleanest durable target for a spot job. Always
assume the instance is lost once its lifetime expires. Inode caps and FS type are **undocumented and
host-dependent** (whatever the host's Docker storage driver gives) — `df -i` per host, do not assume an
AutoDL-style platform constant.

→ **verify:** before any teardown, `vastai copy <id>:/path/to/ckpt local:/path/to/local` exits 0 (or
`vastai cloud copy` completes) AND the local artifact loads (`scripts/verify_local.py`).

---

## 3. NETWORK

**Shared public IP + random external port.** Each instance shares a host's (usually shared) public IP;
"each open internal port (such as 22 or 8080 etc) is mapped to a *random* external port" read from the
**"IP Port Info" pop-up** (button on the instance) or `vastai show instance` — format
`PUBLIC_IP:33526 -> 8081/tcp` (verified docs.vast.ai/.../connect/networking 2026-06). Ports change per
instance — discover them at runtime, never hard-code. **Hard cap 64 open ports per instance.**

**Two SSH flavors — and the scp size trap:**
- **Proxy SSH** (default, via Vast's proxy): "works on all machines, slower for data transfer." It carries
  `scp` but is throttled — vast's own guidance is **scp over proxy only for transfers under ~1 GB**; above
  that "using the direct ssh connection is recommended" (verified docs.vast.ai/.../data-movement 2026-06).
- **Direct SSH** (direct-TCP to the host): "requires machines with open ports, faster and more reliable, the
  preferred method." This is the one that carries large `scp`/`rsync`/`vastai copy` without stalling. It
  **requires the offer to expose open ports** → filter `direct_port_count>=1` and create with `--direct`.

**Rule:** if bulk transfer must work, require **direct-TCP** at create time. `vastai copy` "uses rsync and is
generally fast and efficient, subject to single-link upload/download constraints" — for a multi-GB result,
direct + a resumable loop (`references/gotchas_universal.md` U12). For a big *inbound* dataset, prefer
`wget`/`curl` from a cloud bucket over proxied SSH (much higher throughput). Custom services use Docker `-p`
(e.g. `-p 8081:8081`); Jupyter defaults to internal 8080 gated by `JUPYTER_TOKEN` (override the port via
`JUPYTER_PORT`).

**Bandwidth is metered and host-priced — NOT free by fiat (corrected).** "You are charged bandwidth prices
for every byte sent or received to or from the instance, regardless of what state it is in," and "pricing is
set by the host and is specific to each offer" (verified docs.vast.ai/.../reference/billing +
.../instances/pricing 2026-06). In practice many hosts price egress at ~$0 (vast is generally a low/zero
egress option), but a given offer **can** charge per-GB in *both* directions — read the per-offer bandwidth
rate (hover the price on the instance card / search page) before a transfer-heavy job. This is why the
frontmatter is `free_egress: host-dependent`, not `true`.

**China relevance: none at the platform level.** No China datacenters, no `/etc/network_turbo` equivalent, no
built-in HF mirror. The HF-unreachable problem still exists at the *workload* level from some hosts, but the
fix is the job's **own** `HF_ENDPOINT=https://hf-mirror.com` / `hf_transfer`, not a platform script — see
`references/gotchas_universal.md` (HF download) for the resumable-download ladder.

→ **verify:** `ssh <alias> 'echo ok'` over the **direct** endpoint, then a 1-file `vastai copy` round-trip
exits 0.

---

## 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*

vast.ai's **interruptible** rentals are a **live continuous-bid auction** — the cheap-GPU core of the
platform ("can reduce costs by fifty percent or even more"), far more first-class than anything on AutoDL.
(verified vast.ai/article/Rental-Types 2026-06)

- **Bidding:** clients set a bid price; "the current highest bid is the instance that runs, the others are
  paused." **On-demand always beats interruptible** regardless of bid amount ("on-demand instances will
  always take precedence").
- **The bid is fixed at create.** "The bidding method cannot be changed after an instance is rented"
  (verified Rental-Types 2026-06) — so the resume lever is **not** "raise this instance's bid." To recover an
  out-priced run, either wait for the higher bid to finish, or **re-launch the identical job on a fresh
  offer** (cheaper/on-demand) — which is why off-box checkpoints (§2) matter.
- **Preemption = pause, not destroy.** A preempted instance is paused (disk survives) until its bid regains
  top priority or the higher bid finishes. Because storage is machine-/GPU-locked, it can only resume **on
  the original host's original GPU** — the resumability cliff (VAST3).
- **Detection signal + grace window:** **little/no advance notice — treat the grace as ~0 s, an abrupt
  pause.** No documented termination signal; a SIGTERM-flush handler is **NOT** a safety net. Detect via the
  API: `show_instance` returns `actual_status` (current container state), `intended_status` (desired state),
  `cur_state` (contract/hardware allocation), and `status_msg` (human string, e.g. "success, running ...")
  (verified docs.vast.ai/api-reference/instances/show-instances 2026-06). A preempted instance stops being
  `running`; the UI shows **Inactive** (stopped, data preserved) / **Scheduling** (waiting for the GPU to
  free) / **Offline** (host gone).
- **Resume hook:** wait for the higher bid to finish or restart the instance; it returns
  `Scheduling → running` **only if the same GPU is still free** (else it sticks — VAST3), then
  **`/root/onstart.sh` re-runs** and relaunches training (§6). The job itself must be checkpoint-resumable
  (`--resume`, load-latest unconditionally) so the identical command resumes idempotently.

**Orchestrator pattern:** poll `actual_status` / `status_msg` on a timer; on preemption, restart (or
re-launch on a new offer) and let `onstart.sh` + checkpoint-resume recover. Cadence formula (Young/Daly) and
atomic temp→fsync→rename resume → `references/spot-resilience.md`.

→ **verify:** kill-and-resume drill — `vastai stop instance <id>` then `start`; the job resumes from the last
checkpoint step, not epoch 0.

---

## 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law)*

This is the most error-prone section — be precise. (verified docs.vast.ai/.../reference/billing +
.../manage-instances 2026-06)

- **`destroy` is the ONLY thing that stops the full meter** (compute **and** disk). It is **irreversible** —
  all container-disk data is permanently deleted. (`vastai destroy instance <id>`)
- **`stop` is a trap:** it detaches the GPU and halts compute billing, but **disk keeps charging
  indefinitely** while stopped — "stopping an instance does not avoid storage costs," "you will continue to
  be billed for disk storage, even if your balance is negative." The #1 surprise bill on vast.ai.
  "Stopped" ≠ "meter off."
- **Bandwidth bills in EVERY state.** Charged "for every byte sent or received... regardless of what state it
  is in" — so even a transfer to/from a *stopped* instance (cloud sync) accrues host-set bandwidth cost (§3).
- **A Volume keeps billing after the instance is destroyed** until the volume itself is deleted ("charged per
  GB while volume exists," independently from instances).
- **On-demand instances auto-stop when their host-set lifetime expires** — "when the rental end date is
  reached, the rental contract expires and the instance is stopped." Data remains until destroyed. An
  unattended job can silently end, so checkpoint as if the box disappears at any moment.
- **Zero / negative balance → deletion.** At $0.00 "your instances, storage volumes, and data will be
  scheduled for deletion unless you add credits"; without a saved card "your instances and stored data will
  be destroyed." There is a "short grace period where your balance may go negative before deletion occurs" —
  do not rely on it.
- **Poll-loop cost trap:** a status-poll loop with no timeout/error check will loop forever while the
  instance keeps accruing disk + bandwidth charges. Bound every poll loop with `timeout` + an exit check.

**Teardown Iron Law (vast.ai instance):** NO `destroy` until checkpoints are **copied off-box AND verified by
load** — either `vastai copy`-ed to local (`scripts/verify_local.py` reports 100% OK) or `vastai cloud copy`
confirmed — the copy exit status is checked (VAST2), and the user has **explicitly approved** the
cost-affecting action. "It looked done in the log" is not evidence (principle #3). Because `destroy` deletes
the disk and there is **no shared FS to fall back on**, the confirmation gate matters more here, not less.

---

## 6. DAEMON TOOL

- **Auto-tmux on SSH login** (same as AutoDL): login attaches a tmux session "to keep the session active
  even if you disconnect." Disable with `touch ~/.no_auto_tmux` then reconnect (verified docs.vast.ai
  jupyter-ssh FAQ 2026-06).
- **tmux survives an SSH disconnect but NOT a container restart/reboot/spot-resume** — a reboot or
  spot-resume wipes the tmux session. The **durable relaunch hook is `/root/onstart.sh`** (the
  `--onstart-cmd`), which re-runs on every container start. Put the training relaunch there, **not** in
  tmux, so a spot-resume actually restarts the job.
- **SSH keys apply only to instances created AFTER the key is added** — existing instances do not get a new
  key automatically. Set the account key **before** creating, or inject it via `onstart`. A pasted key missing
  its `ssh-rsa`/`ssh-ed25519` prefix or `user@host` suffix authenticates as a password prompt — copy the whole
  line (verified docs.vast.ai jupyter-ssh FAQ 2026-06).
- **Native queue:** vast.ai has **Serverless / autoscaler** for queue-style workloads, but single-instance
  training has no managed scheduler — the orchestrator + `onstart.sh` + checkpoint-resume **is** the queue.

---

## 7. TOP GOTCHAS  (platform-pinned; Symptom → Root cause → Fix)

Universal gotchas (CRLF, cgroup OOM, silent-sync, HF stalls, zombie VRAM, GPU-0%-util, scp-resets,
egress-surcharge) live in `references/gotchas_universal.md` — not repeated here.

- **VAST1 — surprise bill on a "stopped" instance.** Symptom: a stopped, idle instance keeps charging for
  days, even past a negative balance. → Root cause: `stop` halts compute only; **disk bills forever while
  stopped**, and bandwidth bills in every state. → Fix: to stop the meter, **`destroy`** (after copy-out per
  §5); never leave an instance merely stopped to "save money."
- **VAST2 — results gone after teardown.** Symptom: `destroy` run, checkpoints irrecoverable. → Root cause:
  `destroy` permanently nukes container disk and there's **no platform-wide FS to fall back on**. → Fix:
  `vastai copy` out (or `vastai cloud copy` to a bucket) and **check its exit status** BEFORE `destroy`; gate
  the success line on the copy result, never on a log claim.
- **VAST3 — paused/stopped instance stuck in `Scheduling` though the machine shows "available."** Symptom:
  preempted or stopped run never resumes; the portal still lists the same machine as rentable. → Root cause:
  the instance is **bound to a specific GPU ID** (not the machine); if that GPU was re-rented, it waits
  indefinitely while *other* GPUs on the host stay free. "If stuck >30 s, GPU likely rented by another user."
  → Fix: stop the scheduling attempt, **create a NEW instance on the same host and re-attach the same Volume**
  (works because other GPUs are free), or re-launch on a different offer from an off-box checkpoint; don't
  wait for the same GPU to come back (verified vast-ai.crisp.help + manage-instances 2026-06).
- **VAST4 — job dies mid-step with no warning.** Symptom: interruptible run vanishes abruptly. → Root cause:
  bid preemption with **~0 s notice and no SIGTERM**; a flush handler never fires. → Fix: periodic checkpoint
  to disk on a Young/Daly timer + load-latest-on-resume; poll `actual_status`/`status_msg` and restart (§4,
  `references/spot-resilience.md`). The bid can't be raised on a live instance — re-launch elsewhere if the
  GPU is gone.
- **VAST5 — CUDA driver mismatch on a fresh box.** Symptom: `torch.cuda.is_available()` is False / driver
  mismatch error. → Root cause: **CUDA ships in the Docker image, not the host**; the image's CUDA may be
  newer than the host driver supports (image CUDA must be ≤ host driver). → Fix: pick an image whose CUDA ≤
  host driver; verify `nvidia-smi`/`nvcc` inside the container in `onstart` before training (general triangle:
  `gotchas_universal.md` U28).
- **VAST6 — a service is unreachable on its "own" port.** Symptom: TB/Jupyter/API not reachable at the
  internal port. → Root cause: internal ports map to **random external ports** and there's a **64-port cap**
  per instance. → Fix: open ports with `-p` at create, **discover the external mapping at runtime**
  (`vastai show instance` / IP Port Info pop-up), never hard-code a port.
- **VAST7 — host vanishes mid-run.** Symptom: instance flips to `Offline`, work lost. → Root cause: it's a
  **marketplace** — an unverified/low-reliability host can disconnect. → Fix: filter offers on
  `verified=true`, high `reliability`, and `direct_port_count>=1`; treat any single host as disposable and
  checkpoint off-box accordingly.
- **VAST8 — bulk `scp` over the default SSH stalls / crawls.** Symptom: a multi-GB result copy over the
  default endpoint hangs or runs at a trickle. → Root cause: the **default is proxy SSH**, throttled and
  recommended only for <1 GB; large transfers need direct-TCP. → Fix: create with `--direct` (offer must have
  `direct_port_count>=1`) and use that endpoint for `scp`/`vastai copy`; for big *inbound* data prefer
  `wget`/`curl` from a bucket (verified data-movement docs 2026-06).
- **VAST9 — bandwidth shows up on the bill.** Symptom: a transfer-heavy job costs more than the GPU-hours
  alone. → Root cause: bandwidth is **host-priced and metered per byte in both directions, in every state** —
  some offers are not $0-egress. → Fix: read the per-offer bandwidth rate before committing; pull a dataset
  **once** to durable local/Volume, not per-epoch from a remote bucket (general form: `gotchas_universal.md`
  U14/U15).
- **VAST10 — disk full, and you can't grow it.** Symptom: `No space left on device` mid-run; `--disk` can't
  be raised. → Root cause: container disk is **fixed at create (min 10 GB) and non-resizable**; Docker
  layers + HF cache + checkpoints overrun it. → Fix: over-provision `--disk` at create; redirect `HF_HOME`
  onto the data disk; prune `latest`/periodic checkpoints, keep only `best` (inode/byte audit:
  `gotchas_universal.md` U6/U7).
- **VAST11 — secret baked into the image or onstart-cmd is recoverable.** Symptom: a key embedded at build
  time or in `--onstart-cmd` is stored by the platform. → Root cause: image layers and the 16 KB onstart
  string are persisted server-side. → Fix: inject `WANDB_API_KEY`/`HF_TOKEN` via **env vars at create**, never
  baked into image layers or `--onstart-cmd`; stream creds via stdin at runtime (`gotchas_universal.md` U34).
- **VAST12 — assuming a cross-machine Network Volume exists.** Symptom: a plan relies on a Volume following
  the job to a different host. → Root cause: Volumes are **machine-locked**; cross-machine Network Volumes are
  **not in the current storage docs**. → Fix: design for off-box durability (`vastai cloud copy` to a bucket),
  not a portable volume; only same-machine re-attach is reliable.
- **VAST13 — instance stuck in `Loading`, never reaches `running`.** Symptom: a new instance sits in
  `Loading`/`Connecting` for many minutes. → Root cause: the host is **pulling a large Docker image** (boot is
  1–5 min, longer for fat images) or the host link is slow. → Fix: wait out the documented window, then read
  `vastai show logs <id>` (below) for the pull progress; if still stuck, `destroy` and re-create on a faster
  offer with a slimmer image.

### Platform-specific debugging (commands + what to check)

- **Read the boot/container/system logs from off-box:**
  `vastai show logs <id> --tail 200 [--filter <grep>] [--daemon-logs]` — uploads container logs (and, with
  `--daemon-logs`, host/system logs) to a generated URL. This is the first stop for a box that won't connect,
  a stuck `Loading`, or a silent `onstart` failure (verified docs.vast.ai/api-reference/instances/show-logs
  2026-06). The GUI equivalent is the **"Logs" button** on the instance card.
- **Inspect the live state machine without SSH:** `vastai show instance <id>` (or the API) — compare
  `actual_status` (where the container *is*), `intended_status` (where it *should* be), `cur_state` (contract/
  hardware allocation) and `status_msg`. `intended=running` but `actual≠running` + `Scheduling` ⇒ VAST3
  (GPU-bound wait); `Offline` ⇒ VAST7 (host gone).
- **Confirm the GPU is really attached:** in `onstart` / first SSH run `nvidia-smi` and
  `python -c "import torch; print(torch.cuda.is_available(), torch.version.cuda)"` — `False`/CPU-only ⇒ VAST5
  (image CUDA > host driver) or no-GPU container (`gotchas_universal.md` U31).
- **Detect a stuck download inside the box:** `du -sh ~/.cache/huggingface/hub` over time (no growth = stalled
  HF pull), `df -h /` (filling = active download) and `df -i /` (inodes), then the resumable-download ladder
  in `gotchas_universal.md` (HF). A fat-image stall *before* SSH is visible only via `vastai show logs`.
- **Find the real external ports / SSH target:** `vastai show instance <id>` lists the port map and
  `vastai ssh-url <id>` prints the connection string — never assume port 22 is reachable (VAST6).

---

## 8. SCRIPT OVERRIDES

Values to parameterize the `scripts/` templates for vast.ai:

```bash
# DATA_DIR — data + (only) checkpoint mount; NOTHING survives destroy, so durable = off-box copy-out/cloud-sync
DATA_DIR=/workspace              # container disk; survives stop, bills forever, GONE on destroy
DURABLE_DIR=off-box              # no destroy-surviving mount: vastai copy / vastai cloud copy before destroy (§5)
# PROXY_HOOK — none at platform level (no /etc/network_turbo). HF mirror is the JOB's own env if needed:
PROXY_HOOK=''                    # set HF_ENDPOINT=https://hf-mirror.com in the job env only if a host can't reach HF
# CRED_FILE — empty: vast's key is the VAST_API_KEY env var, not a file. WANDB_API_KEY/HF_TOKEN also arrive via env.
CRED_FILE=""                     # no cred FILE on disk → run_one's [ -n "$CRED_FILE" ] guard skips the cat; VAST_API_KEY + WANDB_API_KEY/HF_TOKEN injected via env at create, NOT into the image or onstart-cmd
# SCRATCH — what to prune (disk is fixed-size, non-resizable → prune aggressively)
SCRATCH='latest.pth periodic-*.pth *.tmp ~/.cache/huggingface/hub/blobs'  # keep only best + tiny eval JSONs
# HF_HOME — redirect cache off the small root onto the data disk
HF_HOME=/workspace/.cache/huggingface
# DETACH — durable relaunch is onstart.sh, NOT tmux (tmux dies on container restart/spot-resume)
DETACH='/root/onstart.sh'        # re-runs on every container start; tmux only for an attached SSH session
```

**Secrets note:** inject `WANDB_API_KEY` / `HF_TOKEN` via **env vars at create**, never baked into the Docker
image layers or the 16 KB `--onstart-cmd` (both are stored by the platform — VAST11).
