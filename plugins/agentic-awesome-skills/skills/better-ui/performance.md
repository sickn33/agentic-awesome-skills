# Performance

Recipes for transition specificity and compositing hints.

## Transition only what changes

`transition: all` animates properties nobody meant to animate, such as colors on a theme flip. On layout properties such as `width` and `padding` it re-runs layout on every frame. Tailwind's bare `transition` is a curated list rather than `all`, and still covers more than most elements change.

```css
/* Good: only what changes */
.button {
  transition-property: scale, background-color;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

/* Bad: everything */
.button {
  transition: all 150ms ease-out;
}
```

```tsx
// Good: explicit properties
<button className="transition-[scale,background-color] duration-150 ease-out">

// Bad: transition all
<button className="transition-all duration-150 ease-out">
```

In Tailwind 4, `transition-transform` covers `transform, translate, scale, rotate`, and in Tailwind 3 only `transform`. Use it when animating transforms alone. Mixing transform and other properties takes the bracket syntax, as in `transition-[scale,opacity,filter]`.

## Use will-change sparingly

`will-change` promotes an element to its own compositing layer ahead of time. Without it the browser promotes when the animation starts, and that one-time promotion can stutter on the first frame. Each extra layer costs memory, so never add it preemptively.

```css
/* Good: names the property that animates */
.animated-card {
  will-change: scale, opacity;
}

/* Bad: never all */
.animated-card {
  will-change: all;
}

/* Bad: these never composite */
.animated-card {
  will-change: background-color, padding;
}
```

| Property | Worth `will-change` |
| --- | --- |
| `transform`, `translate`, `scale`, `rotate` | Yes |
| `opacity` | Yes |
| `filter` | Yes |
| `clip-path` | Rarely, since compositing it is not reliable across browsers |
| `top`, `left`, `width`, `height` | No |
| `background`, `border`, `color` | No |

`will-change` on a transform property or `filter` makes the element the containing block for its `position: fixed` descendants, so a fixed modal or tooltip inside it stops tracking the viewport. Any of these values also creates a stacking context, which can reorder `z-index` against siblings.
