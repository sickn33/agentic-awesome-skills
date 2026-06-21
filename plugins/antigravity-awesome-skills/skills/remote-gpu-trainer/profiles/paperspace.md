---
platform: paperspace        # Paperspace (now under DigitalOcean): Gradient Notebooks + Core/Machines
kind: cloud-api             # web console + pspace/gradient CLI/SDK + REST; Core machines also reachable by SSH
meter_stop_verb: shut-down  # shut-down/power-off stops COMPUTE; only destroy/delete stops storage + IP
meter_stop_irreversible: false   # a stop is reversible; destroy/delete IS irreversible (loses block storage)
detach_primitive: tmux      # on Core VMs; Notebooks have no clean SSH-daemon story (Jupyter kernel + hard auto-shutdown ceiling)
spot_available: false       # no AWS-style spot/preemptible with a 2-min warning
spot_grace: n/a             # interruption is capacity-at-launch + a deterministic auto-shutdown clock, not eviction
shared_fs: true             # Gradient /storage is team-shared per storage region/cluster
inode_cap: none             # no documented inode cap on either /storage or Core block storage
free_egress: true           # no documented ingress/egress fee
china_mirror_needed: false  # US/global cloud, direct egress; no platform-provided proxy
host_driver_cuda_max: "host-dependent"   # ML-in-a-Box / template ships the CUDA+driver stack (often lagging)
local_nvme: host-dependent  # ephemeral workspace on Notebooks; block storage on Core
---

# Paperspace (DigitalOcean) — platform profile

One-line purpose: substrate for running detached GPU jobs on Paperspace Gradient (managed Jupyter
notebooks/deployments) and Paperspace Core (raw Linux VMs, "Machines") — what stops the meter, what
survives a stop vs a destroy, and the auto-shutdown clock that ends every long run. Universal gotchas are
NOT repeated here — see `references/gotchas_universal.md`.

