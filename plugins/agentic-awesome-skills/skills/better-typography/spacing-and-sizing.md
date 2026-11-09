# Spacing and sizing

Units, a starting type scale, the heading mapping, line-height for wrapping text and text trimming.

## Units

| Unit | Behavior |
| --- | --- |
| `px` | Fixed |
| `em` | Scales with the current font size |
| `rem` | Scales with the root font size |
| `%` on `font-size` | Relative to the parent's font size, behaves like `em` |

## Type scale

Pick an existing scale or define one. Tailwind's `text-xs` through `text-9xl`, each pairing a size with a line height, is a solid ready-made choice.

A starting point for a product interface, named by role:

```css
:root {
  --text-caption: 0.8125rem;
  --text-body: 1rem;
  --text-heading: 1.125rem;
  --text-title: 1.5rem;
  --text-display: 2.25rem;
}
```

| Role | Size | Line-height | Weight |
| --- | --- | --- | --- |
| Display | `2.25rem` (36px) | `1.1` | `600` |
| Title | `1.5rem` (24px) | `1.2` | `600` |
| Heading | `1.125rem` (18px) | `1.3` | `600` |
| Body | `1rem` (16px) | `1.5` | `400` |
| Caption | `0.8125rem` (13px) | `1.4` | `400` |

Emphasis within a role is one weight step up (`400` → `500`), not a size change.

## Heading hierarchy

```css
h1 { font-size: var(--text-display); }
h2 { font-size: var(--text-title); }
h3 { font-size: var(--text-heading); }
```

In Tailwind, centralize the per-level classes in a component or `@layer base` rather than repeating them inline.

## Line-height for wrapping text

```css
/* Bad: card description at heading leading */
.card-description { line-height: 1.1; }

/* Good: it wraps to 3 lines, so it reads as body text */
.card-description { line-height: 1.4; }
```

## Text trimming with text-box

`text-box` takes which edges to trim (`trim-both`, `trim-start`, `trim-end`) and where:

| Keyword | Trims at |
| --- | --- |
| `cap` | The cap height (top) |
| `alphabetic` | The baseline (bottom) |
| `text` | The font's own text edge, keeping room for descenders |

```css
/* trim top and bottom */
.badge {
  text-box: trim-both cap alphabetic;
}

/* trim only the top */
.heading {
  text-box: trim-start cap;
}

/* trim only the bottom */
.label {
  text-box: trim-end alphabetic;
}
```

Supported in Chromium 133+ and Safari 18.2+, not yet Firefox. Unsupported browsers keep the default leading.
