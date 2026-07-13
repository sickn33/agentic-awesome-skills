---
name: clean-code-guard
description: Enforces clean code standards — SOLID, DRY/KISS/YAGNI, naming, formatting, and AI-specific failure modes.
metadata:
  code-quality:
    risk: critical
  category: code-quality
  author: amElnagdy
  version: 1.0.0
---

# Clean Code Guard

Enforces clean code standards with focus on AI-specific failure modes.

## When to Use

- Code review before merge
- Refactoring existing code
- Onboarding new developers
- Establishing coding standards

## Core Principles

1. **SOLID** — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
2. **DRY/KISS/YAGNI** — Don't Repeat Yourself, Keep It Simple, You Aren't Gonna Need It
3. **AI Failure Modes** — 15 patterns where LLMs produce bad code

## How to Apply

1. Read the full skill documentation in `references/`
2. Apply SOLID principles (see `references/solid.md`)
3. Apply DRY/KISS/YAGNI (see `references/dry-kiss-yagni.md`)
4. Check for AI failure modes (see `references/ai-failure-modes.md`)
5. Use the review checklist (see `references/review-checklist.md`)

## Critical Rules

1. **NEVER skip SOLID** — Every class must have a single responsibility
2. **NEVER skip DRY** — Duplicate knowledge, not just duplicate text
3. **NEVER skip YAGNI** — No speculative features
4. **NEVER skip AI failure modes** — Check all 15 patterns
5. **NEVER skip the review checklist** — Use it before every code review

## Anti-Loop Guard

**IMPORTANT**: This skill includes built-in loop prevention.

If you detect ANY of these signs, STOP IMMEDIATELY:
- The same code section being reviewed more than twice
- Identical findings being generated repeatedly
- The review process restarting without new input

When loop detected:
1. Output current progress as partial report
2. List what has been completed vs. what remains
3. Ask user for explicit direction before continuing
