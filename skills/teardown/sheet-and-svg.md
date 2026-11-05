# Compose the sheet in paper units

## Start from the reproduction size

Use one SVG user unit per millimeter of paper. A landscape A3 sheet starts with `width="420mm" height="297mm" viewBox="0 0 420 297"`.

This file covers sheets composed by hand around rendered views, such as an annotated assembly print. The bundled renderer fits the object inside a 28 mm margin with no title band.

For an annotated sheet, begin with 12 mm margins and a 24 mm title band. Size the object before placing a border or table, and reserve rectangles for views and labels before adding detail. Landscape A3 with a dominant exploded view, assembled inset and parts list suits an assembly manual.

Use plain white paper and near-black ink, such as `#202020`, for a clean assembly print. Follow an explicit color reference when provided.

Object linework takes its widths and axis dash from the presets in [assets/sheet.js](assets/sheet.js). Start the marks added around it from these values, a recipe rather than a drafting standard:

| Mark | Paper size |
| --- | --- |
| Leaders and dimension lines | 0.16 mm stroke |
| Hatching | 0.13 mm stroke |
| Centerlines and trails | 0.13 mm dashed stroke, the `axis` role |
| Main title | 5 mm text |
| Item numbers and ordinary labels | 3 mm text |
| Secondary metadata | 2.5 mm text |

Achieve hierarchy through width before reducing opacity.

Use the project's fonts when the sheet belongs to a product. Otherwise choose an available neutral sans serif and verify its actual rendering.

Keep annotations in sheet coordinates so changing the drawing scale does not change their size. Font sizes above describe the em size, not guaranteed capital height.

Use round-ended strokes with round joins, as the viewer does, so pieces of one contour meet without a step. Dashed axis lines keep butt ends, since round ends would close their gaps. Inspect acute joins for unwanted spikes.

## Make line roles distinguishable

Use continuous lines for visible edges. Hidden edges use short, uniform dashes; centerlines and assembly trails use a long-short pattern.

Start with `stroke-dasharray="2 1"` for hidden edges and the sheet's `axisDash` for centerlines. Preserve those lengths in paper coordinates.

Place centerlines slightly beyond the feature they identify. Terminate trails at meaningful assembly anchors, and use solid leaders for item identification.

Add sheet grids, zone labels or decorative rules only when the user's template needs them.

## Put only established facts on the sheet

Lay labels out before finalizing view positions. When text collides, adjust the view or route the leader rather than shrinking annotations until they disappear. Balloons and dimensions follow **Attach each balloon to one item** and **Dimension only what is established** in [views-and-annotations.md](views-and-annotations.md).

Add only metadata with established values. Keep sheet notes about the object and its assembly, and put rendering methods and verification details in the delivery message.

A concept sheet carries one visible status note. Leave unknown tolerances, material specifications, approval signatures and compliance claims absent.

## Keep the exported SVG self-contained

Use named groups for views, parts, annotations and sheet furniture. Prefix IDs when embedding multiple drawings in one document.

Keep styles, patterns and markers inside the SVG. Avoid remote fonts, linked images and runtime dependencies in the standalone artifact.

Set `fill="none"` on open paths and polylines, including leaders. SVG's default fill otherwise closes a bent leader into a black triangle.

Include an SVG `title` and `desc` summarizing the subject and views. When embedding in a product, hand accessible naming and the parts-list alternative to `better-accessibility`.

This shell establishes physical units and line roles without prescribing the sheet's composition:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     width="420mm" height="297mm" viewBox="0 0 420 297"
     role="img" aria-labelledby="drawing-title drawing-desc">
  <title id="drawing-title">Assembly drawing</title>
  <desc id="drawing-desc">Assembled and exploded views with a parts list.</desc>
  <defs>
    <style>
      [data-line-role], .leader {
        fill: none;
        stroke: #202020;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      /* one stroke-width rule per line role, plus the axis dash with butt ends */
      .leader { stroke-width: .16; }
      text { fill: #202020; font-family: Arial, sans-serif; font-size: 3px; }
    </style>
  </defs>
  <rect width="420" height="297" fill="white"/>
  <g id="views"/>
  <g id="annotations"/>
  <g id="sheet"/>
</svg>
```

Paste `render` markup into `views` as it comes out. Its paths carry `data-line-role`, which the style inks. Replace the placeholder title, description and empty groups with the actual drawing. Here SVG font pixels are user units and inherit the root's millimeter mapping.

Generate the role rules where the shell's comment sits, from the sheet module rather than copied numbers:

```js
const SHEET = require('./tools/teardown/assets/sheet.js');
const roles = SHEET.css('technical');
```

Generate projected coordinates directly in sheet space when possible. Nested scale transforms otherwise multiply stroke widths along with geometry. To inset a rendered view at a smaller size, wrap its markup in a translate and scale transform and divide its stroke widths by that scale.

`vector-effect="non-scaling-stroke"` preserves viewport stroke thickness, not a universal physical pen size. Use it only with a deliberate export policy and verify both preview and print output.

## Export from the same source

Rasterize the actual SVG with a browser or installed SVG renderer. For A3, a preview around 2000 pixels wide is a useful first inspection.

For a print PNG, compute pixels as `millimeters / 25.4 * dpi`. At 300 dpi, landscape A3 rounds to 4961 by 3508 pixels.

For PDF, retain vector geometry through a suitable exporter. Set the page size explicitly, disable browser headers and margins, then inspect the exported page.

Open SVG and PDF independently after export. Check that fonts, markers, clipping and hatch patterns survived, especially around holes and small labels.
