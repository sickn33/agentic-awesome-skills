---
name: cinematic-ui-ux
description: Build high-performance cinematic web experiences with GSAP 3.12+, Lenis smooth scroll, canvas frame scrubbing, kinetic typography, and WCAG 2.2 motion accessibility.
category: frontend
risk: safe
source: self
source_type: self
date_added: '2026-11-19'
author: KatkamKoushik
license: MIT
---

# Cinematic UI/UX: Motion Direction & Experience Engineering

You are the **Motion Director and Experience Engineer**.

---

## 1. Concrete Division of Labor (Skill Boundaries)

To prevent duplication and context bloat across agent interactions, adhere strictly to these ownership boundaries:

| Domain | UI/UX Design Prompt Master (Skill 1) | Cinematic UI/UX Motion (Skill 2 - This Skill) |
| :--- | :--- | :--- |
| **Component Architecture** | Owns headless primitives, shadcn, Radix layout structures, button sizes, card boundaries. | Owns animating those components: enter/exit choreography, spring physics, magnetic pull, and interactive gestures. |
| **Color & Visual Tokens** | Owns color palette selection, semantic color variables, light/dark mode tokens, contrast ratios. | Animates existing tokens: opacity crossfades, gradient scrub positions, specular sheen overlays. |
| **UX Psychology** | Owns information architecture, Fitts's/Hick's laws, cognitive load management, form usability. | Applies UX constraints to moving interfaces: preventing motion fatigue, timing gates, spatial orientation. |
| **3D & WebGL Engine** | Owns Three.js scene setup, WebGPU renderers, geometry generation, camera matrices, GLSL shaders. | Choreographs WebGL in the narrative: camera timeline splines, scroll scrubbing, audio synchronization. |
| **Prompt Engineering** | Generates text-to-UI prompts for v0, Stitch, Lovable, Midjourney. | Generates production code, GSAP timelines, Lenis integration code, and motion test suites. |

---

## 2. Permitted Animation Properties & Exception Policy

### Rule 1: Prefer Compositor-Friendly Properties
- **`transform`** (`translate3d`, `scale`, `rotate`, `skew`): Prefer for movement and scale. Verify layer promotion and frame cost on the target browser.
- **`opacity`**: Prefer for fades. Profile paint and compositing when combined with other effects.

### Rule 2: Permitted Exceptions (Restricted & Scoped)
- **`clip-path`**: Permitted strictly for route transition curtains and editorial image reveals where overflow geometry is fixed.
- **`filter: blur()`**: Permitted only on isolated overlay backdrops or cursor tails with fixed dimensions (must test layer promotion via DevTools).
- **Background Color Fades**: Animate opacity across stacked, absolutely-positioned color layers instead of animating `background-color` directly.

---

## 3. Seven-Stage Motion Delivery Pipeline

1. **Requirements & Intent**: Identify whether the experience is utility-focused (150–250ms), dashboard productivity (200–300ms), or luxury brand storytelling (800–1400ms).
2. **5-Act Storyboard**: Map narrative beats (Hero → Discovery → Immersion → Climax → Conversion) with clear exit criteria.
3. **Motion Tokenization**: Register CustomEase curves (`ease-couture`, `ease-cinematic-out`) with native cubic-bezier fallbacks.
4. **Implementation**: Assemble components using shared `MotionProvider`, `LenisProvider`, and `TransitionProvider`.
5. **Accessibility & Vestibular Safety**: Implement `prefers-reduced-motion` alternates, decoupled decorative pause, and focus containment for modal dialogs.
6. **Performance & VRAM Profiling**: Audit P95 frame times (< 16.6ms), frame drop rate (< 5%), and device VRAM budgets.
7. **Automated Verification**: Run Playwright end-to-end tests validating navigation lifecycles, focus traps, and teardowns.

---

## 4. Three-Tier Graceful Degradation Strategy

| Tier | Target Hardware | Motion Strategy |
| :--- | :--- | :--- |
| **Tier 1: Full Immersive** | Desktop / Workstations with fine pointer, `deviceMemory >= 8GB`, and unconstrained battery. | 120 FPS target, full canvas frame scrubbing, magnetic cursor followers, 3D card tilt physics, smooth scrubbed audio. |
| **Tier 2: Balanced Performance** | Modern smartphones and tablets (`deviceMemory > 2GB`), touch pointers. | 60 FPS target, horizontal snap carousels, downscaled frame scrubber (max 60 frames, DPR 1.5), touch-action pan-y swipe. |
| **Tier 3: Reduced Motion & Low Power** | `prefers-reduced-motion: reduce`, battery level < 20%, or low-end mobile (`deviceMemory <= 2GB`). | Zero continuous translation, static high-res poster fallbacks, clean vertical document stacks, instant route changes. |

