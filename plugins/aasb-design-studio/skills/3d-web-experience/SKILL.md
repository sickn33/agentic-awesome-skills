---
name: 3d-web-experience
description: Use when building or debugging web 3D scenes, product configurators or portfolios with Three.js, React Three Fiber or Spline; review assets, loading, controls, fallbacks and performance.
metadata:
  aas-risk: critical
  aas-source: vibeship-spawner-skills (Apache 2.0)
  aas-date-added: '2026-02-27'
---

# 3D Web Experience

Expert in building 3D experiences for the web - Three.js, React Three Fiber,
Spline, WebGL, and interactive 3D scenes. Covers product configurators, 3D
portfolios, immersive websites, and bringing depth to web experiences.

**Role**: 3D Web Experience Architect

You bring the third dimension to the web. You know when 3D enhances
and when it's just showing off. You balance visual impact with
performance. You make 3D accessible to users who've never touched
a 3D app. You create moments of wonder without sacrificing usability.

### Expertise

- Three.js
- React Three Fiber
- Spline
- WebGL
- GLSL shaders
- 3D optimization
- Model preparation

## Capabilities

- Three.js implementation
- React Three Fiber
- WebGL optimization
- 3D model integration
- Spline workflows
- 3D product configurators
- Interactive 3D scenes
- 3D performance optimization

## Patterns

### 3D Stack Selection

Choosing the right 3D approach

**When to use**: When starting a 3D web project

## 3D Stack Selection

### Options Comparison
| Tool | Best For | Learning Curve | Control |
|------|----------|----------------|---------|
| Spline | Quick prototypes, designers | Low | Medium |
| React Three Fiber | React apps, complex scenes | Medium | High |
| Three.js vanilla | Max control, non-React | High | Maximum |
| Babylon.js | Games, heavy 3D | High | Maximum |

### Decision Tree
```
Need quick 3D element?
└── Yes → Spline
└── No → Continue

Using React?
└── Yes → React Three Fiber
└── No → Continue

Need max performance/control?
└── Yes → Three.js vanilla
└── No → Spline or R3F
```

### Spline (Fastest Start)
```jsx
import Spline from '@splinetool/react-spline';

export default function Scene() {
  return (
    <Spline scene="https://prod.spline.design/xxx/scene.splinecode" />
  );
}
```

### React Three Fiber
```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';

function Model() {
  const { scene } = useGLTF('/model.glb');
  return <primitive object={scene} />;
}

export default function Scene() {
  return (
    <Canvas>
      <ambientLight />
      <Suspense fallback={null}>
        <Model />
      </Suspense>
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}
```

### 3D Model Pipeline

Getting models web-ready

**When to use**: When preparing 3D assets

## 3D Model Pipeline

### Format Selection
| Format | Use Case | Size |
|--------|----------|------|
| GLB/GLTF | Standard web 3D | Depends on geometry/textures/compression |
| FBX | From 3D software | Large |
| OBJ | Simple meshes | Medium |
| USDZ | Apple AR | Medium |

### Optimization Pipeline
```
1. Model in Blender/etc
2. Establish a triangle/draw-call budget on representative target devices
3. Bake textures (combine materials)
4. Export as GLB
5. Compress with gltf-transform
6. Measure transfer size, decode time, memory and frame time against the project budget
```

### GLTF Compression
```bash
# Use the reviewed version already pinned in the project lockfile.
# If absent, review and add a specific version locally before these commands.

# Compress model
./node_modules/.bin/gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp
```

### Loading in R3F

This component needs the React/R3F/drei versions installed by the project and an
actual `/model.glb` asset. Add an application error boundary for failed asset loads.

```jsx
import { useGLTF, useProgress, Html } from '@react-three/drei';
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

function Model() {
  const { scene } = useGLTF('/model.glb');
  return <primitive object={scene} />;
}

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(0)}%</Html>;
}

export default function Scene() {
  return (
    <Canvas>
      <ambientLight />
      <Suspense fallback={<Loader />}>
        <Model />
      </Suspense>
    </Canvas>
  );
}
```

### Scroll-Driven 3D

3D that responds to scroll

**When to use**: When integrating 3D with scroll

## Scroll-Driven 3D

### R3F + Scroll Controls
```jsx
import { ScrollControls, useScroll } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';

function RotatingModel() {
  const scroll = useScroll();
  const ref = useRef();

  useFrame(() => {
    // Rotate based on scroll position
    if (ref.current) ref.current.rotation.y = scroll.offset * Math.PI * 2;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshNormalMaterial />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas>
      <ScrollControls pages={3}>
        <RotatingModel />
      </ScrollControls>
    </Canvas>
  );
}
```

### GSAP + Three.js
```javascript
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// Integration fragment: camera and the section are supplied by your scene.
// Create this tween during mount and kill it/its ScrollTrigger during cleanup.

gsap.to(camera.position, {
  scrollTrigger: {
    trigger: '.section',
    scrub: true,
  },
  z: 5,
  y: 2,
});
```

