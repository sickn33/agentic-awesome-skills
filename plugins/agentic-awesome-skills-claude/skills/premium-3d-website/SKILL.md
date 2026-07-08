---
name: premium-3d-website
description: Guidelines for building premium 3D websites, focusing on custom WebGL shaders, post-processing, physics-based interactions, smooth animations, preloaders, and device optimization.
category: frontend
risk: safe
source: self
source_type: self
date_added: "2026-06-25"
author: Rsmiyani
tags: [threejs, webgl, shaders, post-processing, creative-coding, premium-design]
tools: [claude, cursor, gemini]
---

# Premium 3D Website

## Overview

This skill provides architectural guidelines and code patterns for developing premium, high-end 3D websites. It targets developers looking to implement advanced WebGL visual effects, custom shader pipelines, interactive physics elements, and immersive page transitions while maintaining high performance.

## When to Use This Skill

- Use when designing premium or award-winning creative websites with 3D elements.
- Use when integrating Three.js, React Three Fiber (R3F), or Spline with custom shaders (GLSL).
- Use when implementing post-processing effects like bloom, depth-of-field, or custom film grain.
- Use when designing interactive preloaders and high-performance asset loading strategies.
- Use when optimizing complex 3D scenes for mobile responsiveness and performance.

## How It Works

### Step 1: Establish the Render Loop and Scene Architecture
Setting up a robust WebGL context with proper resize handling and performance-friendly pixel ratios is crucial. Keep pixel ratios capped at a maximum of 2 to avoid rendering too many pixels on high-DPI screens.

### Step 2: Implement Shader Effects and Post-Processing
Incorporate post-processing pipelines (using `EffectComposer` or `@react-three/postprocessing`) to add bloom, chromatic aberration, depth of field, or film grain. Keep pass counts low and combine custom fragment shaders to minimize draw calls.

### Step 3: Integrate Interactive Physics and Motion
Utilize physics frameworks (such as Cannon.js or Rapier) or procedural spring animations to make 3D objects react to mouse hover, drag, and click inputs with organic feedback.

### Step 4: Asset Pipeline and Preloader
Optimize 3D models (using Draco compression) and load them using custom loading managers. Render interactive preloaders to entertain users while heavy assets are fetched in the background.

## Examples

### Example 1: Custom Post-processing in React Three Fiber (R3F)

```jsx
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';

export default function PremiumComposer() {
  return (
    <Canvas dpr={[1, 2]} gl={{ powerPreference: "high-performance", antialias: false }}>
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry />
        <meshStandardMaterial emissive="orange" emissiveIntensity={2.0} />
      </mesh>
      
      <EffectComposer disableNormalPass>
        <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
        <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
}
```

### Example 2: Custom GLSL Shader Material for Liquid/Wavy Effects

```javascript
import * as THREE from 'three';

const CustomWavyMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.z += sin(pos.x * 5.0 + uTime) * 0.1;
      pos.z += cos(pos.y * 5.0 + uTime) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColor;
    void main() {
      float pulse = 0.5 + 0.5 * sin(uTime + vUv.x * 10.0);
      gl_FragColor = vec4(uColor * pulse, 1.0);
    }
  `,
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color('#3b82f6') }
  }
});
```

## Best Practices

- ✅ Set `dpr={[1, 2]}` to restrict the device pixel ratio to a maximum of 2.
- ✅ Disable antialiasing on the WebGLRenderer when post-processing is active to prevent double-aliasing performance penalties.
- ✅ Bake ambient occlusion, lighting, and shadows into textures using Blender or other 3D software instead of using dynamic lights and real-time shadows.
- ✅ Use instance rendering (`THREE.InstancedMesh` or R3F `<Instances>`) for scenes containing multiple identical meshes.
- ❌ Avoid using uncompressed GLTF/OBJ models. Always compress models using Draco or Meshopt.
- ❌ Avoid real-time shadow maps (such as `THREE.DirectionalLightShadow`) on mobile or low-end devices due to the heavy performance overhead.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Complex shader mathematics and advanced physics simulation bounds require manual testing across different device chipsets.

## Security & Safety Notes

- Verify that external 3D model URLs (loaded via `GLTFLoader`) are hosted on trusted, secure CDNs (HTTPS).
- Do not execute arbitrary, unvalidated shell scripts or use unpinned NPM packages to optimize assets.

## Common Pitfalls

- **Problem**: Severe lag/framerate drop on mobile or high-DPI (Retina) screens.
  **Solution**: Ensure the pixel ratio is limited to 2 (`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`) and disable unused post-processing passes.
- **Problem**: Long loading times and white screens during initialization.
  **Solution**: Use a loading manager (`THREE.LoadingManager`) and display a responsive, interactive preloader to keep the user engaged.

## Related Skills

- `@3d-web-experience` - Core WebGL, Three.js, and Spline concepts.
- `@scroll-experience` - Integrating 3D animation with scroll controllers.
- `@performance-optimizer` - General code execution performance tuning.
