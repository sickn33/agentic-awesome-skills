---
name: tool-use-guardian
description: "FREE — Intelligent tool-call reliability wrapper. Monitors, retries, fixes, and learns from tool failures. Auto-recovers from truncated JSON, timeouts, rate limits, and mid-chain failures."
category: reliability
risk: safe
source: community
date_added: "2026-03-13"
author: christopherlhammer11-ai
tags: [reliability, tool-use, error-handling, retries, recovery, agent-infrastructure]
tools: [claude, cursor, codex, gemini, copilot, windsurf, antigravity]
---

# Tool Use Guardian

## Overview

The reliability wrapper every AI agent needs. Monitors tool calls, auto-retries failures, fixes truncated responses, and learns which tools are unreliable — so you never lose your chain of thought.

Free forever. Built by the Genesis Agent Marketplace.

## Install

```bash
npx skills add christopherlhammer11-ai/tool-use-guardian
```

## When to Use This Skill

- Use when tool calls return truncated or malformed JSON
- Use when APIs timeout or rate-limit your agent mid-task
- Use when a multi-step chain breaks partway through
- Use when you need automatic retry logic without writing it yourself
- Use for any agent workflow that depends on external tool reliability

## How It Works

### Step 1: Pre-Call Validation

Before every tool call, Guardian validates:
- Required parameters are present and correctly typed
- The tool is not marked as "unreliable" from previous failures
- Request size is within known limits

### Step 2: Failure Classification

When a tool call fails, Guardian classifies the failure into one of 9 categories:

| Failure Type | Recovery Action |
|---|---|
| Truncated JSON | Re-fetch with pagination or smaller chunks |
| API Timeout | Retry once with simpler request, then decompose |
| Rate Limit (429) | Exponential backoff, max 3 retries |
| Auth Expired | Flag for user intervention |
| Mid-chain Break | Resume from last successful checkpoint |
| Error-as-200 | Detect `{"error": "..."}` disguised as success |
| Schema Mismatch | Attempt auto-coercion, warn if lossy |
| Network Failure | Retry with jitter, max 2 attempts |
| Unknown Error | Log full context, escalate to user |

### Step 3: Chain Protection

For multi-step tool chains, Guardian maintains checkpoints. If step 4 of 7 fails, it resumes from step 4 — never restarts from scratch.

### Step 4: Learning

Guardian tracks failure patterns per tool. After 3+ failures of the same type, it marks the tool as unreliable and suggests alternatives.

## Best Practices

- ✅ Let Guardian wrap all external tool calls automatically
- ✅ Review Guardian's reliability reports to identify flaky tools
- ✅ Use checkpoint recovery for long chains
- ❌ Don't disable retry logic for rate-limited APIs
- ❌ Don't ignore repeated failure warnings

## Related Skills

- `@recallmax` - Long-context memory enhancement (also free from Genesis Marketplace)

## Links

- **Repo:** https://github.com/christopherlhammer11-ai/tool-use-guardian
- **Marketplace:** https://genesis-node-api.vercel.app
- **Browse skills:** https://genesis-marketplace.vercel.app

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
