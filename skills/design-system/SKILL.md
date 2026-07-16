---
name: design-system
description: "Mechanical implementation invariants for frontend design: token architecture, typography hierarchy, loading order, FOUT prevention, chrome stability, motion timing, color semantics. Use with design when building components, pages, or design systems. (Aesthetic direction lives in..."
risk: unknown
source: https://github.com/connerkward/ckw-design-skill/tree/main/design-system
source_repo: connerkward/ckw-design-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/connerkward/ckw-design-skill/blob/main/LICENSE
author: Conner K Ward
---

# Design system
## When to Use

Use this skill when you need mechanical implementation invariants for frontend design: token architecture, typography hierarchy, loading order, FOUT prevention, chrome stability, motion timing, color semantics. Use with design when building components, pages, or design systems. (Aesthetic direction lives in...


Apply with **design** when implementing UI: components, pages, or design systems. Every color, type, and motion choice should trace back to these rules.

## Token architecture

All colors map to a small set of primitives. No random hex values.

- **Foreground**: Text hierarchy (primary, secondary, muted).
- **Background**: Surface elevation (base, raised, overlay).
- **Border**: Separation hierarchy (subtle, default, emphasis).
- **Brand**: Identity and primary accent.
- **Semantic**: Destructive, warning, success (and optional info).

Use tokens in code (CSS variables, theme objects); never hardcode hex for UI.

## Typography

- **Hierarchy**: Headlines — heavier weight, tighter letter-spacing for presence. Body — comfortable weight for readability. Labels/UI — medium weight, works at smaller sizes. Data — monospace, `tabular-nums` for alignment.
- Combine size, weight, and letter-spacing so hierarchy is clear at a glance. If you squint and can't tell headline from body, hierarchy is too weak.
- **Fonts**: pair a display font with a body font; keep hierarchy legible at a glance. *Which* fonts is direction, not mechanics — pick from the domain and push off your first/default instinct (the mean); see design-spatial §2.
- **Data (functional only)**: real aligned numbers, IDs, timestamps in monospace with `tabular-nums` — mono earns its place when values line up in a column. Do NOT sprinkle mono on decorative eyebrow/metadata microtext ("35MM · DEVELOP · SCAN", fake spec captions) for a "technical" look — that's the current trend-slop, not data. See design-spatial §2.

## Loading order — first seen, first loaded

The first viewport must paint complete and correct, fast. Order every resource by whether the user sees it first; the rest waits.

- **Prioritize only the above-the-fold set** (hero text, hero image/video, brand mark). Preloading everything is the same as preloading nothing — the true criticals lose the bandwidth race. Pick the few things in the first screenful and prioritize *those*.
- **Fonts: self-host WOFF2.** Convert OTF/TTF → WOFF2 (Brotli; ~half the bytes, identical glyphs) and `<link rel="preload" as="font" type="font/woff2" crossorigin>` the weights used in the first viewport. Never a render-blocking third-party font stylesheet — a Google Fonts `<link>` adds a CSS round-trip plus extra DNS/TLS before the font even starts downloading; self-host instead.
- **LCP image/video:** `fetchpriority="high"` on the hero image (or the video poster); `<link rel="preload" as="image">` it when it's CSS-referenced (the parser can't see CSS `url()`s early). The hero box must never be empty — ship a poster/low-res placeholder so there's no blank frame.
- **Below the fold:** `loading="lazy" decoding="async"` on images; `preload="none"` (or `"metadata"`) on video; `defer` non-critical JS. Always reserve space (`aspect-ratio`, or `width`+`height`) so deferred media can't shift layout (CLS).
- Keep the render-blocking head minimal: inline critical CSS, defer the rest.

## Never let fonts pop in (no FOUT) — ever

`font-display: swap` **is** the pop — it paints a fallback face, then swaps to the webfont and reflows. Do not use it for any text the user watches load (titles, wordmarks, hero copy). The rule is absolute: title/display text must never flash a fallback or reflow.

- **Gate visibility on the real font.** Synchronously in `<head>`, add a `fonts-pending` class to `<html>` that holds the display-font text at `opacity: 0`. On `document.fonts.ready` — kick it with `document.fonts.load('<weight> 1em "Family"')` for each critical face — swap to `fonts-ready` and fade the text in (~0.5s). Always include a safety timeout (~2.5s) that reveals regardless, so a font failure can never leave text permanently hidden.
- Pair this with preload + WOFF2 (above) so the hidden window is a few hundred ms, not seconds — the fade reads as intentional, not as a stall.
- For body text where a sub-perceptual swap is tolerable, at minimum kill the reflow: define a fallback `@font-face` (or `font-family` fallback) tuned with `size-adjust` / `ascent-override` / `descent-override` so the fallback occupies the same metrics as the webfont and the swap shifts nothing.

