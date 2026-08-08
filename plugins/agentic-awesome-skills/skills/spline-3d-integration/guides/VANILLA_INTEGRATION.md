# Vanilla JS / HTML Integration

Two methods depending on how much control you need.

---

## Method A — Web Component (Recommended for most cases)

No npm required. Just add to HTML. Supports lazy loading, transparent backgrounds, and mouse interactivity.

```html
<!-- In <head> — loads the web component -->
<script type="module" src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js"></script>

<!-- Basic embed -->
<spline-viewer url="https://prod.spline.design/REPLACE_ME/scene.splinecode"></spline-viewer>

<!-- With mouse-following interactivity (e.g. cursor-tracking robots) -->
<spline-viewer
  url="https://prod.spline.design/REPLACE_ME/scene.splinecode"
  events-target="global">
</spline-viewer>

<!-- Transparent background -->
<spline-viewer
  url="https://prod.spline.design/REPLACE_ME/scene.splinecode"
  background="transparent">
</spline-viewer>
```

---

## Method B — Runtime API (When you need programmatic control)

Use when you need to manipulate objects, trigger animations, or respond to events from your own JS.

Install:
```bash
npm install @splinetool/runtime
```

Or via CDN (no install):
```html
<script type="module">
  import { Application } from 'https://unpkg.com/@splinetool/runtime@latest/build/runtime.module.js';
  // ... rest of your code
</script>
```

Basic usage:
```js
import { Application } from '@splinetool/runtime';

const canvas = document.getElementById('canvas3d');
const spline = new Application(canvas);

spline.load('https://prod.spline.design/REPLACE_ME/scene.splinecode').then(() => {
  console.log('Scene loaded');
});
```

With object interaction:
```js
spline.load(sceneUrl).then(() => {
  const obj = spline.findObjectByName('Cube');
  // or by ID: spline.findObjectById('uuid-here')

  obj.position.x += 50;
  obj.rotation.y += Math.PI / 4; // NOTE: radians, NOT degrees
  obj.scale.x = 2;
});
```

With event listeners:
```js
spline.load(sceneUrl).then(() => {
  spline.addEventListener('mouseDown', (e) => {
    console.log('Clicked:', e.target.name);
  });
});
```

Trigger animations programmatically:
```js
spline.load(sceneUrl).then(() => {
  const obj = spline.findObjectByName('MyObject');
  obj.emitEvent('mouseHover');       // forward
  obj.emitEventReverse('mouseHover'); // reverse
});
```

---

## Full-Page Background Setup

The most common use case — Spline scene behind all content.

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      /* DO NOT add overflow: hidden here — it will break page scroll */
      position: relative;
    }

    .spline-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      /* pointer-events: none — use this if scene is decorative only */
      /* pointer-events: all — use this if you want mouse interaction */
      pointer-events: all;
    }

    .content {
      position: relative;
      z-index: 1;
      /* Make sure content elements don't get blocked by the 3D scene */
    }

    /* Fallback shown while Spline loads or if it fails */
    .spline-fallback {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
      background: #0a0a0a; /* match your site's base color */
      display: none; /* hidden by default, shown via JS if needed */
    }
  </style>
</head>
<body>
  <!-- Fallback (shown if Spline fails to load) -->
  <div class="spline-fallback" id="spline-fallback"></div>

  <!-- Spline background -->
  <div class="spline-bg">
    <spline-viewer
      url="https://prod.spline.design/REPLACE_ME/scene.splinecode"
      events-target="global"
      style="width:100%; height:100%;">
    </spline-viewer>
  </div>

  <!-- Your website content -->
  <div class="content">
    <h1>Your Content Here</h1>
  </div>

  <script>
    // Show fallback if Spline hasn't loaded after 8 seconds
    setTimeout(() => {
      const viewer = document.querySelector('spline-viewer');
      if (!viewer || !viewer.shadowRoot) {
        document.getElementById('spline-fallback').style.display = 'block';
      }
    }, 8000);

    // Skip Spline entirely on low-end mobile to save battery + performance
    if (window.innerWidth < 768 || navigator.hardwareConcurrency <= 2) {
      document.querySelector('.spline-bg').style.display = 'none';
      document.getElementById('spline-fallback').style.display = 'block';
    }
  </script>
</body>
</html>
```

---

## Available Event Types

| Event | Use case |
|---|---|
| `mouseDown` | Click/tap on object |
| `mouseUp` | Release after click |
| `mouseHover` | Cursor enters object area |
| `mousePress` | Holding click down |
| `keyDown` | Key pressed |
| `keyUp` | Key released |
| `start` | Scene has loaded and started |
| `scroll` | Page scrolled |

---

## Preloading (Reduces Perceived Load Time)

Add to `<head>` to start fetching the scene file before scripts run:

```html
<link rel="preload" href="https://prod.spline.design/REPLACE_ME/scene.splinecode" as="fetch" crossorigin>
```

See [PERFORMANCE.md](PERFORMANCE.md) for full optimization strategy.
See [COMMON_PROBLEMS.md](COMMON_PROBLEMS.md) for debugging.
