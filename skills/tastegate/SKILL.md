---
name: tastegate
description: "Build or fix a frontend so it looks designed, not AI-generated, then prove it in a real browser: renders at phone and desktop width and fails on overlap, low contrast and AI-slop defaults."
category: frontend
risk: safe
source: community
source_repo: stas4000/tastegate
source_type: community
date_added: "2026-10-08"
author: stas4000
tags: [frontend, design, ui, browser-testing, quality-gate]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/stas4000/tastegate/blob/main/LICENSE"
---

# Tastegate

## Overview

Two skills in one, plus the part both leave to the model: proof.

1. **Taste** decides what the page should be, before any code.
2. **The craft floor** holds the mechanics every page must meet.
3. **The gate** renders the page in a real browser at phone and desktop width and refuses "done" while any hard finding is open.

A model that wrote the CSS cannot see that its hero overlaps its nav at 390px. The browser
can. Work through the four steps in order, and apply the checklists rather than announcing them.

## When to Use

- Use for any UI build: landing page, marketing site, dashboard, app screen, component
- Use for a redesign, a polish pass, or a "make it look better" request
- Use when a page needs to stop looking AI-generated
- Use before calling any frontend work done, as the proof step

## How It Works

### Step 1: Read the room (2 minutes, before code)

Write one line before building:

> Reading this as: `<page kind>` for `<audience>`, in a `<vibe>` language, built on `<type pairing>` + `<palette family>` + `<one signature detail>`.

- The audience picks the look, not your habit. A B2B buyer, a design-savvy consumer and a public-sector visitor need three different pages.
- Set three dials from that read (1 to 10): **variance** (symmetry to art), **motion** (still to cinematic), **density** (gallery to cockpit). Default landing page: 7 / 6 / 4. Trust-first or regulated: 3 / 2 / 5.
- Name one **signature detail** the page will be remembered by: a type treatment, a material, an interaction, a way the product is shown. One, done well.
- If the brief pins fonts, colors or an era, the brief wins over every rule here.

### Step 2: Build on the craft floor

- **Type:** a real display face with character, paired with a readable text face. Not Inter, Roboto, Arial or the system stack as the display voice unless the brief asks for neutral. Body 16px or more, 60 to 75 characters a line, clear size and weight steps.
- **Color:** one neutral family, one accent, locked across the page. No purple-to-blue "AI glow" gradients, no gradient text, no colored glow halos. Secondary text tinted from its surface, never plain gray on color. Body contrast 4.5:1 or better.
- **Layout:** the hero fits the first screen with its call to action visible. No small uppercase eyebrow label over every heading. No row of three same-size cards as the page's structure. Each section uses a different layout family. Spacing tighter inside a group than between groups.
- **Icons and copy:** real SVG icons in one stroke weight, never emoji. The product's own words: no lorem ipsum, no "Acme", no "John Doe", no "Unlock the power of".
- **States:** hover, focus-visible, active, disabled, loading, empty and error exist for every control that has them. Style the browser parts too: selection color, focus ring, scrollbar, caret.
- **Motion:** one authored moment, eased out, from an already-visible default. Respect `prefers-reduced-motion`.
- **Phone first:** every multi-column block declares what it becomes under 768px. Tap targets at least 44px. Nothing scrolls sideways.

### Step 3: Run the gate

```bash
python3 skills/tastegate/scripts/gate.py <path/to/index.html or http://localhost:3000> --out .tastegate
```

(Run it from the repo root, or use the path to wherever this skill is installed.)

It renders the page in headless Chromium at 390x844 and 1440x900, prints every finding with
its rule, viewport and element, saves full-page screenshots, and exits 1 while any **fail**
finding is open. First run only: `pip install playwright && python3 -m playwright install chromium`.

Fix every fail finding in one batch, then run the gate again. Warnings are judgment calls:
fix them unless the brief asked for that thing.

### Step 4: Look at it yourself

Open both screenshots the gate saved (`.tastegate/desktop.png`, `.tastegate/mobile.png`). The
gate catches mechanics; it cannot tell you the page is boring. Ask: would a designer at a good
studio ship this? Does the signature detail land in the first viewport? Is anything still a
default you did not choose? Fix what you see, rerun the gate, then stop.

## Examples

### Example 1: A landing page that passes review but fails the gate

The copy and sections are right, so the work reads as done. The gate at 390px reports the
hero heading overlapping the nav, a 3.1:1 contrast ratio on secondary text, and sideways
scroll from an un-wrapped feature row. Three real defects, none visible in the markup.

### Example 2: "Make it look less AI"

The gate names what "AI slop" actually is on this page: a purple-to-blue gradient hero,
gradient heading text, emoji feature icons, an uppercase eyebrow over every section, the
system font stack as the display voice, and three equal cards carrying the structure. Each
is a line item to fix, not a matter of opinion.

## Best Practices

- ✅ Write the direction line before the first line of CSS
- ✅ Fix all fail findings in one batch, then rerun the gate
- ✅ Open both screenshots yourself after the last change
- ✅ Report the gate's last line and the screenshot paths with the result
- ❌ Don't call a page done on a passing build or a glance at the markup
- ❌ Don't let a default font, palette or card grid decide the page

## Limitations

- The gate checks mechanics. It cannot tell you the page is boring, off-brand or wrong for the audience: step 4 is not optional.
- It needs Playwright and headless Chromium installed, and a page it can reach (a file path or a local server).
- A brief that pins fonts, colors or an era overrides the craft floor.
- Does not replace accessibility auditing by a human or real user testing.

## Security & Safety Notes

- `scripts/gate.py` launches headless Chromium and loads the URL or file you give it. Point it at your own page or a local server, in a local or authorized test environment; it will fetch whatever that page fetches.
- It is read-only against your project: it renders, measures and writes screenshots plus findings into the `--out` directory. It does not edit source files.

## Files

- `scripts/gate.py` - the browser gate (needs `playwright` and headless Chromium)
- `references/direction.md` - the full step 1 direction rules
- `references/craft-floor.md` - the full step 2 craft floor, read it right before the first UI edit

## Credits

Adapted from [stas4000/tastegate](https://github.com/stas4000/tastegate) (MIT). The direction
rules derive from taste-skill (MIT) and the craft floor from impeccable (Apache-2.0); both
notices ship here in [references/THIRD_PARTY_NOTICES.md](references/THIRD_PARTY_NOTICES.md) with their
full licenses under `references/`.
