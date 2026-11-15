# Build a viewer of your own

The bundled viewer in [viewer-assets.md](viewer-assets.md) already meets everything below. Read this file only when integrating the drawing into a project's interface or replacing the bundled page.

## Keep the page centered on the drawing

Use a continuous blank page with the object centered directly on it. Default to a single selected view, without a gallery, sidebar, header, sheet border or contrasting canvas.

Place compact controls near the page edge. Keep color options, downloads and explanatory text in panels that open on demand.

When several drawings are requested, use a small selector. When several views help explain one object, offer a separate view selector.

Provide these controls:

| Control | Behavior |
| --- | --- |
| Zoom out and Zoom in | Change viewing magnification without changing the drawing |
| Reset | Restore the drawing's view, settings, colors and fitted zoom. Zero also fits the sheet, and the fit recalculates when the viewport changes |
| Appearance | Toggle light and dark mode, with a System option in settings |
| Color | Open a line-hue slider for the whole drawing or one part, and a reset action |
| Drawing settings | Choose linework, assembly spacing and model parameters |
| Parts | Select, isolate, color or export a complete component |
| Download SVG | Save the editable vector source |
| Download PNG | Save the full sheet at the stated pixel dimensions |
| Download PDF | Save the full vector sheet at its physical page size |

Show the zoom percentage and bound its range. A useful starting range is 25–400% of fitted size.

Keep enlarged artwork in a scrollable viewport so every edge remains reachable with a keyboard or touch. Reserve space for controls, including their wrapped height on narrow screens.

Use the project's existing components and fonts when integrating there. `better-layout` owns responsive arrangement, `better-accessibility` owns control semantics and keyboard behavior while `better-writing` owns control copy.

## Follow the system appearance and allow an override

Default to `prefers-color-scheme` and follow system changes while that mode remains selected. Provide an immediate light/dark toggle and a System option that clears the override.

Save explicit choices locally when storage is available. Apply the resolved theme before the first paint, and keep the controls usable when storage is unavailable.

Use one resolved theme attribute for page surfaces, panels, fields and native control appearance. Keep the page and SVG paper identical so the drawing never gains a contrasting rectangle.

Adapt neutral occluding faces with the paper. Lighten preview ink in dark mode without changing its source color or the geometry that hides rear edges.

Keep appearance separate from drawing state. Exports retain the chosen ink colors on white or transparent paper.

## Change the ink without changing the object

Keep linework presets independent of color. Take their paper-space widths and the axis dash from [assets/sheet.js](assets/sheet.js), where Technical is the default, Fine patent the lighter set and Service manual the heavier set without texture.

Preserve functional edges in every preset. Only optional surface texture changes density or disappears, and fine presets still require inspection at the chosen reproduction size.

## Adjust the arrangement and select parts

For assemblies, offer spacing from assembled through the authored explosion, with extra separation where useful.

Regenerate geometry through **Implement the model boundary** in [viewer-assets.md](viewer-assets.md). Keep parameter controls in the settings panel and retain their values across view changes.

Support direct part selection with an equivalent named selector. Selecting a part exposes isolation, coloring and individual SVG download actions, plus an explicit return to all parts.

Fit an isolated part to the available view and regenerate its complete visible geometry. Keep selection indicators outside exported artwork.

## Color the drawing without changing its construction

Start with dark source linework on white paper. Apply color to the entire drawing, with individual-part overrides when the geometry has stable part IDs.

Keep matching parts the same color across views. Retain stroke widths, hidden-line patterns, hatching and white occluding faces when changing line colors.

Name the edited property explicitly, such as `Line color`. A surface-fill option requires actual closed surface geometry; open contours cannot be filled reliably.

Keep color choices in drawing state alongside the selected view. Reset restores the original appearance without changing geometry or zoom.

`better-colors` owns palette choices and rendered contrast. Decorative part colors do not imply established materials or safety classifications.

## Export the selected view and colors

Generate the files from the finished drawing using **Export from the same source** in [sheet-and-svg.md](sheet-and-svg.md). Name them by drawing, view or part and linework, such as `charger-exploded-technical.svg`.

Snapshot geometry, spacing, parameters, isolation, linework and colors together. Derive every export from that immutable SVG state, even when the user changes controls during generation.

Offer full-page and tightly cropped exports, plus an optional transparent background. Compute crop bounds from the complete drawing's geometry plus 3 mm padding.

Remove only the paper background for transparency. Preserve surface fills or equivalent clipping that hide rear edges, including white faces around real openings.

Keep stable, descriptive part groups in SVG exports. Include parameters and concept status in metadata, and identify isolated parts in filenames.

Use the crop's physical dimensions for both vector PDF size and PNG pixel calculations. Keep the selected line weights constant when cropping.

Viewing zoom and scrolling must never change the download. Rasterize the complete SVG at the chosen resolution, excluding the toolbar and surrounding page.

Generate exports on demand so a download always reflects the chosen ink colors.

Use a vector-capable PDF exporter that supports the drawing's paths, clipping and styles. `window.print()` opens a dialog and produces no PDF file, so label any separate printing action `Print`.

If a renderer is unavailable, explain which format could not be produced and expose the available downloads. Never attach another format to a misleading extension.

## Make the standalone page work from disk

Embed runtime scripts, styles, fonts and libraries in the build output. A page opened from a `file:` origin cannot fetch neighboring files.

Encode embedded data safely for its HTML context. Treat SVG supplied by another source as document content, and remove scripts and external resources before embedding.

Leave publication and hosting outside this workflow unless requested.

## Keep viewing scale separate from paper scale

Size the displayed sheet inside a scrollable stage. Layout dimensions must grow with zoom so scrollbars expose the enlarged artwork.

A CSS transform alone does not reserve the enlarged sheet's layout space. Resize a containing stage too, or change the image's rendered width and height directly.

Fitting the sheet to the viewport is a viewing convenience, not a claim that the drawing appears at its printed scale. Preserve physical dimensions in the SVG and PDF files.

## Test every control of a viewer of your own

Open the page from disk and exercise zoom, reset, presets, spacing, parameters, part selection, isolation, colors and every download. Test wide and narrow viewports, including keyboard access and panel dismissal.

Test system appearance, explicit overrides, reload persistence and return to System. Inspect the drawing, fields and focus indicators in both themes at narrow widths, then export from dark mode to confirm the original ink and paper survive.

Then run the download checks in **Test the controls and the downloaded bytes** in [viewer-assets.md](viewer-assets.md).
