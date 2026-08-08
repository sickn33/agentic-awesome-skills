---
name: distribute-skill-to-all-agents
description: "Distribute a skill across configured agent skill folders while respecting local symlink layouts."
category: development
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [skills, distribution, agents]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Distribute a Skill Across All Agents

## When to Use

- Use when a skill should be made available across multiple local agent skill folders.
- Use when the user asks to sync or distribute skill updates to other agents.

The user has 4 agent skill locations on his MacBook. A skill must exist in each (or via symlink) to be discoverable by every agent.

## The 4 Canonical Locations

| Agent | Skills Folder | Notes |
|---|---|---|
| Codex / OpenAI Agents | `~/.agents/skills/` | **Canonical** — author skills here first |
| Claude Code | `~/.claude/skills/` | **Symlink → `~/.agents/skills/`** — writing to `.agents/skills` automatically covers Claude |
| Pi Agent | `~/.pi/agent/skills/` | **Symlink → `~/.agents/skills/`** — auto-covered. (Path is `/agent/` nested — NOT `~/.pi/skills/`) |
| Hermes Agent | `~/.hermes/skills/` | Independent copy — the only one needing a manual copy |

## Workflow

1. **Author the skill in `~/.agents/skills/<skill-name>/SKILL.md`** (canonical). Follow `effective-agent-skills` SKILL.md guidance.
2. **Verify the `.claude` symlink is intact** (one-time check):
   ```bash
   ls -la ~/.claude/skills
   # Expect: ~/.claude/skills -> ~/.agents/skills
   ```
   If it's a real directory instead of a symlink, the user has diverged copies — ask before touching.
3. **Copy to `.hermes` only** (`.claude` and `.pi` are symlinks — already covered):
   ```bash
   SKILL=<skill-name>
   cp -r ~/.agents/skills/$SKILL ~/.hermes/skills/
   ```
4. **Verify all 4 locations** show identical byte counts:
   ```bash
   for p in ~/.agents/skills/$SKILL ~/.claude/skills/$SKILL ~/.pi/agent/skills/$SKILL ~/.hermes/skills/$SKILL; do
     echo "$p: $(wc -c < $p/SKILL.md) bytes"
   done
   ```
   All four numbers must match. If `.claude` or `.pi` shows a different byte count, that symlink is broken — investigate before proceeding.

## Updating an Existing Distributed Skill

Same flow — re-copy from `~/.agents/skills/` to `.hermes/skills/`. The `.claude` and `.pi` symlinks update automatically. `cp -r` overwrites by default; use `rsync -a --delete` if the skill folder has nested files that may have been removed:

```bash
rsync -a --delete ~/.agents/skills/$SKILL/ ~/.hermes/skills/$SKILL/
```

## Pitfalls

- **`~/.pi/skills/` is the wrong location.** Pi Agent loads from `~/.pi/agent/skills/` only. A skill placed in `~/.pi/skills/` is invisible. If you find skills already there, they're orphans — confirm with the user before deleting.
- **`~/.claude/skills` is a symlink, not a folder.** `cp -r ~/.agents/skills/foo ~/.claude/skills/` will error with "are identical". Skip the explicit Claude copy.
- **Project-local skills exist too** — `./.pi/agent/skills/` (or `.pi/skills/`) inside a repo overrides the global one on collision (later-discovered wins). This skill only handles GLOBAL distribution.
- **`.pi/agent/skills` is a symlink → `.agents/skills`.** Don't `cp` into it (errors "are identical"); it auto-syncs. Only `.hermes/skills` is an independent copy — don't unilaterally consolidate Hermes into a symlink unless the user asks.
- **Hermes snapshots skills at session start.** A newly-distributed skill won't appear inside a running Hermes session until restart (it works fine for future sessions and for the other 3 agents immediately).
- **Filename casing matters on case-sensitive volumes.** `SKILL.md` must be uppercase.

## When NOT to Use This Skill

- Skill is project-specific → put it in `./.claude/skills/`, `./.pi/agent/skills/`, etc. inside the repo, not globally.
- Editing one agent's skill only (e.g. a Hermes-only workflow) → patch that file directly, don't propagate.
- Removing a skill globally is destructive. First show the exact skill directories
  that would be removed, confirm with the user, then use the user's preferred
  safe deletion method for `~/.agents/skills/` and `~/.hermes/skills/`.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
