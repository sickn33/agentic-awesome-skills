---
name: ui-a11y
description: Audit a component or page for accessibility issues and fix them
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-a11y
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# Accessibility Audit
## When to Use

Use this skill when you need audit a component or page for accessibility issues and fix them.


## When NOT to use

- For general design system compliance review → use `/ss-review`
- For Nielsen UX heuristics → use `/ss-audit`
- For non-StyleSeed code (no `data-slot`, no semantic tokens) — assumes StyleSeed conventions
- For runtime testing — this is a static code audit, not a screen-reader simulation

Target: **$ARGUMENTS**

## Audit Criteria

### WCAG 2.2 AA Compliance

#### 1. Perceivable
- **Color contrast**: Text must meet 4.5:1 (normal) or 3:1 (large/bold text)
  - Check `text-muted-foreground` (#717182) on `bg-background` (#FFFFFF) = 4.6:1 (passes)
  - Check `text-brand` on white (verify contrast with your skin's brand color)
  - Flag any custom colors that don't meet ratio
- **Non-text contrast**: UI controls/graphics must meet 3:1
- **Text alternatives**: All `<img>` need `alt`, icons need `aria-label` when meaningful
- **Color independence**: Don't convey info by color alone (add icons/text)

#### 2. Operable
- **Touch targets**: Minimum 44x44px (`min-h-11 min-w-11`)
  - Common violation: `h-9` (36px) buttons — should be `h-11`
  - Icon buttons need explicit size: `w-11 h-11`
- **Keyboard navigation**: All interactive elements must be keyboard-accessible
  - Tab order should be logical
  - `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **Motion**: Animations must respect `prefers-reduced-motion`
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

#### 3. Understandable
- **Labels**: Form inputs must have visible labels or `aria-label`
- **Error messages**: Form errors must be programmatically associated (`aria-describedby`)
- **Language**: `<html lang="en">` (or appropriate language code for your project)

#### 4. Robust
- **Semantic HTML**: Use appropriate elements (`<button>`, `<nav>`, `<main>`, `<header>`)
- **ARIA**: Use Radix UI components (they handle ARIA automatically)
- **Roles**: Custom interactive elements need proper `role` attributes

## Design System Token Reference

| Token | Minimum Contrast | Note |
|-------|-----------------|------|
| `--foreground` | 7:1+ | Body text — verify with your skin |
| `--muted-foreground` | 4.5:1+ | Secondary text — verify with your skin |
| `--brand` | 4.5:1+ | Accent — verify with your skin's brand color |
| `--destructive` | 4.5:1+ | Error — verify with your skin |
| `--success` | 3:1+ | Large text/icons only — verify with your skin |
| `--warning` | 4.5:1+ | Warning text — some skins need a darker variant |

## Output

1. **Issues found**: List with severity (Critical/Major/Minor)
2. **Auto-fixes**: Apply fixes directly where possible
3. **Manual review needed**: Flag items that need human judgment

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
