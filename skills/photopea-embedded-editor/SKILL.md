---
id: 'photopea-embedded-editor'
name: photopea-embedded-editor
description: Embed Photopea in web apps using photopea.js. Covers embedding, file I/O, scripting, exporting, layers, text, filters, and the full Photoshop-compatible API.
risk: safe
source: community
source_repo: yikuansun/PhotopeaAPI
source_type: community
license: MIT
license_source: "https://github.com/yikuansun/PhotopeaAPI/blob/master/LICENSE"
date_added: 2026-05-20
category: frontend-frameworks
tags:
- css
- design
- html
- react
- ui
- ux
tools:
- claude-code
author: 'emanueleodierna'
---

# Photopea Embedded Editor Skill
## Using photopea.js (yikuansun/PhotopeaAPI) in Websites & Apps

---

## When to Use This Skill

Use this skill for **every task** that involves:
- Embedding Photopea as an image editor inside a webpage or web app
- Controlling an embedded Photopea instance from your JavaScript code
- Automating image editing workflows from a host page (open files, run scripts, export results)
- Building an image editing feature into your product using Photopea as the engine
- Writing scripts to manipulate documents, layers, text, selections, filters, colors, and paths

**Do NOT** use raw `postMessage` wiring — always use `photopea.js` as the wrapper.

---

## Library: photopea.js

`photopea.js` is a Promises-based JavaScript wrapper around the Photopea Live Messaging API.
Repository: https://github.com/yikuansun/PhotopeaAPI
npm package: https://www.npmjs.com/package/photopea

### Installation

**CDN (no build step)**
```html
<script src="https://cdn.jsdelivr.net/npm/photopea@1.1.1/dist/photopea.min.js"></script>
```

**Self-hosted**
```html
<script src="./photopea.min.js"></script>
```

**npm (Webpack / Vite / Rollup)**
```bash
npm install photopea
```
```js
import Photopea from "photopea";
```

---

## Core API: The `Photopea` Class

| Method | Description |
|--------|-------------|
| `Photopea.createEmbed(container)` | Creates + injects the iframe, resolves when ready |
| `new Photopea(window.parent)` | Plugin mode: wrap the parent window |
| `pea.runScript(script)` | Run JS string inside Photopea; returns output array |
| `pea.loadAsset(arrayBuffer)` | Load binary file (image, font, brush, etc.) |
| `pea.openFromURL(url, asSmart)` | Open remote URL as new doc or smart object layer |
| `pea.exportImage(type)` | Export current doc; returns `Blob` (`"png"` or `"jpg"`) |

All methods return Promises — always `await` or `.then()`.

---

## Step 1 — Embed

The container `<div>` **must** have a fixed width and height before calling `createEmbed`.

```html
<div id="editor" style="width:1000px; height:650px;"></div>
<script src="https://cdn.jsdelivr.net/npm/photopea@1.1.1/dist/photopea.min.js"></script>
<script>
  Photopea.createEmbed(document.getElementById("editor")).then(async (pea) => {
    // pea is ready
  });
</script>
```

**React:**
```jsx
import { useEffect, useRef } from "react";
import Photopea from "photopea";

export default function Editor() {
  const containerRef = useRef(null);
  const peaRef       = useRef(null);

  useEffect(() => {
    if (!containerRef.current || peaRef.current) return;
    Photopea.createEmbed(containerRef.current).then((pea) => {
      peaRef.current = pea;
    });
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "650px" }} />;
}
```

---

## Step 2 — Opening Files

```js
// Remote URL → new document
await pea.openFromURL("https://example.com/design.psd", false);

// Remote URL → smart object layer inside current document
await pea.openFromURL("https://example.com/overlay.png", true);

// Local file (user input → ArrayBuffer → loadAsset)
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const buf = await e.target.files[0].arrayBuffer();
  await pea.loadAsset(buf);
});

// Base64 data URI via runScript
await pea.runScript(`app.open("data:image/png;base64,iVBORw0...");`);
```

---

## Step 3 — Running Scripts

`runScript` sends a JS string, returns an array of `app.echoToOE(...)` values + `"done"` last.

```js
const result = await pea.runScript(`app.echoToOE("hello");`);
// result → ["hello", "done"]

// Return structured data
const out = await pea.runScript(`
  app.echoToOE(JSON.stringify({
    width:  app.activeDocument.width,
    height: app.activeDocument.height,
    layers: app.activeDocument.layers.length
  }));
`);
const info = JSON.parse(out[0]);
```

---

## Step 4 — Exporting

```js
// PNG Blob (via exportImage)
const blob = await pea.exportImage("png");
document.getElementById("preview").src = URL.createObjectURL(blob);

// JPEG Blob
const blob = await pea.exportImage("jpg");

// WebP / PSD / quality-controlled JPEG via saveToOE
const result = await pea.runScript(`app.activeDocument.saveToOE("webp:0.85");`);
const webpBlob = new Blob([result[0]], { type: "image/webp" });

const result = await pea.runScript(`app.activeDocument.saveToOE("psd:true");`);
const psdBlob  = new Blob([result[0]], { type: "application/octet-stream" });

// Trigger download
async function download(pea, filename = "export.png") {
  const blob = await pea.exportImage("png");
  const a    = Object.assign(document.createElement("a"), {
    href:     URL.createObjectURL(blob),
    download: filename
  });
  a.click();
}
```

**Export format strings for `saveToOE`:**

| String | Format |
|--------|--------|
| `"png"` | PNG lossless |
| `"jpg"` | JPEG default |
| `"jpg:0.8"` | JPEG quality 0.0–1.0 |
| `"webp:0.7"` | WebP quality 0.0–1.0 |
| `"psd"` | Full PSD |
| `"psd:true"` | Minified PSD |
| `"svg:true"` | SVG |

---

## Step 5 — Loading Assets

```js
// Font
const buf = await (await fetch("https://example.com/MyFont.otf")).arrayBuffer();
await pea.loadAsset(buf);
// Now usable in textItem.font

// Brush
await pea.loadAsset(await (await fetch("Nature.ABR")).arrayBuffer());

// Gradient
await pea.loadAsset(await (await fetch("Gradients.GRD")).arrayBuffer());
```

---

## Step 6 — Plugin Mode

```js
// Your page is inside Photopea's sidebar iframe
const pea = new Photopea(window.parent);

const out = await pea.runScript(`app.echoToOE(app.activeDocument.width);`);
console.log("Width:", out[0]);

// Load an asset from your plugin
const buf = await (await fetch("https://my-assets.com/sticker.png")).arrayBuffer();
await pea.loadAsset(buf);
```

Plugin config:
```json
{
  "environment": {
    "plugins": [{
      "name": "My Plugin",
      "url":  "https://my-plugin.example.com",
      "icon": "===https://my-plugin.example.com/icon.png"
    }]
  }
}
```

---

## Utility Patterns

