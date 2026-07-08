---
platform: lambda
kind: cloud-api               # REST API / web console / SSH to a normal Ubuntu VM
meter_stop_verb: terminate    # the ONLY action that stops billing; sudo shutdown does NOT
meter_stop_irreversible: true # terminate wipes local NVMe — there is no stop/suspend state
detach_primitive: tmux        # plain Ubuntu; tmux/screen/nohup, install if absent
spot_available: false         # no spot/preemptible tier; interruption is capacity-at-launch
spot_grace: n/a               # no mid-run eviction → no grace window
shared_fs: true               # region-locked NFS filesystem, attach-at-launch only
inode_cap: none               # no documented inode cap; GiB quota only
free_egress: true             # no ingress/egress fees on instances or filesystems
china_mirror_needed: false    # US/global cloud, direct egress; no platform proxy
host_driver_cuda_max: lambda-stack-dependent  # Lambda Stack bundles driver+CUDA+PyTorch; version moves per release — read nvidia-smi on the box, do NOT assume a number
local_nvme: true              # ephemeral root/local NVMe, gone on terminate
---

# Lambda Cloud — Profile

Lambda Cloud is a **cattle-not-pets** GPU cloud: on-demand + reserved instances, a prebuilt **Lambda
Stack** image, and **no stop/suspend state** — an instance can only be **launched, restarted, or
terminated**, and terminate destroys the local NVMe. Nothing on the box survives a teardown except what was
pushed off or written to an attached **region-locked NFS filesystem**. This inverts the AutoDL "关机保留数据"
instinct: here, durable design (checkpoint-to-NFS + idempotent resume) is **mandatory, not optional**.

> **Surface to the user up front (principle #10):** ⚠️ Danger clocks — there is **no stop/suspend**: an instance can only be launched / restarted / **terminated, and terminate wipes the local NVMe** — only the attached **NFS filesystem** survives, and **it keeps billing until you delete it manually** (LAM6). Conveniences — one-click **JupyterLab** per instance, free egress both directions. A terminate→relaunch yields a **new IP**.

> Docs/console domain moved from `lambdalabs.com` to `lambda.ai` (docs at `docs.lambda.ai`, console at
> `cloud.lambda.ai`); the **REST API base is still `cloud.lambdalabs.com/api/v1`** and `cloud.lambda.ai`
> also resolves (verified docs.lambda.ai + cloud-api 2026-06). Treat both hosts as live.

To jump: `grep -in <keyword> profiles/lambda.md`.

**Table of contents** — 1. LAUNCH · 2. STORAGE MODEL (survival matrix) · 3. NETWORK ·
4. SPOT / INTERRUPTION + RESUME · 5. TEARDOWN / BILLING · 6. DAEMON TOOL · 7. TOP GOTCHAS (LAM1–LAM13) +
Platform-specific debugging · 8. SCRIPT OVERRIDES.

Universal gotchas (CRLF, inode/`df -i`, silent sync, cgroup OOM, spot grace) are NOT repeated here —
see `references/gotchas_universal.md`. Universal invariants → `references/principles.md`.

---

## 1. LAUNCH

Entry points:
- **Web console** at `cloud.lambda.ai` → Instances → Launch (pick GPU type + region, attach a filesystem
  here if one is needed — see §2; attach any per-instance firewall ruleset here too — see §3/LAM4).
- **REST API** — `https://cloud.lambdalabs.com/api/v1`, auth `curl -u $LAMBDA_API_KEY:` (basic-auth,
  password empty). Canonical automation surface (verified docs.lambda.ai/api/cloud 2026-06):
  - `GET  /instance-types` — lists every GPU type **and** `regions_with_capacity_available[]` per type.
    This field IS the capacity signal — poll it to know where a type can launch right now (drives LAM5
    retry-until-available).
  - `POST /instance-operations/launch` · `.../terminate` · `.../restart` — create / stop-meter / reboot.
- **SSH** — standard connection to a normal Ubuntu VM; **default user is `ubuntu`** (not `root`); use
  `sudo` for root. One-click **JupyterLab** is offered per instance.
- **SkyPilot** — de-facto orchestration layer: `pip install "skypilot[lambda]"`, key file at
  `~/.lambda_cloud/lambda_keys` containing a line `api_key = <KEY>` (verified docs.skypilot.co 2026-06).
  Use it for retry-until-capacity + autostop (§4, §6).

**Env contract — the image/base IS the env.** Instances ship **Lambda Stack** (NVIDIA driver + CUDA +
cuDNN + PyTorch/TensorFlow, all upgraded together as one apt metapackage). Run in it directly on the
throwaway box — do **not** `conda create` on a rental (`references/principles.md` §2), and do not `pip
install torch` over the top (LAM7/LAM8). Lambda Stack's exact CUDA/driver/PyTorch **moves per release**;
read it off the box (`nvidia-smi`, `python -c "import torch;print(torch.__version__,torch.version.cuda)"`)
rather than assuming a number. The **durable** form of the env is a Docker image (Lambda recommends running
Docker inside the instance) or a setup script replayed on each launch — because terminate destroys the box.
Reserved / 1-Click Clusters provide flat-rate multi-node (own billing model — LAM12).

> **verify:** `ssh ubuntu@<IP> 'python -c "import torch;print(torch.cuda.is_available())"'` → `True`.

---

## 2. STORAGE MODEL  *(survival matrix — principle #4)*

Two tiers, and the trap is that the default working location is the **volatile** one.

- **Local / root NVMe** — fast, per-instance, **ephemeral**. Docs: *"Data not stored in the mount location
  is erased once you terminate your instance and cannot be recovered"* (verified docs.lambda.ai
  creating-managing-instances 2026-06). This is where work lands by default.
