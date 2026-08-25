# Document Design System (portable, full depth)

> **Portable by design.** Surface-agnostic guidance for authoring a beautiful,
> **self-contained** HTML document. Works for **html-docs**, **Meta Docs**, or any
> surface that stores/renders standalone HTML. Adapted from the `/visualize`
> skill's design system (its `_principles`, `components`, `animations`, and
> archetype briefs), with one hard constraint added for embedded doc surfaces:
> **self-contained, no network calls** (see below). Where `/visualize` reaches for
> Google Fonts, Chart.js, Mermaid, D3, or Motion One, this file substitutes
> system/serif font stacks, hand-authored inline SVG, and CSS-only motion —
> because html-docs renders each document inside a sandboxed shadow-DOM viewer
> and on mobile, where remote assets and heavy JS get stripped.

---

## The one hard constraint: self-contained

Everything must render from a single HTML payload with **no network calls**.

| `/visualize` uses | In a self-contained doc, instead use |
|---|---|
| Google Fonts (`@import`, `<link>`) | A named **system/serif/mono stack** (see Typography). Never *depend* on a remote font. |
| Chart.js, charts via CDN | **Hand-authored inline `<svg>`** — `<rect>` bars, `<polyline>`/`<path>` lines, `<line>`+`<text>` axes. |
| Mermaid / D3 diagrams & graphs | **Inline `<svg>`** boxes-and-arrows, or styled HTML/CSS boxes. Force-directed graphs become a hand-placed node/link SVG. |
| Motion One / WAAPI counters / IntersectionObserver reveals | **CSS-only** keyframes + `animation-delay`. Assume JS may be disabled; the doc must read perfectly static. |
| `infra.html` hamburger menu, feedback UI, save-as-image, Pixelcloud upload | **Nothing** — comments, sharing, theme, export, feedback are the doc surface's chrome. Do not build them into the HTML. |
| Footer linking back to the skill | **No templated footer.** |

Rules of thumb: inline CSS and inline `<svg>` only; no external stylesheets,
no render-blocking web-font `<link>`s, no external CDN `<script>`s, no `<img>` to
remote hosts for core content. Keep any interactivity to tiny inline `<script>` /
CSS `:target` / `<details>` — and assume it may be stripped.

---

## The Prime Directive

Every document must feel **intentionally designed for its specific content**. If
you swapped the content out, the design choices should feel wrong. Typography,
color, layout, and structure all serve THIS content, THIS audience, THIS moment.
Never ship plain HTML.

---

## Reading-surface contract

Documents are reading surfaces before they are compositions. Apply these
constraints before choosing decorative treatments:

1. Preserve a clear linear reading path. A reader should understand what comes
   first, what belongs together, and what matters most without decoding the
   layout.
2. Assign stable content roles: one title; consistent section-heading ranks;
   body; labels; evidence; actions; notes. One role gets one treatment.
3. Create hierarchy with type, weight, and spacing first. Borders, surfaces,
   shadows, and cards must communicate grouping, status, or comparison.
4. Keep long-form text near 45–75 characters per line. Use tighter line height
   for large display type and more open leading for sustained reading.
5. Keep items within a group close and put visibly more space between groups.
   Flatten wrappers that do not add meaning. Never make every group a card or
   nest decorative cards.
6. Define color by role—ink, muted ink, surface, border, accent, positive,
   warning, critical—and reuse roles consistently. State cannot rely on color
   alone.
7. A visualization must prove a relationship: sequence, causality,
   comparison, distribution, dependency, or decision. Label that relationship,
   not just the boxes.
8. Preserve reading order at narrower widths. Grids should collapse naturally;
   tables and diagrams cannot depend on hover.

For agent insertion, prefer the deterministic Docsmith visual grammar:
`callout`, `metrics`, `flow`, `timeline`, `comparison`, and `matrix`. Supply
meaning and labels; let the server own rendering. Hand-author SVG only when the
relationship cannot be expressed by those patterns.

---

## Anti-slop rules (non-negotiable — all must hold)

