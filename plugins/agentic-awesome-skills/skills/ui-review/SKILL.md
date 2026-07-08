---
name: ui-review
description: Review UI code for design system compliance, accessibility, and best practices
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-review
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# UI Design Review
## When to Use

Use this skill when you need review UI code for design system compliance, accessibility, and best practices.


## When NOT to use

- For accessibility-only issues → use `/ss-a11y`
- For Nielsen UX heuristics → use `/ss-audit`
- For a quick automated check → use `/ss-lint`
- For non-UI code (data fetching, business rules)

Review the file: **$ARGUMENTS**

## Checklist

### 1. Design Token Compliance
- [ ] No hardcoded hex colors (use semantic tokens: `text-foreground`, `bg-brand`, etc.)
- [ ] No hardcoded px spacing in Tailwind (use `p-6` not `p-[24px]`)
- [ ] Shadows use CSS variables (`shadow-[var(--shadow-card)]`)
- [ ] Border radius follows the scale (`rounded-md`, `rounded-lg`, `rounded-2xl`)

### 2. Component Conventions
- [ ] Uses `data-slot` attribute
- [ ] Uses `cn()` for className merging
- [ ] Props typed with `React.ComponentProps<>`
- [ ] Supports `className` prop override
- [ ] Named export (not default export for components)
- [ ] No wrapper components that only add a className

### 3. Accessibility (a11y)
- [ ] Touch targets >= 44x44px for interactive elements
- [ ] `focus-visible` styles on all interactive elements
- [ ] Proper `aria-*` attributes where needed
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Images have `alt` text
- [ ] Form inputs have associated labels

### 4. Mobile Best Practices
- [ ] No horizontal overflow
- [ ] Touch-friendly spacing between interactive elements
- [ ] Safe area insets handled for notched devices
- [ ] Text sizes >= 12px for readability
- [ ] Scrollable containers have `-webkit-overflow-scrolling: touch`

### 5. Performance
- [ ] No unnecessary re-renders (stable references, memoization where needed)
- [ ] Images are lazy-loaded
- [ ] Heavy components are code-split

### 6. Typography
- [ ] Uses the Pretendard/Inter font stack
- [ ] Font sizes from the 14-step scale (10-48px, see CLAUDE.md)
- [ ] Proper font weights (400, 500, 600, 700)
- [ ] Display text (36-48px): `leading-none` + `tracking-[-0.02em]`
- [ ] Heading text (18-24px): `leading-snug` + `tracking-[-0.01em]`
- [ ] Body text (14-17px): `leading-normal` (no custom tracking)
- [ ] Caption uppercase (10-13px): `tracking-[0.05em]` or `tracking-wide`
- [ ] No `line-height: 1.5` on display/heading text (too loose)

### 7. Spacing Consistency
- [ ] All spacing values are multiples of 6px (p-1.5, p-3, p-6, etc.)
- [ ] No arbitrary spacing (p-5=20px, gap-3.5=14px are violations)
- [ ] Uses `size-*` shorthand instead of `w-* h-*`
- [ ] Uses `ms-*/me-*` instead of `ml-*/mr-*` (logical properties)
- [ ] Motion transitions use design tokens (`duration-[var(--duration-fast)]`)

### 8. Coherence (VISUAL-CRAFT.md §C0 — the "one choice per axis" laws)
> The biggest reason a UI reads as "AI-generated" isn't ugly parts — it's *mixed*
> parts. Check that each axis below uses ONE value system-wide; flag a mix as a real
> issue, not a nitpick.
- [ ] **One radius personality** — sharp (0-4px) OR soft (8-12px) OR pill, applied to every card/button/input/modal. No mixing (e.g. a `rounded-none` panel with `rounded-full` buttons).
- [ ] **One accent color** for interactive emphasis (+ semantic red/green/amber only) — not two+ competing accents.
- [ ] **No emoji as UI icons** (🚗🧺⭐ as list/nav/status/category markers) — they inject many uncontrolled hues; use one line-icon set in `currentColor`.
- [ ] **Status color = severity, not decoration** — a normal/OK/"보통" state is neutral grey (not colored); color marks only the minority of rows that need attention; same value → same color.
- [ ] **No decorative hues** — favorite stars, category dots, avatars use the accent or grey, not a new color each.
- [ ] **One shadow language** — same light direction, same scale/tint; not some black + some tinted, some up-lit + some down-lit.
- [ ] **One icon family / fill mode / stroke weight** across the file.
- [ ] **Nested-radius law** — an element inside a rounded container uses `inner = outer − padding`, not the same radius (which bulges).
- [ ] **Consistent control heights** — buttons, inputs, selects share a height set (e.g. 40px).
- [ ] Errors/states never rely on color alone (icon + text too).

## Output Format

Provide:
1. **Score**: Pass / Needs Improvement / Fail
2. **Issues**: List each violation with file:line reference
3. **Fixes**: Concrete code changes for each issue

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
