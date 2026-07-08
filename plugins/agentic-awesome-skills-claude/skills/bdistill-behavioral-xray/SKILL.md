---
name: bdistill-behavioral-xray
description: "X-ray any AI model's behavioral patterns — refusal boundaries, hallucination tendencies, reasoning style, formatting defaults. No API key needed."
category: ai-testing
risk: safe
source: community
date_added: "2026-03-20"
author: FrancyJGLisboa
tags: [ai, testing, behavioral-analysis, model-evaluation, red-team, compliance, mcp]
tools: [claude, cursor, codex, copilot]
---

# Behavioral X-Ray

Systematically probe an AI model's behavioral patterns and generate a visual report. The AI agent probes *itself* — no API key or external setup needed.

## Overview

bdistill's Behavioral X-Ray runs 30 carefully designed probe questions across 6 dimensions, auto-tags each response with behavioral metadata, and compiles results into a styled HTML report with radar charts and actionable insights.

Use it to understand your model before building with it, compare models for task selection, or track behavioral drift over time.

## When to Use This Skill

- Use when you want to understand how your AI model actually behaves (not how it claims to)
- Use when choosing between models for a specific task
- Use when debugging unexpected refusals, hallucinations, or formatting issues
- Use for compliance auditing — documenting model behavior at deployment boundaries
- Use for red team assessments — systematic boundary mapping across safety dimensions

## How It Works

### Step 1: Install

```bash
pip install bdistill
claude mcp add bdistill -- bdistill-mcp   # Claude Code
```

For other tools, add bdistill-mcp as an MCP server in your project config.

### Step 2: Run the probe

In Claude Code:
```
/xray                          # Full behavioral probe (30 questions)
/xray --dimensions refusal     # Probe just one dimension
/xray-report                   # Generate report from completed probe
```

In any tool with MCP:
```
"X-ray your behavioral patterns"
"Test your refusal boundaries"
"Generate a behavioral report"
```

## Probe Dimensions

| Dimension | What it measures |
|-----------|-----------------|
| **tool_use** | When does it call tools vs. answer from knowledge? |
| **refusal** | Where does it draw safety boundaries? Does it over-refuse? |
| **formatting** | Lists vs. prose? Code blocks? Length calibration? |
| **reasoning** | Does it show chain-of-thought? Handle trick questions? |
| **persona** | Identity, tone matching, composure under hostility |
| **grounding** | Hallucination resistance, fabrication traps, knowledge limits |

## Output

A styled HTML report showing:
- Refusal rate, hedge rate, chain-of-thought usage
- Per-dimension breakdown with bar charts
- Notable response examples with behavioral tags
- Actionable insights (e.g., "you already show CoT 85% of the time, no need to prompt for it")

## Best Practices

- Answer probe questions honestly — the value is in authentic behavioral data
- Run probes on the same model periodically to track behavioral drift
- Compare reports across models to make informed selection decisions
- Use adversarial knowledge extraction (`/distill --adversarial`) alongside behavioral probes for complete model profiling

## Related Skills

- `@bdistill-knowledge-extraction` - Extract structured domain knowledge from any AI model

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
