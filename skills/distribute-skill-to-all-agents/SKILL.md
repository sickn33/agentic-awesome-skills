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

## Discover actual host locations

The upstream author used `~/.agents/skills`, `~/.claude/skills`, `~/.pi/agent/skills` and `~/.hermes/skills`. These are candidate paths, not facts about this user’s machine or discovery precedence. Inspect only authorized configured hosts and their documented skill paths; do not create an absent host or replace a real directory with a symlink merely to match the upstream layout.

## Workflow

1. Identify the canonical reviewed source and exact target hosts from the user’s request. Read the entire skill tree and preserve bundled files, attribution and license.
2. Inspect each destination with `ls -ld` and resolve links. Record source and destination real paths; skip aliases of the same tree and reject unexpected links outside the authorized location.
3. Back up an existing independent target privately. Preview a file-level diff, including deletions and modes; resolve local divergence before overwriting. Validate the skill ID as one directory name and quote paths.
4. Copy only the selected tree to the authorized independent destination. When removal of obsolete files is necessary, preview deletion with a dry run before applying; never use a broad global `rsync --delete` target.
5. Compare relative file lists and cryptographic content hashes for every file, plus relevant modes and links. Equal SKILL.md byte counts do not prove tree equality or a correct symlink.
6. Verify discovery through each host’s actual mechanism. Report installed bytes separately from a running session reload; reload only the authorized host when required and preserve unrelated sessions.

## Updating an existing distributed skill

Repeat the same source/target, divergence, backup and whole-tree verification procedure. Do not propagate host-specific credentials, private memory or unreviewed executable files. A global installation request does not authorize publishing the skill or changing host permission stores.

## When NOT to Use This Skill

- Skill is project-specific → put it in `./.claude/skills/`, `./.pi/agent/skills/`, etc. inside the repo, not globally.
- Editing one agent's skill only (e.g. a Hermes-only workflow) → patch that file directly, don't propagate.
- Removing a skill globally is destructive. First show the exact skill directories
  that would be removed, confirm with the user, then use the user's preferred
  safe deletion method for `~/.agents/skills/` and `~/.hermes/skills/`.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.

## Example: distribute one reviewed skill

The user requests the reviewed `release-notes` skill for their already-configured Claude host. The canonical source is `/workspace/team-skills/release-notes`; the verified host skill folder is `$HOME/.claude/skills`.

1. Inspect `ls -ld "$HOME/.claude/skills" "$HOME/.claude/skills/release-notes"` (an absent skill target is expected for a first install). Resolve the parent and source paths; if the destination already resolves to the source, skip copying and verify discovery instead.
2. For an independent existing destination, compare its whole tree to the source and privately back it up before resolving divergence. For a new target, preview `rsync -an --itemize-changes /workspace/team-skills/release-notes/ "$HOME/.claude/skills/release-notes/"`. Confirm the preview includes only that reviewed tree.
3. Apply the same narrowly scoped copy with `rsync -a /workspace/team-skills/release-notes/ "$HOME/.claude/skills/release-notes/"`. These commands omit deletion: obsolete destination files require a separate explicit deletion preview.
4. Compare all relative paths, file hashes, modes and symlink targets against the source, then use the configured Claude host’s documented discovery/reload mechanism. Report the verified installed tree and whether the active session actually discovered it. No other host folder is created by this example.
