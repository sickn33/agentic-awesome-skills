# Hit areas

Target sizes, expanding hit areas without changing visual size, collision rules and drag alternatives.

## Target sizes

| Standard | Minimum |
| --- | --- |
| WCAG 2.5.8 (AA) | 24×24px, with exceptions |
| WCAG 2.5.5 (AAA) | 44×44px |
| Apple HIG | 44×44pt |
| Material Design | 48×48dp |

Before reporting an undersized target, check the spacing, equivalent-control, inline, user-agent and essential exceptions.

Under the spacing exception, an undersized target passes when a 24px circle centered on its bounding box intersects no other target and no other undersized target's circle. In the simple case, 20px targets need a 4px gap.

The visible element can stay small; the hit area is what must be big. Anything that looks clickable must be clickable across its whole visual extent.

## Expanding the hit area

Where the visible element is smaller, say a 20×20 checkbox, extend the hit area with a pseudo-element. Put it on a wrapping element or the `<button>`, never on the `<input>`, because form controls don't render `::before`/`::after` reliably.

### CSS example

```css
/* 20px checkbox with a 44px hit area, on the wrapper around the input */
.checkbox-control {
  position: relative;
  width: 20px;
  height: 20px;
}

.checkbox-control::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%; /* physical centering: direction-independent */
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
}
```

### Tailwind example

```tsx
<button
  aria-label="Mark done"
  className="relative size-5 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2"
>
  <CheckIcon aria-hidden="true" />
</button>
```

### Layout alternative

Where the element can afford real box size, skip the pseudo-element and let the box be the target:

```css
.icon-button {
  min-width: 44px;
  min-height: 44px;
  display: inline-grid;
  place-items: center;
}
```

## Collision rule

Where the extended hit area overlaps another interactive element, shrink the pseudo-element to the largest size that does not collide.

## Decorative layers

A decorative layer painted over interactive content absorbs every pointer event its box covers: a gradient scrim, a glow, a blurred sheen, a full-bleed `::after`. The control underneath looks live and does nothing, and no hit-area sizing fixes it.

Give each one `pointer-events: none` (Tailwind `pointer-events-none`) so events reach the control below. A layer that is an element rather than a pseudo-element also gets `aria-hidden="true"`:

```css
.card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
```

Keep pointer events on any layer the user is meant to hit: a modal scrim that dismisses on click is a control, not decoration.

## Gestures and dragging

- Every drag needs a single-pointer alternative under 2.5.7, such as move-up and move-down buttons on a sortable row, or a menu on a kanban card.
- Every multipoint or path-based gesture, such as a pinch or a swipe, needs a single-pointer alternative under 2.5.1.
- Set `touch-action: none` on a surface implementing its own pan, zoom or drag gestures, so the browser stops claiming them for scrolling and pinch-zoom. Scope it to that surface; at page level it removes scrolling.
