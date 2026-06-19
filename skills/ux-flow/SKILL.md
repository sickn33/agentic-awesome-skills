---
name: ux-flow
description: "Design user flows and screen structure using StyleSeed UX patterns such as progressive disclosure, hub-and-spoke navigation, and information pyramids."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ux, flows, navigation, product-design, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UX Flow

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this skill designs flows before screens. It uses proven UX patterns to define entry points, exits, screen inventory, and navigation structure so the implementation has a coherent user journey instead of a pile of disconnected pages.

## When to Use
- Use when planning onboarding, checkout, account management, dashboards, or drill-down flows
- Use when a new feature spans multiple screens or modal states
- Use when users need a clear path through a task instead of a single isolated page
- Use when the UI needs navigation logic before components are built

## How It Works

### Information Architecture Principles

- progressive disclosure: reveal complexity only when needed
- Miller's Law: chunk content into manageable groups
- Hick's Law: minimize decision overload on each screen

### Common Navigation Models

- hub and spoke for dashboards and detail views
- linear flow for onboarding, forms, and checkout
- tab navigation for 3 to 5 top-level areas

### Flow Rules

- every flow has a clear entry point
- every flow has a clear exit or success condition
- key features should usually be reachable within three taps from home
- non-root screens need back navigation
- loading, empty, and error states need explicit recovery paths

## Output

Provide:
1. An ASCII flow diagram
2. A screen inventory with each screen's purpose
3. Edge cases for loading, empty, and error states
4. Recommended page scaffolds and reusable patterns to implement next

## Best Practices

- Optimize for clarity before density
- Let one screen answer one primary question
- Keep escape hatches visible for risky or destructive steps
- Define state transitions before drawing detailed layouts

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ux-flow/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
