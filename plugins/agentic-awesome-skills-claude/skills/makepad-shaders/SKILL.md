---
name: makepad-shaders
description: |
  CRITICAL: Use for Makepad shader system. Triggers on:
  makepad shader, makepad draw_bg, Sdf2d, makepad pixel,
  makepad glsl, makepad sdf, draw_quad, makepad gpu,
  makepad 着色器, makepad shader 语法, makepad 绘制
risk: unknown
source: community
---

# Makepad Shaders Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-01-19
>
> Check for updates: https://crates.io/crates/makepad-widgets

You are an expert at Makepad shaders. Help users by:
- **Writing code**: Generate shader code following the patterns below
- **Answering questions**: Explain shader language, Sdf2d, built-in functions

## When to Use
- You need to write or debug Makepad shader code, custom drawing, or SDF-based visuals.
- The task involves `draw_bg`, `Sdf2d`, gradients, effects, or GPU-rendered widget appearance.
- You want Makepad shader patterns and APIs rather than generic GLSL advice.

## Documentation

Refer to the local files for detailed documentation:
- `./references/shader-basics.md` - Shader language fundamentals
- `./references/sdf2d-reference.md` - Complete Sdf2d API reference

## Advanced Patterns

For production-ready shader patterns, see the `_base/` directory:

| Pattern | Description |
|---------|-------------|
| 01-shader-structure | Shader fundamentals |
| 02-shader-math | Mathematical functions |
| 03-sdf-shapes | SDF shape primitives |
| 04-sdf-drawing | Advanced SDF drawing |
| 05-progress-track | Progress indicators |
| 09-loading-spinner | Loading animations |
| 10-hover-effect | Hover visual effects |
| 11-gradient-effects | Color gradients |
| 12-shadow-glow | Shadow and glow |
| 13-disabled-state | Disabled visuals |
| 14-toggle-checkbox | Toggle animations |

Community contributions: `./community/`

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "本地文档不完整，建议运行 `/sync-crate-skills makepad --force` 更新文档"
   - Still answer based on SKILL.md patterns + built-in knowledge
3. If reference file exists, incorporate its content into the answer

## Key Patterns

### 1. Basic Custom Shader

```rust
<View> {
    show_bg: true
    draw_bg: {
        // Shader uniforms
        color: #FF0000

        // Custom pixel shader
        fn pixel(self) -> vec4 {
            return self.color;
        }
    }
}
```

### 2. Rounded Rectangle with Border

```rust
<View> {
    show_bg: true
    draw_bg: {
        color: #333333
        border_color: #666666
        border_radius: 8.0
        border_size: 1.0

        fn pixel(self) -> vec4 {
            let sdf = Sdf2d::viewport(self.pos * self.rect_size);
            sdf.box(1.0, 1.0,
                    self.rect_size.x - 2.0,
                    self.rect_size.y - 2.0,
                    self.border_radius);
            sdf.fill_keep(self.color);
            sdf.stroke(self.border_color, self.border_size);
            return sdf.result;
        }
    }
}
```

### 3. Gradient Background

```rust
<View> {
    show_bg: true
    draw_bg: {
        color: #FF0000
        color_2: #0000FF

        fn pixel(self) -> vec4 {
            let t = self.pos.x;  // Horizontal gradient
            return mix(self.color, self.color_2, t);
        }
    }
}
```

### 4. Circle Shape

```rust
<View> {
    show_bg: true
    draw_bg: {
        color: #0066CC

        fn pixel(self) -> vec4 {
            let sdf = Sdf2d::viewport(self.pos * self.rect_size);
            let center = self.rect_size * 0.5;
            let radius = min(center.x, center.y) - 1.0;
            sdf.circle(center.x, center.y, radius);
            sdf.fill(self.color);
            return sdf.result;
        }
    }
}
```

## Shader Structure

| Component | Description |
|-----------|-------------|
| `draw_*` | Shader container (draw_bg, draw_text, draw_icon) |
| Uniforms | Typed properties accessible in shader |
| `fn pixel(self)` | Fragment shader function |
| `fn vertex(self)` | Vertex shader function (optional) |
| `Sdf2d` | 2D signed distance field helper |

## Built-in Variables

| Variable | Type | Description |
|----------|------|-------------|
| `self.pos` | vec2 | Normalized position (0-1) |
| `self.rect_size` | vec2 | Widget size in pixels |
| `self.rect_pos` | vec2 | Widget position |

## Sdf2d Quick Reference

| Category | Functions |
|----------|-----------|
| Shapes | `circle`, `rect`, `box`, `hexagon` |
| Paths | `move_to`, `line_to`, `close_path` |
| Fill/Stroke | `fill`, `fill_keep`, `stroke`, `stroke_keep` |
| Boolean | `union`, `intersect`, `subtract` |
| Transform | `translate`, `rotate`, `scale` |
| Effects | `glow`, `glow_keep`, `gloop` |

## Built-in Functions (GLSL)

| Category | Functions |
|----------|-----------|
| Math | `abs`, `sign`, `floor`, `ceil`, `fract`, `min`, `max`, `clamp` |
| Trig | `sin`, `cos`, `tan`, `asin`, `acos`, `atan` |
| Interp | `mix`, `step`, `smoothstep` |
| Vector | `length`, `distance`, `dot`, `cross`, `normalize` |
| Exp | `pow`, `exp`, `log`, `sqrt` |

## When Writing Code

1. Always use `show_bg: true` to enable background shader
2. Use `Sdf2d::viewport()` to create SDF context
3. Return `vec4` (RGBA) from `fn pixel()`
4. Uniforms must be declared before shader functions
5. Use `self.` prefix to access uniforms and built-ins

## When Answering Questions

1. Makepad shaders use Rust-like syntax, compiled to GPU code
2. Every widget can have custom shaders (draw_bg, draw_text, etc.)
3. Shaders are live-reloaded - edit and see changes instantly
4. Sdf2d is the primary tool for 2D shape rendering
5. GLSL ES 1.0 built-in functions are available

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
