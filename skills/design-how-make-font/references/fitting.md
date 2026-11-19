# Fitting the base

`fit_font.py` turns one variable font into one static per weight. It reads the base and `targets.json`, and
nothing else.

## Why x and y come from different places

Every location of one variable font has the same points in the same order. So a glyph can take its x
coordinates from one location and its y coordinates from another, and still be a valid outline.

That matters because width and contrast often live at opposite ends of an axis. A typical text serif is wide
and low in contrast at small optical sizes, narrow and high in contrast at large ones. A reference that is wide
and high in contrast sits at neither end. Taking x from the small size and y from the large one gets both. Bars,
hairlines and the x-height are horizontal strokes and vertical positions, so they follow y. Stems and curved sides
follow x.

## The steps

1. **y instance.** For each optical size tried (nine across the axis, unless `--loc` fixes it), solve the weight
   axis so the n stem meets the target, then measure contrast, bar to stem and x-height to cap. Keep the size
   with the smallest error. With `--no-contrast` the opsz scan is skipped.
2. **x instance per class.** For each width class: on a width axis, bisect wdth so the class's mean advance meets
   its target. At every wdth tried, solve wght again so the class's stem (n for lowercase, H for capitals and
   figures) meets its target, because width changes stems. Without a width axis, or where it runs out, scale the
   class horizontally by a factor, capped at `--max-stretch` (3 %), and solve the weight for `stem / factor` so
   the stem lands on target after the stretch.
3. **Assemble.** Each glyph takes x from its class instance times the factor, y from the y instance, and its
   advance from the class instance times the factor. Accented letters and alternates follow their base letter
   (by Unicode decomposition and name suffix). Composites made of one class join it, and their marks stay centred.
   Mark-to-base anchors take x from the class instance and y from the y instance. Everything else (punctuation,
   symbols, small capitals, figures variants) keeps the y instance's own x.
4. **Iterate.** Measure the assembled font, correct each factor by the class's error, assemble again. Stop when
   every class is within `--tol` (0.3 % by default) or six passes have run. Rounding and overlap removal move
   means a little, which is why one pass is not enough.
5. **Finish.** Remove overlaps (skia-pathops), scale the em so cap height per 1000 em matches the reference file,
   set the line box from the reference's vertical metrics when a file gave them, make the win metrics cover
   every glyph, and drop the variation tables.

## Limits, and what to do at them

- **Stretch.** Past 3 % a glyph reads as stretched: its curved strokes get heavier than its stems and its curves
  flatten. If a class needs more, say so, keep the cap, and offer a base with a width axis. For capitals at 8 to
  10 % with a strong reason, a person may choose it. Above 10 % the base is wrong.
- **Bare stems.** i, l and I are one stem. A stem-compensated stretch leaves their ink unchanged, so the narrow
  classes move mostly through their sidebearings. That is correct.
- **Kerning from an extreme location.** Some variable fonts extrapolate pair kerning badly at the ends of an axis
  (a curved letter followed by a descender opened by 90 units). Kerning comes through the y instance's location. If
  the kerning reads wrong in a word set at 18 px, rebuild with a y location nearer the axis default, and let the
  collision guard handle the tails.
- **Kinks.** Mixing x from one location with y from another can kink a curve where the two drawings differ a lot.
  Render S & @ W Q g a e and y at 200 px and look. If one kinks, take x and y from one location and solve widths
  with factors alone.
- **What fitting cannot change.** Serif thickness and bracket shape, terminal shape, stress angle, one or two
  storeys. A serif that is too thin needs point classification the base does not carry. Report these as known
  gaps, never as fitted.
- **Weight colour.** Matching the n stem does not match colour. If the reference's curved strokes or serifs are
  heavier relative to the stem, the fitted font reads lighter. Compare o side and serif tip in the check table and
  report the gap.

## Several weights

The first style's stem comes from the measurement. Other styles take an explicit stem (`--style Medium:500:88`)
or keep the base's own stem ratio between the two weights. Each style gets its own y instance and class instances.
All styles share the vertical metrics, so they can mix in one line.