- **NFS filesystem** — a regional network filesystem mounted at `/lambda/nfs/<name>` (docs example mount:
  `/lambda/nfs/persistent-storage`). **The only durable home.** Three hard constraints (verified
  docs.lambda.ai/public-cloud/filesystems 2026-06):
  - **Region-locked** — *"The filesystem must reside in the same region as the instance or cluster"* and
    *"Filesystems cannot currently be transferred between regions."* Pick the region deliberately at create.
  - **Attach-at-launch only** — *"You must attach the filesystem … at the time that the instance … is
    launched"* and *"You can't attach a filesystem after you've created an instance."*
  - Billed **$0.20/GiB/month in 1-hour increments**, **free ingress/egress**; **up to 24 filesystems per
    account**; most regions allow up to 8 EB/filesystem but **us-south-1 (Texas) caps at 10 TB**.
- **No documented inode cap** — GiB quota only; no `df -i` ceiling surfaced (still audit `df -i` per the
  universal storage gotcha).

| Tier | Path | Survives RESTART? | Survives TERMINATE? | Cap |
|---|---|---|---|---|
| Local / root NVMe | `/`, `/home/ubuntu` | yes (data persists; **but cold reboot wipes RAM** — LAM9) | **NO** (erased, unrecoverable) | instance root volume |
| NFS filesystem | `/lambda/nfs/<name>` | yes | **yes** (separate lifecycle; keeps billing — LAM6) | GiB quota; ~10 TB in us-south-1, 8 EB elsewhere |

**Checkpoints MUST go to** `/lambda/nfs/<name>` (the durable tier) for the §5 `terminate` verb. A
checkpoint left on local NVMe dies with the box. If no filesystem was attached at launch, the only durable
path is to `pull` the result off-box (free egress) before terminating.

---

## 3. NETWORK

