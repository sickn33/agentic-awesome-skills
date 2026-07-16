# React / Next.js / Vue Integration

---

## React / Vite

Install:
```bash
npm install @splinetool/react-spline
```

Basic:
```jsx
import Spline from '@splinetool/react-spline';

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spline scene="https://prod.spline.design/REPLACE_ME/scene.splinecode" />
    </div>
  );
}
```

With object interaction + event listeners:
```jsx
import { useRef } from 'react';
import Spline from '@splinetool/react-spline';

export default function App() {
  const splineRef = useRef();

  function onLoad(splineApp) {
    splineRef.current = splineApp;
  }

  function triggerAnimation() {
    splineRef.current.emitEvent('mouseHover', 'Cube');
  }

  function onSplineEvent(e) {
    console.log('Object interacted:', e.target.name);
  }

  return (
    <div>
      <Spline
        scene="https://prod.spline.design/REPLACE_ME/scene.splinecode"
        onLoad={onLoad}
        onMouseDown={onSplineEvent}
      />
      <button onClick={triggerAnimation}>Trigger</button>
    </div>
  );
}
```

**Lazy loading (recommended for performance):**
```jsx
import { lazy, Suspense } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

export default function Hero() {
  return (
    <Suspense fallback={<div style={{ background: '#0a0a0a', width: '100%', height: '100vh' }} />}>
      <Spline scene="https://prod.spline.design/REPLACE_ME/scene.splinecode" />
    </Suspense>
  );
}
```

---

## Next.js

Install:
```bash
npm install @splinetool/react-spline
```

**Use the `/next` import** for SSR support + auto blurred placeholder:
```jsx
import Spline from '@splinetool/react-spline/next';

export default function Page() {
  return (
    <Spline scene="https://prod.spline.design/REPLACE_ME/scene.splinecode" />
  );
}
```

**With dynamic import (if you get hydration errors):**
```jsx
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline/next'), {
  ssr: false,
  loading: () => <div style={{ background: '#0a0a0a', width: '100%', height: '100vh' }} />
});

export default function Page() {
  return <Spline scene="https://prod.spline.design/REPLACE_ME/scene.splinecode" />;
}
```

---

## Vue

Install:
```bash
npm install @splinetool/vue-spline
```

```vue
<template>
  <Spline
    scene="https://prod.spline.design/REPLACE_ME/scene.splinecode"
    @spline-loaded="onLoaded"
    @mouseDown="onClick"
  />
</template>

<script>
import Spline from '@splinetool/vue-spline';

export default {
  components: { Spline },
  methods: {
    onLoaded(spline) {
      const obj = spline.findObjectByName('Cube');
      obj.position.x += 10; // NOTE: radians for rotation, not degrees
    },
    onClick(e) {
      console.log('Clicked:', e.target.name);
    }
  }
}
</script>
```

---

## Full-Page Background (React)

```jsx
import Spline from '@splinetool/react-spline';
import { useState } from 'react';

export default function HeroSection() {
  const [loaded, setLoaded] = useState(false);

  // Skip Spline on mobile / low-end devices
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isLowEnd = typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 2;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>

      {/* Fallback background — always rendered, hidden once Spline loads */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#0a0a0a',
        zIndex: 0,
        opacity: loaded ? 0 : 1,
        transition: 'opacity 0.5s ease'
      }} />

      {/* Spline scene — only load on capable devices */}
      {!isMobile && !isLowEnd && (
        <Spline
          scene="https://prod.spline.design/REPLACE_ME/scene.splinecode"
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            zIndex: 0
          }}
        />
      )}

      {/* Content sits on top */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1>Your Content Here</h1>
      </div>

    </div>
  );
}
```

---

## React Prop Reference

| Prop | Type | Description |
|---|---|---|
| `scene` | string | Scene URL (required) |
| `onLoad` | function | Called with splineApp when loaded |
| `onMouseDown` | function | Mouse/touch down on object |
| `onMouseUp` | function | Mouse/touch up |
| `onMouseHover` | function | Hover over object |
| `onKeyDown` | function | Key pressed |
| `onKeyUp` | function | Key released |
| `onStart` | function | Scene started |
| `onScroll` | function | Scroll event |
| `style` | object | CSS styles for the canvas |
| `className` | string | CSS class |

See [PERFORMANCE.md](PERFORMANCE.md) and [COMMON_PROBLEMS.md](COMMON_PROBLEMS.md) before finishing.
