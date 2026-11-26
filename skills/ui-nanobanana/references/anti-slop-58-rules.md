# The 58 Deterministic Anti-Slop Rules & Craft Floor

Used by `/ui audit`, `/ui polish`, and Step 9 of the Master Run. Every rule has a deterministic ID (`SLOP-01` through `SLOP-58`), a severity (`FAIL` blocks completion; `WARN` requires an explicit justification from the brief), what to scan in code/DOM, and the exact remediation.

---

## Category A: First-Wave AI Clichés (2023–2024)

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-01` | `FAIL` | **Purple / Indigo / Cyan AI Glow & Gradients** | `linear-gradient` or `radial-gradient` combining violet/indigo/blue/cyan (`#6366f1`, `#8b5cf6`, `#a855f7`, `#06b6d4`) | Replace with flat ground/surface tokens from `DESIGN.md` or a 2K/4K Nano Banana plate. |
| `SLOP-02` | `FAIL` | **Gradient-Filled Headline Text** | `background-clip: text` or `-webkit-text-fill-color: transparent` on `h1`–`h6` | Use solid `--ink-primary`. Create hierarchy through scale, weight, and placement. |
| `SLOP-03` | `FAIL` | **Glowing / Gradient CTA Button** | Primary button with multi-stop gradient fill or colored `box-shadow` halo (`0 0 20px`) | Solid flat fill (`--accent-primary` or `--ink-primary`) with crisp contrast and tactile active state. |
| `SLOP-04` | `FAIL` | **3-Card Icon-in-Rounded-Square Row** | 3 sibling cards in a row, each containing a tinted square/circle icon wrapper + `h3` + `<p>` | Replace with an asymmetric editorial blueprint, a specimen table, or a visual diptych. |
| `SLOP-05` | `FAIL` | **Soft Grey Drop Shadow Under Every Card** | Repeated `box-shadow: 0 4px 6px / 0 10px 15px` (`shadow-md`/`shadow-lg`) across section blocks | Remove shadows; separate surfaces using one tonal background step (`--bg-surface`) or generous whitespace. |
| `SLOP-06` | `FAIL` | **Emoji Used as UI Icons or Bullet Points** | Unicode emojis (`🚀`, `✨`, `⚡`, `🔒`, `💡`) inside headings, feature lists, or buttons | Remove emojis. Use words, tabular numerals, or a single consistent authored SVG stroke set. |
| `SLOP-07` | `WARN` | **Glassmorphism Spam** | 2+ translucent panels with `backdrop-filter: blur()` over abstract blobs | Use opaque surfaces one tone step from `--bg-ground` (reserve blur for a single sticky header if needed). |
| `SLOP-08` | `WARN` | **Unexamined Default Font (`Inter` / `Roboto` / `system-ui` as Display)** | Display headings using default browser/Tailwind sans without deliberate pairing in `DESIGN.md` | Load and self-host/import the committed display and reading typefaces defined in `DESIGN.md`. |

---