---

## 5. Implementation Review Register

These checks describe the intended implementation in the references. Validate their behavior in the target application and browser:

### Group A: Release-Blocking & High-Priority Problems (1–15)
- **1. Rules-of-Hooks Compliance (`lenis-scroll-systems.md`)**: Decoupled conditional nesting checks into an outer `LenisProvider` wrapper and inner `InnerLenisProvider`, preventing conditional hook execution.
- **2. Controller Ownership (`lenis-scroll-systems.md`)**: Enforced true singleton ownership via `globalActiveLenisController`, preventing competing controllers across multiple mounts.
- **3. Symmetric Teardown (`lenis-scroll-systems.md`)**: Extracted `teardownInstance()` to symmetrically remove ticker callbacks, destroy instances, and reset tokens before reinitializing on reduced-motion changes.
- **4. Instant Native Fallback (`lenis-scroll-systems.md`)**: Uses instant native scrolling for reduced motion and completion-coordinated anchor focus.
- **5. React 19 Inert Compatibility (`gsap-engineering.md`)**: Converted `inert={!isOpen ? '' : undefined}` to boolean `inert={!isOpen}`, matching `@types/react: ^19.0.0`.
- **6. Destination Route Verification (`page-transitions.md`)**: Replaced arbitrary 50ms timers with explicit route comparison via `RouteListener`, verifying current URL matches intended target before lowering curtain.
- **7. Error State Preservation (`page-transitions.md`)**: Preserved `FAILED_FALLBACK` state during timeout curtain lowering (`isError = true`), keeping the retry banner and controls active.
- **8. Navigation Cancellation Strategy (`page-transitions.md`)**: Separated visual curtain cancellation from routing; pushes back to `previousHrefRef.current` if cancelled post-push.
- **9. Isolated Suspense Boundary (`page-transitions.md`)**: Isolated `useSearchParams()` into `<RouteListener>` inside `<Suspense fallback={null}>`, ensuring page children are never suspended.
- **10. Comprehensive Resource Verification (`page-transitions.md`)**: Provided verification waiting for `document.fonts.ready` PLUS critical image decoding (`img.decode()`) before curtain release.
- **11. Multi-State Scrubbing Pipeline (`cinematic-media.md`)**: Modeled states: `'IDLE' | 'LOADING' | 'PARTIAL_READY' | 'READY' | 'TIMEOUT_DEGRADED' | 'FAILED'`. Prevents false ready states on zero-frame timeouts.
- **12. Decoded Source-Image Memory Budget (`cinematic-media.md`)**: Added decoded memory calculation (`W * H * 4`). Evicts distant decoded frames when exceeding `memoryBudgetMB`.
- **13. Wired Decorative Pause Controller (`motion-accessibility.md`)**: Wired `registerDecorativeTween`, `registerVideo`, and `registerAudioContext` directly into example timelines and players.
- **14. Application Fixture Specification (`qa-and-validation.md`)**: Outlined a project structure and suggested dependencies (`next: ^15.0.0`, `react: ^19.0.0`).
- **15. Realistic Navigation E2E Tests (`qa-and-validation.md`)**: Specified assertions for navigation completion: link click &rarr; URL update &rarr; curtain clearance &rarr; destination `<main>` keyboard focus.

