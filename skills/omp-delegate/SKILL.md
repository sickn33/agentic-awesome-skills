---
name: omp-delegate
description: Delegate coding tasks to Oh My Pi (`omp`) only when the user explicitly
  requests it, while the orchestrator retains review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the `omp` CLI installed and authenticated (`/login` inside
  omp, or a provider API-key environment variable), Node 18+, and git. The orchestrating
  agent must be able to run shell commands and read files. Shell examples assume bash/zsh
  (macOS/Linux, or Git Bash/WSL on Windows).
metadata:
  version: 0.5.0
---
# Oh My Pi Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `omp` implementer (`Oh My Pi`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Delegate a bounded coding task to a separate **implementer** - Oh My
Pi (`omp`) - then review what it produced and land it yourself. You write the brief and own the
judgment; the implementer makes changes in its own session; you verify and commit.

The loop needs only a shell command and file access, so any comparable orchestrator can drive it.

## The binary is `omp`, not `pi`

Oh My Pi is a fork of Pi. This skill drives **`omp`** (`@oh-my-pi/pi-coding-agent`). The original
Pi CLI is a different binary (`pi`) with a different skill (`pi-delegate`). If `omp` is missing but
`pi` is installed, you have Pi, not Oh My Pi.

## When NOT to use this

- The task is small enough to do inline; delegation overhead is not worth it.
- The `omp` CLI is not installed or authenticated.
- The user asked for the original Pi CLI (`pi`) — use `pi-delegate`.
- You need a sandboxed implementer. Oh My Pi has no sandbox. `--read-only` restricts the tool
  surface; a write-capable run executes without prompts (`--yolo`).

## Prerequisites (check once)

1. Install omp with `bun install -g @oh-my-pi/pi-coding-agent` (or the install path from
   https://omp.sh).
2. Authenticate: `/login` inside omp for a subscription provider, or an API-key environment
   variable for an API-key provider. Credentials live under `~/.omp/`.
3. Confirm `omp --version` succeeds.
4. Work in, or point `--cd` at, the target git repository.

## Choose the model (optional)

Omit `--model` (and `--provider`) to use omp's configured default for this project / profile. The
catalog is **this install's** authenticated providers — not a fixed list in this skill.

To pick another model:

1. **List what this install can actually run.** Do **not** pass `omp --list-models` — that flag is
   gone and omp treats it as an unknown flag (exit 2). Use the `models` subcommand:
   - `omp models` — every available model, grouped by provider
   - `omp models --json` — the same catalog, machine-readable
   - `omp models find <substring>` — filter by provider, id, or name (example:
     `omp models find sonnet`)
   - `omp models <provider>` — one provider's models
2. **Pass that id to the relay.** `--model <pattern>` is omp's own `--model`: a fuzzy match against
   the catalog (provider/id, a bare id, or a unique substring). `--provider <name>` pins the
   provider when the pattern is ambiguous.
3. The relay forwards only letters, digits, and `. _ : / -`. Glob patterns with `*` are rejected.

`--thinking <level>` is a separate reasoning dial, not a model id. Allowed values: `off`, `auto`,
`minimal`, `low`, `medium`, `high`, `xhigh`, `max`. The relay rejects anything else (including
`inherit`) before dispatch — omp would otherwise warn and ignore a bad value.

A fleet lane (`--lane`) can set `provider`, `model`, and `effort`. Lane `effort` becomes
`--thinking`; an explicit `--thinking` / `--model` / `--provider` flag wins over the lane.

The relay does not forward `--api-key`, `--smol`, `--slow`, or `--plan`. Those stay omp's own CLI.

## The loop

Run these five steps per task. Steps 1, 4, and 5 require judgment; 2 and 3 are mechanical.

### 1. Write the brief

Oh My Pi sees only the text you send plus what it can inspect in the workspace - no chat history or
shared context. Include the goal, current state, what to change, what to leave untouched, the
project's **actual** gates, and a report contract. Tell omp not to commit. Keep one task per brief.
omp auto-loads `AGENTS.md`/`CLAUDE.md` context files from the workspace and its parents, so repo
instructions reach it without inlining. See
[references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Use the bundled relay. It pipes the brief to `omp --mode json` on stdin, captures the JSON event
stream, and writes `result.json`. (`<skill-dir>` is the installed folder containing this
`SKILL.md`.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# list models first:                       omp models   (or: omp models --json)
# choose a model:                          add --model <id from omp models>
# choose a provider:                       add --provider <name>
# set thinking level:                      add --thinking high
# read-only run (review/diagnosis):        add --read-only
# trust project .omp resources:            add --approve
# resume the most recent session:          add --resume-last  (delta brief only)
# resume a specific session:               add --session <id> (delta brief only)
# hard time limit (watchdog):              add --timeout 2h  (the 30m default suits short runs; implementation briefs routinely need 1-2h)
# see all options:                         node .../relay.mjs --help
```

The child process's cwd pins the workspace. The relay writes artifacts under the system temp dir
by default and never commits. See [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The relay blocks until omp finishes. Run it with the orchestrator's background-command facility,
or background it in the shell and poll for `result.json`. A pre-run usage error exits 2 and writes
no result; a missing `omp` exits 127 and writes `status: "omp_unavailable"`.

Trust process state and the working tree over a progress display. Completion means the process
exited and `result.json` exists. omp's full report is the `finalMessage` field in `result.json`
(also printed in full on stdout between the report markers).

### 4. Review - do not trust the self-report

Treat omp's final message and gate claims as claims:

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

Oh My Pi has **no sandbox**. Print mode has no approval UI, so a write-capable relay run always
passes `--yolo` (`tools.approvalMode: yolo`) — otherwise a user's `always-ask` or `write` config
would stall until the watchdog. The other controls are:

1. `--read-only` restricts omp's callable tools to `--tools read,grep,glob`. It does not pass
   `--yolo`. Installed extension code still runs with the user's host permissions if project
   resources are trusted.
2. The relay passes `--no-extensions --no-skills --no-rules` by default, so project `.omp`
   extensions, skills, and rules stay undiscovered. `--approve` is the explicit opt-in for a
   repository the user trusts.
3. `touchedFiles` and the diff are the record of what changed. Inspect them after every run.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"),
committing verified, gate-passing work is the agreed contract. Two limits remain: **surface, don't
absorb** (report omp's design decisions, defensible-but-unasked turns, and non-blocking nitpicks)
and **stop for scope changes** (if correct completion needs going beyond the brief, ask instead of
expanding the mandate). See [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) - structure, report contract,
  real gates, stdin delivery, model listing, and delta briefs.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) - flags, artifacts,
  `result.json`, polling, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) - review checklist, commit
  boundary, and rework through omp sessions.
- [references/multi-task-queues.md](references/multi-task-queues.md) - sequential queues,
  constraint carry-forward, progress tracking, and the final coherence pass.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `omp` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
