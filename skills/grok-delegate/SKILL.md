---
name: grok-delegate
description: Delegate coding tasks to the Grok Build CLI only when the user explicitly
  requests it, while the orchestrator retains review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the `grok` CLI (Grok Build) installed and authenticated (`grok
  login`, or `XAI_API_KEY`; beta access needs an eligible xAI subscription), Node
  18+, and git. The orchestrating agent must be able to run shell commands and read
  files. Shell examples assume bash/zsh (macOS/Linux, or Git Bash/WSL on Windows).
metadata:
  version: 0.5.0
---
# Grok Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `grok` implementer (`Grok Build`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. This skill lets you hand a bounded coding task to a separate
**implementer** — the Grok Build CLI (`grok`) — then review what it produced and land it yourself. You
write the brief and own the judgment; Grok does the typing under an explicit autonomy profile; you
verify and commit.

Nothing here is specific to one orchestrating agent. The loop needs only the ability to run a shell
command and read a file, so it works the same whether you are Claude Code, Cursor, OpenCode with a
selected model, or any comparable agent. (It is designed for Claude Code and Cursor; treat other
orchestrators as designed-for, not yet proven.)

## When NOT to use this

- The task is small enough to just do inline — delegation overhead is not worth it.
- The `grok` CLI is not installed, not authenticated, or the account lacks Grok Build beta access.
- You want to write the code yourself, or you only need a review without an implementer run.

## Prerequisites (check once)

