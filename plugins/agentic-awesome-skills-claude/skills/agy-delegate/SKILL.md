---
name: agy-delegate
description: Delegate coding tasks to the Google Antigravity CLI (`agy`) only when
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
compatibility: Requires the `agy` CLI installed and authenticated, Node.js, and git.
  The orchestrator must be able to run shell commands and read files. Shell examples
  assume bash/zsh (macOS/Linux, or Git Bash/WSL on Windows).
metadata:
  version: 0.5.0
---
# Antigravity Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `agy` implementer (`Google Antigravity`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. This skill lets you hand a bounded coding task to a separate
**implementer** - the Google Antigravity CLI (`agy`) - then review what it produced and land it
yourself. You write the brief and own the judgment; Antigravity does the typing in its own
conversation; you verify and commit.

Nothing here is specific to one orchestrating agent. The loop needs only the ability to run a shell
command and read a file, so any comparable agent can drive it. It is designed for and run on Claude
Code; treat other orchestrators as designed-for, not yet proven.

## When NOT to use this

- The task is small enough to just do inline - delegation overhead is not worth it.
- The `agy` CLI is not installed or not authenticated. Install it from Antigravity's CLI docs and run
  the first-launch setup.
- You want to write the code yourself, or you only need Antigravity's opinion on code you wrote (a
  `--read-only` dispatch covers review without edits, but a plain review may not need delegation at all).

## Prerequisites (check once)

1. `agy help` succeeds. If not, install the Antigravity CLI and complete first-launch setup.
2. `agy models` succeeds. That proves the CLI can authenticate and list the available model labels.
3. You are in (or will point `--cd` at) the target git repository.

These checks do not prove that a headless write will be approved. In `--print` mode, Antigravity
cannot prompt for a write permission and may auto-deny it. The relay detects that denial instead of
reporting completion.

## Choose the implementer model

`agy` has a configured default model, so `--model` is optional. Use it when the human has a preferred
Antigravity model label for the task. Otherwise let Antigravity use its own current default rather than
guessing.

## The loop

Run these five steps per task. Steps 1, 4, and 5 are your judgment; 2 and 3 are mechanical.

### 1. Write the brief

Antigravity sees only the text you send plus what it can inspect in the workspace - no chat history, no
shared context. Everything the task needs goes in the brief: the goal, the current state, what to
change, what to leave untouched, the project's **actual** gate commands, and a report contract. Tell
Antigravity it will **not** commit (you will). Keep one task per brief. Full guidance and a template:
[references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Send the brief to Antigravity with the bundled helper. It wraps `agy --print`, captures the run, and
writes a structured `result.json` - so your only job is "run a command, read a file." (`<skill-dir>`
below is this skill's installed directory - the folder containing this `SKILL.md`.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# choose a model label:                 add --model "<label from agy models>"
# reasoning effort (low, medium, high): add --effort high
# read-only (plan mode — no edits):     add --read-only
# enable Antigravity terminal sandbox:  add --sandbox
# resume the most recent conversation:  add --resume-last  (delta brief only)
# see all options:                      node .../relay.mjs --help
```

The helper starts a fresh Antigravity project by default and passes `--add-dir <repo>` (the `--cd`
path, absolute) so `agy` has an explicit workspace. It does **not** pass `--dangerously-skip-permissions` by default.
Mechanics, flags, and the `result.json` shape: [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The helper blocks until Antigravity finishes, so back it with whatever your orchestrator offers and
resume when it returns:

- **Claude Code:** run the Bash call with `run_in_background: true`; you are notified on completion.
- **Plain shell / other agents:** run it in the foreground for short tasks, or background it and poll
  the result file.

Do not trust progress trackers over reality: a run is finished when `result.json` is written and the
process has exited. Read the working tree, not a status line. The implementer's full report is
the `finalMessage` field in `result.json` (also printed in full on stdout between the report markers).

### 4. Review - do not trust the self-report

Antigravity's `result.json` includes its own final message and any gate claims. **Re-verify, don't
accept:**

- **Re-run the project's gates yourself** (the test/lint/build commands from step 1).
- **Read the diff** against the brief: did Antigravity do what was asked, nothing more and nothing less?
  `touchedFiles` in the result is your starting point.
- **Run the relevant guard skills** on the diff if you have them installed.
- For schema/migration changes, round-trip them; for removals, grep for dangling references.

Full checklist: [references/review-and-land.md](references/review-and-land.md).

### 5. Land it

The implementer edits the working tree; **the orchestrator commits.** Only after the gates pass and the
diff holds:

- Commit the verified work yourself, with a clear message.
- If it needs changes, send a delta brief with `--resume-last` and review again.

## Permission model

Antigravity owns its own permission policy. The relay does not bypass it by default. Use
`--dangerously-skip-permissions` only when the human explicitly accepts that Antigravity may
auto-approve tool permission requests. `--read-only` runs `agy` in plan mode (`--mode plan`),
removing write and edit paths, and is mutually exclusive with `--dangerously-skip-permissions`.
Use `--sandbox` when you want Antigravity's terminal sandbox enabled for the run.
Antigravity's own help says `--dangerously-skip-permissions` auto-approves all tool permission
requests without prompting, including a request to act outside the sandbox. Do not treat
`--sandbox` as an enforced boundary when the flags are combined; treat the run as full access.
If headless `--print` auto-denies a write, the relay reports `status: "failed"` and exits non-zero.
The relay fingerprints the working tree before and after a `--read-only` run to report
`readOnlyViolation` in `result.json`. Settings allow-rules are not documented here as a fix
because they have not been demonstrated to apply to this headless path. Do not add the bypass
flag without explicit human approval.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"), committing
verified, gate-passing work is the agreed contract. Two limits on that mandate: **surface, don't
absorb** (report Antigravity's design decisions, defensible-but-unasked turns, and non-blocking
nitpicks rather than silently keeping them) and **stop for scope changes** (if correct completion needs
going beyond the brief, ask - don't expand the mandate yourself). The full treatment is in
[references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) - how to write a brief Antigravity
  can execute blind: structure, XML blocks, the report contract, and real gate commands.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) - `relay.mjs` flags, the
  `result.json` contract, backgrounding per orchestrator, and recovery when a run misbehaves.
- [references/review-and-land.md](references/review-and-land.md) - the review checklist, the commit
  boundary, and the rework cycle via `--resume-last`.
- [references/multi-task-queues.md](references/multi-task-queues.md) - running a sequential queue:
  carrying constraints forward, progress tracking, and the end-of-run coherence check.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `agy` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
