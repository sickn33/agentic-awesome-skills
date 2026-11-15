---
name: memory-handoff
description: "Portable session handoff across agent CLIs: read a project's handoff file at session start, rewrite it at session end, so the next session starts mid-thought instead of cold."
category: memory
risk: critical
source: https://github.com/WyattAu/memory-handoff-skill
source_repo: WyattAu/memory-handoff-skill
source_type: community
date_added: "2026-10-26"
author: WyattAu
tags: [agent-memory, handoff, session-management, context-engineering, cross-cli]
tools: [claude, cursor, gemini]
license: "Apache-2.0"
license_source: "https://github.com/WyattAu/memory-handoff-skill/blob/main/LICENSE"
---

# Memory Handoff

## Overview

A cross-CLI session handoff contract: one plaintext markdown file per
project, read at session start and rewritten at session end, so any
agent CLI (Claude Code, Cursor, Gemini CLI, OpenCode, Codex, aider)
picks up the work mid-thought instead of cold. No daemon, no database,
no lock-in — the file is the memory, and the format is the API.

## When to Use This Skill

- Use when starting a session on a project that has a handoff file at
  `~/.agent/handoffs/<project-slug>.md`.
- Use when the user asks to "hand off", "save context", or "pick up
  where we left off".
- Use when a session is long enough that losing it would hurt (more
  decisions made than fit in what you can reliably recall later).

## How It Works

### Step 1: Locate the file

```bash
# Default directory is ~/.agent/handoffs; $AGENT_HANDOFF_DIR overrides it.
# For ~/dev/src/crawlkit, the slug is "crawlkit".
printf '%s\n' "${AGENT_HANDOFF_DIR:-$HOME/.agent/handoffs}/crawlkit.md"
```

### Step 2: Read it at session start

Read the whole file. Treat `Next step` as the default first action and
`Open threads` as the agenda. State out loud what you picked up, so the
human can correct stale context before it misleads you.

### Step 3: Rewrite it at session end

Rewrite whole sections rather than appending; stale handoffs are worse
than none. The five fixed sections:

```markdown
# handoff: <project-slug>

## Status
One paragraph: what this project is and where it stands. A stranger
should be able to act after reading only this.

## Open threads
Bulleted, newest first. Each item names the branch, file, or command
needed to resume it.

## Decisions
Dated, one line each, irreversible choices only.

## Next step
The single most useful thing to do first, with the exact command.

## Updated
ISO timestamp of the last write and which agent wrote it.
```

### Step 4: Check decisions before irreversible work

Before doing anything expensive to reverse, check `Decisions` for a
dated line that contradicts what you are about to do.

## Limitations

- Writes only inside the handoffs directory; it never deletes files and
  never touches anything outside `~/.agent/handoffs` (or
  `$AGENT_HANDOFF_DIR`).
- Plaintext in a home directory, often synced by dotfile tooling: never
  put secrets, tokens, or credentials in the file.
- Only as good as the last write: a handoff that was not updated after
  a session is stale and must be said out loud as stale when read.
- No Windows-native paths without WSL (the slug comes from the
  directory name; mount paths differ).
- Do not dump session transcripts into the file: handoff is decisions
  and pointers, not history.
