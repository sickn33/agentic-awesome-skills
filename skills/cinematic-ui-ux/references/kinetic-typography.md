# Kinetic Typography & Editorial Motion

Techniques for editorial and high-fashion typographic choreography that include a screen-reader label and synchronize with font loading. Verify segmentation, visible spacing, wrapping, and screen-reader output in each supported locale.

---

## 1. International Script Splitting via `Intl.Segmenter`
Splits text into animation units. This example filters whitespace and adds layout gaps, which can change typography in scripts that do not use spaces or around punctuation. Preserve separators and inline layout when required:

```typescript
// lib/motion/typography.ts

/**
 * Splits text into locale-aware words while preserving natural word boundaries.
 */
export function segmentWords(text: string, locale = 'en'): string[] {
  if (!text) return [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter(locale, { granularity: 'word' });
    const segments = Array.from((segmenter as any).segment(text), (s: any) => s.segment);
    // Filter out purely whitespace segments while preserving word order
    return segments.filter((s: string) => s.trim().length > 0);
  }

  // Safe regex fallback
  return text.split(/\s+/).filter(Boolean);
}
```

---

## 2. Accessible Kinetic Headline Component
Configured with `revertOnUpdate: true` in `useGSAP` to clean up accumulated tweens when props change, monitors `locale`, and preserves natural line wrapping across responsive viewports:

```tsx
// components/motion/accessible-split-heading.tsx
'use client';
import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { segmentWords } from '@/lib/motion/typography';

interface SplitHeadingProps {
  text: string;
  locale?: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export function AccessibleSplitHeading({
  text,
  locale = 'en',
  className = '',
  as: Tag = 'h1',
}: SplitHeadingProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const [isFontsLoaded, setIsFontsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        if (isMounted) setIsFontsLoaded(true);
      });
    } else {
      setIsFontsLoaded(true);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const words = segmentWords(text, locale);

  useGSAP(
    () => {
      if (!isFontsLoaded) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.animated-word', { yPercent: 0, opacity: 1 });
        return;
      }

      gsap.from('.animated-word', {
        yPercent: 110,
        opacity: 0,
        duration: 1.2,
        stagger: 0.04,
        ease: 'power4.out',
      });
    },
    {
      scope: containerRef,
      dependencies: [text, isFontsLoaded, locale],
      revertOnUpdate: true, // Prevents accumulated tweens on re-render
    }
  );

  return (
    <Tag
      ref={containerRef}
      className={`split-heading-container flex flex-wrap gap-x-[0.28em] ${className}`}
      aria-label={text}
    >
      {/* Sighted animated view with aria-hidden="true" */}
      <span aria-hidden="true" className="contents">
        {words.map((word, i) => (
          <span key={`${i}-${word}`} className="inline-block overflow-hidden py-0.5">
            <span className="animated-word inline-block">{word}</span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
```