### addImageAndWait — robust async layer insertion
```js
async function addImageAndWait(pea, imgURI) {
  let count = "done";
  while (count === "done")
    count = (await pea.runScript(`app.echoToOE(app.activeDocument.layers.length)`))[0];
  count = parseInt(count);

  await pea.runScript(`app.open("${imgURI}", null, true);`);

  return new Promise((resolve) => {
    const check = async () => {
      const n = parseInt((await pea.runScript(
        `app.echoToOE(app.activeDocument.layers.length)`
      ))[0]);
      n === count + 1 ? resolve() : setTimeout(check, 50);
    };
    check();
  });
}
```

### getDocumentAsImage — returns `<img>` element
```js
async function getDocumentAsImage(pea) {
  const result = await pea.runScript(`app.activeDocument.saveToOE('png')`);
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.addEventListener("load", (e) => {
      const img = new Image(); img.src = e.target.result; resolve(img);
    });
    fr.readAsDataURL(new Blob([result[0]], { type: "image/png" }));
  });
}
```

---

## Real-World Patterns

### Pattern A — Open + Export UI
```html
<input type="file" id="fileInput" accept="image/*,.psd">
<button id="exportBtn">Export PNG</button>
<div id="editor" style="width:100%;height:600px;"></div>
<script src="https://cdn.jsdelivr.net/npm/photopea@1.1.1/dist/photopea.min.js"></script>
<script>
let pea;
Photopea.createEmbed(document.getElementById("editor")).then(p => pea = p);

document.getElementById("fileInput").addEventListener("change", async e => {
  await pea.loadAsset(await e.target.files[0].arrayBuffer());
});
document.getElementById("exportBtn").addEventListener("click", async () => {
  const blob = await pea.exportImage("png");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: "export.png"
  });
  a.click();
});
</script>
```

### Pattern B — Template + Text Edit + Export
```js
async function generateCard(pea, name, tagline) {
  await pea.openFromURL("https://example.com/card.psd", false);
  await pea.runScript(`
    app.activeDocument.layers.getByName("Name").textItem.contents    = "${name}";
    app.activeDocument.layers.getByName("Tagline").textItem.contents = "${tagline}";
  `);
  return await pea.exportImage("png");
}
```

### Pattern C — Batch Watermark
```js
async function batchWatermark(pea, imageURLs, watermarkURL) {
  const results = [];
  for (const url of imageURLs) {
    await pea.openFromURL(url, false);
    await pea.openFromURL(watermarkURL, true);
    await pea.runScript(`
      var doc = app.activeDocument, wm = doc.activeLayer;
      wm.translate(doc.width - wm.bounds[2] - 20, doc.height - wm.bounds[3] - 20);
      wm.opacity = 70;
    `);
    results.push(await pea.exportImage("png"));
    await pea.runScript(`app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);`);
  }
  return results;
}
```

---

# FULL SCRIPTING API REFERENCE

> All code in this section runs **inside `pea.runScript("...")`** strings.
> Photopea implements the Adobe Photoshop CC 2015 JavaScript scripting interface.
> Any Photoshop script targeting that version should work in Photopea.

---

## `app` — Application Object

### Properties

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `app.activeDocument` | Document | R/W | The currently active document |
| `app.documents` | Documents | R | Collection of all open documents |
| `app.documents.length` | number | R | Count of open documents |
| `app.documents[i]` | Document | R | Access by zero-based index |
| `app.foregroundColor` | SolidColor | R/W | Current foreground color |
| `app.backgroundColor` | SolidColor | R/W | Current background color |
| `app.preferences.rulerUnits` | Units | R/W | `Units.PIXELS`, `Units.CM`, `Units.INCHES`, `Units.MM`, `Units.PICAS`, `Units.POINTS`, `Units.PERCENT` |
| `app.preferences.typeUnits` | TypeUnits | R/W | `TypeUnits.PIXELS`, `TypeUnits.MM`, `TypeUnits.POINTS` |
| `app.displayDialogs` | DialogModes | R/W | `DialogModes.NO`, `DialogModes.ALL`, `DialogModes.ERROR` |

### Methods

| Method | Description |
|--------|-------------|
| `app.open(url)` | Open URL as new document |
| `app.open(url, null, true)` | Open URL as smart object layer in active document |
| `app.echoToOE(string)` | **Photopea extension** — send string to host page (captured by `runScript`) |
| `app.showWindow("magiccut")` | **Photopea extension** — open Magic Cut panel |
| `app.showWindow("vbitmap")` | **Photopea extension** — open Vectorize Bitmap panel |
| `app.UI.zoomIn()` | Zoom in |
| `app.UI.zoomOut()` | Zoom out |
| `app.UI.fitTheArea()` | Fit canvas to viewport |
| `app.UI.pixelToPixel()` | 100% zoom |
| `app.UI.switchFullscreen()` | Toggle fullscreen |
| `app.UI.scroll(dx, dy)` | Scroll by delta |
| `app.UI.scrollTo(x, y)` | Scroll to absolute position |

**Important:** Always set ruler units to pixels at the start of any script that uses pixel measurements:
```js
var savedUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
// ... your code ...
app.preferences.rulerUnits = savedUnits;
```

---

## `Document` — Document Object

Access via `app.activeDocument` or `app.documents[i]`.

