---
name: tokenwise
description: "Measurement-driven model router for Claude Code. Routes Haiku/Sonnet/Opus per task class, logs every routed task with real $ numbers, and A/B tests cheaper tiers before you trust the savings."
category: developer-tools
risk: safe
source: community
source_repo: CodeShuX/tokenwise
source_type: community
date_added: "2026-05-12"
author: CodeShuX
tags: [model-routing, token-optimization, cost-reduction, anthropic, haiku, sonnet, opus, claude-code, ab-testing, measurement]
tools: [claude]
license: "MIT"
license_source: "https://github.com/CodeShuX/tokenwise/blob/main/LICENSE"
---

# TokenWise — Measurement-Driven Model Router

## Overview

A Claude Code skill that auto-routes subtasks to the cheapest model that can handle them (Haiku for grunt work, Sonnet for scoped reasoning, Opus only for synthesis), then logs every routed task to a local NDJSON with real token + cost numbers. Includes an A/B test subcommand that runs the same task across multiple tiers and scores quality, so the routing decisions are verified against the user's real workload — not estimated.

Anthropic's own bug tracker (Issue #27665) reports 93.8% of Max-subscriber Claude Code tokens flow to Opus. Existing routers (claude-router, wshobson, VoltAgent) either pin models statically or route by vibes-based heuristics with no measurement. TokenWise fills the measurement gap.

## When to use

- Cutting Claude Code token spend without sacrificing output quality
- Validating whether Haiku/Sonnet is "good enough" for a specific task class before trusting auto-routing
- Auditing where Opus tokens are actually being burned
- Logging per-session cost data for finance or chargeback

## Subcommands

- `/tokenwise:install` — guided installer with diff preview, automatic backups, and `--dry-run` mode
- `/tokenwise:report` — per-session token + cost summary vs all-Opus baseline
- `/tokenwise:summary [--week|--month|--all]` — historical aggregate with trend
- `/tokenwise:ab "<task>"` — A/B test the same task at multiple tiers, generates a markdown comparison
- `/tokenwise:undo` — restore CLAUDE.md / settings.json from backup

## Routing taxonomy

| Tier | Model | Task class |
|---|---|---|
| Mechanical | Haiku 4.5 | file reads, grep, format, rename, simple edits, doc lookups |
| Scoped reasoning | Sonnet 4.6 | single-file refactor, scoped research, test writing |
| Synthesis | Opus 4.7 | architecture decisions, multi-file refactor, security review |

Safety caps:
- Haiku never spawns further subagents
- Max spawn depth = 2
- Subagents that need a smarter model return to parent — they never escalate on their own
- Tasks under 100 chars with no file context run inline (subagent overhead > savings)
- Subagent context >30k tokens bumps a tier

## Privacy

Zero telemetry. All logs in `.tokenwise/log.ndjson` local to the project. Task descriptions truncated to 80 chars and stripped of file contents before logging. No analytics endpoint exists in the source.

## Install

In any Claude Code session:

```
/plugin marketplace add CodeShuX/tokenwise
/plugin install tokenwise@tokenwise
```

Then run `/tokenwise:install` and follow the guided prompts.

## Limitations

- Token counts approximate to ±2% vs Anthropic billing
- A/B test mode costs extra tokens (one task × N tiers) — intentional one-time validation
- Anthropic-only by design (use LiteLLM or OpenRouter for cross-vendor)
- Subagent `model:` param has known silent-fail bugs on some Claude Code builds — skill probes for this at install and refuses to configure if routing is broken

## Source

- Repo: https://github.com/CodeShuX/tokenwise
- License: MIT
- Author: CodeShuX
