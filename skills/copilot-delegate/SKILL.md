---
name: copilot-delegate
description: Delegate coding tasks to the GitHub Copilot CLI (`copilot`) only when
  the user explicitly requests it, while the orchestrator retains review and landing
  responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the `copilot` CLI installed and authenticated (`copilot login`),
  Node 18+ to run the relay (the copilot CLI itself requires Node 22+), and git. The
  orchestrator must be able to run shell commands and read files.
metadata:
  version: 0.5.0
---
# Copilot Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `copilot` implementer (`GitHub Copilot CLI`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Delegate a bounded coding task to a separate **implementer** — the
GitHub Copilot CLI — then review what it produced and land it yourself. You write the brief and own
the judgment; the implementer makes changes in its own session in a clean working tree; you verify
and commit.

The loop needs only a shell command and file access, so any comparable orchestrator can drive it.

## When NOT to use this

- The task is small enough to do inline; delegation overhead is not worth it.
- The `copilot` CLI is not installed or authenticated.
- You need a hard sandbox. Copilot exposes sandbox controls, but they are upstream-experimental
  (MXC-based, controlled via the `/sandbox` command and settings, disabled by default) — this relay
  does not configure them. `--read-only` only disables edit tools (`--mode plan`); shell commands
  still run. If project files must not change at all, dispatch against a clean or isolated worktree.

## Prerequisites (check once)

1. Install `copilot` (`npm install -g @github/copilot`; the CLI requires Node 22+, the relay
   itself runs on Node 18+ — the relay probes `copilot version`).
2. Authenticate: run `copilot login` (interactive web/device flow), or set
   `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN` in the environment.
3. Confirm `copilot version` succeeds.
4. Work in, or point `--cd` at, the target git repository.

## Choose the model (optional)

Copilot picks a default model (`auto`). To choose another, pass `--model <name>`.
The relay accepts letters, digits, and `. _ : / -` only (the value reaches a shell on Windows).

## Choose the effort (optional)

Copilot supports a reasoning effort dial: `--effort <level>` with values
`low`, `medium`, `high`, `xhigh`, or `max`. The relay rejects any other value
before dispatch.

## The loop

Run these five steps per task. Steps 1, 4, and 5 require judgment; 2 and 3 are mechanical.

### 1. Write a brief

Copilot sees only the text you send. It cannot read your conversation: the brief must stand alone
with the goal, current state, what to change, what to leave untouched, the project's **real**
gates, and a report contract. Keep each brief to a single task. Write it to a file and pass it as
the relay's `--brief`. See [references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Use the bundled relay. It runs `copilot -p` with `--output-format json --no-color --stream off`,
captures the JSONL event stream, and writes `result.json`.

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# choose a model:                    add --model <name>
# set reasoning effort:              add --effort <level>
# read-only planning pass:           add --read-only  (forces --mode plan)
# full tool autonomy:                add --allow-all-tools
# hard time limit (watchdog):        add --timeout 2h   (the 30m default suits brief runs)
# resume a session:                  add --session <id>  or  --resume-last
# see all options:                   node .../relay.mjs --help
```

The child's cwd pins the workspace. The relay writes artifacts under the system temp dir by
default and never commits. See [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The relay blocks until copilot finishes. Run it with the orchestrator's background-command
facility, or background it in the shell and poll for `result.json`. A pre-run usage error exits 2
and writes no result; a missing `copilot` exits 127 and writes `status: "copilot_unavailable"`.

Completion means the process exited and `result.json` exists — trust process state and the
working tree, not the progress display. Copilot's final assistant message is the `finalMessage`
field of `result.json`.

### 4. Review — do not trust the self-report

- Re-run the project's gates yourself.
- Read the diff against the brief, starting with `touchedFiles`.
- Run relevant guard skills if installed.

See [references/review-and-land.md](references/review-and-land.md).

### 5. Land it

If the work is good, commit it. The relay never commits — the diff and `result.json` are the
record; run `git status` and `git diff` first to confirm exactly what changed. If the group has a
PR flow, make the commit and push a branch; let human review happen. If the diff is wrong or
incomplete, re-dispatch a corrected brief in a fresh run and review again.

## Autonomy and permissions

Without `--allow-all-tools`, copilot auto-denies tool calls in headless mode: the process exits 0
but the relay detects the denial events and reports `status: "failed"` with the CLI's own error
message and a hint to pass `--allow-all-tools`. This is the honest default — the orchestrator sees
the failure rather than a silent no-op.

`--allow-all-tools` explicitly grants full tool autonomy and requires explicit human authorization
for that run. A request to delegate to Copilot is not by itself consent to unrestricted tools.
`--read-only` selects `--mode plan`,
which disables edit tools so project files can't be changed by direct edits; it works without
`--allow-all-tools`. Shell commands still run in plan mode, so it guards against edits, not
against everything. The two flags are mutually exclusive.

Copilot also exposes sandbox controls, but they are upstream-experimental (MXC-based, controlled
via the `/sandbox` command and settings, disabled by default). This relay does not configure them.

## Authorization model

Delegation is something the human opts into. Once briefed, copilot works as a tool you approved use
of. The boundary is: **do not accept conclusions from the self-report**; verify everything on
disk. For anything touching credentials, production data, or irreversible operations, stop and ask
the human first instead of encoding it in a brief.

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) — structure, scope, gates,
  brief delivery.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) — flags, artifacts,
  `result.json`, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) — what to verify before calling
  the diff done, at the end of a run.
- [references/multi-task-queues.md](references/multi-task-queues.md) — sequential queues,
  constraint carry-forward, progress tracking, and the final coherence pass.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `copilot` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