### Properties

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `width` | number | R | Document width in current ruler units |
| `height` | number | R | Document height in current ruler units |
| `resolution` | number | R | DPI (pixels per inch) |
| `name` | string | **R/W** | **Photopea extension** — display label (no history step) |
| `source` | string | **R/W** | **Photopea extension** — file origin URL or `"local,X,NAME"` |
| `mode` | DocumentMode | R | `DocumentMode.RGB`, `GRAYSCALE`, `CMYK`, `LAB`, `BITMAP`, `INDEXEDCOLOR`, `MULTICHANNEL` |
| `bitsPerChannel` | BitsPerChannelType | R | `BitsPerChannelType.EIGHT`, `SIXTEEN`, `THIRTYTWO` |
| `colorProfileName` | string | R | Name of embedded color profile |
| `activeLayer` | Layer/ArtLayer/LayerSet | R/W | Set to activate a layer |
| `currentLayer` | ArtLayer | R/W | Alias for `activeLayer` |
| `layers` | Layers | R | All top-level layers (both art + group) |
| `artLayers` | ArtLayers | R | All top-level art layers only |
| `layerSets` | LayerSets | R | All top-level group layers only |
| `selection` | Selection | R | The current selection |
| `channels` | Channels | R | All channels |
| `historyStates` | HistoryStates | R | Undo history |
| `activeHistoryState` | HistoryState | R/W | Current history position |
| `layerComps` | LayerComps | R | Layer comps collection |
| `guides` | Guides | R | Guides collection |
| `pathItems` | PathItems | R | Vector paths |
| `id` | number | R | Unique document ID |
| `saved` | boolean | R | Whether document has unsaved changes |
| `quickMaskMode` | boolean | R | Whether in Quick Mask mode |
| `backgroundLayer` | ArtLayer | R | The background layer |
| `pixelAspectRatio` | number | R | Custom pixel aspect ratio (0.1–10.0) |
| `histogram` | array | R | 256-element histogram array |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `resizeImage` | `(w, h, res, resampleMethod)` | Resize image pixels. ResampleMethod: `BICUBIC`, `BILINEAR`, `NEARESTNEIGHBOR`, `NONE`, `BICUBICSHARPER`, `BICUBICSMOOTHER` |
| `resizeCanvas` | `(w, h, anchor)` | Resize canvas without scaling. AnchorPosition: `TOPLEFT`, `TOPCENTER`, `TOPRIGHT`, `MIDDLELEFT`, `MIDDLECENTER`, `MIDDLERIGHT`, `BOTTOMLEFT`, `BOTTOMCENTER`, `BOTTOMRIGHT` |
| `rotateCanvas` | `(degrees)` | Rotate entire canvas. Positive = clockwise |
| `flipCanvas` | `(direction)` | `Direction.HORIZONTAL` or `Direction.VERTICAL` |
| `crop` | `([x1,y1,x2,y2], angle, w, h)` | Crop canvas. Angle and dimensions are optional |
| `trim` | `(trimType, top, left, bottom, right)` | Trim transparent/background-color borders. TrimType: `TRANSPARENT`, `TOPLEFT`, `BOTTOMRIGHT` |
| `revealAll` | `()` | Expand canvas to show clipped content |
| `flatten` | `()` | Merge all layers into one |
| `mergeVisibleLayers` | `()` | Merge all visible layers |
| `rasterizeAllLayers` | `()` | Rasterize all vector/text layers |
| `changeMode` | `(mode, options)` | Convert color mode (e.g., `ChangeMode.GRAYSCALE`) |
| `convertProfile` | `(profileName, renderingIntent, blackPointCompensation, dither)` | Convert color profile |
| `duplicate` | `(name, mergedLayers)` | Duplicate the document |
| `close` | `(saveOptions)` | Close document. SaveOptions: `DONOTSAVECHANGES`, `SAVECHANGES`, `PROMPTTOSAVECHANGES` |
| `save` | `()` | Save (requires server config in embed) |
| `saveToOE` | `(format)` | **Photopea extension** — send binary to host. Formats: `"png"`, `"jpg:0.8"`, `"webp:0.7"`, `"psd:true"`, `"svg:true"` |
| `clearHistory` | `()` | **Photopea extension** — clear undo history to free RAM |
| `exportDocument` | `(file, exportType, options)` | Export to filesystem (triggers ZIP). ExportType: `SAVEFORWEB` |
| `paste` | `(intoSelection)` | Paste clipboard into document |
| `suspendHistory` | `(historyName, callback)` | Wrap multiple ops in one history state |

**Practical examples:**
```js
var doc = app.activeDocument;

// Resize image to 1920×1080 at 72dpi bicubic
doc.resizeImage(1920, 1080, 72, ResampleMethod.BICUBIC);

// Expand canvas to 2000px wide, keeping content centered
doc.resizeCanvas(2000, doc.height, AnchorPosition.MIDDLECENTER);

// Crop to a region
doc.crop([100, 100, 900, 600]);

// Trim transparent edges
doc.trim(TrimType.TRANSPARENT, true, true, true, true);

// Flip horizontal
doc.flipCanvas(Direction.HORIZONTAL);

// Change to grayscale
doc.changeMode(ChangeMode.GRAYSCALE);

// One undo step for many operations
doc.suspendHistory("Batch Edit", "action");
// (Inside Photopea, all ops become one history state)

// Export PNG to filesystem (triggers ZIP download)
var opts = new ExportOptionsSaveForWeb();
opts.format  = SaveDocumentType.PNG;
opts.PNG8    = false;
opts.quality = 100;
doc.exportDocument(new File("/output.png"), ExportType.SAVEFORWEB, opts);

// Close without saving
doc.close(SaveOptions.DONOTSAVECHANGES);
```

---

## `Layers` / `ArtLayers` / `LayerSets` Collections

These collections exist on `Document`, `LayerSet` (groups within groups), and can be iterated.

```js
var doc = app.activeDocument;

// Access
doc.layers          // all top-level (art + groups)
doc.artLayers       // top-level art layers only
doc.layerSets       // top-level group layers only

// By index (0 = topmost)
doc.layers[0]
doc.layers[doc.layers.length - 1]  // bottommost

// By name (throws if not found)
doc.layers.getByName("Background")
doc.artLayers.getByName("Logo")
doc.layerSets.getByName("Header Group")

// Add
var newLayer  = doc.artLayers.add();         // new blank art layer
var newGroup  = doc.layerSets.add();         // new group
var innerLayer = newGroup.artLayers.add();   // layer inside a group

// Remove
doc.artLayers.getByName("Temp").remove();

// Iterate all layers recursively
function walkLayers(parent) {
  for (var i = 0; i < parent.layers.length; i++) {
    var l = parent.layers[i];
    if (l.typename === "LayerSet") walkLayers(l);
    else /* ArtLayer */ processLayer(l);
  }
}
walkLayers(doc);
```

---

## `ArtLayer` — Individual Layer

### Properties

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `name` | string | R/W | Layer name |
| `visible` | boolean | R/W | Layer visibility |
| `opacity` | number | R/W | Layer opacity 0–100 |
| `fillOpacity` | number | R | Fill opacity 0–100 |
| `blendMode` | BlendMode | R/W | Blend mode (see enum below) |
| `kind` | LayerKind | R/W | Layer type (can set to `LayerKind.TEXT` on empty layer) |
| `textItem` | TextItem | R | Text object (only when `kind === LayerKind.TEXT`) |
| `bounds` | array | R | `[left, top, right, bottom]` in current ruler units |
| `parent` | Document/LayerSet | R | Containing object |
| `typename` | string | R | Always `"ArtLayer"` |
| `selected` | boolean | R | **Photopea extension** — is layer highlighted in panel |
| `isBackgroundLayer` | boolean | R | Is this the locked background layer |
| `grouped` | boolean | R | Is clipping mask applied |
| `pixelsLocked` | boolean | R | Pixels locked |
| `positionLocked` | boolean | R | Position locked |
| `transparentPixelsLocked` | boolean | R | Transparent pixels locked |
| `layerMaskDensity` | number | R | Layer mask density 0–100 |
| `layerMaskFeather` | number | R | Layer mask feather 0–250 |
| `vectorMaskDensity` | number | R | Vector mask density 0–100 |
| `vectorMaskFeather` | number | R | Vector mask feather 0–250 |

### Transform Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `translate` | `(deltaX, deltaY)` | Move layer by offset |
| `rotate` | `(angle, anchor)` | Rotate by degrees. AnchorPosition optional (default center) |
| `resize` | `(widthPct, heightPct, anchor)` | Scale as percentage of current size |
| `rasterize` | `(target)` | Rasterize. RasterizeType: `ENTIRE`, `FILLCONTENT`, `LAYERCLIPPINGMASK`, `LINKEDLAYERS`, `SHAPE`, `TEXTCONTENTS`, `VECTORMASK` |

