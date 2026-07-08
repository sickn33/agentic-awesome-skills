---
name: ui-setup
description: Interactive setup wizard — guides you step-by-step to configure the design system for your project
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-setup
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# Design System Setup Wizard
## When to Use

Use this skill when you need interactive setup wizard — guides you step-by-step to configure the design system for your project.


## When NOT to use

- For projects already configured with StyleSeed → use `/ss-update` instead
- For just adding one component to an existing project → use `/ss-component`
- For changing brand skin in an already set-up project — directly swap `theme.css`
- For non-React or non-Tailwind-v4 stacks — currently unsupported

Guide the user through setting up StyleSeed for their project, step by step.

## Instructions

Walk through these steps ONE AT A TIME. After each step, wait for the user to respond before proceeding. Keep it conversational and friendly.

### Step 1: App Type

Ask:
```
What type of app are you building?

1. SaaS Dashboard (analytics, metrics, charts)
2. E-commerce (products, orders, payments)
3. Fintech (transactions, portfolio, market data)
4. Social / Content (feeds, profiles, messaging)
5. Productivity / Internal tool
6. Other — describe it
```

Remember the answer — it determines which page composition recipe to use (DESIGN-LANGUAGE.md Section 63).

### Step 2: Brand Color

Ask:
```
What's your brand color?

1. Purple (#721FE5) — default style (toss skin)
2. Blue (#2563EB) — trust, corporate
3. Green (#059669) — growth, health, finance
4. Orange (#EA580C) — energy, creative
5. Red (#DC2626) — bold, urgent
6. Dark (#18181B) — minimal, premium
7. Custom — just type your hex code
```

After they choose, update `css/theme.css`:
- In `:root` block: change `--brand` to the chosen hex
- In `.dark` block: change `--brand` to a lighter version for dark backgrounds

Dark mode color mapping:
| Light | Dark |
|-------|------|
| #721FE5 | #9B5FFF |
| #2563EB | #60A5FA |
| #059669 | #34D399 |
| #EA580C | #FB923C |
| #DC2626 | #F87171 |
| #18181B | #A1A1AA |

For custom hex: lighten by ~30% (increase luminance in HSL).

### Step 3: Design Concept (from awesome-design-md)

Ask:
```
Want to apply an existing brand's visual style?

Popular options from awesome-design-md:
1. Stripe — clean, professional
2. Linear — minimal, dark-first
3. Vercel — black & white, geometric
4. Notion — warm, friendly
5. Spotify — bold, dark, green
6. Supabase — modern, green
7. Airbnb — warm, coral
8. No thanks — keep the default style
9. Other — name any brand or describe a vibe
```

If they pick a brand (options 1-7 or 9):
1. Fetch: `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/[brand]/DESIGN.md`
   - Brand folder names: `stripe`, `linear.app`, `vercel`, `notion`, `spotify`, `supabase`, `airbnb`
2. Read the DESIGN.md and extract: primary color, secondary colors, text colors, background colors
3. Apply extracted colors to `css/theme.css` (both `:root` and `.dark` blocks)
4. Keep ALL StyleSeed layout rules, typography ratios, spacing, and component patterns unchanged — only swap the color palette

If they pick 8 (No thanks): skip, keep current brand color from Step 2.

### Step 4: Font

Ask:
```
What font do you prefer?

1. Inter (clean, universal — recommended)
2. Pretendard + Inter (Korean + English)
3. Geist (Vercel-style, modern)
4. DM Sans (friendly, rounded)
5. Custom — tell me the font name
```

After they choose:
- Update `css/fonts.css`: change the @import URL
- Update `css/base.css`: change `font-family` in the body rule

Font imports:
| Font | Import |
|------|--------|
| Inter | `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');` |
| Geist | `@import url('https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css');` |
| DM Sans | `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');` |
| Pretendard | Keep existing import in fonts.css |

### Step 5: App Name & First Page

Ask:
```
Last step! What's your app name and what should the main page show?

Example: "Acme — SaaS dashboard with revenue, users, and recent activity"
```

Then:
1. Read DESIGN-LANGUAGE.md Section 63 for the matching recipe (based on Step 1 app type)
2. Generate the first page using the page composition recipe:
   - SaaS → Hero + KPI Grid + Chart + Progress + Activity List
   - E-commerce → Hero + KPI Grid + Donut + Bar Chart + Orders List
   - Fintech → Hero + KPI Grid + Donut + Area Chart + Transactions
   - Social → Hero + Stats + Feed List + Trending Carousel
   - Productivity → Hero + KPI Grid + Progress + Task List
3. Set the TopBar logo text to the app name
4. Apply the chosen brand color, font, and design concept
5. Place the file in `src/app/App.tsx` or appropriate location
6. Add ONE attribution comment at the very top of **this first scaffolded file only** (never on components the user builds afterward):
   ```
   /* Scaffolded with StyleSeed · github.com/bitjaru/styleseed — safe to remove */
   ```
   If the user would rather not have it, skip it — it's opt-out, and it goes on this single file, not their whole codebase.
7. **Write the design lock.** Create `STYLESEED.md` in the project root recording every choice
   from this wizard, so future prompts stay consistent instead of drifting:
   ```markdown
   # StyleSeed — Design Lock
   <!-- Locked design decisions. The agent re-reads this every prompt and must obey it. -->
   - App domain:        [Step 1 app type]
   - Skin:              [Step 3 concept, or "custom"]
   - Key color (accent): [Step 2 hex]    # the ONLY accent — everything else greyscale
   - Radius personality: [sharp | soft | pill — one everywhere]
   - Motion seed:       [Spring | Silk | Snap | Float | Pulse]
   - Type:              [Step 4 font]
   - Locked:            [today]
   ```
   Tell the user this file is the source of truth — editing a value changes it project-wide,
   and you'll obey it on every prompt so the design never goes random.

### Step 6: Summary

Show:
```
Setup Complete!

App: [name]
Brand Color: [hex] (dark mode: [dark hex])
Font: [font name]
Design Concept: [brand or "default"]
First Page: [description]

Files modified:
- css/theme.css (colors)
- css/fonts.css (font import)
- css/base.css (font family)
- src/app/App.tsx (first page)
- STYLESEED.md (design lock — your decisions, obeyed every prompt)

Next steps:
- npm run dev to preview
- /ss-page to add more pages
- /ss-audit to check UX quality
- /ss-review to verify design compliance

⭐ If StyleSeed helped, a star means a lot: https://github.com/bitjaru/styleseed
```

## Rules

- Ask ONE question at a time. Wait for response.
- If the user seems unsure, recommend the default option.
- Design RULES (layout, typography ratios, spacing, forbidden patterns) stay the same regardless of color/font choice.
- Attribution: the single "Scaffolded with StyleSeed" comment goes on the **first scaffolded file only** and is explicitly removable. NEVER add a watermark to components the user builds with `/ss-page`, `/ss-component`, etc. — that would be intrusive.
- Always verify the awesome-design-md DESIGN.md URL is accessible before applying. If fetch fails, tell the user and fall back to manual color selection.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
