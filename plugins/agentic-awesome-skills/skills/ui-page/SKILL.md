---
name: ui-page
description: Scaffold a new mobile page/screen using the StyleSeed layout patterns
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-page
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# Mobile Page Scaffolder
## When to Use

Use this skill when you need scaffold a new mobile page/screen using the StyleSeed layout patterns.


## When NOT to use

- For a single composed pattern within an existing page → use `/ss-pattern`
- For desktop-only screens — this skill is mobile-first
- For multi-page navigation structure → use `/ss-flow` first
- For tweaking an existing page — edit the file directly

Create a new page: **$0**
Description: $ARGUMENTS

## Instructions

1. Read the design system reference:
   - `CLAUDE.md` for file structure and conventions
   - `components/patterns/page-shell.tsx` for page layout
   - `components/patterns/top-bar.tsx` for header pattern
   - `components/patterns/bottom-nav.tsx` for navigation

2. Page structure template:
```tsx
import { PageShell, PageContent } from "@/components/patterns/page-shell"
import { TopBar, TopBarAction } from "@/components/patterns/top-bar"
import { BottomNav } from "@/components/patterns/bottom-nav"

export default function PageName() {
  return (
    <PageShell>
      <TopBar
        logo={/* logo or page title */}
        subtitle={/* optional subtitle */}
        actions={/* optional action buttons */}
      />
      <PageContent>
        {/* Page sections with space-y-6 */}
      </PageContent>
      <BottomNav items={[/* nav items */]} activeIndex={0} />
    </PageShell>
  )
}
```

3. Layout rules:
   - Container: `max-w-[430px]` (mobile viewport)
   - Page background: `bg-background`
   - Section horizontal padding: `px-6`
   - Section vertical spacing: `space-y-6`
   - Bottom padding for nav: `pb-24`
   - Cards: `bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]`

4. Use semantic tokens for all colors — never hardcode hex values.

5. Compose the page from existing components (ui/ and patterns/) wherever possible.

6. Safe area: include `env(safe-area-inset-*)` padding for modern devices.

7. **Post-generation verification (MANDATORY):**
   After creating the page, verify against the Golden Rules:
   - [ ] All content is inside cards (no bare background content)
   - [ ] Only `--brand` color used for accents (no other accent colors)
   - [ ] No hardcoded hex values (all semantic tokens)
   - [ ] Section types alternate (no two identical types in a row)
   - [ ] Numbers have 2:1 ratio with units
   - [ ] Spacing uses 6px multiples (p-1.5, p-3, p-6)
   - [ ] `mx-6` for single cards, `px-6` for grids/carousels
   - [ ] Touch targets ≥ 44px on all interactive elements
   If any violation is found, fix it before presenting the page to the user.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
