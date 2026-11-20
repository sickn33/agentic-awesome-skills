# Integration Example: Scroll-Driven Longform Editorial

Illustrative Next.js 15 + React 19 component for an immersive magazine layout with **compositor-friendly `scaleX` reading progress active in reduced motion**, **native scrollTo fallback when Lenis is disabled**, **React ref chapter tracking**, and **accessible video with live reduced-motion preference monitoring and self-contained captions**.

```tsx
// components/editorial/scroll-editorial.tsx
'use client';
import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLenisContext } from '@/components/motion/lenis-provider';
import { useDecorativeMotionPause } from '@/hooks/use-decorative-motion-pause';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface Chapter {
  id: string;
  title: string;
  body: string;
}

const CHAPTERS_DATA: Chapter[] = [
  {
    id: 'ch-genesis',
    title: 'The Genesis of Raw Mulberry Silk',
    body: 'Raw silk fibers are extracted and graded according to tensile density. In traditional looms, the alignment of the warp forms the structural basis of the textile.',
  },
  {
    id: 'ch-handloom',
    title: 'The Geometry of the Varanasi Loom',
    body: 'Handloom jacquards translate complex graph paper patterns into perforated punch cards, establishing a tactile binary precursor to modern computation.',
  },
  {
    id: 'ch-metallurgy',
    title: 'The Zari Metallurgy and Electroplating',
    body: 'Real zari threads are produced by flattening silver wire over pure silk core filaments, followed by a gold electroplating bath to achieve luster.',
  },
];

export function ScrollEditorial() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  const [activeChapter, setActiveChapter] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  // Consume shared application-wide Lenis context (includes instant fallback under reduced motion)
  const { scrollTo } = useLenisContext();
  const { isPaused, registerVideo } = useDecorativeMotionPause();

  // Video IntersectionObserver with Dynamic Reduced-Motion Monitoring
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const unregisterVideo = registerVideo(video);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches && !video.paused) {
        video.pause();
      }
    };
    motionQuery.addEventListener('change', handleMotionChange);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!motionQuery.matches && !isPaused) {
              video.play().catch(() => {});
            }
          } else {
            if (!video.paused) {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      unregisterVideo();
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [isPaused, registerVideo]);

  // Track Reading Progress via GPU Compositor (scaleX)
  // ACTIVE UNIVERSALLY across normal and reduced motion
  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (progressBarRef.current) {
            gsap.set(progressBarRef.current, { scaleX: self.progress });
          }
          setProgressPercent(Math.round(self.progress * 100));
        },
      });

      chapterRefs.current.forEach((el, idx) => {
        if (!el) return;
        ScrollTrigger.create({
          trigger: el,
          start: 'top 40%',
          end: 'bottom 40%',
          onEnter: () => setActiveChapter(idx),
          onEnterBack: () => setActiveChapter(idx),
        });
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="bg-[#FAF8F5] text-[#1E1C1A] min-h-screen">
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
        className="fixed top-0 left-0 right-0 h-1.5 bg-black/10 z-50"
      >
        <div
          ref={progressBarRef}
          className="h-full w-full bg-[#A85832] origin-left"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col md:flex-row gap-16">
        <aside className="md:w-64 flex-shrink-0">
          <div className="sticky top-24 font-mono text-xs">
            <span className="text-black/40 uppercase tracking-widest block mb-4">Chapters</span>
            <nav className="flex flex-col gap-3">
              {CHAPTERS_DATA.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    const el = chapterRefs.current[idx];
                    if (el) {
                      // Uses context scrollTo which safely falls back to window.scrollTo under reduced motion
                      scrollTo(el, { offset: -80 });
                    }
                  }}
                  className={`text-left transition-colors ${
                    activeChapter === idx
                      ? 'text-[#A85832] font-bold'
                      : 'text-black/60 hover:text-black'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}. {ch.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 max-w-2xl">
          {CHAPTERS_DATA.map((ch, idx) => (
            <article
              key={ch.id}
              ref={(el) => {
                chapterRefs.current[idx] = el;
              }}
              className="mb-24"
            >
              <h2 className="text-3xl md:text-5xl font-serif mb-6">{ch.title}</h2>
              <p className="text-lg leading-relaxed text-black/80 font-serif mb-8">{ch.body}</p>

              {idx === 1 && (
                <figure className="my-12">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black/10 border border-black/10">
                    <video
                      ref={videoRef}
                      loop
                      muted
                      playsInline
                      controls
                      poster="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='800' height='450' fill='%23141311'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23C9A86A' font-family='serif' font-size='24'>Handloom Jacquard Craftsmanship</text></svg>"
                      className="w-full h-full object-cover"
                    >
                      {/* Self-contained data URI captions track */}
                      <track
                        kind="captions"
                        src="data:text/vtt;utf8,WEBVTT%0A%0A00:00.000%20-->%2000:10.000%0AMaster%20weaver%20manipulating%20warp%20tension%20on%20a%20jacquard%20loom."
                        srcLang="en"
                        label="English captions"
                        default
                      />
                      Your browser does not support HTML5 video.
                    </video>
                  </div>
                  <figcaption className="mt-3 font-mono text-xs text-black/50 text-center">
                    Fig 2.1 — Master weaver manipulating warp tension on a 19th-century jacquard apparatus.
                  </figcaption>
                </figure>
              )}
            </article>
          ))}
        </main>
      </div>
    </div>
  );
}
```
