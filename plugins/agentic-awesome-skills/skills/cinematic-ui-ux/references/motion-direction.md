# Cinematic Motion Direction & Storytelling

The Motion Director orchestrates narrative rhythm, 5-act storyboards, and non-linear chapter navigation.

---

## 1. Flexible Pacing Based on User Intent
- **Utility / Conversion Flows**: 150ms – 250ms immediate feedback.
- **Productivity Dashboards**: 200ms – 300ms functional staggers.
- **Luxury Brand Storytelling**: 800ms – 1400ms immersive pacing with breathing room.

---

## 2. Reduced-Motion 5-Act Storyboard Alternative
When `prefers-reduced-motion: reduce` is detected, the 5-act narrative shifts from temporal motion to spatial clarity:
- **Act I (Hero)**: Headline and key imagery are rendered immediately at 100% opacity without letter stagger.
- **Act II (Discovery)**: Side-by-side grid replaces the scroll-scrubbed split reveal.
- **Act III (Immersion)**: Pinned multi-layer scrub is replaced with a scrollable card carousel.
- **Act IV (Climax)**: Fullscreen video auto-play is paused; a high-res poster is shown with an accessible "Play Video" button.
- **Act V (Conversion)**: Fixed sticky CTA remains immediately interactive.

---

## 3. Non-Linear Navigation & Chapter Skipping
Experiences must allow visitors to jump directly between narrative chapters using an accessible header index without breaking ScrollTrigger pin positions:
```typescript
export function jumpToChapter(chapterSelector: string, lenis: any) {
  const target = document.querySelector(chapterSelector);
  if (!target) return;
  lenis?.scrollTo(target, { offset: -80, duration: 1.0 });
}
```