### Group B: Scroll, Transition & Lifecycle Issues (16–27)
- **16. GSAP Ticker Setting Preservation (`lenis-scroll-systems.md`)**: Preserves the application’s existing GSAP ticker lag-smoothing settings.
- **17. Scroll-Lock Synchronized Reinitialization (`lenis-scroll-systems.md`)**: When Lenis is recreated, immediately checks `lockCountRef.current > 0` and stops the new instance if locked.
- **18. Anchor Completion-Coordinated Focus (`lenis-scroll-systems.md`)**: Moves keyboard focus and updates browser history strictly upon scroll completion callback (`onComplete`).
- **19. Resilient Native Selector Fallback (`lenis-scroll-systems.md`)**: Wrapped `document.querySelector` in `try...catch` and falls back to `document.getElementById` for invalid selector strings.
- **20. Navigation Identity Verification (`page-transitions.md`)**: Passed `navId` into `finalizeTransition(navId)` to reject delayed tween completion from superseded navigations.
- **21. Explicit Cancellation State Model (`page-transitions.md`)**: Transitions state explicitly to `'CANCELLED'` before releasing curtain DOM.
- **22. Declarative `<TransitionLink>` Component (`page-transitions.md`)**: Added a drop-in link component that handles animated navigation while respecting modifier keys and external URLs.
- **23. Dynamic Menu Focus Trap (`gsap-engineering.md`)**: Dynamically queries visible, non-disabled elements at keydown time, filtering out hidden or collapsed targets.
- **24. Instant Reduced-Motion Menu (`gsap-engineering.md`)**: Created an instant reduced-motion branch (`set` instead of `to`) keeping keyboard focus trapping fully operational.
- **25. GSAP Revert on Prop Updates (`kinetic-typography.md`)**: Added `revertOnUpdate: true` to `useGSAP` to prevent accumulated tweens when props change.
- **26. Natural Word Wrapping Across Scripts (`kinetic-typography.md`)**: Preserves natural word spacing and line wrapping using flex-wrap with inline word containers.
- **27. Locale Dependency Tracking (`kinetic-typography.md`)**: Included `locale` in `useGSAP` dependencies `[text, isFontsLoaded, locale]`.

### Group C: Media, Interaction, Accessibility & Performance (28–41)
- **28. Contained/Cover Aspect Ratio Fitting (`cinematic-media.md`)**: Restored contain/cover ratio math with center-shifting letterboxing and pillarboxing.
- **29. Dynamic Canvas Redraw on Resize (`cinematic-media.md`)**: Recalculates canvas dimensions in `ResizeObserver`, redraws `lastRenderedIndex`, and triggers `ScrollTrigger.refresh()`.
- **30. Controlled Request Teardown (`cinematic-media.md`)**: Detaches outstanding image callbacks and releases requested sources on disposal. Browser cancellation and actual memory still need profiling.
- **31. Swipe Active Pointer Identification (`micro-interactions.md`)**: Tracks `activePointerIdRef.current` and ignores concurrent or secondary touches.
- **32. Touch-Action Style Restoration (`micro-interactions.md`)**: Preserves `previousTouchAction` and restores original inline style during effect cleanup.
- **33. Dynamic Media Query Subscriptions (`micro-interactions.md`)**: Subscribes dynamically to `(pointer: fine)` and `(prefers-reduced-motion: reduce)` changes in magnetic buttons.
- **34. Pure State Updaters in Pause Controller (`motion-accessibility.md`)**: Kept state updater pure (`setIsPaused(prev => !prev)`); executed play/pause side effects inside `useEffect([isPaused])`.
- **35. Multi-Medium Pause Support (`motion-accessibility.md`)**: Expanded pause controller to handle GSAP tweens, HTML5 `<video>`, Web Audio contexts, and CSS animations via `data-motion-paused`.
- **36. Visual Viewport Teardown (`responsive-motion.md`)**: Returned cleanup function removing `visualViewport` resize listener.
- **37. Battery Listener Teardown (`responsive-motion.md`)**: Added safe teardown removing `levelchange` and `chargingchange` listeners with mount guards.
- **38. Graceful Fallback Tiers (`responsive-motion.md`)**: Defined safe default profiles when `navigator.deviceMemory` or `getBattery` are unsupported.
- **39. Corrected VRAM Formula (`animation-performance.md`)**: Multiplied depth/stencil allocation by pixel dimensions and labelled as an analytical estimation formula.
- **40. Calibrated Testing Targets (`animation-performance.md`)**: Defined 20/45/90 MB as configurable testing targets backed by Chrome DevTools memory profiling.
- **41. Hybrid Frame Auditing (`animation-performance.md`)**: Combined RAF intervals with `requestVideoFrameCallback` and long-task monitoring.

### Group D: Example & Production Integration Issues (42–47)
- **42. Scoped Portfolio Card Query (`cinematic-portfolio.md`)**: Scoped `gsap.utils.toArray` strictly to `containerRef.current`.
- **43. Pause-Safe Gear Rotation (`luxury-product-story.md`)**: Replaced arbitrary Tailwind classes with GSAP rotation registered with `registerDecorativeTween()`.
- **44. Chapter Navigation in Reduced Motion (`scroll-driven-editorial.md`)**: Chapter links call context `scrollTo()`, which invokes the native instant scroll fallback when Lenis is bypassed.
- **45. Live Video Preference Monitoring (`scroll-driven-editorial.md`)**: Subscribed to runtime reduced-motion changes to immediately pause playing video if the user enables reduced motion.
- **46. Self-Contained Captions & Fallbacks (`scroll-driven-editorial.md`)**: Embedded self-contained data URI captions track and inline SVG posters, eliminating 404 errors.
- **47. Package & Manifest Version Alignment (`production-patterns.md`, `qa-and-validation.md`)**: Aligned dependencies to Next.js 15 (`^15.0.0`) and React 19 (`^19.0.0`) across all manifests and components.

