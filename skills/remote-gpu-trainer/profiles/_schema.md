# Platform Profile Schema

Every `profiles/<platform>.md` describes ONE platform with the **same 8 sections in the same order**, so
they are scannable and diffable. A profile owns all the *slow-changing, per-platform* substrate that the
SKILL.md phases delegate to. It does **not** describe a specific job (that's the portable job request,
below) and never repeats the universal gotchas (those live in `references/gotchas_universal.md` — link,
don't restate).

Design rule borrowed from SkyPilot / dstack / Ray: **hardware is a CONSTRAINT, not a SKU.** A job asks
for `gpu: A100:8`; the profile owns how that maps to this platform's instance types. **Secrets are
referenced by env-var NAME or file path only — never inline a key**.

---

## Required structure of `profiles/<platform>.md`

Start each profile with a compact frontmatter block (the machine-readable facts), then the 8 prose
sections.

```yaml
---
platform: <name>            # e.g. runpod
kind: ssh-rental            # ssh-rental | cloud-api | kubernetes | slurm
meter_stop_verb: terminate  # the action that STOPS billing (stop | terminate | destroy | release | 关机 | manual)
meter_stop_irreversible: true
detach_primitive: tmux      # tmux | sbatch | k8s-job | nohup | kaggle-commit
spot_available: true
spot_grace: ~5s             # SIGTERM→SIGKILL window, or n/a
shared_fs: false            # is there a cross-instance shared filesystem?
inode_cap: none             # ~200K | none | host-dependent
free_egress: true           # download/upload to the wire free?
china_mirror_needed: false  # does it sit behind the GFW?
host_driver_cuda_max: "12.x"
local_nvme: true
---
```

### 1. LAUNCH
Entry points (web console / CLI / REST API / SSH), the canonical create command, and the **env
contract** — what IS the Python env (prebuilt base? a Docker image you choose? Lambda Stack?). State the
rule "the image/base IS the env — do not `conda create` on a rental" if it applies.

### 2. STORAGE MODEL  *(the survival matrix — principle #4)*
List every storage tier with its path, speed, and size/inode cap. Then a **survival matrix**:

| Tier | Path | Survives STOP? | Survives DESTROY? | Cap |
|---|---|---|---|---|

State region/DC-lock for any shared/network volume. Name the mount checkpoints MUST go to for the
teardown verb in §5.

### 3. NETWORK
Egress/proxy story, China-mirror relevance (link `references/china-network.md` if applicable), how
ports/services are exposed (TB/Jupyter), and the **SSH flavor(s)** — note if proxied/basic SSH cannot
`scp`/`rsync` (then direct-TCP is required) and whether ports change on restart.

### 4. SPOT / INTERRUPTION + RESUME  *(principle #7/#8)*
The interruption model (spot bid? capacity? auto-shutdown clock? auto-release?), the **detection signal +
grace window**, and the resume hook. Link `references/spot-resilience.md` for the cadence formula.

### 5. TEARDOWN / BILLING  *(principle #9 + the Iron Law)*
Exactly **what stops the meter** (stop vs terminate vs destroy vs 关机), what each preserves, what is
**irreversible**, and the cost trap (e.g. "stop still bills storage 2×"). This is the most error-prone
section — be precise.

### 6. DAEMON TOOL
The detach primitive (`tmux` / `sbatch` / Job manifest / commit), whether it survives an instance restart
(not just an SSH drop), and any native queue/scheduler. Note if `tmux` must be `apt install`-ed or is
absent (use `nohup … </dev/null >log 2>&1 &`).

### 7. TOP GOTCHAS  (4–8, platform-pinned)
Only the *platform-specific* ones, Symptom → Root cause → Fix. Universal gotchas are referenced, not
repeated. Give each a stable local id (e.g. `RP1`, `VAST2`).

### 8. SCRIPT OVERRIDES
The exact values to parameterize the `scripts/` templates for this platform:
`DATA_DIR=` (fast scratch) · `DURABLE_DIR=` (survives teardown) · `PROXY_HOOK=` · `CRED_FILE=` (file path; `""` if the key is an env var/secret) · `SCRATCH=` (what to prune) · `HF_HOME=` · `DETACH=`.
The templates read exactly these env-var names. Two further knobs *derive* rather than being set per
platform: `RUN_ONE` (the queue runner's path to `run_one.sh`) defaults to `$DURABLE_DIR/run_one.sh`, and
`PROJECT_REPO_DIR` (where *this run's* code lives) is a per-run value — see "Portable job request" below;
set either explicitly only if your layout differs.

---

## Portable job request (NOT in the profile — keep it per-run)

A job is described separately so the *same* job runs against any profile. Document it in
`references/parallel_ablation.md`; the shape:

```yaml
resources:
  gpu: {name: A100, count: 8, memory: 40GB+}   # a CONSTRAINT (ranges ok), never a platform SKU
  disk: 200GB
candidates: [autodl, china, runpod]            # ordered fallback → "describe once, run anywhere"
file_mounts: {/data: {source: ..., mode: MOUNT_CACHED}}   # MOUNT | COPY | MOUNT_CACHED
run: "bash run_queue.sh queue.txt"
```

The launcher resolves a job against a profile; the profile supplies paths/verbs, the job supplies
the work. Keeping them separate is what makes a profile reusable across every job.
