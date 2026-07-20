---
name: humanlayer
description: "Integration patterns for HumanLayer SDK: human-in-the-loop and human-as-tool workflows for autonomous agents"
category: development
risk: safe
source: self
source_type: self
date_added: "2026-07-16"
---

# HumanLayer SDK Integration

## Overview
HumanLayer provides tools to deterministically guarantee human oversight of high-stakes function calls in LLM agents. It bridges the gap between Gen 2 (Agentic Assistants) and Gen 3 (Autonomous Agents) by providing mechanisms like `require_approval` and `human_as_tool`.

Note: The legacy SDKs are deprecated in favor of CodeLayer, but the core patterns and architectural concepts for human-in-the-loop remain valid and can be referenced from this repository.

## When to Use This Skill
- Use when designing autonomous agents that perform high-stakes operations (e.g., writing to production databases, sending emails on behalf of users).
- Use when an agent needs to pause execution and wait for human input/approval (`human_as_tool`).
- Use when analyzing architectures for "outer loop" agents.

## Core Concepts

### 1. Function Stakes
Understand the difference in risk levels for agent actions:
- **Low Stakes**: Read public data, internal agent logging.
- **Medium Stakes**: Read private data, send emails using strict hard-coded templates.
- **High Stakes**: Send arbitrary emails/messages on behalf of users, modify production data, update billing. **These require HumanLayer.**

### 2. `require_approval` Pattern
For high-stakes tools, wrap the function with an approval mechanism. Even if the LLM hallucinates or makes a mistake, the tool itself requires human confirmation before executing the side-effect.

### 3. `human_as_tool` Pattern
Give the agent a tool that allows it to explicitly reach out to a human (via email, Slack, etc.) to ask a clarifying question or request additional information, then suspend its execution until the human responds.

## Development Conventions in this Repo
If you are contributing to or reading the `humanlayer` repository:
- `TODO(0)`: Critical - never merge
- `TODO(1)`: High - architectural flaws, major bugs
- `TODO(2)`: Medium - minor bugs, missing features
- `TODO(3)`: Low - polish, tests, documentation
- `TODO(4)`: Questions/investigations needed
- `PERF`: Performance optimization opportunities

## Limitations
- The legacy SDKs are deprecated and their specific API details may no longer be fully applicable.
- Human-in-the-loop workflows introduce latency as agents must wait for human responses.
