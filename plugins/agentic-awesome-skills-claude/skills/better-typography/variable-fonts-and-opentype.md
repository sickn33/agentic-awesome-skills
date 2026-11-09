# Variable fonts and OpenType

What a font file can do beyond drawing letters and how to reach those abilities from CSS.

## Static vs variable

- **Static font:** one weight and one style per file. Regular, medium and bold is three files.
- **Variable font:** a whole range in one file. Any value in it works, such as `font-weight: 589`.

A variable font is not automatically better. At one or two weights, static files can be smaller. At several weights, optical sizes or custom axes, a variable font usually wins.

## Disable synthesis narrowly

`font-synthesis: none` disables weight, style, small-cap and position synthesis together. Scope it to an isolated treatment you have verified across the fallback stack:

```css
.brand-wordmark {
  font-synthesis: none;
}
```

To disable one mode, use its longhand: `font-synthesis-weight`, `font-synthesis-style`, `font-synthesis-small-caps` or `font-synthesis-position`.

## Axes

Variable-font controls, each with a four-letter tag. A font supports only the axes its designer included.

| Axis | Tag | Controls |
| --- | --- | --- |
| Weight | `wght` | Stroke thickness (like `font-weight`) |
| Optical size | `opsz` | Details and spacing tuned for the display size |
| Width | `wdth` | Glyph width |
| Slant | `slnt` | Slant angle |
| Custom | e.g. `GRAD` (Roboto Flex) | Whatever the designer built |

Inter's variable file exposes only `wght` and `opsz`.

Optical sizes predate variable fonts. Many families still ship them as separate `Text` and `Display` files instead of an `opsz` axis.

## Raw tags only for custom axes

`font-variation-settings` silently does nothing on a non-variable fallback, where `font-weight` still picks the nearest face:

```css
/* Good: common axes use the properties */
.heading {
  font-weight: 650;
}

/* Good: custom axis with no property of its own */
.heading-grade {
  font-variation-settings: "GRAD" 80;
}

/* Bad: weight via raw tag breaks on fallback fonts */
.heading {
  font-variation-settings: "wght" 650;
}
```

## OpenType features

Unlike axes, features work the same on static and variable fonts. A font ships only the features its designer included.

| Tag | Feature |
| --- | --- |
| `tnum` | Tabular numbers: every digit the same width |
| `zero` | Slashed zero: `0` distinct from `O` |
| `liga` | Ligatures: joins pairs like "fi" into one shape |
| `ss01`–`ss20` | Stylistic sets (numbered slots) |
| `cv01`–`cv99` | Character variants (numbered slots) |

Common features have a `font-variant-*` property, and `font-feature-settings` is for the rest:

```css
/* Good: common features use the properties */
.price {
  font-variant-numeric: tabular-nums;
}

.id {
  font-variant-numeric: slashed-zero;
}

/* Good: niche feature with no property of its own */
.logo {
  font-feature-settings: "ss01" 1;
}
```

## Small caps, superscripts, subscripts

- **Small capitals:** uppercase letters drawn at a smaller size. Enable real ones with `font-variant-caps`.
- **Superscripts** sit above the normal line, the 2 in x², and **subscripts** below it, as in H₂O. Enable proper glyphs with `font-variant-position`.

Both require the font to include the glyphs.

## Stylistic sets and character variants

`ss01` = stylistic set, slot 01. `cv11` = character variant, slot 11. What each slot does differs font to font, which is why they are numbered, not named. Check the font's docs. In Inter, `ss01` switches to open digits and `cv11` swaps in a single-story `a`.
