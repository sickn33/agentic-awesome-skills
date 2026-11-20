# Responsive & Device-Adaptive Animation

Choreographing motion across mouse, touch, variable viewports, and low-power hardware with safe listener teardowns and graceful API fallbacks.

---

## 1. Viewport Units Precision: `svh`, `lvh`, and `dvh`
- **`svh` (Small Viewport Height)**: Calculated when mobile browser UI elements (address bar, navigation tabs) are **expanded / visible**. This is the smallest viewport area. Use for **pinned scroll sections and hero containers** to eliminate layout resizing during active scroll!
- **`lvh` (Large Viewport Height)**: Calculated when browser chrome is **retracted / collapsed**.
- **`dvh` (Dynamic Viewport Height)**: Continuously resizes as the user scrolls. Use **only** for fixed fullscreen curtains, menus, or modal overlays.

```css
/* Progressive Fallback Hierarchy */
.hero-stable-container {
  height: 100vh;   /* Fallback for legacy browsers */
  height: 100svh;  /* Modern standard preventing mobile jump */
}
```

---

## 2. Visual Viewport Resize Teardown
```typescript
// hooks/use-visual-viewport.ts
'use client';
import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function useVisualViewportResize() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      // Prevent ScrollTrigger from refreshing when mobile virtual keyboard opens
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      ScrollTrigger.refresh();
    };

    window.visualViewport.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);
}
```

---

## 3. Battery & Hardware Tier Adaptation with Safe Cleanup
Gracefully falls back to standard Tier 2 profile when `navigator.getBattery` or `navigator.deviceMemory` are unsupported:

```typescript
// hooks/use-power-efficiency.ts
'use client';
import { useState, useEffect } from 'react';

export function usePowerEfficiency(): boolean {
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let batteryInstance: any = null;
    let checkHandler: (() => void) | null = null;

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          if (!isMounted) return;
          batteryInstance = battery;

          checkHandler = () => {
            if (isMounted) {
              setIsLowPower(battery.level <= 0.2 && !battery.charging);
            }
          };

          checkHandler();
          battery.addEventListener('levelchange', checkHandler);
          battery.addEventListener('chargingchange', checkHandler);
        })
        .catch(() => {
          // Graceful fallback: default to standard power
          if (isMounted) setIsLowPower(false);
        });
    }

    return () => {
      isMounted = false;
      if (batteryInstance && checkHandler) {
        batteryInstance.removeEventListener('levelchange', checkHandler);
        batteryInstance.removeEventListener('chargingchange', checkHandler);
      }
    };
  }, []);

  return isLowPower;
}
```
