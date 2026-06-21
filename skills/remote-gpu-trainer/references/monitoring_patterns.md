# Monitoring Patterns — durable watching of a remote GPU job

Platform-agnostic recipes for babysitting a long-running detached job on a rented box. The crown jewel
is the **four-layer durable-monitoring architecture** (§3): a session-bound watcher alone dies with the
session, so layer it. Every recipe uses portable primitives — `tmux` OR `squeue` OR `pgrep`, a log
marker OR an artifact `mtime` — never one platform's paths. Bind the concrete paths/aliases from
`profiles/<platform>.md`.

To jump: `grep -in '<keyword>' references/monitoring_patterns.md`.

## Table of contents

- §0 Monitoring physics — the four facts every recipe rests on
- §1 The robust short-connection ssh-poll template (the safe poll primitive)
- §2 Quick health probes (one round-trip each)
- §3 Durable monitoring architecture — the four layers (L1 self-completion · L2 patrol · L3 sentinels · L4 handbook)
- §4 Stale-waiter hygiene — one waiter per live run, right lifetime
- §5 Two-leg self-completion — guaranteed results + best-effort cadence
- §6 Failure triage on the log
- §7 Monitoring across agent hosts — per-host background/loop/cron primitives + the 2 portability rules (Claude Code · Codex · Cursor · Trae · generic)

---

## §0 Monitoring physics — the four facts every recipe rests on

Verified in-session, not assumed. The whole architecture is engineered around these:

> **Tool-portability note:** `run_in_background`, the ~600 s foreground cap, and `/schedule` (below and
> §5/§3) are the **Claude Code** harness's primitives. On another Agent-Skills host (Codex / Cursor /
> Trae / …) map them to that agent's equivalents — its background-task or async runner, its own
> foreground/turn limit, its scheduler. The four-layer architecture itself is host-agnostic — the full
> per-host mapping (Codex / Cursor / Trae / generic) and the two portability rules are in **§7**.

1. **Foreground Bash hard-caps at 600 s (10 min).** A long foreground wait/monitor is *killed* at the cap
   — so never foreground-poll a multi-hour run.
2. **`run_in_background` has NO duration cap and notifies on EXIT.** A 781 s background task ran to
   completion and notified (verified). Long task that finishes → background it.
3. **A never-*exiting* watcher never notifies.** No exit event = no notification, ever. A persistent
   `while true` / a stray `grep` reading stdin hangs silently forever and the user reads silence as "dead
   monitor". Every watcher must have a bounded exit.
4. **An unquoted `|` inside a poll regex hangs forever.** The shell splits `grep -hE a|b|c log` into three
   piped commands; the first (`grep -hE a`, no filename) reads **stdin** → blocks → the pipeline never
   returns → the ssh never returns → the background process never exits → fact 3 fires. ALWAYS quote the
   regex AND give grep a filename.

Corollary — **trust the artifact, not the silence.** When a job "looks done," Read its output file and
re-check ground truth (`grep DONE log; tmux ls / squeue; nvidia-smi`) before claiming success. Do not
wait blindly for a notification that may never fire. This is the `verifying-dl-experiments` (REQUIRED)
Iron Law applied to monitoring.

---

## §1 The robust short-connection ssh-poll template (the safe poll primitive)

The single most important pattern: a poll that cannot hang (fact 4) and cannot strand a half-open
connection. **Never hold one long ssh open for the whole wait** — loop locally, reconnecting each tick.

```bash
#!/usr/bin/env bash
set -u
# Short-connection poll: ssh in → check → disconnect; bounded local loop.
HOST="<alias>"                       # from profiles/<platform>.md
LOG="/path/to/run.log"               # remote log path (profile-bound)
PATTERN='QUEUE DONE|Training completed'   # QUOTED → '|' is alternation, never a pipe (fact 4)
MAX=120                               # bounded: 120 ticks × 90 s ≈ 3 h, then give up cleanly
i=0
while [ "$i" -lt "$MAX" ]; do
  # ConnectTimeout + ServerAlive bound a network blip to ~30 s instead of a multi-minute half-open hang.
  if ssh -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3 "$HOST" \
       "grep -qE '$PATTERN' '$LOG'"; then          # quoted regex + a FILENAME → grep reads the file, never stdin
    echo "DONE marker found"; exit 0
  fi
  i=$((i+1)); sleep 90
done
echo "poll gave up after $MAX ticks — check ground truth manually"; exit 1
```