| Rule | Why |
|------|-----|
| **Don't use default/system-default fonts as the design.** Pick a distinctive, *named* stack matched to the content's tone (serif vs geometric-sans vs mono). Don't reuse the same pairing twice in a row. (Remote fonts are forbidden here, so distinctiveness comes from stack choice, weight, scale, letter-spacing, and pairing — not from a Google Font.) | Undifferentiated type is the #1 signal of generic AI output. |
| **Commit to ONE dominant hue** with supporting accents — not a balanced 5-color palette. Drive it with CSS custom properties. | Even color distribution is visual noise; dominance creates identity. |
| **Backgrounds have character.** Warm off-white, subtle tint, soft gradient, faint texture — never flat stark white with no atmosphere. | Flat backgrounds read as unfinished wireframes. |
| **Hierarchy through dramatic scale.** The most important element is much larger than the rest. | If everything is the same size, nothing is important. |
| **Lead with visuals, not walls of text.** Any system, flow, comparison, timeline, or set of relationships gets a diagram/illustration. | A precise diagram is the difference between a doc people skim and one they understand. |
| **One orchestrated entrance, at most.** If you animate, stagger a single CSS page-load reveal. Skip scattered micro-animations. Assume motion may be disabled. | Choreography feels designed; random motion feels noisy. |
| **Every document looks different.** Vary fonts, palette, layout, and signature across docs. If it looks like the last one, start over. | Repetition kills the value. |

---

## The Creative Brief — answer before writing any HTML

Do not skip a question. Your design should flow from these answers.

1. **PURPOSE** — What is this communicating? Who is the audience? What should
   they understand or feel afterward?
2. **METAPHOR** — What visual world does this content belong to? Name a PLACE or
   OBJECT, not the format. Not "a dashboard" but "a mission-control room"; not "a
   report" but "a field journal from an expedition." The metaphor guides every
   downstream choice — color, type, spacing, structure.
3. **TYPOGRAPHY** — Name a display stack and a body stack and WHY they fit the
   emotional register (authoritative → serif; modern → geometric sans; technical
   → mono; warm → humanist; elegant → high-contrast serif). Must stay legible at
   16px with safe fallbacks. (See the Typography system below for stacks.)
4. **PALETTE** — Name ONE dominant hue and why it matches the mood (urgent → warm
   reds; analytical → cool blues; growth → greens; creative → purples; warm →
   ambers/terracotta; technical → cool grays + one vivid accent). Then pick an
   accent that complements or creates tension.
5. **SIGNATURE** — The ONE thing someone will remember (a striking diagram, an
   unusual layout, a distinctive color pairing, a memorable CSS treatment).
   Describe it in one sentence.
6. **COMPOSITION** — Dense or spacious? Scrolling or single-screen? Centered
   reading column (900–1100px) or full-bleed? Grid or organic? Commit — no mushy
   middle ground.

---

## Typography system

Type is the highest-leverage creative decision. Remote fonts are forbidden, so
pick a **named, self-contained stack** whose personality matches the metaphor,
then create distinctiveness through weight, scale, tracking, and pairing.

| Mood | Display stack | Body stack |
|------|---------------|-----------|
| Editorial / magazine | `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` | `system-ui, -apple-system, "Segoe UI", sans-serif` |
| Technical / precise | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | `"IBM Plex Sans", system-ui, sans-serif` (fallback to system sans) |
| Bold / modern | `system-ui, "Segoe UI", Roboto, sans-serif` (heavy weights, tight tracking) | `system-ui, -apple-system, sans-serif` |
| Warm / humanist | `"Hoefler Text", Georgia, "Times New Roman", serif` | `"Segoe UI", system-ui, sans-serif` |
| Elegant / refined | `Georgia, "Times New Roman", "Liberation Serif", serif` (high contrast, large) | `system-ui, -apple-system, sans-serif` |
| Data / scientific | `ui-monospace, "SF Mono", Menlo, monospace` | `system-ui, sans-serif`, tabular numerals |

