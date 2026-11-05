# Choosing fonts

Font categories, fallback stacks for a type change, file formats and why fonts look the way they do.

## Choosing a typeface

| Category | Traits | Use for |
| --- | --- | --- |
| Serif | Small strokes at the ends of letters guide the eye along a line | Long passages, editorial reading |
| Sans-serif | Clean, even shapes that stay crisp at small sizes | Default for most interfaces (Helvetica, Inter, Geist) |
| Monospace | Every glyph the same width | Code and fixed-width identifiers; numeric columns use `tabular-nums` instead |
| Display | Drawn for large headlines | Marketing headlines, hero text |
| Script | Mimics handwriting | Rare, decorative moments |

"Display" in a font's name does not make it a display font. SF Pro and Heldane ship a `Display` variant for large sizes and a `Text` variant for small ones. Use the variant matching the size you are setting.

## Fallback stacks for a type change

When a type change is asked for, two routes. `system-ui` gives each operating system's own interface face. A commercial face such as Helvetica Now is a brand decision and still needs a fallback stack.

```css
/* The platform's native interface face */
html {
  font-family: system-ui, sans-serif;
}

/* Commercial brand face with safe fallbacks */
html {
  font-family: "Helvetica Now", "Helvetica Neue", Arial, sans-serif;
}
```

## Formats

| Format | Notes |
| --- | --- |
| `.woff2` | Brotli compression, broadly supported. Use this on the web. |
| `.woff` | Older compression. Fallback only for very old browsers. |
| `.ttf` / `.otf` | Desktop formats with no built-in compression, so larger files. Only when there is no other option. |

How the files load is the project's concern.

## Anatomy of a typeface

| Term | Meaning |
| --- | --- |
| x-height | Height of a lowercase `x` |
| Cap height | Height of uppercase letters |
| Baseline | The invisible line letters sit on |
| Ascender | Part of a letter rising above the x-height |
| Descender | Part dropping below the baseline |

These measurements are why two fonts at the same `font-size` look like different sizes. A large x-height looks bigger.
