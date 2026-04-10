---
name: rayden-use
description: Build and maintain Rayden UI components and screens in Figma via Figma MCP with full design token enforcement
category: design
risk: safe
source: https://github.com/playbookTV/rayden-ui-design-skill
source_type: community
date_added: 2026-04-10
author: Leslie Williams
tags: figma, design-system, ui, components, mcp, rayden, rayna-ui
tools: mcp__claude_ai_Figma__use_figma, mcp__claude_ai_Figma__get_screenshot, mcp__claude_ai_Figma__whoami, Read
---

# Rayden UI Design Skill

## Overview

Build and maintain Rayden UI components and screens directly in Figma using the Figma MCP. The skill enforces the Rayna UI design system — resolved design tokens, craft rules, anti-pattern detection, and visual validation — so every output is mechanically correct and visually premium. Supports three style modes (conservative, balanced, expressive) and includes a dedicated subagent for full-page screen composition.

## When to Use This Skill

- You need to build a new Rayden UI component with all its variants in Figma
- You're composing a full screen (dashboard, landing page, auth form, settings, data table) from Rayden patterns
- You want to audit an existing Figma file for design system compliance
- You need to add new variants to an existing Figma component
- You're syncing React component updates back to Figma

## How It Works

1. **Verifies environment** — Checks Figma MCP connection and write access via `whoami`
2. **Loads component data** — Reads Rayden component specs, anatomy, and tokens from the `@raydenui/ai` MCP server or installed package
3. **Loads craft rules** — Reads supporting files: resolved token values, craft rules, anti-patterns, and screen layout patterns
4. **Identifies task type** — Determines if building a single component, composing a screen, auditing, or adding variants
5. **Applies style mode** — Adjusts spacing, shadow, typography, and visual weight based on conservative/balanced/expressive mode
6. **Builds with helpers** — Generates Figma Plugin API code using mandatory helper functions (hexToRgb, loadFonts, applyShadow, applyBorder) with auto layout on every frame
7. **Visual validation** — Takes screenshots after each build stage and validates against 8 acceptance criteria (alignment, spacing, color accuracy, hierarchy, radius, shadow, primary action count)

## Examples

### Build a component

```
/rayden-use Button https://figma.com/file/abc123
```

Generates all Button variants (primary, secondary, grey, destructive) in solid and outlined appearances across SM and LG sizes.

### Compose a dashboard screen

```
/rayden-use dashboard-screen balanced https://figma.com/file/abc123
```

Builds a full dashboard layout: sidebar navigation, header, KPI strip, data table, and activity feed — all using Rayden tokens.

### Compose with expressive style

```
/rayden-compose landing expressive https://figma.com/file/abc123
```

Delegates to the screen composer subagent to build a landing page with bolder typography, stronger shadows, and more visual weight.

## Best Practices

- Always provide a Figma file URL as the last argument
- Use `balanced` mode (default) for most use cases; `conservative` for dense admin UIs, `expressive` for marketing pages
- Let the skill take screenshots between build stages — this is how it validates output quality
- Install `@raydenui/ai` as an MCP server for the richest component data access
- Review the generated output in Figma after completion — the skill validates mechanically but human judgment on aesthetics is still valuable

## Security & Safety Notes

- This skill only reads local supporting files and calls the Figma MCP — no external network requests beyond Figma's API
- Requires Figma Dev or Full seat with write access to the target file
- Does not modify files outside of the target Figma document
- All design tokens are bundled in the skill's supporting files — no secrets or credentials involved

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| "Font not found" error | The skill falls back to Roboto if Inter is unavailable — ensure Inter is loaded in your Figma file for best results |
| Components don't combine as variants | All components must share the same parent frame before calling `combineAsVariants` |
| Colors look wrong | Verify you're using resolved token hex values from tokens.md, not approximations |
| Figma permission denied | Check that your Figma seat is Dev or Full (not Viewer) and the file isn't view-only |

## Related Skills

- `rayden-code` — Generate React code with Rayden UI components (included in the same package)
- `rayden-compose` — Dedicated subagent for composing full-page Figma screens (included in this skill package)
