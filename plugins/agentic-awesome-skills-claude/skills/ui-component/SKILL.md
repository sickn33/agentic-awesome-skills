---
name: ui-component
description: Generate a new UI component following the StyleSeed design conventions
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-component
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# UI Component Generator
## When to Use

Use this skill when you need generate a new UI component following the StyleSeed design conventions.


## When NOT to use

- For full-page scaffolding → use `/ss-page`
- For composed multi-component patterns → use `/ss-pattern`
- For tweaking an existing component — just edit the file directly
- For non-StyleSeed projects (no `components/ui/` directory or no Tailwind v4)

Generate a new component: **$0**
Description: $ARGUMENTS

## Instructions

1. First, read the design system seed for context:
   - Read `CLAUDE.md` for component conventions
   - Read `css/theme.css` for available design tokens
   - Read `components/ui/button.tsx` as a reference pattern

2. Follow these conventions strictly:
   - Use `function` declaration (not `const`)
   - Add `data-slot="component-name"` attribute
   - Use `cn()` from `@/components/ui/utils` for all className merging
   - Use `React.ComponentProps<>` for prop typing
   - Always support `className` prop for overrides
   - Use CVA (`class-variance-authority`) if the component has variants
   - Use semantic color tokens (`bg-card`, `text-foreground`) — never inline hex

3. Design token usage:
   - Colors: `text-foreground`, `bg-card`, `text-brand`, `text-muted-foreground`, `border-border`
   - Shadows: `shadow-[var(--shadow-card)]`, `shadow-[var(--shadow-elevated)]`
   - Radius: `rounded-md`, `rounded-lg`, `rounded-2xl`
   - Spacing: multiples of 6px (`p-1.5`, `p-3`, `p-6`)
   - Motion: `duration-[var(--duration-fast)]`, `ease-[var(--ease-default)]`

4. Typography rules:
   - Display (36-48px): `leading-none tracking-[-0.02em]`
   - Heading (18-24px): `leading-snug tracking-[-0.01em]`
   - Body (14-17px): `leading-normal` (default tracking)
   - Caption uppercase (10-13px): `tracking-[0.05em]`
   - Use `size-*` shorthand instead of `w-* h-*`
   - Use `ms-*/me-*` instead of `ml-*/mr-*` (logical properties)

5. Accessibility requirements:
   - Minimum touch target: 44x44px (`min-h-11 min-w-11`)
   - Support `aria-*` attributes passthrough
   - Use `focus-visible:ring-2 focus-visible:ring-ring` for keyboard focus
   - Respect `prefers-reduced-motion` for animations

6. Export the component as a named export (not default)

7. Place the file in the appropriate directory:
   - Primitive/reusable → `src/components/ui/`
   - Composed pattern → `src/components/patterns/`

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
