# Lifecycle Checklist — the 6-phase runbook as a per-platform checklist

Purpose: a platform-parameterized, copy-pasteable checkbox runbook for one remote-GPU job, Phase 0
(environment audit) through Phase 5 (aggregate + verify + teardown). Substrate is delegated to **your
platform profile** (`profiles/<platform>.md`, 8-field schema in `profiles/_schema.md`) — this file never
hardcodes a mount, verb, or proxy. Each phase ends in the runnable check from `SKILL.md`.

`grep -in <keyword> references/lifecycle_checklist.md` to jump.

## Table of contents
- Phase −1 — one-time setup (skip if reused)
- Phase 0 — environment audit
- Phase 1 — SSH + credentials
- Phase 2 — wrapper + CPU-smoke gate
- Phase 3 — detached launch
- Phase 4 — durable monitoring
- Phase 5 — aggregate + verify + teardown
- Cost-saving teardown table
- Failure handling (inline, any phase)

> **How to use:** pick the profile FIRST (`SKILL.md` → "Pick your platform profile"). Wherever a step
> says *profile data mount* / *profile durable mount* / *profile meter-stop verb* / *profile detach
> primitive*, read the literal value out of that profile's STORAGE / TEARDOWN / DAEMON sections. Skip any
> phase already done. Universal gotchas referenced by id live in `references/gotchas_universal.md` — not
> restated here.

---

## Phase −1 — One-time setup *(skip if reused from a past project)*

- [ ] **First contact — surface the profile's "Surface to the user" block** to the user: the platform's non-obvious **conveniences** (one-click SSH-key registration, GPU-availability notifications, built-in panels) and its **danger clocks** (auto-release/auto-delete timers, stop-still-bills, low-balance purge). Don't assume they know — the danger clocks cost data or money (principle #10).
- [ ] Local SSH keypair exists (`~/.ssh/id_ed25519`); public key registered with the platform.
- [ ] `~/.ssh/config` alias per instance, with keepalive (`ServerAliveInterval`/`ServerAliveCountMax`) — see `references/ssh_transport.md`.
- [ ] Durable storage provisioned per profile (shared FS / network volume / persistent disk), sized ≥ `ckpt_size × N + buffer`.
- [ ] Reusable image/snapshot saved with the project's env + code, IF the profile supports it (saves repeated cold-build time × N instances).
- [ ] `.gitattributes` sets `*.sh text eol=lf` so Windows-authored scripts don't ship CRLF (gotcha U26).

> **verify:** `ssh <alias> 'echo reachable'` returns `reachable` and the durable mount appears in the profile's survival matrix.

---

## Phase 0 — Environment audit

