# Premium Micro-Interactions & Gestures

Architecture for magnetic controls, 3D card tilts, and liquid cursors with persistent `quickTo` mechanisms, stable hit areas, divide-by-zero guards, pointer identification, and touch-action restoration.

---

## 1. Magnetic Button (Stable Hit Area vs Visual Child)
Subscribes dynamically to `(pointer: fine)` and `(prefers-reduced-motion: reduce)` changes, restoring transforms and listeners on unmount or capability change:

```tsx
// components/motion/magnetic-button.tsx
'use client';
import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  strength?: number;
}

export function MagneticButton({
  children,
  strength = 0.35,
  className = '',
  ...props
}: MagneticButtonProps) {
  const hitAreaRef = useRef<HTMLButtonElement>(null);
  const visualChildRef = useRef<HTMLSpanElement>(null);

  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const fineQuery = window.matchMedia('(pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const evaluateSupport = () => {
      setIsSupported(fineQuery.matches && !motionQuery.matches);
    };

    evaluateSupport();
    fineQuery.addEventListener('change', evaluateSupport);
    motionQuery.addEventListener('change', evaluateSupport);

    return () => {
      fineQuery.removeEventListener('change', evaluateSupport);
      motionQuery.removeEventListener('change', evaluateSupport);
    };
  }, []);

  useEffect(() => {
    const hitArea = hitAreaRef.current;
    const visual = visualChildRef.current;
    if (!hitArea || !visual || !isSupported) return;

    const xTo = gsap.quickTo(visual, 'x', { duration: 0.3, ease: 'power2.out' });
    const yTo = gsap.quickTo(visual, 'y', { duration: 0.3, ease: 'power2.out' });

    let bounds = hitArea.getBoundingClientRect();

    const onMouseEnter = () => {
      bounds = hitArea.getBoundingClientRect();
    };

    const onMouseMove = (e: MouseEvent) => {
      const relX = (e.clientX - bounds.left - bounds.width / 2) * strength;
      const relY = (e.clientY - bounds.top - bounds.height / 2) * strength;
      xTo(relX);
      yTo(relY);
    };

    const onMouseLeave = () => {
      gsap.to(visual, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.3)',
        overwrite: 'auto',
      });
    };

    hitArea.addEventListener('mouseenter', onMouseEnter);
    hitArea.addEventListener('mousemove', onMouseMove);
    hitArea.addEventListener('mouseleave', onMouseLeave);

    return () => {
      hitArea.removeEventListener('mouseenter', onMouseEnter);
      hitArea.removeEventListener('mousemove', onMouseMove);
      hitArea.removeEventListener('mouseleave', onMouseLeave);
      gsap.killTweensOf(visual);
      gsap.set(visual, { x: 0, y: 0 });
    };
  }, [strength, isSupported]);

  return (
    <button
      ref={hitAreaRef}
      className={`relative inline-flex items-center justify-center p-4 focus-visible:ring-2 focus-visible:ring-[#C9A86A] focus-visible:outline-none ${className}`}
      {...props}
    >
      <span ref={visualChildRef} className="inline-block pointer-events-none">
        {children}
      </span>
    </button>
  );
}
```

---

## 2. Touch Gesture Swipe with Pointer ID Identification & Style Restoration
Maintains tracking exclusively for the initial active `pointerId`, safely ignores competing concurrent pointers, preserves original inline `touchAction`, and clamps velocity elapsed duration:

```tsx
// hooks/use-swipe-gesture.ts
'use client';
import { useRef, useEffect } from 'react';

export function useSwipeGesture(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Preserve previous inline touch-action style
    const previousTouchAction = el.style.touchAction;
    el.style.touchAction = 'pan-y';

    let startX = 0;
    let startTime = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Only track one active pointer at a time
      if (activePointerIdRef.current !== null) return;
      activePointerIdRef.current = e.pointerId;

      startX = e.clientX;
      startTime = Date.now();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current) return;
      activePointerIdRef.current = null;

      const deltaX = e.clientX - startX;
      // Guard against divide-by-zero with minimum 16ms clamp
      const duration = Math.max(Date.now() - startTime, 16);
      const velocity = Math.abs(deltaX) / duration;

      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {}

      if (Math.abs(deltaX) > 50 || velocity > 0.45) {
        if (deltaX > 0) onSwipeRight();
        else onSwipeLeft();
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current) return;
      activePointerIdRef.current = null;
      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {}
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      // Restore previous touchAction inline style
      el.style.touchAction = previousTouchAction;
    };
  }, [onSwipeLeft, onSwipeRight]);

  return ref;
}
```
