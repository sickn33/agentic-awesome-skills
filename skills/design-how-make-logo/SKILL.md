---
name: "design-how-make-logo"
description: "Develop original mark and wordmark directions from a brief, compare legibility and similarity, and prepare a reviewed asset package."
category: "design"
risk: "critical"
source: "https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-logo"
source_repo: "arla6ka/design.how"
source_type: "community"
license: "MIT"
license_source: "https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE"
author: "Arlan Marat"
date_added: "2026-11-19"
---

# Make an Original Logo

## When to Use

Use for a product mark, wordmark, app icon or identity direction. Establish intended use, size, color constraints, audience and one idea the mark should communicate.

## Workflow

1. Treat moodboard references as evidence about proportion, stroke, density and tone. Separate those observations from the sources' geometry. Use supplied references locally, with public inspiration lookups only when useful and authorized.
2. Make several distinct directions from original geometry and properly licensed type or owned assets. Note why each direction expresses the brief. Make a one-color version first, then test palettes and supported lockups.
3. Compare the closest references visually at the same size. Redesign directions that are confusingly similar. At the intended minimum size check strokes, counters, spacing and recovery of the mark after rasterization.
4. Present a contact sheet with use cases and trade-offs. Package the selected direction in appropriate SVG and raster formats, retain required notices and include guidance on minimum size and contrast. Record unresolved name or mark questions for independent clearance.

## Example

“Create an app icon and wordmark for our bike repair service.” Present independent geometric and typographic directions, inspect them at 16 and 64 px, then export the chosen mark in dark and light variants.

## Limitations

Visual comparison is scoped to the references reviewed. It provides no trademark clearance. Work with original shapes and assets the user can use. Do not trace third-party logos.

## Bundled resources

The bundle includes [measurement](references/measuring.md), [similarity checks](references/distance.md), [construction](references/building.md), [source rules](references/sources.md), and [the logo book](references/logo-book.md). Follow the original-asset boundary above wherever a recipe describes tracing. Use `scripts/trace_ref.py` only for artwork the user owns or has permission to reproduce.

With Python, numpy, scipy, scikit-image, Pillow, skia-pathops, FontTools, uharfbuzz and resvg-py, use `scripts/measure_logo.py`, `scripts/build_logo.py` and `scripts/check_logo.py` with project-local inputs and outputs. Use the bundled `scripts/calibration.json` with the checker. Use `scripts/logo_book.py`, `scripts/render_book.mjs`, and `scripts/package_logo.py` for the specimen and assets. The render step uses Node, Playwright and Chromium. Optional web-image and font fetches use public sources and require authorized inputs. Keep source notices.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/make-logo) by Arlan Marat. See [MIT license](LICENSE).
