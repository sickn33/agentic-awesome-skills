---
name: shader-programming-glsl
description: "Expert guide for writing efficient GLSL shaders (Vertex/Fragment) for web and game engines, covering syntax, uniforms, and common effects."
risk: safe
source: community
date_added: "2026-02-27"
---

# Shader Programming GLSL

## Overview

A comprehensive guide to writing GPU shaders using GLSL (OpenGL Shading Language). Learn syntax, uniforms, varying variables, and key mathematical concepts like swizzling and vector operations for visual effects.

## When to Use This Skill

- Use when creating custom visual effects in WebGL, Three.js, or game engines.
- Use when optimizing graphics rendering performance.
- Use when implementing post-processing effects (blur, bloom, color correction).
- Use when procedurally generating textures or geometry on the GPU.

## Step-by-Step Guide

### 1. Structure: Vertex vs. Fragment

The basic syntax below targets GLSL ES 1.00/WebGL 1. Host engines may inject matrices/attributes; raw WebGL must bind them explicitly. GLSL ES 3.00 uses `in`/`out` and a declared fragment output instead of `attribute`/`varying`/`gl_FragColor`. Compile the vertex and fragment shaders separately, link them into a program, and inspect compile/link logs.

Understand the pipeline:
- **Vertex Shader**: Transforms 3D coordinates to 2D screen space (`gl_Position`).
- **Fragment Shader**: Colors individual pixels (`gl_FragColor`).

```glsl
// Vertex Shader (basic)
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```glsl
// Fragment Shader (basic)
precision mediump float;
uniform vec3 color;

void main() {
    gl_FragColor = vec4(color, 1.0);
}
```

### 2. Uniforms and Varyings

- `uniform`: Data constant for all vertices/fragments (passed from CPU).
- `varying`: Data interpolated from vertex to fragment shader.

```glsl
// Separate vertex and fragment shader snippets; both declare varying vec2 vUv.
// Vertex shader also needs attribute vec2 uv and the matrices/position above.
// Raw WebGL fragment shader needs a float precision declaration.
varying vec2 vUv;

// In Vertex Shader
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// In Fragment Shader
void main() {
    // Gradient based on UV
    gl_FragColor = vec4(vUv.x, vUv.y, 1.0, 1.0);
}
```

### 3. Swizzling & Vector Math

Access vector components freely: `vec4 color = vec4(1.0, 0.5, 0.0, 1.0);`
- `color.rgb` -> `vec3(1.0, 0.5, 0.0)`
- `color.zyx` -> `vec3(0.0, 0.5, 1.0)` (reordering)

## Examples

### Example 1: Simple Raymarching (SDF Sphere)

This is a Shadertoy-style fragment entry point using host-supplied `iResolution`; it requires a host wrapper for raw WebGL.

```glsl
float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0); // Ray Origin
    vec3 rd = normalize(vec3(uv, 1.0)); // Ray Direction
    
    float t = 0.0;
    bool hit = false;
    for(int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = sdSphere(p, 1.0); // Sphere radius 1.0
        if(d < 0.001) { hit = true; break; }
        t += d;
        if(t > 10.0) break;
    }
    
    vec3 col = vec3(0.0);
    if(hit) {
        vec3 p = ro + rd * t;
        vec3 normal = normalize(p);
        col = normal * 0.5 + 0.5; // Color by normal
    }
    
    fragColor = vec4(col, 1.0);
}
```

## Best Practices

- ✅ **Do:** Use `mix()` for linear interpolation instead of manual math.
- ✅ **Do:** Use `step()` and `smoothstep()` for thresholding and soft edges (avoid `if` branches).
- ✅ **Do:** Pack data into vectors (`vec4`) to minimize memory access.
- ❌ **Don't:** Use heavy branching (`if-else`) inside loops if possible; it hurts GPU parallelism.
- ❌ **Don't:** Calculate constant values inside the shader; pre-calculate them on the CPU (uniforms).

## Troubleshooting

**Problem:** Shader compiles but screen is black.
**Solution:** Check the full clip-space transform and homogeneous `gl_Position.w`; perspective projection does not generally produce w = 1. Check if uniforms are actually being set from the host application. Verify UV coordinates are within [0, 1].

For GLSL ES fragment precision portability, see [Khronos guidance](https://wikis.khronos.org/webgl/WebGL_and_OpenGL_Differences). Profile branch/vector optimizations on the target GPU; these style suggestions do not guarantee a speedup.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
