---
name: "design-how-make-font"
description: "Fit a modifiable open typeface to aggregate reference measurements, then verify glyph coverage, spacing and web distribution."
category: "design"
risk: "critical"
source: "https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-font"
source_repo: "arla6ka/design.how"
source_type: "community"
license: "MIT"
license_source: "https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE"
author: "Arlan Marat"
date_added: "2026-11-19"
---

# Design a Typeface from an Open Foundation

## When to Use

Use when the user wants an original font family informed by proportions visible in references. Determine usage, languages, scripts, weights and a new family name before selecting a foundation.

## Workflow

1. Measure reference cap and x-height, contrast, stroke width and class-average spacing. Separate values from screenshots and values from known font metrics. Mark uncertain readings and keep reference files private.
2. Shortlist modifiable foundations with the necessary characters and variation axes. Check redistribution terms and reserved font names. Show relevant differences and confirm a foundation if the choice materially changes the design.
3. With installed font tooling such as FontTools, generate static instances or adjust only the chosen foundation. Work from aggregate targets and the foundation's own outlines and kerning. Preserve metrics consistency and report targets the available axes cannot support.
4. Check glyph coverage, shaping and kerning with realistic strings across the requested languages and widths. Compare text and display specimens, render web formats in a browser, and inspect spacing collisions, fallback glyphs and clipping.
5. Package tested formats, the foundation's required notices, the family naming and a specimen. Apply the license terms for that foundation to any redistribution.

## Example

“Make a Latin UI family in regular and medium from these specimens.” Compare aggregate proportions, select a suitable OFL foundation, then test both weights with accented UI strings and an installed WOFF2 specimen.

## Limitations

Use references only for aggregate measurements. Copying outlines, per-glyph metrics or kerning from a reference is outside the workflow. Tool installation and font downloads require the user's approved environment.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-font) by Arlan Marat. See [MIT license](LICENSE).
