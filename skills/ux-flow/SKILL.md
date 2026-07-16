---
name: ux-flow
description: Design user flows and navigation structure following proven UX patterns
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-flow
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# UX Flow Designer
## When to Use

Use this skill when you need design user flows and navigation structure following proven UX patterns.


## When NOT to use

- For implementing a single page → use `/ss-page` after the flow is settled
- For copy on each step → use `/ss-copy` after the structure is settled
- For information architecture of an entire product — narrow scope to one flow first
- For high-fidelity mockups — this produces a flow map, not pixel-perfect designs

Design a user flow: **$0**
Description: $ARGUMENTS

## Instructions

1. Read the design system reference:
   - `CLAUDE.md` for component inventory
   - `DESIGN-LANGUAGE.md` for layout patterns (sections 13-14, 19-20)
   - `components/patterns/` for available building blocks

2. Apply these UX principles:

### Information Architecture
- **Progressive Disclosure**: Show only what's needed at each step. Hide complexity behind logical drill-downs.
- **Miller's Law**: Chunk information into groups of 5-9 items maximum.
- **Hick's Law**: Minimize choices per screen. Fewer options = faster decisions.

### Navigation Patterns
- **Hub & Spoke**: Dashboard → detail pages → back to dashboard (default for mobile apps)
- **Linear Flow**: Step 1 → Step 2 → Step 3 (for forms, onboarding, checkout)
- **Tab Navigation**: 3-5 top-level sections via BottomNav

### Screen Flow Rules
- Every flow must have a **clear entry point** and **clear exit point**
- Maximum **3 taps** to reach any key feature from the home screen
- Back navigation must always be available (except root screens)
- Error states must provide **recovery paths** (retry, go back, contact support)
- Loading states must use skeleton screens (never spinners in cards)

### Page Composition (from DESIGN-LANGUAGE.md)
- Follow the **Information Pyramid**: Hero → KPI Grid → Details → Lists
- Each screen should answer ONE primary question
- Above the fold: the most important metric or action
- Use the 4 section types: Full Card (A), Grid (B), Carousel (C), Hero (D)

3. Output format:
   - **Flow diagram** in ASCII showing screen connections
   - **Screen inventory** listing each screen's purpose and key components
   - **Edge cases** (empty states, errors, loading) for each screen
   - **Scaffolded pages** using `PageShell`, `TopBar`, `BottomNav` patterns

4. Generate the actual page files using `/ss-page` conventions.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
