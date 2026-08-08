# Universal & mixed gotcha catalog — every metered remote-GPU rental

The cross-platform gotchas: they bite on **any** metered, isolated, rented GPU — only the concrete
path/proxy/billing-verb changes (those live in `profiles/<platform>.md`). Each entry is
**Symptom → Root cause → Fix**. "Mixed" entries are universal in symptom but carry a *platform-specific
value* in the fix — the rule stays here, the value lives in a profile. Platform-only gotchas (AutoDL's
TB-pin, the wandb-key classifier, the network_turbo proxy literal) do NOT live here — see each profile's
TOP GOTCHAS section.

To jump: `grep -in '<keyword>' references/gotchas_universal.md` (e.g. `inode`, `egress`, `xid`, `crlf`,
`stdin`, `zombie`). Numbering `U1…` is stable; cross-platform additions continue the same series.

## Table of contents (by theme)

- **Process & SSH** — U1 SSH-dies-on-kill · U2 tmux-holds-script-in-memory · U3 vanished-process-4-causes · U4 kill-drops-SSH-before-relaunch · U5 hook-safe-launch
- **Disk & Storage** — U6 disk-full-crashes-torch.save · U7 storage-fails-on-inodes · U8 stage-hot-data-to-NVMe
- **Memory & OOM** — U9 cgroup-OOM-num_workers×tensor · U10 VRAM-OOM-vs-cgroup-OOM · U11 zombie-VRAM-nvidia-smi-cant-see · U41 host-metrics-lie/oom_kill-counter
- **Transfer & Download** — U12 scp-resets→resumable-loop · U13 scp-into-uncreated-dir · U14 egress-surcharge+same-AZ · U15 compress-before-the-wire
- **Monitoring** — U16 stale-waiters/zombie-monitors · U17 unquoted-pipe-grep-hang+robust-poll · U18 two-leg-remote-self-completion · U19 tracker-deletion-lags · U20 hosted-tracker-survives-teardown · U39 live-panel/TB-silently-empty (path/port/process mismatch) · U43 block-buffered-stdout-looks-frozen
- **GPU health** — U21 nvidia-smi-util%-is-a-liar · U22 Xid-48/79-dead-GPU-re-rent · U23 thermal/power-throttle-steals-25-40%
- **Dataloader & IO** — U24 dataloader-starvation-knobs · U25 many-small-files→shard-into-tar · U40 intra-op-thread-oversubscription-starves-GPU
- **Env & Container** — U26 CRLF-breaks-sh · U27 overlay-config-files · U28 CUDA-toolkit-vs-driver-vs-torch · U29 install-from-lockfile · U30 pin-image-by-sha256 · U31 container-runs-but-no-GPU · U42 box-code-drift/verify-deploy
- **Cost & teardown** — U32 task-epoch-default · U33 silent-checked-sync
- **Secrets & trackers** — U34 secrets-via-stdin · U35 tracker-offline-without-key
- **Delegated (cross-link only)** — U36 cuDNN-nondeterminism · U37 matplotlib-2^16 · U38 GPU-0%-util-data-bound
- **Pointers** — spot/preemption → `references/spot-resilience.md`; multi-node/NCCL → `references/multinode.md`

---

## Process & SSH

### U1 — SSH disconnects on `pkill -9` (exit 255, "Connection reset")

**Symptom**: `ssh <host> 'pkill -9 -f train'` returns `Connection reset by peer`, exit 255.

**Root cause**: killing the python tree tears down the PTY chain; the SSH client gets EOF and exits. The
remote command may have run fine.

**Fix**: this is **normal, not an error** — re-ssh and verify state, do not panic-retry.
```bash
ssh <host> "tmux kill-session -t qN 2>/dev/null; sleep 3; pkill -9 -f 'src.train'"  # SSH exits 255 here
ssh <host> "pgrep -af 'src.train' | head -1 || echo CLEAN"                            # separate call verifies
```

### U2 — tmux holds the script in memory; editing it mid-run re-executes blocks

**Symptom**: a queue/launcher script is updated mid-run, but the running job still uses the old logic; or
an ablation completes cleanly yet **restarts from epoch 1** with a second tracker run and the queue never
advances.

