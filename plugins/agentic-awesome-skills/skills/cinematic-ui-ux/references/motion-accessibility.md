# Motion Accessibility (WCAG 2.2 Conformance)

Guidelines for vestibular safety, keyboard navigation, `prefers-reduced-motion` conformance, and comprehensive decorative pause controllers covering GSAP, CSS animations, HTML5 video, and Web Audio.

---

## 1. Multi-Medium Decorative Motion Pause Controller
**Architectural Invariant**: Never pause `gsap.globalTimeline` indiscriminately. Pausing the global timeline halts essential user interface transitions (such as closing modal dialogs, route transitions, and dropdown menus). Instead, provide a dedicated decorative motion channel that coordinates GSAP decorative timelines, HTML5 video elements, Web Audio contexts, and CSS animations without side-effects inside state updaters:

```tsx
// hooks/use-decorative-motion-pause.tsx
'use client';
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

interface MotionPauseContextType {
  isPaused: boolean;
  togglePause: () => void;
  registerDecorativeTween: (tween: gsap.core.Tween | gsap.core.Timeline) => () => void;
  registerVideo: (video: HTMLVideoElement) => () => void;
  registerAudioContext: (ctx: AudioContext) => () => void;
}

const MotionPauseContext = createContext<MotionPauseContextType>({
  isPaused: false,
  togglePause: () => {},
  registerDecorativeTween: () => () => {},
  registerVideo: () => () => {},
  registerAudioContext: () => () => {},
});

export function MotionPauseProvider({ children }: { children: React.ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);
  const tweensRef = useRef<Set<gsap.core.Tween | gsap.core.Timeline>>(new Set());
  const videosRef = useRef<Set<HTMLVideoElement>>(new Set());
  const audioContextsRef = useRef<Set<AudioContext>>(new Set());

  // 1. Pure State Updater (No side-effects inside state setter)
  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // 2. Synchronized Side-Effect Executor
  useEffect(() => {
    // A. GSAP Decorative Tweens
    tweensRef.current.forEach((t) => {
      if (isPaused) t.pause();
      else t.play();
    });

    // B. HTML5 Video Elements
    videosRef.current.forEach((v) => {
      if (isPaused) {
        if (!v.paused) v.pause();
      }
    });

    // C. Web Audio Contexts
    audioContextsRef.current.forEach((ctx) => {
      if (isPaused) {
        if (ctx.state === 'running') ctx.suspend().catch(() => {});
      }
    });

    // D. Global CSS Animation Pause via Document Data Attribute
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.motionPaused = isPaused ? 'true' : 'false';
    }
  }, [isPaused]);

  // Registry methods
  const registerDecorativeTween = useCallback((tween: gsap.core.Tween | gsap.core.Timeline) => {
    tweensRef.current.add(tween);
    if (isPaused) tween.pause();
    return () => {
      tweensRef.current.delete(tween);
    };
  }, [isPaused]);

  const registerVideo = useCallback((video: HTMLVideoElement) => {
    videosRef.current.add(video);
    if (isPaused && !video.paused) video.pause();
    return () => {
      videosRef.current.delete(video);
    };
  }, [isPaused]);

  const registerAudioContext = useCallback((ctx: AudioContext) => {
    audioContextsRef.current.add(ctx);
    if (isPaused && ctx.state === 'running') ctx.suspend().catch(() => {});
    return () => {
      audioContextsRef.current.delete(ctx);
    };
  }, [isPaused]);

  return (
    <MotionPauseContext.Provider
      value={{
        isPaused,
        togglePause,
        registerDecorativeTween,
        registerVideo,
        registerAudioContext,
      }}
    >
      {children}
      {/* Accessible WCAG 2.2.2 Pause Button */}
      <button
        onClick={togglePause}
        className="fixed bottom-4 left-4 z-[9999] px-3 py-1.5 bg-black/80 hover:bg-black text-white font-mono text-[11px] rounded border border-white/20 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-label={isPaused ? 'Resume decorative animations' : 'Pause decorative animations'}
      >
        {isPaused ? '▶ PLAY DECORATIVE MOTION' : '❚❚ PAUSE DECORATIVE MOTION'}
      </button>
    </MotionPauseContext.Provider>
  );
}

export function useDecorativeMotionPause() {
  return useContext(MotionPauseContext);
}
```

```css
/* Mark only decorative CSS animation elements. */
html[data-motion-paused="true"] [data-decorative-motion] {
  animation-play-state: paused !important;
}
```

---

After lifting decorative pause, let the media component decide whether to resume based on its playback controls, visibility and motion preference.

## 2. WCAG 2.2 Conformance Matrix & Specific Criteria
Adheres to official W3C Web Content Accessibility Guidelines:

| Criterion | Level | Requirement | Cinematic Implementation |
| :--- | :--- | :--- | :--- |
| **2.2.2 Pause, Stop, Hide** | Level A | For moving, blinking, or scrolling content that starts automatically, lasts > 5s, and occurs in parallel with other content, provide a pause/stop/hide control. | Controlled via `MotionPauseProvider`. Essential navigation and modal dialogs remain active. |
| **2.3.1 Three Flashes or Below Threshold** | Level A | Web pages do not contain anything that flashes more than three times in any one second period. | All specular glints and sheens capped to slow, non-flashing smooth sweeps (> 1.2s duration). |
| **2.3.3 Animation from Interactions** | Level AAA | Motion animation triggered by interaction can be disabled unless essential to functionality. | Honored through `prefers-reduced-motion: reduce` query across all components. |
| **2.1.1 Keyboard** | Level A | All functionality is operable via keyboard without requiring specific timings. | Menu focus trap, Tab key looping, Escape key closing, `<main>` focus synchronization. |
| **2.4.3 Focus Order** | Level A | Focusable components receive focus in an order that preserves meaning and operability. | Stacking z-indices (`z-[10001]`), inert closed navigation, restored original tabindices. |
| **4.1.2 Name, Role, Value** | Level A | Name and role of all UI components can be programmatically determined. | Single `aria-label` strategy on headings; `role="progressbar"` with `aria-valuenow` on reading bar. |