> **Surface to the user up front (principle #10):** ⚠️ Danger clocks — an **auto-shutdown timer ends every Notebook/Core run** (set it consciously; Gradient free notebooks hard-cap at 6 h); **snapshots / block storage keep billing after a machine is destroyed** (orphan bleed). Heads-up — the **Gradient CLI/API was deprecated 15 Jul 2024** (pin `gradient<3.0`; the three-CLI mess, §1).

To jump: `grep -in '<keyword>' profiles/paperspace.md`.

## Table of contents
1. LAUNCH — Gradient vs Core, the env contract, the three-CLI mess
2. STORAGE MODEL — survival matrix, the stop-keeps-disk rule, pip-doesn't-persist
3. NETWORK — public IP (static vs dynamic), ports, SSH flavor
4. SPOT / INTERRUPTION + RESUME — the auto-shutdown clock, not spot
5. TEARDOWN / BILLING — what actually stops the meter (the trap)
6. DAEMON TOOL — tmux on Core; why Notebooks resist a daemon
7. TOP GOTCHAS — `PS1`–`PS13`, platform-pinned + platform-specific debugging
8. SCRIPT OVERRIDES — values for the `scripts/` templates

---

## 1. LAUNCH

Two product families, with opposite operating models:

- **Gradient** — the managed layer. **Notebooks** are a web Jupyter IDE on a shared persistent store;
  **Deployments** serve a container behind a REST endpoint (bring a Docker image `<user>/img:tag`);
  **Workflows** run GPU-backed DAG automation. Entry: web console, the CLI/SDK, or REST.
- **Core / Machines** — raw Linux/Windows VMs with a persistent block disk, full root/SSH. OS templates
  include **ML-in-a-Box** (preinstalled CUDA + PyTorch/TensorFlow/RAPIDS/Jupyter; **terminal/SSH-only**,
  home `/home/paperspace`, shell `/bin/bash`). **Ubuntu 22.04 is required for H100 and recommended for
  A100; Ubuntu 20.04 is recommended for any other machine type** (verified github.com/Paperspace/ml-in-a-box
  README + DO machines docs 2026-06). This is the family that maps cleanly onto the AutoDL
  tmux-resilient-training pattern.

**Env contract.** The chosen image/template IS the Python env — do NOT `conda create` on a rental
(principle: the prebuilt base is the env). On Core, run inside **ML-in-a-Box** directly; on Gradient
Deployments, the env is the Docker image specified at create time. Because a *destroy* wipes the box, the
durable analog of the env is a Docker image plus a `requirements.txt`/lock file kept off-box, so a recreate
reproduces it. **On Notebooks, a plain `pip install` does NOT survive a restart** (writes to
`/usr/local/lib`, ephemeral) — see §2 / `PS3`.

**The three-CLI mess (gates ALL automation).** The tooling fragmented across the DigitalOcean acquisition;
the draft's "migrate to the current API/CLI" understates the trap (verified github.com/Paperspace 2026-06):
- The **legacy Gradient REST API endpoints were deprecated 15 Jul 2024** — stale calls 404 or no-op.
- **`gradient-cli` v2 is deprecated**; pin `pip install "gradient<3.0"` only to keep *old* scripts alive.
- **`gradient-python` (github.com/digitalocean/gradient-python) is NOT the orchestration CLI** — it is the
  new DigitalOcean *Gradient AI / GenAI inference* SDK. **Name collision** — do not install it expecting
  notebook/machine control.
- The **recommended tool for new work is the streamlined `pspace` CLI** (github.com/Paperspace/cli,
  releases ongoing into 2026; e.g. `pspace public-ip release <ip>`). Pin and verify the CLI binary +
  version in any automation; do not assume `gradient` ⇒ `pspace` command parity.

→ **verify:** `ssh <core-alias> 'python -c "import torch;print(torch.cuda.is_available())"'` on Core, or a
`print(torch.cuda.is_available())` cell in a Notebook.

---

## 2. STORAGE MODEL  *(survival matrix — principle #4)*

The defining fact: a **stop/shut-down keeps the disk** — Paperspace is one of the few profiles here that
behaves like AutoDL's 关机 in this respect. Only **destroy/delete** removes storage.

**Gradient Notebooks** — `/storage` and `/notebooks` are **separate branches from `/`, NOT nested**
(verified DO notebooks/details/storage-architecture 2026-06):
- `/storage` — **shared persistent**, team-wide, scoped to a **storage region/cluster**. Survives stop.
  (Team-shared ⇒ never write secrets here — see §7 / `references/gotchas_universal.md`.)
- `/notebooks` — **per-notebook persistent**, managed via the console File Manager. Survives stop.
- everything else — **ephemeral workspace** (incl. `/usr/local/lib` where `pip` lands), wiped on stop.

**Core machines** — block storage **50 GB–2 TB**, persists across a stop; **expansion is one-way**
("increasing block storage expands the filesystem and is not reversible"). Region-locked: storage and
custom templates must be used in the **same datacenter**. **Snapshots** are a separate billed resource
(`$0.29/GB/mo`, default policy is **"Never" / 0 stored** — they bill only if manually enabled, and a
snapshot **survives a machine destroy**, so an orphaned snapshot keeps charging — see `PS9`).

| Tier | Path | Survives STOP? | Survives DESTROY/DELETE? | Cap / note |
|---|---|---|---|---|
| Notebook shared persistent | `/storage` | yes | yes (separate resource) | team-shared per region/cluster; billed until deleted |
| Notebook per-notebook | `/notebooks` | yes | no (dies with the notebook) | per-notebook persistent; console File Manager |
| Notebook workspace | everything else (incl. `/usr/local/lib`) | **no** | no | ephemeral; wiped on stop; `pip` lands here |
| Core block storage | machine root + block vol | yes | **no** | 50 GB–2 TB; expansion irreversible; region-locked |
| Core snapshot | (separate resource) | yes | **yes** (orphan-bills!) | `$0.29/GB/mo`; default policy Never/0; survives machine destroy |

**Mount checkpoints MUST go to (for the §5 teardown verb):** on Notebooks, `/storage` (cross-stop,
cross-delete-of-the-notebook) — `/notebooks` dies if the notebook itself is deleted. On Core, the block
disk survives a stop, but a *destroy* wipes it, so the Iron-Law pull-to-local before destroy still applies.
No documented inode cap on either tier; still monitor `df -i` (universal, U7 / principle #5).

---

## 3. NETWORK

- **Egress.** Direct and unproxied to HF/GitHub/PyPI; no `network_turbo`-style accelerator and no
  documented egress fee. China-mirror relevance is **N/A as a platform feature** — relevant only when
  operating from inside China and supplying a private mirror (then `references/china-network.md`).
- **Public IP.** Core machines are reached by **public IP**, of two kinds (verified DO
  machines/how-to/manage-public-ips 2026-06):
  - **Static** — "the same IP address every time it powers on … remains in your account until you delete
    it." Use it to pin stable SSH/endpoint addressing. **Billed until deleted** — *including while the
    machine is powered off* (see §5 / `PS6`). API/CLI can create/release a **static** IP but **cannot add a
    dynamic IP to an existing machine** — dynamic must be requested at machine-creation time.
  - **Dynamic** — "assigned automatically when a machine powers on and deleted when it powers off"; a **new
    IP on every start**, so a hard-coded SSH alias breaks after a restart. **Charged only while the machine
    runs** (auto-released on power-off → no idle IP cost).
  A machine with **no public IP** is internet-isolated (and avoids the IP charge). **Private networks**
  give team-isolated pools.
- **Ports / services.** Firewall is self-managed — open ports to expose services. Tunnel Jupyter (8888) /
  TensorBoard (6006) over SSH on Core:
  `ssh -L 8888:localhost:8888 -L 6006:localhost:6006 paperspace@<machine-ip>`
  (placeholder host — substitute the machine's real IP/static address). In a Gradient Notebook, launch
  TensorBoard in-Jupyter and write logs under `/storage` (or they vanish on stop).
- **SSH flavor.** Core = a standard Linux VM → full `ssh`/`scp`/`rsync` (ML-in-a-Box default user
  `paperspace`). Gradient Notebooks expose a **Jupyter sandbox**, not a clean persistent SSH daemon —
  there is no stable SSH-daemon story for a multi-day unattended run on a Notebook.

---

## 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*

**No AWS-style spot/preemptible tier** with a 2-minute interruption warning. The two interruption modes are
different in kind and BOTH are deterministic, not random eviction:

1. **Capacity-at-launch.** The desired GPU type may be unavailable when launching — a *launch-time*
   availability problem, not a runtime eviction. On free notebooks this surfaces as **"out of capacity" /
   the notebook sits "pending" in queue for the next free machine** (verified DO notebooks/how-to docs
   2026-06). Build **retry-launch-until-available** logic, not a 2-minute-grace flush handler; for assured
   access, a paid instance type bypasses the free queue.
2. **Auto-shutdown clock — the hard ceiling on any long run.** The timer is the real killer:
   - **Gradient free** notebooks hard-stop at a **6-hour** maximum auto-shutdown (cannot be raised).
   - **Paid notebooks** default to **12-hour** auto-shutdown; range **1 hour – 1 week**.
   - **Core** machines allow a configurable **1 hour – 1 week** auto-shutdown.
   - **Trap (Core/Linux):** Core Linux auto-shutdown is **wall-clock, not idle-based** — "Linux machines
     shut down regardless of whether any users are connected" (only Windows waits for idle). An active
     SSH/tmux session does **not** keep a Linux Core machine alive past the timer (verified DO
     machines/how-to/manage-auto-shutdown 2026-06).
   - **Trap (API):** auto-shutdown **cannot be enabled/disabled via API or CLI on an existing machine** —
     "you can only manage the auto-shutdown feature via the Paperspace console" (same source). Set it
     deliberately at create time / in the console.

   The window is deterministic, so plan around it: a tmux session inside a Notebook **still dies at the
   timeout** (§6). **Resume hook:** checkpoint full state to `/storage` (Notebooks) or the block disk
   (Core) *before* the auto-shutdown window, then restart and load-latest-on-startup unconditionally.
   Because the clock is known in advance, cadence can be planned rather than guessed — but the
   load-latest-on-startup spine (principle #8) is what makes the restart idempotent. Young/Daly cadence
   formula → `references/spot-resilience.md`.

---

## 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law — the most error-prone section)*

Per-hour billing (verified DO products/paperspace/pricing 2026-06). **A shut-down/power-off STOPS the
compute (GPU) meter** while disk persists — this is the AutoDL-like part. **But it does NOT stop every
meter.**

- **What a stop still bills (the trap):** "When a Paperspace machine is powered off, attached **storage**,
  **public IP addresses**, and other **add-ons** continue to be billed on an hourly basis until you destroy
  those resources." Gradient `/storage` over the plan allowance and Core block storage both keep charging
  while the machine is off.
- **The monthly-cap softener (new fact):** non-GPU resources (storage, public IP, snapshots) have a
  **maximum monthly charge** — "once a non-GPU resource reaches its monthly maximum, it no longer incurs
  charges for the rest of the billing cycle." Static public IP caps at **$3.00/mo** ($0.0045/hr). So a
  forgotten static IP is a bounded ~$3/mo bleed, but a forgotten 2 TB block volume is **~$120/mo** until
  destroyed (verified DO pricing 2026-06).
- **What actually stops the full meter:** **destroy the machine** AND **release the static IP** AND
  **delete the storage** (AND delete any **snapshot**) — separate actions. "To stop all charges for a
  machine and its add-ons, destroy the machine and any resources you no longer need." A stopped-but-not-
  destroyed machine with a Static IP, a 2 TB block volume, and a leftover snapshot is still spending money.
- **Irreversible:** **destroy/delete** of a machine removes its block storage (no recovery); block-storage
  **expansion** is also one-way. A **shut-down is reversible** (resume later).

**Net contrast vs the other profiles:** Paperspace gives a real idle-cheap *stop* (unlike Lambda, which has
no stop), but unlike AutoDL's 关机 the **storage + IP + snapshots keep billing** until each is explicitly
destroyed/released. "Stopped" ≠ "free."

> **Iron Law (teardown gate):** NO destroy/delete of the machine, release of the IP, or deletion of
> `/storage`/block-storage/snapshot until checkpoints are **pulled to local AND verified by load**, and the
> user has **explicitly approved** the specific cost-affecting action. A destroy is irreversible — "it
> looked done in the log" is not evidence (principle #3). General form →
> `superpowers:verification-before-completion`.

---

## 6. DAEMON TOOL

- **Core machines** — full VMs ⇒ `tmux`/`screen`/`nohup` all available; SSH is as stable as any cloud VM.
  This is the closest analog to the AutoDL tmux-resilient pattern. tmux survives an SSH drop; it does NOT
  survive a machine **stop/restart** (the process is gone), and — critically on Core/Linux — a live tmux
  session does **not** defer the wall-clock auto-shutdown (§4), so durability still rests on
  checkpoint-to-disk + load-latest (principle #8), not on the detach primitive.
- **Gradient Notebooks** — a managed Jupyter sandbox: **no clean persistent SSH-daemon story**, and the
  **auto-shutdown timer is a hard ceiling** — a tmux session started inside a Notebook **still dies at the
  timeout**. Notebooks are not built for unattended multi-day daemons.
- **Platform-native long-job mechanisms** — **Workflows** (DAG automation) and **Deployments** (always-on
  serving). For training-as-a-daemon, prefer **Core + tmux**; treat Notebooks as interactive/short-run only.

If `tmux` is absent on a minimal image, fall back to `nohup <cmd> </dev/null >log 2>&1 &`.

---

## 7. TOP GOTCHAS  (platform-pinned; universal ones → `references/gotchas_universal.md`)

- **PS1 — "Stopped the machine, still getting billed."**
  Symptom: GPU meter halted but the bill keeps climbing while the box is off.
  Root cause: shut-down stops only the **compute** meter; attached **storage** + **public IP** + add-ons +
  snapshots bill hourly until destroyed/released (verified DO pricing 2026-06).
  Fix: to truly stop the meter, **destroy the machine, release the Static IP, delete the storage and any
  snapshot** — separate teardown actions. Audit for orphaned storage/IPs/snapshots after every stop.

- **PS2 — A long run dies at a round-number wall-clock with no error.**
  Symptom: training vanishes at exactly 6 h / 12 h (or the configured Core window); no traceback.
  Root cause: the **auto-shutdown clock**, not a crash — free notebooks 6 h (hard cap), paid notebooks 12 h
  default, Core 1 h–1 wk. On Core/Linux the clock is **wall-clock, not idle** — an active SSH/tmux session
  does NOT extend it (verified DO manage-auto-shutdown 2026-06).
  Fix: checkpoint to `/storage` (Notebooks) or the block disk (Core) **before** the window; for Core, raise
  the auto-shutdown to the longest needed **in the console** (API/CLI cannot change it post-create);
  restart + load-latest to resume.

- **PS3 — `pip install` (or any non-`/storage` write) vanishes after a Notebook restart.**
  Symptom: packages installed in-session are gone next session; "saved" files disappear after stop/restart.
  Root cause: `pip` writes to `/usr/local/lib`, which is **ephemeral workspace** — only `/storage` and
  `/notebooks` persist (verified fast.ai forum + DO storage-architecture 2026-06). "Machines are snapshots,
  not servers," so in-session installs do not persist.
  Fix: install into a persisted dir — `pip install --user` (lands in the home dir under a persisted tree)
  or `pip install --target /storage/pyenv && export PYTHONPATH=/storage/pyenv`; write all
  checkpoints/logs/outputs under `/storage`; verify they landed (`ls`/checksum) before stop.

- **PS4 — Automation 404s / silently no-ops / installs the wrong SDK.**
  Symptom: a `gradient`-era create/stop call fails or does nothing; or `pip install gradient` (v3+) imports
  an inference SDK with no notebook/machine commands.
  Root cause: **legacy Gradient REST endpoints deprecated 15 Jul 2024**; **`gradient-cli` v2 deprecated**;
  **`gradient-python` v3 is the DigitalOcean Gradient AI inference SDK — a name collision**, not the
  orchestration CLI (verified github.com/Paperspace/gradient-cli + digitalocean/gradient-python 2026-06).
  Fix: for new work use the **`pspace` CLI** (github.com/Paperspace/cli); to keep old scripts alive pin
  `pip install "gradient<3.0"`. Pin and verify the CLI binary + version in any automation.

- **PS5 — Custom template / storage / volume "not found" in a different datacenter.**
  Symptom: a saved template or block volume is unavailable when launching elsewhere; block-storage resize
  can't be undone.
  Root cause: storage and templates are **region/DC-locked**, and **block-storage expansion is
  irreversible** (one-way filesystem grow).
  Fix: pick the datacenter deliberately and keep storage+compute+template co-located; size block storage
  with headroom up-front (cannot shrink).

- **PS6 — SSH alias breaks after every restart.**
  Symptom: the saved `ssh` host no longer connects after a machine restart.
  Root cause: a **Dynamic public IP** is released on power-off and reassigned on start (new IP each time).
  Fix: attach a **Static IP** for stable SSH/endpoint addressing (it bills until deleted, capped $3/mo —
  `PS1`), or re-resolve the address on each start before scripting. Note: API/CLI can manage a *static* IP
  but cannot add a *dynamic* one to an existing machine (request dynamic at create time).

- **PS7 — Free-tier notebook code is PUBLIC by default.**
  Symptom: proprietary/confidential code is world-readable in a Gradient free notebook.
  Root cause: free Gradient notebooks are **public by default; private notebooks require a paid plan**
  (verified Paperspace blog / pricing 2026-06).
  Fix: never put confidential code or any secret in a free notebook; upgrade to a paid plan for private
  notebooks. Treat the free tier as a public scratchpad. (Secrets hygiene → `references/gotchas_universal.md`.)

- **PS8 — Free notebook won't start / sits "pending."**
  Symptom: a free-GPU notebook stays pending or errors "out of capacity"; only one notebook will run.
  Root cause: free tier = **1 concurrent running notebook, ≤5 projects, 5 GB `/storage`**, and free machines
  are pooled — a pending notebook is queued for the next free machine (verified Paperspace free-instances
  docs + blog 2026-06).
  Fix: expect queueing on free; stop the other free notebook (only one runs); for assured access use a paid
  instance type, which skips the free queue.

- **PS9 — A destroyed machine keeps billing via a leftover snapshot.**
  Symptom: machine destroyed, yet a small monthly charge persists.
  Root cause: **snapshots are a separate resource that survives a machine destroy** and bills at
  `$0.29/GB/mo` until deleted; auto-snapshot defaults to "Never"/0 but a manually-enabled policy (daily by
  default, up to 10 stored) silently accrues (verified DO pricing + blog/automated-snapshots 2026-06).
  Fix: when tearing down, delete the snapshot too (console or CLI); audit the snapshots list after every
  machine destroy. Capped per-resource by the monthly maximum but still a bleed.

- **PS10 — Notebook upload/import fails on the 5 GB free cap.**
  Symptom: uploading a multi-GB dataset to `/storage` fails for an unpaid account.
  Root cause: free `/storage` allowance is **5 GB**; overage is **$0.29/GB/mo** (paid plans include more:
  e.g. 200 GB / 1 TB tiers) (verified Paperspace pricing + fast.ai forum 2026-06).
  Fix: stream/stage the dataset rather than uploading the whole thing, prune aggressively, or upgrade the
  plan; redirect HF/torch caches off `/storage` if they would push over the allowance.

- **PS11 — ML-in-a-Box CUDA/driver too old for current PyTorch on a new-arch GPU.**
  Symptom: `The NVIDIA driver on your system is too old (found version 110xx). Please update your GPU
  driver`, or `no kernel image is available for execution` on a fresh card.
  Root cause: the template's **host driver/CUDA stack lags newer PyTorch wheels**; on a rental the host
  driver is host-global and a tenant usually cannot upgrade it (verified github.com/Paperspace/ml-in-a-box
  issue #13 2026-06). This is the platform-pinned face of the universal CUDA-triangle (U28).
  Fix: install a torch build matching the box's CUDA (do not force-upgrade the host driver on a rental);
  pick a template whose Ubuntu/driver matches the GPU (22.04 for H100/A100). Full triangle → U28 in
  `references/gotchas_universal.md`.

- **PS12 — Gradient Deployment / custom image won't pull or drifts.**
  Symptom: a Deployment fails to pull `<user>/img:tag`, or "the same image" behaves differently over time.
  Root cause: a moving tag (`:latest`) resolves to a different layer set; private-registry creds missing.
  Fix: pin the image by digest (`@sha256:`) and supply registry creds as a Gradient **secret**, not inline.
  General form → U30 in `references/gotchas_universal.md`.

- **PS13 — Platform-specific debugging.** Commands + what to check (Core uses standard Linux tooling; the
  Notebook-only items are the platform delta):
  - **Confirm GPU + driver/torch match:** `nvidia-smi` (driver/CUDA version) then
    `python -c "import torch;print(torch.__version__, torch.version.cuda, torch.cuda.is_available())"` —
    a mismatch here is `PS11`/U28, not a code bug.
  - **Find what is eating the 5 GB / over-allowance `/storage` (the platform's own recommended cmd):**
    `du -sch .[!.]* * | sort -h` (or `!du -sch …` in a cell); install `ncdu` for an interactive view
    (verified DO notebooks/how-to/manage-storage 2026-06). Check `df -h` AND `df -i` (inodes, U7).
  - **Is a Notebook write durable?** `df -h /storage /notebooks` and confirm the target is one of those two
    mounts — anything else (incl. `/usr/local/lib`) is ephemeral (`PS3`).
  - **Why did the run vanish?** Walk the universal ladder (U3): `dmesg | grep -iE 'killed process|out of
    memory'` (OOM?), `uptime` (recent reboot = auto-shutdown fired, `PS2`), `nvidia-smi` (GPU idle = died,
    not hung). A round-number `uptime`-near-window with a clean `dmesg` ⇒ auto-shutdown, not a crash.
  - **Detect a stuck/slow download:** watch the target file size grow
    (`watch -n5 'ls -l /storage/<file>'`); a flat size with a live process = stalled wire (U12 resumable
    loop). Egress is direct/unproxied here, so a stall is route/peer, not a missing proxy hook.
  - **Audit orphaned billables before declaring teardown done:** in the console (or `pspace`) list
    machines, **public IPs**, **storage/volumes**, and **snapshots** — `PS1`/`PS9` hide in the last two.

---

## 8. SCRIPT OVERRIDES

Values to parameterize the `scripts/` templates for Paperspace. Forward-slash paths; placeholders for any
host/IP (never a real address). Core and Gradient differ — both shown.

```sh
# --- Gradient Notebook ---
DATA_DIR=/storage                # team-shared persistent; survives stop AND notebook delete
DURABLE_DIR=/storage             # checkpoints land here (NOT /notebooks — dies with the notebook)
SCRATCH=/tmp                     # ephemeral workspace; wiped on stop — never the only copy
HF_HOME=/storage/.cache/huggingface     # redirect cache off ephemeral workspace (watch the 5 GB free cap, PS10)
PROXY_HOOK=                      # none — direct egress (no network_turbo)
CRED_FILE=""                     # Paperspace keys are Gradient secrets / env vars, not files — WANDB_API_KEY/HF_TOKEN arrive via the secret/env (run_one's [ -n "$CRED_FILE" ] guard skips the file read); never write keys to /storage (team-shared)
DETACH=                          # no clean tmux; Jupyter kernel + hard 6h/12h auto-shutdown ceiling
# NOTE: pip into /storage to persist — pip install --target /storage/pyenv && export PYTHONPATH=/storage/pyenv (PS3)

# --- Core machine (preferred for daemonized training) ---
DATA_DIR=/path/to/blockstore     # placeholder — the attached block disk mount
DURABLE_DIR=/path/to/blockstore/ckpts
SCRATCH=/tmp
HF_HOME=/path/to/blockstore/.cache/huggingface
PROXY_HOOK=                      # none
CRED_FILE=""                     # Paperspace keys are Gradient secrets / env vars, not files — WANDB_API_KEY/HF_TOKEN arrive via the secret/env (run_one's [ -n "$CRED_FILE" ] guard skips the file read); inject at launch, never inline
DETACH=tmux                      # survives SSH drop, NOT a machine stop, and NOT the wall-clock auto-shutdown — rely on checkpoint+resume
SSH_HOST=<machine-ip>            # placeholder — ML-in-a-Box user is `paperspace`; pin a Static IP for a stable alias (PS6); dynamic IP changes every start
```

Reminder: secrets referenced by env-var NAME or Gradient secret only — never inline a key, and never write
one onto the team-shared `/storage` (universal secrets gotcha → `references/gotchas_universal.md`).
