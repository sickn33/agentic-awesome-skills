# Deterministic Design Contract: `DESIGN.md`, `PRODUCT.md` & `style.md`

As outlined in *Dominando Impeccable: Skill de Diseño para IA*, skill design is the practice of building **deterministic rails for non-deterministic AI models**. Instead of asking an agent to "make it look better" and receiving uncalibrated purple gradients or generic card grids, this skill compiles and reads three synchronized project files:

1. **`PRODUCT.md`** — Who the product serves, its domain truths, technical stack, and the **Subject Inventory**.
2. **`DESIGN.md`** — The visual constitution: color tokens, typographic scale, layout geometry, motion budget, voice, and explicit **`anti_references`**.
3. **`generations/refs/brand/style.md`** — The verbatim visual anchor automatically compiled from `DESIGN.md` and prepended to every Nano Banana 2.1 / Pro and Gemini Omni Flash prompt so generated 2K/4K visuals never drift from the CSS tokens.

---

## 1. `PRODUCT.md` Specification & Template

Create or update `PRODUCT.md` at the workspace root during `/ui init` or Step 1 of a build.

```markdown
# PRODUCT.md

## Identity & Core Claim
- **Name:** [Product / Brand Name]
- **One-Line Truth:** [Plain-spoken statement of what it is and who it serves, as the maker would tell a friend]
- **Primary Action:** [Exact label and destination of the primary CTA, e.g., "Book the 05:00 Tasting -> /reserve"]
- **Default Surface Mode:** [Persuade | Operate | Read | Experience]

## Technical Architecture (Do Not Override)
- **Framework:** [e.g., Angular v22 (zoneless, standalone, Signals) | Next.js 16 App Router | Astro 5 | Vanilla HTML/CSS]
- **Styling:** [e.g., Tailwind v4 + CSS Custom Properties | SCSS | Vanilla CSS]
- **Motion Engine:** [e.g., GSAP + ScrollTrigger + Lenis | CSS Scroll-Driven Animations | Motion]
- **Asset Output Directory:** [e.g., public/images | src/assets/images]

## Subject Inventory (8–12 Specifics Unique to This Client)
1. **Name Origin:** [...]
2. **Physical Materials / Surfaces:** [...]
3. **Place / Coordinates / Architecture:** [...]
4. **Hard Numbers & Constraints:** [...]
5. **Rituals / Timing / Process:** [...]
6. **Printed or Technical Artifacts of Its World:** [...]
7. **The Idea Sentence:** "On this page, [Inventory Item] becomes [Visual/Structural Device]."
8. **One Live Thing:** [Interactive control proving the core claim with real math/state]
```

---

## 2. `DESIGN.md` Specification & Template

`DESIGN.md` is stack-agnostic: whether you build with Angular v22 Zoneless + Signals, React, Astro, or plain HTML, every command (`/ui craft`, `/ui audit`, `/ui normalize`, `/ui polish`) reads `DESIGN.md` before touching a single line of CSS or generating an image.

```markdown
# DESIGN.md

## 1. Aesthetic Direction & World
- **Theme Paradigm:** [Deep Dark Mode | Pristine Light Mode | Bold Studio Solid | Quiet Premium Neutral]
- **Aesthetic Archetype:** [e.g., Minimalist Solarpunk | Swiss Precision Instrument | Tactile Archival Editorial]
- **Hero Scale:** [Giant Statement | Mid Editorial | Mini Minimalist]
- **Narrative Spine:** [Artifact/Specimen | Journey/Pilgrimage | Precision Instrument | Living System | Stage/Spotlight | Archive/Dossier]

## 2. Color Tokens (Proportions: 1 Ground, 1 Ink, 1 Accent, Tonal Steps)
Never use pure `#ffffff` on dark themes or neutral grey (`#888888`) on colored grounds. Secondary ink is always tinted from the ground hue.

```css
:root {
  /* Ground & Surfaces */
  --bg-ground: #0c1624;          /* Primary canvas (70-80% of viewport) */
  --bg-surface: #122033;         /* One tonal step up for quiet panels (no drop shadows) */
  --bg-elevated: #192b44;        /* Interactive / hover surface */
  
  /* Ink (Typography & Iconography) */
  --ink-primary: #eef4f0;        /* Warm off-white / botanical bone (never pure #fff) */
  --ink-secondary: #9cb3a8;      /* Hue-tinted secondary copy (>= 4.5:1 contrast on ground) */
  --ink-muted: #5e786d;          /* Captions, metadata, borders */

  /* Accents (Used with discipline: <= 10% of screen area) */
  --accent-primary: #38d399;     /* Primary action & active state (e.g., Solarpunk chlorophyll green) */
  --accent-secondary: #f472b6;   /* Secondary highlight / live-thing indicator (e.g., botanical pink) */

  /* Structural Rules & Scrims */
  --border-subtle: color-mix(in oklab, var(--ink-primary) 12%, transparent);
  --scrim-hero: linear-gradient(180deg, rgba(12, 22, 36, 0.15) 0%, rgba(12, 22, 36, 0.88) 100%);
}
```

