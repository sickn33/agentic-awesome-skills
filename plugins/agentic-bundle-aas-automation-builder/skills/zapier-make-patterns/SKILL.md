---
name: zapier-make-patterns
description: No-code automation democratizes workflow building. Zapier and Make (formerly Integromat) let non-developers automate business processes without writing code. But no-code doesn't mean no-complexity - these platforms have their own patterns, pitfalls, and breaking points.
metadata:
  aas-risk: critical
  aas-source: vibeship-spawner-skills (Apache 2.0)
  aas-date-added: '2026-02-27'
---

# Zapier & Make Patterns

No-code automation democratizes workflow building. Zapier and Make (formerly
Integromat) let non-developers automate business processes without writing
code. But no-code doesn't mean no-complexity - these platforms have their
own patterns, pitfalls, and breaking points.

This skill covers when to use which platform, how to build reliable
automations, and when to graduate to code-based solutions. Key insight:
Zapier optimizes for simplicity and integrations (7000+ apps), Make
optimizes for power and cost-efficiency (visual branching, operations-based
pricing).

Critical distinction: No-code works until it doesn't. Know the limits.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Zapier Example
"""
Zap Name: "Gmail New Email → Todoist Task"

TRIGGER: Gmail - New Email
  - From: specific-sender@example.com
  - Has attachment: yes

ACTION: Todoist - Create Task
  - Project: Inbox
  - Content: {{Email Subject}}
  - Description: From: {{Email From}}
  - Due date: Tomorrow
"""

## Make Example
"""
Scenario: "Gmail to Todoist"

[Gmail: Watch Emails] → [Todoist: Create a Task]

Gmail Module:
  - Folder: INBOX
  - From: specific-sender@example.com

Todoist Module:
  - Project ID: (select from dropdown)
  - Content: {{1.subject}}
  - Due String: tomorrow
"""

### Best Practices:
- Use descriptive Zap/Scenario names
- Test with real sample data
- Use filters to prevent unwanted runs

### Multi-Step Sequential Pattern

Chain of actions executed in order

**When to use**: Multi-app workflows, data enrichment pipelines

# MULTI-STEP SEQUENTIAL:

"""
[Trigger] → [Action 1] → [Action 2] → [Action 3]
Each step's output available to subsequent steps
"""

## When to Use
- User mentions or implies: zapier
- User mentions or implies: make
- User mentions or implies: integromat
- User mentions or implies: zap
- User mentions or implies: scenario
- User mentions or implies: no-code automation
- User mentions or implies: trigger action
- User mentions or implies: workflow automation
- User mentions or implies: connect apps
- User mentions or implies: automate

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
