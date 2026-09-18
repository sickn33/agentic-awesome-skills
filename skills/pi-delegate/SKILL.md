---
name: pi-delegate
description: Delegate coding tasks to the Pi coding agent CLI (`pi`) only when the
  user explicitly requests it, while the orchestrator retains review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
metadata:
  version: 0.5.0
---
# Pi Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `pi` implementer (`Pi`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Delegate a bounded coding task to a separate **implementer** - the Pi
coding agent CLI - then review what it produced and land it yourself. You write the brief and own
the judgment; the implementer makes changes in its own session; you verify and commit.

The loop needs only a shell command and file access, so any comparable orchestrator can drive it.

## When NOT to use this

- The task is small enough to do inline; delegation overhead is not worth it.
- The `pi` CLI is not installed or authenticated.
- You need a sandboxed implementer. Pi has no sandbox and no permission modes; `--read-only`
  restricts the tool surface, but a write-capable run executes without prompts.

## Prerequisites (check once)

1. Install pi with `npm install -g @earendil-works/pi-coding-agent`.
2. Authenticate: `/login` inside pi for a subscription provider, or an API-key environment
   variable / `pi`'s auth file for an API-key provider.
3. Confirm `pi --version` succeeds.
4. Work in, or point `--cd` at, the target git repository.

## Choose the model (optional)

Omit `--model` to use pi's configured default. To pick another, choose from `pi --list-models`
and pass an explicit id or pattern like `<provider>/<model-id>` or `sonnet:high`. The relay
accepts letters, digits, and `. _ : / -` only (the value reaches a shell on Windows), so glob
patterns with `*` are not forwarded.

## The loop

Run these five steps per task. Steps 1, 4, and 5 require judgment; 2 and 3 are mechanical.

### 1. Write the brief

Pi sees only the text you send plus what it can inspect in the workspace - no chat history or
shared context. Include the goal, current state, what to change, what to leave untouched, the
project's **actual** gates, and a report contract. Tell pi not to commit. Keep one task per brief.
Pi auto-loads `AGENTS.md`/`CLAUDE.md` context files from the workspace and its parents, so repo
instructions reach it without inlining. See
[references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Use the bundled relay. It pipes the brief to `pi --mode json` on stdin, captures the JSON event
stream, and writes `result.json`. (`<skill-dir>` is the installed folder containing this
`SKILL.md`.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# choose a model:                          add --model <id from pi --list-models>
# choose a provider:                       add --provider <name>
# read-only run (review/diagnosis):        add --read-only
# trust project .pi resources:             add --approve
# resume the most recent session:          add --resume-last  (delta brief only)
# resume a specific session:               add --session <id> (delta brief only)
# hard time limit (watchdog):              add --timeout 2h  (the 30m default suits short runs; implementation briefs routinely need 1-2h)
# see all options:                         node .../relay.mjs --help
```

The child process's cwd pins the workspace. The relay writes artifacts under the system temp dir
by default and never commits. See [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The relay blocks until pi finishes. Run it with the orchestrator's background-command facility,
or background it in the shell and poll for `result.json`. A pre-run usage error exits 2 and writes
no result; a missing `pi` exits 127 and writes `status: "pi_unavailable"`.

Trust process state and the working tree over a progress display. Completion means the process
exited and `result.json` exists. Pi's full report is the `finalMessage` field in `result.json`
(also printed in full on stdout between the report markers).

### 4. Review - do not trust the self-report

Treat pi's final message and gate claims as claims:

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

Pi has **no sandbox and no permission modes**. A default headless run reads, writes, edits, and
executes shell commands with no prompts - the controls are:

1. `--read-only` restricts pi's callable tools to `--tools read,grep,find,ls` across built-in,
   extension, and custom tools. Installed extension code still runs with the user's host permissions.
2. The relay passes `--no-approve` by default, so project `.pi` settings, extensions, and skills
   stay untrusted. `--approve` is the explicit opt-in for a repository the user trusts.
3. `touchedFiles` and the diff are the record of what changed. Inspect them after every run.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"),
committing verified, gate-passing work is the agreed contract. Two limits remain: **surface, don't
absorb** (report pi's design decisions, defensible-but-unasked turns, and non-blocking nitpicks)
and **stop for scope changes** (if correct completion needs going beyond the brief, ask instead of
expanding the mandate). See [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) - structure, report contract,
  real gates, stdin delivery, and delta briefs.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) - flags, artifacts,
  `result.json`, polling, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) - review checklist, commit
  boundary, and rework through pi sessions.
- [references/multi-task-queues.md](references/multi-task-queues.md) - sequential queues,
  constraint carry-forward, progress tracking, and the final coherence pass.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `pi` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
