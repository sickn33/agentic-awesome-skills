---
name: grok-agents
description: '''Ask Grok'', ''have Grok build or review this'': drive the Grok CLI headless from another agent as a peer, builder or fresh reviewer.'
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

# Grok agents — the Grok CLI headless as a partner

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

'Ask Grok', 'have Grok build or review this': drive the Grok CLI headless from another agent as a peer, builder or fresh reviewer.


**Run headless Grok as a peer, builder or fresh reviewer.** Any agent can get a full Grok session: tools, repository instructions where Grok reads them, and a conversation that can continue. It is a partner from another model family, with the same standing as its caller. A peer argues a decision through, a builder takes a stage, and a reviewer has never seen the build. This skill covers briefs, modes and commands.

Everything here was read from `grok --help` and run on Grok CLI 1.0.70, 2026-11-02, unless stated otherwise. The CLI changes often; check `grok --help` before relying on a flag.

## The partner discipline (compact)

**Apply `delegation` for the full discipline of working with a partner.** These rules must hold even when this folder is copied alone.

1. **A delegate gets the why, not just the what.** Give the goal in the owner's terms, the decision it feeds, facts and reasoning behind non-obvious choices. Include binding constraints, traps a smart newcomer would walk into, and how the result will be proved. Never a keystroke script.
2. **Treat the delegate as a peer, not a tool.** Its view is not binding, and neither is yours. A choice you would not have made is a disagreement to surface, not a defect.
3. **Bring the partner in at framing and keep iterating.** The cheapest wins are at framing; three to eight turns is normal.
4. **Converge before surfacing.** Bring the human one result, or a disagreement stated cleanly.
5. **A delegated diff is unreviewed code, and the session that wrote it never clears it.** Read it, check the disk and rerun its tests yourself. Apply `release-gate` § Stage and phase close for the checks and fresh review before a deployment.
6. **Keep product decisions, operational changes and final judgement with you.** Decide what the product should do, accept or reject review findings, perform final verification and judge whether a stage is done. Keep operational changes, including development deploys, applied migrations, pushes, provider settings and secrets, plus production credentials. Development suite runs are delegated within the brief's boundaries; apply `delegation`.

## Three modes

| Mode | What it is for | Tools | Session |
|---|---|---|---|
| Peer | a decision argued through, a draft pushed on, a framing checked | read-only: `--tools read_file,grep,list_dir`, no shell, no edits | continued with `--resume <id>` |
| Builder | a stage with a goal, its binding decisions and how to prove it | every tool, approved: `--always-approve`, in a worktree of its own | continued within the stage |
| Reviewer | fresh eyes on a change | read-only, isolated from memory and other tools' settings (§ Reviewer) | always new |

Every mode shares four rules, each from a run that went wrong:

- **Put the prompt in a file through `--prompt-file <brief>`.** Never use inline `-p "…"`. A long inline prompt trips the calling agent's permission classifier and the call is refused.
- **Pass `--cwd <repo>` and close stdin on every call.** This selects the repository you mean. Use `< /dev/null`, because open stdin waits for input forever. Bare `grok` without a prompt flag opens the interactive screen and hangs without output.
- **Read the output format you asked for.** `--output-format json` returns one object with `text`, `stopReason`, `sessionId`, `num_turns` and `usage`, which suits a calling agent. `plain` returns text alone.
- **Effort and model are stated.** Use `--reasoning-effort xhigh` for anything needing judgement; the CLI's default is lower. `grok models` lists models and the default, `grok-4.7` on 2026-11-02; `-m <id>` pins one.

## Peer

**Name the peer session and repeat its flags when resuming.**

```bash
SID=$(python -c "import uuid; print(uuid.uuid4())")       # name the session yourself
grok --prompt-file "$S/turn-1.md" --cwd <repo> --session-id "$SID" \
     --tools read_file,grep,list_dir --disallowed-tools search_tool,use_tool \
     --deny MCPTool --deny Bash --deny Edit --deny Write --disable-web-search \
     --always-approve --reasoning-effort xhigh --output-format json < /dev/null > "$S/turn-1.json"
# the next turn continues it: every flag again, --resume in place of --session-id
grok --resume "$SID" --prompt-file "$S/turn-2.md" --cwd <repo> \
     --tools read_file,grep,list_dir --disallowed-tools search_tool,use_tool \
     --deny MCPTool --deny Bash --deny Edit --deny Write --disable-web-search \
     --always-approve --reasoning-effort xhigh --output-format json < /dev/null > "$S/turn-2.json"
```

- **Name the session with `--session-id <uuid>` and continue with `--resume <uuid>`.** Resume keeps its context: a word given in the first turn came back from the second (observed 2026-11-02). Save the id in a file beside the brief. Don't rely on `-c`: it continues whichever session ran most recently in the directory.
- **`--always-approve` is what lets it read at all.** Without it, Grok can't approve its own reads and exits 0 after a sentence of preamble that reads like an answer. With the read-only allowlist above, approving everything approves only reading.
- **Let a peer load the trusted folder's instructions and compatible skills.** In a folder Grok trusts, it reads the project's instruction files and skills found through Claude compatibility. `grok inspect` lists them. This suits a peer and is why the reviewer turns it off.

## Builder

**Give a builder its own worktree and exclude operational changes.** Permit development suites within the `delegation` boundaries; keep production credentials with the session agent.

```bash
grok --prompt-file "$S/stage-brief.md" --cwd <worktree> --session-id "$SID" \
     --always-approve --deny MCPTool --disable-web-search \
     --reasoning-effort xhigh --output-format json < /dev/null > "$S/build-1.json"
```

- **`--always-approve` approves every tool call, the shell included.** Use a git worktree of its own, never the tree you edit. The brief excludes operational changes: no pushes, deploys, applied migrations, provider-setting or secret changes, or production-credential reads (§ The partner discipline, 6). Development suites run within the brief's boundaries. `--deny MCPTool` blocks the machine's connected MCP servers, including a database's.
- **Check the disk before believing a run happened.** Read `git status` and the named files. A run unable to write returns a reasoned report that reads exactly like one that did.
- **Do not treat `--sandbox <profile>` as a write boundary.** It enforces only on supporting platforms; on Windows a sandboxed run still created a file (observed 2026-10-10).
- **Run a small build first and read the disk.** This mode's command comes from `grok --help` 1.0.70. It had not been run end to end when written on 2026-11-02, because the calling agent's classifier refused a fully approved Grok session.

## Reviewer

**Apply `independent-review` for scope, brief, triage and the stopping rule.** Its wrapper uses this mode with `--reviewer grok`. The bare call below explains the flags. The wrapper also sets the turn cap and writes the subject, range's log and diffs to a file. The reviewer has no shell and reads that file.

```bash
GROK_MEMORY=0 GROK_MANAGED_MCPS_ENABLED=false GROK_MANAGED_MCP_GATEWAY_TOOLS_ENABLED=false \
GROK_CODEX_SESSIONS_ENABLED=false <and GROK_{CLAUDE,CURSOR}_{AGENTS,RULES,SKILLS,HOOKS,MCPS,SESSIONS}_ENABLED=false> \
grok --prompt-file "$S/review-NNN-brief.md" --cwd <repo> \
     --reasoning-effort xhigh \
     --tools read_file,grep,list_dir --disallowed-tools search_tool,use_tool \
     --deny MCPTool --deny Bash --deny Edit --deny Write --disable-web-search \
     --always-approve \
     --output-format plain < /dev/null > "$S/review-NNN.md" 2>&1
```

Every part is load-bearing:

- **Disable memory and compatibility sources for this review process.** The environment variables disable Grok memory, managed MCP servers and gateway tools, and reading of Codex sessions. They also disable every Claude and Cursor compatibility cell: instructions, rules, skills, hooks, MCP servers and sessions. Environment wins over Grok's config (measured with `grok inspect --json`, 1.0.70, 2026-10-30: all 13 cells off).
- **Name any instruction files that still load in the report.** Run `grok inspect --json` with the same variables to list them. In a trusted folder, this includes the project's instruction files and even a gitignored `CLAUDE.local.md`.
- **Approve reads with `--always-approve` and reject rounds with short output.** Without approval, the round exits 0 after a sentence of preamble that reads as "found nothing". Length is the only tell; a genuinely empty round still argues its way there over paragraphs.
- **Use `--tools read_file,grep,list_dir` as the review's write boundary.** This allowlist prevents editing the tree being scored. Not `--sandbox read-only`, and not a denylist such as `--disallowed-tools edit,write`, which leaves shell and edit access. Observed on Windows, 2026-10-10: those two flags together still allowed file creation; the allowlist did not. Without a shell the reviewer cannot run git, so write the subject to disk first.
- **Block the access that the built-in tool allowlist leaves open.** Use `--disallowed-tools search_tool,use_tool`, the `--deny` rules and `--disable-web-search`. `--tools` covers built-ins only; MCP meta-tools and every connected server otherwise remain available. `--disallowed-tools` wins over `--tools`; a deny rule wins over `--always-approve`. Asked to write, call MCP tools and run a shell, a round with these flags did none of them (observed 2026-10-10).
- **Start a new review session without the builder's inherited beliefs.** Never `--resume` or `--fork-session` the thread that built the code.
- **Size the subject to a build stage and keep emitted findings.** Running out of room can fail a round with the same short output. Keep findings emitted before the failure.

## Accounts and sign-in

- **Use `grok login --device-auth` to sign in without a local browser.** The CLI prints a link and code; the account owner approves on any device. An agent can start it and relay the link and code to an owner away from the machine. Never paste the resulting credentials anywhere.
- **A signed-in CLI can still be out of credit.** It answers `402 usage balance exhausted` and stops (observed 2026-10-31). In a review round, the `independent-review` wrapper exits 3 and prints the same round for the fallback reviewer. In peer or builder mode, wait for reset or do the work yourself, and say so.
- **Read persisted usage and session ids through the CLI.** `grok usage` prints a session's persisted token and cost usage; `grok sessions list` lists recent sessions and ids.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

The session started with only your brief and used its mode's flags; you read its exit code and output from the run itself. A resumed turn named its session, and anything built was on disk and reviewed before it was trusted.

## Not this skill

**Apply `independent-review` for the review loop and its wrapper.** Use `claude-agents` and `codex-agents` to drive those CLIs the same way. Apply `delegation` to brief and verify any delegate.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-teams/skills/grok-agents).
