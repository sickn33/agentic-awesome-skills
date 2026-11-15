---
name: tokenwise
description: "Measurement-driven model router for Claude Code. Routes Haiku/Sonnet/Opus per task class, logs every routed task with real $ numbers, and A/B tests cheaper tiers before you trust the savings."
category: developer-tools
risk: critical
source: community
source_repo: CodeShuX/tokenwise
source_type: community
date_added: "2026-05-12"
author: CodeShuX
tags: [model-routing, token-optimization, cost-reduction, anthropic, haiku, sonnet, opus, claude-code, ab-testing, measurement]
tools: [claude]
license: "MIT"
license_source: "https://github.com/CodeShuX/tokenwise/blob/main/LICENSE"
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# TokenWise — Measurement-Driven Model Router

## Overview

The upstream package advertises model-tier routing, local NDJSON usage logs and an A/B comparison command. Evaluate those capabilities only in an installed, reviewed revision with the user's authorized model budget and actual workload. Task difficulty, response-quality rubrics and reported costs remain estimates unless independently measured.

This entry describes the upstream workflow; it does not bundle its commands or measurement implementation. Verify the installed revision, supported models and actual routing behavior before relying on a report. A user's workload and billing plan determine whether routing reduces paid usage.

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

Upstream describes project-local logs at `.tokenwise/log.ndjson`. Inspect the installed revision and dependencies for log contents, redaction, retention and network behavior; this single-file catalog entry cannot establish zero telemetry. Model routing and A/B runs send task context to the selected provider. Exclude secrets and obtain authorization for additional provider usage; keep logs out of public commits.

## Install

In any Claude Code session:

```
/plugin marketplace add CodeShuX/tokenwise
/plugin install tokenwise@tokenwise
```

Then run `/tokenwise:install` and follow the guided prompts.

## Limitations

- Treat reported costs as estimates until reconciled with actual provider usage and current pricing; no billing-error bound is established by this catalog entry
- A/B test mode costs extra tokens (one task × N tiers) — intentional one-time validation
- Anthropic-only by design (use LiteLLM, OpenRouter, or [Bifrost](https://github.com/maximhq/bifrost) for cross-vendor)
- Verify the selected model in actual execution evidence; do not assume a model parameter or an installer probe guarantees that a specific client build honored routing

## Source

- Repo: https://github.com/CodeShuX/tokenwise
- License: MIT
- Author: CodeShuX
