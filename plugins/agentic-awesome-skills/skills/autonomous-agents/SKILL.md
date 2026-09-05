---
name: autonomous-agents
description: Autonomous agents are AI systems that can independently decompose
  goals, plan actions, execute tools, and self-correct without constant human
  guidance. The challenge isn't making them capable - it's making them reliable.
  Every extra decision multiplies failure probability.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Autonomous Agents

Autonomous agents are AI systems that can independently decompose goals,
plan actions, execute tools, and self-correct without constant human guidance.
The challenge isn't making them capable - it's making them reliable. Every
extra decision multiplies failure probability.

This skill covers agent loops (ReAct, Plan-Execute), goal decomposition,
reflection patterns, and production reliability. Key insight: compounding
error rates kill autonomous agents. A 95% success rate per step drops to
60% by step 10. Build for reliability first, autonomy second.

2025 lesson: The winners are constrained, domain-specific agents with clear
boundaries, not "autonomous everything." Treat AI outputs as proposals,
not truth.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Track context usage
class ContextManager:
    def __init__(self, max_tokens=100000):
        self.max_tokens = max_tokens
        self.messages = []

    def add(self, message):
        self.messages.append(message)
        self.maybe_compact()

    def maybe_compact(self):
        if self.token_count() > self.max_tokens * 0.8:
            self.compact()

    def compact(self):
        # Always keep: system prompt
        system = self.messages[0]

        # Always keep: last N messages
        recent = self.messages[-10:]

        # Summarize: everything else
        middle = self.messages[1:-10]
        if middle:
            summary = summarize_messages(middle)
            self.messages = [system, summary] + recent

## When to Use
- User mentions or implies: autonomous agent
- User mentions or implies: autogpt
- User mentions or implies: babyagi
- User mentions or implies: self-prompting
- User mentions or implies: goal decomposition
- User mentions or implies: react pattern
- User mentions or implies: agent loop
- User mentions or implies: self-correcting agent
- User mentions or implies: reflection agent
- User mentions or implies: langgraph
- User mentions or implies: agentic ai
- User mentions or implies: agent planning

## Example

**User request:**

> Use @autonomous-agents for this task: Autonomous agents are AI systems that can independently decompose goals, plan actions, execute tools, and self-correct without constant human guidance.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
