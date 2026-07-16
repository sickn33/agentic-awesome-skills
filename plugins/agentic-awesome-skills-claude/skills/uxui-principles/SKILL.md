---
name: uxui-principles
description: "Evaluate interfaces against 168 research-backed UX/UI principles, detect antipatterns, and inject UX context into AI coding sessions."
category: design
risk: safe
source: community
date_added: "2026-04-03"
author: uxuiprinciples
tags: [ux, ui, design, evaluation, principles, antipatterns, accessibility]
tools: [claude, cursor, windsurf]
---

# UX/UI Principles

A collection of 5 agent skills for evaluating interfaces against 168 research-backed UX/UI principles, detecting antipatterns, and injecting UX context into AI-assisted design and coding sessions.

**Source:** https://github.com/uxuiprinciples/agent-skills

## Skills

| Skill | Purpose |
|-------|---------|
| `uxui-evaluator` | Evaluate interface descriptions against 168 research-backed principles |
| `interface-auditor` | Detect UX antipatterns using the uxuiprinciples smell taxonomy |
| `ai-interface-reviewer` | Audit AI-powered interfaces against 44 AI-era UX principles |
| `flow-checker` | Check user flows against decision, error, and feedback principles |
| `vibe-coding-advisor` | Inject UX context into vibe coding sessions before implementation |

## When to Use
- Auditing an existing interface for UX issues
- Checking if a UI follows research-backed best practices
- Detecting antipatterns and UX smells in designs
- Reviewing AI-powered interfaces for trust, transparency, and safety
- Getting UX guidance before or during implementation

## How It Works

1. Install any skill from the collection
2. Describe the interface, screen, or flow you want to evaluate
3. The skill evaluates against the relevant principles and returns structured findings with severity levels and remediation steps
4. Optionally connect to the uxuiprinciples.com API for enriched output with full citations

## Install

```
npx skills add uxuiprinciples/agent-skills
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