- [ ] Read the profile's STORAGE survival-matrix: know which tier survives *stop* vs *destroy* (principle #4). Write checkpoints to the tier that survives the intended *profile meter-stop verb*.
- [ ] Read the profile's region/DC-lock: if a shared/network volume is region-scoped, confirm all instances share that region BEFORE launch.
- [ ] Measure live, do not assume: `df -h && df -i <profile data mount>` (inodes die before bytes — principle #5), cgroup `cat /sys/fs/cgroup/memory.max`, `nvidia-smi`.
- [ ] `du -sh` the real space hogs on the actual mount (symlinked caches hide — principle #5), not the dir assumed.
- [ ] Pre-compute the checkpoint disk budget: `ckpt_size × N + scratch`; confirm it fits the *profile data mount* cap.

> **verify:** `nvidia-smi` shows the expected GPU and `df -i <profile data mount>` is not near 100%.

---

## Phase 1 — SSH + credentials

- [ ] Set the SSH alias/env per the profile's NETWORK section; note the SSH flavor (a proxied/basic SSH may not `scp`/`rsync` — direct-TCP required; ports may change on restart).
- [ ] Use the prebuilt image/base AS the env — do NOT `conda create` on a rental (throwaway-instance exception: the image IS the env).
- [ ] Push secrets via **stdin, never onto a shared/durable FS** (a shared FS is multi-project) — pattern in `references/ssh_transport.md`. Reference creds by env-var NAME / file path, never inline a key.
- [ ] If the profile sits behind the GFW, wire the China-mirror endpoint now (`references/china-network.md`); validate the speed test on the SAME route the real transfer uses (principle #7).

> **verify:** `ssh <alias> 'python -c "import torch;print(torch.cuda.is_available())"'` prints `True`.

---

## Phase 2 — Wrapper + CPU-smoke gate

- [ ] Build an idempotent `run_one` / `run_queue` from `scripts/` (`run_one.sh.template`, `run_queue.sh.template`), parameterized from the profile's SCRIPT OVERRIDES (`DATA_DIR=`, `DURABLE_DIR=`, `PROXY_HOOK=`, `CRED_FILE=`, `SCRATCH=`, `HF_HOME=`, `DETACH=`).
- [ ] Wrappers are resumable: load-latest-on-startup unconditionally so the identical launch command resumes, not restarts (principle #8).
- [ ] Build the per-cell queue/config files with one isolated write path per cell (no shared mutable output — parallel ablation needs this; `references/parallel_ablation.md`).
- [ ] **Run the cheap CPU smoke LOCALLY, BEFORE renting** — 1–2 batches, logger disabled, tiny shapes; it kills import/config/shape/scale bugs for ~free (principle #2). Smoke *content* → **verifying-dl-experiments** (REQUIRED).

> **verify:** smoke exits 0 on 2 batches with the logger disabled, no Traceback.

---

## Phase 3 — Detached launch

- [ ] Launch via the *profile detach primitive* (tmux / `sbatch` / k8s Job / commit) — survives an SSH drop; confirm whether it also survives an instance restart (profile DAEMON section).
- [ ] Push code/data with a resumable transfer (`rsync --partial` or `timeout`+resume loop — principle #7); never edit a script under a live run — version filenames (principle #6).
- [ ] Probe briefly: log head + process alive + no traceback, then **hand control back**. Never a blocking foreground `sleep` (foreground Bash hard-caps at 600 s on Claude Code; other hosts have their own turn limit — `monitoring_patterns.md` §7).

> **verify:** within 60 s, the detach session is alive and the first log line shows the expected step/epoch.

---

## Phase 4 — Durable monitoring

- [ ] For anything over ~1–2 h, deploy the **four-layer architecture** (`references/monitoring_patterns.md`): on-box self-completion chain + session patrol loop + event sentinels + recovery handbook. A session-bound watcher alone dies with the session (principle #3).
- [ ] Use `run_in_background` (no duration cap, notifies on exit; a Claude Code primitive — other hosts map per `monitoring_patterns.md` §7) for long waits; never foreground-poll. NEVER an unquoted `|` inside a poll-regex — it reads stdin and hangs forever.
- [ ] Watch `df -i` trend (not just `df -h`), cgroup memory %, new FINISHED/ERROR/Traceback markers, and fast-finish (< ~50% expected duration → probable failure).
- [ ] Reconcile each watcher against the job's REAL process/artifact (`tmux ls`/`squeue`/`pgrep` + output `mtime`) — a watcher's own state is a claim, not ground truth (principle #3). Tear a watcher down when its job is superseded.
- [ ] Classify each failure → its fixed remediation (see Failure handling below); **never blind-retry**.

> **verify:** the patrol reports a status line even when nothing changed (proves it's alive, not silently dead).

---

## Phase 5 — Aggregate + verify + teardown

- [ ] Run the aggregation step (`scripts/aggregate_to_fs.sh`, idempotent — safe to re-run) to checked-sync results to the *profile durable mount*. **Gate the success line on the actual copy result** — `cp …; echo synced` lies on a full/inode-exhausted FS (principle #3, gotcha U33).
- [ ] Confirm the durable mount has the expected artifact count: `ssh <alias> 'ls <profile durable mount>/final_ckpts/ | wc -l'`.
- [ ] Pull results to local (resumable per-dir scp/rsync loop); HARD-sanitize the local target to `/path/to/local` — never a real personal path.
- [ ] **Load-and-verify each artifact** before teardown: `python scripts/verify_local.py /path/to/local/final_ckpts/` → expect `OK N/N, errors 0`. Re-pull + re-verify any error.
- [ ] Record disclosable run facts for the paper: CLI overrides, tracker summary URL (a hosted tracker survives teardown — **huggingface-skills:huggingface-trackio**). Transport verbs (`hf download --resume`, `hf upload-large-folder`) → **huggingface-skills:hf-cli**.
- [ ] ONLY THEN perform the *profile meter-stop verb*, AFTER explicit user approval of the specific cost-affecting action.

> **verify:** `verify_local.py` reports 100% OK *before* any teardown.

> **Iron Law — teardown gate:** NO `stop` / `release` / `terminate` / `destroy` / file-delete until
> checkpoints are **pulled to local AND verified by load**, AND the user has explicitly approved the
> cost-affecting action. "It looked done in the log" is not evidence (principle #3). On most platforms the
> meter-stopping verb is **irreversible** (deletes the disk) — confirmation matters *more*, not less. The
> general form is **superpowers:verification-before-completion** (REQUIRED).

---

## Cost-saving teardown table

The verb that stops the meter, what each preserves, and irreversibility — bind the platform-specific verb
from the profile's TEARDOWN section. **The biggest portability trap: "stop" rarely stops the meter, and
the action that does is usually irreversible** (principle #4/#9).

| Action | Stops GPU meter? | What survives | Reversible? |
|---|---|---|---|
| **stop / 关机 (power-off)** | Sometimes — depends on profile (AutoDL: yes, keeps disk; RunPod/vast: still bills storage 1–2×) | Disk tier per profile survival-matrix | Yes — instance restartable |
| **release idle instance** | Yes | Only the durable/shared mount (data disk gone) | No — instance + container disk destroyed |
| **terminate** | Yes | Only a network/persistent volume, if one was mounted | **No — irreversible**, disk deleted |
| **destroy** | Yes | Nothing on the box | **No — irreversible**, total loss |
| **delete durable files (keep subscription)** | Storage trickle only | Subscription survives for new data | No — those files gone |
| **cancel durable storage subscription** | Storage cost only | Nothing | **No — irreversible**, all durable data lost |

**Default conservative plan:** stop/release the GPU instance first (immediate $ saving, low risk once
artifacts are verified-local). Keep durable storage 1–3 months until the paper is submitted. Cancel the
durable subscription LAST, only after the local copy is verified and the user approves.

---

## Failure handling *(inline, any phase)*

Categorize before reacting; retry the **identical** config — hand-patching one run destroys comparability
(principle #7; **verifying-dl-experiments** owns is-it-a-bug-or-real).

- [ ] **Probabilistic** (epoch-1 stall, transient `wandb.init` blip, spot preemption): queue a retry with the SAME config, no safeguards. Resume works because of checkpoint-load (principle #8).
- [ ] **Disk-full** (exit 1 + `iostream` / "No space left"): prune the *profile scratch* (`SCRATCH=` — periodic checkpoints, unused caches), keep `best`; if cleanup can't free enough, **ask to expand the disk**, never silently shrink the experiment (principle #9). Then retry.
- [ ] **Real bug** (CUDA OOM, code error, all-zero metric): stop, investigate code — do NOT retry blindly.

> Symptom → root cause → fix for each, plus the full catalog: `references/gotchas_universal.md`
> (`grep -in <keyword> references/gotchas_universal.md` to jump).