Guidance: establish **at least five type sizes** (e.g. hero, h1, h2, body,
caption). Body 15–17px, line-height 1.55–1.7. Use small-caps + letter-spacing
for section labels. Reserve mono for code, identifiers, and tabular numbers.

---

## Color system

Don't reuse the same palette across docs. Pick a **territory**, commit to one
dominant hue, choose surfaces and an accent from within it.

- **Warm earth** — terracotta, sand, olive, warm brown, burnt sienna
- **Cool ocean** — navy, teal, seafoam, pearl gray, deep blue
- **Monochromatic + pop** — shades of one hue with a single contrasting accent
- **High contrast** — near-black surfaces with one vivid accent (electric blue, hot pink, lime)
- **Muted / desaturated** — soft pastels, dusty rose, sage, lavender
- **Bold / saturated** — primary colors at intensity, playful energy
- **Jewel tones** — deep emerald, sapphire, amethyst, ruby
- **Industrial** — concrete gray, steel blue, caution yellow, rust orange
- **Nordic** — ice white, pale blue, soft gray, silver, pine green

Surface baseline for a light reading doc: near-white tinted background
(`#fafaf8`–`#f6f1e8`), deep-ink body text (`#1f1b16`–`#1a1a1a`), hairline borders
in softened ink, one accent used sparingly. **Data values stay dark** — put color
on the *container* (background tint, left-border, badge), and scale saturation
with magnitude (a +15% lift gets a more saturated tint than +3%).

---

## Motion (CSS-only)

JS may be stripped, so motion is CSS keyframes + `animation-delay`. The doc must
be perfect with motion off. Pick **one** energy preset and use it consistently.

| Preset | Duration | Easing | When |
|--------|----------|--------|------|
| Subtle | 0.5s | `cubic-bezier(0.25,0.1,0.25,1)` | reports, dashboards — content speaks |
| Energetic | 0.4s | `cubic-bezier(0.22,1,0.36,1)` | launches, showcases — momentum |
| Cinematic | 0.8s | `cubic-bezier(0.16,1,0.3,1)` | presentations, heroes — drama |
| Data-driven | 0.6s | `cubic-bezier(0.34,1.56,0.64,1)` | counters, bars — slight overshoot |

```css
@keyframes fadeInUp { from { opacity:0; transform:translateY(20px);} to { opacity:1; transform:translateY(0);} }
@keyframes fadeInScale { from { opacity:0; transform:scale(.96);} to { opacity:1; transform:scale(1);} }
@keyframes blurIn { from { opacity:0; filter:blur(8px);} to { opacity:1; filter:blur(0);} }
/* Stagger an above-the-fold reveal: */
.reveal { animation: fadeInUp .6s both; }
.reveal:nth-child(2){ animation-delay:.1s } .reveal:nth-child(3){ animation-delay:.2s }
@media (prefers-reduced-motion: reduce){ * { animation:none !important; transition:none !important } }
```

Restraint: max 3 animation types per page; no delay > 0.8s; animate `transform`
and `opacity` only (plus a one-shot `width` for progress fills). Don't animate the
same element both on load and "on scroll." Always honor `prefers-reduced-motion`.

---

## Composition principles

- **Generous negative space OR controlled density** — never a mushy middle. Decide and commit.
- **Asymmetry creates energy.** Off-center hero, broken grid, overlap. Centered is safe; safe is forgettable.
- **Hierarchy through scale.** The most important element is dramatically larger than everything else.
- **Max width matters:** 900–1100px reading column for prose; full-bleed for dashboards/graphs; 600–800px for a single diagram.

---

## Archetype catalog

Match the content to the closest archetype for layout DNA — inspiration, not a
constraint. Adapt or freestyle when nothing fits. Each entry gives when to use,
the communication goal, layout DNA, "flavor seeds" (metaphors to spark a look),
and the traps to avoid.

