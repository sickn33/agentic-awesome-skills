# Build the reusable viewer

Use the bundled viewer for a standalone page with editable drawing state. It includes linework, spacing, parameter sliders, part selection, coloring and export panels.

## Describe the drawings and their controls

Create a JSON configuration beside the model scripts. Paths resolve relative to that configuration.

```json
{
  "dependencies": "node_modules",
  "modelScripts": ["model.js"],
  "drawings": [{
    "id": "sleeve",
    "title": "Knurled sleeve",
    "description": "Illustrative sleeve concept with a through bore.",
    "parts": [{"id": "sleeve", "name": "Knurled sleeve"}],
    "parameters": [{
      "key": "length",
      "label": "Sleeve length",
      "min": 20,
      "max": 40,
      "default": 30,
      "step": 1,
      "unit": "mm"
    }]
  }]
}
```

Use an empty `parameters` array when the object has no suitable editable dimensions. IDs stay stable, and drawing IDs use lowercase slugs.

One optional field shapes the exports. `concept` defaults to `true` and marks exports as illustrative, so set it to `false` only for a drawing built from authoritative dimensions.

Labels use the bundled Inter unless the page sets `--annotation-font`. When the drawing lives in a project, set it to the project's typeface, as `#drawing { --annotation-font: "Berkeley Mono", monospace; }`. PNG exports embed that face; PDF exports fall back to Helvetica because jsPDF cannot read woff2.

`colors` sets the starting look: `hues` maps part IDs to line hues from 0 to 360, and `fills` lists the part IDs that start filled. Use it when color carries meaning, such as red, green and blue subpixels, and leave it out otherwise. Reset returns to these colors.

```json
"colors": {"hues": {"red": 25, "green": 145, "blue": 260}, "fills": ["red", "green", "blue"]}
```

The drawing selector appears only when the configuration holds more than one drawing.

Set `initialView` to `assembled` when the object's normal form or scale is the main subject. Assemblies otherwise start exploded; single-part drawings start assembled.

Install `jspdf`, `svg2pdf.js` and `@fontsource-variable/inter` with the project's package manager, or with `npm install` in a standalone folder. Point `dependencies` at the resulting `node_modules` folder and keep the lockfile with the generator.

The builder embeds those packages, the Inter font and its license. The generated page makes no runtime network requests.

## Implement the model boundary

Each model script registers a function in `self.DrawingModels`, keyed by drawing ID. The worker already provides `TechnicalGeometry` and `TechnicalProjection`.

The worker calls each model with the parameter values and `{explosion, fitExplosion, isolated, fill, annotate}`.

Preserve existing registrations when the viewer includes multiple model scripts.

```js
self.DrawingModels ??= {};
self.DrawingModels.sleeve = (parameters, options) => {
  const G = TechnicalGeometry;
  const p = G.part('sleeve', 'Knurled sleeve', [25, 0, 0]);
  const length = parameters.length;
  if (!Number.isFinite(length) || length < 20 || length > 40) {
    throw Error('Length must be 20–40');
  }
  G.lathe(p, [[0, 5], [length, 5], [length, 3], [0, 3]]);
  G.knurl(p, {x0: 2, x1: length - 2, radius: 5.01, starts: 12, pitch: 40});
  return TechnicalProjection.render([p], {...options, camera: {azimuth: -128, elevation: 30, roll: 0}});
};
```

Validate parameter ranges inside the model too. A different renderer may return `{markup}` with SVG geometry using the same group and line-role contract.

Group complete parts with `data-item`, a unique named `id` and a `title`. Apply `data-line-role` to every ink path, preserving explicit surface fills and opening geometry.

Mark filled ink, including engraved text and arrowheads, with `data-ink-fill`. The viewer resolves its source color before export and adapts its preview color with the linework.

Keep occluding faces unmarked and explicitly paper-colored. A filled-ink marker identifies content to recolor, not every closed surface.

Part fills come from `render` with `fill: true`. A different renderer that supports them returns one `data-fills` group before the parts, holding paths with `data-fill` and `data-covers` as **Project visible ink from the mesh** in [geometry-library.md](geometry-library.md) describes.

Return coordinates in millimeters on the 420 × 297 mm sheet. `TechnicalProjection.render` already fits them, and the viewer draws them unscaled. `render` applies each part's explosion vector scaled by `explosion`, drops parts outside `isolated` and draws fills for `fill` and labels for `annotate`, so models pass all four through. Handle them in the model only when spacing or isolation changes the geometry itself.

Treat model code as generator source you control. Remove scripts and external resources from imported SVG before it reaches this boundary.

## Build one portable file

Run [scripts/build-viewer.cjs](scripts/build-viewer.cjs) with the configuration and destination:

```sh
node tools/teardown/scripts/build-viewer.cjs drawing.json dist/index.html
```

Deliver the resulting HTML alongside `evidence.md`, the configuration, model scripts, dependency lockfile and copies of the skill's `assets/` and `scripts/` folders kept side by side.

[assets/sheet.js](assets/sheet.js) owns the sheet size and linework presets, [assets/viewer.html](assets/viewer.html) owns the shell, [assets/viewer.js](assets/viewer.js) owns interaction state and [assets/export.js](assets/export.js) owns export snapshots. [assets/worker.js](assets/worker.js) runs the models away from the controls, one job at a time.

A newer preview supersedes queued and running ones, and slider input is debounced. Downloads stay disabled until the current drawing is ready.

## Test the controls and the downloaded bytes

For every build, run `node tools/teardown/scripts/check-viewer.cjs dist/index.html check/` from the project folder, with Node 22 or later. It opens the page from disk in headless Chrome, waits for each drawing, screenshots it and fails on errors, missing parts or network requests. Add `--dark` to check the dark appearance.

The page renders in a worker, so a plain headless screenshot taken at load shows an empty page. Interactive checks beyond the script need a DevTools driver that waits until `#render-status` reads `Drawing updated`.

The bundled controls and appearance are the skill's own code and are tested with it, so test what this drawing adds. Open the generated page from disk and change whole-drawing and individual-part colors, fill one part and then every part, turn on annotations, then switch views where available. Download after zooming and scrolling, confirming that every format preserves the complete selected view and its colors.

Check full-page, cropped, transparent and isolated-part exports. Verify PNG pixel dimensions and alpha, plus PDF page count, physical size and vector content. Render the downloaded PDF independently and inspect its labels, fine lines and sheet edges.

If browser testing is unavailable, state that limitation and provide the standalone files for inspection.
