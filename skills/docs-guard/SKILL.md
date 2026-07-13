---
name: docs-guard
description: Enforces documentation standards — README, API docs, inline comments, and documentation quality.
metadata:
  documentation:
    risk: safe
  category: quality
  author: amElnagdy
  version: 1.0.0
  source: https://github.com/amElnagdy/guard-skills
---

# Docs Guard

Enforces documentation standards and best practices.

## When to Use

- Writing or reviewing documentation
- Creating API documentation
- Updating README files
- Improving code comments

## Core Principles

1. **Clarity** — Write for your audience, not for yourself
2. **Completeness** — Cover all important aspects
3. **Accuracy** — Keep documentation up-to-date
4. **Accessibility** — Make documentation easy to find and navigate

## How to Apply

1. Read the full skill documentation in `references/`
2. Apply technical writing best practices (see `references/technical-writing.md`)
3. Check documentation coverage
4. Use the review checklist

## Critical Rules

1. **NEVER skip README** — Every project needs a clear README
2. **NEVER skip API docs** — Document all public APIs
3. **NEVER skip code samples** — Include examples for complex concepts
4. **NEVER skip the review checklist** — Use it before every documentation review

## Anti-Loop Guard

**IMPORTANT**: This skill includes built-in loop prevention.

If you detect ANY of these signs, STOP IMMEDIATELY:
- The same documentation section being reviewed more than twice
- Identical documentation patterns being generated repeatedly
- The documentation review process restarting without new input

When loop detected:
1. Output current progress as partial report
2. List what has been completed vs. what remains
3. Ask user for explicit direction before continuing
