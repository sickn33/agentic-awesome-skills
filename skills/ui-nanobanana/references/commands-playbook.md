# Sub-Commands Playbook (`/ui <command>`)

Inspired by **Impeccable**'s shared design vocabulary and **Taste Skill**'s browser-verified look-and-fix loop, each sub-command below executes a deterministic protocol. Every command **reads `DESIGN.md` and `PRODUCT.md` first** so it operates inside your brand's rules rather than inventing a new aesthetic.

---

## 1. Contract & Discovery Commands

### `/ui init`
**Goal:** Establish the deterministic design contract (`PRODUCT.md`, `DESIGN.md`, and `generations/refs/brand/style.md`) for a new or existing project.
1. Scan `package.json`, framework config (`angular.json`, `next.config.*`, `astro.config.*`), and existing global styles (`styles.css`, `tailwind.config.*`).
2. Extract or ask (in at most 1 concise turn) for: the product's one-line truth, target surface mode (`Persuade`, `Operate`, `Read`, `Experience`), preferred theme paradigm, and any strict `anti_references` (e.g., *"Solarpunk `#0c1624` dark base, green/pink accents, no pure white, no hands/weapons"*).
3. Compile the **Subject Inventory** (8–12 specifics), write `PRODUCT.md` and `DESIGN.md` at the workspace root, and sync `generations/refs/brand/style.md` + `generations/refs/sets.json` (see [`references/design-contract.md`](references/design-contract.md)).

### `/ui document`
**Goal:** Reverse-engineer an existing codebase into `DESIGN.md` and `generations/refs/brand/style.md` without changing any application code.
1. Inspect CSS custom properties, Tailwind theme tokens, font imports, component spacing, and existing image assets.
2. Document the incumbent ground/surface/ink/accent tokens, typographic scale, layout grid, and corner radius policy into `DESIGN.md`.
3. Translate the visual mood and palette into `generations/refs/brand/style.md` so any future Nano Banana 2K/4K generations match the existing app automatically.

---

## 2. Build & High-Resolution Media Commands

### `/ui craft [target]`
**Goal:** Execute the complete **10-Step Master Run** in [`SKILL.md`](../SKILL.md) to build or redesign a page or app screen from scratch.
- Runs Steps 1–4 (Inventory, Copy Deck & 2-Line Arithmetic, Direction Matrix, Idea Sentence + Competitor Test + **One Live Thing**).
- Pauses at Step 5 with the consolidated **Batch Media Plan Table** (Hero 4K + Section 2K plates + optional Omni video loop / Argon SVG) and waits for one user approval.
- Runs Step 6 sequentially with **Hero-First Series Lock**, wires all assets and tokens into the framework in Steps 7–8, and runs `/ui audit` + `/ui polish` in Steps 9–10.

### `/ui visual-plan [target]`
**Goal:** Upgrade an existing text-heavy, placeholder-ridden, or stock-photo UI with a cohesive suite of 2K/4K Nano Banana visuals.
1. Read `DESIGN.md` and `generations/refs/brand/style.md` (creating `style.md` from the CSS tokens if missing).
2. Audit every section of `target` to identify missing, broken, or weak visual slots (checking against the 4–8 real-image floor for `Persuade` surfaces).
3. Present the **Batch Media Plan Table** (specifying model IDs, `2K`/`4K` sizes, aspect ratios including panoramic `21:9` or `4:1`, negative-space safe zones for text overlays, and total USD quote).
4. Upon approval, generate Slot 1 (Hero) first, lock Slots 2..N to Slot 1 via `reference_images` or `previous_interaction_id`, write `.json` sidecars, and update the component markup with `width`, `height`, `fetchpriority`, and tonal scrims.

