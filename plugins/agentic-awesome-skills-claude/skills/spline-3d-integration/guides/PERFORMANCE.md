# Performance & Mobile Optimization

Spline scenes are WebGL — they run on the GPU. A poorly optimized scene will tank your PageSpeed score, lag on mid-range devices, and drain mobile batteries. Treat them like video files, not images.

---

## Before You Even Integrate — Check Scene Size

**Tell the user to check their scene file size before giving you the URL.**

- Under ~3MB = generally fine
- 3–10MB = usable but optimize where possible
- Over 10MB = serious problem, needs optimization or a different approach
- Over 20MB = do not embed as live 3D — export as video instead

To check: in Spline editor → Export → Code Export → the file size is shown before generating the URL.

**If the scene is too heavy, tell the user to:**
1. In Export → Play Settings, set **Geometry Quality** to "Performance"
2. Reduce subdivision levels (1 is usually enough, max 2)
3. Delete objects that are hidden or never visible
4. Remove unused textures and images
5. Use fewer than 3 lights — prefer Matcap materials for reflective effects (fakes reflections without GPU cost)
6. Merge objects that share the same material

---

## Optimization Checklist (Pre-Integration)

Go through these before writing any embed code:

- [ ] Scene file size is under 10MB
- [ ] Geometry Quality set to "Performance" in Play Settings
- [ ] Background hidden if site has its own background color
- [ ] Disabled: Page Scroll, Zoom, Pan (in Play Settings) unless explicitly needed
- [ ] Max 1–2 Spline embeds on the page (never more than 3)
- [ ] Less than 3 lights in the scene
- [ ] No high-res textures unless essential

---

## Loading Strategy

### 1. Preload the scene file
Add to `<head>` to start fetching before scripts execute:
```html
<link rel="preload" href="https://prod.spline.design/REPLACE_ME/scene.splinecode" as="fetch" crossorigin>
```

### 2. Show a fallback while loading
Never leave users staring at a blank space. Always render a background color or static image as a placeholder:

```css
.spline-wrapper {
  background: #0a0a0a; /* your site's bg color — shows instantly */
  width: 100%;
  height: 100vh;
}
```

### 3. Lazy load (React)
Don't load Spline until it's needed:
```jsx
const Spline = lazy(() => import('@splinetool/react-spline'));
```

### 4. Intersection Observer (load only when visible)
For Spline scenes below the fold:
```js
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    loadSplineScene(); // only load when user scrolls to it
    observer.disconnect();
  }
});
observer.observe(document.getElementById('spline-section'));
```

---

## Mobile Strategy

Spline scenes are GPU-intensive. On mobile they:
- Drain battery quickly
- Lag on any device without a dedicated GPU
- Can cause the browser tab to crash on lower-end Android

**Always implement one of these strategies:**

### Option A — Skip entirely on mobile (recommended for hero backgrounds)
```js
if (window.innerWidth < 768) {
  // Don't load Spline — show static background instead
  document.querySelector('.spline-wrapper').style.background = 'url(fallback.jpg) center/cover';
}
```

### Option B — Hardware concurrency check
```js
// navigator.hardwareConcurrency = number of CPU cores
// Low core count = likely a low-end device
if (navigator.hardwareConcurrency <= 2 || window.innerWidth < 768) {
  // Skip Spline, use fallback
}
```

### Option C — Export as video for mobile
For decorative/non-interactive scenes: record the animation in Spline as MP4, serve that on mobile instead. Users get the visual, no GPU cost.

```js
const isMobile = window.innerWidth < 768;

if (isMobile) {
  // Show video
  document.getElementById('spline-video').style.display = 'block';
} else {
  // Load Spline
  loadSpline();
}
```

---

## Core Web Vitals (LCP / CLS)

Spline scenes are almost always the **Largest Contentful Paint** element, which means they directly affect your Google score.

### Preventing Layout Shift (CLS)
The canvas loads after HTML, causing the page to jump. Fix it by pre-allocating space:

```css
canvas#canvas3d {
  width: 100%;
  height: 100vh;
  /* This tells the browser to reserve this space before the scene loads */
  contain: strict;
}
```

Or for the web component:
```html
<spline-viewer
  url="..."
  style="width: 100%; height: 100vh; display: block;">
</spline-viewer>
```

### Lighthouse note
Lighthouse often cannot calculate a performance score at all when a Spline scene is the dominant above-the-fold element. This is a known Lighthouse limitation, not necessarily a site problem. Use WebPageTest or Chrome DevTools instead for real profiling.

---

## When NOT to Use a Live 3D Embed

Sometimes a Spline embed is the wrong tool. Use a video or GIF instead when:

- The animation doesn't respond to user input (no mouse tracking, no clicks)
- The scene file is over 15MB
- Your target audience is primarily mobile
- You need the page to score above 80 on PageSpeed

**How to export as video from Spline:**
In Spline editor → Export → Video → record your animation → compress with HandBrake → host on GitHub or a CDN → embed as `<video autoplay loop muted playsinline>`
