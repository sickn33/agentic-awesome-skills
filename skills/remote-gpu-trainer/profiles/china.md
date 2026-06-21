---
platform: china-family       # 矩池云 Matpool · 恒源云 Gpushare · Featurize · 揽睿星舟 LanRui
kind: ssh-rental             # all four: SSH + Jupyter + tmux, cgroup-isolated, prebuilt conda base
meter_stop_verb: per-platform   # 停止并释放 (Matpool) | 关机→释放 (Gpushare) | 实例归还 (Featurize) | 停止+销毁数据盘 (LanRui)
meter_stop_irreversible: mixed  # release is irreversible; the persistent vol survives it. (LanRui 数据盘 billing-while-stopped is a cost trap, not irreversibility — §5/LR1)
detach_primitive: tmux       # preinstalled on most images; backgrounded python survives tab-close too
spot_available: false        # on-demand only — NO mid-run spot reclaim (see §4)
spot_grace: n/a              # the involuntary-loss vector is auto-release of STOPPED instances, not preemption
shared_fs: per-platform      # /mnt | /hy-netdisk(+/hy-nas) | work+/cloud | /home/user/netdisk/data — region/machine-scoped, see §2
inode_cap: undocumented      # size caps documented (5/20/30/10 GB free); inode caps NOT — measure df -i live
free_egress: true            # intra-China; cross-GFW pulls need a mirror (see references/china-network.md)
china_mirror_needed: true    # all four sit behind the GFW — mirror/proxy story is shared, not per-platform
host_driver_cuda_max: image-dependent
local_nvme: per-platform     # Gpushare /hy-tmp, LanRui /home/user/datadisk, Featurize local scratch
---

# Profile: Chinese GPU-rental family (Matpool · Gpushare · Featurize · LanRui)

One-line purpose: the AutoDL-shaped Chinese rentals — near-clones that share AutoDL's SSH+tmux+prebuilt-base
spine but diverge on **what survives a stop**, **whether a stopped data disk still bills**, and **which (if
any) academic proxy** ships. Treat AutoDL (`profiles/autodl.md`) as the reference implementation; this profile
records only the deltas, at the FAMILY level first, then a per-platform comparison table.

