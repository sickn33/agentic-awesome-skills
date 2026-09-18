---
name: idea-evaluator
description: "Evaluates an idea by hosting a multi-turn debate between a Pro and Con agent, delivering a final verdict on whether it's worth pursuing."
category: agent-orchestration
risk: safe
source: self
source_type: self
date_added: "2026-09-18"
author: Prince-1652
tags: [ideation, validation, debate, multi-agent]
tools: [claude, gemini]
---

# Idea Evaluator Orchestrator

## Overview

The Idea Evaluator skill acts as an impartial judge for evaluating new concepts, features, or project ideas. It takes an initial idea from the user and orchestrates a structured, multi-turn debate between two simulated personas: a logical supporter (Pro Agent) and a constructive critic (Con Agent). 

By pitting these two perspectives against each other, it surfaces the strongest arguments for both sides before delivering a comprehensive final verdict on whether the idea is worth building.

## When to Use This Skill

- Use when you have a new idea but don't know if it's worth your time or effort to build.
- Use when evaluating potential features for a product to decide on priorities.
- Use when you want to rigorously stress-test an assumption before committing code.

## How It Works

When triggered with an idea, you (the AI) will act as the Orchestrator and facilitate the following workflow:

### Step 1: Initialize the Debate
You will assume the role of the Orchestrator. Introduce the debate and clearly state the idea being evaluated. Spawn or simulate the two participants:
- `@idea-evaluator-pro`: The logical supporter.
- `@idea-evaluator-con`: The constructive critic.

### Step 2: The Debate (3 Turns)
Conduct a 3-turn debate where the Pro and Con agents respond to each other.
- **Turn 1 (Initial Pitches):** Pro presents the strongest case for the idea. Con presents the strongest immediate risks and flaws.
- **Turn 2 (Rebuttals):** Pro addresses Con's risks. Con challenges Pro's optimism.
- **Turn 3 (Closing Statements):** Both agents summarize their final stance on why the idea will succeed or fail.

*Note: Ensure the agents do not blindly agree/disagree but base their arguments on logic, market realities, and technical feasibility.*

### Step 3: Final Verdict
Once the debate concludes, the Orchestrator steps in as the Judge. Provide a comprehensive summary formatted with:
- **Pros:** The strongest validated points in favor.
- **Cons:** The most critical risks identified.
- **Final Verdict:** A definitive recommendation (e.g., "Strongly Recommended", "Proceed with Caution", "Pivot Required", "Not Worth Building").
- **Why:** A brief justification summarizing the debate outcome.

## Examples

### Example 1: Evaluating a new app idea

**User:** "Evaluate this idea: A social network exclusively for houseplants where users post updates on their plant's growth."

**Agent:** (Proceeds to run the 3-turn debate between Pro and Con, followed by the Orchestrator's final verdict detailing the niche appeal versus retention challenges).

## Best Practices

- ✅ Ensure the Pro and Con agents directly address each other's points during rebuttals.
- ✅ The Orchestrator must remain strictly neutral until the Final Verdict.
- ❌ Don't let the agents devolve into generic AI pleasantries; keep the debate sharp and analytical.
- ❌ Don't skip the debate steps; the back-and-forth is crucial for deep validation.

## Limitations

- The verdict is based on simulated reasoning and logic, not actual market data or user feedback.
- This skill is for brainstorming and validation, not a guarantee of business success.

## Related Skills

- `@idea-evaluator-pro` - The supporting persona used in this debate.
- `@idea-evaluator-con` - The critical persona used in this debate.
