# Measuring a reference

Every number is in cap-normalised units: the font is scaled so its cap height is 700. A screenshot has no em
size, so this is the only scale a screenshot and a file share. `cap_em` keeps a file's real cap height per 1000
em, and the build uses it to set the em of the output. A screenshot-only build keeps the base's cap-to-em ratio.

## What is measured, and where

All lengths come from straight cuts through the outline (or the pixels): a line crosses the ink, and the run
between entering and leaving is the measure. Runs use nonzero winding, so overlapping contours in a variable
font instance read as one shape.

| Number | Where |
|-|-|
| x-height | top of x |
| cap height | top of H |
| ascender | mean top of b d h k l |
| descender | mean bottom of p q |
| curved overshoot | top of o minus x-height, top of O minus cap height |
| n stem | first run across n at half the x-height |
| n counter | white between the two runs of n at the same height |
| H stem | first run across H at 30 % of the cap height |
| H bar | vertical run at the middle of H, between its stems |
| o side, o thin | run across o at mid height, and the thinnest vertical run at its centre |
| contrast | o thin over o side |
| serif reach | how far the foot of H, 1 % above the baseline, reaches past the stem, mean of both sides |
| serif tip | vertical thickness of the foot 30 % of the way in from its tip |
| class widths | mean advance of each class in `fontlib.CLASSES` |
| sidebearings | mean side of each class in `fontlib.SIDE_CLASSES` (straight and curved, lowercase and caps) |
| rhythm | twice the straight side over the n counter. It carries spacing from a screenshot to a font |
| paragraph | the fixed paragraph in `fontlib.PARA`, shaped by HarfBuzz with kerning and ligatures |

A serif counts as present when its reach is more than 12 % of the stem. Below that the font is treated as sans
and both serif numbers are 0.

The classes are set by how a letter is built, before any measurement, and never tuned per letter:
straight (h m n u), bowl (a b d g p q), curved (c e o s), diagonal (k v w x y z), narrow (f i j l r t), and for
capitals straight (B D H N P R U), curved (C G O Q S), diagonal (A K V X Y Z), wide (M W), narrow (E F I J L T),
plus figures. One mean per class is a target. A single letter's advance is never a target: that would copy the
reference glyph by glyph.

## From a font file

`measure_font.py file --out m.json`. It reads TTF, OTF and WOFF2. For a variable font, `--loc` picks a location
and `--stem 76` solves the weight axis so the n stem is 76 first, which is how candidates are compared at equal
colour. Confidence is high for everything.

## From a screenshot

`measure_image.py shot.png --text "line one|line two" --out m.json`.

The image is split into lines at blank rows, and each line into letters by connected ink. A dot or accent joins
the letter under it. A letter drawn in two parts (a k whose arm does not touch the stem) is joined to its
neighbour when the count is one too many, choosing the join that keeps repeated letters the same width. If the
count still disagrees with `--text`, the script stops. Crop tighter or set the text larger.

Edges are read with sub-pixel precision from the anti-aliasing: the partial coverage of an edge pixel is the
fraction of it that is ink. A run's thickness is the sum of the coverage across it, which is exact for a
vertical edge.

Advances need context. In `n X n`, the distance from the first n's left edge to the last n's left edge is
`advance(n) + advance(X)`, whatever the sidebearings, and `advance(n)` comes from a run of n. The same holds for
`H X H`. Sides come from the gap between two n (twice the n side) and from each letter's gap to its n. That is
why `SAMPLE_LINES` exist. A screenshot of ordinary text gives vertical proportions, stems and contrast, and no
widths.

### Confidence

- high: vertical lines when the cap is 60 px or more, a stroke 6 px or thicker.
- medium: advances and sides (kerning against n or H can bias them), strokes 3 to 6 px.
- low: strokes under 3 px, serif tips, anything with a cap under 30 px.

Report every low number to the person, and give low numbers less weight (`make_targets.py` does).

### What to expect

`--selftest` renders the sample lines from any open font, measures the pixels and the file, and prints the
error. On a text serif at a 98 px cap height the class widths came within 1.2 %, stems within 1.5 units, the
x-height exact. At a 34 px cap the stems drifted 3 units, the thin strokes went low confidence, and widths
stayed within 1.5 %. The straight lowercase side read about 4 units low at both sizes, because the n of that
font is not quite symmetric. Run the selftest at the screenshot's own size before trusting a number.

Things a screenshot cannot give: the em size, vertical metrics, kerning tables, and anything hinting or a
renderer's stem darkening has moved. Subpixel (coloured) anti-aliasing breaks the coverage reading: ask for a
greyscale capture or a large size.
