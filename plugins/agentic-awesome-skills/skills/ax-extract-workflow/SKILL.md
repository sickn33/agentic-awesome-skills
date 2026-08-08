---
name: ax-extract-workflow
description: "Reconstruct workflow behind a past coding-agent artifact using local ax sessions/commits/skills/tool traces. Use when asked how X was built."
category: development
risk: safe
source: community
source_repo: Necmttn/ax
source_type: community
date_added: "2026-06-21"
author: Necmttn
tags: [ai-coding, workflow-reconstruction, session-analysis, observability]
tools: [claude, cursor, gemini, codex-cli]
license: "AGPL-3.0-only"
license_source: "https://github.com/Necmttn/ax/blob/main/LICENSE"
---

# ax Extract Workflow

## Overview

Use this skill to reconstruct the workflow behind a past coding-agent artifact:
a shipped feature, PR, demo, refactor, report, or other concrete result. It uses
the local `ax` graph to connect commits, sessions, turns, skills, and tool traces
into a short "how this got made" narrative.

`ax` must be installed, available on `PATH`, and able to reach its local database.
If ax cannot connect to its DB, report the connection failure and stop instead of
guessing from memory.

## When to Use This Skill

- Use when the user asks "how did we build X?", "what made X work?", or "extract the workflow behind this artifact."
- Use when the anchor is a commit SHA, date, feature name, PR, session, or repo-local artifact.
- Use when the user wants the sequence of agent skills, prompts, commands, decisions, and checks that led to a result.
- Do not use for a generic activity summary; use normal session listing instead.

## How It Works

### Step 1: Resolve the Anchor

Identify the best anchor from the user's request:

- Commit SHA: use it directly.
- Date or date range: inspect sessions around the date.
- Topic, feature, or artifact name: search recall for related turns, commits, and skills.
- "This repo recently": list recent sessions for the current repo.

```bash
ax recall "live ingest dashboard" --sources=turn,commit,skill --scope=here
ax sessions near abc1234 --json
ax sessions around 2026-06-15 --days=3 --json
ax sessions here --days=14
```

These commands are read-only inspection commands.

### Step 2: Pick Relevant Sessions

Choose the few sessions most likely to explain the artifact. Prefer sessions
that mention the artifact, touch related files, include relevant commits, or have
skills and tool calls that match the work.

If several candidates are plausible, show the user the candidates and ask which
one to inspect.

### Step 3: Inspect the Session Trail

Open each selected session and look for:

- skills used and their order
- user steering points and clarified constraints
- files, tests, and commands that changed the direction of the work
- subagent or tool traces that produced key evidence
- verification steps before the result was considered done

```bash
ax sessions show <session-id> --json
ax sessions show <session-id> --by-role
ax recall "specific keyword from the artifact" --sources=turn,commit --scope=here
```

### Step 4: Write the Reconstruction

Return the result inline unless the user asks for a file. Keep it short and
evidence-grounded:

1. Anchor: the date, commit, feature, or artifact you resolved.
2. Ordered workflow: 4-8 steps showing the skill or action and what it produced.
3. Key decisions: the user or agent choices that changed the path.
4. Verification: tests, reviews, checks, or manual evidence.
5. Reproducer brief: the compact recipe for doing similar work again.

Use session IDs, commit SHAs, and file paths as citations when available.

## Examples

### Reconstruct a Feature from a Commit

```bash
ax sessions near 8f31c2a --json
ax sessions show <session-id> --by-role
ax sessions show <session-id> --json
```

Output shape:

```text
Anchor: 8f31c2a, live ingest dashboard

Workflow:
1. Problem framing -> narrowed the failure to stale dashboard polling.
2. Session recall -> found the earlier ingest-stream design and constraints.
3. Implementation -> wired the server event bus and browser subscription.
4. Verification -> ran typecheck and refreshed the dashboard locally.

Reproducer brief:
Start from the failing artifact, find nearby sessions, inspect role-grouped
skills, then summarize the smallest ordered path from framing to verification.
```

### Reconstruct Work Around a Date

```bash
ax sessions around 2026-06-15 --days=2 --json
ax recall "otel receiver" --sources=turn,commit,skill --scope=here
```

Use this when the user remembers when the work happened but not the commit.

## Best Practices

- Start from the most concrete anchor available: SHA beats date, date beats vague topic.
- Treat ax as the source of truth; do not invent missing skills, costs, commands, or decisions.
- Quote sparingly and only when a user decision or command matters to the reconstruction.
- Keep private transcript details private; summarize rather than dumping logs.
- Separate "what happened" from "what to repeat next time."

## Limitations

- Requires a working local ax installation and reachable local ax database.
- Only sees sessions, commits, skills, and tool traces that ax has ingested.
- Session data can be incomplete when an agent provider omits tool output, cost, or reasoning data.
- It reconstructs workflow, not correctness; still inspect the code and run project checks when making engineering decisions.

## Security & Safety Notes

- Do not upload private transcripts, session logs, prompts, tool outputs, or local database exports.
- Redact secrets, tokens, customer data, file contents, and private conversation text from summaries.
- Use read-only ax inspection commands unless the user explicitly asks for a separate maintenance action.
- Do not run commands that mutate `.ax/`, regenerate indexes, publish reports, or alter repositories as part of reconstruction.

## Related Skills

- `@agenttrace-session-audit` - Use for local agent-session health, cost, latency, and tool-failure audits.
- `@domain-modeling` - Use when the reconstruction reveals terminology or architectural decisions that should be captured.
- `@planning-with-files` - Use when the user wants to turn the reconstructed recipe into a new plan with tracked notes.