### Layer Management Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `duplicate` | `()` | Duplicate to same document, returns new layer |
| `duplicate` | `(doc, placement)` | Duplicate to another document |
| `remove` | `()` | Delete the layer |
| `merge` | `()` | Merge down; returns the merged ArtLayer |
| `move` | `(relativeLayer, placement)` | Reorder. ElementPlacement: `PLACEBEFORE`, `PLACEAFTER`, `PLACEATBEGINNING`, `PLACEATEND`, `INSIDE` |
| `copy` | `(merged)` | Copy to clipboard |
| `cut` | `()` | Cut to clipboard |
| `clear` | `()` | Cut without clipboard |

### Adjustment Methods on ArtLayer

| Method | Signature | Description |
|--------|-----------|-------------|
| `adjustBrightnessContrast` | `(brightness, contrast)` | Brightness -100–100, Contrast -100–100 |
| `adjustColorBalance` | `(shadows, midtones, highlights, preserveLuminosity)` | Each is `[cyan-red, magenta-green, yellow-blue]` array |
| `adjustCurves` | `(curveShape)` | Array of `[input,output]` pairs per channel |
| `adjustLevels` | `(inputRangeStart, inputRangeEnd, gamma, outputRangeStart, outputRangeEnd)` | Levels adjustment |
| `autoLevels` | `()` | Auto levels |
| `autoContrast` | `()` | Auto contrast |
| `desaturate` | `()` | Convert to grayscale values in current mode |
| `equalize` | `()` | Equalize brightness distribution |
| `invert` | `()` | Invert pixel colors |
| `posterize` | `(levels)` | Posterize (2–255 levels) |
| `threshold` | `(level)` | B&W threshold (1–255) |
| `shadowHighlight` | `(shadowAmount, shadowWidth, shadowRadius, highlightAmount, highlightWidth, highlightRadius, colorCorrection, midtoneContrast, blackClip, whiteClip)` | Shadows/Highlights |
| `photoFilter` | `(fillColor, density, luminosity)` | Photo filter |
| `mixChannels` | `(outputChannels, monochrome)` | Channel mixer |
| `selectiveColor` | `(colors, cyan, magenta, yellow, black, method)` | Selective color |

### Filter Methods on ArtLayer

| Method | Signature | Description |
|--------|-----------|-------------|
| `applyGaussianBlur` | `(radius)` | Gaussian blur (0.1–250 px radius) |
| `applyMotionBlur` | `(angle, distance)` | Motion blur |
| `applyRadialBlur` | `(amount, blurMethod, blurQuality)` | Radial blur |
| `applySmartBlur` | `(radius, threshold, blurQuality, blurMode)` | Smart blur |
| `applyBlur` | `()` | Simple blur |
| `applyBlurMore` | `()` | Blur more |
| `applyUnSharpMask` | `(amount, radius, threshold)` | Unsharp mask |
| `applySharpen` | `()` | Sharpen |
| `applySharpenEdges` | `()` | Sharpen edges |
| `applySharpenMore` | `()` | Sharpen more |
| `applyAddNoise` | `(amount, distribution, monochromatic)` | Add noise. NoiseDistribution: `GAUSSIAN`, `UNIFORM` |
| `applyDespeckle` | `()` | Despeckle |
| `applyDustAndScratches` | `(radius, threshold)` | Dust and scratches |
| `applyMedianNoise` | `(radius)` | Median noise reduction |
| `applyMaximum` | `(radius)` | Maximum filter (dilate) |
| `applyMinimum` | `(radius)` | Minimum filter (erode) |
| `applyHighPass` | `(radius)` | High pass |
| `applyOffset` | `(horizontal, vertical, undefinedAreas)` | Offset. UndefinedAreas: `SETTOBACKGROUND`, `WRAPAROUND`, `REPEATEDGEPIXELS` |
| `applyRipple` | `(amount, size)` | Ripple. RippleSize: `SMALL`, `MEDIUM`, `LARGE` |
| `applyWave` | `(generators, minWavelength, maxWavelength, minAmplitude, maxAmplitude, horizScale, vertScale, waveType, undefinedAreas, randomSeed)` | Wave filter |
| `applyZigZag` | `(amount, ridges, style)` | Zig-Zag |
| `applyTwirl` | `(angle)` | Twirl |
| `applyPolarCoordinates` | `(conversion)` | Polar coordinates |
| `applySpherize` | `(amount, mode)` | Spherize |
| `applyPinch` | `(amount)` | Pinch (-100–100) |
| `applyShear` | `(curve, undefinedAreas)` | Shear |
| `applyDisplace` | `(horizontalScale, verticalScale, displacementType, undefinedAreas, displacementMapFile)` | Displace |
| `applyClouds` | `()` | Render Clouds |
| `applyDifferenceClouds` | `()` | Difference Clouds |
| `applyLensFlare` | `(brightness, flareCenter, lensType)` | Lens Flare. LensType: `ZOOMWIDE, ZOOMNORMAL, MOVIE` |
| `applyDiffuseGlow` | `(graininess, glowAmount, clearAmount)` | Diffuse Glow |
| `applyGlassEffect` | `(distortion, smoothness, scaling, invert, texture, textureFile)` | Glass |
| `applyOceanRipple` | `(size, magnitude)` | Ocean Ripple |
| `applyLensBlur` | `(source, focalDistance, invertDepthMap, shape, radius, bladeCurvature, rotation, brightness, threshold, amount, distribution, monochromatic)` | Lens Blur |
| `applyAverage` | `()` | Average blur |
| `applyDeInterlace` | `(eliminateFields, createFields)` | De-interlace |
| `applyNTSC` | `()` | NTSC colors |
| `applyCustomFilter` | `(characteristics, scale, offset)` | Custom filter (5×5 matrix) |
| `applyTextureFill` | `(textureFile)` | Texture fill |
| `applyStyle` | `(styleName)` | Apply a layer style preset by name |
| `photoFilter` | `(fillColor, density, luminosity)` | Photo Filter |

**Practical examples:**
```js
var layer = app.activeDocument.activeLayer;

// Move to absolute position (layer.bounds[0] = current left edge)
layer.translate(200 - layer.bounds[0], 100 - layer.bounds[1]);

// Rotate 45° around center
layer.rotate(45);

// Scale to 50% keeping center
layer.resize(50, 50, AnchorPosition.MIDDLECENTER);

// Gaussian blur radius 10
layer.applyGaussianBlur(10);

// Unsharp mask
layer.applyUnSharpMask(50, 2, 0);

// Levels: input 0–200, gamma 1.2, output 0–255
layer.adjustLevels(0, 200, 1.2, 0, 255);

// Brightness +20, Contrast +10
layer.adjustBrightnessContrast(20, 10);

// Invert
layer.invert();

// Rasterize text
layer.rasterize(RasterizeType.TEXTCONTENTS);

// Duplicate layer
var copy = layer.duplicate();
copy.name = "Layer Copy";

// Move layer below another
var target = doc.layers.getByName("Background");
layer.move(target, ElementPlacement.PLACEAFTER);
```

---

## `LayerSet` — Group Layer

A LayerSet is a folder/group in the Layers panel. It has the same layer management methods as `Document`.

