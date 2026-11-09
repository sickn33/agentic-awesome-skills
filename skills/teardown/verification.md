# Verify the rendered drawing

## Proof the model before the page

For models built on the bundled helpers, run the copied proof script from the project folder, where `drawing.json` lives:

| Command | Use it |
| --- | --- |
| `node tools/teardown/scripts/proof.cjs drawing.json proof/ --quick` | While iterating, for default parameters assembled and exploded in a few seconds |
| `node tools/teardown/scripts/proof.cjs drawing.json proof/ --view=exploded --crop=x,y,w,h` | For the close-up pass, a 2000 px crop of a sheet rectangle given in millimeters |
| `node tools/teardown/scripts/proof.cjs drawing.json proof/` | Before delivery, for every parameter extreme, 150% spacing and the occlusion check |

Add `--only=id` to proof one drawing, `--set=key=value` to proof a pose other than the defaults or `--no-png` to skip rasterizing. A full run with more than two sheets also writes `contact.png`, every sheet on one page for a first look. `--view` accepts `assembled`, `exploded` or `spread`. Sheets use the viewer's Technical linework and fit each spacing tightly.

The full-sheet PNG maps 420 mm to 2000 px, so divide a pixel position by 4.76 to get crop millimeters. Crop filenames carry their rectangle, and runs never delete older files, so give each pass a fresh folder.

It writes PNG previews through `rsvg-convert`, `resvg`, Chrome or macOS Quick Look, whichever it finds first. Open every PNG; the script cannot judge the drawing.

The full run warns when an exploded part shows less than half of the linework it has alone. That part sits behind another one, so change its explosion path or the camera.

The warning measures whole parts. A small feature hidden inside a larger part of the same item passes it, so look for each named feature in the crops.

## Inspect at two distances

At delivery size, check that the object reads before the annotations. The main view should have a clear silhouette, and the secondary view should explain its assembled form.

Read every label at that size. If it requires zoom, enlarge the label, enlarge the output or remove lower-priority metadata.

At 3–4×, inspect every crowded junction and curved contour. A 100 mm wide crop of the A3 sheet is roughly 4× the full-sheet preview. Look for faceting, lines through solid faces, doubled edges, mismatched tangencies and leaders ending in empty space.

Check that a cylinder's rim arcs connect through both silhouette edges. A missing side can appear only at particular camera angles or tessellation counts.

Check the preview against the reference's visual grammar. Judge line density, paper use and annotation restraint separately from whether the subject itself matches.

## Trace every correspondence

| Drawing type | Evidence to check |
| --- | --- |
| Multiple views | Feature counts and shared coordinates agree across projections |
| Section | Every hatch region is solid material at the stated cut; openings remain clear |
| Dimensioned drawing | Every label comes from a model parameter with known units |
| Parameterized object | Minimum, default and maximum settings preserve mating features, quantities and corresponding views |
| Isolated part | Previously occluded geometry reappears and the export contains only the selected component |
| Exploded assembly | Zero spacing reconstructs the assembly; intermediate and maximum spacing keep mating anchors on their insertion axes |
| Numbered assembly | Each balloon resolves to one item; every listed item is represented; quantities match the assembly |

An intentionally omitted item needs a note. A parts list cannot quietly count hardware that the drawing never represents.

Follow each leader from balloon to part in the final image. Confirm that crossings and hidden endpoints cannot make it identify a neighboring component.

For a real object, compare distinctive features against the source images.

## Check the artifact mechanically

Parse the SVG as XML. Check for duplicate IDs, unresolved `url(#...)` references, invalid numbers and external assets.

Check rendered text, leaders and strokes against sheet margins and reserved table rectangles. Inspect the corners of rotated labels and the tips of arrowheads.

Ensure every supplied output opens without the original working environment. Check exported dimensions against the requested physical size or pixel size.

For numeric scales, verify a known model length against its exported paper length in a true-length view. Fit-to-page printing invalidates that check unless compensated.

Automate inventory, dimension and coordinate comparisons where the generator exposes them. Pixel inspection remains necessary for occlusion and readability.

## Finish on named limitations

Finish when geometry, correspondence, legibility and export checks pass. Report any remaining limitation by naming the affected view or feature, rather than claiming unqualified precision.
