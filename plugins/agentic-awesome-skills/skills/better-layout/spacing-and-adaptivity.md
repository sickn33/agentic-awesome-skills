# Spacing and adaptivity

Recipes for control clearance, edge insets, disclosure cues, edge behavior, breakpoints and growth.

## Borderless controls need more clearance

| Between | Starting point |
| --- | --- |
| Adjacent bordered or filled controls, such as buttons and inputs | `12px` |
| Visible glyphs of borderless controls, such as text and icon buttons | `24px` |
| Unrelated control groups | `24px` or more |

Nothing marks where one borderless target ends and the next begins, so the space is the boundary. Preserve an established, usable density rather than expanding controls to match these values.

```html
<!-- Good: bordered buttons at 12px -->
<div class="flex gap-3">
  <button class="rounded-lg border px-4 py-2">Cancel</button>
  <button class="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
</div>

<!-- Bad: three borderless icon buttons packed at 4px -->
<div class="flex gap-1">
  <button><TrashIcon /></button>
  <button><ArchiveIcon /></button>
  <button><ShareIcon /></button>
</div>
```

Target sizes and hit-area expansion belong to `better-accessibility`. Space controls so their expanded hit areas never overlap.

## Inset buttons from the edges

A button pressed against the viewport looks like system chrome and clips against curved corners and gesture zones.

```css
/* Good: inset action bar */
.action-bar {
  padding-inline: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
.action-bar button { width: 100%; }

/* Bad: button glued to three edges, and 100vw adds the scrollbar width */
.action-bar button {
  width: 100vw;
  position: fixed;
  bottom: 0;
}
```

The button can still span the full content width inside the margins.

## Hint at hidden content

- **Peeking items.** A row of cards that ends exactly at the container edge looks complete, and nobody scrolls it.
- **Disclosure controls.** A collapsed section gets a chevron or a "Show more" control naming what is hidden: "Show 12 more results", not "More".
- **Truncated values.** Pair the clamp with an expand control, a link to a detail view or a tooltip that also opens on keyboard focus. A hover-only `title` attribute does not count, because keyboard and touch users never see it.

The item width sets the peek: width = `100%` + gap − peek, since `100%` is the container's content box. Scroll padding keeps snapped items on the content edge.

```css
.scroller {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-inline: 24px;
  scroll-padding-inline: 24px;
  scroll-snap-type: x mandatory;
}
.scroller > * {
  flex: 0 0 calc(100% - 12px); /* content box + 12px gap - 24px peek */
  scroll-snap-align: start;
}
```

```html
<!-- Tailwind: the same 24px peek -->
<div class="flex gap-3 overflow-x-auto px-6 scroll-px-6 snap-x snap-mandatory">
  <div class="w-[calc(100%-12px)] shrink-0 snap-start">…</div>
  <div class="w-[calc(100%-12px)] shrink-0 snap-start">…</div>
</div>
```

## Content bleeds, controls float

```css
/* Good: full-bleed media inside a constrained article */
.article {
  display: grid;
  grid-template-columns: 1fr min(65ch, calc(100% - 48px)) 1fr;
}
.article > * { grid-column: 2; }
.article > .full-bleed { grid-column: 1 / -1; }
```

Safe-area insets are physical, so a floating button pairs each physical side with its own inset and overrides it in RTL:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.fab {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
}
[dir="rtl"] .fab {
  right: auto;
  left: calc(16px + env(safe-area-inset-left));
}

/* Sticky header never covers an anchor target or a focused element */
html { scroll-padding-block-start: var(--header-height); }
```

## Hold structure until it breaks

Break where the layout stops fitting, not at `768px` because a preset says so. That is where the sidebar squeezes content below its minimum measure, or a card grid drops below a usable column width.

```css
/* Good: component adapts to its container */
.card-list { container-type: inline-size; }
@container (width < 400px) {
  .card { grid-template-columns: 1fr; }
}

/* Bad: viewport media query breaks the card inside a narrow sidebar */
@media (max-width: 768px) {
  .card { grid-template-columns: 1fr; }
}
```

A query styles only descendants of the container, never the container itself. `container-type: inline-size` adds size containment, so the container no longer takes its width from its content. A shrink-to-fit container such as a flex item with no width, an inline-block or an absolutely positioned box collapses to zero.

## Plan for growth and clipping

```css
/* Good: label defines the size, and the row wraps */
.button { padding-inline: 16px; max-width: 100%; }
.button-row { display: flex; flex-wrap: wrap; gap: 12px; }

/* Bad: German will overflow or truncate */
.button { width: 96px; overflow: hidden; }
```

A grid track or flex child refuses to shrink below its content's minimum width, so long words and wide tables push the layout past the viewport. Use `grid-template-columns: minmax(0, 1fr)` and `min-width: 0` on flex children.

Fixed-height containers clip text at 200% zoom and in long locales. Use `min-height` where a floor is needed. Where a box must cap its height, pair `max-height` with `overflow-y: auto`.

Typical clip-prone spots are the bottom edge of a resizable pane, the bottom of a modal taller than the viewport and anything the on-screen keyboard covers:

- Size full-height panes with `100dvh`, not `100vh`, which ignores mobile browser toolbars.
- Give a modal `max-height: 100dvh`, a scrolling body and an action row outside the scroll area.
- Keep primary actions in stable chrome, such as a sticky footer with safe-area padding or the top of the view.