### Properties

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `name` | string | R/W | Group name |
| `visible` | boolean | R/W | Group visibility |
| `opacity` | number | R/W | Group opacity 0–100 |
| `blendMode` | BlendMode | R/W | Group blend mode |
| `bounds` | array | R | Bounding box `[left,top,right,bottom]` |
| `layers` | Layers | R | All layers inside this group |
| `artLayers` | ArtLayers | R | Art layers inside this group |
| `layerSets` | LayerSets | R | Sub-groups inside this group |
| `parent` | Document/LayerSet | R | Parent container |
| `typename` | string | R | Always `"LayerSet"` |

### Methods
Same as Document for layer management: `layers.add()`, `artLayers.add()`, `layerSets.add()`, `.getByName()`, plus `duplicate()`, `remove()`, `move()`.

```js
// Create group with layers inside
var group = doc.layerSets.add();
group.name = "Product Card";

var bgLayer   = group.artLayers.add(); bgLayer.name = "Background";
var textLayer = group.artLayers.add(); textLayer.kind = LayerKind.TEXT;
textLayer.textItem.contents = "Buy Now";
textLayer.textItem.size     = 36;

// Collapse/expand group (Photopea specific, not in standard DOM)
// Use visibility as workaround

// Get specific layer inside a group
var innerLayer = doc.layerSets.getByName("Header Group").artLayers.getByName("Title");
```

---

## `TextItem` — Text Layer Content

Access via `layer.textItem` on any layer with `layer.kind === LayerKind.TEXT`.

### Core Properties (most commonly used)

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `contents` | string | R/W | The actual text content |
| `font` | string | R/W | Font PostScript name (e.g. `"ArialMT"`, `"Verdana-Bold"`) |
| `size` | number | R/W | Font size in points |
| `color` | SolidColor | R/W | Text color |
| `position` | array | R/W | `[x, y]` origin of text (point text) or bounding box top-left |
| `justification` | Justification | R/W | `Justification.LEFT`, `CENTER`, `RIGHT`, `FULLJUSTIFY` |
| `kind` | TextType | R/W | `TextType.POINTTEXT` or `TextType.PARAGRAPHTEXT` |
| `width` | number | R/W | Width of bounding box (paragraph text only) |
| `height` | number | R/W | Height of bounding box (paragraph text only) |
| `direction` | Direction | R/W | `Direction.HORIZONTAL` or `Direction.VERTICAL` |

### Typography Properties

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `leading` | number | R/W | Line spacing in points |
| `tracking` | number | R/W | Letter spacing -1000–10000 (1000 = 1 em) |
| `horizontalScale` | number | R/W | Horizontal scaling 0–1000% |
| `verticalScale` | number | R/W | Vertical scaling 0–1000% |
| `baselineShift` | number | R/W | Baseline offset in points |
| `capitalization` | Case | R/W | `Case.NORMAL`, `ALLCAPS`, `SMALLCAPS` |
| `fauxBold` | boolean | R/W | Simulated bold |
| `fauxItalic` | boolean | R/W | Simulated italic |
| `underline` | UnderlineType | R/W | `UnderlineType.NONE`, `UNDERLINELEFT`, `UNDERLINERIGHT` |
| `strikeThru` | StrikeThruType | R/W | `StrikeThruType.NONE`, `STRIKEBOX`, `STRIKEHEIGHT` |
| `antiAliasMethod` | AntiAlias | R/W | `AntiAlias.NONE`, `SHARP`, `CRISP`, `STRONG`, `SMOOTH` |
| `autoKerning` | AutoKernType | R/W | `AutoKernType.MANUAL`, `METRICS`, `OPTICAL` |
| `language` | Language | R/W | `Language.ENGLISH`, etc. |
| `ligatures` | boolean | R/W | Enable ligatures |
| `alternateLigatures` | boolean | R/W | Enable alternate ligatures |
| `oldStyle` | boolean | R/W | Old-style numerals |
| `noBreak` | boolean | R/W | Prevent line breaks in this text |
| `useAutoLeading` | boolean | R/W | Use font's built-in leading |
| `autoLeadingAmount` | number | R/W | Auto leading percentage 0.01–5000 |
| `hyphenation` | boolean | R/W | Enable hyphenation |

### Paragraph Properties

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `leftIndent` | number | R/W | Left indent -1296–1296 |
| `rightIndent` | number | R/W | Right indent -1296–1296 |
| `firstLineIndent` | number | R/W | First line indent -1296–1296 |
| `spaceBefore` | number | R/W | Space before paragraph -1296–1296 |
| `spaceAfter` | number | R/W | Space after paragraph -1296–1296 |
| `hangingPuntuation` | boolean | R/W | Roman hanging punctuation |
| `textComposer` | TextComposer | R/W | `TextComposer.ADOBEEVERYLINE`, `ADOBESINGLELINE` |

### Warp Properties

| Property | Type | R/W | Description |
|----------|------|-----|-------------|
| `warpStyle` | WarpStyle | R/W | `WarpStyle.NONE`, `ARC`, `ARCH`, `BULGE`, `SHELLLOWER`, `SHELLUPPER`, `FLAG`, `WAVE`, `FISH`, `RISE`, `FISHEYE`, `INFLATE`, `SQUEEZE`, `TWIST` |
| `warpDirection` | Direction | R/W | `Direction.HORIZONTAL` or `Direction.VERTICAL` |
| `warpBend` | number | R/W | Warp bend -100–100 |
| `warpHorizontalDistortion` | number | R/W | Horizontal distortion -100–100 |
| `warpVerticalDistortion` | number | R/W | Vertical distortion -100–100 |

### Photopea Extensions

| Property | Type | Description |
|----------|------|-------------|
| `totalTextStyle` | string | JSON string with ALL style parameters of the text |
| `transform` | string | JSON array — the affine transform matrix of the text |

### Methods

| Method | Description |
|--------|-------------|
| `convertToShape()` | Convert text to a filled shape layer with text as clipping path |
| `createPath()` | Create work path from text outlines |

**Practical examples:**
```js
var layer = doc.layers.getByName("Headline");
var text  = layer.textItem;

// Set content
text.contents = "Hello World";

// Style
text.font   = "Verdana-Bold";
text.size   = 72;
text.color.rgb.hexValue = "FF0000";    // red

// Position point text at (50, 100)
text.position = [50, 100];

// Center align
text.justification = Justification.CENTER;

// Paragraph text with bounding box
text.kind   = TextType.PARAGRAPHTEXT;
text.width  = new UnitValue("400 pixels");
text.height = new UnitValue("200 pixels");

// Letter spacing
text.tracking = 100;   // 10% spacing

// Scale text horizontally to 80%
text.horizontalScale = 80;

// Warp arc
text.warpStyle = WarpStyle.ARC;
text.warpBend  = 30;

// Read all text styles as JSON (Photopea extension)
var styles = JSON.parse(text.totalTextStyle);
app.echoToOE(JSON.stringify(styles));
```

---

## Creating a Text Layer from Scratch

