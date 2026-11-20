# Integration Example: Luxury Timepiece Story

Illustrative Next.js 15 + React 19 scroll-driven product deconstruction with **pause-controller-registered rotation**, **typed audio status**, **page visibility suspension**, and **safe AudioContext lifecycle cleanup**.

```tsx
// components/product/timepiece-story.tsx
'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useDecorativeMotionPause } from '@/hooks/use-decorative-motion-pause';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type AudioState = 'UNINITIALIZED' | 'RUNNING' | 'SUSPENDED' | 'BLOCKED' | 'ERROR';

export function TimepieceStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const unregisterAudioRef = useRef<(() => void) | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [audioStatus, setAudioStatus] = useState<AudioState>('UNINITIALIZED');
  const isAudioMutedRef = useRef(true);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  const { isPaused, registerDecorativeTween, registerAudioContext } = useDecorativeMotionPause();

  const toggleAudio = useCallback(async () => {
    if (isAudioMuted) {
      if (isPaused) return;
      try {
        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) {
            setAudioStatus('ERROR');
            return;
          }
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          unregisterAudioRef.current = registerAudioContext(ctx);
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        setAudioStatus('RUNNING');
        setIsAudioMuted(false);
      } catch (err) {
        console.warn('[Audio] Playback blocked or failed:', err);
        setAudioStatus('BLOCKED');
      }
    } else {
      setIsAudioMuted(true);
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        await audioContextRef.current.suspend().catch(() => {});
        setAudioStatus('SUSPENDED');
      }
    }
  }, [isAudioMuted, isPaused, registerAudioContext]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (document.hidden) {
        if (ctx.state === 'running') {
          await ctx.suspend().catch(() => {});
          setAudioStatus('SUSPENDED');
        }
      } else {
        if (!isPaused && !isAudioMutedRef.current && ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
          setAudioStatus('RUNNING');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPaused]);

  useEffect(() => {
    return () => {
      unregisterAudioRef.current?.();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  const playMechanicalTick = () => {
    if (isAudioMutedRef.current) return;
    try {
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state !== 'running') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      console.warn('[Audio] Mechanical tick playback error:', e);
    }
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Continuous decorative gear rotation managed via GSAP and registered with pause controller
        const gearContinuousTween = gsap.to('.gear-decorative-spokes', {
          rotation: 360,
          repeat: -1,
          ease: 'none',
          duration: 16,
        });
        registerDecorativeTween(gearContinuousTween);

        let lastStep = 0;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: '+=250%',
            pin: true,
            scrub: 1,
            onUpdate: (self) => {
              if (self.direction > 0) {
                const currentStep = Math.floor(self.progress * 10);
                if (currentStep > lastStep) {
                  playMechanicalTick();
                  lastStep = currentStep;
                }
              } else {
                lastStep = Math.floor(self.progress * 10);
              }
            },
          },
        });
        registerDecorativeTween(tl);

        tl.to('.case-outer', { yPercent: -60, ease: 'none' }, 0)
          .to('.gear-movement', { scale: 1.35, rotation: 180, ease: 'none' }, 0)
          .to('.dial-face', { opacity: 0, ease: 'none' }, 0);
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.case-outer', { yPercent: 0 });
        gsap.set('.gear-movement', { scale: 1, rotation: 0 });
        gsap.set('.gear-decorative-spokes', { rotation: 0 });
        gsap.set('.dial-face', { opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="h-[100svh] w-full bg-[#080808] text-white flex items-center justify-center relative overflow-hidden"
    >
      <div className="absolute top-8 left-8 font-mono text-xs text-white/50">
        CHRONOMETRE CALIBRE 01
      </div>

      <div className="absolute top-8 right-8 z-20 flex items-center gap-3">
        {audioStatus === 'BLOCKED' && (
          <span className="font-mono text-[10px] text-amber-400">Autoplay Blocked</span>
        )}
        <button
          onClick={toggleAudio}
          aria-pressed={!isAudioMuted}
          className="px-3 py-1.5 rounded border border-white/20 font-mono text-xs text-white/80 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-[#C9A86A]"
        >
          {isAudioMuted ? 'ENABLE SOUND' : 'MUTE SOUND'}
        </button>
      </div>

      <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center">
        <div className="case-outer absolute inset-0 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 384 384" fill="none" aria-hidden="true">
            <circle cx="192" cy="192" r="180" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
          </svg>
        </div>
        <div className="gear-movement absolute w-48 h-48 rounded-full border border-[#C9A86A]/40 flex items-center justify-center">
          <svg className="gear-decorative-spokes w-full h-full" viewBox="0 0 192 192" fill="none" aria-hidden="true">
            <circle cx="96" cy="96" r="80" stroke="#C9A86A" strokeWidth="2" strokeDasharray="8 8" />
            <line x1="96" y1="16" x2="96" y2="176" stroke="#C9A86A" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="16" y1="96" x2="176" y2="96" stroke="#C9A86A" strokeWidth="1" strokeOpacity="0.5" />
          </svg>
        </div>
        <div className="dial-face absolute inset-4 rounded-full bg-black/80 border border-white/10 flex items-center justify-center font-serif text-2xl tracking-widest text-white/90">
          XII
        </div>
      </div>

      <div className="absolute bottom-8 right-8 font-mono text-xs text-[#C9A86A]">
        MECHANICAL SYNCHRONIZATION
      </div>
    </div>
  );
}
```
