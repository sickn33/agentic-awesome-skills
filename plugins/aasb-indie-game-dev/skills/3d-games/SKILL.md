---
name: 3d-games
description: 3D game development principles. Rendering, shaders, physics, cameras.
metadata:
  aas-risk: none
  aas-source: community
  aas-date-added: '2026-02-27'
---

# 3D Game Development

> Principles for 3D game systems.

---

## 1. Rendering Pipeline

### Stages

```
1. Vertex Processing → Transform geometry
2. Rasterization → Convert to pixels
3. Fragment Processing → Color pixels
4. Output → To screen
```

### Optimization Principles

| Technique | Purpose |
|-----------|---------|
| **Frustum culling** | Don't render off-screen |
| **Occlusion culling** | Don't render hidden |
| **LOD** | Less detail at distance |
| **Batching** | Combine draw calls |

---

## 2. Shader Principles

### Shader Types

| Type | Purpose |
|------|---------|
| **Vertex** | Position, normals |
| **Fragment/Pixel** | Color, lighting |
| **Compute** | General computation |

### When to Write Custom Shaders

- Special effects (water, fire, portals)
- Stylized rendering (toon, sketch)
- Performance optimization
- Unique visual identity

---

## 3. 3D Physics

### Collision Shapes

| Shape | Use Case |
|-------|----------|
| **Box** | Buildings, crates |
| **Sphere** | Balls, quick checks |
| **Capsule** | Characters |
| **Mesh** | Terrain (expensive) |

### Principles

- Simple colliders, complex visuals
- Layer-based filtering
- Raycasting for line-of-sight

---

## 4. Camera Systems

### Camera Types

| Type | Use |
|------|-----|
| **Third-person** | Action, adventure |
| **First-person** | Immersive, FPS |
| **Isometric** | Strategy, RPG |
| **Orbital** | Inspection, editors |

### Camera Feel

- Frame-rate-independent smoothing; test camera collision and teleports
- Collision avoidance
- Look-ahead for movement
- FOV changes for speed

---

## 5. Lighting

### Light Types

| Type | Use |
|------|-----|
| **Directional** | Sun, moon |
| **Point** | Lamps, torches |
| **Spot** | Flashlight, stage |
| **Ambient** | Base illumination |

### Performance Consideration

- Real-time shadows are expensive
- Bake when possible
- Shadow cascades for large worlds

---

## 6. Level of Detail (LOD)

### LOD Strategy

| Distance | Model |
|----------|-------|
| Near | Full detail |
| Medium | Reduced detail based on measured visual error |
| Far | Low-detail mesh or billboard when visually appropriate |

---

## 7. Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Mesh colliders everywhere | Simple shapes |
| Real-time shadows on mobile | Baked or blob shadows |
| One LOD for all distances | Distance-based LOD |
| Unoptimized shaders | Profile and simplify |

---

> **Remember:** 3D is about illusion. Create the impression of detail, not the detail itself.

## When to Use
Use when implementing or profiling a 3D rendering pipeline, shaders, colliders, cameras, lighting or level-of-detail transitions.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Verification

Treat tables as design starting points, not guarantees. Prototype the selected mechanic, test accessibility and recovery paths, and measure frame timing, memory and behavior on target hardware before claiming completion. Store submission and licensing requirements must be checked against current official platform documentation.
