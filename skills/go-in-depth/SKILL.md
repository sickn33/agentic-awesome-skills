---
name: go-in-depth
description: Go in depth harness — fan-out web searches, fetch sources, adversarially verify claims, synthesize a cited report.
risk: safe
source: community
date_added: "2026-07-07"
---

# Go In Depth

## Overview

Go in depth harness — fan-out web searches, fetch sources, adversarially verify claims, synthesize a cited report. Run the "go-in-depth" workflow.

## When to Use

When the user wants a deep, multi-source, fact-checked research report on any topic. BEFORE invoking, check if the question is specific enough to research directly — if underspecified (e.g., "what car to buy" without budget/use-case/region), ask 2-3 clarifying questions to narrow scope. Then pass the refined question as args, weaving the answers in.

## How It Works

Phases:
- Scope: Decompose question (from args) into 5 search angles
- Search: 5 parallel WebSearch agents, one per angle
- Fetch: URL-dedup, fetch top 15 sources, extract falsifiable claims
- Verify: 3-vote adversarial verification per claim (need 2/3 refutes to kill)
- Synthesize: Merge semantic dupes, rank by confidence, cite sources

## Examples

### Example 1: Run go-in-depth workflow
```
Workflow({ name: "go-in-depth" })
```

### Example 2: Research with refined question
```
Workflow({ name: "go-in-depth", args: { query: "best hybrid cars under $30k in the US for families" } })
```

### Example 3: Deep dive into a technical concept
```
Workflow({ name: "go-in-depth", args: { query: "how does the transformer architecture handle positional encoding?" } })
```

### Example 4: Fact-checking a medical claim
```
Workflow({ name: "go-in-depth", args: { query: "efficacy of intermittent fasting for long-term weight loss in adults" } })
```

## Workflow Script

[scripts/workflow-script.js](scripts/workflow-script.js)

## Limitations

- **Slow execution**: Multi-agent searches, fetching, and 3-vote verification take significant time. Not for quick facts.
- **Context intensive**: Analyzing 15 full sources uses large context limits.
- **Synthesis risks**: May struggle if source material is weak or equally conflicting.
