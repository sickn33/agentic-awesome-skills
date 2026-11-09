# Palette structure

What a color system is made of, before any values exist. For computing the values see [palette-generation.md](palette-generation.md); for what to call them see [token-naming.md](token-naming.md).

## What a system needs

Most products need three kinds of ramp and nothing else:

| Ramp | How many | Notes |
| --- | --- | --- |
| Neutral | 1 | Carries 80–90% of the interface: backgrounds, borders, body text |
| Accent | 1 | The brand hue. Interactive and selected states |
| Status | 0–4 | `danger`, `warning`, `success`, `info`. Add one only when the product shows that state |

## Every step has a job

Each step maps to a role. Generate the steps the roles below call for and skip the rest.

| Role | Tailwind | Radix |
| --- | --- | --- |
| Page background | `50` | `1` |
| Subtle background | `50` | `2` |
| Component background | `100` | `3` |
| Component hover | `200` | `4` |
| Component active / selected | `200` | `5` |
| Subtle border, separator | `200` | `6` |
| Border, focus ring | `300` | `7` |
| Hovered border | `400` | `8` |
| Solid fill | `600` | `9` |
| Solid fill hover | `700` | `10` |
| Low-contrast text | `700` | `11` |
| High-contrast text | `900` | `12` |

The two conventions differ in kind, not only in numbering:

- **Radix defines its 12 steps by role.** Step 9 is "the solid fill" in every ramp and appearance. The dark scale is a separate ramp reusing the same numbers, so `--accent-9` is the fill in both and component CSS never changes.
- **Tailwind defines its 11 steps by lightness.** `50` is light, `950` is dark. The mapping above therefore holds in light mode and inverts in dark, with the page background at `950` and high-contrast text at `50`. Components either swap step numbers per appearance or read a semantic token that swaps once.

Match whichever the project uses. For a new system prefer Radix's model, because a role-defined step survives a theme change that a lightness-defined step does not. On Tailwind, keep `50`–`950` and put the role mapping in the semantic tier.

Solid fill sits on `600` because white text on most Tailwind `500` hues fails 4.5:1. Where the table repeats a step, those roles render identically. A design that needs, say, component hover and subtle border to differ needs a 12-step ramp.

## Neutrals

A pure gray ramp is a perfectly good default. It sits under any accent hue without competing and never needs revisiting when the brand color changes.

Tinting the neutral toward the accent hue is a stylistic option, not a correction. OKLCH chroma `0.005`–`0.02` at the accent's hue puts the grays in the accent's family. Enough to measure, not enough to name.

Warm neutrals, hue toward orange, read approachable and editorial; cool ones, toward blue, read technical and precise. Whichever you pick, including none, hold it across the whole ramp. A warm gray border on a cool gray background is visible even when neither color is nameable alone.

Neutrals carry the most roles, so they need the most steps. Never generate fewer neutral steps than accent steps.

## Status colors

Convention constrains status hues before taste does. Red reads as danger, amber as warning, green as success. See the cultural exceptions in [color-usage.md](color-usage.md).

Two rules govern them:

- **Keep every status hue at least `15°` of OKLCH hue from the accent.** If the brand is red, danger cannot also be red. Where convention leaves nowhere to move, give the destructive action a distinct treatment, such as an outlined button with an icon, or it reads as the primary action.
- **Status ramps need fewer steps than the accent.** Most render four roles: a background, a border, a solid fill and text. Generate the full ramp only where the product styles status components across the whole range.

## Auditing an existing palette

Before restructuring a system, inventory it. Most codebases hold several times more colors than the design has decisions.

1. **Collect every literal.** Grep for hex, `rgb(`, `hsl(`, `oklch(` and the project's utility-class prefixes. Include SVG `fill` and `stroke`, chart configs and email templates.
2. **Sort by perceived lightness within each hue family.** Duplicates surface immediately as near-identical neighbors.
3. **Collapse near-duplicates.** Two colors within `0.02` of each other in OKLab ΔE are one color that drifted. Keep the one used most and retire the others. Never average them.
4. **Assign each survivor a role** from the table above. A color matching no role is a missing token or a mistake. Decide which, and say so in the finding.
5. **Count what is left.** More ramps than **What a system needs** lists means the palette outgrew its structure, not that the product needs more color.

Report the inventory before changing anything. Consolidating a palette changes rendered output on screens nobody asked you to touch, so it stays a proposal until the user accepts it.
