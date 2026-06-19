---
name: ui-review
description: "Review UI code for StyleSeed design-system compliance, accessibility, mobile ergonomics, spacing discipline, and implementation quality."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ui, review, design-system, accessibility, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UI Review

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this skill audits UI code against the Toss seed's conventions instead of reviewing it as generic frontend work. It focuses on design-token discipline, component ergonomics, accessibility, mobile readiness, typography, and spacing consistency.

## When to Use
- Use when a component or page should follow the StyleSeed Toss design language
- Use when reviewing a UI-heavy PR for consistency and design-system violations
- Use when the output looks "mostly fine" but feels off in subtle ways
- Use when you need a structured review with concrete fixes

## Review Checklist

### Design Tokens

- no hardcoded hex colors when semantic tokens exist
- no improvised shadow values when tokenized shadows exist
- no arbitrary radius choices outside the system scale
- no random spacing values that break the seed rhythm

### Component Conventions

- uses the project's class merge helper
- supports `className` extension when appropriate
- uses the agreed typing pattern
- avoids wrapper components that only forward one class string
- reuses existing primitives before inventing new ones

### Accessibility

- touch targets large enough for mobile
- visible keyboard focus states
- labels and `aria-*` attributes where needed
- adequate color contrast
- reduced-motion respect for animation

### Mobile UX

- no horizontal overflow
- safe-area handling where relevant
- readable text sizes
- thumb-friendly interaction spacing
- bottom nav or sticky actions do not obscure content

### Typography and Spacing

- uses the system type hierarchy
- display and headings are not overly loose
- body text remains readable
- spacing follows the seed grid instead of arbitrary values

## Output Format

Return:
1. A verdict: Pass, Needs Improvement, or Fail
2. A prioritized list of issues with file and line references when available
3. Concrete fixes for each issue
4. Any open questions where the design intent is ambiguous

## Best Practices

- Review against the seed, not against personal taste
- Separate stylistic drift from real usability or accessibility bugs
- Prefer actionable diffs over abstract criticism
- Call out duplication when an existing component already solves the problem

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ui-review/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
