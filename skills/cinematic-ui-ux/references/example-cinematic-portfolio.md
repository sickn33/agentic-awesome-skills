# Integration Example: Cinematic Studio Portfolio

Illustrative Next.js 15 + React 19 project showcase with **Lenis-coordinated smooth scroll**, **scoped GSAP card queries**, **compositor-only background crossfades**, **aligned 1024px breakpoints**, **accessible vertical stack for mobile AND reduced-motion desktop**, and **declarative `<TransitionLink>` integration**.

```tsx
// components/portfolio/horizontal-portfolio.tsx
'use client';
import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { TransitionLink } from '@/components/motion/transition-link';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface Project {
  id: string;
  title: string;
  category: string;
  year: string;
  href: string;
  themeColor: string;
  accentColor: string;
}

const PROJECTS: Project[] = [
  {
    id: 'cyclonesense',
    title: 'CycloneSense',
    category: 'Earth Observation AI',
    year: '2026',
    href: '/work/cyclonesense',
    themeColor: '#0A0E17',
    accentColor: '#4A90E2',
  },
  {
    id: 'guardai',
    title: 'GuardAI',
    category: 'Cyber Threat Telemetry',
    year: '2026',
    href: '/work/guardai',
    themeColor: '#100B14',
    accentColor: '#9B51E0',
  },
  {
    id: 'schemasense',
    title: 'SchemaSense',
    category: 'Multi-Cloud SQL Steward',
    year: '2026',
    href: '/work/schemasense',
    themeColor: '#081210',
    accentColor: '#27AE60',
  },
  {
    id: 'vyshuuu',
    title: 'Vyshuuu',
    category: 'Haute Couture Digital',
    year: '2026',
    href: '/work/vyshuuu',
    themeColor: '#170A0A',
    accentColor: '#C9A86A',
  },
];

export function CinematicPortfolio() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia('(pointer: fine)').matches || isReducedMotion) return;

    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.3, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.3, ease: 'power3.out' });

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      gsap.killTweensOf(cursor);
    };
  }, [isReducedMotion]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        // Scoped to current container element to prevent global query collisions
        const cards = gsap.utils.toArray<HTMLElement>('.portfolio-card', containerRef.current);
        const totalCards = cards.length;

        gsap.to(cards, {
          xPercent: -100 * (totalCards - 1),
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            pin: true,
            scrub: 1,
            snap: totalCards > 1 ? 1 / (totalCards - 1) : 0,
            end: () => `+=${window.innerWidth * (totalCards - 1)}`,
            onUpdate: (self) => {
              const nextIdx = Math.min(
                totalCards - 1,
                Math.max(0, Math.round(self.progress * (totalCards - 1)))
              );
              setActiveProjectIndex(nextIdx);
            },
          },
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="relative w-full min-h-screen overflow-hidden bg-black text-white">
      {PROJECTS.map((p, idx) => (
        <div
          key={`bg-${p.id}`}
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none transition-opacity duration-700 ease-out"
          style={{
            backgroundColor: p.themeColor,
            opacity: activeProjectIndex === idx ? 1 : 0,
          }}
        />
      ))}

      <div
        ref={cursorRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-white/40 pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 hidden lg:block mix-blend-difference"
      />

      {/* Desktop Horizontal Track: Aligned to 1024px+ and no-reduced-motion */}
      {!isReducedMotion && (
        <div
          ref={trackRef}
          className="hidden lg:flex h-[100svh] items-center"
          style={{ width: `${PROJECTS.length * 100}vw` }}
        >
          {PROJECTS.map((project) => (
            <section
              key={project.id}
              className="portfolio-card w-[100vw] h-full flex flex-col justify-center px-16 relative"
            >
              <div className="max-w-4xl">
                <span className="font-mono text-xs text-white/50 tracking-widest block mb-2">
                  {project.year} / {project.category}
                </span>
                <TransitionLink
                  href={project.href}
                  className="group block text-6xl lg:text-9xl font-serif text-white tracking-tight my-4 hover:text-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A86A]"
                >
                  {project.title}
                  <span className="inline-block ml-4 text-4xl font-sans group-hover:translate-x-3 transition-transform">
                    →
                  </span>
                </TransitionLink>

                <div className="w-64 h-36 rounded-lg overflow-hidden border border-white/10 mt-6 bg-white/5">
                  <svg className="w-full h-full" viewBox="0 0 256 144" fill="none" aria-hidden="true">
                    <rect width="256" height="144" fill={project.themeColor} />
                    <circle cx="128" cy="72" r="36" stroke={project.accentColor} strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 60 72 Q 128 20 196 72 T 256 72" stroke={project.accentColor} strokeWidth="1.5" strokeOpacity="0.6" />
                  </svg>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Vertical Stack: mobile (< 1024px) OR reduced-motion desktop */}
      <div className={`${!isReducedMotion ? 'lg:hidden' : 'block'} flex flex-col gap-16 px-6 py-24 relative z-10 max-w-4xl mx-auto`}>
        {PROJECTS.map((project) => (
          <article key={`mob-${project.id}`} className="border-b border-white/10 pb-12">
            <span className="font-mono text-xs text-white/50 block mb-1">
              {project.year} / {project.category}
            </span>
            <TransitionLink href={project.href} className="text-4xl md:text-6xl font-serif block text-white mt-2 hover:text-[#C9A86A] transition-colors">
              {project.title} →
            </TransitionLink>
            <div className="w-full h-48 rounded-lg overflow-hidden border border-white/10 mt-4 bg-white/5">
              <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" aria-hidden="true">
                <rect width="400" height="200" fill={project.themeColor} />
                <circle cx="200" cy="100" r="48" stroke={project.accentColor} strokeWidth="2" />
              </svg>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
```