### `/ui edit-asset <file-or-slot> "<delta instruction>"`
**Goal:** Modify or upscale an existing generated UI image without losing its composition.
1. Read the asset's `<basename>.json` sidecar to retrieve the exact `model`, `prompt`, `reference_images`, `params`, and `response_id`.
2. Quote the single rerun cost (`~$0.05` for Nano Banana 2.1 `2K`, `~$0.113` for `4K`, `~$0.134–$0.24` for Pro) and wait for approval.
3. Call `client.interactions.create` using `previous_interaction_id=sidecar["response_id"]` (for a stateful server-side edit) or pass the existing image file in `reference_images` while modifying only the delta words in the prompt.
4. Save, verify, update the sidecar, and verify the crop in the UI.

---

## 3. Evaluation & Diagnostic Commands

### `/ui audit [target]`
**Goal:** Diagnostic quality gate. Scans `target` (or the current route) against all **58 Deterministic Anti-Slop Rules** ([`references/anti-slop-58-rules.md`](references/anti-slop-58-rules.md)) **without modifying any files**.
1. Scan source files (HTML/Templates, CSS/Tailwind, TS/JS) and rendered viewports (`1440px`, `768px`, `390px`) for `SLOP-01` through `SLOP-58`.
2. Output a structured **Audit Report Table**:
   - **Summary:** Total `FAIL` count, Total `WARN` count, Surface Mode, and `DESIGN.md` compliance status.
   - **Findings Table:** Rule ID (`SLOP-XX`), Severity (`FAIL`/`WARN`), File & Line (`[hero.component.html](file:///path#L12)`), Measured Violation, and Exact Fix.
3. Do not edit code during `/ui audit` — end by asking if the user wants to run `/ui normalize` or `/ui polish` to fix all findings automatically.

### `/ui critique [target]`
**Goal:** High-level Design Director & Awwwards Jury review across 14 passes:
1. **The 5-Second Test:** Can a stranger tell what this is and what to do in 5 seconds on the first viewport?
2. **The Idea & Competitor Test:** Does the page embody a concept unique to this subject, or could a competitor swap their logo onto it?
3. **One Live Thing:** Is there a working interactive proof on the page?
4. **Copy & 2-Line Headline Arithmetic:** Do all `h1`–`h6` fit in $\le 2$ lines at `1440px`, `768px`, and `390px`?
5. **Visual Substance & Cohesion:** Are there 4–8+ high-resolution visuals locked to one lighting and color world?
6. **Composition Variety:** Do neighboring sections use distinct anchors, avoiding the left-text/right-image reflex?
7. **Frame & Rhythm:** Equal outer margins, zero huddled half-empty sections, `120–240px` desktop section spacing.
8. **Typography Scale & Measure:** 5 clear sizes far apart, `60–72ch` body measure, `tabular-nums` on all numbers.
9. **Color & Surface Discipline:** Ground/surface/ink/accent proportions, hue-tinted secondary ink, zero banned gradients.
10. **Motion Choreography:** One signature move + staggered entrances + reduced-motion safety.
11. **Browser Surfaces:** Themed `::selection`, `:focus-visible`, scrollbars, caret.
12. **Mobile (`390px`) Composition:** Dedicated mobile ergonomics (`>= 44px` tap targets, zero horizontal overflow).
13. **States & Honesty:** All interactive states present; zero invented social proof.
14. **Overall Jury Score (1.0–10.0)** + the **Top 3 Highest-Leverage Changes** that would raise the score most.

---

## 4. Refinement & Enhancement Commands

### `/ui normalize [target]`
**Goal:** Eliminate token drift across components that evolved over multiple sessions.
1. Read `DESIGN.md` tokens.
2. Replace rogue hardcoded hex colors, off-scale font sizes, inconsistent border-radii (`8px` vs `16px` vs `0px`), and ad-hoc padding/margin values with the exact CSS custom properties / Tailwind tokens defined in `DESIGN.md`.
3. Ensure all secondary text on colored/dark surfaces uses the hue-tinted `--ink-secondary` token rather than neutral grey.

### `/ui polish [target]`
**Goal:** The final zero-defect shipping pass.
1. Run `/ui audit` internally to list all active `FAIL` and `WARN` findings.
2. Fix every detected anti-pattern (`SLOP-01` to `SLOP-58`) within the existing design system (delete eyebrows/pills/01-02-03 markers, enforce 2-line headlines, fix image `width`/`height`/`fetchpriority`/scrims, theme `::selection` and `:focus-visible`, add `tabular-nums`).
3. Re-run the 58-rule check at `1440px`, `768px`, and `390px` until **0 FAIL** remains, and report the before/after delta.