- **Direct, unproxied egress.** US/global cloud — egress to HF / GitHub / PyPI is direct; **no
  `network_turbo`-style accelerator exists**, and none is needed. China-mirror relevance is **N/A as a
  platform feature** (relevant only when operating from inside China; then `references/china-network.md`
  applies to the user's own setup, nothing platform-provided).
- **Free egress both directions** — *"Transparent pricing with no egress fees"* (verified lambda.ai
  pricing 2026-06). Re-pulling a large model or pushing results off-box costs nothing, making
  "pull-before-terminate" the cheap, safe default when no NFS is attached.
- **Firewall** — default allows *"only incoming ICMP traffic or TCP traffic on port 22 (SSH)"*. Open more
  via **global rules** (apply workspace-wide) or **per-instance rulesets** (region-scoped). Per-instance
  rulesets: *"You must attach rulesets during the instance launch process. You can't attach them after the
  instance has been launched"* and *"You can't remove rulesets from an instance after the instance has been
  launched"* (verified docs.lambda.ai/public-cloud/firewalls 2026-06) → plan port exposure before launch
  (gotcha LAM4). Global rules can still be edited on the workspace afterward.
- **Exposing TB / Jupyter** — instances get a public IP; tunnel over SSH rather than opening ports:
  `ssh -L 8888:localhost:8888 -L 6006:localhost:6006 ubuntu@<IP>`. No platform-pinned TensorBoard dir —
  run TB on `:6006` against the logdir under the NFS mount.
- **SSH flavor** — direct TCP to a normal VM (`ubuntu@<IP>`); full `scp`/`rsync` work, no proxy-jump quirk.
  **No static IP feature** — *"On-Demand Cloud doesn't support static IP addresses"* (verified DeepTalk
  staff 2026-06). The IP is fixed for an instance's life, but **terminate→relaunch yields a NEW IP**
  (LAM10) — re-read it from the console/API every launch; never hard-code it in automation.

---

## 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*

**No spot / preemptible tier — and no mid-run eviction.** This is the key divergence from vast.ai/RunPod:
there is **no SIGTERM→SIGKILL grace window to survive**, because a running instance is never evicted
mid-epoch. The interruption model is different in kind:

- **Capacity-at-launch is the real failure.** The desired GPU type may be **unavailable when launch is
  attempted** — Lambda has **no spot tier to fall back to**, and real-world on-demand fill rates are
  spiky (one published 6-month log: ~64% same-day A100 success — i.e. ~1 in 3 attempts blocked; a 26 h
  "temporarily unavailable" stall scaling 2→4 H100; verified medium.com/@velinxs 2026-06). H100/B200
  capacity is the tightest. The resilience pattern is **retry-until-available**, not survive-eviction:
  poll `GET /instance-types` for `regions_with_capacity_available` and `POST .../launch` the moment a
  region appears (or let SkyPilot's provisioner retry across regions/types).
- **Self-inflicted termination only.** Once running, the only destructive events are an operator
  `terminate`, or an **improper `sudo shutdown`** that pushes the box to **Alert** while still billing
  (LAM3 / §5), or a **cold reboot** that wipes RAM (LAM9).
- **Resume hook** — checkpoint full state to the NFS filesystem on a periodic timer, load-latest
  unconditionally on startup, so a fresh post-capacity launch resumes instead of restarting. Because the
  box is cattle, the resume path is exercised on *every* relaunch, not just after a rare preemption.

Cadence formula (Young/Daly) + atomic-write resume → `references/spot-resilience.md`. Here the formula's
μ is effectively "time between voluntary relaunches," not a preemption rate.

---

## 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law)*

**TERMINATE is the meter-stop verb — and it is irreversible.** *"Billing begins the moment you launch an
instance and the instance passes health checks, and ends the moment you terminate the instance"*, billed
in **one-minute increments**, *"regardless if they're actively being used"* (verified
docs.lambda.ai/public-cloud/billing 2026-06).

> **The shutdown trap (most error-prone fact on this platform):** *"Do not use commands such as `sudo
> shutdown -h now` or `sudo systemctl poweroff` … These commands will not work as expected and will cause
> your instances to go into Alert status, and billing will continue"* (verified docs.lambda.ai 2026-06).
> Also `halt` / `shutdown -P 0` only stop the OS, not the meter (DeepTalk staff). Stop the meter **only**
> via `terminate` from the console or `POST /instance-operations/terminate` — which works even from inside
> the instance itself.

What each action preserves:
- **terminate** — stops the instance meter; **erases the local NVMe** (unrecoverable). The NFS filesystem
  has a **separate lifecycle** and survives — but it **keeps billing $0.20/GiB/month until explicitly
  deleted** (*"Billing continues as long as a filesystem exists, even if it's not mounted to an instance"*),
  so a terminated-but-forgotten filesystem is a silent ongoing charge (LAM6).
- **There is no stop/suspend state** — *"It currently isn't possible to pause (suspend) your instance …
  Your only options are to launch, restart, or terminate"* (verified docs.lambda.ai 2026-06). Idle-cheap
  pause is impossible; the only way to stop paying for compute is to destroy the box and rebuild later.
- **restart / cold reboot** — does **not** stop the meter and does **not** wipe disk, but a **cold reboot
  erases RAM and bypasses safe shutdown** — reserve it for a frozen box only (LAM9).

**Iron Law (SKILL.md Phase 5):** NO `terminate` until checkpoints are **pulled to local OR confirmed on
NFS by load-test** AND the user approves the cost-affecting action. Because terminate is destructive and
irreversible, an unverified `cp`/`rsync` to NFS means **permanent loss** — verify the sync (checksum /
`ls -l` / a load) before terminating, not after. Egress is free, so a belt-and-suspenders `pull` to local
is cheap. Cross-link: `superpowers:verification-before-completion` (REQUIRED) for the general gate.

---

## 6. DAEMON TOOL

- **Detach primitive: `tmux`** (or `screen` / `nohup`) on a standard Ubuntu VM — same playbook as the
  AutoDL tmux pattern. Install if absent (`sudo apt install -y tmux`); fall back to
  `nohup … </dev/null >log 2>&1 &`.
- **Survives an SSH drop, NOT a terminate.** tmux keeps the job alive across a dropped connection, but
  with no stop state the detach primitive can't survive a teardown — only the **checkpoint-to-NFS +
  idempotent resume** spine does (principle #8). tmux is the SSH-resilience layer; the checkpoint is the
  instance-resilience layer. (tmux also won't survive a cold reboot — LAM9.)
- **Native orchestration: SkyPilot** (managed jobs, autostop, retry-until-capacity) + **1-Click
  Clusters** for multi-node; no platform job-queue otherwise. SkyPilot moves the box on capacity loss but
  **restarts the process from scratch — the checkpoint-load restores progress** (don't assume the
  framework resumes training state).

---

## 7. TOP GOTCHAS  (Lambda-pinned — universal ones live in `references/gotchas_universal.md`)

- **LAM1 — Terminate erases the local NVMe; there is no stop/suspend.**
  Symptom: relaunched instance is blank, yesterday's run gone. → Root cause: local storage is ephemeral
  (*"Data not stored in the mount location is erased … and cannot be recovered"*) and no stop state
  preserves it; the AutoDL "关机 keeps my data" assumption is false. → Fix: design every workflow around
  destroy/recreate — checkpoint to `/lambda/nfs/<name>` or `pull` off-box before any terminate; never keep
  the only copy on local NVMe. (docs.lambda.ai 2026-06)

- **LAM2 — Filesystem is attach-at-launch only and region-locked.**
  Symptom: a running instance has no durable storage and one can't be added; or a us-east filesystem won't
  mount on a us-west instance. → Root cause: filesystems attach only at create time and can't move between
  regions. → Fix: decide the region and attach the filesystem **at launch**; co-locate instance +
  filesystem in the same region. (filesystems doc 2026-06)

- **LAM3 — `sudo shutdown` / `poweroff` keeps the meter running (Alert state).**
  Symptom: instance "powered off" but the bill keeps climbing. → Root cause: an in-OS shutdown sends the
  instance to **Alert** without stopping billing; `halt`/`shutdown -P 0` only stop the OS, not the meter.
  → Fix: stop the meter only via **terminate** (console or `POST /instance-operations/terminate`); never
  rely on an in-box poweroff. (billing doc + DeepTalk staff 2026-06)

- **LAM4 — Per-instance firewall rulesets are immutable post-launch.**
  Symptom: a needed inbound port can't be opened (or a wrong one removed) on a live instance. → Root cause:
  per-instance rulesets *"must [be attached] during the instance launch process"* and *"can't [be removed]
  after the instance has been launched."* → Fix: plan port exposure before launch, use an editable
  **global** rule, or tunnel over SSH (`-L`, §3) instead of opening a port. (firewalls doc 2026-06)

- **LAM5 — Capacity, not eviction, is the bottleneck (no spot fallback).**
  Symptom: launch fails / dashboard shows the desired GPU type unavailable; long stalls scaling up. → Root
  cause: on-demand supply for a specific GPU/region is exhausted (worst for H100/B200), and there is no
  spot tier to fall back to. → Fix: poll `GET /instance-types` for `regions_with_capacity_available` and
  launch the instant a region appears (or use SkyPilot's cross-region/type provisioner); resume from the
  NFS checkpoint once granted (§4). (cloud-api doc + medium.com/@velinxs 2026-06)

- **LAM6 — The NFS filesystem keeps billing after the instance is gone.**
  Symptom: all instances terminated, but storage charges continue. → Root cause: *"Billing continues as
  long as a filesystem exists, even if it's not mounted to an instance"* — $0.20/GiB/month until deleted.
  → Fix: after the final `pull` + verify, **delete the filesystem** (console Storage → Delete; requires
  terminating attached instances first) — a distinct teardown step. (billing + filesystems docs 2026-06)

- **LAM7 — `pip install torch` over Lambda Stack silently shadows or mismatches it.**
  Symptom: a `pip install` in `base` reports *"Defaulting to user installation because normal site-packages
  is not writeable"* and lands in `~/.local`, or a `torch==X` pin drags in a CUDA/torchvision combo that
  conflicts with the system build → import/CUDA errors. → Root cause: Lambda Stack PyTorch lives in
  system `/usr/lib/python3/dist-packages` (not pip-writable as `ubuntu`); pip's user install or a hard
  version pin diverges from it. → Fix: use the Stack's PyTorch as-is (don't reinstall), loosen pins
  (`torch>=2.x` not `==`), or fully isolate in a fresh venv/conda env and install torch there cleanly —
  don't half-mix pip-over-system. (DeepTalk threads 2026-06)

- **LAM8 — conda/venv that "borrows" Stack PyTorch via system-site-packages then breaks on pip.**
  Symptom: created a conda env to use the Stack's torch, then a later `pip install` pulls a second,
  conflicting torch or can't write site-packages. → Root cause: mixing `--system-site-packages` (to see
  the system torch) with pip installs into the same env creates two torch copies. → Fix: pick ONE model —
  either run in the bare Stack base (preferred on a rental), or build a fully self-contained env with
  `conda install pytorch torchvision` (no system-site-packages borrowing). (DeepTalk
  bypassing-lambda-stack thread 2026-06)

- **LAM9 — Cold reboot wipes RAM and tmux; warm restart still bills.**
  Symptom: after a "reboot" the detached training job is gone and the box came back clean-ish. → Root
  cause: a **cold reboot** *"erases all data currently in the instance's memory and bypasses the operating
  system's safe-shutdown mechanisms"* — kills tmux sessions and any in-RAM state; neither reboot stops the
  meter. → Fix: only cold-reboot a frozen box; rely on checkpoint-to-NFS, not on process survival across a
  reboot; expect to re-`ssh` and re-`tmux attach` (session may be gone). (console doc 2026-06)

- **LAM10 — No static IP; the public IP changes on terminate→relaunch.**
  Symptom: automation/SSH config hard-coded to yesterday's IP fails after a relaunch. → Root cause:
  *"On-Demand Cloud doesn't support static IP addresses"* — a fresh launch gets a fresh IP. → Fix: read
  the IP from the console / `GET /instances` on every launch; template SSH config dynamically; never
  hard-code it. (DeepTalk staff 2026-06)

- **LAM11 — `apt full-upgrade` on Lambda Stack images can break cuDNN/DOCA.**
  Symptom: after a recommended `apt-get update && upgrade` (or `full-upgrade` on 24.04 images), PyTorch/TF
  fails to find cuDNN, or full-upgrade itself fails on a DOCA package. → Root cause: a system cuDNN bump
  or DOCA repo state diverges from the Stack-bundled libs. → Fix: avoid blanket `full-upgrade` on a
  rental; if cuDNN is missing, symlink the Stack copies —
  `for so in /usr/lib/python3/dist-packages/tensorflow/libcudnn*; do sudo ln -s "$so" /usr/lib/x86_64-linux-gnu/; done`
  (note: Stack cuDNN is usable *only* by the Stack-installed PyTorch/TF). (troubleshooting doc 2026-06)

- **LAM12 — 1-Click Clusters / reserved bill differently than on-demand (commitment traps).**
  Symptom: expected per-minute pricing, got a 2-week minimum / weekly invoice / a reservation that expired.
  → Root cause: **1-Click Clusters** carry a **minimum 2-week commitment with weekly billing** (not
  per-minute); **reserved** capacity requires Lambda approval and the **invoice must be paid within ~10
  days or the reservation is forfeited**, on non-cancelable terms. → Fix: use plain on-demand single
  instances for per-minute experiments; only enter a cluster/reservation with confirmed sustained need and
  budget approval. (1-click-clusters docs + nOps/CheckThat 2026-06)

- **LAM13 — GH200 (ARM/aarch64) breaks `pip install torch` — needs the ARM build.**
  Symptom: on a 1× GH200 box, `pip install torch` installs a **CPU-only** wheel (no CUDA), or a pinned
  `torch==2.2.0` fails to resolve. → Root cause: GH200 is aarch64; the default PyPI torch wheel for
  aarch64 is CPU-only. → Fix: use Lambda Stack's pre-compiled ARM PyTorch (e.g. 2.4.1) as-is, or install
  from the CUDA index `pip install torch --index-url https://download.pytorch.org/whl/cu128` (aarch64 GPU
  wheels live there), or compile from source for newer versions; relax exact pins. (DeepTalk GH200 thread
  + pytorch.org 2026-06)

### Platform-specific debugging
- **Confirm billing actually stopped:** after a teardown, check the instance is **gone** (not in *Alert*)
  via the console or `curl -u $LAMBDA_API_KEY: https://cloud.lambdalabs.com/api/v1/instances` — an Alert-
  state box (from an in-OS shutdown) is still charging (LAM3).
- **Capacity probe before launch:** `curl -u $LAMBDA_API_KEY: .../instance-types | jq '.data | to_entries[]
  | {type:.key, regions:.value.regions_with_capacity_available}'` — empty `regions` ⇒ that GPU type can't
  launch anywhere right now (LAM5); this is the loop condition for retry-until-available.
- **GPU sanity on the box:** `nvidia-smi` (driver/CUDA + util) and `python -c "import torch;
  print(torch.__version__, torch.version.cuda, torch.cuda.is_available())"` — mismatch between
  `torch.version.cuda` and `nvidia-smi` CUDA usually means a pip-shadowed torch (LAM7/8/13), not a Stack
  problem.
- **Read the real Stack version, never assume:** `apt list --installed 2>/dev/null | grep -i lambda-stack`
  and `dpkg -l | grep -i cudnn` — confirm before debugging a "version mismatch."
- **Disk pressure on the ephemeral root:** `df -h /` and `df -h /lambda/nfs/<name>`; remember `/home/ubuntu`
  is volatile — large datasets/checkpoints filling the root volume are also *lost* on terminate, so move
  them to NFS, not just to clear space.
- **Detect a stalled download:** background the pull (`nohup … &`) and watch growth —
  `watch -n5 'du -sh <target>; ls -l <target>'` (flat size for minutes ⇒ stalled; re-pull, egress is free).
- **Stuck/unreachable after reboot:** if SSH dies post-reboot, the box may be in *Alert* or networking
  failed to come up — check the console state and prefer a fresh **terminate→relaunch** (resume from NFS)
  over fighting a cold-reboot that already wiped RAM (LAM9).

---

## 8. SCRIPT OVERRIDES

Values to parameterize the `scripts/` templates for Lambda:

```
DATA_DIR=       /home/ubuntu (ephemeral NVMe — lost on terminate)
DURABLE_DIR=    /lambda/nfs/<name>
PROXY_HOOK=     (none — direct egress; no network_turbo)
CRED_FILE=      ""  (Lambda key is the $LAMBDA_API_KEY env var, not a file on disk — run_one's [ -n "$CRED_FILE" ] guard skips the file read and the env var passes through; SkyPilot key file at ~/.lambda_cloud/lambda_keys, format `api_key = <KEY>`)
SCRATCH=        prune periodic ckpts on local NVMe; keep only `best` on /lambda/nfs/<name>
HF_HOME=        /lambda/nfs/<name>/.cache/huggingface   (durable; survives terminate, free egress on re-pull)
DETACH=         tmux  (apt install if absent; nohup fallback)
SSH_USER=       ubuntu   (NOT root)
```

Notes for the wrapper:
- Default checkpoint dir → the NFS mount, not `/home/ubuntu` — the latter is erased on terminate.
- If no NFS filesystem is attached, set the wrapper to `pull` checkpoints to local on the periodic timer
  (free egress) instead of relying on durable on-box storage.
- Re-read the instance IP from the console/API on every launch (LAM10) — never persist it in SSH config.
- Do not `pip install torch` / blanket `apt full-upgrade` on the rental — use the Stack as-is (LAM7/8/11);
  on GH200 use the ARM build (LAM13).
- The teardown step is **terminate via API**, gated by the Iron Law; verify billing stopped (no *Alert*
  state) and add an explicit reminder to **delete the NFS filesystem** (LAM6) when the project is done.