Non-negotiables baked in above:
- **Quoted regex + a filename** on every remote `grep` — the two independent guards against fact 4.
- **`ConnectTimeout` / `ServerAliveInterval` / `ServerAliveCountMax`** — a dropped link self-kills fast.
- **Short connection per tick, bounded local loop** — one ssh per check, a hard tick ceiling so the
  waiter always EXITS (fact 3) and therefore always notifies when backgrounded.
- **Detect "done" by a log MARKER, never by `pgrep`** of the waiter's own pattern — `pgrep -f` matches
  the waiter's own command line and the loop never ends. On a queue scheduler, `squeue -j <id>` going
  empty is the equivalent done-signal.

Run this via `run_in_background` (fact 2: no cap, notifies on exit), or as a single foreground tick under
the 600 s cap (fact 1). On a session scheduler use it as the L2 patrol body (§3). **Never foreground-poll
the full wait.**

---

## §2 Quick health probes (one round-trip each)

Each is a single short ssh. Combine several into ONE round-trip for a patrol tick (§3). Detach-primitive
and paths come from the profile; the structure is identical everywhere.

> A blank live **TensorBoard tile / web panel** while these probes show a healthy run is **not** a dead
> run — it is `references/gotchas_universal.md` **U39**: the panel reads a fixed logdir/port your logger
> didn't write to, or the TB/watcher process died (ran foreground, not under the detach primitive), or the
> port isn't exposed. Fix per the platform profile; never restart a healthy run over an empty panel.

