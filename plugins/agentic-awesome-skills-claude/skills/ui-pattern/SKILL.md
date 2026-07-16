---
name: ui-pattern
description: Generate a composed UI pattern (card layout, list, form section, grid, etc.) using design system primitives
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-pattern
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# UI Pattern Generator
## When to Use

Use this skill when you need generate a composed UI pattern (card layout, list, form section, grid, etc.) using design system primitives.


## When NOT to use

- For a single primitive component → use `/ss-component`
- For a full mobile screen → use `/ss-page`
- For an entire multi-page user flow → use `/ss-flow`
- For design tokens and color/spacing decisions → use `/ss-tokens`

Pattern type: **$0**
Description: $ARGUMENTS

## Available Pattern Types

### Layout Patterns
- **card-section**: Card with title + content inside page section (`mx-6`)
- **grid-2col**: 2-column grid of cards (`grid grid-cols-2 gap-4 px-6`)
- **scroll-horizontal**: Horizontal scrolling card list (`flex gap-3 overflow-x-auto scrollbar-hide`)
- **list-section**: Vertical list of items inside a card
- **form-section**: Form with labeled inputs in a card
- **stat-grid**: Grid of StatCard components

### Data Display Patterns
- **data-table**: Table with header and rows
- **detail-card**: Key-value pair display
- **chart-card**: Card wrapper for a Recharts chart
- **ranking-list**: Numbered ranking with highlight

### Interactive Patterns
- **action-sheet**: Bottom sheet with action buttons
- **filter-bar**: Horizontal filter/tab bar
- **search-header**: Search input in header area

## Instructions

1. Read the design system reference:
   - `CLAUDE.md` for conventions
   - `components/ui/` for available primitives
   - `components/patterns/` for existing patterns

2. Compose the pattern from existing components — DO NOT recreate primitives.

3. Follow the design system layout rules:
   - Cards: `bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]`
   - Section wrapper: `mx-6` for horizontal margin
   - Section title: `text-foreground font-bold text-[18px] mb-4`
   - List gap: `space-y-3`
   - Grid gap: `gap-4`

4. Use semantic tokens for all visual properties.

5. Make the pattern a reusable component with props for dynamic content.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
