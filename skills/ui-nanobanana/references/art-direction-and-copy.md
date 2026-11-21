# Art Direction, Copy Arithmetic & Combinatorial Composition

Distilled from **Taste Skill**'s empirical study of 247 curated gallery sites (One Page Love, Awwwards Sites of the Day) and **Imagegen Frontend Web**, this reference replaces LLM layout defaults with deliberate art direction.

---

## 1. The Subject Inventory & The Competitor Test

Before picking a layout or writing a prompt, compile **8 to 12 concrete specifics** about the subject:

| Dimension | What to extract | Weak (Category Cliché) | Strong (Subject Inventory) |
|---|---|---|---|
| **Name & Etymology** | What the name literally means or references | "A modern coffee shop" | "Named *Seven Doors* after the 7 arched timber doors on Rue des Chartreux" |
| **Materials & Surfaces** | What you touch or see up close | "High-quality ingredients" | "Basalt stone hearth, unbleached linen proofing cloths, charred larch counters" |
| **Numbers & Constraints** | Real limits that prove authenticity | "Fast and reliable" | "14 seats, 1 batch of 80 loaves at 05:00, closes when sold out, 28ms p99 latency" |
| **Artifacts** | Printed or digital objects of its world | "Great user experience" | "Stamped wax batch tag, thermal roast log strip, JSON schema diff view" |
| **Ritual / Sequence** | How the work happens in time | "Easy 3-step process" | "Grain milled at 22:00 -> cold ferment 18h -> deck oven at 260°C" |

### The Idea Sentence
Do not write markup until both blanks are filled from the Subject Inventory:

> *"On this page, **[specific item from the Subject Inventory]** becomes **[the structural or visual device on the page]**."*

- **Competitor Test:** Replace the client's name with their nearest competitor. If the sentence still makes sense (*"On this page, fresh coffee beans become a clean grid"*), **it fails**. If only this subject can own it (*"On this page, the 18-hour fermentation temperature curve becomes the scroll spine that reveals each loaf"*), **it passes**.

### "One Live Thing"
Every winning gallery page in blind testing had **one interactive, functional element** built from the Idea Sentence that visitors could manipulate immediately:
- **Physical / Craft / E-Commerce:** Switch between 3 real material finishes (using 3 Series-Locked Nano Banana 2K plates) and see weight, grain, and price update live; drag a room-size slider to see scale.
- **SaaS / Developer Tools / Fintech:** Paste or toggle a real payload/query and see the live compiled output, token savings, or fee arithmetic calculate instantaneously with `tabular-nums`.
- **Hospitality / Events / Studios:** Live local status derived from real schedule math (e.g., whether the kiln/oven is firing right now, time until next departure, interactive seat/stage acoustic preview).
- **Rules for One Live Thing:**
  1. Uses real domain logic and realistic data — never dummy buttons that do nothing.
  2. Works with a thumb on a `390px` phone screen (`min-height: 44px` hit targets).
  3. Keyboard accessible (`Tab`, `ArrowLeft`/`ArrowRight`, `Enter`) with visible `:focus-visible`.
  4. Renders a complete, meaningful default state before the user touches anything.
  5. One focused interactive instrument — not a chaotic playground of five competing widgets.

---

## 2. Copy Deck & The Two-Line Headline Arithmetic

Copy is architecture. A four-line headline breaks every layout; a page of generic slogans fails even with 4K photography.

### Write the Argument First (Claims $\rightarrow$ Proof)
List every section as a single claim paired with its visual/interactive proof. Delete any section that has no distinct claim:
```text
Section 1 (Hero):    Zero-zone reactive state in 1.8KB.           -> Live signal graph + 4K dark studio hardware plate
Section 2 (Proof):   Benchmarked across 100,000 DOM nodes at 120fps. -> Interactive node-count scrubber ("One Live Thing")
Section 3 (Anatomy): Three primitives replace 14 RxJS operators.  -> Side-by-side code diff + Argon SVG architecture diagram
Section 4 (Action):  Migrate a production route in one command.   -> CLI copy block + primary action button
```

### The Two-Line Headline Law
Every headline (`h1`–`h6`) at every viewport (`1440px`, `768px`, `390px`) **must fit in 2 lines or fewer**.

Use the character-budget equation before committing to headline wording:
$$\text{Characters per line} \approx \frac{\text{Line width in px}}{\text{Font size in px} \times k}$$
- $k \approx 0.40$ — Condensed display faces
- $k \approx 0.50$ — Standard grotesks and editorial serifs at display size with tight tracking (`-0.03em`)
- $k \approx 0.58$ — Wide / extended faces or all-caps settings

| Viewport | Container Measure | Font Size | Chars / Line ($k=0.50$) | **Max 2-Line Budget** |
|---|---|---|---|---|
| **Mobile (`390px`, `20px` gutters)** | `350px` | `44px` | ~16 chars | **~32 characters (4–6 words)** |
| **Tablet (`768px`)** | `690px` | `64px` | ~22 chars | **~44 characters** |
| **Desktop (`1440px`, full 12-col)** | `1100px` | `104px` | ~21 chars | **~42 characters** |
| **Desktop (`1440px`, 6-col split)** | `620px` | `72px` | ~17 chars | **~34 characters** |