**Root cause**: bash reads a script **by byte-offset on demand**. tmux keeps the launched script as-loaded;
`scp`-ing a new version mid-run makes bash seek to its saved offset in a *now-different* file, land
mid-command, and re-execute a block (duplicate runs, stalled queue). A child invocation (`bash run_one.sh`)
IS re-read fresh for the *next* item — but only if none is parked mid-script. (principle #6.)

**Fix**: **never overwrite a script any process is executing** — check `pgrep -af <script>` first; version
the filename for hot changes (`run_one_v2.sh`), point only *new* launches at it. Appending lines to a queue
file is safe (`while read < file` sees appended bytes); changing structure is not. To hot-swap, kill +
restart the detach session so fresh bash reads from the top. Recovery: kill the session, copy the finished
`best.pth` to durable storage, restart `run_queue.sh queue.txt <start_index>` to skip done items, delete any
duplicate tracker run (cross-link verifying-dl-experiments **REQUIRED**).

**Related detach trap — a non-exported var doesn't cross into the detach primitive.** A `VAR=x` set in
your shell before `tmux new-session` / `nohup` is **not** in the detached job's environment unless
**exported** (or inlined in the launched command) — the job sees it empty, and a launcher/monitor that
interpolates it silently misdirects (writes output to the wrong path, mis-reports "died"). `export VAR`
before launch, or inline it: `tmux new-session -d "VAR=$VAR bash run.sh"`.

### U3 — A vanished remote process ≠ OOM: enumerate the 4 causes

**Symptom**: a detached run's log stops right after `Starting training` with no epoch output and no
traceback; `pgrep` shows it gone. The reflex is "OOM-killed."

**Root cause is one of four** — OOM is only one:
1. **Machine restart / reboot** — `dmesg` is *clean*, GPU idle, cgroup roomy, `uptime` low. Most-missed: nothing in the log hints at it.
2. **OOM-kill (`-9`)** — `dmesg | grep -i 'killed process'` shows it, memory was tight (U9).
3. **SSH HUP** — a foreground (non-`nohup`/`tmux`/`setsid`) launch dies when its parent SSH drops.
4. **Manual kill** — an earlier `pkill` matched more than intended.

**Fix — diagnose cheap → conclusive before "fixing"**:
```bash
dmesg 2>/dev/null | grep -iE 'killed process|out of memory' | tail   # OOM? empty = not OOM
nvidia-smi --query-gpu=memory.used,memory.free --format=csv,noheader  # idle now = died, not hung
cat /sys/fs/cgroup/memory.max | numfmt --to=iec                       # roomy = OOM unlikely
uptime                                                                # low = recent reboot (cause 1)
```
Clean `dmesg` + idle GPU + roomy cgroup + low `uptime` ⇒ **reboot, not OOM**. Do NOT shrink batch size to
"fix" a phantom OOM — that masks the one variable under test. **Separate trap**: a dropped poll connection
≠ the training dying — re-ssh and check the process/artifact directly (`pgrep -af train`, log tail,
`best.pth` mtime) before concluding the run died (principle #3).

### U4 — `kill` drops the SSH before a relaunch in the SAME command runs

**Symptom**: `ssh <host> 'pkill -f X; relaunch X'` kills X but X is **not** relaunched; ssh returns 255.

**Root cause**: killing a session-tied process drops the SSH (U1, normal) at the kill, so everything after
it in that one command never executes.

**Fix**: split — kill in one ssh call, relaunch (with NO kill) in the next. To stop a kill/poll pattern
from matching the matcher's own command line, split the literal: `A=base; B=lines.; pgrep -f "${A}${B}"`
(the contiguous string `baselines.` never appears in the cmdline running `pgrep`).

### U5 — Hook-safe remote launch: keep env activation VISIBLE in the launch command

**Symptom**: an env-guard hook (e.g. "no DL in conda base") blocks or asks on
`ssh <host> 'nohup bash /root/job.sh ...'` even though `job.sh` activates the right env internally; it also
misfires on heredocs that inline `python -m <pkg>.train`.

**Root cause**: the hook scans the **command string** — it cannot see inside an scp'd script, and a bare
`bash job.sh` launch has no visible `conda activate <env>`, so the guard assumes base.

**Fix**: write the heavy script via Write/`scp` (so `python -m ...train` lives in the file, not the command)
and put a VISIBLE activation in the launch ssh command:
`ssh <host> 'source /path/to/conda.sh; conda activate <env>; nohup bash /root/job.sh ...'` — the script
re-activating is harmless. Never `--no-verify` / never bypass the guard. (On a single-tenant rental whose
base IS the env, the right move is to exempt remote/ephemeral base, not to clone it — that's a profile fact.)

---

## Disk & Storage

### U6 — Disk-full crashes `torch.save` with `iostream error`

**Symptom**: mid-training exit=1; log shows `RuntimeError: basic_ios::clear: iostream error` and
`unexpected pos N vs M` from inside `torch.serialization`; a leftover `latest.pth.tmp` sits in the
checkpoint dir; `df` shows the data mount at 100%.

**Root cause**: `torch.save` writes atomically (write `.tmp` → rename); the `.tmp` write hits disk-full and
errors. Any quota'd/cgroup disk on any rental does this.

**Fix — prevent**: pre-budget `ckpt_size × N_runs + worst_case_latest + tracker_local_cache`; if it exceeds
the mount, schedule mid-run aggregation to durable storage + delete completed-and-aggregated dirs; in
`run_one.sh`, on success prune the rolling `latest.pth` and keep only `best.pth` (cross-link
verifying-dl-experiments **REQUIRED** for the keepable-checkpoint policy). **Recover**: delete the
`*.tmp`/`latest.pth` to free several GB — `best.pth` survives, the queue can resume.

### U7 — Storage fails on the dimension (and location) not being watched

**Symptom**: `cp`/`mkdir` fails `No space left on device`, yet `df -h` shows ~34% used — because `df -i`
reads `100%` (inodes exhausted). Or the data mount fills despite `runs/` looking small.

**Root cause**: disk dies on **inodes before bytes** — the classic trigger is **per-sample eval output**,
which writes on the order of `files_per_sample × N_samples × N_conditions` tiny files. And the real
byte-hog often hides where nobody looks: a **symlinked cache** (`~/.cache/huggingface` mapped onto the data
disk) can outweigh everything the run created.

**Fix**: monitor `df -i`, not just `df -h`, in Phase 0 and every space check. **Audit the real mount with
`du`, not assumptions** (`du -sh ~/.cache/huggingface/hub/models--* | sort -rh`). Clean by **value** — keep
the tiny irreplaceable evidence (metric/eval JSONs), drop the large reproducible scratch (periodic
checkpoints, unused caches). Cap per-sample eval visualization (cross-link verifying-dl-experiments
**REQUIRED** for the sizing policy). The *inode-cap number* is a profile fact (some platforms enforce a hard
~200K cap; GB-quota'd platforms have none); the many-small-files general form is **shard into tar** (U25).
Get explicit user confirmation naming `rm -rf` targets; offer "clean vs expand the disk" (principle #9).

### U8 — Stage hot data to local NVMe before training

**Symptom**: training is I/O-bound reading from a network/shared/HDD-backed volume; GPU starves between
batches.

**Root cause**: a remote/networked filesystem (or a spinning data disk) has far lower random-read
throughput than instance-local NVMe — HDD-vs-NVMe gaps reach ~35×.

**Fix**: at job start, copy the working dataset from the durable/shared tier to instance-local NVMe scratch,
train against the local copy, write checkpoints back to durable storage. The local-NVMe path is a profile
fact (`local_nvme` in the frontmatter); the stage-then-train discipline is universal. Pairs with U24/U25.

---

## Memory & OOM

### U9 — `num_workers` × a big in-RAM tensor → cgroup OOM-kill (bare "Killed", exit 137)

**Symptom**: training dies early with a bare `Killed` / `killed by signal: Killed (-9)` and **no Python
traceback**; lowering `num_workers` makes it vanish.

**Root cause**: each DataLoader worker is a `fork` that gets its **own copy** of any large object the
dataset holds (a 16384² float32 matrix ≈ 1 GB). `num_workers=W` ⇒ ~`(W+1)×` that footprint, which blows the
instance's cgroup `memory.max` even though a bare-process run fits. The kernel OOM-kills with no
Python-level error, so it reads as a mysterious crash.

**Fix**: size `num_workers` against `memory.max` and the per-worker resident set, **not** CPU count. Share
one copy across workers (memmap / module-level singleton built once) or generate the object on the fly.
Shrinking the problem also fixes it — a smaller matrix dim shrinks footprint *quadratically* (dim 1024 ≈
4 MB, 256× less than 16384). Confirm it's OOM: `dmesg | tail` shows `Out of memory: Killed process`, and the
same config survives `num_workers=0`.

### U10 — VRAM OOM (a big model or a concurrent job) is distinct from cgroup-RAM OOM (U9)

**Symptom**: `torch.OutOfMemoryError: CUDA out of memory` when launching a second train/eval while another
runs, or a big model (deep transformer / unrolled net at high res) OOMs alone.

**Root cause**: **VRAM** — the sum of concurrent jobs' allocations plus fragmentation exceeds the card. NOT
host-RAM (U9).

**Fix**: check free VRAM first (`nvidia-smi --query-gpu=memory.free --format=csv,noheader`); size the batch
to fit *alongside* any concurrent job; set `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` to cut
fragmentation. (Run heavy DL on the box; do static/shape checks locally — cross-link
verifying-dl-experiments **REQUIRED** for local-OOM rationale.)

### U11 — A zombie holds VRAM `nvidia-smi` cannot see → OOM on an "empty" GPU

**Symptom**: `nvidia-smi` lists no process and shows free memory, yet a fresh job OOMs immediately; common
after a crashed DDP run or a killed container.

**Root cause**: a defunct/orphaned process (or a dead container's namespace) still holds CUDA context and
VRAM, but `nvidia-smi`'s process table can't attribute it — so the GPU *looks* empty while memory is locked.

**Fix**: enumerate the real holders via the device nodes and reap them:
```bash
fuser -v /dev/nvidia* 2>/dev/null   # or: lsof /dev/nvidia*  → kill -9 the listed PIDs
```
If containerized, restart the container. Ship a small reaper that flags any PID with persistent VRAM + ~0%
util beyond a timeout — cross-link `scripts/reap_vram_zombies.sh`.

### U41 — On a shared box, `uptime`/`free` describe the whole physical host, not your container — use cgroup-scoped readings + the `oom_kill` counter

**Symptom**: a detached run looks "dead" or "the host is overloaded" — `uptime` shows load average 400+,
`top`/`free -m` look maxed — so you suspect contention or an OOM-kill. But the job's own checkpoint `mtime`
keeps advancing and its log still grows.

**Root cause**: on a multi-tenant rental, host tools (`uptime`, `top`, `free -m`, `vmstat`) report the
**physical node you share with other tenants**, not your cgroup. A neighbor's job spikes the host load
average to ~490 while your container sits near-idle (your processes in `R`/`S`, none stuck in
uninterruptible `D`). Reading host load as your own → a false "overloaded / OOM-killed" verdict and a
needless kill-and-restart of a healthy run.

**Fix**: judge YOUR container from cgroup-scoped readings, not host tools:
- memory — `/sys/fs/cgroup/memory.current` vs `memory.max` (not `free -m`);
- were YOU OOM-killed — the **`oom_kill` counter** in `/sys/fs/cgroup/memory.events`
  (`grep oom_kill /sys/fs/cgroup/memory.events`); a non-incrementing counter means you were **not**
  OOM-killed, however red host `free` looks;
- CPU pressure — `/sys/fs/cgroup/cpu.stat` / `cpu.pressure`.

A high host load with your cgroup roomy and `oom_kill 0` is a **noisy neighbor**, not your bug — don't
shrink your batch or blame your code (a neighbor genuinely starving you on the shared card is U21/U23
throttle territory or a re-rent, not a code fix). Sharpens the **U3** vanished-process ladder: the
authoritative OOM check is the cgroup `oom_kill` counter, not host `dmesg`/`free` noise.

---

## Transfer & Download

### U12 — `scp -r` of a large dir resets mid-transfer → per-dir resumable loop

**Symptom**: 30–60 min into `scp -r host:...130GB ./`, the connection drops
(`Read from remote host ... reset by peer`); local has a few dirs, the rest gone. scp does not resume.

**Root cause**: a single SSH connection carries the whole transfer; any network blip kills all of it.

**Fix**: loop **per-dir**, each its own SSH session — one failure doesn't lose the others, and re-running
skips completed dirs. Prefer `rsync -avz --partial --append-verify` (resumes a half-file). Wrap bulk pulls
in a `timeout … && break` retry loop: a stall ≠ permanent failure, and resumable transfers accumulate
progress across kills. Validate any speed test on the **same route** the real transfer uses (principle #7).
See `scripts/download_loop.sh` for the per-dir pattern.

### U13 — `scp` into a remote dir a sibling command was supposed to create (race)

**Symptom**: a background `scp big.tar host:/root/x/` fails instantly with `dest open "/root/x/": Failure`
— the foreground command that would have `mkdir`-ed `/root/x` ran later, or was blocked/cancelled.

**Root cause**: ordering assumption between parallel/sibling commands; the destination dir didn't exist yet.

**Fix**: make every transfer self-sufficient inside its own retry loop:
`ssh host 'mkdir -p /root/x' && scp … || retry`. Never assume a sibling created the destination.

### U14 — Egress is a silent ~20% surcharge; co-locate and stay same-AZ

**Symptom**: the monthly bill is ~20% over the rented GPU-hours; a large model/dataset re-pulled daily from
a hyperscaler bucket dominates cost (a 140 GB model pulled daily from S3 ≈ $378/mo in egress alone).

**Root cause**: hyperscaler **egress** is metered (AWS ~$0.09/GB, GCP ~$0.08, Azure ~$0.087) while most
GPU-clouds (Lambda/RunPod/vast/CoreWeave) charge $0. Worse, **cross-AZ traffic bills ~$0.01/GB each
direction even inside one provider** — storage in a different zone than compute quietly meters every read.

**Fix**: co-locate storage with compute on the **same provider AND same AZ/region**. Pull a dataset once to
durable local storage, not per-epoch from a remote bucket. Record `free_egress` / `egress_per_gb` /
`cross_az_per_gb` as profile fields and prefer a $0-egress GPU-cloud for transfer-heavy jobs.

### U15 — Compress before the wire

**Symptom**: checkpoint/dataset transfers are slow and (on metered egress) expensive.

**Root cause**: raw tensors and JSON cross the network uncompressed.

**Fix**: zstd/gzip the payload before transfer — cuts checkpoints+datasets 30–60%, JSON 60–80%; store
weights fp16/int8 where the task tolerates it. Compounds with U14 (less egress $) and U12 (fewer bytes to
resume). Pairs with U25 (tar shards compress and transfer as one stream).

---

## Monitoring

### U16 — Stale background waiters pile up; supersede a run → STOP its waiter; pick the right lifetime

**Symptom**: a "Background tasks" panel shows 8+ "Running" wait-loops at 500–740 min elapsed, each
ssh-polling every ~20 s, while the GPU is idle and the experiment finished hours ago.

**Root cause**: every kill+restart of a flaky saga armed a NEW `until ssh grep MARKER; do sleep; done`
waiter but never stopped the OLD one — its marker (in a superseded log) never appears, so it loops forever.
A `run_in_background` waiter is **not** time-capped (a 781 s task ran to completion + notified; the ~600 s
cap is on **foreground** Bash only). The real silent-failure mode is a waiter that never EXITS (U17).

**Fix**: one waiter per live run — superseding a run, stop the old waiter first (`TaskStop`; cross-session
IDs aren't stoppable from a resumed session — dismiss those from the UI). Multi-hour wait → a **persistent
Monitor** (no 10-min cap) + a stall-detector emit so a hung run still notifies. A persistent Monitor dies on
session resume → after any resume, check the remote ground-truth directly (`tmux ls`, `grep DONE log`,
`nvidia-smi`); never trust a monitor that may be gone (principle #3).

### U17 — A silent background monitor that never returns: usually an unquoted `|` in grep

**Symptom**: a `run_in_background` ssh monitor never returns / never notifies; `pgrep` shows a process
"alive." The run looks hung — but the actual job finished and wrote results fine.

**Root cause**: the wrapper never EXITED because a sub-command blocks forever. The classic bug is an
**unquoted `|` in grep** — `grep -hE noise-sweep|snr=|wrote log` — the shell splits it into THREE piped
commands, and the first (`grep -hE noise-sweep`, no filename) reads **stdin** → blocks forever → the
pipeline never returns → ssh never returns → the local background process never exits → no completion
notification. (Background tasks notify on EXIT only — no 600 s cap; foreground Bash is the capped one, U16.)

**Fix — robust remote-poll template**:
- **Quote every regex AND give grep a filename**: `grep -hE 'noise-sweep|snr=|wrote' log` (a `|` inside quotes is alternation; a filename means read the file, never stdin).
- **Bound the ssh**: `ssh -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3 …` — a blip self-kills in ~30 s instead of half-open hanging for minutes.
- **Short-connection poll, not one long-held ssh**: each poll = ssh in → check → disconnect; loop locally with a bounded counter.
- **Verify by artifact, not notification**: when it "looks done," Read the local output + a fresh `ssh 'grep DONE log; tmux ls; nvidia-smi'` to confirm ground truth (cross-link verifying-dl-experiments **REQUIRED**); don't wait on a notification that may never fire.

### U18 — "I'll check periodically" is a lie unless a trigger is armed; two-leg remote self-completion

**Symptom**: a promise to monitor a multi-hour remote run, then no report for a day — because between turns
the assistant does not run. A cloud scheduler set up to "ssh in and check" silently can't reach the box.

**Root cause**: two conflated things. (a) Making the REMOTE self-complete (a waiter that blocks on a log
marker then runs eval) guarantees RESULTS but gives no *reporting cadence* — nothing re-invokes the
assistant on a timer. (b) A cloud schedule runs in an isolated sandbox with its own checkout and **no access
to the local SSH key or network** → it cannot `ssh` the rented box, and the SSH private key must **never** go
into a cloud agent (secret-leak).

**Fix — the two-leg pattern**:
- **Remote self-completion (guaranteed, survives session/SSH death)**: chain `train → eval → touch marker` under one `nohup ... </dev/null >log 2>&1 &`. Detect "done" by a **log marker** (`grep -q 'QUEUE DONE' master.log`), NEVER by `pgrep` — the waiter's own command line contains the pattern, so `pgrep -f` matches itself and loops forever (U17).
- **Live progress (best-effort)**: a session-bound local loop (e.g. `/loop 30m` / cron `3,33 * * * *`) that ssh-polls with the *local* key. Be honest it dies when the session closes — the remote still finishes; the user re-pings to pull.
- **Don't promise autonomous cross-session polling you can't deliver.** (`tmux` is often absent on a fresh box and `apt-get install` fails offline — `nohup ... </dev/null >log 2>&1 &` is zero-dependency and survives SSH drop; verify with `pgrep -af <script>`.) Full architecture → `references/monitoring_patterns.md`.

### U19 — Tracker run deletion lags; a fresh export resurrects "deleted" runs

**Symptom**: `run.delete()` returns, but an immediate `api.runs()` still lists every deleted run; a batch
history-export minutes later happily re-downloads `<run>__history.csv` for runs just deleted.

**Root cause**: deletion is asynchronous server-side; list/export endpoints serve stale listings for
minutes.

**Fix**: delete → re-verify on a **later** monitoring tick (not a tight loop; a second
`delete(delete_artifacts=True)` pass is safe). Order matters: do cloud deletions **before** local exports,
then re-check the export dir for resurrected files and remove them. (cross-link verifying-dl-experiments
**REQUIRED** for tracker forensics.)

### U20 — Local logs die with the instance: use a hosted tracker

**Symptom**: TensorBoard event files written to an ephemeral box vanish on teardown — every curve gone after
the meter-stop verb runs.

**Root cause**: a rented box's local disk is not durable past `terminate`/`destroy` (principle #4); the
metric history lived only there.

**Fix**: log metrics to a **hosted tracker** so they survive teardown — `trackio.init(space_id=...)` or
`wandb` online (push under the platform's proxy if behind a firewall). Poll the tracker's structured alerts
as the monitor instead of brittle ssh-tail. Cross-link huggingface-skills:huggingface-trackio **REQUIRED**
for the `init/log/finish/alert` mechanics and `space_id` sync.

### U43 — A detached run's log looks frozen for minutes though training is fine: stdout is block-buffered off a TTY

**Symptom**: a `nohup`/`tmux` run prints a few lines then nothing for many minutes; it reads as
"hung / died" and the reflex is to kill it — but checkpoint `mtime`, TB scalars, and `nvidia-smi` all show
it advancing.

**Root cause**: Python (and libc stdio) **line-buffer when stdout is a TTY but block-buffer (~4–8 KB) when
it is a pipe or file** — exactly the detached case. The log only flushes when the buffer fills, so a
healthy run looks silent and a `grep`-on-log liveness check false-alarms on the gap.

**Fix**: run unbuffered — `python -u` or `PYTHONUNBUFFERED=1` (the shipped `scripts/run_one.sh.template`
already exports it); for a shell pipeline use `stdbuf -oL`. And judge liveness by **artifacts, not stdout
cadence** — checkpoint `mtime`, the TB scalar API, `nvidia-smi` (monitoring_patterns §0 corollary; the
deeper "is it actually hung?" attach is py-spy, throughput-profiling **T21**). A frozen log is the single
most common false "dead run."

---

## GPU health

### U21 — `nvidia-smi` GPU-Util % is a liar

**Symptom**: the perf tile reads 100% util but throughput is poor; or util looks "busy" while the job is
actually starved (the inverse of U38, which is the 0%-but-running case).

**Root cause**: `GPU-Util` means "≥1 kernel ran in the sampling window," not "useful work filled the
window." A trickle of tiny kernels reads as 100%.

**Fix**: correlate util with **SM clock** (`clocks.current.sm`), memory-bandwidth util, and power draw —
`nvidia-smi dmon -s pucvmet -d 1`. Low SM clock or low power at "100% util" means the GPU is underfed (go to
U24). Always sample over several seconds, never one snapshot.

### U22 — Xid 48/79 = a dead GPU; on a rental, re-rent

**Symptom**: training crashes or the GPU drops out; `dmesg | grep -i xid` shows an Xid error.

**Root cause**: Xid is NVIDIA's canonical hardware-fault signal. **Xid 48 = double-bit ECC (the GPU is
dead); Xid 79 = "GPU has fallen off the bus."** These are hardware, not code.

**Fix**: on a *rental* the card can't be reseated — **stop the instance and re-rent a different box**; don't
burn hours debugging code for a hardware fault. Check `dmesg | grep -i xid` as part of the "vanished
process" ladder (U3) when the GPU goes idle unexpectedly.

### U23 — Thermal/power throttling silently steals 25–40% with no error

**Symptom**: "the same code is slower than yesterday" — no error, no crash, just lower throughput.

**Root cause**: the GPU is thermal- or power-throttling (an H100 throttles around 83 °C; target <75 °C). On
a shared rental, cooling/power headroom is outside tenant control.

**Fix**: detect — SM clock falling below base while temp >83 °C, or
`nvidia-smi -q -d PERFORMANCE` showing a throttle reason. A tenant can't fix cooling → **flag it and
re-rent** a healthier box; don't read the slowdown as a model/data regression. Pairs with U21 (clocks expose
it where util% hides it).

---

## Dataloader & IO

### U24 — GPU starves at 10–70% waiting on the dataloader, not on compute

**Symptom**: util sits well below 100% (but nonzero), step log advances slowly; profiling shows time spent
in data fetch, not fwd/bwd.

**Root cause**: the input pipeline can't keep the GPU fed — too few workers, no prefetch, host↔device copies
on the critical path. (Distinct from U38's *0%* CPU-data-bound transform case; this is the partial-starve
knob set.)

**Fix — tune in order**: `num_workers = cores − 1` (sized against per-worker footprint, U9),
`persistent_workers=True`, `pin_memory=True`, `prefetch_factor=2`. Pathological cases show >100× gaps from
these alone. If a heavy per-sample transform is the bottleneck, move it to the GPU (cross-link
verifying-dl-experiments **REQUIRED** for the 0%-util diagnosis, U38). Pairs with U8 (stage to NVMe) and U25.

### U25 — Millions of small files on a network/object store → transaction-overhead death; shard into tar

**Symptom**: a dataset of many tiny files streams glacially from a shared/object store; or eval output of
tens of thousands of per-sample files exhausts inodes (U7) or blows a visualization grid (U37).

**Root cause**: per-file open/stat/close overhead dominates on networked/object storage; the inode and
metadata cost scales with file *count*, not bytes.

**Fix**: pack into **sharded tar** (WebDataset), a few-hundred-MB per shard → 3–10× faster sequential I/O and
the only sane pattern for streaming from S3. This is the **general form** of the inode-exhaustion trap (U7)
and the per-sample-vis trap — cap and shard rather than emitting a file per sample. Pairs with U8 (stage the
shards to local NVMe) and U15 (shards compress as one stream).

### U40 — A vCPU-sliced rental starves its own GPU: torch intra-op threads default to the HOST core count, not your cgroup quota

**Symptom**: GPU `sm%` sits ~5–15% and runs grind, but the dataloader is not the bottleneck (few/no
workers, data already on-device, the U24 knobs don't help); `top` shows dozens of python threads fighting
over a handful of cores.

**Root cause**: you rent a **cgroup CPU slice** (e.g. 12 vCPUs of a 64-core host), but torch/OpenMP size
their intra-op thread pools to the **physical** core count — `torch.get_num_threads()` / `OMP_NUM_THREADS`
come up ~64. ~57 runnable threads thrashing 12 cores burn the slice on context-switching, so the CPU side
that launches kernels and feeds the GPU can't keep up and the card idles. No OOM, no error — pure scheduler
thrash (the *host scheduling* starves the GPU, the inverse of being data-bound).

**Fix**: cap the pools to your **slice's** vCPU count before launch —
`export OMP_NUM_THREADS=4 MKL_NUM_THREADS=4` (and/or `torch.set_num_threads(4)`); confirm torch honoured it
(`python -c "import torch; print(torch.get_num_threads())"` → 4, not 64). Read the real quota from the
cgroup, not `nproc` (which reports host cores): `cat /sys/fs/cgroup/cpu.max` → `quota period`, vCPUs ≈
quota/period. Bake the cap into the launch wrapper so every queue cell inherits it. Distinct from **U9**
(workers × RAM → cgroup OOM) and **U24** (dataloader starvation); the triage that catches it is
throughput-profiling **T3** (GPU SM% low while a python thread-storm pegs the cores).

---

## Env & Container

### U26 — CRLF breaks `.sh` on Linux (authored on Windows)

**Symptom**: a synced launcher silently does nothing (empty log); run by hand it errors `set: -: invalid
option`, `cd: /path\r: No such file or directory`, `syntax error near unexpected token $'do\r'` — every
line "ends in `\r`."

**Root cause**: Windows `core.autocrlf=true` (or `git archive` exporting working-tree EOL) writes `.sh` with
CRLF; Linux `bash` treats the trailing `\r` as part of each token. `.py` is unaffected (Python's universal
newlines); it is specifically `bash`/`.sh` that breaks.

**Fix**: add `.gitattributes` with `*.sh text eol=lf` (so `git archive`/checkout always emits LF); immediate
on-box unblock: `sed -i 's/\r$//' scripts/*.sh`.

### U27 — `-o dotted.key=value` overrides explode on null parents → freeze protocols as overlay config FILES

**Symptom**: `-o evaluation.sps_augmentation.enable=true` crashes
`KeyError: Override path '...' is not a mapping` because the base YAML has the parent as `null`. Worse
long-term: protocol variants that exist only as one-off CLI strings are unreproducible months later.

**Root cause**: dotted-key override traversal can't descend through a `null` parent; and a CLI-string-only
protocol has no diffable, reviewable record.

**Fix**: define each protocol variant as a small overlay config (`configs/eval_overlays/<protocol>.yaml` with
`_base_:` pointing at the canonical leaf) and pass it via `-c`. Reviewable, diff-able, immune to null-parent
traversal. This is also the **retry-the-identical-config mechanism** (principle #7): an overlay file is a
stable config a retry re-uses byte-for-byte. To reconstruct a historical protocol, read the artifact
manifest (`*_manifest.json` records the resolved overrides verbatim).

### U28 — The CUDA-toolkit ↔ host-driver ↔ torch-build triangle

**Symptom**: `detected CUDA version mismatches the version used to compile PyTorch`; or `no kernel image is
available for execution` at the first forward on a new-arch GPU.

**Root cause**: three independently-versioned layers must agree — **the host driver is host-global and a
tenant usually cannot change it on a rental; the CUDA toolkit is per-env and changeable; the torch build
must match both.** The toolkit must be ≤ what the host driver supports; a project that pins
`torch<2.9` can *downgrade* the only build with kernels for a new-arch card (e.g. sm_120).

**Fix**: keep the image's working torch — filter framework pins out of the remote install:
```bash
grep -ivE '^(torch|torchvision|torchaudio)' requirements.txt > /root/req_remote.txt
pip install -r /root/req_remote.txt
```
Set `LD_LIBRARY_PATH=$CONDA_PREFIX/lib:$LD_LIBRARY_PATH` when the per-env toolkit must win. Smoke
`torch.cuda.get_device_capability()` + a heavy project import before launching; the off-band torch version
lands in the runtime snapshot — disclose it with results. `host_driver_cuda_max` is a profile field.

### U29 — "Same version, different result": top-level pins let transitive deps drift → install from a lockfile

**Symptom**: two installs of the "same" `requirements.txt` produce different behavior/results.

**Root cause**: a hand-edited `requirements.txt` pins only top-level packages; transitive dependencies drift
between installs.

**Fix**: install from a **lock file** (`uv lock` / `pip-tools` / `conda-lock`) that pins the full resolved
graph, not a hand-edited top-level list. Pairs with U28 (filter the framework pins, then lock the rest).

### U30 — A Dockerfile is NOT reproducible: pin the base image by `@sha256:` digest

**Symptom**: a container built from the "same" Dockerfile months apart behaves differently.

**Root cause**: `FROM image:latest` (or any moving tag) resolves to a different layer set over time.

**Fix**: pin the base image by content digest — `FROM image@sha256:<digest>`, not `:latest` — so the build
is bit-reproducible. (`pin_image_by_sha256` is a per-platform expectation where the image is the env
contract.)

### U31 — Container runs but trains 100× slower = the GPU was never attached (CPU-only)

**Symptom**: a containerized job runs to completion but is absurdly slow; loss curves look normal, just
glacial.

**Root cause**: the container has no GPU — launched without `--gpus all`, or the NVIDIA Container Toolkit is
missing/too old, so CUDA silently fell back to CPU.

**Fix**: `docker run --gpus all …`, NVIDIA Container Toolkit ≥1.14, and **validate `nvidia-smi` *inside* the
container before training** — never assume GPU attachment from a clean `docker run`.

### U42 — The box runs a hand-synced copy with no git remote; a fix you "committed" may not be deployed — verify it is ON the box before trusting a run or tearing down

**Symptom**: a bug you fixed and committed locally still reproduces on the box, or an eval runs on stale
logic (wrong default, missing speedup, pathologically slow), even though local `git log` shows the fix
landed.

**Root cause**: most rentals have **no git remote** — the box holds a working tree you pushed by
`scp`/`rsync`/`tar-over-ssh`, so its code only advances when you re-sync. A local commit changes nothing on
the box; an interrupted or wrong-path sync, or simply forgetting, leaves the box pre-fix. "I committed it"
≠ "it's running on the box."

**Fix**: treat code deploy like the checked-sync (**U33**) — **verify, don't assume**. After syncing, grep
the box for the change before relying on it:
```bash
ssh "$HOST" "grep -n '<new symbol / changed line>' /root/<proj>/path/file.py" || echo 'NOT DEPLOYED'
```
or compare a hash (`ssh host 'sha256sum file'` vs local). Make it a pre-flight for any run whose result
depends on the fix, and part of the **Phase-5 teardown gate** — a verdict produced by stale code is not the
verdict you think it is (principle #3). Pairs with **U29/U30** (pin deps/image): code AND environment must
both be the version you believe.

---

## Cost & teardown

### U32 — A task's default epochs differ from another task's; CLI `--epochs` silently overrides the right value

**Symptom**: one CLI `--epochs N` is applied to all ablations; a subset (e.g. detection vs recon/seg)
consistently underperforms; a reviewer flags it.

**Root cause**: some task families need more epochs to converge and default to a higher value in their YAML;
a blanket CLI `--epochs` silently overrides that per-task default.

**Fix**: make the queue support a per-line epoch field (e.g. recon/seg `20`, det `50`); audit the codebase's
YAML for `epochs:` declarations before deploying (`grep -rE '^\s*epochs:' configs/ | sort -u`). This is a
config-drift instance — really a smoke/sanity target (cross-link verifying-dl-experiments **REQUIRED**).

### U33 — Silent sync failure: gate the success line on the actual copy result

**Symptom**: a wrapper prints `auto-synced <name> to durable storage` for every job, but at download time
the durable dir is missing or empty.

**Root cause**: the sync block does `mkdir -p "$DST"; cp -f ... 2>/dev/null` then `echo synced`
**unconditionally** — it never checks the exit code. When the durable FS is inode-exhausted (U7) `mkdir`
fails but the success line still fires, so monitoring looks green while nothing landed (principle #3).

**Fix — checked, gated sync**:
```bash
if mkdir -p "$DST" && cp -f "$CKPT_DIR/best.pth" "$DST/" && [ -f "$DST/best.pth" ]; then
    echo "[$(date +%H:%M:%S)] auto-synced $NAME to durable storage"
else
    echo "[$(date +%H:%M:%S)] !! SYNC FAILED for $NAME (check df -i) — data disk is still source-of-truth"
fi
```
Until a download is verified locally, trust the **data-disk** copy, not the "synced" log line. The shipped
`scripts/run_one.sh.template` carries the checked version.

---

## Secrets & trackers

### U34 — Move credentials to the box without the secret ever appearing in a command

**Symptom**: pasting a key into an ssh/scp command leaks it into shell history, transcripts, and hook logs;
security hooks (rightly) block scp-ing a whole `~/.netrc` (it carries other machines' credentials).

**Root cause**: any secret inside a command string is captured by history/transcript/hook logging.

**Fix**: stream exactly one machine block via **stdin** — the value flows file→pipe→file and never appears in
any command text or output:
```bash
grep -A 2 'machine api.wandb.ai' ~/.netrc | ssh <host> 'umask 077; cat > /root/.netrc && chmod 600 /root/.netrc'
```
Verify by capability, not by echoing the value:
`python -c "import wandb; print(wandb.Api(timeout=20).default_entity)"`. Never write the secret to a
shared/durable FS that a platform classifier scans (that platform detail is a profile fact).

### U35 — `WANDB_MODE=offline` still dies without an API key in wrapper stacks → zero curves

**Symptom**: a run launched `WANDB_MODE=offline` expecting "log locally, sync later" produces **no offline
run dirs at all**; the train log shows `Disabled WandB due to initialization error: No API key configured`.

**Root cause**: bare-SDK offline mode needs no key, but project logger *wrappers* often probe the API
(`wandb.login()` / `wandb.Api()`) before `init` and treat key-absence as fatal → they flip to fully-disabled,
not offline.

**Fix**: push credentials BEFORE the first launch (U34) and run online under the platform's proxy; verify the
first log lines show `Syncing run <name>` + a run URL — treat the *absence* of that line as a failure. Run
already finished without a tracker? Backfill from the train log (regex per-epoch summaries →
`init(..., tags=["backfilled"]) → run.log(..., step=epoch)`). Still in flight? Kill and relaunch with
`--resume <latest.pth>` (costs ≤1 epoch). Prefer a hosted tracker so metrics survive teardown (U20).

---

## Delegated — cross-link only, do NOT restate here

### U36 — cuDNN nondeterminism

Same config + seed gives slightly different metrics run-to-run (`cudnn.benchmark=True` picks the fastest
kernel by first-batch timing). Owned by **verifying-dl-experiments** (determinism). Cross-link
verifying-dl-experiments **REQUIRED**; do not restate the fix here.

### U37 — matplotlib `2^16`-per-axis limit on large eval visualization

A composite grid (one row per sample) on a large test set crashes
`Image size … must be less than 2^16`, often aborting the summary save. Owned by
**verifying-dl-experiments** (eval-artifact sizing). Cross-link verifying-dl-experiments **REQUIRED**;
prevent with U25 (cap + shard, don't emit a file/row per sample).

### U38 — GPU at 0% util but training IS running (CPU-data-bound, not stalled)

`nvidia-smi` reads ~0% util yet the step log advances and model memory is loaded — a heavy per-sample CPU
transform with `num_workers=0` serializes data prep and starves the GPU. Owned by
**verifying-dl-experiments** (0%-util diagnosis). Cross-link verifying-dl-experiments **REQUIRED**; the fix
knobs are U24, the move-to-GPU remedy is in that skill.

### U39 — Live monitoring shows nothing (TensorBoard panel empty / `INACTIVE`) but training is fine

**Symptom**: the platform's TensorBoard tile / web panel is blank or `INACTIVE`, or a backgrounded watcher
goes silent — yet the run is healthy: the loss advances on the box and the event/log files exist. You
conclude "monitoring is broken" or, worse, "the run died," and waste a check or restart a fine run.

**Root cause**: live observability breaks in three platform-shaped ways, none of which is a training
failure. (1) **Path mismatch** — the platform's built-in panel reads a FIXED logdir/port and your logger
wrote elsewhere, so the panel sees zero runs (AutoDL pins `tensorboard --logdir /root/tf-logs`; a
`SummaryWriter(log_dir="runs/<exp>")` is invisible to it). (2) **Process died / never backgrounded** — the
TB server or the watcher ran in the foreground or under the session and was killed at the foreground cap
or on session/SSH drop, so nothing serves the curves. (3) **Port not exposed** — the service is up on the
box but the port was never tunnelled / declared, so the panel can't reach it.

**Fix** (the rule is universal; the *value* is per-profile): (1) **align the path** — point your logger at
the panel's pinned dir, OR symlink the pinned dir at your output (`ln -sfn <your-runs>/<exp> <pinned>/<exp>`);
no retrain — the running writer keeps appending and the panel reloads it. The pinned path lives in the
profile (AutoDL `/root/tf-logs`, **AD7**; elsewhere write under the durable mount). (2) **run TB + the
watcher under the detach primitive** (tmux / nohup / the profile's `DETACH`), never foreground, so they
survive the session and the ~600 s cap (`references/monitoring_patterns.md` §1; cross-host background →
§7). (3) **expose the port the platform's way** — CN built-in tiles declare it at rent time (`china.md`),
RunPod via its HTTP proxy (100 s Cloudflare cap, fine for a TB UI, `runpod.md`), Lambda / Paperspace /
bare-SSH via an `ssh -L 6006:localhost:6006` tunnel (`generic-ssh.md`, `lambda.md`). Before blaming the
panel, verify ground truth: the event file is non-empty (`ls -la <logdir>; du -sh <logdir>`) and TB
answers locally (`curl -s localhost:<port>/ | head`). For curves that must **survive teardown**, don't
depend on a box-local panel at all → a hosted tracker (**U20**).

---

## Pointers — gotchas catalogued elsewhere

- **Spot / preemption** (grace windows 2 min → ~0 s, Young/Daly cadence, atomic-write resume, managed-spot frameworks restart-your-process) → `references/spot-resilience.md`.
- **Multi-node / NCCL** (fabric-manager hang, wrong NIC, NCCL timeout, jumbo-frame MTU mismatch, torchrun/Horovod elastic state restore) → `references/multinode.md`. Single-box users skip.