## 3. Typography System (5 Sizes, Far Apart)
- **Display Face:** `[Font Name]`, weight `600`, tracking `-0.03em`, line-height `0.98`
- **Sans / Reading Face:** `[Font Name]`, weight `400/500`, measure `65–75ch`, line-height `1.55`
- **Numeric Discipline:** `font-variant-numeric: tabular-nums` on all prices, metrics, tables, and live controls.
- **Scale (Fluid Clamp):**
  - `--text-display`: `clamp(2.75rem, 6vw + 1rem, 6.25rem)` (Max 2 lines, <= 32 chars)
  - `--text-h2`: `clamp(1.85rem, 3.2vw + 0.5rem, 3.5rem)` (Max 2 lines)
  - `--text-statement`: `clamp(1.25rem, 1.8vw + 0.4rem, 2.25rem)` (Marked up as `<p>` or `<blockquote>`, <= 25 words)
  - `--text-body`: `clamp(1rem, 0.25vw + 0.95rem, 1.125rem)`
  - `--text-caption`: `0.875rem` (Sentence case; never tracked-out uppercase eyebrows)

## 4. Frame, Grid & Radii
- **Outer Frame Margins:** `clamp(1.25rem, 4vw, 4rem)` equal on left and right at all viewports.
- **Max Container:** `1440px` (`12-column` CSS Grid, `gap: clamp(1rem, 2vw, 2rem)`).
- **Section Vertical Rhythm:** `clamp(5rem, 11vw, 14rem)` (`120px–224px` desktop).
- **Corner Radius Policy:** `0px` (Square architectural corners on all media plates) and `4px` on interactive controls. Never mix `16px` cards with `0px` photos.

## 5. Voice & Copy Rules
- **Tone:** Calm, precise, zero hype. Speak with concrete nouns and verifiable numbers.
- **Forbidden Words:** "Unlock", "Supercharge", "Seamless", "Elevate", "Next-gen", "Revolutionize", "All-in-one", "Get Started", "Learn More".

## 6. Anti-References (Strict Bans for Code & Nano Banana Imagery)
- Avoid pure white (`#ffffff`) and pure black (`#000000`).
- No generic purple/indigo/blue AI gradients or glowing neon halos.
- Reject all aggressive or weapon-related iconography.
- **Imagery Ban:** Never generate or display human hands, floating 3D blobs, isometric cartoon figurines, or fake unreadable UI text inside raster images.
```

---

## 3. Synchronizing `DESIGN.md` $\rightarrow$ `generations/refs/brand/style.md`

Whenever `/ui init`, `/ui document`, or Step 3 of `/ui craft` creates or updates `DESIGN.md`, immediately write or update `generations/refs/brand/style.md` (and register the `brand` set in `generations/refs/sets.json` pointing `"output"` to the project's image directory, e.g., `"public/images"`).

### Why this is OP
Nano Banana 2.1 and Nano Banana Pro are extraordinarily sensitive to photographic direction, color hex anchors, and negative constraints. By compiling `DESIGN.md` into a short, fixed `style.md` block and prepending it **verbatim** to every generation call, every 2K/4K image lands in the browser already color-graded to your CSS custom properties.

### Example `generations/refs/brand/style.md`
```markdown
Editorial architectural & macro studio photography anchored to a deep nocturnal slate-navy palette (#0c1624 shadow base, #122033 midtones) with natural bioluminescent chlorophyll green (#38d399) and soft botanical coral-pink (#f472b6) practical light accents, warm bone highlights (#eef4f0). Shot on medium-format 65mm lens at f/4, crisp optical depth of field, fine Kodak Vision3 250D natural film grain, directional side-lighting with deep calm shadow falloff. Strict exclusions: no pure white backgrounds, no purple or cyan neon cyberpunk glow, no human hands, no weapons or aggressive motifs, no overlaid text, no watermarks, no UI chrome or fake screens.
```

### Example `generations/refs/sets.json`
```json
{
  "brand": {
    "path": "generations/refs/brand",
    "output": "public/images",
    "linked": "2026-11-03T12:00:00Z",
    "notes": "Auto-synced from DESIGN.md; outputs land directly in public/images with sidecars."
  }
}
```

---

## 4. Stack-Specific Architecture Patterns

`DESIGN.md` governs visual output while respecting the project's engineering standards:

- **Angular (v19–v22+):**
  - Default to **zoneless** (`provideZonelessChangeDetection()`), standalone components, `ChangeDetectionStrategy.OnPush`, and **Signals** (`signal()`, `computed()`, `input()`, `output()`).
  - Implement **One Live Thing** using reactive `signal()` state and `computed()` derivations — zero unnecessary subscriptions or zone triggers.
  - Use `NgOptimizedImage` (`ngSrc`, `priority` on the Hero 2K/4K plate, explicit `width` and `height`) when applicable.
- **React / Next.js / Astro:**
  - Keep layout and static sections in Server Components / Astro components; isolate **One Live Thing** and scroll choreographies into minimal client islands.
  - Use `fetchPriority="high"` on the Hero image and explicit `width`/`height` attributes.
- **GSAP + Lenis / CSS Motion:**
  - Initialize animations inside proper lifecycle hooks (`afterNextRender` in Angular, `useGSAP` in React) and always wrap scroll/motion travel in `gsap.matchMedia()` checking `(prefers-reduced-motion: no-preference)`.