### Report / proposal (technical proposal, RFC, design doc)
- **When:** a problem + proposed solution with trade-offs; RFC, design doc, architecture, technical plan, findings writeup.
- **Goal:** persuade through structured reasoning — establish *why it matters* before *how to solve it*, and build credibility by honestly evaluating alternatives.
- **Layout DNA:** single scrollable doc with a sticky/anchored TOC. Status header (Draft/In Review/Approved badge + date + author) → 3-sentence TL;DR → problem → goals/non-goals → proposed solution with inline diagram → alternatives with a trade-off matrix → detailed design (data models, API shapes as code) → phased plan with milestones → risks & mitigations → open questions. Diagrams dominate their sections; show concrete code, not abstract prose. Medium density with breathing room.
- **Flavor seeds:** the Architect's Blueprint (faint grid, blue dimension lines); the War-Room Whiteboard (hand-drawn connectors, yellow "ASK?" cards, red RISK boxes); the Patent Filing (numbered sections, "Fig. 1" captions, institutional serif); the Expedition Map (problem = terrain, solution = charted route, milestones = camps).
- **Avoid:** jumping straight to the solution; presenting only one option; hand-waving the implementation; hiding risks; prose where a diagram is clearer; > ~20 sections.

### Dashboard (metrics, health, KPIs)
- **When:** primarily numeric — health scores, counts, percentages, trends; answers "how are we doing?" in under 3 seconds.
- **Goal:** assess overall status at a glance, surface what needs attention, drill in only when something looks wrong.
- **Layout DNA:** header bar (title · "last updated" · overall status badge) → row of 4–6 KPI cards with trend indicators (▲▼ deltas, inline-SVG sparklines) → 2–3 column grid of trend charts (inline SVG) → component-level breakdown tables/cards by category → alerts section at the bottom. Z-shaped reading order.
- **Flavor seeds:** Mission Control (dark, cyan/amber readouts, mono numerals); Weather Station (multi-panel, soft blues); Cockpit Instrument Panel (green/yellow/red arcs); Trading Floor Terminal (dense grid, sharp gain/loss colors); Greenhouse Monitor (warm greens, organic shapes).
- **Avoid:** > 6–8 top-level KPIs; numbers without trend direction; decorative use of status colors (green/yellow/red must mean good/warn/critical); paragraphs of prose; missing "last updated"; unlabeled charts.

### Comparison / matrix (A vs B, evaluation, tradeoffs)
- **When:** evaluating 2–4 options against multiple criteria; a "which should we use?" decision.
- **Goal:** make the right choice feel inevitable — show the recommendation, the criteria that drove it, and honest strengths/weaknesses of every option. The structure *is* the argument.
- **Layout DNA:** header stating what's compared + a recommendation summary with confidence up top. Core is the matrix: criteria as rows, options as columns, **visual scoring** in each cell (filled dots, color ratings, CSS bars). The recommended option gets a subtle but unmistakable distinction. 2 options → side-by-side "versus"; 3–4 → full matrix. Detailed per-option breakdowns below. **Keep each option on the same side/column throughout.**
- **Flavor seeds:** Boxing Tale of the Tape; Wine Tasting Scorecard (spider charts as inline SVG); Car Spec Sheet (gold "editor's pick" badge); Peer-Review Rubric (weighted scores); Restaurant Health-Inspection Card (letter grade first, evidence second).
- **Avoid:** options without defined criteria; giving the favored option more real estate; > 8–10 ungrouped criteria; text-only scoring ("Good"/"Fair") instead of visual scales; omitting the recommendation; hiding the winner's trade-offs.

### Architecture / flow / visual (diagrams, infographics, one-pagers)
- **When:** a system, pipeline, state machine, hierarchy, or relationship that's best understood spatially; embeddable infographic or "fancy diagram."
- **Goal:** communicate through spatial relationships — nesting = containment, adjacency = association, arrows = flow, color = taxonomy. Grasp the structure in a single glance.
- **Layout DNA:** fixed width (600–800px), no scroll. Nested boxes + connectors + grouping. Each category gets a distinct color (border tint + light fill). Connectors: solid = containment, dashed = optional; small edge labels say what flows. **Legend at the bottom** maps color → meaning. Clean edges, screenshot-ready. Build with inline SVG or styled HTML/CSS boxes — no diagram libraries.
- **Flavor seeds:** Circuit Board (chips + copper traces, faint grid); Botanical Illustration (specimen labels on parchment); Transit Map (stations + colored lines, schematic not literal); Stained Glass (jewel tones, black leading); Mission Patch (circular badge, functional zones).
- **Avoid:** paragraphs inside boxes (1–2 lines max); > 5–6 colors; scrolling (simplify instead); requiring JS; inconsistent styling for same-type boxes; omitting the legend.