Worked example — an AR product-research page: a head script toggles `fonts-pending → fonts-ready` (titles fade in on `fonts.ready`, 2.5s fallback), preloads the four above-the-fold WOFF2 weights, and self-hosts the brand face so there's no Google round-trip.

## Slow-loading content — never show the ugly intermediate state

Anything that *could* take a noticeable moment to be ready — fonts (above), large images, video, `<canvas>` scenes, Three.js / WebGL, lazy-loaded React islands, anything that fetches over the network or runs heavy main-thread setup — must either **arrive fast** or **load gracefully**. The default browser behavior (blank box → partial paint → reflow → final state) is the ugly intermediate state. Catch it.

Two levers; use both:

- **Arrive faster.** Compress (WOFF2 for fonts, Draco for glTF, WebP/AVIF for images, h264/h265 for video with `preload="metadata"`). Preload the *few* assets the first viewport actually needs (`<link rel="preload">`). Lazy-load below-the-fold so the LCP set isn't competing. Reserve the box (`aspect-ratio`, `width`+`height`) so deferred content can't trigger CLS.
- **Load gracefully.** Hide the in-flight state behind a styled placeholder, then fade the real thing in. Skeleton boxes, low-res blurred posters, a single ASCII glyph, even just the container's bg color — anything coherent with the design beats the default partial-paint.

What "ugly" looks like, concretely, and the fix:

| Symptom | Fix |
|---|---|
| Annotation labels stack at `translate(0,0)` (top-left of container) until JS positions them | Start labels at `opacity: 0` with a `transition: opacity ~0.35s`; first projection sets inline opacity → CSS fades them up. |
| Canvas/WebGL paints empty/black for a frame on first render | Show a placeholder (CSS art, low-res poster image, or paper/skeleton fill) in the same box; remove it once the first real frame has rendered. |
| Lazy image fetches and snaps in with a layout-jump | `aspect-ratio` + `<link rel="preload">` (above-the-fold) or `loading="lazy" decoding="async"` (below); fade from `opacity:0` on the `load` event for the first paint. |
| Video poster pops to first frame on play | `poster` matches a still you control; once `playing` event fires, you've already had a clean handoff. |
| 3D model "appears" mid-screen with no transition | Keep the canvas visible but at `opacity: 0`; toggle a `.viewer-ready` class (or set inline opacity) inside the GLTFLoader success callback, after the first `tick()`. |
| Lazy React island flashes a fallback that looks worse than no UI | Replace `Suspense` fallback with a skeleton that traces the final layout, not a spinner. |

Rule of thumb: if a user could screenshot the page mid-load and you'd be embarrassed, you owe it a graceful state. The placeholder doesn't have to be fancy — it has to be *intentional*, sized correctly, and in the design language of what's coming.

## Chrome stays still — status text never resizes layout

Persistent chrome (headers, nav, toolbars, search bars, status regions) must hold a **constant height** no matter what text lands in it. Transient status / loading / explanatory copy — "loading model…", "N matching · M indexed", empty-state hints — must not wrap to a second line and shove adjacent controls down. A status region that grows and shrinks as its message changes is a layout-jank bug, not dynamic content.

- **Constrain to one line:** `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` so the longest message truncates instead of wrapping.
- **Reserve the space up front:** give the container a fixed `height` (or `min-height`) sized for the message, so the shortest and longest states — and the empty state — occupy the same footprint.

Only the content area should move while chrome stays fixed; layout shift from transient text reads as broken polish. (Concrete failure this prevents: in a search app, a model-loading message wrapping to two lines and pushing the search bar downward.)

## Motion

- Keep timing consistent and purposeful; one well-orchestrated moment (staggered page load with `animation-delay`) beats scattered micro-interactions. Prefer CSS-only for HTML; Motion library for React. (Honor `prefers-reduced-motion` for public/multi-user projects.)
- **Defaults for restrained/professional UIs** (a starting point, not law): micro-interactions ~150ms, larger transitions 200–250ms, ease-out. A playful/toy-like tone (design-thinking) may want spring/bounce and longer beats — match motion feel to the chosen direction rather than defaulting to these numbers.
- **Choreography** — for anything beyond a single micro-interaction (route/page transitions, list reorder, reveals, shared elements), load [references/motion-choreography.md](references/motion-choreography.md): when a transition earns its keep (it must *communicate* something or get cut), which kinds to implement and in what order, **style by navigation type** (directional slide only for hierarchical/ordered — a slide between peers lies about depth; laterals fade), a duration table, and craft (compositor-only props, motion-blur on morphs, never raster-scale text, persistent-chrome isolation). Framework-agnostic.

