---
name: web-games
description: >-
  Web browser game development. Framework selection (Phaser, PixiJS, Kaplay,
  Canvas/WebGL, Three.js, Babylon.js), hybrid DOM+canvas, WebGPU, optimization,
  PWA, audio unlock. Use when building HTML5/WebGL/WebGPU games or choosing a
  browser runtime.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Web Browser Game Development

> Framework selection and browser-specific principles. For stack choice details see `game-development/engine-selection`.

---

## 1. Framework Selection

### Decision Tree

```
What type of game?
│
├── 2D Game
│   ├── Full game engine features? → Phaser 4
│   ├── Fast prototype / jam?      → Kaplay
│   ├── Raw rendering power?       → PixiJS 8
│   └── Tiny / no dependency?      → Raw Canvas / WebGL
│
├── 3D Game
│   ├── Full engine (physics, XR)? → Babylon.js
│   └── Rendering focused?         → Three.js
│
├── Hybrid (DOM UI + canvas moments)
│   └── Custom shell + guest viewport
│       (Canvas/Kaplay/Phaser/Pixi inside a region/modal)
│
└── Narrative-first
    └── Ink (inkjs) or Twine export + DOM host
```

### Comparison

| Framework | Type | Best For |
|-----------|------|----------|
| **Raw Canvas / WebGL** | 2D / low-level | Small scope, full control |
| **Kaplay** | 2D toolkit | Rapid prototypes |
| **Phaser 4** | 2D engine | Full game features |
| **PixiJS 8** | 2D renderer | Rendering, custom systems |
| **Three.js** | 3D renderer | Visualizations, lightweight 3D |
| **Babylon.js** | 3D engine | Full engine, XR |

### Hybrid shell + guest

Use when chrome is HTML (menus, inventories, text, dashboards) but bursts of play need a canvas:

1. Mount guest in a container; pass context in.
2. Run a **local** game loop in the guest.
3. Return results (score, pass/fail); **destroy** guest (RAF, listeners, GL context as needed).

Do not let the guest own global app routing unless the product *is* a full-screen game.

---

## 2. WebGPU Adoption

### Browser Support (2025)

| Browser | Support |
|---------|---------|
| Chrome | ✅ Since v113 |
| Edge | ✅ Since v113 |
| Firefox | ✅ Since v131 |
| Safari | ✅ Since 18.0 |
| **Total** | **~73%** global |

### Decision

- **New GPU-heavy projects:** WebGPU with WebGL fallback
- **Broad legacy / simple 2D:** WebGL or Canvas 2D is enough
- **Feature detection:** check `navigator.gpu`

---

## 3. Performance Principles

### Browser Constraints

| Constraint | Strategy |
|------------|----------|
| No local file access | Asset bundling, CDN |
| Tab throttling | Pause when hidden (`visibilitychange`) |
| Mobile data limits | Compress assets |
| Audio autoplay | Require user interaction |

### Optimization Priority

1. Asset compression (KTX2, Draco, WebP as relevant)
2. Lazy loading
3. Object pooling (avoid GC spikes)
4. Draw call batching
5. Web Workers for heavy compute

---

## 4. Asset Strategy

| Type | Format |
|------|--------|
| Textures | KTX2 + Basis Universal (or WebP/PNG for simple 2D) |
| Audio | WebM/Opus (fallback: MP3) |
| 3D Models | glTF + Draco/Meshopt |

| Phase | Load |
|-------|------|
| Startup | Core assets, keep first load small |
| Gameplay | Stream on demand |
| Background | Prefetch next level |

---

## 5. PWA for Games

**Benefits:** offline play, install, fullscreen, optional push.  
**Requirements:** service worker, web app manifest, HTTPS.

---

## 6. Audio Handling

- Create/resume `AudioContext` on first click/tap
- Prefer Web Audio API; pool sources; preload common SFX
- Compress with WebM/Opus when possible

---

## 7. Anti-Patterns

| Don't | Do |
|-------|-----|
| Load all assets upfront | Progressive loading |
| Ignore tab visibility | Pause when hidden |
| Block on audio load | Lazy load audio |
| Skip compression | Compress large assets |
| Assume fast connection | Handle slow networks |
| Leave canvas engines running off-screen | Tear down guests |

---

> **Remember:** Browser is the most accessible platform. Respect its constraints.

## When to Use

Use when building HTML5/WebGL/WebGPU games, choosing a browser runtime, or wiring hybrid DOM+canvas guests.

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
