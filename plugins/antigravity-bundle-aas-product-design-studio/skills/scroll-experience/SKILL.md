---
name: scroll-experience
description: Expert in building immersive scroll-driven experiences - parallax
  storytelling, scroll animations, interactive narratives, and cinematic web
  experiences. Like NY Times interactives, Apple product pages, and
  award-winning web experiences.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Scroll Experience

Expert in building immersive scroll-driven experiences - parallax storytelling,
scroll animations, interactive narratives, and cinematic web experiences. Like
NY Times interactives, Apple product pages, and award-winning web experiences.
Makes websites feel like experiences, not just pages.

**Role**: Scroll Experience Architect

You see scrolling as a narrative device, not just navigation. You create
moments of delight as users scroll. You know when to use subtle animations
and when to go cinematic. You balance performance with visual impact. You
make websites feel like movies you control with your thumb.

### Expertise

- Scroll animations
- Parallax effects
- GSAP ScrollTrigger
- Framer Motion
- Performance optimization
- Storytelling through scroll

## Capabilities

- Scroll-driven animations
- Parallax storytelling
- Interactive narratives
- Cinematic web experiences
- Scroll-triggered reveals
- Progress indicators
- Sticky sections
- Scroll snapping

## Patterns

### Scroll Animation Stack

Tools and techniques for scroll animations

**When to use**: When planning scroll-driven experiences

## Scroll Animation Stack

### Library Options
| Library | Best For | Learning Curve |
|---------|----------|----------------|
| GSAP ScrollTrigger | Complex animations | Medium |
| Framer Motion | React projects | Low |
| Locomotive Scroll | Smooth scroll + parallax | Medium |
| Lenis | Smooth scroll only | Low |
| CSS scroll-timeline | Simple, native | Low |

### GSAP ScrollTrigger Setup
```javascript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Basic scroll animation
gsap.to('.element', {
  scrollTrigger: {
    trigger: '.element',
    start: 'top center',
    end: 'bottom center',
    scrub: true, // Links animation to scroll position
  },
  y: -100,
  opacity: 1,
});
```

### Framer Motion Scroll
```jsx
import { motion, useScroll, useTransform } from 'framer-motion';

function ParallaxSection() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);

  return (
    <motion.div style={{ y }}>
      Content moves with scroll
    </motion.div>
  );
}
```

### CSS Native (2024+)
```css
@keyframes reveal {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-on-scroll {
  animation: reveal linear;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}
```

### Parallax Storytelling

Tell stories through scroll depth

**When to use**: When creating narrative experiences

## Parallax Storytelling

### Layer Speeds
| Layer | Speed | Effect |
|-------|-------|--------|
| Background | 0.2x | Far away, slow |
| Midground | 0.5x | Middle depth |
| Foreground | 1.0x | Normal scroll |
| Content | 1.0x | Readable |
| Floating elements | 1.2x | Pop forward |

### Creating Depth
```javascript
// GSAP parallax layers
gsap.to('.background', {
  scrollTrigger: {
    scrub: true
  },
  y: '-20%', // Moves slower
});

gsap.to('.foreground', {
  scrollTrigger: {
    scrub: true
  },
  y: '-50%', // Moves faster
});
```

### Story Beats
```
Section 1: Hook (full viewport, striking visual)
    ↓ scroll
Section 2: Context (text + supporting visuals)
    ↓ scroll
Section 3: Journey (parallax storytelling)
    ↓ scroll
Section 4: Climax (dramatic reveal)
    ↓ scroll
Section 5: Resolution (CTA or conclusion)
```

### Text Reveals
- Fade in on scroll
- Typewriter effect on trigger
- Word-by-word highlight
- Sticky text with changing visuals

### Sticky Sections

Pin elements while scrolling through content

**When to use**: When content should stay visible during scroll

## Sticky Sections

### CSS Sticky
```css
.sticky-container {
  height: 300vh; /* Space for scrolling */
}

.sticky-element {
  position: sticky;
  top: 0;
  height: 100vh;
}
```