### Common Scroll Effects
- Camera movement through scene
- Model rotation on scroll
- Reveal/hide elements
- Color/material changes
- Exploded view animations

### Performance Optimization

Keeping 3D fast

**When to use**: Always - 3D is expensive

## 3D Performance

### Performance Targets

The following are illustrative starting budgets, not hardware limits or guarantees.
Measure GPU time, draw calls, memory and load time; triangle count alone cannot
establish performance. Respect reduced-motion settings and retain ordinary controls.

| Device | Target FPS | Max Triangles |
|--------|------------|---------------|
| Desktop | 60fps | 500K |
| Mobile | 30-60fps | 100K |
| Low-end | 30fps | 50K |

### Quick Wins

These are independent integration fragments, not one copyable module. Configure
instances/LOD and lights in your actual scene, and wrap lazy components in Suspense.

```jsx
// 1. Use instances for repeated objects
import { Instances, Instance } from '@react-three/drei';

// 2. Limit lights
const lights = (
  <>
    <ambientLight intensity={0.5} />
    <directionalLight />
  </>
);

// 3. Use LOD (Level of Detail)
import { LOD } from 'three';

// 4. Lazy load models
import { lazy } from 'react';
const Model = lazy(() => import('./Model'));
```

### Resolution budget

Use a conservative initial DPR and measure actual rendering performance rather
than inferring device capacity from the user-agent string:

```jsx
import { Canvas } from '@react-three/fiber';

export default function Scene() {
  return (
    <Canvas dpr={[1, 1.5]} fallback={<p>3D preview unavailable.</p>}>
      <mesh>
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>
    </Canvas>
  );
}
```

### Fallback strategy

`Canvas` supports a DOM `fallback` when GL cannot initialize. Also wrap the scene
in an application error boundary for context crashes and asset errors; Suspense
handles loading, not failures. Keep product descriptions, variant controls and
purchase actions in accessible DOM so the task works without the canvas. Test
keyboard operation, zoom, reduced motion and an unavailable WebGL context.
See the [Canvas API and fallback guidance](https://r3f.docs.pmnd.rs/api/canvas).

## Validation Checks

### No 3D Loading Indicator

Severity: HIGH

Message: No loading indicator for 3D content.

Fix action: Add Suspense with loading fallback or useProgress for loading UI

### No WebGL Fallback

Severity: MEDIUM

Message: No fallback for devices without WebGL support.

Fix action: Add WebGL detection and static image fallback

### Uncompressed 3D Models

Severity: MEDIUM

Message: 3D models may be unoptimized.

Fix action: Compress models with gltf-transform using Draco and texture compression

### OrbitControls Blocking Scroll

Severity: MEDIUM

Message: OrbitControls may be capturing scroll events.

Fix action: Add enableZoom={false} or handle scroll/touch events appropriately

### High DPR on Mobile

Severity: MEDIUM

Message: Canvas DPR may be too high for mobile devices.

Fix action: Limit DPR to 1 on mobile devices for better performance

## Collaboration

### Optional collaboration areas

These are capability labels; check actual IDs and read their scope in the current
catalog before recommending them. They do not authorize spawning agents.

- scroll animation|parallax|GSAP -> scroll-experience (Scroll integration)
- react|next|frontend -> frontend-developer (React integration)
- performance|slow|fps -> performance-engineer (3D performance optimization)
- product page|landing|marketing -> frontend-design (Product landing with 3D)

### Product Configurator

Skills: 3d-web-experience, frontend-developer, frontend-design

Workflow:

```
1. Prepare 3D product model
2. Set up React Three Fiber scene
3. Add interactivity (colors, variants)
4. Integrate with product page
5. Optimize for mobile
6. Add fallback images
```

### Immersive Portfolio

Skills: 3d-web-experience, scroll-experience, interactive-portfolio

Workflow:

```
1. Design 3D scene concept
2. Build scene in Spline or R3F
3. Add scroll-driven animations
4. Integrate with portfolio sections
5. Ensure mobile fallback
6. Optimize performance
```

## Related Skills

Works well with: `scroll-experience`, `interactive-portfolio`, `frontend-developer`, `frontend-design`

## When to Use

- Add a navigable product model or configurator to a web page while preserving ordinary product and purchase controls.
- Diagnose loading, frame-time, asset-size or input problems in an existing Three.js/R3F scene.
- Choose between a design-authored Spline scene and a code-owned scene based on interaction, deployment and maintenance needs.
- Plan a scroll-linked portfolio scene with an accessible static alternative and a reduced-motion path. Prefer ordinary DOM content when depth does not help the user's task.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Assets and dependencies are project prerequisites, not shipped in this skill. Replace the illustrative Spline scene URL with an authorized asset; do not treat the placeholder as a working scene.
- Validate compression/decoder compatibility and visual quality using the installed CLI version and real target devices. See the [glTF Transform CLI](https://gltf-transform.dev/cli).
- Loading, runtime failures, accessible DOM controls and reduced motion require separate checks; a rendered canvas alone does not prove accessibility or performance.
