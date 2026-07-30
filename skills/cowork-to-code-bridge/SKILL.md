---
name: cowork-to-code-bridge
description: "Run work on the user's own machine from a sandboxed agent. Queues a task to a local daemon over a shared directory — no inbound ports — so builds, tests, git, installs, and system checks execute on their real Mac/Linux box and the result comes back."
risk: critical
source: https://github.com/abhinaykrupa/cowork-to-code-bridge
source_repo: abhinaykrupa/cowork-to-code-bridge
source_type: community
date_added: "2026-07-30"
---

# cowork-to-code-bridge

An agent running in a cloud sandbox can reason about the user's development
machine perfectly well, but it cannot reach it. The filesystem, the toolchain,
the local Docker daemon, and the git credentials all live on the other side of a
wall.

This skill crosses that wall. The sandboxed agent queues a task; a daemon on the
user's own machine runs it and hands the result back. Both sides only read and
write files in a shared directory — **no network call from the agent side, no
inbound ports, nothing listening on the internet.**

## When to Use

Use this skill when the user asks for something that needs their actual machine
and cannot be done in the sandbox:

- **Build or run an app** — "build me a Flask app and run it", "start the dev server"
- **Tests** — "run the test suite and fix what's failing"
- **Git** — "review the diff and push if it's clean", "what's my branch status?"
- **Installs / packages** — npm, pip, brew, cargo, docker
- **Machine state** — health, RAM, disk hogs, listening ports, running processes,
  container logs
- **Anything phrased as "on my Mac" / "on my machine" / "on my server"**

Do **not** use it for work that is already possible in the sandbox — reasoning,
writing text, or editing files the sandbox can see. The bridge is for crossing
the machine boundary, not a general-purpose shell.

## Prerequisites

The user must have installed the bridge on their machine and have the daemon
running. If `BRIDGE_ROOT` is unset or the daemon is not alive, say so plainly
and point them at the install rather than guessing — a silent failure here looks
identical to a hung task.

```bash
# on the user's machine, once — download, read it, then run it
curl -fsSL -o install.sh https://raw.githubusercontent.com/abhinaykrupa/cowork-to-code-bridge/main/install.sh
less install.sh          # this script sets up a daemon; read before running
bash install.sh

cowork-to-code-bridge-selfcheck   # verifies the install end-to-end
```

Recommend the download-inspect-run form above rather than piping the installer
straight into a shell. The user is about to grant a daemon standing access to
their machine; they should be able to see what the script does first.

## Core API

```python
from cowork_to_code_bridge import (
    call_remote, queue_task, poll_task_result, cancel_task,
)
```

| Function | Blocking? | Use |
|---|---|---|
| `call_remote` | yes | run and wait — sub-second fixed scripts only |
| `queue_task` | no | fire-and-forget; returns a `task_id` |
| `poll_task_result` | no (idempotent) | check a queued task |
| `cancel_task` | no (idempotent) | stop a queued or running task |

**Rule of thumb:** if the work might take longer than ~30 seconds, `queue_task`
it rather than blocking. Holding one tool invocation open while a 20-minute
build runs makes sandbox timeouts and retries much harder to reason about.

### Handing a task to a real agent on the machine

The headline script is `run_claude.sh`, which hands the task to a full Claude
Code agent on the machine rather than a fixed command — so the local end can
plan and iterate, not just execute:

```python
job = queue_task(
    "scripts/run_claude.sh",
    args=["run the test suite and fix what breaks"],
    timeout=1800,
    idempotency_key="ci-fix-2026-07-30",   # retries must not double-fire
)

result = poll_task_result(job["task_id"])   # call again later; idempotent
if result["status"] == "done":
    print(result["stdout"])
```

### Quick fixed actions

About 22 bundled scripts cover the smaller stuff without invoking an agent —
`git_status.sh`, `mac_health.sh`, `mac_disk.sh`, `port_check.sh`,
`docker_ps.sh`, `pkg_outdated.sh`. Many accept `--json`:

```python
import json
r = call_remote("scripts/mac_disk.sh", args=["/", "--json"])
print(json.loads(r["stdout"])["percent_used"])
```

## Safety — read this before running anything

This skill gives an agent execution on someone's real computer. That is the
point, and it is also the risk. The controls below are not optional decoration:

| Control | What it does |
|---|---|
| `permission_scope` | `plan` / `readonly` / `edit` / `full` — start narrow |
| `max_budget_usd` | spend ceiling, so a runaway loop cannot drain credits |
| `plan="…"` | a human approves the plan before anything executes |
| `idempotency_key` | a retry returns the cached result instead of re-running |
| script allowlist | the daemon runs only approved scripts; no arbitrary commands |

```python
queue_task(
    "scripts/run_claude.sh",
    args=["upgrade the pinned deps and run the tests"],
    permission_scope="edit",     # not "full" — no pushing
    max_budget_usd=2.00,
    timeout=1800,
    idempotency_key="dep-upgrade-2026-07-30",
)
```

**Default to the narrowest scope that can do the job.** Escalate to `full` only
when the user has asked for something that genuinely requires it (a push, a
deploy) and has said so explicitly. Prefer `plan` first for anything
destructive, and show the user the plan before you approve it.

**Never put credentials in a task payload.** The machine-side environment
already holds the user's git credentials and API keys; a payload that carries
them writes them into the shared directory, which is the trust boundary.

**Task output is not redacted.** Anything a script echoes lands in the result
file verbatim. Do not run commands that print secrets (`env`, verbose curl with
auth headers) and then surface that output.

## Failure modes

Exit codes are explicit so a failed task never looks like a successful one:

| Code | Meaning |
|---|---|
| `-2` | timed out |
| `-3` | failed to spawn |
| `-4` | daemon crashed mid-execution (never retried) |
| `-5` | cancelled |

Cancellation is a normal completion, not a special case: `cancel_task(task_id)`
stops a queued task before it runs, or sends SIGTERM to a running task's whole
process group (SIGKILL after a grace period). Either way a result is written, so
`poll_task_result` reports it like any other outcome.

`stdout`/`stderr` are capped at 64 KiB, keeping the tail. When output is
dropped, the result carries `stdout_truncated` / `stdout_total_bytes` — their
**absence** means nothing was dropped, so do not read it as "no output".

If a task appears to hang, check the daemon is alive before re-queuing.
Re-queuing without an `idempotency_key` is how state-changing work double-fires.

## Notes

- macOS (launchd), Linux (systemd, or a manual path for containers), WSL2.
- Pure Python standard library on both sides; no runtime dependencies.
- MIT licensed. Repo: https://github.com/abhinaykrupa/cowork-to-code-bridge
