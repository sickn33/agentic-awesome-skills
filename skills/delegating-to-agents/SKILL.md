---
name: delegating-to-agents
description: "Delegate bounded work to other AI agents while preserving context, ownership, and progress checks."
category: agent-orchestration
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [agents, delegation, orchestration]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Delegating to Agents

## When to Use

- Use when work should be handed to another AI agent with a complete prompt and progress checks.
- Use when you need to relay instructions to terminal or TUI agents without losing context.

## Which agent to pick

- **Coding (default) → Codex CLI.** Strongest coding agent, especially for complex, long-running SWE tasks. It's on an unlimited-usage plan — effectively unlimited, don't ration it.
- **Most other tasks → Pi Agent** (`pi` in a cmux terminal). All Pi agents run opus-4.8-fast via OpenRouter at xhigh reasoning effort.
- **Frontend / design → Pi.** Opus 4.8 Fast beats Codex on UI, styling, design.
- **Heavy multi-step work:** you as orchestrator + Codex CLI executing in a right-hand cmux pane is a solid default setup.

## Sending prompts to a TUI agent

1. **ONE single line — never newlines in the message body.** In a TUI, newline = Enter: a multi-line prompt submits at the first line and the rest arrives as fragmented mid-turn steering messages. Use ". " or "; " instead of line breaks, then one explicit enter. For long instructions, write them to a file and send: `read /tmp/task.md and follow it`.
2. **Wrap the prompt in plain double quotes — NEVER escaped.** `cmux send --surface surface:N "your prompt"`. The recurring bug is emitting `\"` — in bash that's literal-broken and dies with `unexpected EOF`. Inside the prompt, avoid apostrophes and literal double quotes (write "dont", "wont", "lets"); rephrase instead of escaping. If a send failed, the cause was the escaped `\"`, not the quote type.
3. **Exact command names:** `cmux send --surface surface:N` then `cmux send-key --surface surface:N enter`. There is NO `send-surface` or `send-key-surface`.

## Polling

Keep sleeps SHORT: start at 3-5s, re-check, repeat. Don't `sleep 30`. Pi and Hermes (opus-4.8-fast) launch and respond within seconds; scale up only for genuinely heavy tasks. After every check, send the user a one-line status: what the agent is doing and whether it's on track.

Claude Code note: after it finishes, it may prefill a predicted next user message — that draft is Claude, not the user.

## Remote VPS

SSH in first and launch the agent ON the VPS (e.g. `codex --yolo`), then drive that on-box agent. Don't run an agent locally and have it SSH for every step.

## The 4 agents (background reference)

All four use the portable SKILL.md standard; project skills win over global.

- **Pi** (pi.dev, open-source TS): minimal read/write/edit/bash core, self-extends via TS extensions; true BYOK; best-in-class session branch/fork/resume. Skills: `~/.pi/agent/skills/`.
- **Codex CLI** (OpenAI, Rust): fastest startup; kernel-level sandboxing; `codex exec` for CI; reads AGENTS.md. Skills: `~/.codex/skills/`.
- **Claude Code** (Anthropic, TS): deepest Claude integration, `.claude/` conventions, live skill hot-reload. Skills: `~/.claude/skills/`.
- **Hermes** (Nous Research, Python): persistent autonomous agent — cross-session memory, built-in scheduler, 40+ tools; can orchestrate the other CLIs as workers. Skills: `~/.hermes/skills/`.

## Driving interactive CLIs

- Codex, Pi, OpenCode: need `pty=true`.
- Claude Code: prefer `claude --print --permission-mode bypassPermissions` (no PTY).

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
