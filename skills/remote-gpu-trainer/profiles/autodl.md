# Profile: AutoDL

The deepest, battle-tested profile — a Chinese cgroup-isolated SSH-rental with a 3-tier storage model
and the *one* rental where the meter-stop action is non-destructive. Fills all 8 schema sections
(`profiles/_schema.md`) at full depth. Read this **before Phase 0**; it owns every path, proxy, billing
verb, and TB pin the SKILL.md phases delegate to. Universal gotchas are NOT restated here — see
`references/gotchas_universal.md`.

> **Surface to the user up front (principle #10):** conveniences most users miss — the console has a
> **one-click "设置SSH免密登录"** (registers your key so the agent connects non-interactively), **GPU-availability
> notifications** ("订阅GPU通知"), and built-in **AutoPanel / JupyterLab / TensorBoard** tiles. ⚠️ Danger clocks
> — **关机 (stop) auto-releases the box after 15 days → the data disk is deleted** (AD-DANGER, §5); only
> `/root/autodl-fs` survives a 释放; low balance / arrears force-stop. And the TB tile is **pinned to
> `/root/tf-logs`** — write your logger there (or symlink) or the panel shows empty (AD7 / U39).

To jump: `grep -in '<keyword>' profiles/autodl.md` (e.g. `grep -in inode profiles/autodl.md`).

## Table of contents

1. LAUNCH — entry points + env contract (base miniconda IS the env)
2. STORAGE MODEL — 3 tiers + survival matrix + inode cap
3. NETWORK — academic proxy + China mirrors + pinned TB
4. SPOT / INTERRUPTION + RESUME — effectively on-demand
5. TEARDOWN / BILLING — 关机 stops the meter AND keeps the disk (the AutoDL exception)
6. DAEMON TOOL — tmux / nohup
7. TOP GOTCHAS — AD1..AD9, platform-pinned
8. SCRIPT OVERRIDES — values to parameterize `scripts/`

---

```yaml
---
platform: autodl
kind: ssh-rental
meter_stop_verb: 关机           # shutdown/power-off STOPS billing AND keeps /root + disks
meter_stop_irreversible: false  # the AutoDL EXCEPTION — 关机 is reversible; only 释放/release deletes
detach_primitive: tmux          # nohup fallback when tmux is not installed (often absent on fresh image)
spot_available: false           # on-demand only; no spot/bid/preemption model
spot_grace: n/a
shared_fs: true                 # /root/autodl-fs — region-locked, cross-instance within one region
inode_cap: ~200K                # hard cap on the shared FS, independent of byte capacity
free_egress: true               # no per-GB egress fee, but cross-GFW pulls need the academic proxy (see china_mirror_needed)
china_mirror_needed: true       # behind the GFW — hf-mirror / ModelScope + /etc/network_turbo
host_driver_cuda_max: image-dependent   # the prebuilt image pins torch+CUDA; do not downgrade (AD9)
local_nvme: true                # /root/autodl-tmp data disk is fast local NVMe, per-instance
---
```

---

## 1. LAUNCH

**First time? (rent → reach the box).** On the AutoDL console: pick a GPU + region with stock → **创建实例**
(choose the PyTorch image — the base env ships prebuilt) → register your key once via **设置SSH免密登录**
(so the agent connects non-interactively) → copy the instance's **SSH connection string** + password from the
console → test `ssh -p <PORT> root@connect.<region>.seetacloud.com 'nvidia-smi'`. That string is your entry to
every phase below. (Console-only steps; AutoDL's UI shifts — re-check its docs if a label moved.)

**Entry points.** Web console (创建实例) for create/release/power; per-instance SSH connection string from
the console (`ssh -p <PORT> root@connect.<region>.seetacloud.com`). No first-class platform CLI/REST for
job control — SSH is the orchestration channel. Set a stable alias per instance in `~/.ssh/config`
(`Host autodl-<proj>-<N>`, `HostName connect.<region>.seetacloud.com`, `Port <PORT>`) so every later
command is short; the port is assigned at create-time and **changes on re-create** (update the alias).
SSH/keepalive config → `references/ssh_transport.md`.

**Env contract — the prebuilt base miniconda IS the env (AD6).** The image ships the full DL stack into
**base** (`/root/miniconda3/bin/python`); there is no `/root/miniconda3/envs/<name>/`. Base is the
deliberate single-tenant project env. **Never `conda create` / `conda clone base`** on the rental —
cloning wastes ~16 GB of base packages + the disk just freed, for zero benefit. Train with the explicit
interpreter `/root/miniconda3/bin/python`; in remote polls use that path or pure shell, never bare
`python3` (it may be absent → exit 127). When installing project deps, **filter framework pins** so a
`requirements.txt` does not downgrade the image's torch build (AD9).

> The "no DL in conda base" discipline applies to the *persistent local* machine only — on an ephemeral
> rental, base IS the expected place to run. A local env-guard hook must exempt remote-ssh + instance base.

---

## 2. STORAGE MODEL  *(survival matrix — principle #4)*

Three tiers, each with a different speed / size / inode profile and a **different survival behavior**:

| Tier | Path | Speed | Size | Inode cap | Scope |
|---|---|---|---|---|---|
| System disk | `/` | medium | ~30 GB | none | per-instance |
| Data disk | `/root/autodl-tmp` | **fast NVMe** | per-plan (e.g. ~50 GB) | none | per-instance |
| Shared FS | `/root/autodl-fs` | NFS (slow, ~30 s/sync) | ~200 GB | **~200K (hard)** | **region-locked**, all instances in one region |

**Survival matrix** — the part most platforms get wrong, and where AutoDL is the **exception**:

| Tier | Survives 关机 (stop)? | Survives 释放 (release/destroy)? | Notes |
|---|---|---|---|
| `/` system | **yes** | no | AutoDL persists `/root` across power-off — UNLIKE RunPod/vast/K8s/Colab |
| `/root/autodl-tmp` data | **yes** | no | fast tier; checkpoints written here mid-run |
| `/root/autodl-fs` shared | **yes** | **yes** | the ONLY tier that survives release; region-locked |

**Where checkpoints MUST go for the §5 teardown verb:** write live checkpoints to the fast data disk
(`/root/autodl-tmp/checkpoints/<name>`, never the 30 GB system disk), then **checked-sync `best.pth`
to `/root/autodl-fs`** — the only tier that survives a 释放. If only ever using 关机, the data disk also
survives, but syncing the durable copy to FS is the safe default (a later release loses the data disk).

**Region/DC-lock (AD3).** FS quota is region-scoped; each region has its own physical mount. Files written
from a `<region-a>` instance are invisible to a `<region-b>` instance even at the identical
`/root/autodl-fs/` path. Create the FS quota in the **same region** as the instances; to bridge regions,
pick one region as primary and scp between them (slow). Confirm sharing with a write-from-one / read-from-
another probe before relying on it.

**Inode discipline (AD4).** The ~200K cap is **independent of bytes**: `df -h` can read 34% while `cp`
fails "No space left" because `df -i` is at 100%. The inode bomb is **per-sample eval visualization**
(`files_per_sample × N_samples × N_conditions` → tens of thousands of tiny files); checkpoints (few large
files) are inode-cheap. Monitor `df -i`, not just `df -h` (Phase 0 + every space check). Eval-artifact
sizing policy is owned by **REQUIRED:** verifying-dl-experiments.

**Data-disk hog (AD5).** When `/root/autodl-tmp` hits 100% but `runs/` looks small, the real hog is the
**HF cache symlinked onto the data disk** (`~/.cache/huggingface` → tens of GB of model blobs). Audit
`du -sh ~/.cache/huggingface/hub/models--* | sort -rh` before deleting checkpoints; redirect `HF_HOME` to
the data disk explicitly (see §8). Disk is expandable — prefer expand over silently shrinking the
experiment (principle #9). Get explicit user confirmation naming `rm -rf` targets (the harness classifier
blocks agent-inferred irreversible deletes).

---

## 3. NETWORK

**Egress proxy — `source /etc/network_turbo` is MANDATORY (AD1).** Instances start with no proxy; direct
egress to `api.wandb.ai` / `huggingface.co` / `github.com` / `pypi.org` is unreliable (0.5 s … 300 s …
blocked). Every shell that calls wandb / HF / pip / git must `source /etc/network_turbo` first
(`source /etc/network_turbo 2>/dev/null || true` at the top of every wrapper). It exports
`http_proxy` / `https_proxy` pointing at the in-DC academic proxy (`http://<proxy-ip>:<port>`), a
`no_proxy` allow-list for domestic endpoints, and the CA bundle. Perf delta: wandb push ~0.8 s with turbo
vs >120 s timeout without — no exceptions, even a small `wandb.summary` write can wedge for minutes.

**China mirrors (AD2).** HF behind the GFW → `HF_ENDPOINT=https://hf-mirror.com` or pull from
**ModelScope**. Two compounding traps: (a) HF's **Xet CAS backend** is NOT mirror-proxied (the mirror
covers the API but big `.safetensors` shards still hit the flaky international endpoint) →
`export HF_HUB_DISABLE_XET=1` (or `pip uninstall -y hf_xet`) to force the classic LFS path the mirror does
proxy; (b) `no_proxy` in network_turbo lists `modelscope.com` but **not** `modelscope.cn` — routing a
DOMESTIC source through the international-acceleration proxy SLOWS it. Wrap every download in a
`timeout <s> … && break` retry loop (resumes partial files; a stall ≠ permanent failure). Full mirror
table + `no_proxy` ladder → `references/china-network.md`.

**Port exposure.** AutoDL maps a single custom port (6006) for user services; the platform also exposes
JupyterLab. SSH port is the per-instance `<PORT>` and changes on re-create.

**Platform TensorBoard is pinned to `/root/tf-logs` (AD7).** The image autostarts
`tensorboard --logdir /root/tf-logs --port 6007` on boot and the AutoPanel TB tile proxies straight to that
pid — the `--logdir` is hard-pinned and cannot be reconfigured from inside the container. Events written
anywhere else are invisible in the web tile no matter how correct the `SummaryWriter` setup. Fix: write to
`SummaryWriter(log_dir="/root/tf-logs/<run>")`, or `ln -sfn <your-tb> /root/tf-logs/<run>` (the pinned TB
has `--reload=5`, so the run appears within ~5 s — no restart). Verify with
`curl -s http://127.0.0.1:6007/data/runs` (expect a JSON array with the run), NOT `ss` (can show nothing
inside the container while curl returns 200). Local logs die with the instance — for durable curves use a
hosted tracker (**REQUIRED:** huggingface-skills:huggingface-trackio).

**SSH flavor.** Direct-TCP SSH on the per-instance host:port — `scp`/`rsync` work normally (no proxied-SSH
restriction). Use a per-dir resumable loop for large transfers (single-connection `scp -r` resets mid-
transfer); `rsync -avz --partial` is preferred. Transport patterns → `references/ssh_transport.md`.

---

## 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*

**No spot/bid/preemption model — AutoDL is on-demand.** There is no mid-run eviction, no SIGTERM grace
window to handle (`spot_grace: n/a`). The real loss vectors are: (a) **forgot to release/关机** → idle
billing (principle #1); (b) an instance **reboot** that ends a non-detached process (a vanished process is
not always OOM — enumerate reboot / OOM / SSH-HUP / manual-kill before concluding, see
`references/gotchas_universal.md`); (c) availability — the GPU plan being sold out at create-time (build
retry-until-available, not survive-an-eviction).

**Resume hook.** The universal spine still applies (principle #8): checkpoint atomically to the data disk +
sync `best.pth` to FS, and resume-from-latest unconditionally on relaunch. The detach primitive (§6) makes
the *identical launch command* survive an SSH drop; checkpoint+resume makes it survive a reboot. Cadence
formula → `references/spot-resilience.md` (the formula generalizes even without spot — it bounds
re-compute lost to a reboot).

---

## 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law)*

**关机 (shutdown / power-off) STOPS the meter AND keeps `/root` + both disks — this is the AutoDL
EXCEPTION among rentals.** Everywhere else (RunPod wipes the container disk on stop, vast bills the disk
forever, K8s wipes the pod FS, Colab loses `/content`) a "stop" is lossy or still-billing. On AutoDL,
关机 is the **safe park**: meter off, all three tiers intact, restart later. There is also a **no-GPU /
无卡模式 mode** for cheap restart to copy files or fix the env without paying for the GPU.

| Action | Stops meter? | Keeps `/` + data disk? | Keeps FS? | Reversible? |
|---|---|---|---|---|
| 关机 (shutdown) | **yes** | **yes** | yes | **yes** — restart anytime (the AutoDL exception) |
| 无卡模式 (no-GPU) | mostly (cheap) | yes | yes | yes |
| 释放 (release/destroy) | yes | **NO** | yes | **NO — deletes `/` + data disk irreversibly** |

**Cost trap.** 关机 still bills the data-disk *storage* at a small rate while the GPU meter is off — far
cheaper than running, but not free. Only 释放 fully ends storage billing, at the cost of the data disk.
**⚠️ Auto-release clock (AD-DANGER):** a 关机 (stopped) instance is **auto-released after 15 days** (the
console shows "关机 15 天后释放") → that release deletes `/` **and the data disk**, so 关机 is safe parking
only *within* the window; for a longer pause, sync `best` to `/root/autodl-fs` (survives 释放) or expect to
re-download. Low balance / arrears also force-stop the instance. **Surface this to the user up front
(principle #10)** — most users assume 关机 parks the box indefinitely.
**Teardown Iron Law (SKILL.md Phase 5):** no 释放 / file-delete until `best.pth` is **pulled to local AND
verified by load** (`scripts/verify_local.py`) AND the user explicitly approves — "it looked done in the
log" is not evidence (principle #3). Because 关机 is non-destructive here, the cheap safe move when unsure
is to **关机 and ask**, never 释放 on a guess. **REQUIRED:** superpowers:verification-before-completion is
the general form of this gate.

---

## 6. DAEMON TOOL

**tmux** is the detach primitive when present, but **tmux is often NOT installed on a fresh AutoDL image**
and `apt-get install tmux` fails when egress is down. Zero-dependency fallback:
`nohup bash run_queue.sh queue.txt </dev/null >master.log 2>&1 &` — survives an SSH drop (SIGHUP), needs
no package. Verify either with `pgrep -af <script>`. The detach survives an SSH drop; it does **not**
survive a 关机/reboot — that is what checkpoint+resume (§4) is for.

**Native queue: none.** AutoDL has no built-in scheduler → use the bundled `scripts/run_queue.sh.template`
(resumable queue iterator, `start_index` for resume) driving `scripts/run_one.sh.template` per cell.
**Never overwrite a script a running bash is mid-execution** (bash reads by byte-offset → re-executes
blocks; version the filename) — universal physics, see `references/gotchas_universal.md`.

**Monitoring.** A session-bound watcher dies with the session; for multi-hour runs deploy the four-layer
durable architecture (`references/monitoring_patterns.md`). Detect "done" by a **log marker**
(`grep -q 'QUEUE DONE' master.log`), never by `pgrep` (the waiter's own cmdline matches the pattern and
loops forever). A cloud scheduler cannot reach the rented box (no SSH key in a cloud sandbox — secret
leak); the honest recurring check is the remote self-monitor + a session loop with the local key.

---

## 7. TOP GOTCHAS  (AutoDL-pinned; universal ones → `references/gotchas_universal.md`)

**AD1 — external network call hangs / wandb shows 0 runs.** *Symptom:* `wandb.init` times out at
90/120/180 s, dashboard reads 0 runs while `wandb/run-*` exist locally; HF downloads stall; pip/git glacial.
*Root cause:* instances start with **no proxy**; direct egress to wandb/HF/PyPI/GitHub is unreliable or
blocked, and wandb-core's retry logic under a flaky link can roll back already-uploaded runs. *Fix:*
`source /etc/network_turbo` at the top of **every** shell/wrapper before any external call; recover an
empty cloud project with `for d in wandb/run-*; do timeout 120 wandb sync "$d"; done`.

**AD2 — HF download stalls even with hf-mirror + turbo.** *Symptom:* `from_pretrained` /
`snapshot_download` hangs or `ConnectTimeout` on big `.safetensors` shards. *Root cause:* (a) HF's Xet CAS
backend is not mirror-proxied; (b) `no_proxy` lists `modelscope.com` not `modelscope.cn` (domestic source
forced through international proxy = slower); (c) a curl test run without turbo measures the wrong path.
*Fix:* `export HF_HUB_DISABLE_XET=1` (or `pip uninstall -y hf_xet`) with `HF_ENDPOINT=https://hf-mirror.com`,
or pull from ModelScope to a plain dir + load via local-path override; wrap in a `timeout … && break`
resume loop. Detail → `references/china-network.md`.

**AD3 — cross-region instances cannot share FS.** *Symptom:* two instances in different regions see
identical `/root/autodl-fs/` paths but files written from one are invisible to the other. *Root cause:* FS
quota is region-scoped; each region has its own physical mount. *Fix:* create the FS quota in the same
region as the instances; bridge regions via scp from a chosen primary; verify with a write-one / read-other
probe.

**AD4 — FS write fails "No space left" while `df -h` looks fine.** *Symptom:* `cp`/`mkdir` to
`/root/autodl-fs` fails though `df -h` shows ~34%; `df -i` shows `… 0 100%`. *Root cause:* the shared FS
enforces a **hard ~200K inode cap independent of bytes**; per-sample eval visualization (many tiny files)
exhausts it. *Fix:* monitor `df -i`; cap per-sample eval vis on large test sets (sizing → verifying-dl-
experiments); once a results dir is verified locally, prune its per-sample image subdir from FS; recover by
`find /root/autodl-fs -depth -type d -name '<vis-dir>' -exec rm -rf {} +` to free inodes fast.

**AD5 — data disk full; HF cache is the hidden hog; agent `rm` auto-denied.** *Symptom:*
`/root/autodl-tmp` at 100% though `runs/` looks small; an agent `rm -rf` of "obvious junk" is auto-denied.
*Root cause:* `~/.cache/huggingface` is symlinked onto the data disk, so the **HF model cache** (tens of
GB) is the real hog; the harness blocks irreversible `rm -rf` whose targets the agent inferred. *Fix:*
audit `du -sh ~/.cache/huggingface/hub/models--* | sort -rh`; set `HF_HOME` to a chosen data-disk dir + keep
the metric/eval JSONs (tiny evidence); present exact deletion targets + sizes for explicit user
confirmation; offer "clean vs expand the disk".

**AD6 — base IS the env; a "never use base" rule blocks every remote command.** *Symptom:* a local "don't
run DL in conda base" guard fires on `ssh autodl 'python train.py'`, but `conda env list` shows nothing and
`/root/miniconda3/envs/` is empty; poll scripts calling `python3` exit 127. *Root cause:* the image installs
the whole DL stack into **base** — base IS the single-tenant project env (no `/envs/`), and the image often
ships only `python` (no `python3`). *Fix:* train with `/root/miniconda3/bin/python`; exempt remote-ssh +
instance base from the local guard (never `conda create --clone base`); in remote scripts use the explicit
interpreter or pure shell, never bare `python3`.

**AD7 — platform TensorBoard pinned to `/root/tf-logs`; events elsewhere invisible.** *Symptom:* the
events file is non-empty and `curl http://127.0.0.1:6007/` returns 200, but the AutoPanel TB tile shows
zero runs; `/data/runs` returns `[]`. *Root cause:* the image autostarts `tensorboard --logdir
/root/tf-logs` and the tile proxies that pid; `--logdir` is hard-pinned and not reconfigurable in-container.
*Fix:* write `SummaryWriter(log_dir="/root/tf-logs/<run>")`, or `ln -sfn <your-tb> /root/tf-logs/<run>`
(the pinned TB's `--reload=5` picks it up in ~5 s); verify with `curl … /data/runs`, not `ss`. (Also:
restart the TB server to evict STALE cached tags after deleting/renaming runs.) The cross-platform "live panel silently empty" class (path/port/process mismatch on any platform) is the general form → `references/gotchas_universal.md` U39.

**AD8 — wandb val-phase CPU memory spike to 30+ GB at epoch 1 end.** *Symptom:* at the end of epoch 1
(validation), cgroup memory jumps from ~8 GB to 30+ GB, sometimes wedging the instance. *Root cause:*
project trainers log per-sample distributions at `step==1` (e.g. LPIPS/VGG over ~2000 samples on CPU =
~30 GB activations). *Fix:* cap the val-time sample accumulator — `-o training.val_metric_sample_cap=256`
(project-specific knob; check the trainer for the equivalent). Distinct from a DataLoader-worker cgroup OOM
(universal gotcha).

**AD9 — project torch pin would DOWNGRADE the image's working build.** *Symptom:* the image ships e.g. a
new-arch-capable torch (sm_120); the project pins `torch<2.9`; a naive `pip install -r requirements.txt`
replaces it with a wheel lacking the arch's kernels → `no kernel image is available` at first forward.
*Root cause:* the image torch/CUDA build is matched to the rented GPU arch; the project pin is stale for it.
*Fix:* filter framework pins out of the remote install —
`grep -ivE '^(torch|torchvision|torchaudio)' requirements.txt > /root/req_remote.txt && pip install -r
/root/req_remote.txt` — keep the image build; smoke `torch.cuda.get_device_capability()` + a heavy import
before launch; disclose the off-band torch version with results.

---

## 8. SCRIPT OVERRIDES

The exact values to parameterize the `scripts/` templates (`scripts/run_one.sh.template`,
`scripts/run_queue.sh.template`) for AutoDL:

```sh
DATA_DIR=/root/autodl-tmp             # fast NVMe data disk — live checkpoints, logs, HF cache
DURABLE_DIR=/root/autodl-fs           # region-locked shared FS — the only tier surviving 释放
PROXY_HOOK='source /etc/network_turbo 2>/dev/null || true'   # MANDATORY before any external call (AD1)
CRED_FILE=/root/.wandb_key            # per-instance ONLY — the FS security classifier blocks wandb keys
SCRATCH='latest.pth'                  # prune on success; keep best.pth (the keepable artifact)
HF_HOME=/root/autodl-tmp/huggingface_cache   # redirect off the symlinked ~/.cache hog (AD5)
HF_ENDPOINT=https://hf-mirror.com     # + HF_HUB_DISABLE_XET=1 (AD2)
DETACH=tmux                           # nohup fallback when tmux is absent (§6)
PY=/root/miniconda3/bin/python        # base IS the env — explicit interpreter, never bare python3 (AD6)
TB_LOGDIR=/root/tf-logs               # platform TB is pinned here (AD7)
```

**Credential push (AD-specific).** The FS security classifier blocks files matching wandb-key patterns —
put the key at the **per-instance** `/root/.wandb_key`, never on `/root/autodl-fs`. Stream exactly one
credential block via stdin so the secret never appears in a command; the wrapper reads it
into `WANDB_API_KEY` before launch. Secrets-via-stdin pattern → `references/ssh_transport.md`.

**Checked-sync (the gated success line).** `run_one.sh` writes live checkpoints to
`$DATA_DIR/checkpoints/<name>`, prunes `latest.pth` on success, then syncs `best.pth` to
`$DURABLE_DIR/final_ckpts/<name>` **gating the success echo on the actual copy result** — an unconditional
"synced" lies when the FS inode cap (AD4) silently fails the `mkdir`/`cp` (universal silent-sync gotcha).
Until a download is verified locally, the **data disk** copy is source-of-truth.
