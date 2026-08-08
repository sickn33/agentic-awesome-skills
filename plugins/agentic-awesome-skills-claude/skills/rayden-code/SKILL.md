---
name: rayden-code
description: Generate React code with Rayden UI components using correct props, tokens, and premium layout patterns
category: development
risk: safe
source: https://github.com/playbookTV/rayden-ui-design-skill
source_type: community
date_added: 2026-04-10
author: Leslie Williams
tags: react, tailwind, design-system, ui, components, vibe-coding, rayden, rayna-ui, code-generation
tools: Read, Write, Edit, Bash, Glob, Grep
---

# Rayden Code Skill

## Overview

Generate production-quality React + Tailwind CSS code using the Rayden UI component library (34 components). The skill loads a complete API reference with every component, every prop, design tokens, layout patterns, and an explicit anti-pattern ban list — preventing hallucinated components and generic AI output. Built on the Rayna UI design system.

## When to Use This Skill

- You're building a new page or feature using Rayden UI components
- You want to scaffold a dashboard, landing page, auth screen, settings page, or data table
- You need to generate React code that follows a specific design system precisely
- You want to prototype UI quickly with correct component usage and premium aesthetics
- You're vibe coding and want design-system-compliant output

## How It Works

1. **Parses the request** — Identifies page type, required components, and data model
2. **Loads RAYDEN_RULES.md** — Complete reference: 34 components with full props, design philosophy, token classes, layout patterns, anti-patterns, and accessibility rules
3. **Plans the layout** — Decides page structure, component selection, spacing, color, and elevation strategy
4. **Generates code** — Writes React + Tailwind CSS using only documented components and token classes
5. **Self-validates** — Runs a 16-point checklist covering correctness (valid components/props, token usage, nesting) and design quality (whitespace, hierarchy, restraint, responsiveness)

## Examples

### Vibe code a SaaS dashboard

```
/rayden-code a dashboard with KPI cards, a recent orders table, and an activity feed
```

**Use case:** You're building an internal analytics tool and need a full dashboard page with MetricsCard grid, sortable Table, and ActivityFeed sidebar — all with correct Rayden imports and token classes.

### Scaffold a login page

```
/rayden-code login page with email and password
```

**Use case:** You need a centered auth form with Input components, a primary Button, and proper visual hierarchy — following Rayden's "Auth / Focused Form" pattern.

### Build an admin settings page

```
/rayden-code settings page with profile section, notification toggles, and danger zone
```

**Use case:** You're adding a settings area to your app and need form sections with Toggle components, a destructive action zone, and a single-column constrained layout.

### Create a pricing page

```
/rayden-code pricing page with 3 tiers and a feature comparison table
```

**Use case:** You need a marketing pricing section with Card components for each tier, Badge for the recommended plan, and a Table for feature comparison.

### Build an e-commerce product grid

```
/rayden-code product catalog with filters, search, and a card grid
```

**Use case:** You're building a storefront and need a responsive product grid with Chip filters, Input search, Pagination, and Cards with images — all using Rayden's layout and spacing rules.

## Best Practices

- Describe what you want in plain language — the skill maps your request to the right components
- Install `@raydenui/ui` in your project first (`npm install @raydenui/ui`)
- Import `@raydenui/ui/styles.css` in your app entry point for design tokens to work
- Review generated code for business logic — the skill handles UI, not data fetching
- Use alongside `/rayden-use` if you also want the same design built in Figma

## Security & Safety Notes

- This skill only reads its bundled rules file and writes code to your project
- No external network requests
- No secrets or credentials involved
- Generated code uses standard React patterns with no eval or dynamic code execution

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Components not rendering correctly | Ensure `@raydenui/ui/styles.css` is imported in your app entry |
| "Component doesn't exist" error | The skill only uses documented components — check if you're asking for something Rayden doesn't have |
| Colors look wrong | Use token classes (`bg-primary-500`) not hex values. Ensure the Rayden CSS is loaded |
| Layout not responsive | The skill generates responsive code by default — check that your viewport meta tag is set |

## Related Skills

- `rayden-use` — Build Rayden UI components and screens in Figma via MCP (included in the same package)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
