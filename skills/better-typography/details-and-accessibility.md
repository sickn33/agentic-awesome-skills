# Details and accessibility

Underlines, selection, form text and decorative text.

## Underlines

From the font's own metrics:

```css
a {
  text-underline-position: from-font;
  text-decoration-thickness: from-font;
}
```

A dotted underline on an abbreviation:

```css
abbr {
  text-decoration: underline dotted;
}
```

Or tune manually:

```css
a {
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-gray-1000);
  transition: text-decoration-color 200ms ease-out;
}

a:hover {
  text-decoration-color: var(--color-gray-1200);
}
```

## Selection

- `::target-text` styles the phrase a shared link scrolls to.
- The Custom Highlight API styles ranges you pick yourself, like search matches, without extra markup.

## Forms and editable text

- `::placeholder` styles the hint in an empty field.
- `caret-color` colors the blinking insertion bar. A fully custom caret is hard to build and rarely worth it.

### iOS input zoom

**Size up on mobile.** The input renders at `16px` on small screens and drops to the design size from the `sm` breakpoint up. Nothing to compensate, but the mobile input no longer matches the desktop one.

```tsx
<input className="text-base sm:text-sm" type="email" />
```

**Scale the text down.** Keep `font-size` at `16px` so Safari never zooms, then render at the intended size with a transform. Widen the element by the inverse of the scale so it still fills its container once shrunk. Divide `line-height` by the same factor so the intended leading survives. `origin-left` pins the text to the start edge, `origin-right` under RTL. Above the breakpoint, drop the transform and set the real size.

```tsx
// 13px rendered from a 16px font-size: 13 / 16 = 0.8125
<div className="flex h-10 items-center overflow-hidden rounded-[10px] bg-gray-300 px-2.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500">
  <input
    className="h-full w-[calc(100%/0.8125)] shrink-0 origin-left rtl:origin-right scale-[0.8125] bg-transparent text-base leading-[calc(1.125/0.8125)] outline-none sm:w-full sm:scale-100 sm:text-[13px]"
    type="email"
  />
</div>
```

`shrink-0` preserves the compensated width inside the flex wrapper. The wrapper clips the oversized layout box and draws an unscaled focus outline. Use the project's focus color and verify its contrast against the surrounding surface.

The transform shrinks the whole box, not only the glyphs, so let a wrapper draw the field's surface and keep the input transparent. A background, border or ring on the scaled element shrinks with the text and misses the intended hit area.

## Decorative text

| Property | Effect |
| --- | --- |
| `::first-letter` | Drop cap, widely supported |
| `::first-line` | Styles only the first line |
| `initial-letter` | Sizes the drop cap; Safari needs `-webkit-initial-letter`, no Firefox yet |
| `background-clip: text` | Clips a background or gradient to the letter shapes |
| `-webkit-text-stroke` | Outlines the letters; works across modern browsers despite the prefix |
| `text-shadow` | Like `box-shadow` but follows the character shapes |

If `-webkit-text-stroke` draws lines inside the letters, the font has overlapping contours. Variable fonts often keep them unmerged, so use the static cut for stroked text.
