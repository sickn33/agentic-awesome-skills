// react-spline-wrapper.tsx
// Production-ready Spline wrapper for React / Next.js
// Features: lazy loading, mobile detection, GPU check, fallback, fade-in on load
//
// Usage:
//   <SplineBackground sceneUrl="https://prod.spline.design/XXXXX/scene.splinecode" />

import { lazy, Suspense, useState, useEffect, useRef } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineBackgroundProps {
  sceneUrl: string;
  fallbackColor?: string;
  fallbackImageUrl?: string;
  mobileBreakpoint?: number;
  className?: string;
  children?: React.ReactNode;
}

function shouldLoadSpline(mobileBreakpoint: number): boolean {
  if (typeof window === 'undefined') return false; // SSR guard

  const isMobile = window.innerWidth < mobileBreakpoint;
  const isLowEnd = navigator.hardwareConcurrency <= 2;

  // Check WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  const noWebGL = !gl;

  return !isMobile && !isLowEnd && !noWebGL;
}

export default function SplineBackground({
  sceneUrl,
  fallbackColor = '#0a0a0a',
  fallbackImageUrl,
  mobileBreakpoint = 768,
  className = '',
  children,
}: SplineBackgroundProps) {
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [splineFailed, setSplineFailed] = useState(false);
  const [canLoad, setCanLoad] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setCanLoad(shouldLoadSpline(mobileBreakpoint));
  }, [mobileBreakpoint]);

  useEffect(() => {
    if (!canLoad) return;

    // If Spline hasn't loaded after 8 seconds, show fallback
    timeoutRef.current = setTimeout(() => {
      if (!splineLoaded) {
        setSplineFailed(true);
      }
    }, 8000);

    return () => clearTimeout(timeoutRef.current);
  }, [canLoad, splineLoaded]);

  function onLoad() {
    clearTimeout(timeoutRef.current);
    setSplineLoaded(true);
  }

  const showFallback = !canLoad || splineFailed;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}
    >
      {/* Fallback layer — always rendered underneath */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: fallbackImageUrl
            ? `url(${fallbackImageUrl}) center/cover no-repeat`
            : fallbackColor,
          // Fade out once Spline loads
          opacity: splineLoaded && !showFallback ? 0 : 1,
          transition: 'opacity 0.6s ease',
        }}
      />

      {/* Spline scene — only on capable devices */}
      {canLoad && !splineFailed && (
        <Suspense fallback={null}>
          <Spline
            scene={sceneUrl}
            onLoad={onLoad}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0,
              // Fade in when ready
              opacity: splineLoaded ? 1 : 0,
              transition: 'opacity 0.6s ease',
              // Don't block clicks on content above
              // Change to 'all' if you want mouse interaction with the scene
              pointerEvents: 'none',
            }}
          />
        </Suspense>
      )}

      {/* Content sits on top of everything */}
      {children && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}