## Category B: Second-Wave AI Clichés (2025)

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-09` | `FAIL` | **Eyebrow / Kicker Label Above Headings** | Small uppercase tracked text (`font-size <= 13px`, `letter-spacing >= 0.08em`, `text-transform: uppercase`) directly above `h1`–`h3` | Delete the eyebrow. Fold its meaning into the heading or first sentence. |
| `SLOP-10` | `FAIL` | **Hero Pill Badge ("New · Beta · Introducing")** | Rounded `border-radius: 9999px` chip above the hero `h1` | Delete the pill badge. State what is new in the supporting sentence below the `h1`. |
| `SLOP-11` | `WARN` | **One Word of Headline in Italic Serif / Accent Color / Pill** | `<h1>... <em>word</em> ...</h1>` or `<span>` with different font-family/color inside `h1` | Keep the entire headline in one typeface, one weight, and one ink color. |
| `SLOP-12` | `WARN` | **Generic Rounded Bento Grid Feature Section** | 4–6 rounded (`16px–24px`) grey/translucent boxes stuffed with mini fake widgets | Use a committed section blueprint with real content or full-bleed/cropped 2K Nano Banana plates. |
| `SLOP-13` | `FAIL` | **Fake Dashboard Hero Built from Grey Bars & Donuts** | CSS/SVG mockup of an app using unlabeled grey rectangles and fake sparklines | Build a real working HTML/CSS fragment of the product with real words and math that adds up, or use a 4K Hero plate. |
| `SLOP-14` | `FAIL` | **Pulsing Status Dot ("Available for work" / "Systems operational")** | `animate-ping` or pulsing green dot in hero/header without live backend binding | Remove decorative status dots unless bound to a real status endpoint in `Operate` mode. |
| `SLOP-15` | `WARN` | **Floating Pill Navbar with Heavy Blur & Shadow** | Fixed top centered pill (`rounded-full`, `top-4`, `backdrop-blur`) | Use a full-width architectural top bar or clean margin-aligned navigation. |

---

## Category C: Third-Wave Editorial Clichés & Gallery Cosplay (2025–2026)

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-16` | `FAIL` | **Unrequested Yellow-Cream + Terracotta/Rust Default** | `#faf6f0`/`#fdfbf7` cream ground paired with `#c85a32`/`#b85d3b` terracotta when not in brief | Derive the palette from the Subject Inventory or `DESIGN.md` tokens. |
| `SLOP-17` | `FAIL` | **Decorative Index Numbering (`01 / 02 / 03`, `(001)`, `Step 02`)** | Span/div strings matching `/^(0[1-9]|\(00[1-9]\)|STEP 0[1-9])$/i` above or beside headings | Show order through spatial position, scale, or a semantic `<ol>` when sequence truly matters. |
| `SLOP-18` | `FAIL` | **Monospace Cosplay Outside Real Code/Data** | `font-family: monospace` used on section captions, nav links, or decorative micro-labels | Use the reading face for captions; use `font-variant-numeric: tabular-nums` when aligning numbers. |
| `SLOP-19` | `FAIL` | **Broadsheet Hairline Rule Grid & Outlined Boxes** | 3+ adjacent `1px solid` outlined boxes/cells or decorative full-bleed hairline dividers (`Persuade` mode) | Create structure via whitespace, tonal surface steps (`--bg-surface`), and scale contrast. |
| `SLOP-20` | `FAIL` | **Design-Tool Chrome Ornament (Crosshairs, `+` Corners, Crop Marks)** | Decorative `+` signs at grid intersections, dashed ruler lines, or fake selection handles | Delete all fake CAD/Figma ornaments. |
| `SLOP-21` | `FAIL` | **Agency Micro-Meta Clutter** | Decorative `LAT/LONG` coordinates, fake weather, `"©2026 — SCROLL"`, or live clock in corners (unless relevant to subject) | Remove unless the subject itself is maritime, aviation, or meteorological. |
| `SLOP-22` | `FAIL` | **Scattered Tiny Tracked Capitals** | 3+ instances of `font-size < 12px` + `uppercase` + `letter-spacing > 0.1em` | Use sentence case at readable size (`>= 13px–14px`) placed directly with the content it describes. |

---

