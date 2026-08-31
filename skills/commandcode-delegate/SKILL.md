---
name: commandcode-delegate
description: Delegate coding tasks to the Command Code CLI (`cmd`) only when the user
  explicitly requests it, while the orchestrator retains review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the Command Code CLI (`cmd`, or `cmdc` on Windows, from commandcode.ai)
  installed and authenticated, Node 22+, and git. The orchestrating agent must be
  able to run shell commands and read files. Shell examples assume bash/zsh (macOS/Linux).
metadata:
  version: 0.5.0
---
# Command Code Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `commandcode` implementer (`Command Code`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. This skill lets you hand a bounded coding task to a separate
**implementer** — the Command Code CLI (`cmd`) — then review what it produced and land it yourself.
You write the brief and own the judgment; Command Code does the typing in your working tree; you
verify and commit.

Nothing here is specific to one orchestrating agent. The loop needs only the ability to run a shell
command and read a file, so it works the same whether you are Claude Code, OpenCode with a selected
model, or any comparable agent. (It is designed for and run on Claude Code; treat other orchestrators
as designed-for, not yet proven.)

## When NOT to use this

- The task is small enough to just do inline — delegation overhead is not worth it.
- The `cmd` CLI is not installed or not authenticated (run `cmd login`).
- You want to write the code yourself, or you only need a review (Command Code has its own `/review`).
- You are on native Windows and `cmdc --version` does not work. Upstream recommends WSL for stable Windows use.

## Read this before the first dispatch: the autonomy model

Command Code's headless mode has **exactly two states, with nothing in between**:

- **Default (`-p` with no `--yolo`):** read, grep, and glob work. Every write, edit, and shell call is
  refused by the CLI's permission layer, and headless mode has no prompt to grant them mid-run. This
  is the relay's `--read-only`.
- **`--yolo` (alias `--dangerously-skip-permissions`):** every tool is allowed, anywhere the process
  can reach. There is no filesystem sandbox and no path restriction. This is what an implementation
  run needs, so the relay passes it by default.

`--permission-mode auto-accept` and `--tools-all` do **not** lift the headless write gate. Direct CLI
probes refused write, edit, and shell with both. So an implementation run
through Command Code is a full-trust run: scope it with a tight brief and a clean working tree, not
with a sandbox. The brief is guidance, and a git worktree isolates a checkout without containing the
process. If writes outside the target tree are unacceptable, use an OS-enforced sandbox such as
`codex-delegate` or run this one inside a container.

Before the first write-capable run, explain this unsandboxed full-trust mode and obtain explicit
human acceptance. A request to delegate to Command Code is not by itself consent to host-wide access.

## Prerequisites (check once)

1. `cmd --version` succeeds and `cmd status` reports authenticated. If not, install Command Code and
   run `cmd login`.
2. **Confirm the CLI on PATH.** On macOS/Linux, `command -v cmd` shows the active `cmd`. On native
   Windows, use `cmdc --version`; `cmd` is the system shell. The relay uses `cmdc` there and launches
   its npm `.cmd` shim through `cmd.exe`. `COMMANDCODE_BIN` remains an absolute-path override and must
   never point to the system command interpreter. The relay records the version it ran in
   `result.json`, so a wrong binary is visible after the fact.
3. You are in (or will point `--cd` at) the target git repository, and its tree is clean before you
   dispatch — a full-trust run is much easier to review against a clean baseline.

## The loop

Run these five steps per task. Steps 1, 4, and 5 are your judgment; 2 and 3 are mechanical.

### 1. Write the brief