```js
app.preferences.rulerUnits = Units.PIXELS;

var layer = doc.artLayers.add();
layer.kind = LayerKind.TEXT;      // Convert blank layer to text
layer.name = "My Title";

var text = layer.textItem;
text.contents      = "Welcome";
text.font          = "ArialMT";
text.size          = 48;
text.justification = Justification.CENTER;
text.position      = [doc.width / 2, 100];

var color = new SolidColor();
color.rgb.red   = 255;
color.rgb.green = 255;
color.rgb.blue  = 255;
text.color = color;
```

---

## `SolidColor` — Color Object

```js
// RGB (most common in Photopea)
var c = new SolidColor();
c.rgb.red   = 255;      // 0–255
c.rgb.green = 128;
c.rgb.blue  = 0;
c.rgb.hexValue = "FF8000";   // Set via hex string (no #)

// CMYK
var c2 = new SolidColor();
c2.cmyk.cyan    = 0;    // 0–100
c2.cmyk.magenta = 50;
c2.cmyk.yellow  = 100;
c2.cmyk.black   = 0;

// Grayscale
var c3 = new SolidColor();
c3.gray.gray = 50;    // 0–100

// HSB
var c4 = new SolidColor();
c4.hsb.hue        = 30;    // 0–360
c4.hsb.saturation = 100;   // 0–100
c4.hsb.brightness = 100;   // 0–100

// Lab
var c5 = new SolidColor();
c5.lab.l = 50;   // 0–100
c5.lab.a = 20;   // -128–127
c5.lab.b = 40;   // -128–127

// Set as foreground color
app.foregroundColor = c;

// Use with selection fill
doc.selection.selectAll();
doc.selection.fill(c);
doc.selection.deselect();
```

---

## `Selection` — Selection Object

Access via `doc.selection`.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `bounds` | array | `[left, top, right, bottom]` bounding rectangle |
| `solid` | boolean | Whether selection is a solid rectangle |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `selectAll` | `()` | Select entire document |
| `deselect` | `()` | Remove selection |
| `invert` | `()` | Invert the selection |
| `select` | `(region, type, feather, antiAlias)` | Select polygon region. Region is array of `[x,y]` points. SelectionType: `REPLACE`, `ADD`, `SUBTRACT`, `INTERSECT` |
| `feather` | `(radius)` | Feather the selection edges |
| `contract` | `(radius)` | Contract (shrink) selection |
| `expand` | `(radius)` | Expand selection |
| `grow` | `(tolerance, antiAlias)` | Grow selection to similar adjacent pixels |
| `similar` | `(tolerance, antiAlias)` | Select similar pixels throughout document |
| `smooth` | `(radius)` | Smooth selection edges |
| `selectBorder` | `(width)` | Select only the border of the current selection |
| `resize` | `(widthPct, heightPct, anchor)` | Resize selection boundary |
| `rotate` | `(angle, anchor)` | Rotate selection boundary |
| `translate` | `(deltaX, deltaY)` | Move selection boundary |
| `fill` | `(fillWith, mode, opacity, preserveTransparency)` | Fill selection with color or content. fillWith is SolidColor or string |
| `stroke` | `(strokeColor, width, location, mode, opacity, preserveTransparency)` | Stroke selection border. StrokeLocation: `INSIDE`, `OUTSIDE`, `CENTER` |
| `copy` | `(merged)` | Copy selection to clipboard |
| `cut` | `()` | Cut selection to clipboard |
| `clear` | `()` | Delete selection content |
| `load` | `(from, type, invert)` | Load selection from channel |
| `store` | `(into, type)` | Save selection as channel |
| `makeWorkPath` | `(tolerance)` | Convert to work path |

**Practical examples:**
```js
var sel = doc.selection;

// Rectangle select (top-left to bottom-right)
sel.select([[0,0],[500,0],[500,300],[0,300]]);

// Select all
sel.selectAll();

// Add to existing selection
sel.select([[600,0],[900,0],[900,300],[600,300]], SelectionType.ADD);

// Feather 10px
sel.feather(10);

// Contract by 5px
sel.contract(5);

// Fill with red
var red = new SolidColor();
red.rgb.red = 255; red.rgb.green = 0; red.rgb.blue = 0;
sel.fill(red);

// Stroke selection with black, 3px, inside
var black = new SolidColor();
black.rgb.hexValue = "000000";
sel.stroke(black, 3, StrokeLocation.INSIDE);

// Copy, paste as new layer
sel.copy();
doc.paste();

// Invert and delete (remove background)
sel.invert();
sel.clear();
sel.deselect();
```

---

## `BlendMode` Enum — All Values

Used in `layer.blendMode` (string form in Photopea) and `BlendMode` constant (standard):

| `BlendMode` Constant | Photopea String | Name |
|----------------------|-----------------|------|
| `BlendMode.NORMAL` | `"norm"` | Normal |
| `BlendMode.DISSOLVE` | `"diss"` | Dissolve |
| `BlendMode.DARKEN` | `"dark"` | Darken |
| `BlendMode.MULTIPLY` | `"mul "` | Multiply |
| `BlendMode.COLORBURN` | `"idiv"` | Color Burn |
| `BlendMode.LINEARBURN` | `"lbrn"` | Linear Burn |
| `BlendMode.DARKERCOLOR` | `"dkCl"` | Darker Color |
| `BlendMode.LIGHTEN` | `"lite"` | Lighten |
| `BlendMode.SCREEN` | `"scrn"` | Screen |
| `BlendMode.COLORDODGE` | `"div "` | Color Dodge |
| `BlendMode.LINEARDODGE` | `"lddg"` | Linear Dodge (Add) |
| `BlendMode.LIGHTERCOLOR` | `"lgCl"` | Lighter Color |
| `BlendMode.OVERLAY` | `"over"` | Overlay |
| `BlendMode.SOFTLIGHT` | `"sLit"` | Soft Light |
| `BlendMode.HARDLIGHT` | `"hLit"` | Hard Light |
| `BlendMode.VIVIDLIGHT` | `"vLit"` | Vivid Light |
| `BlendMode.LINEARLIGHT` | `"lLit"` | Linear Light |
| `BlendMode.PINLIGHT` | `"pLit"` | Pin Light |
| `BlendMode.HARDMIX` | `"hMix"` | Hard Mix |
| `BlendMode.DIFFERENCE` | `"diff"` | Difference |
| `BlendMode.EXCLUSION` | `"smud"` | Exclusion |
| `BlendMode.SUBTRACT` | `"fsub"` | Subtract |
| `BlendMode.DIVIDE` | `"fdiv"` | Divide |
| `BlendMode.HUE` | `"hue "` | Hue |
| `BlendMode.SATURATION` | `"sat "` | Saturation |
| `BlendMode.COLOR` | `"colr"` | Color |
| `BlendMode.LUMINOSITY` | `"lum "` | Luminosity |
| `BlendMode.PASSTHROUGH` | `"pass"` | Pass Through (groups only) |

```js
// Use either form:
layer.blendMode = BlendMode.SCREEN;     // constant
layer.blendMode = "scrn";               // string (Photopea internal form)
```

---

## `LayerKind` Enum

