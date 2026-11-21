---
name: claude-agents
description: '''Ask Claude'', ''have Claude build or review this'': drive Claude Code headless (claude -p) from another agent as a peer, builder or fresh reviewer.'
risk: critical
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Claude agents — Claude Code headless as a partner

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

'Ask Claude', 'have Claude build or review this': drive Claude Code headless (claude -p) from another agent as a peer, builder or fresh reviewer.


**Run headless Claude Code as a peer, builder or fresh reviewer.** Any agent can run `claude -p` for a full session: the repository's instructions, its tools and a conversation that can continue. It is a partner with the same standing as its caller. A peer argues a decision through, a builder takes a stage, and a reviewer has never seen the build. This skill covers briefs, modes and mechanics through `<skill dir>/scripts/claude_agent.py`.

## Peer discipline

**Bring Claude in early, brief the goal and argue decisions through.** Give it the facts, the draft, the uncertainty, binding constraints and proof. Leave the means to its judgement and challenge it over several turns. Bring the owner one result or a clear deadlock, question of intent or missing fact. Apply `delegation` § Peer discussion for examples and convergence.

**A delegated diff is unreviewed code, and the session that wrote it never clears it.** Read it, check the disk and rerun its tests yourself. Apply `release-gate` § Stage and phase close for the checks and fresh review before a deployment.

**Keep product decisions, operational changes and final judgement with you.** Decide what the product should do, accept or reject review findings, perform final verification and judge whether a stage is done. Keep operational changes, including development deploys, applied migrations, pushes, provider settings and secrets, plus production credentials. The builder runs development suites within the brief's boundaries, one runner per shared dataset. It makes each operational step one command and names it for you to run. Apply the `delegation` skill.

**Write the diff yourself when the brief would be nearly as long.** Judge delegation by size, not time.

## Peer, builder or reviewer

| Role | Mode | What it can do | Session |
|---|---|---|---|
| Peer — argue a framing, pressure-test a claim, a second opinion on a plan | `consult` (default) | Read, Grep, Glob and the read-only shell (`git log`, `git diff`, `git status`); every write is denied | continued turn after turn |
| Builder — a stage with a goal, its binding decisions and how to prove it | `build` | Edits, shell, tests; a classifier reviews each action (auto mode) | continued within the stage |
| Reviewer — fresh eyes on an artifact, a plan, a change | `review` | Read, Grep, Glob only; no settings, hooks, plugins, MCP, project instructions or memory | always new, never saved |

- **A review needs a fresh session.** Never resume or fork the building thread, or use its subagent. `--fork-session` copies the builder's beliefs with its transcript. `--mode review` always starts a fresh session and never saves it.
- **Route reviews of commits through the `independent-review` skill's wrapper.** Review mode has no shell and cannot read a git range. The wrapper's `--reviewer claude` uses this same fresh headless session for a change before a push or a release. It writes the range's log and diffs to a file the reviewer pages through, and fails short rounds loudly. It loops until nothing introduced is above Low and no High or Critical of any age is open. Don't give review mode git commands instead: `Bash(git diff:*)` also allows `git diff --output=<file>` to write.
- **When the caller is itself Claude, a headless Claude is the same model family.** A consult still buys fresh context and different reasoning, but blind spots are shared. For independent review, prefer another family. The `independent-review` wrapper defaults to a fresh Codex session. Without Codex it uses fresh headless Claude Code, then Grok. Choose `--reviewer grok` for another family (`grok-agents`).
- **In consult and build the delegate reads what you read.** It loads the repository's `CLAUDE.md`, or `AGENTS.md` when no `CLAUDE.md` exists, and the user's `~/.claude/CLAUDE.md`. The project's auto-memory, hooks and skills load too. This suits a builder but makes it dependent on those instructions, which review mode excludes.

## The opening brief

**Give the brief what the repository's instructions do not contain.** Consult and build read those instructions themselves. Supply the decision at hand, conversation so far, and what you have already tried and rejected.

**Name the binding-spec files in a review brief.** Review mode reads nothing on its own.

**Put long briefs in a file and read them from there.** The wrapper sends every prompt on stdin, never as an argument.

```bash
python <skill dir>/scripts/claude_agent.py --new --cwd <repo> --read <brief file>
python <skill dir>/scripts/claude_agent.py --new --mode build --cwd <worktree> --read <stage brief>
python <skill dir>/scripts/claude_agent.py --mode review --cwd <repo> --read <review brief>
```

**Run a partner on the strongest model the account offers.** `--model opus` tracks the newest Opus; `best` picks Fable where the account has it. The wrapper sends `xhigh` effort by default and `max` for a review. Without an explicit level, Opus, Sonnet and Haiku 5.5 run at `medium` (model configuration docs, read 2026-10-24).

## Follow-up turns

**Continue the conversation with a specific reaction.** Push back on a choice, ask for its reasoning or name a constraint it missed.

```bash
python <skill dir>/scripts/claude_agent.py --cwd <repo> "agree on the queue, but a poison message would block the shard — doesn't that kill it?"
```

A plain call continues the session the wrapper last opened in that directory, in the same mode, on the same model and effort.

## Resume or start fresh

- **Within a stage or a conversation, resume.** This is the default.
- **A new stage or a new question starts fresh, with `--new`.** Project knowledge belongs in its docs and the brief. A long thread carries assumptions those docs have since replaced. If a fresh session would miss something, that is a gap in the docs.
- **Parallel builds get a worktree each.** The wrapper keeps one session per working directory, so two worktrees never share one. Two sessions in one directory need separate state files: `CLAUDE_AGENT_STATE=<a file per session>` on every call for that session.
- **An earlier session resumes by id: `--session <id>`.** The wrapper prints every run's id. Claude Code finds an id in any project on the machine and keeps transcripts 30 days by default (sessions docs, read 2026-10-24). `--session` fails rather than starting a new session.
- **A usage limit makes the partner unavailable, as a missing CLI does.** The run fails with a non-zero exit and the limit's message, such as "You've hit your session limit · resets 3:45pm" (errors docs, read 2026-10-24). Wait if the reset is near; otherwise do the work yourself, and the independent review still applies. State keeps the session, so the next call after reset continues it.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

The answer came from a session that started with only your brief. You read its exit code and output from the run itself, and anything it built was reviewed before it was trusted.

## Mechanics

**Use the wrapper's absolute path and pass its repository through `--cwd`.** This skill's `<skill dir>/scripts/claude_agent.py` works from any directory and uses only the Python standard library. `--check` shows the binary, version and state file without running anything. `--dry-run` prints the exact `claude` command.

| Command | Effect |
|---|---|
| `claude_agent.py "<msg>"` | Continue this directory's session, else start one (consult) |
| `claude_agent.py --new "<msg>"` | Force a new session |
| `claude_agent.py --session ID "<msg>"` | Resume that session; no fallback |
| `claude_agent.py --read FILE` | Message from FILE (`-` for stdin) |
| `claude_agent.py --status` / `--reset` | Show / forget this directory's session |

| Flag | Default | Notes |
|---|---|---|
| `--mode` | `consult`; a resume keeps the session's last mode | `consult` / `build` / `review` (table below). Applied on every turn. |
| `--model` | the CLI's | Alias or full id. Remembered and re-sent on every resume. |
| `--effort` | `xhigh`; review `max` | `low` … `max`. Remembered and re-sent on every resume, which does not keep it. |
| `--cwd DIR` | current directory | Where the session works; sessions are scoped to it. |
| `--add-dir DIR` | — | Extra directory the tools may reach; repeatable; re-sent on resume. |
| `--budget USD` | none | `--max-budget-usd`: stops the run at that estimated spend. |
| `--max-turns N` | none | Stops after N agentic turns. |
| `--schema FILE` | — | A JSON Schema; prints the validated `structured_output` instead of text. |
| `--mcp` | off | Load the configured MCP servers (consult, build). |
| `--timeout SEC` | 3600 | Kills the run; the state keeps the session if it opened. |
| `--log FILE` | — | Appends the raw `stream-json` events as they arrive, to tail a long build. |
| `--raw` | off | Prints the whole result event as JSON. |

**Apply the mode's flags again on every turn.**

| Mode | Flags |
|---|---|
| `consult` | `--permission-mode dontAsk --permission-prompts none --tools Read,Grep,Glob,Bash --strict-mcp-config` |
| `build` | `--permission-mode auto --permission-prompts none --strict-mcp-config` (default tools) |
| `review` | `--restricted --tools Read,Grep,Glob --strict-mcp-config --permission-mode dontAsk --permission-prompts none --no-session-persistence`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, and `CLAUDE_CODE_EFFORT_LEVEL` removed |

**Read that line before trusting a round.** After each run, the answer goes to stdout and one status line to stderr. It names the new or resumed session id, mode, actual permission mode, model, reply effort, this run's cost, session cost and turns. It warns about differences from requested values, lists denied tool calls and warns when Claude Code saved no transcript. All modes add `-p --output-format stream-json --verbose --effort <level>`. A failed run prints nothing on stdout and exits non-zero; a bad wrapper argument exits 2.

### Session continuity

**Resume the recorded session and resend its tools and permission mode.** The wrapper's per-directory state keeps the last opened id, including after a later failure. It resends the mode, model, effort and access settings. Automatic resume starts fresh only when the transcript is missing. An explicit `--session` fails.

### Troubleshooting

**Use trusted repositories and check the permissions that actually ran.** Consult and build run repository hooks. Leave MCP out unless asked and keep production credentials and operational changes outside auto-mode builds. Read the actual mode in the wrapper's stderr and get the owner's go for API spend.

**Open `references/troubleshooting.md` for raw `-p` calls or wrapper diagnostics.** Read it for transcript or context loading problems, sandbox setup, permission denials, binary discovery, billing, usage limits and background runs.

## Not this skill

**Apply `delegation` for briefs, boundaries, parallel work and handoff verification.** Apply `independent-review` for the release-gate review loop, and `codex-agents` to drive the Codex CLI the same way.

## Limitations

CLI features, sandbox behavior and permissions depend on the version and host. Keep provider and authorization checks in the parent workflow and verify changes independently.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-teams/skills/claude-agents).
