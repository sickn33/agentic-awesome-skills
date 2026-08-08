---
name: folder-specific-claude-and-agents-md
description: "Create folder-scoped CLAUDE.md and AGENTS.md guidance for future agents working in that area."
category: development
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [agents-md, claude-md, documentation]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
user-invocable: true
---

# Folder CLAUDE.md Creation

## When to Use

- Use when the user asks for folder-specific agent instructions or local context files.
- Use when a subdirectory needs a CLAUDE.md and AGENTS.md handoff for future agents.

Generate a focused `CLAUDE.md` inside a target folder, plus an `AGENTS.md` symlink pointing at it. The file gives any future agent (Claude Code, Codex, etc.) the folder-specific context the global `CLAUDE.md` doesn't cover.

Background reference: `library/claude-code/claude-and-agents-md.md`.

## Process

### Step 1: Confirm the target folder + sanity-check it deserves a file
Ask the user which folder. Use absolute path under `~/Documents/code/workspace/`.

**Only create a file if the folder has context needed across multiple sessions** — active evolving work, specific conventions, ongoing decisions. A folder of static reference files does NOT need one (agents can read on demand). If unsure, ask the user.

### Step 2: Read every file in the folder IN FULL
- Use `ls -la` first to enumerate files and subfolders.
- Read every markdown, config, and key source file.
- For large tldraw/Vite subprojects: read `package.json`, `src/App.tsx`, one representative module file, and the folder's own `module-details.md`-style files.
- Do NOT skim. Do NOT skip. The user's later edits depend on you having full context.

### Step 3: Draft a bullet list of candidate content
Before writing the file, give the user a bullet list grouped by section — let them react first. Candidate sections (skip any that don't apply):

- **Product / Purpose** — what this folder/project is, current state, key metrics
- **Avatar / Audience** — who it's for (if applicable)
- **Essential Files** — one-line role for each important file, including cross-folder references (use `@path/file.md` import syntax)
- **Constraints (MUST NOT)** — explicit hard negatives. Highest-ROI content in the file.
- **Conventions** — the user's lingo, status emojis (✅ 🟡), naming patterns, "usually do" patterns
- **Locked Decisions** — things agreed + dated, must not re-litigate
- **Context** — history, authority, credibility that frames the work
- **How to work with the user** — collaboration style for this specific folder
- **Marketing Angles / Positioning** — if public-facing
- **Top Insights** — 3-5 most glaring signals from research (if research exists)

### Step 4: Iterate with the user
- Keep answers short. The user will edit directly in the IDE.
- When they edit the file, RE-READ it and flag: contradictions, typos, missing rules, wrong categorization.
- Do not revert their edits unless asked.

### Step 5: Write the file
- Path: `<folder>/CLAUDE.md`
- Start with a one-line header explaining the file's purpose.
- **Subdir file marker:** if this is a subdirectory file (parent folder already has its own CLAUDE.md), open with `Apply root CLAUDE.md first, then this file.`
- Use `##` section headers matching the sections the user approved.
- Bullets over prose. Short bullets.
- **Cross-folder references:** use `@relative/path/file.md` import syntax, not prose mentions.
- **Heavy reference docs:** annotate with `**Read when:**` triggers (e.g. "Read when: writing offer copy"). Prevents loading every session.

### Step 6: Create the AGENTS.md symlink
```
cd <folder> && ln -s CLAUDE.md AGENTS.md
```
Verify with `ls -la CLAUDE.md AGENTS.md`.

### Step 7: Commit only when asked
Do NOT stage or push unless the user says to. When they do: `git add -A`, commit with a `Day N:` style message, push.

## Rules

- **Never invent content.** Every bullet must trace back to something you read in the folder or something the user said. No generic boilerplate.
- **Brevity wins.** The user edits aggressively to make things shorter. Start tight.
- **Folder-scoped only.** Don't duplicate the global `CLAUDE.md` (personality, dates, ports, etc.). Only include what's specific to this folder.
- **No file trees, no directory dumps, no stack details the code already shows.** Anything an agent can derive from `ls` or `grep` rots fast and wastes tokens. Pin decisions, rules, and context — not structure.
- **Constraints vs Conventions.** Hard "MUST NOT" rules go in Constraints (explicit negatives). "Usually do X" patterns go in Conventions. Splitting these improves adherence.
- **No absolute ALWAYS/NEVER without explicit exceptions.** Edge cases make absolute rules get ignored. "Never commit secrets EXCEPT `.env.example`" beats "never commit secrets."
- **Never summarize or auto-shorten the file.** Context collapse degrades it. Grow deliberately, prune manually. If the user asks to trim, do it by hand.
- **Maintenance loop.** When the user corrects the agent on something this file should have prevented, add the rule to the file immediately. Don't wait.
- **No emojis unless the user uses them** (status markers ✅ 🟡 are the exception — they're already conventions).
- **Symlink, not copy.** `AGENTS.md` must be a symlink so edits stay in sync.
- **Flag gaps honestly.** If the user's edits introduce contradictions (e.g. "sell X" in one section and "never sell X" in another), call it out before they ask.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