| Constant | Description |
|----------|-------------|
| `LayerKind.NORMAL` | Regular pixel layer |
| `LayerKind.TEXT` | Text layer |
| `LayerKind.SMARTOBJECT` | Smart Object / linked layer |
| `LayerKind.SOLIDFILL` | Solid color fill layer |
| `LayerKind.GRADIENTFILL` | Gradient fill layer |
| `LayerKind.PATTERNFILL` | Pattern fill layer |
| `LayerKind.BRIGHTNESSCONTRAST` | Brightness/Contrast adjustment layer |
| `LayerKind.CURVES` | Curves adjustment layer |
| `LayerKind.LEVELS` | Levels adjustment layer |
| `LayerKind.HUESATURATION` | Hue/Saturation adjustment layer |
| `LayerKind.COLORBALANCE` | Color Balance adjustment layer |
| `LayerKind.CHANNELMIXER` | Channel Mixer adjustment layer |
| `LayerKind.GRADIENTMAP` | Gradient Map adjustment layer |
| `LayerKind.INVERSION` | Invert adjustment layer |
| `LayerKind.POSTERIZE` | Posterize adjustment layer |
| `LayerKind.THRESHOLD` | Threshold adjustment layer |
| `LayerKind.SELECTIVECOLOR` | Selective Color adjustment layer |
| `LayerKind.PHOTOFILTER` | Photo Filter adjustment layer |
| `LayerKind.EXPOSURE` | Exposure adjustment layer |
| `LayerKind.VIBRANCE` | Vibrance adjustment layer |
| `LayerKind.COLORLOOKUP` | Color Lookup adjustment layer |
| `LayerKind.LAYER3D` | 3D layer (not generally useful in Photopea) |
| `LayerKind.VIDEO` | Video layer |

```js
// Identify layer type
var layer = doc.activeLayer;
if (layer.kind === LayerKind.TEXT)         /* text layer */;
if (layer.kind === LayerKind.SMARTOBJECT)  /* smart object */;
if (layer.typename === "LayerSet")         /* group */;

// Filter: collect all text layers recursively
var textLayers = [];
function collectText(parent) {
  for (var i = 0; i < parent.layers.length; i++) {
    var l = parent.layers[i];
    if (l.typename === "LayerSet") collectText(l);
    else if (l.kind === LayerKind.TEXT) textLayers.push(l);
  }
}
collectText(doc);
```

---

## `AnchorPosition` Enum

| Constant | Position |
|----------|----------|
| `AnchorPosition.TOPLEFT` | Top left |
| `AnchorPosition.TOPCENTER` | Top center |
| `AnchorPosition.TOPRIGHT` | Top right |
| `AnchorPosition.MIDDLELEFT` | Middle left |
| `AnchorPosition.MIDDLECENTER` | Center |
| `AnchorPosition.MIDDLERIGHT` | Middle right |
| `AnchorPosition.BOTTOMLEFT` | Bottom left |
| `AnchorPosition.BOTTOMCENTER` | Bottom center |
| `AnchorPosition.BOTTOMRIGHT` | Bottom right |

---

## `ElementPlacement` Enum

Used with `layer.move(relativeObject, placement)`:

| Constant | Effect |
|----------|--------|
| `ElementPlacement.PLACEBEFORE` | Above the target layer in the panel |
| `ElementPlacement.PLACEAFTER` | Below the target layer in the panel |
| `ElementPlacement.PLACEATBEGINNING` | Top of the layer stack |
| `ElementPlacement.PLACEATEND` | Bottom of the layer stack |
| `ElementPlacement.INSIDE` | Into a LayerSet (makes layer a child) |

---

## `ResampleMethod` Enum

Used with `doc.resizeImage()`:

| Constant | Description |
|----------|-------------|
| `ResampleMethod.BICUBIC` | High quality, good for smooth gradients |
| `ResampleMethod.BICUBICSHARPER` | Best for reduction |
| `ResampleMethod.BICUBICSMOOTHER` | Best for enlargement |
| `ResampleMethod.BILINEAR` | Medium quality |
| `ResampleMethod.NEARESTNEIGHBOR` | No anti-aliasing, fastest |
| `ResampleMethod.NONE` | No resampling (change resolution only) |

---

## `SaveOptions` Enum

Used with `doc.close(saveOption)`:

| Constant | Meaning |
|----------|---------|
| `SaveOptions.DONOTSAVECHANGES` | Discard all changes and close |
| `SaveOptions.SAVECHANGES` | Save then close |
| `SaveOptions.PROMPTTOSAVECHANGES` | Show dialog (may block in headless) |

---

## `ExportOptionsSaveForWeb` — Export to Filesystem

Used with `doc.exportDocument()` to write files that Photopea packages into a ZIP.

```js
// Export PNG
var pngOpts = new ExportOptionsSaveForWeb();
pngOpts.format      = SaveDocumentType.PNG;
pngOpts.PNG8        = false;    // PNG-24
pngOpts.quality     = 100;
pngOpts.transparency = true;
doc.exportDocument(new File("/export.png"), ExportType.SAVEFORWEB, pngOpts);

// Export JPEG
var jpgOpts = new ExportOptionsSaveForWeb();
jpgOpts.format  = SaveDocumentType.JPEG;
jpgOpts.quality = 80;    // 0–100
doc.exportDocument(new File("/export.jpg"), ExportType.SAVEFORWEB, jpgOpts);

// Export GIF
var gifOpts = new ExportOptionsSaveForWeb();
gifOpts.format     = SaveDocumentType.GIF;
gifOpts.colors     = 256;
gifOpts.dither     = 100;
gifOpts.transparency = true;
doc.exportDocument(new File("/export.gif"), ExportType.SAVEFORWEB, gifOpts);
```

---

## `executeAction` — Advanced Operations

Used for operations not exposed in the standard DOM (adjustments applied as adjustment layers,
Smart Object editing, etc.). Takes the Photoshop Action Manager approach.

```js
// Open Smart Object for editing
var l = doc.layers.getByName("SmartObj");
doc.activeLayer = l;
executeAction(stringIDToTypeID("placedLayerEditContents"));
// Smart Object is now the active document
doc.activeLayer.rotate(90);
doc.save();
doc.close();

// Apply Hue/Saturation as destructive adjustment
var desc = new ActionDescriptor();
var list = new ActionList();
var channel = new ActionDescriptor();
channel.putEnumerated(stringIDToTypeID("presetKind"), stringIDToTypeID("presetKindType"), stringIDToTypeID("presetKindDefault"));
channel.putInteger(stringIDToTypeID("hue"),        20);   // hue shift
channel.putInteger(stringIDToTypeID("saturation"), 30);   // saturation
channel.putInteger(stringIDToTypeID("lightness"),  0);
list.putObject(stringIDToTypeID("hueSaturationAdjustmentV2Layer"), channel);
desc.putList(stringIDToTypeID("adjustment"), list);
executeAction(stringIDToTypeID("hueSaturation"), desc, DialogModes.NO);

// Select a layer by name using AM
function selectLayerByName(name) {
  var desc = new ActionDescriptor();
  var ref  = new ActionReference();
  ref.putName(charIDToTypeID("Lyr "), name);
  desc.putReference(charIDToTypeID("null"), ref);
  desc.putBoolean(charIDToTypeID("MkVs"), false);
  executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}
```