### `/ui typeset [target]`
**Goal:** Elevate typographic craft and hierarchy.
1. Enforce the 5-step scale in `DESIGN.md` with clear size and weight separation.
2. Apply the **Two-Line Headline Arithmetic** ($\le 32$ chars for `h1`, `max-width: XXch`, `text-wrap: balance`).
3. Demote oversized 3–4 line sentences from `h1`–`h3` to `<p class="statement">` or `<blockquote>` ($\le 36\text{px}$ desktop / $24\text{px}$ mobile).
4. Set reading measure to `65–75ch`, tighten display tracking (`-0.03em`), and enable `font-variant-numeric: tabular-nums` on all numeric elements.

### `/ui colorize [target]`
**Goal:** Fix flat, washed-out, or off-brand color usage.
1. Apply the 70/20/10 Ground / Tonal Surface / Accent discipline from `DESIGN.md`.
2. Replace drop-shadowed cards with one tonal step (`--bg-surface`).
3. Consider adding **one Bold Studio Solid chapter switch** (a single high-impact section inverted onto `--accent-primary` or a deep complementary field) to break monotonous vertical scrolling.

### `/ui layout [target]`
**Goal:** Fix structural monotony, broken frames, and weak rhythm.
1. Align all sections to one pair of equal outer frame margins (`clamp(1.25rem, 4vw, 4rem)`).
2. Eliminate huddled one-sided sections (close every void on the opposite side of the grid with a visual plate, specification table, or figure).
3. Re-architect any consecutive sections that share the same layout family using distinct **Composition Anchors** from [`references/art-direction-and-copy.md`](references/art-direction-and-copy.md).

### `/ui animate [target]`
**Goal:** Add the 4-part purposeful motion layer without hurting performance or accessibility.
1. **Signature Move:** Implement 1 authored scroll or entrance moment tied to the Idea Sentence.
2. **Staggered Section Entrances:** Heading $\rightarrow$ copy $\rightarrow$ media (`60–90ms` stagger, `16–24px` rise, `cubic-bezier(0.16, 1, 0.3, 1)`).
3. **Interactive Control Feedback:** Tactile hover, active press, and focus transitions (`150ms–220ms`).
4. **Living Media:** Subtle scroll-linked scale (`1.0 -> 1.04`) on 2K/4K plates or an Omni Flash muted video loop.
5. Wrap all spatial travel in `@media (prefers-reduced-motion: no-preference)`.

### `/ui bolder [target]` & `/ui quieter [target]`
- **`/ui bolder`:** When a page feels timid or corporate-safe, upgrade the Hero to **Giant Statement Scale**, widen display type contrast, introduce a full-bleed `4K` Nano Banana plate or panoramic `21:9` / `4:1` chapter break, and commit to stronger tonal fields.
- **`/ui quieter`:** When a page feels noisy or over-decorated (especially in `Operate` or `Read` mode), strip gradients, glows, decorative badges, and competing accents; rely on alignment, `1px` structural borders, and calm tonal steps.

### `/ui distill [target]`, `/ui harden [target]` & `/ui overdrive [target]`
- **`/ui distill`:** Cut every section, wrapper div, and paragraph that does not advance the **Claims $\rightarrow$ Proof** argument. Flatten nested cards.
- **`/ui harden`:** Add complete `loading`, `empty`, `error`, `disabled`, and `:focus-visible` states; verify keyboard tab order, `aria-label` coverage, `390px` thumb ergonomics (`>= 44px`), and zero CLS.
- **`/ui overdrive`:** Push the surface to experimental/showcase craft using **Gemini 4 Argon** (`gemini-4-argon`) to author custom GLSL fragment shaders, interactive Three.js/WebGL canvases, or scroll-pinned multi-stage choreography synchronized with **Gemini Omni 1.1 Flash** video transitions.

