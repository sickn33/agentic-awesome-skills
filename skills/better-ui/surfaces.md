# Surfaces

Recipes for concentric radius, optical alignment, shadow rings and image outlines.

## Concentric border radius

```
outerRadius = innerRadius + padding + borderWidth
```

```css
/* Good: concentric radii */
.card {
  border-radius: 20px; /* 12 + 8 */
  padding: 8px;
}
.card-inner {
  border-radius: 12px;
}

/* Bad: same radius on both */
.card {
  border-radius: 12px;
  padding: 8px;
}
.card-inner {
  border-radius: 12px;
}
```

```tsx
// Good: outer radius accounts for padding
<div className="rounded-2xl p-2">       {/* 16px radius, 8px padding */}
  <div className="rounded-lg">          {/* 8px radius = 16 - 8 */}
    ...
  </div>
</div>

// Bad: same radius on both
<div className="rounded-xl p-2">
  <div className="rounded-xl">
    ...
  </div>
</div>
```

## Optical alignment

### Buttons with text and an icon

Start the icon side at `2px` less padding than the text side, then judge by eye.

```css
/* Good: less padding on the trailing icon side */
.button-with-icon {
  padding-inline-start: 16px;
  padding-inline-end: 14px;
}

/* Bad: equal padding pushes the icon visually outward */
.button-with-icon {
  padding-inline: 16px;
}
```

```tsx
// Tailwind
<button className="ps-4 pe-3.5 flex items-center gap-2">
  <span>Continue</span>
  <ArrowRightIcon />
</button>
```

### Play button triangles

A triangle's geometric center sits left of its visual center, so shift it toward its point:

```css
.play-button svg {
  transform: translateX(2px); /* physical on purpose: playback icons never mirror */
}
```

### Asymmetric icons

Stars, arrows and carets carry uneven visual weight. Fix the `viewBox` or path in the SVG, so the component needs no extra offset. Where the asset cannot change, nudge its wrapper:

```tsx
<span className="translate-x-px">
  <StarIcon />
</span>
```

## Shadow recipes

### Light mode

Three layers. The first acts as a 1px ring, the second adds lift and the third ambient depth:

```css
:root {
  --shadow-border:
    0px 0px 0px 1px oklch(0 0 0 / 0.06),
    0px 1px 2px -1px oklch(0 0 0 / 0.06),
    0px 2px 4px 0px oklch(0 0 0 / 0.04);
  --shadow-border-hover:
    0px 0px 0px 1px oklch(0 0 0 / 0.08),
    0px 1px 2px -1px oklch(0 0 0 / 0.08),
    0px 2px 4px 0px oklch(0 0 0 / 0.06);
}
```

### Dark mode

Depth shadows vanish on dark backgrounds, so dark mode keeps one white ring:

```css
/* Redefine under the project's dark selector */
--shadow-border: 0 0 0 1px oklch(1 0 0 / 0.08);
--shadow-border-hover: 0 0 0 1px oklch(1 0 0 / 0.13);
```

### Usage

```css
.card {
  border: 1px solid transparent; /* forced-colors mode drops box-shadow and paints this border */
  box-shadow: var(--shadow-border);
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

.card:hover {
  box-shadow: var(--shadow-border-hover);
}
```

The transparent border keeps the box the same size as the border it replaces.

## Image outlines

```css
:root {
  --image-outline: oklch(0 0 0 / 0.1);
}
/* Redefine under the project's dark selector */
--image-outline: oklch(1 0 0 / 0.1);

.content-image {
  outline: 1px solid var(--image-outline);
  outline-offset: -1px;
}
```

```tsx
<img
  className="outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
  src={src}
  alt={alt}
/>
```

Never `outline-slate-*`, `outline-zinc-*`, `outline-neutral-*` or a palette near-black such as `#111827`.

Use `outline` rather than `border` because it never changes the image's size. At `outline-offset: -1px` it sits just inside the edge and follows the corner radius.
