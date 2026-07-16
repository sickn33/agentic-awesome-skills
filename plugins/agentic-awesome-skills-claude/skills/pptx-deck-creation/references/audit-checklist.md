# PPTX Manual Audit Checklist

Apply the specification checks before building. Reopen the PPTX for the final
geometry, accessibility, package, and rendered-preview checks.

## 1. Content Collisions

For every slide, inspect all `layout_tree` objects. Two `classification: "content"` objects collide when their bounding boxes overlap:

```
A.x < B.x + B.w  AND  B.x < A.x + A.w
A.y < B.y + B.h  AND  B.y < A.y + A.h
```

- **Pass:** zero overlapping content objects per slide.
- **Fail:** any overlap → move objects, resize bboxes, reduce content density, or split the slide.

## 2. Text Overflows

For each text object estimate whether its text fits within its bbox.

Rough capacity (Latin):
- Characters per line ≈ `(bbox.w × 72) / (font_size × 0.5)`, using `0.5 em` as an average Latin glyph-width factor
- Lines available ≈ `(bbox.h × 72) / (font_size × 1.2)`
  _(bbox in inches, font_size in pt)_

Adjustments:
- **CJK / full-width text:** use a glyph-width factor near `1.0 em` instead of `0.5 em`. The extractor reports `non_ascii_text` — use it to flag CJK-heavy slides.
- **Text on a shape/card:** subtract ≈0.1 in of inner padding from each side of the shape before computing capacity; the text occupies the inset inner area, not the full shape.

- **Pass:** estimated text volume ≤ available capacity.
- **Warning:** likely overflow → inspect the generated PPTX or rendered preview, then shorten bullets, enlarge the bbox, or split the slide when clipping is confirmed. This estimate is a triage heuristic, not a deterministic failure by itself.
  **Never set `font_size` below 9 pt for `classification: "content"` objects.**

## 3. Font Size Minimums

Scan every object with `classification: "content"`. Check `style.font_size`.

- **Pass:** all content objects ≥ 9 pt.
- **Fail:** any content object < 9 pt → increase font size and split content if needed.

## 4. Design Context Presence

Inspect `summary.design_context` in the spec root.

- **Pass:** field present and contains `profile_id`, source URL, and license ID.
- **Fail — any of the following:**
  - `summary.design_context` absent -> load a design profile from [design-profiles.md](design-profiles.md) and rebuild.
  - Plain white backgrounds throughout with no accent elements.
  - Calibri-only text with default theme colors across all slides.
  - All slides are title-plus-bullets only (no cards, shapes, rules, or image treatments).

## 5. Visual Design Per Slide

For each normal content slide (exclude section headers and hidden appendix slides):

- **Pass:** at least one style-derived visual element present — accent band, card shell, grid cell, rule/divider, shape motif, image treatment, or background pattern.
- **Fail:** slide is plain white with only text objects → add a design element derived from the selected profile's `source_signals`.

## 6. Narrative and Count

- Slide count is within ±2 of the user's requested count.
- Topic sequence matches the requested business framework (McKinsey, SCQA, pyramid, etc.) or the user's stated structure.
- For action-title frameworks (e.g., `action-title`, McKinsey): every content slide has an **action title** (not a descriptive label). Run the ghost-deck test: read only slide titles — they must tell the full story on their own.

## 7. Hidden Slides

If the deck contains hidden slides (`hidden: true`):

- **Pass:** hidden slides are last in the `slides` array unless the user specified otherwise.
- In the rendered PPTX, confirm `ppt/presentation.xml` contains `p:sldId show="0"` on the correct entries.

## 8. Asset Layering

For slides mixing image/SVG objects with text:

