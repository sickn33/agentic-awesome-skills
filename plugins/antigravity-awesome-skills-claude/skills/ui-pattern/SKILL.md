---
name: ui-pattern
description: "Generate reusable UI patterns such as card sections, grids, lists, forms, and chart wrappers using StyleSeed Toss primitives."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ui, patterns, design-system, reuse, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UI Pattern

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this skill builds reusable composed patterns from the seed's primitives. It is intended for sections like card lists, grids, form blocks, ranking lists, and chart wrappers that appear across multiple pages and need to look deliberate rather than ad hoc.

## When to Use
- Use when you need a reusable layout pattern rather than a one-off page section
- Use when a page repeats the same arrangement of cards, rows, filters, or data blocks
- Use when you want to build from existing StyleSeed primitives instead of copying markup
- Use when you want a pattern component with props for dynamic content

## How It Works

### Step 1: Identify the Pattern Type

Common pattern families include:
- card section
- two-column grid
- horizontal scroller
- list section
- form section
- stat grid
- data table
- detail card
- chart card
- filter bar
- action sheet

### Step 2: Read the Available Building Blocks

Inspect both:
- `components/ui/` for primitives
- `components/patterns/` for neighboring patterns that can be extended

The goal is composition, not duplication.

### Step 3: Apply StyleSeed Layout Rules

Keep the Toss seed defaults intact:
- card surfaces on semantic tokens
- rounded corners from the system scale
- shadow tokens instead of improvised shadow values
- consistent internal padding
- section wrappers that align with the page margin system

### Step 4: Make the Pattern Dynamic

Expose data through props instead of hardcoding content. If a pattern has multiple variants, keep the API explicit and small.

### Step 5: Keep the Pattern Reusable Across Pages

Avoid page-specific assumptions unless the user explicitly wants a one-off section. If the markup only works on one route, it probably belongs in a page component, not a shared pattern.

## Output

Provide:
1. The generated pattern component
2. The target location
3. Expected props and usage example
4. Notes on which existing primitives were reused

## Best Practices

- Start from the smallest existing building block that solves the problem
- Keep container, section, and item responsibilities separate
- Use tokens and spacing rules consistently
- Prefer extending a pattern over adding a near-duplicate sibling

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ui-pattern/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
