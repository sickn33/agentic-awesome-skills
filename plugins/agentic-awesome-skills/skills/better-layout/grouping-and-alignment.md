# Grouping and alignment

Recipes for grouping, control distinction, shared edges, logical properties and ordering.

## Group with space, not lines

Reach for each tool only where the one before it can't carry the structure:

1. **Negative space**, the default.
2. **Background shapes**, a card or filled container, where a group must read as one unit such as a selectable row or a draggable card.
3. **Separator lines**, for dense data where space costs too much, such as tables and long settings lists.

```css
/* Good: spacing alone communicates the grouping */
.field-group { display: flex; flex-direction: column; gap: 8px; }
.form { display: flex; flex-direction: column; gap: 24px; }

/* Bad: uniform spacing plus lines to compensate */
.form > * { margin-bottom: 12px; border-bottom: 1px solid var(--separator); }
```

```html
<!-- Good: Tailwind -->
<div class="space-y-6">
  <div class="space-y-2">…field group…</div>
  <div class="space-y-2">…field group…</div>
</div>
```

Where a separator is genuinely needed, keep it a low-contrast hairline. Never pair it with a large gap that already did the job.

## Keep controls distinct from content

```html
<!-- Bad: action looks exactly like the description text next to it -->
<p class="text-zinc-600">Your trial ends soon. Upgrade now</p>

<!-- Good: the underline marks the action -->
<p class="text-zinc-600">Your trial ends soon.</p>
<button class="font-medium underline underline-offset-2">Upgrade now</button>
```

The inverse holds too. A non-clickable badge shaped exactly like the buttons beside it collects dead clicks.

## Align to shared edges

- Typical stray edges are an icon 2px off the text edge and a card padded unlike its neighbor.
- Deeper nesting repeats the same spacing step rather than inventing a new one.
- Numbers in tables take `text-align: end`, text takes `text-align: start`. Tabular figures are `better-typography`'s.

```css
/* Good: one shared leading edge, one indent step */
.section { padding-inline: 24px; }
.section .child { margin-inline-start: 16px; }

/* Bad: three unrelated leading edges in one column */
.header { padding-inline-start: 20px; }
.list-item { padding-inline-start: 14px; }
.footer { padding-inline-start: 24px; }
```

## Logical properties for anything that mirrors

| Physical | Logical |
| --- | --- |
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `border-right` | `border-inline-end` |
| `float: left` | `float: inline-start` |
| `border-top-left-radius` | `border-start-start-radius` |

```html
<!-- Good: Tailwind logical utilities -->
<div class="ms-4 pe-6 text-start">…</div>

<!-- Bad: breaks in RTL -->
<div class="ml-4 pr-6 text-left">…</div>
```

Flex rows and grid columns follow the inline direction, so they mirror under `dir="rtl"` on their own. Physical values inside them do not mirror, and neither do `translateX`, `background-position` or anything hand-positioned with `left` and `right`.

Where arrangement encodes progression, as in star ratings, step indicators and progress bars, the sequence mirrors in RTL. Stars fill from the leading edge, which is the right in RTL. Digit order inside numbers never reverses; that and other bidi rules belong to `better-typography`.

## Order by importance

Never bury the one number the user came for under rows of secondary detail. Move secondary detail into collapsed sections, tabs or detail views.

```html
<!-- Good: primary fact first, detail demoted -->
<div>
  <p class="text-2xl font-semibold">$4,320.00</p>
  <p class="text-sm text-zinc-500">Available balance</p>
</div>

<!-- Bad: the key fact sits last, below the metadata -->
<div>
  <p class="text-sm">Account 4402 · Opened 2019 · Standard tier</p>
  <p class="text-sm">Last statement: June 30</p>
  <p class="text-sm">Balance: $4,320.00</p>
</div>
```
