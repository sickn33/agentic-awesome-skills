# PPTX Python Snippets

It describes how to approach PPTX extraction and style analysis with `python-pptx`, using short illustrative
snippets — not a packaged module to copy wholesale.

- Do not treat these snippets as bundled runtime modules.
- Do not import from this file or recreate `.py` files under this skill as packaged resources.
- When a task needs extraction or style analysis, write task-local code with `python-pptx`, using these patterns as reference.

## Shared constants

Most helpers depend on two values: the EMU-per-inch conversion factor and the
DrawingML namespace used when reading raw OOXML.

```python
EMU_PER_INCH = 914400
DRAWING_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"


def _inches(value: int) -> float:
    return round(int(value or 0) / EMU_PER_INCH, 4)
```

## Style master: compact design context

**Goal:** summarize a reference deck into a compact "style master" (colors,
fonts, font sizes, shape styles, layout/region usage) suitable for prompting a
generator. Counters drive a `most_common` ranking; results are truncated by
`max_items`.

### Approach

1. Open with `Presentation(path)`; read slide size in inches.
2. Pull theme tokens (colors/fonts) directly from `ppt/theme/theme1.xml` via `zipfile`.
3. Walk each slide's shapes (recursing into groups), tallying tokens into `Counter`s.
4. Emit `styles`, `brands`, `template`, and `layout` sections from the top-N tallies.

### Illustrative snippet

```python
from collections import Counter

def analyze(presentation) -> dict:
    colors: Counter[str] = Counter()
    fonts: Counter[str] = Counter()
    for slide in presentation.slides:
        for shape in _iter_shapes(slide.shapes):
            colors.update(_shape_colors(shape).values())
            fonts.update(_text_styles(shape)["fonts"])
    return {
        "colors": [{"value": v, "count": c} for v, c in colors.most_common(10)],
        "fonts": [{"value": v, "count": c} for v, c in fonts.most_common(10)],
    }
```

### Key helper patterns

- **Recursive shape walk** — yield each shape, then recurse when it exposes `.shapes`:

  ```python
  def _iter_shapes(shapes):
      for shape in shapes:
          yield shape
          if hasattr(shape, "shapes"):
              yield from _iter_shapes(shape.shapes)
  ```

- **Color normalization** — read `color.rgb`, fall back to `theme_color`, and
  normalize to `#RRGGBB` or `theme:<token>`.
- **Region/flow classification** — bucket each shape's bbox center into
  `top/middle/bottom` × `left/center/right`, and infer `row` / `column` / `grid`
  from the spread of centers.
- **Neutral filtering** — treat colors with low channel spread (`max-min <= 18`)
  as neutrals so brand accents rank above grays.

## Extractor: structured deck capture

**Goal:** turn a deck into a structured tree of slides → groups → objects, with
optional media extraction and a parallel list of raw OOXML render elements.

### Approach

1. For each slide, build a root group bbox covering the full slide.
2. Walk shapes recursively; groups become nested groups, leaf shapes become objects.
3. Classify each object by `kind` (`text`, `table`, `image`, `chart`, `connector`, …)
   and capture kind-specific `content` plus `style`.
4. Optionally write media to an asset dir, or base64-embed when no dir is given.
5. Read speaker notes by resolving slide `_rels` to their `notesSlide` parts.

### Illustrative snippet

```python
def _bbox(shape) -> dict:
    return {
        "x": _inches(getattr(shape, "left", 0)),
        "y": _inches(getattr(shape, "top", 0)),
        "width": _inches(getattr(shape, "width", 0)),
        "height": _inches(getattr(shape, "height", 0)),
    }

def _kind(shape, shape_type: str) -> str:
    if getattr(shape, "has_table", False):
        return "table"
    if getattr(shape, "has_chart", False):
        return "chart"
    if "picture" in shape_type or getattr(shape, "image", None):
        return "image"
    if getattr(shape, "has_text_frame", False) and shape.text.strip():
        return "text"
    return "shape"
```

### Kind-specific content notes

- **text** — capture `text` plus rich paragraphs (runs with font size, bold,
  italic, color, hyperlink, paragraph alignment/level).
- **table** — emit `rows`, plus row/col counts, widths/heights, banding flags,
  and merged-cell origins (`span_rows` / `span_cols`).
- **image** — record alt text, crop fractions, and either a written asset path
  or base64 blob; flag `missing_embedded_image` when the blob is absent.
- **chart** — record `chart_type`, optional title, categories, and series values.
- **line / connector** — derive endpoints from the bbox plus flip flags, and read
  arrow head/tail types from the `<a:ln>` element.

### Media & notes helpers

- **Embedded relationship ids** — iterate the shape element and collect attributes
  ending in `}embed`, then resolve via `shape.part.related_part(rid)`.
- **Package media counts** — open the `.pptx` with `zipfile` and count names under
  `ppt/media/` and `ppt/embeddings/`.
- **Notes** — parse each `ppt/slides/_rels/slideN.xml.rels`, follow the
  `notesSlide` relationship, and join `<a:t>` text nodes.

## Safe attribute access

`python-pptx` raises on many optional properties (fills, colors, line styles).
Wrap reads in a small guard so extraction degrades gracefully:

```python
def _safe_attr(value, name):
    if value is None:
        return None
    try:
        return getattr(value, name)
    except (AttributeError, TypeError, ValueError):
        return None
```

Apply the same defensive pattern around `fill.type`, `line.width`, `color.rgb`,
`shape.image`, and chart/table accessors, since any of them can fail on real-world decks.