### Timeline / roadmap (history, milestones, phases)
- **When:** a multi-phase project with deliverables and deadlines; "where are we on X?"
- **Goal:** communicate **current position** in 2 seconds and the full journey (done / in-progress / next / blockers) in 60. Forward-looking by design.
- **Layout DNA:** header (project · status badge On Track/At Risk/Blocked · date range · owner) → 3 overview cards (Goal · Current Status · Next Milestone) → the signature **horizontal timeline strip**: phase segments colored by state (done = green, current pulses with a "You Are Here" marker, upcoming = gray, blocked = red), widths ∝ duration → milestone diamonds with dates → one card per phase (status, dates, deliverables checklist) → dependencies grid → risks & open questions → a "What's Next" card (Immediate / Decisions / Blockers).
- **Flavor seeds:** Subway Map (phases = stations, pulsing "you are here"); Mountain Expedition (elevation profile, camps = milestones); Film Production Schedule (slate board); Periodic Table (phase = element); Garden Almanac (planting seasons).
- **Avoid:** > 7 phases; skipping the "You Are Here" marker; listing individual tasks (show deliverables, right altitude); vague names like "Phase 3"; omitting dates; skipping "What's Next"; ignoring risks/dependencies.

### Graph / map (entities + relationships, ecosystems)
- **When:** entities with relationships (skills, people, systems, concepts) best seen as clusters and connections, not lists.
- **Goal:** reveal hidden structure — which nodes are hubs, which clusters are isolated, which categories bridge. A tool for discovery.
- **Layout DNA (self-contained adaptation):** since there's no D3 force simulation, **hand-place nodes** in an inline `<svg>` with deliberate clustering. Node size encodes importance (e.g. connection count); node color encodes category; labels sit below nodes; links are semi-transparent lines. Include a **legend** mapping color → category. For interactivity, use only CSS `:hover` to brighten a node's neighborhood; never depend on it.
- **Flavor seeds:** Star Chart (dark sky, stars by brightness, constellation lines); Mycelium Network (organic branching); City Transit Map (stations + colored lines); Molecular Structure (atoms + bonds); Party Social Network (conversation clusters).
- **Avoid:** text inside small nodes (label below + on-hover detail); > 8–9 categories; uniform node size; missing legend; overlap (space nodes out).

### Guide / reference / FAQ (how-to, runbook, Q&A)
- **When:** question-answer pairs or step-by-step instructions organized by topic; onboarding, troubleshooting, self-service; referenced repeatedly, not read linearly.
- **Goal:** answers optimized for *retrieval*, not reading — find the answer in seconds via browse (or a tiny optional filter). Trust from consistent formatting and visible "last updated" dates.
- **Layout DNA:** optional filter input at the top ("start here") → category sections (sidebar on wide, stacked on narrow) → `<details>`/`<summary>` Q&A pairs (question always visible, answer expands) → answers under ~150 words with code/steps/short bullets → an "escalation / still stuck?" section at the bottom → small maintenance metadata. Numbered steps or accordions; copy-ready commands.
- **Flavor seeds:** Library Card Catalog (warm wood, typewritten labels); Medical Symptom Checker (clinical, high-contrast, actionable); Jukebox Selector (genre codes); Recipe Index (categories + prep time); Switchboard Directory (mono, tight, uniform).
- **Avoid:** no way to filter on a long list; inconsistent answer formats; answers > 150 words inline (link out); a flat ungrouped list; missing "last updated"; unexplained jargon; no escalation path.

