> Use trace-derived geometry only from artwork the user owns or has permission to reproduce. References from public moodboards supply measurements and inspiration.

# Building

A direction is a recipe: a JSON file `build_logo.py` turns into the mark, the wordmark and two lockups. The recipe
names shapes on a grid, OFL glyphs, and traces made by `trace_ref.py`. The full format is in `build_logo.py --help`.

## A direction

```json
{"name": "Fieldnote", "title": "Survey ring", "idea": "A level's sighting ring, one quarter left open.",
 "grid": 48,
 "mark": [
  {"shape": "ring", "cx": 24, "cy": 24, "r": 20, "width": 7},
  {"op": "cut", "shape": "rect", "x": 24, "y": 0, "w": 24, "h": 24},
  {"shape": "rect", "x": 27, "y": 4, "w": 17, "h": 17, "r": 2}
 ],
 "wordmark": {"text": "FIELDNOTE", "font": "Space Grotesk", "weight": 500, "tracking": 60},
 "lockup": {"mark_scale": 1.9, "gap": 0.8},
 "palette": {"ink": "#0f3d2e", "paper": "#f2f3ee", "accent": "#c4ea3f", "neutral": "#8fa39a", "tint": "#dfe7e1"}}
```

- **Shapes**: `rect` (with `r` for rounded corners), `circle`, `ring`, `arc` (a band from `start` to `end` degrees),
  `polygon`, `glyph` (letters from an OFL font, outlined). `op` is add, cut, keep or xor, applied in order. Any shape
  takes `rotate`, `mirror` and `repeat` (`count` with `rotate`, or `step` for a row).
- **Coordinates on the grid, not free curves.** Agents place shapes well and draw curves badly. Keep every number a
  whole or half grid unit; the construction page draws those lines.
- **Wordmark**: any OFL family on Google Fonts, fetched with its OFL.txt, shaped with HarfBuzz and outlined, with
  `tracking` in thousandths of the em. If the name matches the font's Reserved Font Name the build warns.
- **Lockup**: `mark_scale` is the mark's height over the wordmark's cap height; `gap` is the space between, in cap
  heights. A stacked lockup is written too.
- **Palette**: ink, paper, accent, neutral, tint. The book and the package use these five.

## Directions that differ

Lead with abstract marks that make one move with two or three primitives: two squares overlapped and xor'd with one
tilted ("a sketch snapping to the grid"), a disc cut once, one shape repeated and turned. These read as confident and
hold at 16 px. Literal pictograms (a bell, a chat bubble, a moon) read as stock icons, and traces read as borrowed;
use them last.

Six directions, each a different answer to the idea, not six versions of one shape. Mix three kinds: authorized traces,
idea marks built from shapes, and typographic marks. At least half carry the idea as a picture (a hand, a ripple, a
ring of voices), not as the first letter. A set of shape-built directions that works:

- a monogram: the first letter built from the product's own shapes;
- a negative-space letter: the letter carved out of a solid disc, square or tile;
- a stencil mark: one shape split by a clean gap where the idea turns;
- a symbol for the idea: an object or motion from the product's world;
- a pure wordmark with one drawn detail (a cut terminal, a joined pair);
- a construction: a grid, a stack, a fold, a repeat.

Take these moves from the references you measured: open the measured sheet and name, for each direction, the
reference move it borrows. The marks that work are close in spirit to great logos and clearly not copies of any; the
marks that fail are the ones built from nothing (a plain chat bubble, a plain waveform). Prefer crisp, square
terminals; curve an end only when the curve is the idea. When the distance check fails a direction, the silhouette
is too close: change the outline itself (split it, cut it, extend it), not a detail inside it.

Give each its own wordmark face and palette, so the person compares directions, not colours.

## Tracing

The strongest marks in a moodboard have drawing in them that grid shapes can't reach. Trace one and change it:

1. Pick a reference whose picture fits the idea: a hand for "hush", rings for "settle", a ring of circles for
   "many voices". The fit matters more than how famous the mark is.
2. `python3 -I scripts/trace_ref.py <image> --crop x,y,w,h --out trace/<n>.svg` (crop in fractions, around the
   mark only; `--invert` for a light mark on dark). potrace draws the curves and drops specks; check for captions
   and stray type in the crop and cut them.
3. Place it: `{"shape": "trace", "file": "trace/<n>.svg", "x": 2, "y": 2, "size": 44}`, with `rotate` and `mirror` as
   usual. Then change one thing with the usual shapes so the mark says the idea: fill a centre, turn it level, add a
   tail, cut a part away. Put `"traced_from": "<source>"` in the recipe,
   as a neutral ID such as `arena 12345678` (the Are.na block number): the book prints it, so never a brand name, a
   file name that holds one, or a URL.
4. Look at it beside the original. A change nobody would notice isn't a change; one that breaks the drawing is too
   much.

A traced mark sits close to the original on purpose. The check reports the distance and passes it; the package's
trademark sheet says it was traced and from what.

## Type

For a typographic direction, pick a display face with character from Google Fonts' OFL families, not a quiet sans:
Bagel Fat One, Abril Fatface, Fraunces at heavy weights, Syne, Bricolage Grotesque, Instrument Serif, Unbounded.
Pull the first letter out as the mark with a `glyph` shape and set the name in the same face.

## Parts it may also use

- Icons as a starting part: Lucide (ISC), Phosphor, Tabler, Heroicons, Iconoir (MIT), Material Symbols (Apache 2.0),
  as `polygon` points or traced from the icon's own SVG (the icon is open; a reference logo never is). Change it until
  the distance check passes against the icon too: an icon anyone can ship is a weak mark. Never Remix Icon, whose
  licence bans logos even modified, and never a brand-icon set.
- No image model draws final paths.

## Checks

`check_logo.py` renders each mark with resvg and fails a direction on any of:

| Check | Pass |
|-|-|
| Stroke at 16 px | 1.5 px or more (median stroke at 512, scaled) |
| Counters at 16 px | every hole at 512 px still open |
| Ink on paper | 4.5:1 or more |
| Accent against paper or ink | 3:1 or more |
| Nearest reference | under the calibrated limit |

On the test brief (three directions for a site-inspection app), all three passed: strokes 2.7 to 4.4 px at 16 px,
nearest reference 0.15, 0.36 and 0.73 against a limit of 0.81.

## Package

`package_logo.py` writes, for the chosen direction:

- `svg/`: mark, wordmark, lockup and stacked lockup, each in ink, reversed, accent and black;
- `png/`: the mark from 16 to 1024 px on a transparent square, and the lockup at 1600 wide; `favicon.ico`;
- `LICENSES/`: each font's OFL.txt;
- `trademark-search.md`: where to search the name and the mark's design codes, and that it is not a clearance;
- `brand.json`: the palette and fonts.
