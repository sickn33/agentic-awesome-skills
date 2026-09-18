---
name: cursor-delegate
description: Delegate coding tasks to the Cursor Agent CLI (`cursor-agent`) only when
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
compatibility: Requires the `cursor-agent` CLI installed and authenticated, Node 18+,
  and git. The optional `--add-dir` flag requires cursor-agent 2026.07.23 or newer.
  The orchestrating agent must be able to run shell commands and read files. Shell
  examples assume bash/zsh (macOS/Linux, or Git Bash/WSL on Windows).
metadata:
  version: 0.5.0
---
# Cursor Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `cursor` implementer (`Cursor Agent`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Hand a bounded coding task to a separate **implementer** — the Cursor
Agent CLI — then review what it produced and land it yourself. You write the brief and own the
judgment; Cursor does the typing in its own session; you verify and commit.

The loop needs only a shell command and file access, so any comparable orchestrator can drive it.

## When NOT to use this

- The task is small enough to do inline; delegation overhead is not worth it.
- The `cursor-agent` CLI is not installed or authenticated (run `cursor-agent login`).
- You want to write the code yourself, or you only need Cursor's opinion on code you wrote (a
  `--read-only` dispatch covers that — see below — but a plain review may not need delegation at all).

## Prerequisites (check once)

1. `cursor-agent --version` succeeds. If not, follow the installer for your platform at
   [cursor.com/cli](https://cursor.com/cli), inspect what it will run, and authenticate with
   `cursor-agent login`.
2. `cursor-agent status` shows you logged in.
3. You are in (or will point `--cd` at) the target git repository. The relay passes `--trust`, so
   point it only at repositories you trust.

## Choose the model

Omitting `--model` uses your Cursor default (usually `auto` — Cursor picks). To pin one, pass
`--model <name>` with a name from the account's live `cursor-agent models` output — select from that
list rather than inventing a name. Parameterized forms like `<name>[context=1m,effort=high]` are
forwarded as-is. The model that actually served the run is recorded as `resolvedModel` in
`result.json`.

## The loop

Run these five steps per task. Steps 1, 4, and 5 require judgment; 2 and 3 are mechanical.

### 1. Write the brief

Cursor sees only the text you send plus what it can inspect in the workspace — no chat history or
shared context. Include the goal, current state, what to change, what to leave untouched, the
project's **actual** gates, and a report contract. Tell Cursor not to commit. Keep one task per
brief. See [references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Use the bundled helper. It wraps `cursor-agent -p`, feeds the brief on stdin, captures the
structured event stream, and writes `result.json`. (`<skill-dir>` is the installed folder containing
this `SKILL.md`.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# read-only (plan mode — review/diagnosis, no edits):  add --read-only
# write-capable without automatic command approval:   add --no-force
# explicitly override Cursor's sandbox for this run:  add --sandbox enabled|disabled
# pin a model from `cursor-agent models`:              add --model <name>
# resume the most recent session:                      add --resume-last  (delta brief only)
# resume a specific session:                           add --session <id> (delta brief only)
# hard time limit (watchdog):                          add --timeout 2h  (the 30m default suits short runs; implementation briefs routinely need 1-2h)
# see all options:                                     node .../relay.mjs --help
```

The child process's cwd pins the workspace. On Cursor `2026.07.23` or newer, use repeatable
`--add-dir` flags only for extra workspace directories. The relay writes artifacts under the system
temp dir by default and never commits. See
[references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The helper blocks until Cursor finishes. Run it with the orchestrator's background-command facility,
or background it in the shell and poll for `result.json`. A pre-run usage error exits 2 and writes no
result; a missing `cursor-agent` exits 127 and writes `status: "cursor_agent_unavailable"`.

Trust process state and the working tree over a progress display. Completion means the process exited
and `result.json` exists. Cursor's full report is the `finalMessage` field in `result.json` (also
printed in full on stdout between the report markers).

**Windows + hooks caveat:** if the user has Cursor hooks configured (`~/.cursor/hooks.json`, or
Claude Code `PreToolUse` hooks, which cursor-agent imports), dispatching from a Git Bash (MSYS)
console makes cursor-agent feed PowerShell-syntax hook wrappers to bash, so every command Cursor
tries to run is blocked — edits still land, gates do not run. Dispatch from a PowerShell or cmd
console instead. Details: [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 4. Review — do not trust the self-report

Treat Cursor's final message and gate claims as claims:

- Re-run the project's gates yourself.
- Read the diff against the brief, starting with `touchedFiles`.
- Run relevant guard skills if installed.
- Round-trip migrations and grep for dangling references after removals or renames.

See [references/review-and-land.md](references/review-and-land.md).

### 5. Land it

The implementer edits the working tree; **the orchestrator commits.** Commit only after the gates
pass and the diff holds. If rework is needed, send a delta brief with `--resume-last` or
`--session <id>`, then review again.

## Autonomy and permissions

A fresh run defaults to **write-capable with `--force`**: Cursor runs commands without approval
unless your Cursor config explicitly denies them, so ordinary gates (tests, linters, builds) run
headlessly. `--no-force` keeps the run write-capable but withholds automatic command approval;
commands that require approval are refused because a headless run cannot prompt. `--read-only`
switches to Cursor's **plan mode** (read-only analysis, no edits, no `--force`). The relay always
passes `--trust` to keep headless runs from stalling on the workspace-trust prompt, which is why
`--cd` must only ever point at repositories you trust. Pass `--sandbox enabled` or `--sandbox
disabled` only when you need to override Cursor's sandbox for that dispatch. The requested value is
recorded as `sandbox` in `result.json`; it does not claim what Cursor actually applied. The permission
mode Cursor reports is recorded as `permissionMode`; inspect `touchedFiles` and the diff after every
run.

## Read-only second opinions

`--read-only` doubles as a clean way to get an adversarial second opinion with no write risk:
dispatch a brief that lists the agreed points, then each contested point with both positions, and ask
Cursor to defend or concede each — deliverable in its final message, touching no files.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"), committing
verified, gate-passing work is the agreed contract. Two limits remain: **surface, don't absorb**
(report Cursor's design decisions, defensible-but-unasked turns, and non-blocking nitpicks) and
**stop for scope changes** (if correct completion needs going beyond the brief, ask instead of
expanding the mandate). See [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) — structure, report contract,
  real gates, and delta briefs.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) — flags, artifacts,
  `result.json`, polling, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) — review checklist, commit boundary,
  and rework through Cursor sessions.
- [references/multi-task-queues.md](references/multi-task-queues.md) — sequential queues, constraint
  carry-forward, progress tracking, and the final coherence pass.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `cursor` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
