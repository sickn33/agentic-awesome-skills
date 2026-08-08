---
name: context-kit
description: "Evaluate, adapt, and safely install Context Kit personal context artifacts for Claude Code or adjacent agent workflows."
category: productivity
risk: critical
source: community
source_repo: JDDavenport/context-kit
source_type: community
date_added: "2026-07-04"
author: JDDavenport
tags: [personal-context, claude-code, memory, knowledge-management, agent-workflows]
tools: [claude, codex, cursor, gemini]
---

# Context Kit

## When to Use

Use this skill when the user wants to:

- Set up durable personal context files for Claude Code or another coding agent
- Compare Context Kit's Personal Context Artifact pattern with an existing memory or project-notes system
- Adapt a context template structure without copying private details into the chat
- Review whether a one-line installer or downloaded skill pack is appropriate before running it
- Create a safer, local-first plan for CRM notes, open loops, session digests, or morning briefings

## Overview

Context Kit is an external project that organizes personal context into Markdown artifacts and companion
Claude Code skills. This skill helps the user decide what to adopt, where to store it, and how to avoid
turning a useful context system into a pile of sensitive data.

Treat every personal context file as private by default. These files may contain identity details, family
context, work history, contact notes, mental models, health constraints, or relationship information. Do
not paste them into third-party tools, public repositories, issue trackers, or model contexts unless the
user explicitly approves the exact subset.

## Safety Rules

1. Do not run a remote install script until the user has seen the command, source repository, and target
   paths it will write to.
2. Prefer cloning or downloading the repository for inspection before executing any installer:
   ```bash
   git clone https://github.com/JDDavenport/context-kit.git
   cd context-kit
   sed -n '1,220p' scripts/install.sh
   ```
3. Never store passwords, API keys, recovery codes, private keys, session tokens, or payment details in
   personal context artifacts.
4. If the user wants contact notes or CRM files, store only information they are comfortable keeping in
   local plaintext Markdown.
5. Before adding these files to a repo, confirm `.gitignore` excludes the chosen private context directory.
6. If adapting Context Kit to a team or company setting, separate personal context from company-confidential
   or customer-confidential information.

## Setup Workflow

1. Ask what the user wants Context Kit to improve: session startup context, voice consistency, relationship
   memory, open-loop tracking, daily briefings, or handoff summaries.
2. Inspect the upstream project and installer before running anything.
3. Choose a storage location:
   - Claude Code default: `~/.claude/context/` and `~/.claude/skills/`
   - Project-local context: `.agent/context/` or another ignored directory
   - Portable setup: a private notes repo with explicit sync rules
4. Create a minimal starter set before filling everything:
   - `pca-wiki.md` for durable identity and domains
   - `pca-mental-models.md` for decision rules
   - `pca-voice.md` for writing preferences
   - `pca-protocols.md` for hard rules and boundaries
5. Add only enough detail to make the next agent session useful. Leave sensitive, speculative, or outdated
   details out until there is a clear reason to include them.
6. Add a recurring review cadence. Personal context goes stale quickly; stale context is worse than no
   context when it drives decisions.

## Installation Review Checklist

Before running an installer, verify:

- The repository URL is exactly the one the user intended
- The script writes only to expected local directories
- The script does not upload files, send telemetry, or edit shell startup files unexpectedly
- The target directories are not inside a public repo
- The user has a rollback path, such as removing the copied templates and skills

If anything is unclear, stop at inspection and provide the user with the exact lines that need review.

## Examples

### Example: Inspect before installing

```bash
git clone https://github.com/JDDavenport/context-kit.git
cd context-kit
sed -n '1,220p' scripts/install.sh
find templates skills -maxdepth 2 -type f | sort
```

After inspection, summarize the files that would be installed and ask for confirmation before running the
installer.

### Example: Create a private project-local context directory

```bash
mkdir -p .agent/context
printf '.agent/context/\n' >> .gitignore
cp ~/Downloads/context-kit/templates/pca-wiki.md .agent/context/pca-wiki.md
```

Then trim the template to the minimum useful fields for the project instead of filling every personal
section immediately.

## Best Practices

- Keep context files short enough that an agent can read them at session start without drowning in stale
  detail.
- Separate durable facts from temporary state. Use project workplans or task trackers for temporary state.
- Label assumptions and uncertain memories instead of presenting them as facts.
- Review personal context after major life, role, health, or project changes.
- Store voice examples and anti-examples separately from private identity details when possible.

## Common Pitfalls

- Running a shell installer directly from `curl` without inspecting it first
- Committing personal context files to a public repository
- Storing secrets because "the agent needs to know everything"
- Letting relationship or health notes become outdated and still treating them as current
- Copying upstream paid or license-unclear content instead of linking to it or writing original local notes

## Limitations

- This skill does not verify the current upstream license or installer behavior on its own; inspect the live
  repository before running commands.
- It does not replace a dedicated secrets manager, CRM, password vault, or medical record system.
- It is for local personal context hygiene, not for collecting private information about other people
  without a legitimate reason.
