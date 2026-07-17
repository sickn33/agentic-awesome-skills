---
name: game-development
description: >-
  Game development orchestrator. Routes by platform, dimension, and engine fit
  (web 2D/3D, hybrid DOM+canvas, narrative tools). Use when starting or
  structuring a game project, choosing frameworks, or picking among Phaser,
  PixiJS, Kaplay, Canvas/WebGL, Three.js, Babylon.js, Godot, Unity, or Ink/Twine.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Game Development

> **Orchestrator skill** — principles plus routing to specialized sub-skills.

---

## When to Use This Skill

You are working on a game development project. This skill teaches PRINCIPLES and directs you to the right sub-skill based on context.

---

## Sub-Skill Routing

### Platform Selection

| If the game targets... | Use Sub-Skill |
|------------------------|---------------|
| Web browsers (HTML5, WebGL, WebGPU) | `game-development/web-games` |
| Mobile (iOS, Android) | `game-development/mobile-games` |
| PC (Steam, Desktop) | `game-development/pc-games` |
| VR/AR headsets | `game-development/vr-ar` |

### Dimension Selection

| If the game is... | Use Sub-Skill |
|-------------------|---------------|
| 2D (sprites, tilemaps) | `game-development/2d-games` |
| 3D (meshes, shaders) | `game-development/3d-games` |

### Architecture / tooling

| If you need... | Use Sub-Skill |
|----------------|---------------|
| Engine / framework choice, shell vs guest, fit tiers | `game-development/engine-selection` |
| GDD, balancing, player psychology | `game-development/game-design` |
| Multiplayer, networking | `game-development/multiplayer` |
| Visual style, asset pipeline, animation | `game-development/game-art` |
| Sound design, music, adaptive audio | `game-development/game-audio` |

---

## Core Principles (All Platforms)

### 1. The Game Loop

```
INPUT  → Read player actions
UPDATE → Process game logic (fixed timestep)
RENDER → Draw the frame (interpolated)
```

**Fixed Timestep Rule:**
- Physics/logic: Fixed rate (e.g., 50Hz)
- Rendering: As fast as possible
- Interpolate between states for smooth visuals

**Hybrid / UI-heavy games:** the outer app may be DOM/event-driven; use a classic game loop only in canvas/WebGL viewports (or wherever simulation ticks).

### 2. Pattern Selection Matrix

| Pattern | Use When | Example |
|---------|----------|---------|
| **State Machine** | 3–5 discrete states | Player: Idle→Walk→Jump |
| **Object Pooling** | Frequent spawn/destroy | Bullets, particles |
| **Observer/Events** | Cross-system communication | Health→UI updates |
| **ECS** | Thousands of similar entities | RTS units, particles |
| **Command** | Undo, replay, networking | Input recording |
| **Behavior Tree** | Complex AI decisions | Enemy AI |
| **Content-as-data** | Designers ship levels/events without code | JSON/YAML packs |

**Decision Rule:** Start with State Machine. Add ECS only when performance demands.

### 3. Input Abstraction

Abstract input into ACTIONS, not raw keys:

```
"jump"  → Space, Gamepad A, Touch tap
"move"  → WASD, Left stick, Virtual joystick
```

### 4. Performance Budget (60 FPS = 16.67ms)

| System | Budget |
|--------|--------|
| Input | 1ms |
| Physics | 3ms |
| AI | 2ms |
| Game Logic | 4ms |
| Rendering | 5ms |
| Buffer | 1.67ms |

**Optimization Priority:** Algorithm → Batching → Pooling → LOD → Culling.

### 5. AI Selection by Complexity

| AI Type | Complexity | Use When |
|---------|------------|----------|
| **FSM** | Simple | 3–5 states, predictable behavior |
| **Behavior Tree** | Medium | Modular, designer-friendly |
| **GOAP** | High | Emergent, planning-based |
| **Utility AI** | High | Scoring-based decisions |

### 6. Collision Strategy

| Type | Best For |
|------|----------|
| **AABB** | Rectangles, fast checks |
| **Circle** | Round objects, cheap |
| **Spatial Hash** | Many similar-sized objects |
| **Quadtree** | Large worlds, varying sizes |

---

## Anti-Patterns (Universal)

| Don't | Do |
|-------|-----|
| Update everything every frame | Use events, dirty flags |
| Create objects in hot loops | Object pooling |
| Cache nothing | Cache references |
| Optimize without profiling | Profile first |
| Mix input with logic | Abstract input layer |
| Pick an engine by hype | Match engine to genre + team + delivery target |

---

## Routing Examples

### “Browser 2D platformer”
→ `game-development/engine-selection` → `game-development/web-games` → `game-development/2d-games` → `game-development/game-design`

### “UI-heavy web game with small arcade challenges”
→ `game-development/engine-selection` (shell vs guest) → `game-development/web-games` → `game-development/2d-games` for guests only

### “Mobile puzzle”
→ `game-development/mobile-games` → `game-development/game-design`

### “Multiplayer VR shooter”
→ `game-development/vr-ar` → `game-development/3d-games` → `game-development/multiplayer`

### “Branching narrative with light stats”
→ `game-development/engine-selection` (Ink/Twine) → host UI of your choice

---

> **Remember:** Great games come from iteration, not perfection. Prototype fast, then polish.

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
