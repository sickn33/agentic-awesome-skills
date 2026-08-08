---
name: idea-darwin
description: "Darwinian idea evolution engine — toss rough ideas onto an evolution island, let them compete, crossbreed, and mutate through structured rounds to surface your strongest concepts."
risk: safe
source: community
date_added: "2026-04-07"
---

# Idea Darwin Engine

A round-based idea iteration system that treats ideas as competing organisms — scoring, selecting, crossing, and evolving them through structured rounds to surface the strongest concepts.

## Overview

Most idea management tools are filing cabinets: they store ideas, tag them, and let them rot. Idea Darwin flips the paradigm — instead of organizing ideas, it lets them **compete**. Every idea is a living species on an evolution island. Each round, the fittest get deepened, different ideas cross-pollinate to produce unexpected hybrids, and external stimuli trigger mutations.

## When to Use This Skill

- Use when you have many scattered ideas and need to systematically evaluate and develop them
- Use when you want to discover unexpected connections between ideas from different domains
- Use when you need structured iteration rather than one-shot brainstorming
- Use when you want a scoring framework to prioritize which ideas deserve more investment

## Core Concepts

### Evolution Island Metaphor

Your ideas are alive on this island. Like organisms, they follow three core laws:

1. **Evolution** — Each round, the system deepens the most viable ideas through structured research: filling logical gaps, clarifying paths, identifying risks.
2. **Crossbreeding** — The system cross-pollinates different ideas. A technical approach from work meets an observation from daily life, producing directions you never imagined.
3. **Mutation** — External stimuli (industry news, theories, conversations) trigger mutations, spawning entirely new species.

### Species Cards

Every idea gets a structured card recording: core question, full description, lineage (parent/child IDs), 6-dimensional scores, and change history.

### 6-Dimensional Scoring

| Dimension | Weight | What It Measures |
|---|---|---|
| Novelty | 10% | Genuine breakthrough or repetition? |
| Feasibility | 20% | Technically and resource-wise achievable? |
| Value | 20% | Impact if successful? |
| Logic | 20% | Internally consistent, no gaps? |
| Cross Potential | 10% | Can spark something new when combined? |
| Verifiability | 20% | Can we design a validation path? |

### Idea Lifecycle

```
seed → exploring → refining → crossing → validated → dormant
```

The user always has final say on all life-or-death decisions. The system only recommends.

## Step-by-Step Guide

### 1. Write Your Ideas

Create an `ideas.md` file:

```markdown
## Personal knowledge base that learns my style
I want a system that reads everything I write and gradually learns how I think.

## Commute-to-podcast converter
Record voice memos during my commute, auto-convert them into podcast scripts.
```

### 2. Initialize Your Island

```
/idea-darwin init
```

### 3. Start Evolving

```
/idea-darwin round
```

### 4. Keep Feeding the Island

Append new ideas to `ideas.md`, add environmental variables to `stimuli.md`.

## Examples

### Example 1: Initialize

```
/idea-darwin init --budget 8 --actions 3
```

### Example 2: Run Multiple Rounds

```
/idea-darwin round 3
```

### Example 3: Manage Ideas

```
/idea-darwin dormant IDEA-0005
/idea-darwin wake IDEA-0005
```

## Best Practices

- Do: Write ideas as rough as you want — the system structures them
- Do: Add external stimuli to prevent idea convergence
- Do: Run disruption rounds to surface overlooked ideas
- Don't: Over-curate initial ideas — let evolution filter
- Don't: Ignore the "Decisions Needed" section in briefings

## Additional Resources

- [GitHub Repository](https://github.com/warmskull/idea-darwin)
- Available in 3 languages: English, Chinese, Japanese
- ClawHub: `clawhub install idea-darwin`

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