### Session summary / debrief (recap, worklog, weekly update)
- **When:** what happened over a period — session, day, week; decisions, action items, progress; or a structured work digest of someone's accomplishments.
- **Goal:** absorb *what happened, what was decided, what's next* in under 30 seconds. Decisions and action items are the highest-value content and must never be buried. A debrief is a **narrative report, not a changelog** — synthesize raw items into themed highlights.
- **Layout DNA:** editorial header (name/title · period · dateline — no gradient banner) → **TL;DR block** (accent left-border, one bullet per workstream with a bolded name + impact sentence) → a small stats ribbon → **always-visible** project/workstream cards, each with a What/Why/How block and ~3 highlight cards (category-tag pills: Shipped/Impact/Community/Planning/Infra), raw artifacts tucked in a collapsed `<details>` → timeline spine for chronological recaps, with decisions in distinct callouts and action items as an owner+date checklist at the bottom. Single 900px editorial column.
- **Flavor seeds:** Long-form Journalism (Atlantic feature); Annual Report (dignified, theme-organized); Research Lab Notebook; Architecture Portfolio; Curated Exhibition Catalog. (For session recaps: Field Notebook, Mission Debrief, Sprint Board Snapshot.)
- **Avoid:** an artifact list as the primary content; collapsing the workstream sections; a gradient/dark hero (the content is the hero); charts for tiny counts ("23 diffs" as text is more honest); red/green value-judgment coloring of counts; skipping the TL;DR; action items without owners.

