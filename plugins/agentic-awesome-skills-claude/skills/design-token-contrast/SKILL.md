---
name: design-token-contrast
description: "Checks WCAG 2.2 contrast between the color tokens of a project (light and dark theme) and suggests the closest passing color that keeps the hue."
category: frontend
risk: safe
source: community
source_repo: Clagoss/claude-code-para-disenadores
source_type: community
date_added: "2026-10-19"
author: Clagoss
tags: [accessibility, wcag, contrast, design-tokens, css, dark-mode]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Clagoss/claude-code-para-disenadores/blob/main/LICENSE"
---

# Design Token Contrast

## Overview

Measures contrast on the **tokens**, not on screens: a problem fixed in a token is fixed
everywhere it is used. A Node checker, shipped as source in
[references/contraste-checker.md](references/contraste-checker.md), reads the CSS custom properties
of the project, pairs text tokens with background tokens, measures each pair in the light theme
and in dark mode, and, for every pair that fails, proposes the color with the same hue and the
nearest lightness that passes. It also proposes **one value per token** that passes against every
background it is measured on, so the fix is a single change.

WCAG 2.2 AA minimums it applies: normal text **4.5:1** (1.4.3), large text **3:1**, and UI
components and graphics such as input borders, icons and focus rings **3:1** (1.4.11).

## When to Use This Skill

- Use when the palette changes, a color is added, or a light or dark theme is about to be approved.
- Use when the user asks whether a text color is readable on its background.
- Use when an accessibility audit flags contrast and you want the fix at the token level.

## How It Works

### Step 1: Run the measurement

The checker ships as source, not as a committed script: save the JavaScript block in
[references/contraste-checker.md](references/contraste-checker.md) as `contraste.mjs` in a
scratch directory (no dependencies, Node 18+), then run it:

```bash
node contraste.mjs --tokens src/styles/tokens.css
```

Without `--tokens` it looks for `src/styles/tokens.css` and other common locations. The script:

- Reads `--color-*` variables in hex, `rgb()`, `hsl()` or `oklch()`, resolves `var(--other)`, and
  separates the default theme from dark mode (`prefers-color-scheme: dark`, `.dark` or
  `[data-theme=dark]`).
- Pairs tokens by name: text tokens (`text`, `foreground`, `link`, `focus`…) over background tokens
  (`background`, `bg`, `surface`, `card`, `canvas`…). Spanish token names (`texto`, `fondo`,
  `superficie`, `tarjeta`) are recognized too.
- Prints `OK` or `NO` per pair, with the ratio, the minimum and the suggestion.

If token names do not follow that pattern, write the real pairs to a JSON file and pass it with
`--pares` (the keys are `texto`, `fondo` and `tipo`, where `tipo` is `texto` or `ui`):

```json
[{"texto": "--color-gray-500", "fondo": "--color-white", "tipo": "texto"},
 {"texto": "--color-input-border", "fondo": "--color-white", "tipo": "ui"}]
```

To explore a new palette, `--todos` measures every color against every other. `--json out.json`
writes the results for further processing. The script's output is in Spanish; ratios and token
names read the same in any language.

### Step 2: Check what the script cannot see

- Text over **images or gradients**: capture the section and check the worst spot.
- Text with **opacity**, or colors hard-coded outside the tokens (search for `#[0-9a-fA-F]{3,8}`,
  `rgb(`, `text-[#`).
- States: `hover`, `disabled` (exempt, but still distinguishable), and placeholders that carry
  information.

### Step 3: Report and propose

| Pair | Now | Minimum | Suggestion | Where it is used |
|---|---|---|---|---|

Search for the classes and `var(--color-...)` references to fill "where it is used".

## Examples

### Example 1: A gray that fails on white

```text
== tema claro (por defecto): 4 colores leídos ==
  NO  3.54:1 (mín. 4.5) --color-text #888888 sobre --color-background #ffffff
       sugerencia para --color-text: oklch(56.2% 0.000 89.9) (#757575) → 4.62:1
```

Propose `#767676` for `--color-text` (the single value that passes on all its backgrounds), apply
it only after the user agrees, and run the script again to show it passes.

## Best Practices

- ✅ Fix the token once instead of patching each screen.
- ✅ Offer options: darken the token, keep the color only for large text, or add a new token
  (`--color-accent-text`) for small text and keep the original for fills and borders.
- ❌ Don't change brand colors without asking.
- ❌ Don't report a theme as passing without checking dark mode too.

## Limitations

- It measures tokens, not rendered pixels: images, gradients and opacity need a visual check.
- Pairing by name is a heuristic; use `--pares` when names are unconventional.
- This skill does not replace environment-specific validation, testing, or expert review.

## Security & Safety Notes

- The script only reads the CSS or JSON file you point it to and writes a file only with `--json`.
  It makes no network requests and installs nothing. Requires Node 18+.
- It never edits tokens by itself; changes are proposed and applied after the user approves.

## Common Pitfalls

- **Problem:** A dark-mode pair shows `OK` against the light background.
  **Solution:** Make sure dark-mode variables live in a `prefers-color-scheme: dark`, `.dark` or
  `[data-theme=dark]` block so the script can separate the themes.

## Related Skills

- `@wcag-audit-patterns` - For a full WCAG 2.2 audit beyond color contrast.
