---
name: photopea-embedded-editor
description: Embed Photopea in web apps using photopea.js. Covers embedding, file I/O, scripting, exporting, layers, text, filters, and the full Photoshop-compatible API.
risk: safe
source: community
source_repo: yikuansun/PhotopeaAPI
source_type: community
license: MIT
license_source: "https://github.com/yikuansun/PhotopeaAPI/blob/master/LICENSE"
date_added: 2026-05-20
---

# Photopea Embedded Editor Skill

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

Use this skill for **every task** that involves:
- Embedding Photopea as an image editor inside a webpage or web app
- Controlling an embedded Photopea instance from your JavaScript code
- Automating image editing workflows from a host page (open files, run scripts, export results)
- Building an image editing feature into your product using Photopea as the engine
- Writing scripts to manipulate documents, layers, text, selections, filters, colors, and paths

**Do NOT** use raw `postMessage` wiring — always use `photopea.js` as the wrapper.

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

## Limitations

- This skill covers host-page integration patterns; it does not replace Photopea's own terms, API documentation, or licensing guidance.
- Remote URL loading depends on browser CORS behavior, network availability, and the user's Photopea account/session state.
- `runScript` executes scripts inside the embedded Photopea document context. Only run scripts you understand and only with user-approved files.
- Serialize dynamic values with `JSON.stringify` before embedding them in a `runScript` string. Never concatenate user-provided URLs, layer names, or text directly into Photopea script source.
- Export behavior can vary by document size, browser memory limits, and the formats supported by the active Photopea runtime.

---