## Category D: Typography & Copy Arithmetic Rules

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-23` | `FAIL` | **Headline Exceeds 2 Lines at Any Viewport** | Any `h1`–`h6` wrapping to 3+ lines at `1440px`, `768px`, or `390px` | Cut words to fit the Two-Line Headline Arithmetic ($\le 32$ chars for `h1`), set `max-width: XXch`, and add `text-wrap: balance`. |
| `SLOP-24` | `FAIL` | **Statement Marked Up as Heading or Oversized** | 15–30 word intro/manifesto set inside `<h1>`–`<h3>` or at `> 36px` desktop / `> 24px` mobile | Change tag to `<p>` or `<blockquote>` and cap size at `<= 36px` desktop / `<= 24px` mobile. |
| `SLOP-25` | `FAIL` | **Missing `h1` on First Screen or Untitled Sections** | No `<h1>` in first viewport, or content sections lacking an `<h2>` | Place one clear `<h1>` in the first viewport and a descriptive `<h2>` on every major section. |
| `SLOP-26` | `WARN` | **Too Many Nearly-Equal Font Sizes** | More than 7 distinct computed `font-size` values across the page | Consolidate to the 5 distinct steps in `DESIGN.md` (`display`, `h2`, `statement`, `body`, `caption`). |
| `SLOP-27` | `FAIL` | **Body Measure Too Wide or Too Narrow** | Paragraph lines exceeding `75ch` or narrower than `40ch` on desktop | Constrain reading columns to `60ch–72ch`. |
| `SLOP-28` | `FAIL` | **Missing `tabular-nums` on Prices, Metrics, or Live Controls** | Numeric tables, counters, or calculators using proportional numerals that jitter when changing | Apply `font-variant-numeric: tabular-nums` to all numeric displays. |
| `SLOP-29` | `FAIL` | **AI Copy Slop Vocabulary** | Uses *"Unlock"*, *"Supercharge"*, *"Seamless"*, *"Elevate"*, *"Cutting-edge"*, *"Not just X, it's Y"*, or tricolon *"Fast. Simple. Secure."* | Rewrite in plain, concrete domain language from the Subject Inventory. |
| `SLOP-30` | `FAIL` | **Vague CTA Labels (`"Get Started"`, `"Learn More"`, `"Submit"`)** | Buttons or primary links with generic labels | Name the button for the exact action (`"Book the 05:00 Table"`, `"Run the Benchmark"`, `"Download v4 Binary"`). |
| `SLOP-31` | `FAIL` | **Invented Social Proof** | Fake customer quotes, placeholder company logos, `"Trusted by 10,000+ teams"`, or fake star ratings | Delete invented proof immediately. Prove claims with product mechanics, real specs, or **One Live Thing**. |

---

## Category E: Color, Contrast & Depth Rules

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-32` | `FAIL` | **WCAG Contrast Failure** | Body/placeholder text `< 4.5:1` or large display text `< 3.0:1` against its background or image scrim | Adjust token lightness or strengthen `--scrim-hero` over 2K/4K plates until contrast passes. |
| `SLOP-33` | `FAIL` | **Dead Neutral Grey Text on Colored or Dark Grounds** | Pure achromatic grey (`#777`, `#888`, `#999`) used on a tinted or dark background (`#0c1624`) | Tint secondary ink with the ground's hue (`color-mix(in oklab, var(--ink-primary) 68%, var(--bg-ground))`). |
| `SLOP-34` | `FAIL` | **Violating `DESIGN.md` `anti_references` (e.g., Pure `#ffffff` / `#000000`)** | Hardcoded `#fff`, `white`, `#000`, `black`, or banned hues when forbidden by `DESIGN.md` | Replace all hardcoded hex/named colors with `var(--bg-ground)` and `var(--ink-primary)`. |
| `SLOP-35` | `FAIL` | **Thick Colored Left/Right Callout Borders** | `border-left: 4px solid` on cards, alerts, or list items | Use a tonal background fill step (`--bg-surface`) or clean spacing instead of stripe borders. |
| `SLOP-36` | `FAIL` | **Hard Offset Shadows (`4px 4px 0`) Outside Neobrutalism** | Zero-blur block shadows when the brief did not request a neobrutalist world | Remove hard offset shadows; use flat tonal steps. |

---

