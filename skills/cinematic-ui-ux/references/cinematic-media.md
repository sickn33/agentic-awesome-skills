# Cinematic Media & Frame Scrubbing Engineering

Production architecture for 60fps canvas frame scrubbing with validation, concurrency-limited decoding, high-DPI scaling, aspect ratio preservation (`contain`/`cover`), decoded texture memory budgeting, and dynamic ResizeObserver recalibration.

---

## 1. Production Image Sequence Preloader & Canvas Engine
```tsx
// components/motion/canvas-frame-scrubber.tsx
'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type ScrubState =
  | 'IDLE'
  | 'LOADING'
  | 'PARTIAL_READY'
  | 'READY'
  | 'TIMEOUT_DEGRADED'
  | 'FAILED';

export interface FrameScrubberProps {
  frameCount: number;
  frameUrlPattern: (index: number) => string;
  posterUrl?: string;
  aspectRatio?: number;
  objectFit?: 'contain' | 'cover';
  altText?: string;
  memoryBudgetMB?: number;
}

export function CanvasFrameScrubber({
  frameCount,
  frameUrlPattern,
  posterUrl,
  aspectRatio = 16 / 9,
  objectFit = 'contain',
  altText = 'Scroll-controlled cinematic frame sequence',
  memoryBudgetMB = 80,
}: FrameScrubberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inFlightAbortControllersRef = useRef<Map<number, AbortController>>(new Map());
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  const [scrubState, setScrubState] = useState<ScrubState>('IDLE');
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Monitor reduced motion preference dynamically
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resetState = useCallback(() => {
    // Abort all in-flight fetch requests
    inFlightAbortControllersRef.current.forEach((controller) => controller.abort());
    inFlightAbortControllersRef.current.clear();

    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.kill();
      scrollTriggerRef.current = null;
    }

    setLoadProgress(0);
    setScrubState('IDLE');
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    resetState();

    if (!Number.isInteger(frameCount) || frameCount <= 0) {
      console.error('[FrameScrubber] frameCount must be a positive integer.');
      setScrubState('FAILED');
      setErrorMessage('Invalid frame count specification.');
      return;
    }
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
      console.error('[FrameScrubber] Invalid aspect ratio.');
      setScrubState('FAILED');
      setErrorMessage('Invalid aspect ratio.');
      return;
    }

    // Reduced motion bypasses canvas scrubbing entirely
    if (isReducedMotion) {
      setScrubState('READY');
      return;
    }

    setScrubState('LOADING');
    let isCancelled = false;
    const images: (HTMLImageElement | null)[] = new Array(frameCount).fill(null);
    let lastRenderedIndex = -1;
    let loadedCount = 0;
    let currentDecodedBytes = 0;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      setScrubState('FAILED');
      setErrorMessage('Canvas 2D context unavailable.');
      return;
    }

    // Dynamic Aspect-Ratio Fit Calculation (Contain / Cover)
    const drawFrame = (targetIndex: number) => {
      if (isCancelled || !ctx || !canvas) return;

      let imageToDraw = images[targetIndex];
      let actualRenderedIndex = targetIndex;

      // Fallback to nearest loaded frame if target frame is missing or pending
      if (!imageToDraw) {
        for (let i = targetIndex - 1; i >= 0; i--) {
          if (images[i]) {
            imageToDraw = images[i];
            actualRenderedIndex = i;
            break;
          }
        }
        if (!imageToDraw) {
          for (let i = targetIndex + 1; i < frameCount; i++) {
            if (images[i]) {
              imageToDraw = images[i];
              actualRenderedIndex = i;
              break;
            }
          }
        }
      }

      if (!imageToDraw) return;

      // Clear canvas before redrawing
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Compute precise aspect ratio fit
      const imgW = imageToDraw.naturalWidth || canvas.width;
      const imgH = imageToDraw.naturalHeight || canvas.height;
      const hRatio = canvas.width / imgW;
      const vRatio = canvas.height / imgH;
      const ratio = objectFit === 'cover' ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);

      const renderW = Math.round(imgW * ratio);
      const renderH = Math.round(imgH * ratio);
      const shiftX = Math.round((canvas.width - renderW) / 2);
      const shiftY = Math.round((canvas.height - renderH) / 2);

      ctx.drawImage(imageToDraw, 0, 0, imgW, imgH, shiftX, shiftY, renderW, renderH);
      lastRenderedIndex = actualRenderedIndex;
    };

    // Responsive Canvas Resizing & ScrollTrigger Refresh Coordination
    const updateDimensions = () => {
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = container.clientWidth || window.innerWidth;
      const cssH = Math.round(cssW / aspectRatio);

      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      if (lastRenderedIndex >= 0 && images[lastRenderedIndex]) {
        drawFrame(lastRenderedIndex);
      }
      ScrollTrigger.refresh();
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    // Concurrency-Limited Preloader with Decoded Memory Cap
    const maxConcurrent = 6;
    let nextIndexToLoad = 0;
    let activeLoads = 0;
    let hasInitializedTrigger = false;

    const initializeScrollTrigger = (stateToSet: ScrubState) => {
      if (hasInitializedTrigger || isCancelled) return;

      const firstAvailable = images.findIndex((img) => img !== null);
      if (firstAvailable !== -1) {
        hasInitializedTrigger = true;
        setScrubState(stateToSet);
        drawFrame(firstAvailable);

        scrollTriggerRef.current = ScrollTrigger.create({
          trigger: container,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 0.5,
          onUpdate: (self) => {
            const frameIndex = Math.min(
              frameCount - 1,
              Math.max(0, Math.floor(self.progress * (frameCount - 1)))
            );
            if (frameIndex !== lastRenderedIndex) {
              drawFrame(frameIndex);
            }
          },
        });
      } else {
        // If 0 frames exist on timeout or failure, set FAILED state
        setScrubState('FAILED');
        setErrorMessage('Failed to load frame assets.');
      }
    };

    // 6-Second Timeout Guard
    const timeoutTimer = setTimeout(() => {
      if (!isCancelled && !hasInitializedTrigger) {
        if (loadedCount > 0) {
          console.warn('[FrameScrubber] Timeout reached with partial frames. Initializing degraded scrub.');
          initializeScrollTrigger('TIMEOUT_DEGRADED');
        } else {
          console.error('[FrameScrubber] Sequence timeout with zero frames loaded.');
          setScrubState('FAILED');
          setErrorMessage('Media loading timed out.');
        }
      }
    }, 6000);

    const loadNext = () => {
      if (isCancelled) return;

      if (loadedCount >= frameCount || nextIndexToLoad >= frameCount) {
        if (!hasInitializedTrigger && loadedCount > 0) {
          initializeScrollTrigger('READY');
        }
        return;
      }

      while (activeLoads < maxConcurrent && nextIndexToLoad < frameCount) {
        const index = nextIndexToLoad++;
        activeLoads++;

        const controller = new AbortController();
        inFlightAbortControllersRef.current.set(index, controller);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          if (isCancelled) return;
          activeLoads--;
          loadedCount++;
          inFlightAbortControllersRef.current.delete(index);

          // Estimate decoded image memory
          const frameBytes = (img.naturalWidth || 1920) * (img.naturalHeight || 1080) * 4;
          currentDecodedBytes += frameBytes;

          // Decoded Memory Budget Guard: if exceeding MB budget, evict distant frames
          const totalMB = currentDecodedBytes / (1024 * 1024);
          if (totalMB > memoryBudgetMB && loadedCount > 10) {
            // Evict oldest frames distant from current playhead
            const evictIndex = images.findIndex((frame, i) => frame !== null && Math.abs(i - lastRenderedIndex) > 15);
            if (evictIndex !== -1 && images[evictIndex]) {
              images[evictIndex] = null;
              currentDecodedBytes -= frameBytes;
            }
          }

          images[index] = img;
          setLoadProgress(Math.round((loadedCount / frameCount) * 100));

          // Paint frame 0 immediately or initialize when sufficient buffer exists
          if (!hasInitializedTrigger && (index === 0 || loadedCount >= Math.min(frameCount, 8))) {
            initializeScrollTrigger('PARTIAL_READY');
          } else if (hasInitializedTrigger && index === lastRenderedIndex) {
            drawFrame(index);
          }

          if (loadedCount === frameCount) {
            setScrubState('READY');
          }

          loadNext();
        };

        img.onerror = () => {
          if (isCancelled) return;
          activeLoads--;
          inFlightAbortControllersRef.current.delete(index);
          console.warn(`[FrameScrubber] Missing frame: index ${index}`);

          if (!hasInitializedTrigger && loadedCount > 0) {
            initializeScrollTrigger('PARTIAL_READY');
          }

          loadNext();
        };

        img.src = frameUrlPattern(index);
      }
    };

    loadNext();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutTimer);
      resizeObserver.disconnect();
      // Resource disposal: release decoded Image references
      for (let i = 0; i < images.length; i++) {
        if (images[i]) {
          images[i]!.src = '';
          images[i] = null;
        }
      }
      resetState();
    };
  }, [frameCount, frameUrlPattern, aspectRatio, objectFit, isReducedMotion, memoryBudgetMB, resetState]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
      role="region"
      aria-label={altText}
    >
      {/* Reduced Motion Poster Fallback */}
      {isReducedMotion && (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={posterUrl || frameUrlPattern(0)}
            alt={altText}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Sighted Canvas Scrubber */}
      {!isReducedMotion && scrubState !== 'FAILED' && (
        <>
          <canvas
            ref={canvasRef}
            className="block max-w-full max-h-full"
            aria-hidden="true"
          />

          {/* Loading Progress Overlay */}
          {(scrubState === 'LOADING' || scrubState === 'PARTIAL_READY') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 font-mono text-xs">
              <div className="w-48 h-1 bg-white/20 rounded overflow-hidden mb-3">
                <div
                  className="h-full bg-white transition-all duration-150"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <span>PRELOADING FRAMES: {loadProgress}%</span>
            </div>
          )}

          {scrubState === 'TIMEOUT_DEGRADED' && (
            <div className="absolute bottom-4 left-4 z-10 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded font-mono text-[10px] text-amber-300 border border-amber-300/30">
              Low-bandwidth scrub active (partial sequence)
            </div>
          )}
        </>
      )}

      {/* Robust Error Fallback UI */}
      {scrubState === 'FAILED' && (
        <div className="w-full max-w-md p-8 text-center text-white/80 bg-white/5 border border-white/10 rounded-xl">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-white/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="font-serif text-lg mb-2 text-white">Media Unavailable</p>
          <p className="font-mono text-xs text-white/50 mb-4">
            {errorMessage || 'Cinematic sequence could not be loaded.'}
          </p>
          {posterUrl && (
            <img
              src={posterUrl}
              alt={altText}
              className="w-full rounded border border-white/10 mt-2"
            />
          )}
        </div>
      )}
    </div>
  );
}
```