---

## 6. Reference Document Index

- [lenis-scroll-systems.md](references/lenis-scroll-systems.md)
- [page-transitions.md](references/page-transitions.md)
- [cinematic-media.md](references/cinematic-media.md)
- [gsap-engineering.md](references/gsap-engineering.md)
- [micro-interactions.md](references/micro-interactions.md)
- [kinetic-typography.md](references/kinetic-typography.md)
- [couture-motion-language.md](references/couture-motion-language.md)
- [motion-direction.md](references/motion-direction.md)
- [motion-tokens.md](references/motion-tokens.md)
- [responsive-motion.md](references/responsive-motion.md)
- [motion-accessibility.md](references/motion-accessibility.md)
- [animation-performance.md](references/animation-performance.md)
- [production-patterns.md](references/production-patterns.md)
- [qa-and-validation.md](references/qa-and-validation.md)
- [cinematic-portfolio.md](references/example-cinematic-portfolio.md)
- [couture-campaign.md](references/example-couture-campaign.md)
- [luxury-product-story.md](references/example-luxury-product-story.md)
- [scroll-driven-editorial.md](references/example-scroll-driven-editorial.md)

## Overview

Cinematic UI/UX is an advanced frontend engineering skill for building immersive, high-performance web experiences using **GSAP 3.12+**, **Lenis 1.1+**, and **React 19 / Next.js 15 App Router**. It unifies smooth scroll synchronization, international kinetic typography, canvas image sequence scrubbing, route transition state machines, and rigorous WCAG 2.2 Level AA/AAA motion accessibility.

## When to Use

Use this skill when:
- Designing and implementing scroll-driven product reveals, narrative longform editorials, and luxury brand showcases.
- Synchronizing Lenis smooth scrolling with GSAP `ScrollTrigger` and custom `requestAnimationFrame` loops.
- Building Apple-style frame-by-frame canvas image scrubbers with DPR scaling and preloaded frame caching.
- Implementing kinetic typography that segments multi-byte international scripts and emojis safely using `Intl.Segmenter`.
- Orchestrating route transitions with entry/exit animation curtains, focus management, and URL security verification.
- Enforcing WCAG 2.2 motion safety: decoupled decorative motion pause controllers, reduced-motion fallbacks, and focus traps.

When NOT to use:
- For standard utility dashboards, enterprise CRUD applications, or data-dense administration tables where motion introduces cognitive friction; use `design-system` or `ui-styling` instead.
- For basic component hover or press states; use native CSS/Tailwind transitions or `ui-motion` instead.
- For complex 3D scenes requiring complete WebGL/Three.js/R3F scene graphs; use `3d-web-experience` instead.

## Prerequisites

- React 18+ or React 19 with Next.js 14+ or 15 (App Router).
- Core dependencies: `gsap` (>=3.12.5), `@gsap/react` (>=2.1.1), `lenis` (>=1.1.18).
- Client component boundary: Components utilizing hooks (`useGSAP`, `useLenis`) require `'use client'`.

## Limitations

- Frame rate targets (60–120 FPS, P95 frame time < 16.6ms) depend on client hardware, available GPU memory, and browser compositing threads; low-tier devices must degrade to Tier 3 document stacks.
- Canvas image sequence scrubbing requires pre-buffering frame assets; memory must be bounded on mobile viewports (e.g., maximum 60 downscaled frames).
- The Playwright motion test suite in `references/qa-and-validation.md` is an illustrative end-to-end testing specification for implementing applications; this documentation skill does not execute a live browser harness.

## Safety and Side Effects

- Docs-only guidance: contains zero executable installation hooks, background daemon processes, or telemetry scripts.
- Navigation state machine applies explicit URL sanitization (`sanitizeNavigationUrl`) to reject open redirects and protocol-relative navigation attacks (`//malicious.com`).
- Vestibular safety guardrail: all continuous animations and video playback are disabled or paused when `prefers-reduced-motion: reduce` is detected or battery level is critical (< 20%).