### Scroll-driven narrative (scrollytelling)

For **explanatory / editorial / data-walkthrough** content, prefer **scroll-driven graphics over click-interactive widgets**. A reader scrolls by default; making them hunt for and click a toggle to advance an explanation adds friction and gets skipped. Use the NYT/Pudding pattern: pin one graphic (`position: sticky`) while short text "steps" scroll past it, and let each step drive the graphic's state.

- **Mechanics:** one `IntersectionObserver` with `rootMargin: '-48% 0px -48% 0px'` (threshold 0) so a step goes "active" exactly as it crosses the viewport mid-line; the active index re-renders the pinned graphic. ~30 lines — this *is* scrollama minus the dependency; don't add a scroll library.
- **Layout:** two columns — steps scroll in one, the graphic `sticky top-0 h-screen` in the other; stack on mobile with the graphic sticky on top. Give each step ~85vh so exactly one is centered at a time; dim the inactive step cards (`opacity:.3`) so the live one reads.
- **Graphic is a pure function of the active step** (`graphic(active)`), holding no click state of its own — so it also screenshots/exports deterministically and degrades to a static figure. Animate *between* states (color / width / opacity, 300–700ms) so scrolling feels continuous, not steppy.
- **When NOT to:** dashboards, tools, forms — anything the user *operates* rather than *reads* — stay interactive. Scrollytelling is for **narration**, where you own the order. (Public/multi-user builds: honor `prefers-reduced-motion` per the Motion note above; keep the state changes but drop the tweens.)

## Spatial composition & layout

Grid systems, the 8-point spacing scale, visual-weight balance, alignment, and the render-then-critique loop live in **design-spatial** ([../design-spatial/SKILL.md](../design-spatial/SKILL.md)) — the mechanical counterpart to this file's tokens/type/color. Load it whenever composing pages, dashboards, or components. (Direction nugget that belongs here: match composition ambition to the vision — maximalist earns elaborate/layered code; minimal/refined demands restraint and precise spacing.)

## Nested radii (only when one rounded element sits inside another)

Not a push to round things — this governs the case where a rounded element is nested in
another (a button in a card, an inset panel in a container). When nested:

- **Child radius ≤ parent radius**, never larger (a child corner rounder than its parent looks
  like it's bulging out).
- **Concentric** is the ideal: `child_radius = parent_radius − gap` (the padding between them),
  so the two curves run parallel and the inner corner echoes the outer. Flat/unrounded children
  in a rounded parent are fine; what reads as broken is mismatched, non-concentric curves.

## Color

- **Palette from domain**: colors should feel like they came *from* the product's world, not applied on top.
- **Beyond temperature**: quiet vs loud, dense vs spacious, serious vs playful, geometric vs organic — not just warm/cool.
- **Color carries meaning**: gray builds structure; color communicates status, action, emphasis, identity. Unmotivated color is noise. (Restraint — one accent, not five — is a direction principle; see design-thinking → *reserve impact for punctuation*.)
- **Contrast — APCA for decisions, WCAG for the gate.** For *perceptual* contrast judgments (is this text comfortably readable on this surface?) prefer **APCA** ([apcacontrast.com](https://apcacontrast.com/)) — it models lightness perception far better than the WCAG 2 ratio, which mis-rates light-on-dark and mid-tones. Keep **WCAG 2 (4.5 / 3:1) as the compliance floor** — it's what `design-spatial`'s `layout-audit.js` gates on and what accessibility standards require. Use APCA to design, WCAG to certify.
- **Interactive states gain contrast.** `:hover`, `:active`, `:focus` must read as *more* prominent than rest — more contrast, not less. A hover that lowers contrast (e.g. lightens text toward the bg) reads as disabled.

Avoiding the generic/trend look (Inter, purple-on-white, the same dark-glass card) and varying across generations is **design-spatial §2** — not restated here.

## Backgrounds & detail

Atmosphere over flat fills — but matched to the chosen aesthetic, not a default. The reflexive gradient-mesh / noise / grain "premium" treatment is itself the designer-trend mean (design-spatial §2); reach for it only when the direction genuinely calls for it, never as decoration for its own sake.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