> **Surface to the user up front (principle #10):** ⚠️ Danger clocks (per platform, §5) — a **stopped instance is auto-released** (Gpushare ~10 days, others vary) → data gone; **LanRui's 数据盘 bills while stopped**; Gpushare's **`/hy-tmp` is wiped 24 h after stop** and `/root` resets to the image. Conveniences — built-in **JupyterLab / TensorBoard** quick-tools (all four); **declare any custom port at rent time** ("高级选项") — it can't be opened later.

**To jump:** `grep -in '<keyword>' profiles/china.md` (e.g. `proxy`, `ephemeral`, `bills`, `inode`, `LanRui`).

## Table of contents
1. LAUNCH · 2. STORAGE MODEL (survival matrix + `/root`-ephemeral trap) · 3. NETWORK (→ `references/china-network.md`)
· 4. SPOT/INTERRUPTION · 5. TEARDOWN/BILLING · 6. DAEMON TOOL · 7. TOP GOTCHAS (universal → `references/gotchas_universal.md`)
+ Platform-specific debugging · 8. SCRIPT OVERRIDES · 9. Per-platform comparison table

> Universal gotchas (CRLF, cgroup OOM, silent sync, tmux-holds-script, disk-budget, secrets-off-shared-FS)
> are NOT restated here — see `references/gotchas_universal.md`. The mirror/proxy/download story is NOT
> restated either — it is shared across all CN platforms and lives in `references/china-network.md`.

---

## 1. LAUNCH

All four: web console rents a marketplace machine → pick GPU count + a **prebuilt image** (PyTorch/TF + CUDA)
that *is* the env → connect via SSH (auto-generated password or pushed public key) + JupyterLab; VS Code
Remote-SSH works on all of them.

**Env contract — the image/base IS the env; do not `conda create` on a rental.** Same rule as AutoDL, with
per-platform base-activation wrinkles (verified per-platform docs 2026-06):
- **Featurize** — base is fully provisioned and used directly; `pip`/`conda install` into base persists on the
  `work` workspace. Activate and run.
- **Matpool** — ships a **`myconda` env that auto-activates on startup** (interpreter at
  `/root/miniconda3/envs/myconda/bin/python`). Run directly; no re-enable needed (verified matpool conda docs
  2026-06 — this corrects the earlier "auto-activate off" note, which was true only for Gpushare).
- **Gpushare** — ships miniconda but **base auto-activate is *disabled*** (`登陆终端默认取消了自动进入 base 环境`).
  Re-enable (`conda config --set auto_activate_base true`) or activate the named env per session
  (verified gpushare.com/docs/best_practices/conda 2026-06).
- **LanRui** — image-provisioned (PyTorch images are a purchasable image option); base used directly.

An unavoidable custom env goes **on the persistent disk** (`--prefix /<persistent-mount>/myenv`), never the
small system disk (§2) — a system-disk env is wiped wherever `/root` is ephemeral. On Gpushare specifically,
docs recommend `conda create -p /hy-netdisk/myenv` (NOT `/hy-tmp` — that auto-clears 24 h after shutdown, GS5).

→ **verify:** `ssh <alias> 'python -c "import torch;print(torch.cuda.is_available())"'` returns `True`
against the *prebuilt* interpreter, before any install.

---

## 2. STORAGE MODEL  *(survival matrix — principle #4)*

**The family-level trap that breaks ported AutoDL habits: `/root` (the system disk) is NOT durable on every
platform.** AutoDL persists `/root` across a power-off; here it ranges from "resets to image state on every
restart" (Gpushare) to "wiped the instant the instance is returned" (Featurize). Checkpoints MUST go to the
platform's persistent mount, not `/root`.

Each platform pairs a **small reset-prone system disk** with a **persistent network/data disk**:

| Platform | System disk (`/root` etc.) | Persistent mount | Local fast scratch | Free quota |
|---|---|---|---|---|
| Matpool | `/root` (instance-local; snapshot-captured) | **`/mnt`** netdisk (survives release, expandable, region-scoped) | `/root` (local) | 5 GB netdisk |
| Gpushare | `/` incl. `/root` — **resets to image on stop/restart** | **`/hy-netdisk`** (only on *marked* machines) | **`/hy-tmp`** (local SSD; auto-cleared 24 h after stop) | 20 GB sys disk |
| Featurize | wiped on return | **`work` = `/home/featurize`** (persists) + **`/cloud`** sync drive | local (non-persistent) | **30 GB** free cloud |
| LanRui | system disk lost on stop | **数据盘 = `/home/user/datadisk`** + shared **`/home/user/netdisk/data`** | 数据盘 (block-storage, ≈ sys-disk speed) | 网盘 10 GB free |

**Survival matrix (family):**

| Tier | Survives STOP? | Survives RELEASE/RETURN? | Notes |
|---|---|---|---|
| System disk / `/root` | varies (Gpushare: **NO, resets to image**; Featurize: wiped on return) | NO | never the checkpoint target |
| Persistent netdisk / 数据盘 | YES | YES (except LanRui 数据盘 still **bills** — §5) | the only safe checkpoint target |
| Cross-instance shared folder | YES | YES | region/zone/machine-scoped; **clobber risk** (see gotchas) |
| Gpushare `/hy-tmp` (local SSD) | **NO — auto-cleared 24 h after shutdown** | NO | fast scratch only; copy results to `/hy-netdisk` before stop (GS5) |

**Region / scope locks** (analog of AutoDL's region-scoped FS):
- **Matpool** — `/mnt` netdisk is **region-scoped**: different regions have separate netdisks that don't
  interconnect; pick the region before expanding storage (verified matpool FAQ 2026-06).
- **Featurize** — code in `work`/`/cloud` persists; per common usage reports the cloud sync drive does not
  share across different regions, while *datasets* are reusable — confirm all instances of a sweep are
  same-region before fan-out. *(med confidence — official wording not re-verified 2026-06.)*
- **Gpushare** — `/hy-netdisk` exists **only on machines marked as supporting 内网存储**; an unmarked machine
  has no shared mount. A separate **`/hy-nas`** shared storage (0.0007 元/GB·h) exists on specific instances
  (verified gpushare.com/docs/data 2026-06).
- **LanRui** — `/home/user/netdisk/data` is a **per-availability-zone shared folder auto-mounted into *every*
  workspace in that zone** (`data 文件夹下的任何数据，都可以在该可用区下的所有工作空间中使用`) — convenient,
  but a parallel-ablation clobber hazard (gotcha LR2). The 网盘 is poor at many-small-file *writes*; use the
  数据盘 for that (verified docs.lanrui.co storage 2026-06).

**Inode caps:** size caps are documented (5 / 20 / 30 / 10 GB free across the four); **explicit inode caps are
NOT documented by any of them**. The many-small-files metadata-exhaustion risk still transfers to any shared
FS — measure `df -i <persistent-mount>` on a live instance in Phase 0 rather than assuming a number. Redirect
HF/ModelScope caches off the small system disk → see `references/china-network.md` §2.

State the checkpoint mount for §5's teardown verb: write to the **persistent netdisk/数据盘**, never `/root`.
On Gpushare, also stage hot datasets to `/hy-tmp` (local SSD) for IO, but copy results back to `/hy-netdisk`
before stopping — `/hy-tmp` is local AND auto-wiped 24 h after shutdown (GS5).

---

## 3. NETWORK

**The entire mirror / proxy / resumable-download story is shared across all CN platforms and lives in
`references/china-network.md` — do NOT duplicate it here.** That reference owns the mirrors table
(PyPI/conda/HF), `HF_ENDPOINT=https://hf-mirror.com`, the ModelScope fallback, the resumable-download retry
ladder, the `hf_transfer` hang caution, and the `no_proxy` trap. Only the per-platform **egress accelerator**
differs and is recorded here (verified per-platform docs 2026-06):

- **Gpushare — has a real academic proxy** (the closest analog to AutoDL's `/etc/network_turbo`):
  `export https_proxy=http://turbo.gpushare.com:<PORT> http_proxy=http://turbo.gpushare.com:<PORT>`
  (a `turbo2.gpushare.com:<PORT>` backup host also exists). Two critical differences from AutoDL: (a) it is
  **per-session export**, NOT auto-sourced — re-run it in every new terminal/tmux pane; (b) it **whitelists
  only `*.github.com`, `*.github.io`, `*.githubusercontent.com`, `*.githubassets.com`, `*.huggingface.co`,
  `*.pytorch.org`, `*.kaggle.com` and *restricts every other host*** — so
  `unset http_proxy https_proxy` (or `unset http_proxy && unset https_proxy`) the moment the accelerated pull
  finishes, or `pip`/`apt`/domestic mirrors mystery-fail (gotcha GS2). This is exactly the
  `no_proxy`/route-specific trap in principle #7 — validate the speed test on the same route the real transfer
  uses (verified gpushare.com/docs/instance/network_turbo 2026-06).
- **Matpool** — no one-command egress proxy; ships source-switch scripts under `/public/script/`
  (`switch_conda_source.sh`, `switch_pip_source.sh`, `switch_apt_source.sh`). Fall back to mirrors
  (`references/china-network.md`).
- **Featurize / LanRui** — no documented one-command academic proxy surfaced; mirrors only.

**Port exposure:** JupyterLab/TensorBoard are built-in quick-tools (all four). **Custom ports must be declared
at rent time** ("高级选项" on Matpool, e.g. HTTP-6006 TensorBoard / HTTP-8888) — they cannot be opened
post-launch. Ports may change on restart — re-read the console, don't hard-code a port in an alias. SSH is
standard OpenSSH (scp/rsync work directly; no proxied-SSH `scp` limitation). Sanitized shapes:
`ssh -p <PORT> root@<region>.matpool.com` (Matpool, e.g. `hz.matpool.com` / `hz-t2.matpool.com`),
`ssh -p <PORT> root@<host>.gpushare.com` (Gpushare),
`ssh user@ssh.<region>.lanrui-ai.com -p <PORT> -i ~/.ssh/id_rsa` (LanRui — public-key must be uploaded to the
console first).

---

## 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*

**These are on-demand-only platforms — there is NO spot bid and NO documented mid-run reclaim.** Do not
build SIGTERM-grace preemption handling here; aggressive retry-on-preemption is over-engineering on this
family. The real involuntary-loss vectors are:

1. **Auto-release of *stopped* instances.** Gpushare auto-releases (deletes, unrecoverable) a stopped
   pay-as-you-go instance **10 days after stop** (`实例停止 10 天后，会自动释放` — verified
   gpushare.com/docs/instance/manage 2026-06). On arrears, **at noon on the 15th day** Gpushare deletes
   personal data + the `/hy-nas` shared storage + custom images. A stopped box is not a parked box — pull
   anything needed off it before that window.
2. **`/hy-tmp` 24-hour auto-clear (Gpushare).** Distinct from instance release: even on a *running* server,
   `/hy-tmp` data is deleted **24 h after the instance is shut down**, and is also wiped on instance migration
   (GS5).
3. **GPU-idle auto-shutdown.** Most platforms offer an opt-in "idle → auto-stop" policy to prevent waste; if
   enabled it can stop a job that merely went quiet (e.g. between epochs with no GPU util) — keep it off for
   long single-GPU jobs unless heartbeat is guaranteed.
4. **Platform churn (LanRui).** LanRui migrated domain `lanrui-ai.com` → **`lanrui.co`** (old-domain data not
   retained after **2024-11-01**) and retired its **T1/T2 zones on 2025-06-30**, moving users to a new "Cova"
   platform — **re-verify current console paths/domain before scripting against any cached LanRui path**.

**Resume hook:** checkpoint-to-durable + load-latest-on-startup (principle #8) is still the right spine — here
it guards against a forgotten stop, a 10-day auto-release, and a `/hy-tmp` 24 h wipe, not a spot kill. The
cadence formula in `references/spot-resilience.md` still applies if a job is long enough to span a forced stop.

---

## 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law)*

**The meter-stop verb is per-platform — bind it from the table below before clicking anything.** The Iron Law
(SKILL.md Phase 5) holds unchanged: NO release/return/destroy until checkpoints are **pulled to local AND
verified by load**, and the user has approved the cost-affecting action.

| Platform | Meter-stop verb | What it preserves | Cost trap |
|---|---|---|---|
| Matpool | **停止并释放** (stop+release) | `/mnt` netdisk persists (region-scoped) | `.snap` snapshots silently eat the 5 GB netdisk (MP1) |
| Gpushare | **关机** stops compute → **释放** deletes | `/hy-netdisk` persists; `/hy-tmp` cleared 24 h post-stop; `/root` **resets to image** | stopped instance **auto-released at 10 days** (GS4); arrears purge day-15 noon |
| Featurize | **实例归还** (return) | only `work` (`/home/featurize`) + `/cloud` persist | everything else **wiped immediately on return** (FZ1) |
| LanRui | **停止** stops compute; **must *销毁数据盘*** (destroy the 数据盘) to stop disk billing | 网盘 + 数据盘 persist | **数据盘 bills hourly while the workspace is merely STOPPED** (LR1) |

**The single most dangerous divergence: on LanRui, "stop to save money" is wrong.** The 数据盘
(`/home/user/datadisk`, block storage, bought in 200 G / 500 G specs) bills hourly from *creation* until
*destroyed*, even while the workspace is stopped — `工作空间停止运行，未销毁的数据盘也将持续计费` (verified
docs.lanrui.co storage + lanrui.co/pricing 2026-06). So a stopped LanRui workspace keeps a meter running. To
actually stop all billing: stop the workspace AND destroy the 数据盘 (after the Iron-Law pull+verify). The 网盘
(10 GB free, 0.15 元/GB·月 overage) persists separately. Contrast: on Matpool/Gpushare/Featurize,
release/return/归还 ends compute billing and the persistent volume simply survives (Gpushare /hy-netdisk and
/hy-nas bill per-GB but are not destroyed by stopping).

**Cost-pause analogs (cheaper than full release, data kept):** Gpushare **无卡模式 / 无卡启动** (low-core
CPU-only restart, no GPU) is the analog of AutoDL's no-GPU restart — keeps `/hy-netdisk` data while paused at a
fraction of the GPU rate, ideal for env-config + dataset download (verified gpushare 无卡启动 announcement
2026-06). LanRui supports an **auto-stop timer** (set a stop time at workspace start) and per-hour billing.

---

## 6. DAEMON TOOL

**tmux** is the family detach primitive — preinstalled on most images. Caveat (from Matpool docs, true
family-wide): **run tmux from a local SSH session, NOT the Jupyter web terminal** — keybindings collide with
tmux's prefix. A backgrounded `nohup python … </dev/null >log 2>&1 &` also survives a tab-close / page refresh
on Featurize (process not killed; only notebook cell state lost) — but tmux is preferred for a named,
re-attachable session.

tmux survives an **SSH drop** but **NOT** an instance **stop/restart** on any platform (on Gpushare the restart
resets `/root`, taking the tmux server and any `/root` logs with it) — so the durable spine is
checkpoint-to-persistent-disk (§2, principle #8), not the tmux session. LanRui additionally supports
**multi-machine multi-GPU distributed training** — if used, see `references/multinode.md`.

---

## 7. TOP GOTCHAS  *(platform-pinned; universal ones → `references/gotchas_universal.md`)*

### Family-wide (China-specific, not in the universal catalog)

**CN1 — `/root` ephemerality silently loses work.**
Symptom: code/checkpoints written to `/root` vanish after a stop/restart (Gpushare) or instance return
(Featurize). → Root cause: the system disk resets to image state / is wiped on return — unlike AutoDL, which
persists `/root` across power-off. → Fix: write *everything* to the persistent mount (§2); treat `/root` as
RAM. Audit with `ls <persistent-mount>` after a test stop before trusting it for a real run.

**CN2 — GPU-idle auto-stop kills a quiet job.**
Symptom: a long job dies mid-run with no error; console shows "auto-stopped (idle)". → Root cause: an opt-in
idle-shutdown policy stopped the instance during a low-GPU-util phase (data loading, eval, between epochs).
→ Fix: disable idle-auto-stop for long jobs, or emit a periodic GPU-touching heartbeat; confirm the policy
state in Phase 0.

### Matpool (matpool.com)

**MP1 — `.snap` snapshots silently consume the 5 GB netdisk.**
Symptom: "保存环境" / snapshot saves fail or the netdisk fills with no obvious culprit. → Root cause: snapshots
are written as `.snap` files **into the netdisk** and count against its tiny 5 GB quota (verified matpool
snapshot docs 2026-06). → Fix: prune old `.snap` files (deleting one frees the quota); keep only the latest
needed env snapshot.

**MP2 — `/mnt` is excluded from snapshots, and the machine is locked while saving.**
Symptom: "保存环境" doesn't capture code under `/mnt`; the instance is unusable during the save. → Root cause:
a snapshot captures **everything *except* `/mnt`** (the netdisk mount), and the machine cannot be used while
the snapshot writes. → Fix: to *shrink* a snapshot move code/data to `/mnt` first (it won't be captured); to
*preserve* code via snapshot keep it OFF `/mnt`. Ensure no running process before triggering a save.

**MP3 — region-scoped netdisk strands data on a sweep across regions.**
Symptom: a second instance in another region can't see files written by the first; expanded storage "missing".
→ Root cause: `/mnt` netdisks are separate per region and do not interconnect. → Fix: keep all instances of a
sweep in one region; pick region before expanding (verified matpool FAQ 2026-06).

### Gpushare (gpushare.com)

**GS1 — `/root` resets to image state on every shutdown/restart.** (The instance of CN1 to remember by name.)
Symptom: installed packages / code / logs under `/root` gone after restart. → Root cause: only `/hy-tmp` and
`/hy-netdisk` persist; `/` reverts to the image. → Fix: env on `/hy-netdisk`, hot data on `/hy-tmp`, results
synced to `/hy-netdisk` before stop.

**GS2 — turbo proxy left on blocks non-whitelisted hosts.**
Symptom: after `export …turbo.gpushare.com…`, `pip install` / `apt` / domestic mirrors hang or `ProxyError`.
→ Root cause: the academic proxy whitelists only GitHub/HF/PyTorch/Kaggle and **restricts everything else**
(verified network_turbo docs 2026-06). → Fix: `unset http_proxy https_proxy` the moment the accelerated pull
finishes (§3). Same shape as the `no_proxy` trap in `references/china-network.md`.

**GS3 — `/hy-netdisk` absent on unmarked machines.**
Symptom: scripts referencing `/hy-netdisk` fail on some rentals. → Root cause: the shared netdisk exists only
on machines marked as supporting 内网存储. → Fix: check `mount | grep hy-netdisk` in Phase 0; fall back to
personal cloud storage via `oss cp` (OSS tool, ~300 Mbps, compressed archives only) if absent.

**GS4 — stopped instance auto-released at 10 days; arrears purge at day 15.** Symptom: a parked stopped
instance disappears, or shared/personal data is gone after non-payment. → Root cause: pay-as-you-go auto-
release 10 days after stop (`实例停止 10 天后自动释放`); on arrears, day-15-noon deletes personal data +
`/hy-nas` + custom images (verified gpushare docs 2026-06). → Fix: pull results off a stopped box promptly;
don't treat "stopped" as durable parking; keep the balance positive.

**GS5 — `/hy-tmp` auto-cleared 24 h after shutdown (and on migration).** *(NEW — corrects the prior "/hy-tmp
persists" assumption.)* Symptom: training data/scratch under `/hy-tmp` gone the day after a stop, even though
the instance still exists. → Root cause: `/hy-tmp` is per-server local scratch, auto-deleted 24 h after
shutdown and wiped on instance migration (verified gpushare.com/docs/data/storage 2026-06). → Fix: treat
`/hy-tmp` as IO scratch only; sync anything durable to `/hy-netdisk` before stopping; do NOT
`conda create -p /hy-tmp/...` for a persistent env (use `/hy-netdisk`).

### Featurize (featurize.cn)

**FZ1 — anything outside `work`/`/cloud` is wiped the instant the instance is returned.** (The strictest
"what survives" rule of the four.) Symptom: results outside `/home/featurize` or `/cloud` gone after 归还.
→ Root cause: only `work` (per-user cloud storage, `工作区可以一直保存项目文件`) and the `/cloud` sync drive
persist; everything else is destroyed on return (verified Featurize tutorials 2026-06). → Fix: write all
durable output under `work`/`/cloud`; verify before returning.

**FZ2 — `/cloud` sync drive lag makes edits *look* saved but not land.** Symptom: VS Code edits / files appear
saved locally but are missing after reconnect or return (the "工作区中修改代码后无法保存" complaint). → Root
cause: the Remote-SSH sync to the cloud drive is not always real-time, especially on slow links or large files.
→ Fix: explicit `Ctrl+S`, then verify on the server (`ls -la` / `cat` the file) before trusting it; on a
flaky connection, close and re-open the Remote-SSH session (transient failures are expected).

**FZ3 — 30 GB free cloud quota silently breaks large writes / `conda create`.** *(corrects the prior "~20 GB"
figure.)* Symptom: env creation or large copies into `work`/`/cloud` fail or truncate. → Root cause: the free
cloud storage is **30 GB** (verified featurize.cn 2026-06); over it, writes fail. → Fix: `du -sh ~/work /cloud`
to watch headroom; keep only the active env there; large reproducible scratch belongs on local
non-persistent disk, not the cloud drive.

### LanRui (lanrui.co / lanrui-ai.com)

**LR1 — 数据盘 keeps billing while the workspace is merely *stopped*.** (The most expensive divergence — see
§5.) Symptom: a stopped LanRui workspace still accrues cost. → Root cause: the 数据盘
(`/home/user/datadisk`) bills hourly from creation until *destroyed*, independent of workspace run-state
(`工作空间停止运行，未销毁的数据盘也将持续计费` — verified docs.lanrui.co storage 2026-06). → Fix: to stop
all billing, stop the workspace **and** 销毁 the 数据盘 — only after the Iron-Law pull+verify; the 网盘 keeps
the data.

**LR2 — shared `netdisk/data` folder mounted into every same-zone workspace → cross-run clobber.** Symptom:
a parallel ablation overwrites another run's outputs. → Root cause: `/home/user/netdisk/data` is auto-mounted
and shared across *all* workspaces in the same availability zone. → Fix: per-job isolated write paths
(`references/parallel_ablation.md`); never share a mutable output dir under `netdisk/data`. Also: the 网盘 is
poor at many-small-file *writes* — route those to the 数据盘.

**LR3 — platform/domain churn invalidates cached paths.** Symptom: scripted paths/domain fail post-migration.
→ Root cause: domain `lanrui-ai.com` → `lanrui.co` (old data dropped after 2024-11-01); T1/T2 zones retired
2025-06-30 → "Cova" platform. → Fix: re-verify console domain + paths in-session before scripting against any
cached LanRui path.

### Platform-specific debugging

Before trusting a run, in Phase 0 (per platform):
- **Confirm persistence path is real, not `/root`.** `mount | grep -E 'mnt|hy-netdisk|cloud|datadisk|netdisk'`
  then `touch <persistent-mount>/.probe && ls -l <persistent-mount>/.probe`. On Gpushare also confirm
  `/hy-netdisk` is present (GS3) — `mount | grep hy-netdisk` (absent on unmarked machines).
- **GPU + driver sanity.** `nvidia-smi` (GPU visible, mem free, driver/CUDA), then
  `python -c "import torch;print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"`
  against the prebuilt interpreter. Mismatched local-vs-server PyTorch silently breaks checkpoint loads on
  Featurize — match versions.
- **Detect a stuck / throttled download.** `du -sh <cache-dir>` twice ~30 s apart — flat size = stalled (often
  the GFW or a left-on Gpushare turbo proxy restricting a non-whitelisted host, GS2). Cross-check with
  `curl -sI -x "$https_proxy" https://hf-mirror.com` / `env | grep -i proxy`; `unset http_proxy https_proxy`
  and retry on the mirror.
- **Disk / inode pressure (the silent §2 risk).** `df -h <persistent-mount>` AND `df -i <persistent-mount>` —
  a full inode table fails writes while `df -h` still shows free GB. On Matpool, a filling 5 GB netdisk is
  usually stale `.snap` files (`ls -la /mnt/*.snap`, MP1).
- **Verify the meter-stop did what was intended.** After "stop", re-check the console billing line — on LanRui
  a stopped workspace whose 数据盘 was NOT destroyed is still metering (LR1); on Gpushare a stopped box still
  counts toward the 10-day auto-release clock (GS4).
- **Read the running job's log, don't infer from silence.** Job is in tmux/nohup → `tmux capture-pane -pt
  <session>` or `tail -f <persistent-mount>/run.log`. A vanished tmux server after a "restart" means `/root`
  reset (GS1) — the log must live on the persistent mount to survive.

---

## 8. SCRIPT OVERRIDES

Parameterize the `scripts/` templates per platform. `PROXY_HOOK`, `HF_HOME`, and the mirror env all defer to
`references/china-network.md`; only the **mounts** truly differ.

| Var | Matpool | Gpushare | Featurize | LanRui |
|---|---|---|---|---|
| `DURABLE_DIR=` (durable) | `/mnt` | `/hy-netdisk` | `/home/featurize` (+`/cloud`) | `/home/user/datadisk` (or `/home/user/netdisk/data`) |
| `DATA_DIR=` (fast/ephemeral) | `/root` | `/hy-tmp` (24 h post-stop wipe) | local tmp | `/home/user/datadisk` scratch |
| `SCRATCH=` (local, prune) | `/root` | `/hy-tmp` | local tmp | 数据盘 scratch |
| `HF_HOME=` | `/mnt/.cache/hf` | `/hy-netdisk/.cache/hf` | `/cloud/.cache/hf` | `/home/user/datadisk/.cache/hf` |
| `PROXY_HOOK=` | (mirrors only) | `export …turbo.gpushare.com:<PORT>…` then `unset` | (mirrors only) | (mirrors only) |
| `CRED_FILE=""` (no file — env var) | `$WANDB_API_KEY` / `$HF_TOKEN` on **ephemeral** disk, never the shared netdisk | same | same | same |
| `DETACH=` | tmux | tmux | tmux | tmux |

`CRED_FILE=""` because on these CN platforms the credential is an **env var** (or `.netrc`) on the ephemeral
disk, not a file on the netdisk — leave it empty so run_one's `[ -n "$CRED_FILE" ]` guard skips the file read
and `$WANDB_API_KEY` / `$HF_TOKEN` pass through from the platform env.

Common to all: the credential lives in an env var or `.netrc` on the **ephemeral system disk**, never on the
shared/persistent netdisk (a shared `data` folder mounted into every same-zone workspace, like LanRui's, is
especially leaky — universal secrets-off-shared-FS gotcha in `references/gotchas_universal.md`).

---

## 9. Per-platform comparison — the load-bearing differences at a glance

The six questions the schema asks, answered per platform. This is the table to read first when picking which
delta applies.

| Question | Matpool | Gpushare | Featurize | LanRui |
|---|---|---|---|---|
| Prebuilt base-conda env? | yes (**`myconda`, auto-activated**) | yes (miniconda, base auto-activate **off**) | yes (full PyTorch/TF base, pip persists on `work`) | yes (image-provisioned; PyTorch images purchasable) |
| Academic-acceleration proxy? | no (source-switch scripts only) | **yes** `turbo.gpushare.com:<PORT>` (per-session, 7-host whitelist) | no (mirrors only) | no (mirrors only) |
| Shared / region FS? | `/mnt` netdisk (**region-scoped**, expandable) | `/hy-netdisk` (only on *marked* machines) + `/hy-nas` | `work`+`/cloud` (cloud sync; not cross-region, med-conf) | `/home/user/netdisk/data` (shared into *every same-zone* workspace) |
| Inode cap? | undocumented — measure `df -i` | undocumented — measure `df -i` | undocumented — measure `df -i` | undocumented — measure `df -i` |
| Data disk bills while **stopped**? | no (release ends billing) | no (but stopped box auto-released at 10 d; `/hy-tmp` cleared 24 h) | no (return ends billing) | **YES — 数据盘 bills until destroyed** |
| Meter-stop verb | 停止并释放 | 关机 → 释放 (+ 无卡模式 pause) | 实例归还 | **停止 + 销毁数据盘** |
| `/root` survives a stop? | local, lost on release | **NO — resets to image** | **NO — wiped on return** | system disk lost; use 数据盘 |

**Bottom line for porting an AutoDL workflow:** the SSH/tmux/smoke/checkpoint spine transfers verbatim; the
three things to re-bind per platform are (1) the **persistent mount** (never `/root`; on Gpushare never
`/hy-tmp` either), (2) the **meter-stop verb** — and on LanRui, that stopping is not enough, the 数据盘 must be
destroyed — and (3) the **proxy hook** (real proxy only on Gpushare, with a strict whitelist; mirrors-only
elsewhere → `references/china-network.md`).
