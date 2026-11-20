# Animation Performance Engineering & Measurable Budgets

Realistic performance guidelines, GPU compositor constraints, workload-specific memory budgets, and browser frame-timing harnesses.

---

## 1. Analytical Workload-Specific VRAM Memory Estimation Formula
Total GPU VRAM footprint for rendered layers must consider device pixel ratio, front/back double buffering, depth/stencil buffers multiplied by pixel dimensions, and intermediate render targets:

$$\text{VRAM Total (Bytes)} = \left[\text{Width} \times \text{Height} \times \text{DPR}^2 \times (4\text{ bytes [color]} \times 2\text{ [double buffer]} + 4\text{ bytes [depth/stencil]})\right] + \sum \text{Textures}$$

*Note*: This formula serves as an analytical estimation target for GPU memory budgeting. Actual driver allocations must be verified using the Chrome DevTools Memory & Layers panels.

### Configurable Device Target Budgets
| Device Class | Detection Heuristic | Target VRAM Budget | Max Frame Sequence Scrub |
| :--- | :--- | :--- | :--- |
| **Low-End Mobile** | `navigator.deviceMemory <= 2` or coarse pointer | **≤ 20 MB target** | 30 frames (downscaled DPR 1.0) |
| **Mid / High Mobile** | `navigator.deviceMemory > 2` | **≤ 45 MB target** | 60 frames (DPR 1.5) |
| **Desktop / Workstation** | `(pointer: fine)` and `deviceMemory >= 8` | **≤ 90 MB target** | 120 frames (DPR 2.0) |

---

## 2. Frame Timing & Dropped Frame Harness (P95 & Jank Metrics)
Samples animation-frame intervals and observes long tasks where supported. Treat intervals above 20 ms as slow-frame indicators. Measure presented video frames separately.

```typescript
// lib/motion/frame-monitor.ts

export interface FrameAuditResult {
  fps: number;
  p95FrameTimeMs: number;
  slowFramesPercent: number;
  longTasksCount: number | null;
}

export function startFrameAudit(durationMs = 3000): Promise<FrameAuditResult | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const frameTimes: number[] = [];
    let lastTime = performance.now();
    let frameId = 0;
    let longTasksCount = 0;

    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) longTasksCount++;
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      observer?.disconnect();
      observer = null;
    }

    const onFrame = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      frameTimes.push(delta);
      frameId = requestAnimationFrame(onFrame);
    };

    frameId = requestAnimationFrame(onFrame);

    setTimeout(() => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();

      frameTimes.sort((a, b) => a - b);
      if (frameTimes.length === 0) {
        resolve(null);
        return;
      }
      const p95Index = Math.ceil(frameTimes.length * 0.95) - 1;
      const p95FrameTimeMs = frameTimes[p95Index];

      const slowFrameCount = frameTimes.filter((t) => t > 20).length;
      const slowFramesPercent = (slowFrameCount / Math.max(frameTimes.length, 1)) * 100;
      const averageDelta = frameTimes.reduce((a, b) => a + b, 0) / Math.max(frameTimes.length, 1);
      const fps = Math.round(1000 / Math.max(averageDelta, 1));

      resolve({
        fps,
        p95FrameTimeMs,
        slowFramesPercent,
        longTasksCount: observer ? longTasksCount : null,
      });
    }, durationMs);
  });
}
```

---

## 3. PerformanceObserver Teardown
```typescript
// lib/motion/performance-audit.ts
export function initPerformanceAudit(): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn(`[Performance] Long Task detected: ${entry.duration.toFixed(1)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}
```
