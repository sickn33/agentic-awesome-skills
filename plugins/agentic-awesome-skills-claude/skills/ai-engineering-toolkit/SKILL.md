---
name: ai-engineering-toolkit
description: "6 production-ready AI engineering workflows: prompt evaluation (8-dimension scoring), context budget planning, RAG pipeline design, agent security audit (65-point checklist), eval harness building, and product sense coaching."
category: data-ai
risk: offensive
source: community
date_added: "2026-03-15"
author: viliawang-pm
tags: [prompt-engineering, rag, security, evaluation, ai-engineering, llm]
tools: [claude, cursor, gemini, copilot]
---

# AI Engineering Toolkit

## Overview

A collection of 6 structured, expert-level workflows that turn your AI coding assistant into a senior AI engineering partner. Each skill encodes a repeatable methodology — not just "ask AI to help," but a step-by-step decision framework with quantitative scoring, checklists, and decision trees.

The key difference from ad-hoc AI assistance: **every workflow produces consistent, reproducible results** regardless of who runs it or when. You can use the scoring systems as team baselines and write them into CI/CD pipelines.

## When to Use This Skill

- Use when evaluating or optimizing LLM system prompts before production deployment
- Use when designing a RAG pipeline and need structured architecture decisions (not just boilerplate code)
- Use when planning token budget allocation across context window zones
- Use when running pre-launch security audits on AI agents
- Use when building evaluation frameworks for LLM applications
- Use when thinking through product strategy before writing code

## How It Works

### Skill 1: Prompt Evaluator

Scores prompts across 8 dimensions (Clarity, Specificity, Completeness, Conciseness, Structure, Grounding, Safety, Robustness) on a 1-10 scale with weighted aggregation to a 0-100 score. Identifies the 3 weakest dimensions, generates targeted rewrites, and re-evaluates. Supports single prompt, A/B comparison, and batch evaluation modes.

### Skill 2: Context Budget Planner

Analyzes token distribution across 5 context zones (System, Few-shot, User input, Retrieval, Output) and produces an optimized allocation plan. Includes a compression strategy decision tree for each zone. Common finding: output zone squeezed to under 6% — this skill catches that before truncation happens.

### Skill 3: RAG Pipeline Architect

Walks through a complete architecture decision tree: document format → parsing strategy → chunking approach (fixed/semantic/recursive) → embedding model selection → retrieval method (vector/keyword/hybrid) → evaluation metrics (Faithfulness, Relevancy, Context Precision). Covers Naive RAG, Advanced RAG, and Modular RAG patterns.

### Skill 4: Agent Safety Guard

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

Executes a 65-point red-team audit across 5 attack categories: direct prompt injection, indirect prompt injection (via RAG documents), information extraction (system prompt / API key leakage), tool abuse (SQL injection, path traversal, command injection), and goal hijacking. The AI constructs adversarial test prompts for evaluation purposes, asks the user for confirmation before each test phase, judges pass/fail, and generates fix recommendations. All tests are contained within the evaluation context and do not interact with external systems. It is recommended to run audits in a sandboxed environment (Docker/VM).

### Skill 5: Eval Harness Builder

Designs evaluation metric systems for LLM applications. Includes LLM-as-Judge scoring framework with bias mitigation strategies (position bias, verbosity bias, self-enhancement bias). Outputs CI/CD-ready evaluation pipeline templates.

### Skill 6: Product Sense Coach

A 5-phase guided conversation framework: dig into motivation → assess market opportunity → find the path → design scenarios → analyze competition. Useful for thinking through "should we build this?" before writing any code.

## Examples

### Example 1: Prompt Evaluation

Ask: "Evaluate this system prompt"

```
You are a customer support agent. Help users with their questions. Be nice and helpful.
```

Result: Overall score **28/100**. Weakest dimensions: Safety (1/10, zero injection protection), Specificity (2/10, no output format), Structure (2/10, no sections). Auto-rewrite scores **82/100** with added scope boundaries, response format, escalation rules, and safety guardrails.

### Example 2: Security Audit

Ask: "Run a security audit on my customer support agent"

Result: 65 tests executed. 3 critical failures found: Base64-encoded instruction bypass, path traversal via tool calls, system prompt extraction via role-play. Fix recommendations provided for each.

## Best Practices

- ✅ Run prompt-evaluator before any production deployment — set a team baseline (e.g., ≥70/100)
- ✅ Use context-budget-planner early in development, not after hitting truncation issues
- ✅ Run agent-safety-guard as a pre-launch gate, not post-incident
- ✅ Combine skills in sequence: RAG design → context optimization → prompt polish → security audit → eval setup
- ❌ Don't rely on a single dimension score — look at the full profile
- ❌ Don't skip the security audit because "it's just an internal tool"

## Security & Safety Notes

- All skills are read-only analysis and advisory workflows. No skills modify files or make network requests.
- The agent-safety-guard skill constructs adversarial test prompts for evaluation purposes only — these are contained within the evaluation context and do not interact with external systems.
- **agent-safety-guard is classified as an offensive skill**: it generates attack payloads (prompt injection, SQL injection, command injection) for authorized security testing. The skill requires explicit user confirmation before executing each test phase. Run in a sandboxed environment when possible.
- No weaponized payloads are included. All adversarial prompts are educational in nature.

## Installation

```bash
# Via skill install command (Claude Code / WorkBuddy / Cursor)
/skill install -g viliawang-pm/ai-engineering-toolkit

# Manual
git clone https://github.com/viliawang-pm/ai-engineering-toolkit.git
cp -r ai-engineering-toolkit/skills/* ~/.claude/skills/
```

**Repository**: [github.com/viliawang-pm/ai-engineering-toolkit](https://github.com/viliawang-pm/ai-engineering-toolkit)
**License**: MIT

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