**Is the job alive? (tmux OR squeue OR pgrep — pick the profile's primitive)**
```bash
ssh "$HOST" "tmux ls 2>/dev/null || true; squeue -u \$USER 2>/dev/null || true; pgrep -af 'train' | grep -v grep | head -3"
```

**Progress since last check** — grep the run's OWN log, not a shared master:
```bash
ssh "$HOST" "grep -nE 'Epoch [0-9]+|Training completed|Early stopping|FINISHED|QUEUE DONE' '$RUN_LOG' | tail -6"
```

> **Gotcha — crash-detect on the per-run log, never the shared master.** Symptom: a poll reports "run D
> crashed" while D trains fine. → Root cause: a `tee`'d master log concatenates every run, so grepping it
> for `Traceback|OutOfMemory` matches an EARLIER run's crash text and false-positives on a healthy later
> run. → Fix: scope crash detection to the per-run log (`<name>.log`); reserve the master-log grep for
> `DONE`/`FINISHED`/`QUEUE DONE` and progress markers. A waiter that crash-checks the wrong log spins to
> its full timeout on a phantom failure.

**Resource pressure** (cgroup mem, GPU) — thresholds are rough, profile-tunable:
```bash
ssh "$HOST" "nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader; \
  [ -f /sys/fs/cgroup/memory.current ] && numfmt --to=iec \$(cat /sys/fs/cgroup/memory.current)/\$(cat /sys/fs/cgroup/memory.max) 2>/dev/null"
```
- cgroup mem > 90% of max → OOM risk; GPU util > 60% → healthy, not data-bottlenecked.
- GPU at 0% but the step log advances ≠ idle — it is CPU-data-bound; sample util over several seconds,
  never one snapshot. (Diagnosis → `verifying-dl-experiments`, REQUIRED.)

**Disk — the silent killer** — watch `df -i` (inodes) AND `df -h` (bytes); inodes die first on
many-small-files eval output (→ `references/gotchas_universal.md`):
```bash
ssh "$HOST" "df -h '$DATA_MOUNT'; df -i '$DATA_MOUNT'"
```

---

## §3 Durable monitoring architecture — the four layers (earned by three live failures)

Session-bound watchers die with the session; the instance itself can die under the watcher; and a
monitor that only speaks on terminal events reads as "nobody is watching." One layer cannot fix all
three. Run four — **correctness in L1, liveness in L2, latency in L3, continuity in L4**:

| Layer | Lives where | Job | Survives |
|---|---|---|---|
| **L1 self-completion chain** | ON the box (tmux / nohup / sbatch dependency) | the work sequences itself: `until grep -q 'Training completed' log; do sleep 150; done && <next stage>`; stages hand off via `touch /path/STAGE_DONE` markers | session death, network loss |
| **L2 patrol loop** | session scheduler (cron `/loop`) | every ~30 min fire a SELF-CONTAINED patrol: one combined ssh probe + a decision table + "report EVEN IF nothing changed" | idle gaps (NOT session death — see L4) |
| **L3 event sentinels** | session background (`run_in_background`) | the §1 short-poll `until ssh test -f MARKER; …` for minute-level reaction between patrol ticks | nothing — acceptable; L1/L2 carry correctness |
| **L4 recovery handbook** | persistent notes/memory | exact resume commands, chain definitions, marker paths, "first command on reconnect" — a BRAND-NEW session takes over from one word | everything |

### L1 — on-box self-completion chain (correctness)
The box finishes its own pipeline regardless of any watcher. Chain stages under one detach primitive and
**join them with `&&`, never `;`** so a marker only lands on success:
```bash
# tmux / nohup variant — the detach primitive is the swappable plug (sbatch dependency on Slurm)
nohup bash -c '
  set -u
  until grep -q "Training completed" /path/to/train.log; do sleep 150; done \
    && python -m eval ... \
    && touch /path/to/STAGE_DONE        # marker ONLY on a clean &&-chain
' </dev/null >/path/to/chain.log 2>&1 &
```
> **Gotcha — success-gate the chain markers.** Symptom: the downstream chain fires on a phantom
> completion. → Root cause: joining stages with `;` (or a bare `touch` after a crashing stage) stamps the
> marker even when a stage died — a live disk-full `torch.save` killed stage 3, the `;`-marker still
> landed, the next stage ran on nothing. → Fix: `&&` between every stage and the final `touch`; detect
> done by the marker, never by `pgrep` of the waiter's own pattern (fact 4 / §1).

### L2 — patrol loop (liveness): the design checklist (what made it actually work)
- **ONE combined ssh probe per tick** — alive-check (tmux ls / squeue / pgrep) + `*_DONE` markers + last
  epoch line + artifact `ls` + dataset file COUNTS, in a single round-trip.
- **An explicit decision table**, e.g.: ssh down → tell the user to check the console (only they see
  balance/power state); detach session missing AND no completion marker → resume from `latest` + rebuild
  the L1 chain; result CSV exists → `cat` it and report the numbers verbatim; remote file count below the
  local source → resume the transfer; everything done → delete the patrol job itself.
- **Report a one-line status EVEN WHEN nothing changed** — silence between events is exactly what users
  read as a dead monitor. ("你有定时看吗??" twice in one campaign is the failure signature of L3-only.)
- **Completeness = file COUNT against the local source** (bytes/hash when names collide), NEVER `test -d`
  — a dir created by a killed transfer passes existence checks forever.
- **Never blind-restart** — probe session/log/markers first so a patrol firing mid-run cannot
  double-launch (idempotence). Classify each outcome → a fixed remediation; never blind-retry.

> **Ready-made tick:** `scripts/health_patrol.sh.template` is this checklist as one runnable,
> read-only ssh round-trip — alive + done-count + last epoch + crash-scan + `df -h`/`df -i`, an
> escalation predicate, and a one-line report even when nothing changed — parameterized from the
> profile's §8. Fire it from the host's recurring runner (§7: `/loop`, cron `3,33 * * * *`, …).

### L3 — event sentinels (latency)
The §1 short-poll loop for minute-level reaction between patrol ticks. Survives nothing — it is the
disposable fast-reaction layer; L1/L2 carry correctness. Re-arm exactly ONE after any session resume.

> **`run_in_background` is NOT a substitute for `/loop` on an unattended wait.** A one-shot
> `run_in_background` sentinel notifies on EXIT — fine while you keep working in an ACTIVE session, but if
> the session goes idle for hours its exit-notification lands on a closed/reset session and you hear
> nothing (the silent-monitor-for-hours failure). Any UNATTENDED wait over ~1 h → bind the **L2 `/loop`
> patrol** (a recurring agent re-wake), never a lone one-shot sentinel.

### L4 — recovery handbook (continuity)
Persistent notes a brand-new session inherits from one word ("继续"): exact resume commands, the L1 chain
definition, every marker path, the "first command on reconnect." Two durable hardenings:
- **Externalize transfer/monitor state to a stable OS path** + a DONE marker file *outside* the session
  dir, so any future session resumes by reading files instead of re-uploading.
- **True restart-immunity means an OS-owned process** (Task Scheduler / cron) — but creating one is
  unauthorized persistence to the permission classifier: **get the user's explicit one-line approval
  first**, or hand them the launch command to run themselves.

> **Gotcha — after a context compaction, reconcile UI task chips against the OS process table.**
> Symptom: 5 chips show "Running" for 2–6 h while zero ssh/scp processes exist and a "running" upload
> actually died at 2/10 checkpoints, silently gating the downstream eval all evening. → Root cause:
> background shells die with the old session, but their chips keep showing "Running"; the new session's
> task list is empty, so the only ground truth is a process scan. → Fix: **first action after any
> compaction is a process-scan** (e.g. `Get-CimInstance Win32_Process` matched on the remote host string,
> or `pgrep`/`ps` for ssh/scp), relaunch dead transfers with a byte-size verify, re-arm ONE fresh
> sentinel, and tell the user to clear the husks.

---

## §4 Stale-waiter hygiene — one waiter per live run, right lifetime

> **Gotcha — stale background waiters pile up.** Symptom: the Background-tasks panel shows 8+ "Running"
> wait-loops at 500–740 min elapsed, ssh-polling every ~20 s, while the GPU is idle and the experiment
> finished hours ago. → Root cause: every kill+restart of a flaky-network saga armed a NEW
> `until ssh grep MARKER; do sleep 20; done` waiter but never stopped the OLD one — its marker (in a
> superseded log) never appears, so it loops forever (fact 3). → Fix below.

- **One waiter per live run.** Superseding a run → STOP its old waiter *first* (TaskStop, or dismiss a
  cross-session chip from the UI — resumed-session IDs aren't stoppable programmatically).
- **Match watcher lifetime to the wait.** Multi-hour wait → a persistent Monitor (no 10-min cap) plus a
  stall-detector so a hung run still notifies. A persistent monitor still dies on session resume → after
  any resume, **check remote ground truth directly** (tmux ls / squeue, `grep DONE log`, `nvidia-smi`);
  do not trust a watcher that may be gone (fact 3 + §0 corollary).
- **A dropped poll connection ≠ the job dying.** A long background ssh poll gets killed by the remote's
  idle-SSH timeout while the detached training runs on independently. Re-ssh and verify the process/
  artifacts directly before concluding anything died.

---

## §5 Two-leg self-completion — guaranteed results + best-effort cadence

"I'll check periodically" is a lie unless a trigger is ARMED — between turns the assistant does not run.
Two legs, never conflated:

- **Leg 1 — remote self-completion (guaranteed, survives session/SSH death):** the L1 chain
  (`train → eval → touch marker` under one detach primitive). Detect done by a log/marker, never by
  `pgrep` of the waiter's own pattern. This guarantees RESULTS but gives no reporting cadence.
- **Leg 2 — live progress (best-effort):** a session-bound patrol loop (L2, e.g. `/loop 30m` or cron `3,33 * * * *`)
  polling with the LOCAL ssh key. Be honest it dies when the session closes — the remote still finishes;
  the user re-pings to pull.

> **A cloud scheduler cannot reach a rented box.** A cloud schedule (`/schedule` / RemoteTrigger) runs in
> an isolated sandbox with its own checkout and **no access to the local SSH key or network** → it cannot
> ssh the box, and the SSH private key must **never** be placed in a cloud agent (secret-leak). The honest recurring check is the remote self-monitor + a session loop, not a cloud robot pinging
> the box. Don't promise autonomous cross-session polling that can't be delivered.

For a hosted tracker whose metrics survive teardown and can be polled as a structured monitor instead of
brittle ssh-tail, use `huggingface-skills:huggingface-trackio` (REQUIRED for that path) — poll its alerts
rather than grepping a remote log.

---

## §6 Failure triage on the log

When a probe shows trouble, pull the full traceback from the per-run log (§2) and classify — each
outcome maps to a FIXED remediation; never blind-retry:

```bash
ssh "$HOST" "grep -B2 -A20 'Traceback' '$RUN_LOG' | head -50"
```
- `basic_ios::clear: iostream error` + `unexpected pos N vs M` → **disk full during checkpoint save**;
  check `df -h`/`df -i`, prune `latest`/periodic snapshots to recover (→ `references/gotchas_universal.md`).
- bare `Killed` / exit 137, no traceback → **cgroup OOM** (workers × big in-RAM tensor); size workers
  vs `memory.max`, not CPU count.
- `CUDA out of memory` → VRAM, usually consistent across runs (batch too big / concurrent job), rarely
  transient.
- `KeyError` / `AttributeError` → config/code mismatch; investigate code, do not retry.
- Early-stop far below baseline with a grad_norm P99 spike in epoch 1–2 → likely **probabilistic
  divergence**; whether it's a bug or a real effect, and the retry-the-identical-config rule, belong to
  `verifying-dl-experiments` (REQUIRED) — this skill owns *running* the retry, not judging the number.
- log frozen (no new lines) but checkpoint `mtime` advances → **block-buffered stdout**, not a hang
  (`references/gotchas_universal.md` U43; run `python -u`/`PYTHONUNBUFFERED=1`).
- `uptime`/`free` on the box look maxed but your cgroup is roomy → **noisy neighbor** on the shared host,
  not your job (`references/gotchas_universal.md` U41; the authoritative OOM check is the `oom_kill` counter
  in `/sys/fs/cgroup/memory.events`).
- GPU SM% pinned low while a python thread-storm pegs the cores → **intra-op thread oversubscription** on a
  vCPU slice (`references/gotchas_universal.md` U40; cap `OMP_NUM_THREADS` to the cgroup quota).

Universal gotchas (silent sync, CRLF, mid-run script overwrite, inode caps) are NOT restated here —
see `references/gotchas_universal.md` (`grep -in '<keyword>' references/gotchas_universal.md` to jump).

---

## §7 Monitoring across agent hosts (portability mapping)

The four layers are host-agnostic; only **which primitive runs L2/L3** changes per host. Two rules port
the whole architecture to Codex / Cursor / Trae / any Agent-Skills host:

**Rule 1 — the durable layer needs no agent.** L1 (the box self-completes + `touch`es a marker) plus the
box **pushing its own notification** at the end of the `&&`-chain — a `curl` webhook / email / a
`huggingface-skills:huggingface-trackio` alert — works on EVERY host, because it runs entirely on the
rented box. On a host with no background/scheduler primitive, this IS the monitor; the agent just pulls
results on its next turn.

**Rule 2 — a CLOUD scheduler cannot reach a rented box (§5), on ANY host.** Every host's hosted
automation runs in an isolated sandbox with no local SSH key or network, so it cannot ssh your box (and
the key must never be placed in one — secret-leak). Use cloud cron only to **re-wake the agent** or
**poll a hosted tracker**, never to probe the box. The box-reaching poll must use the host's
**local/session** runner (which holds your SSH key), or be the L1 on-box loop.

| Agent host | Local runner — reaches the box (L3) | Recurring / loop (L2) | Cloud cron/automation — re-wake / tracker only | Foreground/turn limit |
|---|---|---|---|---|
| **Claude Code** | `run_in_background` (detach + notify-on-exit); the `Monitor` tool | `/loop` + `ScheduleWakeup` (interval or self-paced) | `/schedule` (cron cloud agent) | ~600 s foreground |
| **OpenAI Codex** | Codex Cloud background tasks (async, parallel) | a thread that schedules its own wake-up | **Automations** — cron syntax, results → review queue | per cloud task |
| **Cursor** | Background Agents (async) | — | **Automations** — cron (hourly/daily/weekly) + event triggers | per agent |
| **Trae** (ByteDance) | Agent / `trae-agent` CLI unattended runs; CI/CD | via a CI/CD pipeline | **no native cron found** → external cron / CI-CD, or rely on Rule 1 | per run |
| **Google Antigravity** | background / parallel subagents (desktop) | **Scheduled Tasks** (cron) + `/schedule` | Scheduled Tasks — Rule 2: verify local-vs-sandbox before trusting box-reach | `/schedule` one-time ≤15 min |
| **Gemini CLI** | headless `gemini -p` under a local runner (holds local creds → reaches box) | **no native loop/recurring** (open reqs #25415, #22653) → OS `cron` calling `gemini -p` | none | per invocation |
| **Generic / none** | any local background-equivalent (else none) | a shell `while`-loop under the turn limit | none | host turn limit |

> **Hosts not in the table** (VS Code / Copilot, Goose, Kiro, …) take the **Generic** row until they expose a local recurring runner that holds your SSH key — until then, wire **Rule 1** (the on-box self-push) and let the agent pull on its next turn.

**Binding the layers:** L1 is unchanged everywhere (on-box). Bind **L2** to the host's local recurring
runner *if* it reaches the box, else to the box's own `cron`/`at` + a push (Rule 1). Bind **L3** to the
host's local background runner, re-armed once per resume. When a host offers only cloud automation (or
nothing), **do not promise agent-side polling of the box** — wire Rule 1 and let the agent pull on its
next turn (§0 corollary: trust the artifact, not the silence).

Host capabilities verified 2026-06: Codex Automations (cron) + Cloud background tasks —
`developers.openai.com/codex/app/automations` + `/codex/cloud`; Cursor Automations (cron + event
triggers) + Background Agents — `cursor.com/docs/cloud-agent/automations`; Trae Agent / `trae-agent` CLI
+ CI/CD, no native cron surfaced — `docs.trae.ai/ide` + `github.com/bytedance/trae-agent`; Antigravity
Scheduled Tasks (cron) + `/schedule` — `antigravity.google` (Google I/O 2026 deep-dive); Gemini CLI no
native recurring (open `google-gemini/gemini-cli` #25415, #22653), headless `-p` + OS cron the workaround.