### Presentation deck (slides, pitch)
- **When:** content to be *presented* — sequential/narrative, paced; "slides", "deck", "talk", "pitch".
- **Goal:** one idea per slide, minimal text, maximum clarity; build ideas across slides; end with a clear ask.
- **Layout DNA:** each slide exactly `100vw × 100vh`, `overflow:hidden`, centered. Title → context → one-idea content slides (each with a visual anchor) → summary (≤3 bullets) → call to action. Large type (headlines 2.5rem+, body 1.25rem+, ≤6 lines/slide). Scroll-snap (`scroll-snap-type:y mandatory`, each slide `scroll-snap-align:start`) is the self-contained, JS-free navigation; a visible slide counter as static text. (Arrow-key nav is the one acceptable tiny inline `<script>`, but the deck must work by scrolling alone.)
- **Flavor seeds:** Editorial/Magazine; Luxury/Refined (serif, muted, gold accents); Bold/Geometric (oversized numbers); Dark/Cinematic; Minimal/Swiss.
- **Avoid:** walls of text (then it's a doc); 5+ column data tables (use a chart); fonts < 1rem; no focal point per slide; a 15-item agenda; decoration without meaning.

### Experiment / data report (A/B test, analysis, findings)
- **When:** a hypothesis tested with data; metrics, stat results, before/after; "experiment", "results", "analysis", "deep dive".
- **Goal:** lead with the verdict; layer depth (executive summary → key metrics → detailed breakdowns → root cause) so each layer adds detail without requiring the rest.
- **Layout DNA:** header (title · ID · date range · platform) → **verdict callout** (severity-colored) + 4–6 metric cards → tabbed/multi-scope tables → the "smoking gun" breakdown → daily-trend chart (inline SVG line) → historical comparison → root-cause hypothesis cards (Primary/Secondary/Tertiary with evidence + verification) → numbered recommendations → linked data sources. **Readable numbers, colored containers:** values stay dark; tint the container, scale saturation with magnitude; always show confidence interval + significance (SS/NSS) badges.
- **Flavor seeds:** Scientific/Academic; Data Dashboard; Corporate Clean; Notebook/Lab; Editorial Data (NYT/Economist chart typography).
- **Avoid:** burying the conclusion; colored *text* for data values (color the container); numbers without CIs or SS/NSS; uniform color intensity; one scope only; cherry-picking segments; pie charts for small deltas; skipping historical context; hypotheses without evidence; prose where a table fits.

---

## Diagrams & illustrations (inline SVG)

- **When:** architecture/data-flow, pipelines/state machines, comparisons, concepts, metrics, relationships.
- **How:** inline `<svg viewBox=… width="100%">` for crisp scalable graphics, or styled HTML/CSS boxes for simple flows. Always self-contained — no libraries.
- **Color-code consistently:** one color per component/layer/persona, reused throughout, with a small **legend**. **Label every box and arrow**; annotate edges with what flows across them.
- **Charts:** bars are `<rect>`s, lines are `<polyline>`/`<path>`, axes are `<line>`+`<text>`, sparklines are a single `<polyline>`. Keep them small and labeled.
- **Clean & explanatory:** generous whitespace, the single accent hue, soft borders, legible type. Every line/color must aid understanding — if a visual doesn't make something clearer, drop it. A few precise diagrams beat one busy one.

Tiny inline-SVG flow (3 stages with arrows):

```html
<svg viewBox="0 0 520 90" width="100%" role="img" aria-label="Capture → Author → Publish"
     font-family="system-ui" font-size="12">
  <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L6,3 L0,6 Z" fill="#8A8A8A"/></marker></defs>
  <rect x="8"   y="28" width="140" height="34" rx="6" fill="#fff" stroke="#E5E0D3"/>
  <rect x="190" y="28" width="140" height="34" rx="6" fill="#fff" stroke="#E5E0D3"/>
  <rect x="372" y="28" width="140" height="34" rx="6" fill="#fff" stroke="#E5E0D3"/>
  <text x="78"  y="49" text-anchor="middle">Capture</text>
  <text x="260" y="49" text-anchor="middle">Author</text>
  <text x="442" y="49" text-anchor="middle">Publish</text>
  <line x1="148" y1="45" x2="190" y2="45" stroke="#8A8A8A" marker-end="url(#arrow)"/>
  <line x1="330" y1="45" x2="372" y2="45" stroke="#8A8A8A" marker-end="url(#arrow)"/>
</svg>
```

---

## Component patterns (style to match your brief — don't force-include)

Starting points, not finished designs. Style each to your palette and type.
Items marked **(needs JS)** require a tiny inline script and must degrade
gracefully — never required for the content to be usable.

- **Metric card** — large dark value, small muted label, optional ▲▼ trend; grid `repeat(auto-fit, minmax(200px,1fr))`; rounded surface. Color the card, not the number; scale tint with magnitude.
- **Callout / alert** — icon + bold title + body, 4px left-border accent; info/success/warning/error tints (use `color-mix()` for backgrounds). Icons: ℹ ✓ ⚠ ✕.
- **Collapsible** — `<details><summary>` with a rotating chevron; for deep dives / optional detail. Pure HTML, no JS.
- **Table** — `table-layout:fixed; width:100%` for even columns; `overflow-wrap:anywhere` so long cells wrap; uppercase tinted header row; subtle row separators. For data: colored cell backgrounds by direction/magnitude, dark text.
- **Timeline** — vertical line (gradient accent→border) + circular markers; date/title/body stacked; stagger the entrance.
- **Progress / proportion** — label row (name + %) over an 8px rounded track; accent fill via CSS `width` (the one allowed width transition).
- **Tag / badge** — pill `<span>`, tinted by status (primary/success/warning/error/neutral); 0.7–0.75rem, tight tracking.
- **Code block** — dark surface (`#0f172a`), monospace, ~0.85rem; language label in a header bar. Copy button only **(needs JS)** — never required.
- **Tabs** — button row + panels, active state via class. **(needs JS)** — prefer `<details>` or anchored sections when JS can't be assumed.
- **Anchored Table of Contents** — sticky `<nav>` of `<h2>`/`<h3>` links; on links to in-page anchors use `html{scroll-behavior:smooth; scroll-padding-top:2rem}`. Hide under ~1400px and in print.

---

## Theming (optional)

Only if the surface supports a light/dark toggle you've been told to target,
follow the contract: `:root` = **light** (light backgrounds, dark text; the page
loads light by default) and `body.dark-mode` = **dark**. Make dark a *redesign*
(adjust hue/saturation/surfaces), not a black/white inversion. Otherwise author a
single light, surface-harmonious palette and stop there.
