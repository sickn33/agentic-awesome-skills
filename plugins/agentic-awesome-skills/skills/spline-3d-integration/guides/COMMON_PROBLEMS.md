# Common Problems & Debugging

These are the real-world issues that only surface after integration. Read this before finishing any Spline implementation.

---

## 🚨 Critical Gotchas (Will Break Your Site)

---

### 1. Scroll Hijacking — Page Won't Scroll

**What happens:** After adding Spline, the whole page stops scrolling. Users are stuck.

**Why:** Spline's auto-generated vanilla JS exports inject `overflow: hidden` into `<body>` CSS by default. This is baked into their generated code.

**Fix:**
```css
/* Add this to your CSS — overrides Spline's injection */
body {
  overflow: auto !important;
}
```

Or in Play Settings (Spline editor → Export → Play Settings), **disable "Page Scroll"** before generating the URL. This removes the overflow rule from the output.

**Also check:** If using the Runtime API and you embedded the generated `index.html` files, open them and manually remove the `overflow: hidden` line from the `<style>` block.

---

### 2. White Box Behind the 3D Scene

**What happens:** Your dark/transparent website has a white rectangle where the Spline scene is.

**Why:** The background color is set to white by default in Spline's export settings.

**Fix:**
1. In Spline editor → Export → Play Settings → toggle **Hide Background** ON
2. Click **Generate Draft** or **Promote to Production** — the URL does NOT auto-update with new settings
3. Copy the new URL

For the web component you can also override inline:
```html
<spline-viewer url="..." background="transparent"></spline-viewer>
```

---

### 3. Spline Scene Intermittently Fails to Load

**What happens:** Page loads fine sometimes, blank or broken other times. Feels random.

**Why:** The `prod.spline.design` CDN occasionally has latency or drops requests. There's no built-in retry or error handling.

**Fix — add a timeout fallback:**
```js
const TIMEOUT_MS = 8000;

const timeoutId = setTimeout(() => {
  // Spline didn't load in time — show fallback
  document.getElementById('spline-fallback').style.display = 'block';
  document.querySelector('.spline-wrapper').style.display = 'none';
}, TIMEOUT_MS);

// If using Runtime API, clear the timeout on successful load:
spline.load(sceneUrl).then(() => {
  clearTimeout(timeoutId);
});
```

**Long-term fix:** Download the `.splinecode` file and self-host it on your own CDN. This eliminates the third-party dependency entirely and also fixes CORS issues.

---

### 4. Scene Looks Fine on Mac, Lags on Everything Else

**What happens:** Buttery smooth on MacBook Pro or M-chip Mac. Completely broken — laggy, stuttering, sometimes crashing — on mid-range Windows laptops or Android phones.

**Why:** Spline uses WebGL which runs on the GPU. Apple Silicon Macs have exceptional GPU performance. Most Windows laptops and Android devices do not have dedicated GPUs.

**Fix — detect capability before loading:**
```js
function shouldLoadSpline() {
  const isMobile = window.innerWidth < 768;
  const isLowEnd = navigator.hardwareConcurrency <= 2;

  // Optional: test WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  const noWebGL = !gl;

  return !isMobile && !isLowEnd && !noWebGL;
}

if (shouldLoadSpline()) {
  loadSplineScene();
} else {
  showFallback();
}
```

---

### 5. Layout Shift — Page Jumps When Scene Loads

**What happens:** User sees the page layout, then everything shifts/jumps when the 3D scene loads in.

**Why:** The canvas has no reserved height before loading, so the browser doesn't know how much space to allocate. HTML renders → space collapses → scene loads → everything jumps. This tanks your CLS (Cumulative Layout Shift) Core Web Vitals score.

**Fix — pre-allocate space:**
```css
spline-viewer, canvas.spline-canvas {
  display: block;
  width: 100%;
  height: 100vh; /* or whatever your target height is */
  contain: strict; /* tells browser to reserve this space */
}
```

For `position: fixed` backgrounds this is less of an issue, but for inline scenes it's critical.

---

### 6. Rotation Values Are Radians, Not Degrees

**What happens:** You try to rotate an object to 90 degrees. It barely moves or spins wildly.

**Why:** Spline's runtime API uses **radians**, not degrees. 90 degrees = `Math.PI / 2`. 180 degrees = `Math.PI`.