---

## Complete Practical Script Examples

### 1. Rename all text layers based on their contents
```js
app.preferences.rulerUnits = Units.PIXELS;
var doc = app.activeDocument;

function processLayers(parent) {
  for (var i = 0; i < parent.layers.length; i++) {
    var l = parent.layers[i];
    if (l.typename === "LayerSet") processLayers(l);
    else if (l.kind === LayerKind.TEXT) {
      l.name = l.textItem.contents.substring(0, 30);
    }
  }
}
processLayers(doc);
app.echoToOE("done");
```

### 2. Export each layer as a separate PNG
```js
app.preferences.rulerUnits = Units.PIXELS;
var doc = app.activeDocument;

for (var i = 0; i < doc.layers.length; i++) {
  // Hide all layers
  for (var j = 0; j < doc.layers.length; j++) doc.layers[j].visible = false;
  // Show only this layer
  doc.layers[i].visible = true;
  // Export
  var opts = new ExportOptionsSaveForWeb();
  opts.format  = SaveDocumentType.PNG;
  opts.PNG8    = false;
  opts.quality = 100;
  doc.exportDocument(
    new File("/" + doc.layers[i].name + ".png"),
    ExportType.SAVEFORWEB, opts
  );
}

// Restore visibility
for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = true;
```

### 3. Find and replace text across all text layers
```js
var searchText   = "2024";
var replaceText  = "2025";

function findReplaceText(parent) {
  for (var i = 0; i < parent.layers.length; i++) {
    var l = parent.layers[i];
    if (l.typename === "LayerSet") findReplaceText(l);
    else if (l.kind === LayerKind.TEXT) {
      var t = l.textItem;
      if (t.contents.indexOf(searchText) !== -1) {
        t.contents = t.contents.split(searchText).join(replaceText);
      }
    }
  }
}
findReplaceText(app.activeDocument);
app.echoToOE("Find & Replace complete");
```

### 4. Grid of duplicate layers
```js
app.preferences.rulerUnits = Units.PIXELS;
var doc   = app.activeDocument;
var layer = doc.activeLayer;
var cols  = 4, rows = 3;
var padX  = 20, padY = 20;
var w = layer.bounds[2] - layer.bounds[0];
var h = layer.bounds[3] - layer.bounds[1];

for (var r = 0; r < rows; r++) {
  for (var c = 0; c < cols; c++) {
    if (r === 0 && c === 0) continue; // skip original
    var copy = layer.duplicate();
    var targetX = layer.bounds[0] + c * (w + padX);
    var targetY = layer.bounds[1] + r * (h + padY);
    copy.translate(targetX - copy.bounds[0], targetY - copy.bounds[1]);
    copy.opacity = 100 - (r * cols + c) * 5;
  }
}
```

### 5. Apply watermark from URL
```js
app.preferences.rulerUnits = Units.PIXELS;
var doc = app.activeDocument;

// Open watermark as smart object layer
app.open("https://example.com/watermark.png", null, true);
var wm = doc.activeLayer;

// Resize to 20% of document width
var wmW = wm.bounds[2] - wm.bounds[0];
var targetW = doc.width * 0.2;
var scalePct = (targetW / wmW) * 100;
wm.resize(scalePct, scalePct, AnchorPosition.TOPLEFT);

// Move to bottom-right with 20px margin
var wmNewW = wm.bounds[2] - wm.bounds[0];
var wmNewH = wm.bounds[3] - wm.bounds[1];
wm.translate(
  doc.width  - wmNewW - 20 - wm.bounds[0],
  doc.height - wmNewH - 20 - wm.bounds[1]
);
wm.opacity = 60;
app.echoToOE("watermark applied");
```

### 6. Get all layer info as JSON
```js
function getLayerInfo(parent, depth) {
  depth = depth || 0;
  var result = [];
  for (var i = 0; i < parent.layers.length; i++) {
    var l = parent.layers[i];
    var info = {
      name:    l.name,
      type:    l.typename,
      visible: l.visible,
      opacity: l.opacity,
      depth:   depth
    };
    if (l.typename === "ArtLayer") {
      info.kind   = l.kind.toString();
      info.bounds = [l.bounds[0], l.bounds[1], l.bounds[2], l.bounds[3]];
      if (l.kind === LayerKind.TEXT) {
        info.text = l.textItem.contents;
        info.font = l.textItem.font;
        info.size = l.textItem.size;
      }
    } else if (l.typename === "LayerSet") {
      info.children = getLayerInfo(l, depth + 1);
    }
    result.push(info);
  }
  return result;
}
app.echoToOE(JSON.stringify(getLayerInfo(app.activeDocument)));
```

---

## Common Mistakes & Gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| `createEmbed` never resolves | Container has no size | Add `width` + `height` CSS to the container `<div>` |
| `runScript` returns `["done"]` with no data | No `echoToOE` in script | Add `app.echoToOE(value)` for anything you want back |
| `result[0]` is `"done"`, not the expected value | `echoToOE` not reached | Check script logic for early exit or errors |
| Images won't load (network error) | CORS | Server must respond with `Access-Control-Allow-Origin: *` |
| `openFromURL(url, true)` layer not ready | Async loading lag | Use `addImageAndWait` utility |
| `exportImage` only PNG/JPG | `exportImage` limitation | Use `runScript("saveToOE('webp:0.85')")` for other formats |
| Pixel coordinates behave unexpectedly | Wrong ruler units | Always set `app.preferences.rulerUnits = Units.PIXELS` first |
| Text `size` set but looks different | Wrong type units | Set `app.preferences.typeUnits = TypeUnits.PIXELS` |
| Layer not found by name | Wrong layer level | Layers are scoped; use recursive search for nested layers |
| `layer.bounds[0]` returns a UnitValue, not number | Ruler units issue | Force `Units.PIXELS` before reading bounds |
| Smart Object edit hangs | Missing `doc.save(); doc.close()` | Always save + close when done editing SO |
| React double-mount in dev | Strict Mode | Use `if (peaRef.current) return` guard in `useEffect` |

---

## Limitations

- This skill covers host-page integration patterns; it does not replace Photopea's own terms, API documentation, or licensing guidance.
- Remote URL loading depends on browser CORS behavior, network availability, and the user's Photopea account/session state.
- `runScript` executes scripts inside the embedded Photopea document context. Only run scripts you understand and only with user-approved files.
- Export behavior can vary by document size, browser memory limits, and the formats supported by the active Photopea runtime.

---

## Sources

- photopea.js: https://github.com/yikuansun/PhotopeaAPI
- npm: https://www.npmjs.com/package/photopea
- Photopea Live Messaging API: https://www.photopea.com/api/live
- Photopea Script reference: https://www.photopea.com/learn/scripts
- Photoshop JS Scripting reference (compatible): https://theiviaxx.github.io/photoshop-docs/Photoshop/index.html
- Plugin dev gists (addImageAndWait, getDocumentAsImage): https://gist.github.com/yikuansun/c0f1a602b4e9d4e344a41c4f49ded3bf

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

