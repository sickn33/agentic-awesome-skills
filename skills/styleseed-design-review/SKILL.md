---
name: styleseed-design-review
description: Reviews UI/frontend code and tells you exactly why it "looks AI-generated" — then how to fix it. Use it when a React/Tailwind/HTML interface looks off, generic, or unfinished, when you want a design score before shipping, or when asked to make UI look more professional, polished, or...
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/skills/styleseed-design-review
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# StyleSeed Design Review

## Overview

A UI reads as "AI-generated" not because the components are ugly, but because the **parts
don't agree with each other** — mixed corner radii, three accent colors, pure-black text,
no hierarchy, missing states, robotic copy. This skill reviews a UI file (or a whole
directory) against a concrete design rubric, scores it 0–100, and returns a prioritized
fix list. It reviews and recommends; it never edits or deletes without you asking.

Full rule set (74 rules) and components: https://github.com/bitjaru/styleseed

## When to use

- A React / Tailwind / HTML UI "looks off," generic, or unfinished and you can't say why.
- You want a design score / pre-ship check.
- The user asks to make UI "look professional / polished / designed, not AI-generated."
- After generating UI, to verify it before shipping.

## How to review

Read the file(s). Score these **seven categories** (total 100); start each at full marks
and subtract for violations you can cite by line. Be specific and evidence-based.

### 1. Coherence — 20  (the #1 "AI-generated" tell)
One choice per axis, applied everywhere. Deduct for each **mixed** axis:
- mixed corner radii — e.g. a sharp card with pill buttons (−6)
- two or more accent colors used for emphasis (−5)
- **emoji used as UI icons** (🚗🧺⭐ as list/nav/status/category markers) — injects many uncontrolled hues; use one line-icon set in currentColor (−6)
- mixed shadow languages / light directions (−3)
- mixed icon families, fill modes, or stroke weights (−3)
- inconsistent control heights (buttons/inputs differ) (−3)

### 2. Color discipline — 16
- pure black (`#000` / `text-black`) text — the refined black is ~`#2A2A2A` (−4 each, cap −8)
- hardcoded hex where a semantic token exists (−2 each, cap −6)
- **a normal / OK / default ("보통") state shown in a status color** instead of neutral grey (−4)
- **status color on most/every row** (no severity hierarchy — color should mark the minority that needs attention) (−4)
- **decorative hues** — gold stars, rainbow category dots, a different color per card — instead of accent/grey (−3)
- status conveyed by color alone, no icon/text (−4)
- contrast below WCAG AA (4.5:1 body, 3:1 large/UI) (−6)

### 3. Hierarchy & typography — 16
- number and its unit not ~2:1 (48px number / 24px unit) (−4)
- everything the same size and weight, no clear primary (−5)
- arbitrary font sizes; no scale (−4)
- wrong line-height (loose on display, cramped on body) (−3)

### 4. Layout & spacing — 12
- content on a bare page background, not in cards (−6)
- off-grid spacing (7/13/19px instead of an 8px scale) (−3)
- the gap *around* a group not larger than the gap *inside* it (−3)
- the same section type repeated in a row (−4)

### 5. States — 12
- missing empty / loading / error state on a data surface (−5 each, cap −10)
- empty state with no next action; error that blames instead of helping (−4)

### 6. UX writing — 12
- buttons that don't name the action ("Submit" / "OK" instead of "Send $2,400") (−4)
- error copy that blames or uses system-speak ("Invalid input", "An error occurred") (−4)
- two terms for one concept (delete vs remove); filler words ("please", "successfully") (−2)

### 7. Motion & polish — 12
- ad-hoc fades instead of one consistent, named feel (−3)
- motion that delays content or blocks an action (−4)
- no `prefers-reduced-motion` handling on custom motion (−3)
- a single hard black shadow instead of a layered, low-opacity, tinted one (−2)

Clamp each category at 0; sum to a total. Bands: 90+ A · 80–89 B · 70–79 C · 60–69 D · <60 F.

## Output format

```
## Design Score: 72 / 100   (src/Dashboard.tsx)   C

Coherence            13/20   sharp cards (l.22) + pill buttons (l.48); 3 accent hues
Color discipline     12/16   #000 headings (l.12, 40)
Hierarchy & type     15/16   number/unit 1:1 on hero (l.18)
Layout & spacing     10/12   two identical KPI rows (l.22-31)
States                7/12   no empty/loading state on the orders list
UX writing            8/12   "Submit" button (l.55); "Invalid input" (l.61)
Motion & polish      10/12   one hard black shadow (l.22)

### Fix first (highest score gain)
1. Unify radius (pick soft 8–12px) + collapse to one accent   → +11 coherence/color
2. Add empty + loading states to the orders list              → +7  states
3. Rename "Submit" → "Send $2,400"; "Invalid input" → "Check the card number" → +6 copy

Re-score after: ~90 / 100.
```

## Rules

- Review from real evidence (cite line numbers); never guess.
- Order the fix list by **score gain**, not severity alone — fastest path to a better number.
- For a directory: one-line score per file, then the lowest file's full breakdown.
- **Don't auto-edit.** This skill measures and recommends. Apply fixes only when asked.
- Use it as a **quality gate**: review right after generating UI, apply the fix list, and
  re-review until the score clears ~80 *before showing the user* — no first-draft, incoherent
  UI (rainbow status lists, emoji icons, two accents, missing states) should reach them. The
  bar is a floor, not a ceiling: clear 80 and ship; don't chase 100 to delay.

---

Based on **StyleSeed** — an open-source (MIT) design engine that gives Claude Code, Cursor,
and Codex design judgment so AI-built UI stops looking generated. Full 74-rule reference,
components, brand skins, and motion: https://github.com/bitjaru/styleseed

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
