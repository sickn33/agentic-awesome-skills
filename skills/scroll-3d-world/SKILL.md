---
name: scroll-3d-world
description: "Build a scroll-scrubbed Three.js fly-through landing page: one continuous camera path through diorama scenes, with no AI video, no seams and no render credits."
category: frontend
risk: critical
source: self
source_type: self
license: MIT
date_added: "2026-11-16"
author: instax-dutta
tags: [threejs, landing-page, scroll-animation, webgl, diorama, camera-path]
---

# scroll-3d-world

## Overview

Build a landing page where scroll drives a camera flying through one continuous
3D world: out of each scene, into the next, with no cuts and no visible seams.
Everything is real geometry rendered live in the browser with Three.js.

The paid alternative chains AI-generated video clips and must frame-lock every
seam. One continuous camera path removes the seam problem entirely: the page is
resolution-independent, editable in seconds, and costs nothing to re-render. It
runs on an ordinary laptop, including low-VRAM machines.

What carries over from the video approach is the choreography and pacing
discipline, plus copy-first section design. What is replaced is the asset pipeline:
dioramas are built with code.

Nothing here assumes a framework. The engine is a self-contained ES module that
mounts into a container, so plain HTML, Next.js and Vue all work.

## When to Use

- The user wants a 3D world hero, a scroll cinematic, a diorama landing page, an
  isometric scroll-through world, or a "fly through the industry" page.
- The user asks for a scroll-world or Higgsfield-style page without paying for AI
  video credits.
- The user wants a WebGL or Three.js landing page whose camera follows scroll.

Use a plain motion or GSAP skill for section-level animation without a 3D world,
and a video skill when the deliverable must be a video file rather than a page.

## Prerequisites

Three.js r160 or newer; the reference template uses an import map against a CDN
build, and a bundled project just installs `three`. No other runtime dependency.

For QA, a headless browser (Playwright or Puppeteer with Chromium) to screenshot
each section and check the flight. Optional upgrades: Blender for GLB scenes, and
AI stills used only as backdrops.

Write access to the user's project. Nothing is published or deployed by this
skill.

## How It Works

### 1. Interview the subject

Ask the subject as an open question in plain prose. A made-up multiple-choice list
biases the answer. Capture the subject and one-line pitch, a brand kit (4-6 named
hex values, a display name, a tone), an art direction (default: soft matte
low-poly clay diorama, isometric, warm light) and the ordered sections the camera
flies through. Four to seven sections works; each needs a short scene description,
an eyebrow, a headline, one line of body and up to three tag pills.

No mobile question is needed: the world is resolution-independent and the engine
hardens touch behaviour by default. Say that when asked.

### 2. Lay out one world on one spine

The feel comes from the flight, not the geometry. Place scene pods along a line or
gentle arc, spaced three to four pod radii apart: closer reads as one blob, farther
reads as empty air. Each pod carries position, radius and height, which the engine
turns into camera waypoints. Vary height and elevation slightly for terrain
interest.

Camera grammar per section: approach high and outside looking down (the
establishing shot), settle at eye height in front of the subject, dwell while the
copy peaks, then depart in free air toward the next approach. The departure of one
section is the approach of the next; that single rule is what makes the take feel
continuous.

Pacing knobs per section: `scroll` (viewport heights consumed, default 1.5, more
for the hero and finale) and `linger` (0-0.4, default around 0.3, how long the
camera rests at the settle). Keep linger under 0.4 or the page feels sticky. Scroll
plays the flight in reverse for free, so keep waypoints in free air and pacing
smooth.

### 3. Build the dioramas

Fully procedural by default, so a world needs zero asset files. The rules that
carry every scene:

- Three to five palette colours per pod plus one light neutral. More reads as
  noise.
- One material recipe for the whole world: roughness around 0.9, flat shading, no
  metalness. That is the clay look.
