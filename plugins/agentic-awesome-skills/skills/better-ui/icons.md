# Icons

Icon stroke weight, sizing, state colors, variants and RTL mirroring.

## Match icon stroke to text weight

| Adjacent text | Rendered stroke width |
| --- | --- |
| Regular (400), 14–16px | `1.5px` |
| Medium or semibold (500–600) | `2px` |
| Bold (700), or an emphasized standalone icon | `2.5px` |

The widths are rendered pixels. A 24px-grid icon drawn at 16px scales its stroke by 16/24, so `stroke-width="2"` paints about `1.33px`. Use the library's absolute-stroke option, such as Lucide's `absoluteStrokeWidth`, or set `vector-effect: non-scaling-stroke` on the SVG's shapes.

```tsx
// Good: stroke tuned to the semibold label
<button className="flex items-center gap-2 font-semibold">
  <Plus size={16} strokeWidth={2} absoluteStrokeWidth />
  New project
</button>

// Bad: 1.5px stroke against a bold label
<button className="flex items-center gap-2 font-bold">
  <Plus size={16} strokeWidth={1.5} absoluteStrokeWidth />
  New project
</button>
```

- **One library per surface.** Never mix icon libraries on one toolbar. Where the library has no stroke variants, keep its native stroke and use size or color for emphasis.
- **Size inline icons at `1em`–`1.25em`** of the adjacent font size, so the pair scales together.

## One SVG, recolored per state

Draw every icon with `currentColor` and let CSS state drive the color. Strip hardcoded fills such as `fill="#666"` to `currentColor` when importing icons.

```html
<svg fill="none" stroke="currentColor" stroke-width="2">…</svg>
```

```css
/* Use the project's color tokens */
.icon-button { color: var(--icon-muted); }
.icon-button:hover { color: var(--icon-strong); }
.icon-button[aria-pressed="true"] { color: var(--icon-active); }
.icon-button:disabled { opacity: 0.4; }
```

```html
<!-- Tailwind, with the project's token names -->
<button class="text-icon-muted hover:text-icon-strong aria-pressed:text-icon-active disabled:opacity-40">
  <BookmarkIcon />
</button>
```

## Outline default, fill active

Where an icon set offers outline and filled variants, use them as a state pair, never interchangeably:

| Variant | Use for |
| --- | --- |
| Outline | Default state in toolbars, list rows and inline text |
| Fill | Selected or active state, such as the active tab, a toggled bookmark or a liked heart |

```tsx
// Good: variant communicates state
<TabIcon variant={isActive ? "solid" : "outline"} />

// Bad: filled everywhere, so the active tab has no state signal
<TabIcon variant="solid" />
```

Cross-fade the swap with the values in [icon-transitions.md](icon-transitions.md) only where the change is infrequent, such as a bookmark or a like. An active tab swaps instantly.

## Design at render size

- Test every icon at the smallest size it renders, often `16px`. It must stay recognizable there.
- Prefer a simplified glyph for small contexts over scaling down detailed artwork.
- Where the set ships per-size grids such as `16`, `20` and `24`, use the grid that matches the render size. A 24px drawing scaled to 16px lands off the pixel grid and renders soft.
- Always SVG, never raster.

## Icons in RTL

Under `dir="rtl"`, flip icons whose meaning is tied to reading direction, and leave the rest alone:

| Flip | Don't flip |
| --- | --- |
| Back and forward arrows, navigation chevrons | Logos and brand marks |
| Text-block glyphs for alignment, lists and indent | Checkmarks |
| Speaker and volume waves | Physical objects such as clocks, cups and pencils |
| Directional glyphs such as "send" | Media playback, which stays LTR by convention |

Use one mechanism per element. Two flips on one icon can compound back to unflipped.

```css
[dir="rtl"] .icon-directional {
  scale: -1 1;
}
```

```tsx
// Tailwind
<ChevronRightIcon className="rtl:-scale-x-100" />
```

Analyze composite icons part by part. A badge or slash overlay may keep its position while the base glyph flips. Accessible names for icon-only buttons belong to `better-accessibility`.