Command Code sees **only** the text you send — no repo memory, no chat history, no shared context
(beyond the repo's own `AGENTS.md`, which it reads automatically). Everything the task needs goes in
the brief: the goal, the current state, what to change, what to leave untouched, the project's
**actual** gate commands (discover them from the repo's AGENTS.md/CLAUDE.md/Makefile — do not assume),
and a report contract. Tell it that it will **not** commit (you will). Keep one task per brief. Full
guidance and a template: [references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Send the brief to Command Code with the bundled helper. It wraps `cmd -p`, captures the run, and
writes a structured `result.json` — so your only job is "run a command, read a file." (`<skill-dir>`
below is this skill's installed directory — the folder containing this `SKILL.md`, i.e. the directory
you loaded the skill from. Claude Code prints it as "Base directory for this skill" when the skill
loads; on other orchestrators use that same directory — if unsure where it landed, run
`find ~ -name relay.mjs -path '*commandcode-delegate*'` and substitute the directory above it.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# read-only (review/diagnosis, no edits):   add --read-only
# continue the exact session:               add --session <sessionId>  (from result.json; send only the delta brief)
# fallback when no session id is available: add --continue-last
# hard time limit (watchdog):               add --timeout 2h  (default: off; implementation runs routinely need 1-2h)
# see all options:                          node .../relay.mjs --help
```

The helper defaults to a write-capable (`--yolo`) run, which intentionally edits the target repository.
Its temp directory keeps only relay artifacts out of that repository. The relay **never commits** —
see step 5. Mechanics, flags, and the
`result.json` shape: [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The helper blocks until Command Code finishes, so back it with whatever your orchestrator offers and
resume when it returns:

- **Claude Code:** run the Bash call with `run_in_background: true`; you are notified on completion.
- **Plain shell / other agents:** run it in the foreground for short tasks, or background it and poll
  the result file — `… &` in bash/zsh, or your shell's equivalent. The run is done when `result.json`
  exists with a `status`. (A pre-run usage error — bad args or an empty brief — instead exits with code
  2 and a stderr message and writes no result file, so check the exit code too. A missing `cmd` binary
  exits 127 but *does* write a `result.json` with status `commandcode_unavailable`.)

Do not trust progress trackers over reality: a run is finished when `result.json` is written and the
process has exited. Read the working tree, not a status line. The implementer's full report is the
`finalMessage` field in `result.json` (also printed in full on stdout between the report markers).

### 4. Review — do not trust the self-report

`result.json` includes Command Code's own summary and gate claims. **Re-verify, don't accept:**

- **Re-run the project's gates yourself** (the test/lint/build commands from step 1). Never take
  "gates passed" on faith.
- **Read the diff** against the brief: did it do what was asked, nothing more (scope creep) and
  nothing less? `touchedFiles` in the result is your starting point — and because the run was
  full-trust, check for edits *outside* the paths the brief named, not just inside them.
- **Run the relevant guard skills** on the diff if you have them installed (clean-code-guard,
  test-guard, etc. from `guard-skills`) — this skill produces the work; those skills judge it.
- For schema/migration changes, round-trip them; for removals, grep for dangling references.

Full checklist: [references/review-and-land.md](references/review-and-land.md).

### 5. Land it

The relay never commits, but it cannot stop Command Code under `--yolo` from writing `.git`. The brief
forbids implementer commits, and the reviewer compares `HEAD` with the recorded pre-dispatch baseline
before landing anything. **The orchestrator commits.** Only after the gates pass and the diff holds:

- Commit the verified work yourself, with a clear message.
- If it needs changes, send a delta brief with `--session <sessionId>` from the prior `result.json`
  (use `--continue-last` only when no session id is available), and review again.

## Read-only second opinions

The relay doubles as a clean way to get an adversarial second opinion: dispatch `--read-only` with a
brief that lists the agreed points, then each contested point with both positions, and ask Command
Code to defend or concede each — deliverable in its final message, touching no files. The read-only
guarantee here is the CLI's own permission layer rather than an OS sandbox, so the relay also checks
it after the fact: `readOnlyViolation: false` means the Git-visible detector saw no change (ignored
or outside-repository paths are not covered); `true` means it saw one; `null` means git could not tell.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"), committing
verified, gate-passing work is the agreed contract — that is the whole point. Two limits on that
mandate: **surface, don't absorb** (report Command Code's design decisions, defensible-but-unasked
turns, and non-blocking nitpicks rather than silently keeping them) and **stop for scope changes** (if
correct completion needs going beyond the brief, ask — don't expand the mandate yourself). The full
treatment is in [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) — how to write a brief Command
  Code can execute blind: structure, XML blocks, the report contract, embedding the real gate commands.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) — `relay.mjs` flags, the
  `result.json` contract, backgrounding per orchestrator, and recovery when a run misbehaves.
- [references/review-and-land.md](references/review-and-land.md) — the review checklist, the commit
  boundary, and the exact-session rework cycle.
- [references/multi-task-queues.md](references/multi-task-queues.md) — running a sequential queue:
  carrying constraints forward, progress tracking, and the end-of-run coherence check.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `commandcode` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