1. `grok version` succeeds. If not, install on any platform with
   `npm i -g @xai-official/grok` (or use the installer from xAI's official Grok CLI docs) and
   authenticate (`grok login`, or `grok login --device-auth` on headless hosts, or set
   `XAI_API_KEY`).
2. **Confirm which `grok` is on PATH.** `command -v grok` shows the active binary and `grok version`
   its version — the relay records the version it ran into `result.json`, so a stale binary is visible
   after the fact.
3. You are in (or will point `--cd` at) the target git repository.

## The loop

Run these five steps per task. Steps 1, 4, and 5 are your judgment; 2 and 3 are mechanical.

### 1. Write the brief

Grok sees **only** the text you send — no orchestrator chat history, no shared context. Everything the
task needs goes in the brief: the goal, the current state, what to change, what to leave untouched,
the project's **actual** gate commands (discover them from the repo's CLAUDE.md/AGENTS.md/Makefile —
do not assume), and a report contract. Tell Grok it will **not** commit (you will). Keep one task per
brief. Full guidance and a template: [references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Send the brief to Grok with the bundled helper. It wraps `grok -p`, captures the run, and writes a
structured `result.json` — so your only job is "run a command, read a file." (`<skill-dir>` below is
this skill's installed directory — the folder containing this `SKILL.md`, i.e. the directory you loaded
the skill from. Claude Code prints it as "Base directory for this skill" when the skill loads; on other
orchestrators use that same directory — if unsure where it landed, run
`find ~ -name relay.mjs -path '*grok-delegate*'` and substitute the directory above it.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# read-only (review/diagnosis; best-effort — verify touchedFiles): add --read-only
# continue the previous Grok session:       add --resume-last  (send only the delta brief)
# hard time limit (watchdog):               add --timeout 2h  (default: off; implementation runs routinely need 1-2h)
# see all options:                          node .../relay.mjs --help
```

The helper defaults to a write-capable (`workspace-write`) autonomy profile — `--always-approve` plus
`--sandbox workspace` — and writes its artifacts to a temp dir, so the repo under review stays clean.
It **never commits** — see step 5. Mechanics, flags, and the `result.json` shape:
[references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The helper blocks until Grok finishes, so back it with whatever your orchestrator offers and resume
when it returns:

- **Claude Code:** run the Bash call with `run_in_background: true`; you are notified on completion.
- **Plain shell / other agents:** run it in the foreground for short tasks, or background it and poll
  the result file — `… &` in bash/zsh (including Git Bash/WSL), or your shell's equivalent (`Start-Job`
  in PowerShell, `start /b` in cmd). The run is done when `result.json` exists with a `status`. (A
  pre-run usage error — bad args or an empty brief — instead exits with code 2 and a stderr message and
  writes no result file, so check the exit code too. A missing `grok` binary exits 127 but *does* write
  a `result.json` with status `grok_unavailable`.)

Do not trust progress trackers over reality: a run is finished when `result.json` is written and the
process has exited. Read the working tree, not a status line. The implementer's full report is
the `finalMessage` field in `result.json` (also printed in full on stdout between the report markers).

### 4. Review — do not trust the self-report

Grok's `result.json` includes its own summary and gate claims. **Re-verify, don't accept:**

- **Re-run the project's gates yourself** (the test/lint/build commands from step 1). Never take
  "gates passed" on faith.
- **Read the diff** against the brief: did Grok do what was asked, nothing more (scope creep) and
  nothing less? `touchedFiles` in the result is your starting point.
- **Run the relevant guard skills** on the diff if you have them installed (clean-code-guard,
  test-guard, etc. from `guard-skills`) — this skill produces the work; those skills judge it.
- For schema/migration changes, round-trip them; for removals, grep for dangling references.

Full checklist: [references/review-and-land.md](references/review-and-land.md).

### 5. Land it

**The orchestrator commits.** Only after the gates pass and the diff holds:

- Commit the verified work yourself, with a clear message.
- If it needs changes, send a delta brief with `--resume-last` (don't restate the whole task) and
  review again.

## Autonomy model

Grok's default permission mode is `ask`, which **blocks on approval prompts in a headless pipe**. The
relay therefore always sets autonomy explicitly:

| Relay flag | What Grok gets | Use when |
| --- | --- | --- |
| *(default)* | `--always-approve --sandbox workspace` | Normal implementation — writes scoped to the working tree |
| `--read-only` | `--sandbox read-only --permission-mode plan` | Review / diagnosis — **best-effort, not enforced** (see caveat below) |
| `--full-access` | `--always-approve --sandbox off` | Explicit opt-in when the task needs unrestricted tools |

`--always-approve` alone would approve *all* tools (writes, shell, network) — closer to unrestricted
than to a workspace-scoped write. Pairing it with `--sandbox workspace` is what keeps the default
safe. Reach for `--full-access` only when the human asks for it.

**`--read-only` is best-effort, not a hard guarantee.** The read-only sandbox restricts out-of-workspace
filesystem/network access, not grok's own edit tool, and headless `plan` mode is advisory — a run
verified here still wrote the working tree when told to. Use `--read-only` to *signal* review intent,
but always confirm `touchedFiles` afterward; treat the diff, not the flag, as the guarantee. The relay
automates a reporting tripwire: it compares parsed git porcelain and fingerprints the working-tree
identity and index entries of Git-visible paths that were already dirty. `readOnlyViolation` is `true`
when either signal proves a change, `false` when coverage is complete and detects none, and `null` when
coverage is incomplete. Ignored paths, submodule internals, perfect restores, and attribution of
concurrent changes remain outside it, so the diff
review stays the guarantee.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"), committing
verified, gate-passing work is the agreed contract — that is the whole point. Two limits on that
mandate: **surface, don't absorb** (report Grok's design decisions, defensible-but-unasked turns, and
non-blocking nitpicks rather than silently keeping them) and **stop for scope changes** (if correct
completion needs going beyond the brief, ask — don't expand the mandate yourself). The full treatment
is in [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) — how to write a brief Grok can
  execute blind: structure, XML blocks, the report contract, embedding the real gate commands.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) — `relay.mjs` flags, the
  `result.json` contract, backgrounding per orchestrator, and recovery when a run misbehaves.
- [references/review-and-land.md](references/review-and-land.md) — the review checklist, the commit
  boundary, and the rework cycle via `--resume-last`.
- [references/multi-task-queues.md](references/multi-task-queues.md) — running a sequential queue:
  carrying constraints forward, progress tracking, and the end-of-run coherence check.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `grok` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
