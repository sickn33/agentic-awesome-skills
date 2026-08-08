---
name: push-skill-to-github
description: "Commit and push skill changes to the configured skills repository after review and validation."
category: development
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [skills, git, publishing]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Push Skills to GitHub

## When to Use

- Use when skill changes are ready to commit and push to the configured skills repo.
- Use when the user asks to save or publish skill updates after validation.

For committing any skill change to the user's private skills repo, git root **`~/.agents`** (this is also the canonical skill folder; `.claude` and `.pi/agent/skills` symlink to `~/.agents/skills`). Pushes here auto-publish a sanitized public mirror to `davidondrej/skills` — never push directly to that public repo.

Use this after creating or editing a skill. If the skill is distributed to all agents, do that first (`distribute-skill-to-all-agents`), then run this to push the canonical copy.

## Steps

**Not in cmux?** (no `$CMUX_WORKSPACE_ID`): skip the cmux pane steps — just run the git commands from step 2 directly in any available terminal, then verify the push output.

1. **Open a fresh cmux pane** in the current workspace, no focus steal:
   ```bash
   cmux new-pane --type terminal --direction right --workspace "$CMUX_WORKSPACE_ID" --focus false
   cmux list-panes --workspace "$CMUX_WORKSPACE_ID"   # note the NEW pane + its surface ref
   ```
2. **Stage, commit, push** in `~/.agents` (send to the new pane's surface):
   ```bash
   cmux send --surface surface:NEW 'cd ~/.agents && git add -A && git commit -m "<concise message>" && git push'
   cmux send-key --surface surface:NEW enter
   ```
3. **Verify** the push landed:
   ```bash
   sleep 2
   cmux read-screen --surface surface:NEW | tail -15   # expect "main -> main"
   ```
4. **Close the pane** once confirmed:
   ```bash
   cmux close-surface --surface surface:NEW
   cmux list-panes --workspace "$CMUX_WORKSPACE_ID"    # confirm the pane is gone
   ```

## Notes
- Always run git from `~/.agents` (the repo root), not `~/.agents/skills`.
- Write a concise, specific commit message describing the skill change.
- Only push to GitHub when the user asks. Don't push speculatively.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