- One light setup for the whole world. Per-pod lights are how worlds lose
  cohesion.
- Fog tuned to world scale so far pods fade instead of popping.
- Fake blob shadows by default; real shadow maps are an optional upgrade with a
  frame cost.
- Big simple shapes, the focal subject framed with clearance from the settle
  point, silhouette readable from the approach angle, one or two foreground
  elements for parallax.

Optional upgrades: a Blender-made GLB per pod, an AI still as a backdrop, or a
React Three Fiber port when the project is React.

### 4. Wire the engine

Mount the engine into a container with a config of brand, hint and world settings:
sky, fog, ground, palette, shadows, and the sections array. Each section carries
id, label, accent, copy, tags, call to action, scroll and linger values, the pod
geometry, optional waypoint overrides, an optional model path, and a `build`
function that receives the kit helpers (box, cylinder, sphere, cone, ring, torus,
group, ground, blob, loadGLB). Helpers add to that section's pod, so a scene is a
few lines.

The engine owns the single arc-length-parameterised camera curve, the scroll to
arc mapping with per-section dwell warps, copy panels that fade in, peak and fade
out, the route rail, progress bar, drift particles, reduced-motion fallback,
touch hardening, and a debug hook for QA.

For a non-JS backend, serve the engine plus Three.js and drop one module script
into the rendered HTML.

### 5. QA the flight (do not skip)

In a headless browser, check: framing at each settle point, forward and backward
continuity with no visible hitch, a clean console with a low draw-call count, a
phone viewport with no horizontal scroll and copy clearing the UI, a
`prefers-reduced-motion` pass that shows a static hero with a working call to
action, and one WebGL context with no layout thrash on scroll.

### 6. Common failures

- Camera inside geometry: waypoints belong in free air; if a scene needs an
  interior, open the model in cross-section instead of threading a doorway.
- Jerky flight: sharp waypoint overrides or too much linger. Reduce linger, spread
  waypoints along the spine, and keep the engine's smoothing.
- Looks empty: fix with fog, big soft shapes and dust, not more geometry.
- Pods that do not match: mixed material recipes or extra lights.
- Slow on phones: real shadows off, pixel-ratio clamp, lower segment counts, no
  postprocessing.

## Examples

```text
User request: "A scroll page for my bubble tea brand, from leaf to last sip."
Inputs: brand palette of five hex values, no site URL, five-section journey.
Expected result (illustrative):
  Sections: tea hills, pearl kitchen, flagship shop, delivery, hero cup.
  One camera spine through five pods 3.5 radii apart, linger 0.3, scroll 1.5 with
  2.5 on the hero and finale.
  Procedural clay dioramas, fake shadows, fog far at world scale.
  QA: five settle screenshots framed cleanly, forward and reverse smooth, phone
  viewport clear, reduced motion static with a working CTA.
```

## Limitations

- It produces a page, not a video file. If the deliverable must be an MP4 for
  social, this is the wrong route and the trade should be stated plainly.
- The engine and template live in the upstream repository and are not bundled with
  this skill; without them, the choreography rules still apply but the wiring must
  be written.
- Procedural dioramas look stylised. Photoreal scenes need assets and a much
  larger triangle budget than the low-poly target.
- Very old mobile GPUs may still stutter with fog, particles and many pods.
- Reduced motion removes the scroll effect, so the copy must stand alone.

## Safety and side effects

Writes HTML, JavaScript and asset files into the user's project and may add a
Three.js dependency. No deployment, no network calls beyond fetching the library
or a model file. If a site URL is provided for brand extraction, it is read only.
Bundled model files can be large; keep them in the project's asset directory and
do not commit them blindly.

## Sources and related skills

- Three.js: <https://threejs.org>
- Upstream repository, including the engine, the template and the diorama kit:
  <https://github.com/instax-dutta/scroll-3d-world>
- Pair with `brand-vibes` when the palette and type should come from a real design
  language.
