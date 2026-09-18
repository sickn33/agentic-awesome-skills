---
name: claude-delegate
description: Delegate coding tasks to a separate Claude Code CLI process or Claude
  session only when the user explicitly requests it, while the orchestrator retains
  review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the `claude` CLI (Claude Code) installed and authenticated,
  Node 18+, and git. The orchestrating agent must be able to run shell commands and
  read files. Claude's shell sandbox requires macOS, Linux, or WSL2; native Windows
  launch is pending verification.
metadata:
  version: 0.5.0
---
# Claude Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `claude` implementer (`Claude Code`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Delegate one bounded coding task to a separate **implementer** — a Claude
Code CLI session — then review what it produced and land it yourself. You write the brief and own the
judgment; the separate Claude session edits the working tree; you verify and commit.

This skill is not a signal for the current Claude to implement directly. Use it only after the human
explicitly asks for delegation to another Claude Code process or session.

## When not to use this

- The human asked the current agent to implement the task directly.
- The task is small enough to do inline and the human did not request delegation.
- The `claude` CLI is missing or unauthenticated (`claude auth status`).
- The task needs a stronger host boundary than Claude Code's tool permissions and shell-only sandbox
  provide. Use an isolated container or VM for that requirement.

## Prerequisites

1. `claude --version` succeeds.
2. `claude auth status` reports an authenticated session. On macOS the live credentials sit in the
   login Keychain; when the orchestrator's own sandbox blocks Keychain access (Codex's sandbox
   does), `claude` falls back to a possibly stale credentials file and reports `loggedIn: false`
   even though the login is valid. Re-run the check — and the dispatch itself — with that sandbox
   escalated or outside it before concluding the CLI is unauthenticated.
3. The target repository is the directory passed with `--cd`.
4. On Linux/WSL2, Claude's sandbox dependencies are installed. The normal relay profile is
   configured to fail when the sandbox is unavailable instead of silently running shell commands
   unsandboxed. Existing merged settings can still affect the effective boundary.

## The loop

### 1. Write the brief

The separate session has no orchestrator chat history. It receives the brief on stdin and can inspect
the target working tree.

Claude Code automatically discovers the target project's `CLAUDE.md` and normal local Claude
configuration because the relay does not use `--bare`. It does **not** generically auto-load
`AGENTS.md`. Read `AGENTS.md` yourself and copy every load-bearing constraint and the real gate
commands into the brief. Tell the implementer not to commit. Keep one task per brief.

Template and details: [references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# review/diagnosis only:                 add --read-only
# continue the latest session:           add --resume-last
# continue the recorded session:         add --session <id>
# choose limits:                         add --max-turns 40 --max-budget-usd 10
# hard relay deadline:                   add --timeout 2h
# inspect every option:                  node .../relay.mjs --help
```

`<skill-dir>` is this installed skill directory, the folder containing this `SKILL.md`.

The relay runs `claude -p --output-format stream-json --verbose`, sends the brief through stdin, and
writes artifacts under the system temp directory by default. It never uses `--bg` or `--bare`, and it
never commits. See [references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait

The relay blocks until Claude exits. Use the orchestrator's background-command facility, or run it in
the foreground and wait. Completion means the process exited and `result.json` exists.

- A pre-run usage error exits 2 and writes no `result.json`.
- A missing `claude` exits 127 and writes `status: "claude_unavailable"`.
- Timeout and caught relay signals terminate the whole implementer process tree and preserve an
  outcome artifact.

Read `finalMessage`, `touchedFiles`, `resultSubtype`, and the raw artifact paths from `result.json`.

### 4. Review

Treat the implementer's report and gate outcomes as claims:

- Review edits to existing tests before a green gate means anything.
- Re-run the project's actual gates yourself.
- Read the complete diff against the brief, starting with `touchedFiles`.
- Inspect untracked and staged content as well as the ordinary diff.
- Run relevant guard skills if installed.

Full checklist: [references/review-and-land.md](references/review-and-land.md).

### 5. Land

The **orchestrator commits** only after the gates pass and the diff holds. For rework, resume the same
Claude session with a delta brief:

```bash
echo "Keep the implementation, replace the mocked DB test with the migrated fixture, and remove the
unused import." | node "<skill-dir>/scripts/relay.mjs" --session <id> --cd /path/to/repo
```

Review a resumed run exactly like the first run.

## Permission profiles

The normal profile is deliberately explicit:

- `acceptEdits` permission mode.
- Built-in tools restricted to Read, Glob, Grep, Edit, Write, and the platform shell.
- On macOS, Linux, and WSL2, Claude's shell sandbox is enabled with startup failure on missing
  dependencies and no unsandboxed retry. Commands that stay sandboxed are auto-approved so ordinary
  gates can run headlessly. The sandbox governs shell processes and their children only; merged
  local or managed sandbox settings can add effective paths or exclusions.
- Configured MCP discovery and Claude.ai connectors are disabled, all MCP tools are denied, and
  skills, commands, and Claude's Agent tool are unavailable to the child. Project `CLAUDE.md`, hooks,
  normal authentication, session persistence, and other local settings still load.
- String rules deny common direct shell forms of `git commit`, `git push`, and nested `claude`, plus
  any command containing `claude-delegate`. Aliases, scripts, and wrappers can bypass them, so they
  are only a speed bump; the brief's no-commit instruction and orchestrator review remain the boundary.

Native Windows does not support Claude's shell sandbox. The relay restricts the tool surface and
pre-approves PowerShell so the run remains non-interactive, but that shell is not OS-isolated. Native
`claude.exe` and npm `claude.cmd` launch paths are implemented; Windows verification is pending.

`--read-only` uses `plan` mode with only Read, Glob, and Grep. It removes edit, write, and shell paths,
then compares parsed git porcelain and fingerprints the working-tree identity and index entries of
Git-visible paths that were already dirty.
`readOnlyViolation` is `true` when either signal proves a change, `false` when coverage is complete and
detects none, and `null` when coverage is incomplete. This is a reporting tripwire, not an OS boundary:
ignored paths and perfect restores are outside it, local hooks can write, and concurrent changes cannot
be attributed to Claude.

`--dangerously-skip-permissions` is an explicit opt-in to Claude's `bypassPermissions` mode. The
restricted tool surface, direct commit/push deny rules, and supported-platform shell sandbox remain,
but direct file tools can cross normal permission boundaries. Use it only with the human's explicit
acceptance.

## Complementary to native Claude features

Claude subagents, agent teams, and background sessions are useful when the current Claude environment
is already the orchestrator and native coordination is the goal. This skill is complementary: it
provides a cross-orchestrator contract — self-contained brief → dispatch → artifacts → review → land
— and keeps the commit with the orchestrator.

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) — context, `CLAUDE.md` versus
  `AGENTS.md`, real gates, report contract, and delta briefs.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) — flags, profiles, artifacts,
  `result.json`, polling, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) — generated-code review, the commit
  boundary, and session rework.
- [references/multi-task-queues.md](references/multi-task-queues.md) — sequential queues, progress
  tracking, constraint carry-forward, and final coherence.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `claude` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
