---
name: ditto
description: "Use when a user asks to mine or update a private, evidence-backed work profile from local Claude Code, Codex, Copilot CLI, or OpenCode sessions."
category: agent-behavior
risk: safe
source: community
source_repo: ohad6k/ditto
source_type: community
date_added: "2026-07-14"
author: ohad6k
tags: [personalization, context-engineering, session-mining, agent-memory]
tools: [claude, cursor, gemini, codex-cli]
license: "MIT"
license_source: "https://github.com/ohad6k/ditto/blob/v0.3.6/LICENSE"
---

# Ditto

## Overview

Ditto mines only the user's words from real local coding-agent session logs and
turns repeated, supported patterns into private work, design, and writing
profiles. It keeps dated session receipts, rejects authored rules and memory as
source evidence, and requires approval before model-backed mining begins.

This standalone skill routes a compatible, already-installed Ditto runtime.
Native namespaced routing is available through the upstream Ditto plugin.

## When to Use This Skill

- Use when the user explicitly asks to set up, run, update, re-mine, or deepen Ditto.
- Use when the user wants an agent profile derived from real coding-session history rather than a questionnaire or rules file.
- Use when native `ditto:mine` is unavailable and the user already has a compatible Ditto runtime installed.

Do not trigger this skill merely because personalization might be useful. Mining
requires an explicit user request.

## How It Works

### 1. Resolve an installed runtime

Ask the user for the path to an existing, trusted Ditto runtime, or use the
native upstream plugin when it is already installed. Retain the exact Python 3
executable path as `PYTHON3`, the runtime path as `DITTO_PY`, and its matching
`MINING_PROMPT.md` path. Confirm the installed version and source before use.

Do not download or install executable code as part of this skill. If Ditto is
not installed, stop and direct the user to the upstream installation guidance;
installation is a separate, explicit decision.

### 2. Show the read-only mining plan

Mine only real user-authored sessions. Never synthesize a profile from
`AGENTS.md`, `CLAUDE.md`, memory files, rules files, or a typed self-description.

Run the full-history quality-default preflight:

```bash
"$PYTHON3" "$DITTO_PY" plugin preflight
```

Show the user the valid session count, post-dedupe source tokens, selected source
tokens, cache hits, planned worker calls, and planned reducer calls. Wait for
explicit approval of this displayed plan before any model-backed work.

If the user explicitly asks for a quick preview, add `--preview` and say exactly:

> Quick preview creates a starter profile from selected history, not the full profile.

Never present preview as the default or as equivalent to the full-history result.

### 3. Prepare the approved run

Retain the displayed `approval_hash`, then prepare with the exact approved mode.
For the full-history plan, run:

```bash
"$PYTHON3" "$DITTO_PY" plugin prepare --approved-plan-hash HASH
```

For an approved quick-preview plan, preserve preview mode explicitly:

```bash
"$PYTHON3" "$DITTO_PY" plugin prepare --preview --approved-plan-hash HASH
```

If the hash changes, show the new plan and obtain approval again. Retain the
returned `run_id`, assigned segment and report paths, and `pack_path`.

### 4. Mine and validate evidence

For every uncached selected segment, run one worker over only that segment and
the per-segment contract in the resolved `MINING_PROMPT.md`. Cache each JSON
report with `plugin cache-report` and stop on rejection.

Run one strongest-available reducer over only the validated reports and reducer
contract. Write the complete pack to `pack_path`, validate it, and activate only
the validated pack with `plugin activate`.

### 5. Verify and report

Run `plugin status`, render the profile card, and report:

- active version and core profile path
- active and inactive domains
- selected source tokens and actual worker/reducer passes
- cache reuse
- card path
- any exact targeted-deepen instruction

If the current host already has the native Ditto plugin, do not create a
competing direct profile installation.

## Examples

### Full-history setup

```text
User: run ditto on my coding history
Agent: resolves the pinned runtime, shows the read-only full-history plan, and
waits for explicit cost approval before starting any mining workers.
```

### Explicit quick preview

```text
User: give me a cheap ditto preview first
Agent: runs preflight with --preview, labels it as a starter profile, and waits
for approval of the displayed preview plan.
```

## Best Practices

- Keep raw sessions, caches, receipts, and generated profiles private by default.
- Report exact observed counts and paths; never estimate provider billing or coverage.
- Preserve the approval hash and mode through the complete run.
- Stop on validation failure instead of activating a partial profile.
- Share the card or a short trait, not the full private profile or receipt appendix.

## Limitations

- Ditto models working behavior; it does not make the underlying model smarter.
- Sparse or repetitive histories can leave design or writing domains inactive.
- Provider system prompts, tool traffic, and billing overhead are outside Ditto's exact token accounting.
- Quick preview has lower recall than the full-history quality default.
- Automatic work, design, and writing routing requires the upstream native plugin.

## Security & Safety Notes

- This skill does not download executable code; it requires an existing trusted Ditto installation.
- Extraction, redaction, caches, and generated profiles stay local. Selected redacted text is processed by the model provider the user chooses.
- Redaction is best-effort. Tell the user to inspect private output before sharing it.
- Never upload session logs or full profiles to a third party without explicit user approval.
- Installation itself schedules no mining model calls; every prepared mining mode still requires approval of its displayed plan.

## Common Pitfalls

- **Problem:** No eligible sessions are found.

  **Solution:** Report the supported source locations that were checked and ask whether the user has retained or exported session history.

- **Problem:** The approval hash changed.

  **Solution:** Do not reuse the old approval. Show the updated plan and obtain approval again.

- **Problem:** A cached or reduced report fails validation.

  **Solution:** Stop, preserve the failure evidence, and never activate the incomplete pack.

## Related Skills

- `@agenttrace-session-audit` - Use for cost, latency, failure, and health analysis of coding-agent sessions.
- `@agent-memory` - Use for explicit persistent knowledge storage rather than evidence-based profile mining.
