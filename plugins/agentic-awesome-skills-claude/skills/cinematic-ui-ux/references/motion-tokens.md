# Motion Tokens & Timing Systems

Standardized design token architecture strictly for animation durations, easings, and device scaling, featuring idempotent CustomEase registration and native cubic-bezier fallbacks.

---

## 1. Idempotent CustomEase Registration & Native Fallback
```typescript
// lib/motion/tokens.ts
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

let registered = false;

export function registerMotionTokens() {
  if (typeof window === 'undefined' || registered) return;
  try {
    gsap.registerPlugin(CustomEase);
    if (!CustomEase.get('ease-couture')) {
      CustomEase.create('ease-couture', '0.25, 0.1, 0.25, 1');
    }
    if (!CustomEase.get('ease-cinematic-out')) {
      CustomEase.create('ease-cinematic-out', '0.16, 1, 0.3, 1');
    }
    registered = true;
  } catch {
    console.warn('[Motion] CustomEase not available; falling back to native curves.');
  }
}

/**
 * Dual Motion Tokens:
 * Provides seconds for GSAP animations and milliseconds/strings for CSS transitions.
 */
export const MotionTokens = {
  duration: {
    instant: 0,
    micro: 0.18,        // 180ms
    short: 0.28,        // 280ms
    medium: 0.45,       // 450ms
    long: 0.85,         // 850ms
    cinematic: 1.4,     // 1400ms
  },
  durationMs: {
    instant: 0,
    micro: 180,
    short: 280,
    medium: 450,
    long: 850,
    cinematic: 1400,
  },
  easing: {
    snappy: 'power2.out',
    standard: 'power3.out',
    cinematic: 'ease-cinematic-out',
    couture: 'ease-couture',
    linear: 'none',
  },
  cssEasing: {
    snappy: 'cubic-bezier(0.16, 1, 0.3, 1)',
    standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
    cinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
    couture: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    linear: 'linear',
  },
  stagger: {
    tight: 0.03,
    medium: 0.06,
    dramatic: 0.12,
  },
} as const;
```
