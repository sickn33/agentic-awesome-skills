# Integration Example: Luxury Banarasi Saree Campaign

Illustrative Next.js 15 + React 19 luxury saree experience using **pause controller registration**, **authenticity-preserving soft sheen**, **explicit mock metadata disclaimers**, and an **actionable conversion CTA**.

```tsx
// components/couture/saree-campaign.tsx
'use client';
import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useDecorativeMotionPause } from '@/hooks/use-decorative-motion-pause';
import { TransitionLink } from '@/components/motion/transition-link';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function SareeCampaign() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);

  const { registerDecorativeTween } = useDecorativeMotionPause();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const headlineTween = gsap.from('.couture-word', {
          yPercent: 110,
          opacity: 0,
          duration: 1.2,
          stagger: 0.06,
          ease: 'power4.out',
        });
        registerDecorativeTween(headlineTween);

        if (sheenRef.current) {
          const sheenTween = gsap.fromTo(
            sheenRef.current,
            { xPercent: -100 },
            {
              xPercent: 100,
              duration: 2.2,
              ease: 'power2.inOut',
              scrollTrigger: {
                trigger: '.pallu-section',
                start: 'top 65%',
                end: 'bottom 20%',
                scrub: 1,
              },
            }
          );
          registerDecorativeTween(sheenTween);
        }
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.couture-word', { yPercent: 0, opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="bg-[#0A0908] text-[#F4F1EA] min-h-screen">
      <section className="h-[100svh] flex flex-col justify-center items-center text-center px-6 relative overflow-hidden">
        <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-[#C9A86A] mb-4">
          Heritage Archive
        </span>
        <h1
          className="text-5xl md:text-8xl font-serif tracking-tight max-w-4xl"
          aria-label="The Unstitched Continuum"
        >
          <span aria-hidden="true" className="block overflow-hidden py-1">
            {['The', 'Unstitched', 'Continuum'].map((word, i) => (
              <span key={i} className="couture-word inline-block mr-3">
                {word}
              </span>
            ))}
          </span>
        </h1>
        <p className="mt-6 text-sm text-[#F4F1EA]/70 max-w-md font-light">
          A study in Varanasi gold zari brocade and pure mulberry silk, handwoven on traditional master looms.
        </p>
      </section>

      <section className="pallu-section min-h-screen py-24 px-6 md:px-16 flex flex-col items-center">
        <div className="relative w-full max-w-5xl aspect-[16/10] overflow-hidden rounded-lg bg-[#141311] border border-white/10">
          <svg className="w-full h-full" viewBox="0 0 1600 1000" fill="none" aria-hidden="true">
            <rect width="1600" height="1000" fill="#141311" />
            <path d="M 0 500 Q 400 300 800 500 T 1600 500" stroke="#C9A86A" strokeWidth="1.5" strokeOpacity="0.4" />
            <path d="M 0 550 Q 400 350 800 550 T 1600 550" stroke="#C9A86A" strokeWidth="1" strokeOpacity="0.25" />
            <circle cx="800" cy="500" r="180" stroke="#C9A86A" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="6 6" />
          </svg>

          <div
            ref={sheenRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/15 to-transparent mix-blend-soft-light"
          />
        </div>
      </section>

      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-white/10 text-center">
        <h2 className="text-2xl font-serif text-[#C9A86A] mb-8">Artisan Provenance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-xs mb-8">
          <div className="p-4 bg-white/5 rounded border border-white/5">
            <span className="text-white/40 block">LOOM ORIGIN</span>
            <span className="text-white">Varanasi, UP [MOCK]</span>
          </div>
          <div className="p-4 bg-white/5 rounded border border-white/5">
            <span className="text-white/40 block">WARP / WEFT</span>
            <span className="text-white">120 × 140 DPI [MOCK]</span>
          </div>
          <div className="p-4 bg-white/5 rounded border border-white/5">
            <span className="text-white/40 block">EST. WEAVE</span>
            <span className="text-white">340 Hours [MOCK]</span>
          </div>
          <div className="p-4 bg-white/5 rounded border border-white/5">
            <span className="text-white/40 block">METALLIC PURITY</span>
            <span className="text-white">Gold Zari [MOCK]</span>
          </div>
        </div>

        <p className="text-[10px] font-mono text-white/40 mb-12">
          *Notice: Specifications marked [MOCK] represent illustrative storyboarding tokens. Authenticated batch certificates accompany verified physical pieces.
        </p>

        <TransitionLink
          href="/archive"
          className="inline-block px-8 py-4 bg-[#C9A86A] text-black font-serif tracking-wide rounded hover:bg-[#E0C082] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Explore the Heritage Archive →
        </TransitionLink>
      </section>
    </div>
  );
}
```