- **Hero `h1` Golden Rule:** Keep hero headlines to **$\le 32$ characters (4–6 words)**. Apply `max-width: 16ch` (adjusted to your break) and `text-wrap: balance`.
- **Section `h2`–`h3` Golden Rule:** **2 to 5 words** ($\le 28$ characters).
- **Statements are `<p>` or `<blockquote>`, NOT headings:** If you want a 20–25 word manifesto sentence set large across 3 lines, mark it up as `<p class="statement">` or `<blockquote>` and cap its size at **`<= 36px` on desktop, `<= 32px` on tablet, and `<= 24px` on mobile**. Never set a 20-word sentence at `56px` inside an `<h2>`.
- **Supporting Line:** Placed `32–48px` directly below the `h1`, $\le 22$ words, stating plainly what the subject is and does. Never repeat the headline in different words.

---

## 3. Combinatorial Variation Engine (Breaking AI Layout Slop)

The #1 structural tell of AI-generated frontend code is opening with a **left-text / right-image hero** followed by centered 3-column card rows. Choose one cohesive vector from each row below and commit to it:

### A. Hero Scale & Architecture (Pick 1 — Avoid Left-Text/Right-Image by Default)
1. **Giant Statement Over 4K Canvas:** Full-bleed (`100vw`, `85–100vh`) Nano Banana 4K plate or Omni Flash muted video loop; `h1` ($\le 32$ chars) + supporting sentence + primary CTA anchored in the **bottom-left** or **top-left** engineered negative-space safe zone.
2. **Editorial Offset Diptych:** Asymmetric `7-col / 5-col` or `8-col / 4-col` architectural split; oversized display headline spanning across the boundary or anchored low against a tall `3:4` portrait 2K plate.
3. **Center-Low Stage:** Full-width typographic header at the top edge, dramatic 21:9 panoramic 4K plate across the middle band, supporting claim and interactive **One Live Thing** docked cleanly below.
4. **Mini Minimalist Restraint:** Generous field of ground color (`70%` negative space), precision micro-artifact or single macro crop in the center, razor-sharp 5-word `h1` and immediate interactive tool.
5. **Inverted Classic (`Right-Text / Left-2/3-Image`):** When a split hero is genuinely needed, lead with the 2K/4K visual across the left two-thirds and anchor the copy deck in the right third.

### B. Per-Section Composition Anchors (Use $\ge 3$ Distinct Anchors Across the Page)
Never repeat the same layout family in two neighboring sections:
- `Anchor 1` — **Bottom-Left Overlay on Full-Bleed 2K/4K Plate**
- `Anchor 2` — **Asymmetric 4-Col Sticky Claim + 8-Col Staggered Visuals/Proof**
- `Anchor 3` — **Full-Width Panoramic `21:9` or `4:1` Visual Band + 2-Column Caption Ledger Below**
- `Anchor 4` — **Color-Blocked Diptych (50/50 contrasting tonal fields meeting without borders)**
- `Anchor 5` — **8-Col Interactive "One Live Thing" Stage + 4-Col Specification Rail**
- `Anchor 6` — **Editorial Specimen Table (Full-width typographic ledger with tabular numerals & hover preview crops)**

### C. Per-Section Background Modes (Vary Deliberately)
- Primary ground field (`--bg-ground`) with inline architectural crops
- One tonal step surface (`--bg-surface`) — replaces cards and drop shadows
- Full-bleed 2K/4K Nano Banana plate with palette-locked tonal scrim (`--scrim-hero`)
- Engravings, technical schematics, or line art blended onto the ground via `mix-blend-mode: multiply` (light mode) or `mix-blend-mode: screen` / `lighten` (dark mode)
- Bold Studio Solid chapter switch (one section shifts to `--accent-primary` or a deep complementary field with high-contrast ink)

### D. Second-Read Moment (Pick 1 Subtle Signature Detail)
Place one memorable, functional craft detail once on the page:
- A macro material crop from Nano Banana that reveals real surface grain at `1:1` pixel scale on hover/scroll
- A vertical margin specification rail showing live scroll coordinates, section claim index, or batch telemetry in `tabular-nums`
- An interactive before/after or state scrubber built directly into a section's visual plate

---

## 4. `Operate` Mode: Dashboards, Admin Views & App Screens

When building or refining an app screen (`Operate` mode) or an embedded product UI fragment inside a marketing page:
- **No Marketing Theatrics:** No giant display heroes, no scroll scenes, no decorative photography inside workspaces.
- **Quiet Hierarchy:** Structure comes from alignment, `1px solid var(--border-subtle)` dividers, and one tonal step (`--bg-surface` vs `--bg-ground`).
- **Honest Data & Charts:**
  - Every table column of numbers uses `font-variant-numeric: tabular-nums` and right-alignment.
  - Numbers must add up mathematically (if 4 rows sum to a total, the total must equal their exact sum; percentages must sum to `100%`).
  - Charts are crisp inline SVGs using at most 2–3 palette tokens (primary series in `--accent-primary`, comparison in `--ink-muted`, gridlines in `--border-subtle`) — never rainbow 8-color pie charts or glowing neon area fills.
- **Where Nano Banana Shines in `Operate` Mode:**
  - Cohesive, studio-lit user/team avatars or product thumbnail crops (`1:1`, `1K`/`2K`).
  - Tactile, brand-locked empty-state object illustrations (generated on `--bg-ground` hex background so they sit seamlessly without a bounding box).