### GSAP Pin
```javascript
gsap.to('.content', {
  scrollTrigger: {
    trigger: '.section',
    pin: true, // Pins the section
    start: 'top top',
    end: '+=1000', // Pin for 1000px of scroll
    scrub: true,
  },
  // Animate while pinned
  x: '-100vw',
});
```

### Horizontal Scroll Section
```javascript
const sections = gsap.utils.toArray('.panel');

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-container',
    pin: true,
    scrub: 1,
    end: () => '+=' + document.querySelector('.horizontal-container').offsetWidth,
  },
});
```

### Use Cases
- Product feature walkthrough
- Before/after comparisons
- Step-by-step processes
- Image galleries

### Performance Optimization

Keep scroll experiences smooth

**When to use**: Always - scroll jank kills experiences

## Performance Optimization

### The 60fps Rule
- Animations must hit 60fps
- Only animate transform and opacity
- Use will-change sparingly
- Test on real mobile devices

### GPU-Friendly Properties
| Safe to Animate | Avoid Animating |
|-----------------|-----------------|
| transform | width/height |
| opacity | top/left/right/bottom |
| filter | margin/padding |
| clip-path | font-size |

### Lazy Loading
```javascript
// Only animate when in viewport
ScrollTrigger.create({
  trigger: '.heavy-section',
  onEnter: () => initHeavyAnimation(),
  onLeave: () => destroyHeavyAnimation(),
});
```

### Mobile Considerations
- Reduce parallax intensity
- Fewer animated layers
- Consider disabling on low-end
- Test on throttled CPU

### Debug Tools
```javascript
// GSAP markers for debugging
scrollTrigger: {
  markers: true, // Shows trigger points
}
```

## Sharp Edges

### Animations stutter during scroll

Severity: HIGH

Situation: Scroll animations aren't smooth 60fps

Symptoms:
- Choppy animations
- Laggy scroll
- CPU spikes during scroll
- Mobile especially bad

Why this breaks:
Animating wrong properties.
Too many elements animating.
Heavy JavaScript on scroll.
No GPU acceleration.

Recommended fix:

## Fixing Scroll Jank

### Only Animate These
```css
/* GPU-accelerated, smooth */
transform: translateX(), translateY(), scale(), rotate()
opacity: 0 to 1

/* Triggers layout, causes jank */
width, height, top, left, margin, padding
```

### Force GPU Acceleration
```css
.animated-element {
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
}
```

### Throttle Scroll Events
```javascript
// Don't do this
window.addEventListener('scroll', heavyFunction);

// Do this instead
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      heavyFunction();
      ticking = false;
    });
    ticking = true;
  }
});

// Or use GSAP (handles this automatically)
```

### Debug Performance
- Chrome DevTools → Performance tab
- Record scroll, look for red frames
- Check "Rendering" → Paint flashing
- Profile on mobile device

### Parallax breaks on mobile devices

Severity: HIGH

Situation: Parallax effects glitch on iOS/Android

Symptoms:
- Glitchy on iPhone
- Stuttering on scroll
- Elements jumping
- Works on desktop, broken on mobile

Why this breaks:
Mobile browsers handle scroll differently.
iOS momentum scrolling conflicts.
Transform during scroll is tricky.
Performance varies wildly.

Recommended fix:

## Mobile-Safe Parallax

### Detection
```javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
// Or better: check viewport width
const isMobile = window.innerWidth < 768;
```

### Reduce or Disable
```javascript
if (isMobile) {
  // Simpler animations
  gsap.to('.element', {
    scrollTrigger: { scrub: true },
    y: -50, // Less movement than desktop
  });
} else {
  // Full parallax
  gsap.to('.element', {
    scrollTrigger: { scrub: true },
    y: -200,
  });
}
```

### iOS-Specific Fix
```css
/* Helps with iOS scroll issues */
.scroll-container {
  -webkit-overflow-scrolling: touch;
}

.parallax-layer {
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}
```

