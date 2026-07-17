---
name: engine-selection
description: >-
  Selects game engines and frameworks by platform, genre, and architecture
  (full canvas shell vs hybrid DOM shell + guest viewport). Covers Phaser,
  PixiJS, Kaplay, Canvas/WebGL, Three.js, Babylon.js, Godot, Unity, Ink, Twine.
  Use when choosing a stack or comparing runtimes before implementation.
risk: unknown
source: community
date_added: "2026-07-17"
---

# Engine selection

> Pick tools that match **delivery target**, **interaction model**, and **team constraints**. Engines serve the game type — not the reverse.

---

## Fit questions (ask first)

1. **Platform:** Web, mobile, PC, console, VR?
2. **Primary loop:** Action/physics, turn-based, narrative branch, management/UI, hybrid?
3. **Presentation:** Full-screen canvas, DOM/UI chrome, or both?
4. **Toolchain:** No-build / ESM OK, or bundler + editor OK?
5. **Authoring:** Code-only, or designers need Twine/Ink/Godot/Unity editors?

---

## Architecture patterns

| Pattern | When | Notes |
|---------|------|-------|
| **Full engine shell** | Game *is* the canvas/scene | Phaser, Godot, Unity, Kaplay as app root |
| **Renderer + custom logic** | You want draw power, own gameplay | PixiJS, Three.js + your systems |
| **Hybrid shell + guest** | Dense UI/text + occasional skill-checks | DOM/app shell; mount canvas engines in modals/viewports only |
| **Narrative runtime** | Branching prose is the product | Ink, Twine; host chrome separately |
| **Content-as-data** | Levels/events authored as packs | JSON/YAML + thin loader; engine optional |

---

## Web — decision tree

```
What type of game?
│
├── Mostly DOM / panels / forms / text UI
│   ├── + small arcade/spatial challenges
│   │     └── Hybrid: custom shell + guest
│   │         Raw Canvas/WebGL → Kaplay → Phaser → PixiJS
│   └── + branching story
│         └── Ink (inkjs) or Twine export → host in DOM
│
├── Full-screen 2D game
│   ├── Full gameplay features (scenes, physics, input)
│   │     └── Phaser 4  (or Kaplay if you want lighter/faster prototype)
│   └── Mostly rendering / custom systems
│         └── PixiJS 8  (or Raw Canvas/WebGL if tiny scope)
│
└── Full-screen 3D game
    ├── Full engine / physics / XR
    │     └── Babylon.js
    └── Rendering-focused / lighter
          └── Three.js
```

---

## Quick comparison (web & common exports)

| Tool | Type | Best for | Watch-outs |
|------|------|----------|------------|
| **Raw Canvas / WebGL** | 2D/low-level | Tiny games, learning, no framework tax | You own everything |
| **Kaplay** (ex-Kaboom) | 2D toolkit | Fast prototypes, jam games | Less “full product” structure than Phaser |
| **Phaser 4** | 2D engine | Complete 2D features | Heavier; often bundled |
| **PixiJS 8** | 2D renderer | Performance, custom game code | Not a full gameplay framework alone |
| **Three.js** | 3D renderer | Visuals, lightweight 3D | You add gameplay systems |
| **Babylon.js** | 3D engine | Fuller 3D + XR | Heavier than Three for simple scenes |
| **Ink + inkjs** | Narrative | Complex branching prose | Weak for real-time multi-entity sims |
| **Twine / Twison / TweeJS** | Narrative | Educator-friendly branches | Export/host glue; not a physics engine |
| **Godot 4** | Full engine | 2D/3D indie, open source | Web export iteration cost |
| **Unity** | Full engine | Large teams, multi-platform | Heavy for simple web UI games |

Editor-first web shells (**Construct**, **GDevelop**) fit visual prototyping; weaker when you need versioned code-first content pipelines.

---

## Non-web defaults (see also platform skills)

| Target | Lean toward |
|--------|-------------|
| PC indie / open source | Godot 4 |
| PC large team / multi-platform | Unity |
| Mobile | See `game-development/mobile-games` (touch, stores, battery) |
| VR/AR | See `game-development/vr-ar` (+ Babylon/Three on web) |

---

## Anti-patterns

| Don't | Do |
|-------|-----|
| Choose Unity/Godot for a form-heavy browser tool | Prefer DOM/hybrid |
| Force Ink to run real-time concurrent simulations | Use narrative tools for branches; custom/sim code for clocks & entities |
| Drop Phaser into a page as “the whole app” when UI is HTML | Hybrid guest viewport |
| Optimize for WebGPU on day one | Ship WebGL; add WebGPU + fallback when needed |

## When to Use

Use when choosing or comparing game engines/frameworks before implementation, especially for hybrid DOM+canvas or narrative-first products.

## Limitations

- Does not replace platform skills (`game-development/web-games`, `game-development/pc-games`, …).
- Final choice still depends on team skill and shipping constraints.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
