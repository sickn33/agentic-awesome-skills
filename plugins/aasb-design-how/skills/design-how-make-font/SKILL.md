---
name: design-how-make-font
description: Fit a modifiable open typeface to aggregate reference measurements, then verify glyph coverage, spacing and web distribution.
license: MIT
metadata:
  aas-category: design
  aas-risk: critical
  aas-source: https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-font
  aas-source-repo: arla6ka/design.how
  aas-source-type: community
  aas-license-source: https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE
  aas-author: Arlan Marat
  aas-date-added: '2026-11-19'
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

## Bundled resources

Use Python in a project-local environment with FontTools, Brotli, uharfbuzz, numpy and Pillow. The optional PDF step uses Node, Playwright and Chromium. Resolve script files from the installed skill and send outputs to the project workspace.

1. Run `scripts/measure_font.py` or `scripts/measure_image.py` for the permitted aggregate inputs. Use `scripts/make_targets.py` to build the targets and `scripts/find_foundation.py` to shortlist allowed base fonts.
2. Run `scripts/fit_font.py` and `scripts/space_font.py` on the approved base. Pass input and output paths explicitly. Review the fit and spacing logs.
3. Use `scripts/package.py`, `scripts/check_font.py`, `scripts/font_book.py`, and `scripts/render_book.mjs` for the package, verification and type specimen. Start each CLI with its help before assembling the pipeline. The license check accepts HTTP(S) URLs on the OFL site and the legacy SIL OFL page.
4. The bundle includes [measuring](references/measuring.md), [foundation](references/foundation.md), [fitting](references/fitting.md), [spacing](references/spacing.md), [licensing](references/licensing.md), [checks](references/checks.md), and [font book](references/font-book.md) instructions.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-font) by Arlan Marat. See [MIT license](LICENSE).
