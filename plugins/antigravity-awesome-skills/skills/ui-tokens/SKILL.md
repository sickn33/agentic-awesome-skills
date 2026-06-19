---
name: ui-tokens
description: "List, add, and update StyleSeed design tokens while keeping JSON sources, CSS variables, and dark-mode values in sync."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ui, tokens, design-system, theming, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UI Tokens

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this skill manages design tokens without letting the source-of-truth files drift apart. It is meant for teams using the Toss seed's JSON token files and CSS implementation together.

## When to Use
- Use when you need to inspect the current token set
- Use when you want to add a new color, shadow, radius, spacing, or typography token
- Use when you need to update a token and propagate the change safely
- Use when the project has both JSON token files and CSS variables that must stay aligned

## How It Works

### Supported Actions

- `list`: show the current tokens in a human-readable form
- `add`: introduce a new token and wire it through the implementation
- `update`: change an existing token value and audit the downstream usage

### Typical Source-of-Truth Split

For the Toss seed:
- JSON under `tokens/`
- CSS variables and theme wiring under `css/theme.css`
- typography support in the font and base CSS files

### Rules

- keep JSON and CSS in sync
- prefer semantic names over descriptive names
- provide dark-mode support where relevant
- update the token implementation, not just the source manifest
- check for direct component usage that might now be stale

## Output

Return:
1. The requested token inventory or change summary
2. Every file touched
3. Any affected components or utilities that should be reviewed
4. Follow-up actions if the new token requires broader adoption

## Best Practices

- Add semantic intent, not one-off brand shades
- Avoid token sprawl by extending existing scales first
- Keep naming consistent with the rest of the system
- Review contrast and accessibility when introducing new colors

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ui-tokens/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