**Fix:**
```js
// WRONG
obj.rotation.y = 90;

// CORRECT
obj.rotation.y = Math.PI / 2; // 90 degrees
obj.rotation.y = Math.PI;     // 180 degrees
obj.rotation.y = Math.PI * 2; // 360 degrees (full rotation)

// Helper function to use if you prefer degrees:
const toRad = (deg) => deg * (Math.PI / 180);
obj.rotation.y = toRad(90);
```

---

### 7. 3D Scene Blocks Clicks on Buttons / Links

**What happens:** Buttons, CTAs, or nav links that overlap with the Spline scene don't respond to clicks.

**Why:** The Spline canvas sits on top and captures all pointer events.

**Fix:** Add `pointer-events: none` to the Spline wrapper if it's decorative (no interaction needed):
```css
.spline-wrapper {
  pointer-events: none; /* scene won't capture any clicks */
}
```

If you need BOTH mouse interaction on the scene AND clickable content on top:
```css
.spline-wrapper {
  pointer-events: all; /* scene gets mouse events */
}

.content-overlay {
  position: relative;
  z-index: 10;
  pointer-events: all; /* content also gets mouse events */
}
```

Note: When both have `pointer-events: all`, the topmost element (by z-index) wins. Make sure your content div has a higher z-index than the Spline wrapper.

---

### 8. Spline Watermark Visible (Free Plan)

**What happens:** A small "Built with Spline" logo appears in the corner.

**Options:**

**Option A — Upgrade to a Spline paid plan.** Then in Export → Play Settings → toggle "Hide Spline Logo" ON.

**Option B — CSS overlay (free plan workaround):**
```css
/* Hides the watermark via CSS — targets the shadow DOM */
spline-viewer::part(logo) {
  display: none;
}

/* Fallback if the above doesn't work */
spline-viewer {
  --spline-viewer-logo-display: none;
}
```

Note: CSS-based hiding may break with Spline updates. The paid plan is the reliable solution.

---

### 9. CORS Error When Loading Scene

**What happens:** Scene fails to load with a CORS error in the console.

**Why:** Browser security blocks cross-origin requests in some environments (especially localhost dev servers with certain configurations).

**Fix — self-host the scene file:**
1. In Spline → Export → Code Export → click the download icon next to the URL
2. Download the `.splinecode` file
3. Host it on your own server or CDN (same origin as your site)
4. Update the URL in your embed code to point to your hosted version

---

### 10. Next.js Hydration Error

**What happens:** React hydration mismatch error in Next.js when the Spline component is included.

**Why:** Spline renders on the client only (it needs the browser's WebGL), but Next.js tries to render on the server too.

**Fix:**
```jsx
import dynamic from 'next/dynamic';

// ssr: false tells Next.js not to render this on the server
const Spline = dynamic(() => import('@splinetool/react-spline/next'), {
  ssr: false,
  loading: () => <div style={{ background: '#0a0a0a', height: '100vh' }} />
});
```

---

### 11. Scene URL Not Reflecting Latest Changes

**What happens:** You updated the scene in the Spline editor, but the embed still shows the old version.

**Why:** The `prod.spline.design` URL is a snapshot. It does **not** auto-update when you make changes.

**Fix:** Every time you make changes in the Spline editor, you must:
1. Go to Export → Code Export
2. Click **"Promote to Production"** (or "Generate Draft" for a new draft URL)
3. The existing prod URL will now serve the updated scene — no need to change the URL in your code

---

## Quick Diagnostic Table

| Symptom | Most Likely Cause | Fix |
|---|---|---|
| Page won't scroll | `overflow: hidden` injected by Spline | Add `body { overflow: auto !important }` or disable Page Scroll in Play Settings |
| White box behind scene | Background not hidden | Play Settings → Hide Background → regenerate URL |
| Loads sometimes, blank others | CDN flakiness | Add timeout fallback; consider self-hosting |
| Smooth on Mac, laggy elsewhere | GPU performance gap | Add hardware detection, skip on low-end |
| Page jumps on load | No reserved space (CLS) | Set explicit height on canvas/viewer element |
| Rotations look wrong | Degrees vs radians | Use `Math.PI / 180 * degrees` |
| Buttons not clickable | Canvas capturing pointer events | Add `pointer-events: none` to Spline wrapper |
| Watermark visible | Free plan | Upgrade or use CSS override |
| CORS error | Cross-origin loading | Self-host the `.splinecode` file |
| Hydration error (Next.js) | SSR conflict | Use `dynamic(() => import(...), { ssr: false })` |
| Old scene still showing | Didn't promote to production | Click "Promote to Production" in Spline editor |