## Category F: Layout, Frame & Composition Rules

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-37` | `FAIL` | **Nested Cards (Card Inside a Card)** | A bordered/shadowed/rounded container placed inside another card container | Flatten hierarchy: outer section is a full-bleed or grid band; inner items use alignment and whitespace. |
| `SLOP-38` | `FAIL` | **Stock Section Sequence** | Page follows `Hero -> Logo Strip -> 3 Feature Cards -> Testimonial -> Pricing -> CTA` | Reorder and restructure sections strictly around the **Claims $\rightarrow$ Proof** argument. |
| `SLOP-39` | `FAIL` | **Neighboring Sections Share the Same Layout** | Two consecutive `<section>` blocks using the exact same column split or alignment | Assign a new **Composition Anchor** and **Background Mode** from [`references/art-direction-and-copy.md`](references/art-direction-and-copy.md). |
| `SLOP-40` | `WARN` | **Unexamined Left-Text / Right-Image Hero Reflex** | Hero defaults to `50/50` left headline + right box without exploring canvas/editorial anchors | Use Giant Statement Over 4K Canvas, Bottom-Left Editorial, Center-Low Stage, or Inverted 2/3 Visual. |
| `SLOP-41` | `FAIL` | **Unequal Outer Frame Margins or Huddled Half-Empty Section** | Left/right outer page margins mismatch, or a section sits in the left half leaving the right half empty | Maintain equal outer frame margins and balance asymmetric text columns with a visual plate, table, or figure on the far side. |
| `SLOP-42` | `FAIL` | **Accidental Blank Stretch (`> 0.5vh` Empty Ground)** | Vertical gap or empty container taller than half a viewport (more than once per page) | Keep desktop section rhythm to `120px–240px` (`64px–96px` on mobile). |
| `SLOP-43` | `WARN` | **Everything Centered (`> 70%` of Text Blocks)** | Hero, features, statements, and headings all `text-align: center` | Anchor primary reading structure left; reserve centering for at most one deliberate moment. |
| `SLOP-44` | `FAIL` | **Horizontal Overflow or Clipped Content at `390px` / `768px` / `1440px`** | `document.documentElement.scrollWidth > window.innerWidth` at any target viewport | Fix rogue fixed widths, grid `minmax()` minimums, or un-wrapped code/headings. |

---

## Category G: Imagery & Nano Banana Visual Quality Rules

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-45` | `FAIL` | **Broken, Missing, or Placeholder Image URLs** | `unsplash.com` random URLs, `placehold.co`, `via.placeholder`, empty `src=""`, or 404 local paths | Generate real 2K/4K assets with Nano Banana 2.1 / Pro into `public/images/` and verify `stat().st_size > 0`. |
| `SLOP-46` | `FAIL` | **Under-Built Visual Floor (`< 4` Real Visuals on a `Persuade` Page)** | Landing page relies almost entirely on text and CSS boxes with 0–2 images | Run `/ui visual-plan` to populate 4–8 cohesive 2K/4K Nano Banana plates (and/or real product UI fragments). |
| `SLOP-47` | `FAIL` | **Un-Anchored Scrapbook Imagery (No Series Lock)** | Page images have clashing color temperatures, lighting directions, or styles | Re-generate secondary plates passing the Hero image as a MIME-verified `{"type": "image", ...}` block inside `input` + `style.md` verbatim. |
| `SLOP-48` | `FAIL` | **AI Imagery Slop (Hands, Garbled Raster Text, Floating 3D Blobs)** | Generated image contains mutated hands, unreadable pseudo-text, or generic neon isometric cubes | Add strict exclusions to `style.md` and prompt as a Photographer's Brief (`"no text, no hands, no UI chrome"`). |
| `SLOP-49` | `FAIL` | **Text Lost Over Busy Image (Missing Safe Zone or Scrim)** | HTML text overlaid on a high-contrast area of a photo without a safe zone or tonal scrim | Engineer the negative-space quadrant in the Nano Banana prompt and apply `var(--scrim-hero)`. |
| `SLOP-50` | `FAIL` | **Missing `width`, `height`, `alt`, or `fetchpriority` on Images** | `<img>` tags without explicit dimensions (causes CLS) or Hero missing `fetchpriority="high"` | Add exact `width`/`height` matching the Nano Banana aspect ratio, descriptive `alt`, and `fetchpriority="high"` on Hero. |
| `SLOP-51` | `WARN` | **Inconsistent Image Corner Radii** | Mixing `0px`, `8px`, and `24px` border-radii across photos on the same page | Default to `0px` square architectural corners on all photography (or 1 uniform token). |
| `SLOP-52` | `FAIL` | **Missing `.json` Sidecar for Generated Assets** | A Nano Banana / Omni Flash / Argon asset exists on disk without its matching `<basename>.json` log | Write the sidecar JSON with `model`, `prompt`, `reference_images`, `response_id`, `params`, `cost`, and `created`. |

---

## Category H: Motion, Interaction & Browser Surface Rules

| ID | Severity | Tell / Anti-Pattern | Detection Signal | Deterministic Remediation |
|---|---|---|---|---|
| `SLOP-53` | `FAIL` | **Missing "One Live Thing" on a `Persuade` / `Experience` Build** | Page is 100% static text and pictures with nothing the visitor can manipulate or test | Build one interactive, domain-true instrument from the Idea Sentence (e.g., state-locked finish switcher, live calculator). |
| `SLOP-54` | `FAIL` | **Identical Fade-Up on Every Single Block or Bounce Easing** | Every section uses the exact same `opacity: 0 -> 1` fade or playful `cubic-bezier` bounce | Use one signature move + staggered child entrances (`60–90ms`, `cubic-bezier(0.16, 1, 0.3, 1)`). |
| `SLOP-55` | `FAIL` | **Content Stuck Hidden (`opacity: 0`) When JS Fails or Reduced Motion** | Elements default to `opacity: 0` in static CSS without a fallback or `@media (prefers-reduced-motion: reduce)` | Gate initial hidden states behind a `.js-ready` class and disable motion travel under `prefers-reduced-motion: reduce`. |
| `SLOP-56` | `FAIL` | **Un-Themed Browser Surfaces** | Default blue `::selection`, default browser `:focus-visible` ring, unthemed scrollbars, or default caret | Style `::selection`, `:focus-visible`, `caret-color`, and scrollbar tokens from `DESIGN.md`. |
| `SLOP-57` | `FAIL` | **Missing Interactive States (`hover`, `focus-visible`, `active`, `disabled`, `empty`, `error`)** | Buttons, inputs, or data views lack keyboard focus indicators or error/empty states | Implement all interactive states and verify full keyboard navigation in reading order. |
| `SLOP-58` | `FAIL` | **Mobile (`390px`) Tap Targets Too Small (`< 44x44px`)** | Buttons, nav links, or **One Live Thing** controls smaller than `44px` on touch screens | Enforce `min-height: 44px; min-width: 44px` on all interactive controls at mobile breakpoints. |