### Alternative: CSS Only
```css
/* Works better on mobile */
@supports (animation-timeline: scroll()) {
  .parallax {
    animation: parallax linear;
    animation-timeline: scroll();
  }
}
```

### Scroll experience is inaccessible

Severity: MEDIUM

Situation: Screen readers and keyboard users can't use the site

Symptoms:
- Failed accessibility audit
- Can't navigate with keyboard
- Screen reader doesn't work
- Vestibular disorder complaints

Why this breaks:
Animations hide content.
Scroll hijacking breaks navigation.
No reduced motion support.
Focus management ignored.

Recommended fix:

## Accessible Scroll Experiences

### Respect Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  initScrollAnimations();
}
```

### Content Always Accessible
- Don't hide content behind animations
- Ensure text is readable without JS
- Provide skip links
- Test with screen reader

### Keyboard Navigation
```javascript
// Ensure scroll sections are keyboard navigable
document.querySelectorAll('.scroll-section').forEach(section => {
  section.setAttribute('tabindex', '0');
});
```

### Critical content hidden below animations

Severity: MEDIUM

Situation: Users have to scroll through animations to find content

Symptoms:
- High bounce rate
- Low time on page (paradoxically)
- SEO ranking issues
- User complaints about finding info

Why this breaks:
Prioritized experience over content.
Long scroll to reach info.
SEO suffering.
Mobile users bounce.

Recommended fix:

## Content-First Scroll Design

### Above-the-Fold Content
- Key message visible immediately
- CTA visible without scroll
- Value proposition clear
- Skip animation option

### Progressive Enhancement
```
Level 1: Content readable without JS
Level 2: Basic styling and layout
Level 3: Scroll animations enhance
```

### SEO Considerations
- Text in DOM, not just in canvas
- Proper heading hierarchy
- Content not hidden by default
- Fast initial load

### Quick Exit Points
- Clear navigation always visible
- Skip to content links
- Don't trap users in experience

## Validation Checks

### No Reduced Motion Support

Severity: HIGH

Message: Not respecting reduced motion preference - accessibility issue.

Fix action: Add prefers-reduced-motion media query to disable/reduce animations

### Unthrottled Scroll Events

Severity: MEDIUM

Message: Scroll events may not be throttled - potential jank.

Fix action: Use requestAnimationFrame or GSAP ScrollTrigger for smooth performance

### Animating Layout-Triggering Properties

Severity: MEDIUM

Message: Animating layout properties causes jank.

Fix action: Use transform (translate, scale) and opacity instead

### Missing will-change Optimization

Severity: LOW

Message: Consider adding will-change for heavy animations.

Fix action: Add will-change: transform to frequently animated elements

### Scroll Hijacking Detected

Severity: MEDIUM

Message: May be hijacking scroll behavior.

Fix action: Let users scroll naturally, use scrub animations instead

## Collaboration

### Delegation Triggers

- 3D|WebGL|three.js|spline -> 3d-web-experience (3D elements in scroll experience)
- react|vue|next|framework -> frontend (Frontend implementation)
- performance|slow|optimize -> performance-hunter (Performance optimization)
- design|mockup|visual -> ui-design (Visual design)

### Immersive Product Page

Skills: scroll-experience, 3d-web-experience, landing-page-design

Workflow:

```
1. Design product story structure
2. Create 3D product model
3. Build scroll-driven reveals
4. Add conversion points
5. Optimize performance
```

### Interactive Story

Skills: scroll-experience, ui-design, frontend

Workflow:

```
1. Write story/content
2. Design visual sections
3. Plan scroll animations
4. Implement with GSAP/Framer
5. Test and optimize
```

## Related Skills

Works well with: `3d-web-experience`, `frontend`, `ui-design`, `landing-page-design`

## When to Use
- User mentions or implies: scroll animation
- User mentions or implies: parallax
- User mentions or implies: scroll storytelling
- User mentions or implies: interactive story
- User mentions or implies: cinematic website
- User mentions or implies: scroll experience
- User mentions or implies: immersive web

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
