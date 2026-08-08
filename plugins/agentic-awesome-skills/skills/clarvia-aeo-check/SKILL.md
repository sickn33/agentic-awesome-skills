---
name: clarvia-aeo-check
description: "Score any MCP server, API, or CLI for agent-readiness using Clarvia AEO (Agent Experience Optimization). Search 15,400+ indexed tools before adding them to your workflow."
category: tool-quality
risk: safe
source: community
date_added: "2026-03-27"
author: digitamaz
tags: [mcp, aeo, tool-quality, agent-readiness, api-scoring, clarvia]
tools: [claude, cursor, windsurf, cline]
---

# Clarvia AEO Check

## Overview

Before adding any MCP server, API, or CLI tool to your agent workflow, use Clarvia to score its agent-readiness. Clarvia evaluates 15,400+ AI tools across four AEO dimensions: API accessibility, data structuring, agent compatibility, and trust signals.

## Prerequisites

Add Clarvia MCP server to your config:

```json
{
  "mcpServers": {
    "clarvia": {
      "command": "npx",
      "args": ["-y", "clarvia-mcp-server"]
    }
  }
}
```

## When to Use This Skill

- Use when evaluating a new MCP server before adding it to your config
- Use when comparing two tools for the same job
- Use when building an agent that selects tools dynamically
- Use when you want to find the highest-quality tool in a category

## How It Works

### Step 1: Score a specific tool

Ask Claude to score any tool by URL or name:

```
Score https://github.com/example/my-mcp-server for agent-readiness
```

Clarvia returns a 0-100 AEO score with breakdown across four dimensions.

### Step 2: Search tools by category

```
Find the top-rated database MCP servers using Clarvia
```

Returns ranked results from 15,400+ indexed tools.

### Step 3: Compare tools head-to-head

```
Compare supabase-mcp vs firebase-mcp using Clarvia
```

Returns side-by-side score breakdown with a recommendation.

### Step 4: Check leaderboard

```
Show me the top 10 MCP servers for authentication using Clarvia
```

## Examples

### Example 1: Evaluate before installing

```
Before I add this MCP server to my config, score it:
https://github.com/example/new-tool

Use the clarvia aeo_score tool and tell me if it's agent-ready.
```

### Example 2: Find best tool in category

```
I need an MCP server for web scraping. Use Clarvia to find the 
top-rated options and compare the top 3.
```

### Example 3: CI/CD quality gate

Add to your CI pipeline using the GitHub Action:

```yaml
- uses: clarvia-project/clarvia-action@v1
  with:
    url: https://your-api.com
    fail-under: 70
```

## AEO Score Interpretation

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Agent Native | Built specifically for agent use |
| 70-89 | Agent Friendly | Works well, minor gaps |
| 50-69 | Agent Compatible | Works but needs improvement |
| 30-49 | Agent Partial | Significant limitations |
| 0-29 | Not Agent Ready | Avoid for agentic workflows |

## Best Practices

- ✅ Score tools before adding them to long-running agent workflows
- ✅ Use Clarvia's leaderboard to discover alternatives you haven't considered
- ✅ Re-check scores periodically — tools improve over time
- ❌ Don't skip scoring for "well-known" tools — even popular tools can score poorly
- ❌ Don't use tools scoring below 50 in production agent pipelines without understanding the limitations

## Common Pitfalls

- **Problem:** Clarvia returns "not found" for a tool
  **Solution:** Try scanning by URL directly with `aeo_score` — Clarvia will score it on-demand

- **Problem:** Score seems low for a tool I trust
  **Solution:** Use `get_score_breakdown` to see which dimensions are weak and decide if they matter for your use case

## Related Skills

- `@mcp-builder` - Build a new MCP server that scores well on AEO
- `@agent-evaluation` - Broader agent quality evaluation framework

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