- **Pass:** image/SVG `z_index` is lower than all overlapping text objects.
- **Fail:** image covers text → lower `z_index`, adjust bbox, or reclassify as `classification: "layout_design"`.
- A visible slide must not rely on one raster or SVG as its complete content. Recreate essential titles, labels, metrics, chart values, and process steps with native editable objects. Keep the original raster or SVG only as a supporting visual or hidden reference.
- **Image aspect ratio:** the object `bbox` aspect should match the image's native aspect (fit or crop-to-fill); a mismatched bbox stretches the image. Keep captions in adjacent space, not overlaid on the image.

## 9. Slide Bounds & Safe Margins

For every slide, check each object against the slide rectangle (0,0)–(`slide_size.width`, `slide_size.height`):

- **Pass:** every `classification: "content"` object lies fully inside the slide and inside the content-safe margin (default 0.5 in per edge).
- **Fail:** an object extends off-slide or into the margin → move or resize it inside. Only `classification: "layout_design"` full-bleed bands may touch or cross an edge.

## 10. Containment

- **Pass:** every child object and child group fits inside its parent group `bbox`; on-shape text fits inside the shape minus ≈0.1 in inner padding.
- **Fail:** a child spills out of its group, or card text spills past the card padding → resize the child or the parent, or split content.

## 11. Table Fit

For every `kind: "table"` object:

- **Pass:** column widths sum to the table `bbox.width`, each cell's wrapped text fits its row height at the cell font size, and row count is within the per-slide budget (≈8–10 body rows at 10–11 pt).
- **Fail:** columns overflow the table width, cells clip, or the table is too tall → rebalance columns, raise row height, or split the table across slides (repeat the header).

## 12. Native Editable Content

For every visible slide, inspect the objects that carry the message.

- **Pass:** titles, body text, metrics, labels, tables, charts, and process steps
  are native editable PowerPoint objects. Images are supporting visuals only.
- **Fail:** a single raster or SVG contains the only meaningful text, data,
  explanation, chart values, or diagram labels → recreate that information with
  editable text, shapes, lines, and tables.

## 13. Post-Build Checks

Reopen the generated PPTX and inspect the actual artifact.

- **Geometry:** confirm the slide count, actual object bounds, safe margins,
  footer rail, group containment, image placement, and hidden-slide state match
  the specification. Record failures in the geometry audit.
- **Accessibility:** confirm document language, unique accessible slide titles,
  meaningful image alt text, reading order, and table headers. Record failures
  in the accessibility audit.
- **Rendered preview:** when a compatible renderer is available, inspect each
  slide for clipping, font fallback, contrast, image crops, and visual hierarchy.
  Record the renderer and the review result.

## 14. Production Metadata and Source Lineage

Inspect the summary and the objects that make factual claims.

- **Layout policy:** `summary.layout_policy` names the safe margin, content
  bottom, footer top, and minimum gap. Confirm `content_bottom` is lower than
  `footer_top` and that content stays above the footer rail.
- **Accessibility metadata:** `summary.accessibility` contains a document
  language and presentation title. Each production slide supplies a reading
  order for its meaningful objects.
- **Source lineage:** each sourced metric, chart value, quotation, or factual
  claim has a `source_ref` containing a source ID, locator, claim type, and
  verification status. Confirm the source ID appears in the sources manifest.
- **Build record:** the build manifest records the builder path, input spec,
  output PPTX, slide count, time, and warnings.

## 15. Positive Geometry

Before and after build, inspect every object bbox and line endpoint.

- **Pass:** every non-line object has positive width and height. A line has two
  distinct endpoints (`x1 != x2` or `y1 != y2`); horizontal and vertical lines
  may legitimately have a zero-height or zero-width bounding box.
- **Fail:** a non-line object has a zero or negative dimension, or a line has
  identical endpoints. Correct the source geometry before rebuild.

## Completion Criterion

All 15 checks pass before delivery, or each exception is documented with its
slide ID, object ID, reason, owner, and review date. Any failure triggers the
repair loop in Step 6 of the parent `pptx-deck-creation` skill: fix the spec,
rebuild, and re-audit.
