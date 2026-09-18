---
name: vibe-delegate
description: Delegate coding tasks to the Mistral Vibe CLI (`vibe`) only when the
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
# Vibe Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `vibe` implementer (`Mistral Vibe`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Hand a bounded coding task to a separate **implementer** — the Mistral
Vibe CLI (`vibe`) — then review what it produced and land it yourself. You write the brief and own
the judgment; Vibe does the typing in its own session; you verify and commit.

The loop needs only a shell command and file access, so any comparable orchestrator can drive it.

## When NOT to use this

- The task is small enough to do inline; delegation overhead is not worth it.
- The `vibe` CLI is not installed or authenticated.

## Prerequisites (check once)

1. Install [`uv`](https://docs.astral.sh/uv/getting-started/installation/), then Mistral Vibe:
   - `uv tool install mistral-vibe`
2. Configure your API key with `vibe --setup`, or set `MISTRAL_API_KEY` in the environment.
3. Confirm `vibe --version` succeeds.
4. Work in, or point `--cd` at, the target git repository.

## The loop

Run these five steps per task. Steps 1, 4, and 5 require judgment; 2 and 3 are mechanical.

### 1. Write the brief

Vibe sees only the text you send plus what it can inspect in the workspace — no chat history or shared
context. Include the goal, current state, what to change, what to leave untouched, the project's
**actual** gates, and a report contract. Tell Vibe not to commit. Keep one task per brief. See
[references/writing-the-brief.md](references/writing-the-brief.md).

Default mode cannot approve most shell commands headlessly, so the orchestrator runs the gates. Ask
Vibe to run them only when the human explicitly authorized `--full-access`.

### 2. Dispatch

Use the bundled helper. It wraps Vibe's headless `--prompt` mode, captures the structured event
stream, and writes `result.json`. (`<skill-dir>` is the installed folder containing this `SKILL.md`.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# limit turns for cost control:           add --max-turns <n>
# indicative price threshold/token cap:  add --max-price <usd> --max-tokens <n>
# planning/read-only:                     add --plan-only
# unrestricted shell and tools:           add --full-access (explicit authorization required)
# resume the most recent session:         add --resume-last  (delta brief only)
# resume a specific session:              add --session <id> (delta brief only)
# see all options:                        node .../relay.mjs --help
```

The child process's cwd pins the workspace. The relay writes artifacts under the system temp dir by
default and never commits. See [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The helper blocks until Vibe finishes. Run it with the orchestrator's background-command facility, or
background it in the shell and poll for `result.json`. A pre-run usage error exits 2 and writes no
result; a missing `vibe` exits 127 and writes `status: "vibe_unavailable"`.
The watchdog writes `status: "timeout"`; terminating the relay on POSIX writes `status: "aborted"`
after stopping Vibe's process tree.

Trust process state and the working tree over a progress display. Completion means the process exited
and `result.json` exists.

### 4. Review — do not trust the self-report

Treat Vibe's final message and gate claims as claims:

- Re-run the project's gates yourself.
- Read the diff against the brief, starting with `touchedFiles`.
- Run relevant guard skills if installed.
- Round-trip migrations and grep for dangling references after removals or renames.

See [references/review-and-land.md](references/review-and-land.md).

### 5. Land it

The implementer edits the working tree; **the orchestrator commits.** Commit only after the gates pass
and the diff holds. If rework is needed, send a delta brief with `--resume-last` or `--session <id>`,
then review again.

## Autonomy and permissions

In `--prompt` mode the relay always sets the agent profile explicitly:

| Relay flag | What Vibe gets | Use when |
| --- | --- | --- |
| *(default)* | `--agent accept-edits` | Normal implementation — built-in file edits are approved |
| `--plan-only` | `--agent plan` | Read-only review, exploration, or planning |
| `--full-access` | `--agent auto-approve` | Explicitly authorized runs that need arbitrary shell/tools |

Default mode lets Vibe edit files inside the target worktree. Approval-gated shell commands,
including most project gates, are denied headlessly; the orchestrator runs the gates.
`--full-access` disables Vibe's tool approvals and permits arbitrary shell/tool execution under the
user account; use it only with explicit human authorization. Always inspect `touchedFiles` and the
diff after a run.

`--trust` is always passed to prevent interactive directory-trust prompts in headless runs. It is
not a sandbox and does not grant tool permissions.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"), committing
verified, gate-passing work is the agreed contract. Two limits remain: **surface, don't absorb**
(report Vibe's design decisions, defensible-but-unasked turns, and non-blocking nitpicks) and **stop
for scope changes** (if correct completion needs going beyond the brief, ask instead of expanding the
mandate). See [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) — structure, report contract,
  real gates, argv delivery, and delta briefs.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) — flags, artifacts,
  `result.json`, polling, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) — review checklist, commit boundary,
  and rework through Vibe sessions.
- [references/multi-task-queues.md](references/multi-task-queues.md) — sequential queues, constraint
  carry-forward, progress tracking, and the final coherence pass.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `vibe` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
