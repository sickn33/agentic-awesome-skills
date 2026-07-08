# Worked example — a 3-cell ablation sweep on AutoDL

A complete, end-to-end run of the 6-phase lifecycle (SKILL.md) for the deepest profile
(`profiles/autodl.md`). Substitute your own project name, alias, and configs. Two instances run
their own queue file in parallel; this walkthrough ships `queue_1.txt` and shows one instance. **Read `profiles/autodl.md`
first** — it owns every path and verb used below.

The AutoDL `SCRIPT OVERRIDES` (profiles/autodl.md §8) that parameterize the templates:

```bash
export PROJECT_REPO_DIR=/root/myproj
export DATA_DIR=/root/autodl-tmp          # fast per-instance scratch (checkpoints)
export DURABLE_DIR=/root/autodl-fs        # region-locked shared FS (survives release)
export PROXY_HOOK='source /etc/network_turbo'
export CRED_FILE=/root/.wandb_key
```

### Phase 0 — Environment audit
```bash
ssh autodl-1 'df -h /root/autodl-tmp /root/autodl-fs / && df -i /root/autodl-fs && \
              cat /sys/fs/cgroup/memory.max | numfmt --to=iec && nvidia-smi'
bash scripts/gpu_health.sh 0     # run ON the box: Xid / throttle pre-flight (U22/U23)
```
Budget the disk: `ckpt_size × cells_in_queue + scratch`. **Verify:** `nvidia-smi` shows the expected
GPU; `df -i /root/autodl-fs` is well under 100% (the inode cap, U7).

### Phase 1 — SSH + credentials
```bash
# alias already in ~/.ssh/config (references/ssh_transport.md). Push the wandb key via stdin,
# to the per-instance disk — NEVER the shared FS (U34, and AutoDL's classifier blocks it, AD-gotcha):
printf '%s\n' "$WANDB_KEY_FROM_ENV" | ssh autodl-1 'umask 077; cat > /root/.wandb_key && chmod 600 /root/.wandb_key'
```
**Verify:** `ssh autodl-1 'python -c "import torch;print(torch.cuda.is_available())"'` prints `True`.

### Phase 2 — Wrapper + CPU-smoke gate
```bash
# Parameterize the templates, drop the .template suffix, smoke locally on CPU BEFORE renting time:
cp scripts/run_one.sh.template run_one.sh && cp scripts/run_queue.sh.template run_queue.sh
python -m src.train -c configs/ablation/baseline.yaml --task reconstruction \
       --limit-batches 2 --epochs 1   # logger off; catches import/shape/scale bugs for free
```
**Verify:** the smoke exits 0 on 2 batches. (Smoke *content* → **REQUIRED:** `verifying-dl-experiments`.)

### Phase 3 — Detached launch
```bash
# Push the parameterized wrappers + queue to the shared FS (ONE copy, all instances read it):
scp run_one.sh run_queue.sh examples/autodl_sweep/queue_1.txt autodl-1:/root/autodl-fs/
ssh autodl-1 "RUN_ONE=/root/autodl-fs/run_one.sh tmux new -d -s q1 \
  'bash /root/autodl-fs/run_queue.sh /root/autodl-fs/queue_1.txt 2>&1 | tee /root/autodl-tmp/runs/logs/q1_master.log'"
```
**Verify within 60 s:** `ssh autodl-1 'tmux ls && tail -5 /root/autodl-tmp/runs/logs/q1_master.log'` shows
the session alive and a `STARTING baseline` line. Never overwrite the FS wrapper mid-run (U2 / principle #6).

### Phase 4 — Durable monitoring
```bash
ssh autodl-1 'grep -hE "STARTING|FINISHED|QUEUE DONE|ERROR|Traceback" /root/autodl-tmp/runs/logs/q1_master.log | tail -8'
```
For a multi-hour sweep deploy the four-layer architecture (`references/monitoring_patterns.md`): a remote
self-completion marker + a session patrol loop. Flag a FINISHED at <50% typical duration (probable
early-stop) and re-launch the **identical** config (principle #7), never a patched one. Don't blind-retry.

### Phase 5 — Aggregate + verify + teardown
```bash
ssh autodl-1 'DATA_DIR=/root/autodl-tmp DURABLE_DIR=/root/autodl-fs bash /root/autodl-fs/aggregate_to_fs.sh'  # gated sync (U33)
LOCAL_TARGET=/path/to/local/final_ckpts REMOTE_ALIAS=autodl-1 \
  REMOTE_PATH=/root/autodl-fs/final_ckpts bash scripts/download_loop.sh        # resumable per-dir pull
python scripts/verify_local.py /path/to/local/final_ckpts/                     # LOAD each best.pth
```
**Verify:** `verify_local.py` reports 100% OK. **Iron Law:** only AFTER every cell is pulled AND
load-verified AND the user approves does teardown run — on AutoDL `关机` stops the meter and keeps the
disk (the reversible exception); `release` frees it irreversibly. Reconcile against the roster, not the
log (`references/parallel_ablation.md` §6). **REQUIRED:** `superpowers:verification-before-completion`.
