---
name: design-spatial
description: Design — spatial composition
risk: unknown
source: https://github.com/connerkward/ckw-design-skill/tree/main/deterministic-design/design-spatial
source_repo: connerkward/ckw-design-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/connerkward/ckw-design-skill/blob/main/LICENSE
---

# Design — spatial composition
## When to Use

Use this skill when you need design — spatial composition.


A model cannot trust its own UI output. Everything else follows from two failures.

## 1. It can't see what it made

UI is generated as a token stream, never as pixels — so the model cannot perceive collisions, overlap, imbalance, or broken spacing. It will write a headline that runs into the hero image and have no idea.

**Render it and judge the image, not the code.** Serve with any static server (e.g. `python3 -m http.server` or `npx serve`) and screenshot headless via Playwright. Screenshot at a few widths.

**Critique with fresh eyes — not your own.** Grading your own output rationalizes it; the builder looks at its overlapping headline and calls it fine (this is exactly how a real collision shipped in testing). Use a separate judge — a subagent that did *not* write the page — and tell it to hunt for what's *wrong*: collisions, edge tangents, ragged alignment, lopsided weight, no clear focal point, breaks at some width. Fix, re-render, re-judge.

## 2. Its first idea is the average

Whatever it produces first is the mean of its training data — and there is more than one mean:

- the **generic-AI mean**: Inter, purple-on-white gradients, centered single column, three equal cards;
- the **designer-trend mean**: oversized condensed caps, dark-mode + grain, monospace "vibes" microtext, sticker badges.

Landing on the second isn't taste — it's a more flattering average, which is why it slips past. **Treat your first instinct as the mean and deviate deliberately — toward *this product's specific world*** (use design-thinking's domain / color-world / signature as the direction), **not toward another trend.** If the result could be any startup, you shipped the mean.

## 3. So don't prescribe a style

Any fixed rule — a 12-col grid, an 8-point scale, "mono = data" — *becomes* next cycle's mean, and a blind model executes it into collisions anyway. Prescribe the **process, not the look**: see it with fresh eyes, and push off the average toward the domain. Taste supplies the direction (design-thinking / design-philosophy); this skill only insists you **look** and **don't ship the mean**.

For iterative spatial tuning, a local page with live controls (sliders, pickers, drag handles) beats one-shot critique.

## 4. NEVER ship horizontal overflow — THE mandatory gate, no exceptions

> **BLOCKING GATE. You may not call any web UI "done", "working", "fixed", or
> "looks good" until you have run the `scrollWidth` check below at a narrow width
> THIS turn and seen `0`. Not "I added overflow-x:clip so it's fine." Not "it
> looked fine at my width." MEASURE. Narrow. Every time. If you didn't measure,
> it isn't done — say "haven't checked overflow yet" instead of claiming done.**

A side-to-side scrollbar that doesn't match the content is the **single most common
and most embarrassing** layout failure, and it ships *over and over* because the dev
viewport is wide enough to hide it — the overflow only appears once the window is
narrower than some element. It is **invisible at desktop width**, so the §1
render-critique loop will NOT catch it unless you screenshot narrow. Separate,
explicit, non-negotiable gate.

**It recurs because layouts GROW after they were last checked.** Every time you add a
nav tab, a toolbar button, a header control, a chip, a wider equation/`<pre>`, or any
new item to a `flex`/`inline` row, you have invalidated the last overflow check — the
row that fit yesterday now pushes past the edge between ~720–1200px while your 1440px
dev window shows nothing wrong. (Real ship, 2026-06, TWICE: a progress-bar edge label
overflowed 23px; then a `flex-wrap:nowrap` header that grew 4 tabs scrolled the whole
page 309px across 720–1200px — both invisible at dev width, both caught only by
measuring narrow.) **So: any change that adds an element to a horizontal row re-arms
this gate. Re-measure.**

**Default defenses to apply up front (so the gate passes by construction):**
- **Header / nav / toolbar rows: `flex-wrap: wrap`, never `nowrap`.** A growing
  single-row flex is the #1 source of this bug. Wrapping is a no-op when it fits and
  saves you when it doesn't.
- **`body { overflow-x: clip }`** as a backstop on every app (clip, not hidden — keeps
  sticky/anchored layouts working). A backstop, NOT a substitute for measuring.

**The check — run before calling ANY page done:** `document.documentElement.scrollWidth - document.documentElement.clientWidth` must equal `0`, tested at your dev width AND resized narrow (≤1024px, and a phone width ~390px). If > 0, find the offender:
```js
document.querySelectorAll('*').forEach(el=>{const r=el.getBoundingClientRect();
  if(r.right>innerWidth+1||r.left<-1) console.log(Math.round(r.right), el);});
```

**Safety net:** `overflow-x: clip` on `body` (prefer `clip` over `hidden` — it clips without creating a scroll container, so it won't break `position:sticky`/anchored layouts). But a net is not a fix — **find and kill the root cause:**

- **`position:absolute` + `white-space:nowrap` anchored at an edge** (`left:100%`, `right:0`): a *centered* nowrap label on the right edge juts past the viewport. (Real ship, 2026-06: a progress bar's "300 · learned model" milestone label at `left:100%` with `translateX(-50%)` overflowed 23px → phantom horizontal scroll at sub-1180px widths.) **Anchor edge labels inward** — right end `right:0; transform:none`, left end `left:0; transform:none`.
- **`100vw`** — includes the scrollbar width (~15px), so on any vertically-scrolling page it guarantees ~15px of horizontal overflow. Use `100%`.
- **flex / grid children without `min-width:0`** — they refuse to shrink below their content and blow out the track (a long title in a flex card, a `<pre>` in a grid cell). Add `min-width:0`.
- **long unbreakable strings** (URLs, hashes, tokens): `overflow-wrap:anywhere` or `word-break:break-word`.
- fixed pixel widths wider than the viewport; large negative margins; oversized `position:absolute` elements.

The generalization: **anything pinned to an edge or sized in viewport units is a horizontal-overflow suspect — test narrow, measure `scrollWidth`, clip the body as backstop, and anchor edge-pinned content inward.**

## 5. Lay out in TASK order — minimize transition cost

Before placing elements, **walk the user's actual step sequence for completing the
page's action**, then arrange elements in that same perceptual/view order. The
layout should read like the task: orient → work → confirm. Any mouse travel or
scrolling that serves no practical purpose is a defect.

- **Orient at top:** controls/options up top are good — they tell the user what
  the page is for and what it can do before they commit to reading it.
- **Confirm where the work ENDS:** if the task is "review a long list, then act"
  (approve, flag, submit, save), the action buttons must ALSO exist at the
  bottom — where the user's eyes and cursor are when they finish. The original
  failure: a delete-review page with confirm buttons only in the top toolbar —
  after scrolling through 120 images, the user had to scroll all the way back up
  to click "flag the rest." Duplicate the action bar at the bottom (or make the
  toolbar sticky); both are one line of code, the scroll-back is paid per page.
- **The heuristic: save the user transit time.** Every interaction has a path:
  where the eyes/cursor are when a step ends vs where the next step's control
  is. Sum those distances; shrink the big ones. Fitts's law for the page as a
  whole, not just one button.
- **Check it in the render-and-critique loop (§1):** ask the judge "trace the
  task: where is the user when they finish each step, and how far is the next
  control?" — a layout can be aligned, balanced, and still force a round trip.

## 6. Balance is measurable — don't eyeball it (or trust a VLM's eye)

§1 says render and have fresh eyes critique it. That qualitative pass catches
collisions and ragged alignment, but **a model has no reliable sense of visual
balance** — ask a VLM "is this centered / balanced?" and it confabulates a verdict.
The fix is to stop asking opinions and **measure a number**, then keep that number
honest with an *independent* check. Use both: §1's fresh-eyes critique AND the hard
number below. (This pairs a live in-browser box model + auto-balancer with an
offline pixel-oracle that re-measures the rendered screenshot — see the
`layout-audit.js` companion script in this skill.)

**The principle.** Visual balance is the *center of mass of visual weight*. It's
arithmetic, not taste — so compute it.

**Optical center, not geometric.** Target `x = 0.50`, `y ≈ 0.46` — slightly high,
because a centroid at literal 50% reads as sagging.

**Visual weight = area × ink-density, not area alone.** Same-size ≠ same-weight: a
solid-black heading is heavy; a grey/ASCII/light image reads far lighter than its
area; body text is sparse. Calibrated starting multipliers (from `asym.html`, re-tune
per project — these were hand-guesses until corrected against the pixel oracle):
```js
const DENS = {portrait:0.34, h1:0.82, kicker:0.42, lead:0.22, body:0.16, meta:0.5};
```

**Centroid.** Per axis, `centroid = Σ(wᵢ·posᵢ) / Σwᵢ`; balanced ⇔ the centroid sits
on the optical center. To FIX imbalance, think see-saw: what counts is the **moment**
= weight × distance-from-axis, so a heavy element near the edge is counterweighted by
(a) an opposing weight, (b) a bigger element on the other side, (c) pulling the heavy
element inward (shorter lever arm), or (d) shrinking it. That's exactly the
auto-balancer's escalation order in `asym.html` — grow the opposing heading first
(cheapest), then add weight, then pull the heavy element in, then shrink it (last
resort).

**Two models — and why you need the independent one:**
- **Cheap box model** (live tuning): put each element's weight at its bounding-box
  *center*. Instant, fine for dragging sliders. BUT it has a systematic bug —
  left-aligned text's ink sits *left* of its box, so the box model misplaces the
  weight. A metric that shares the layout's own assumptions is **circular**; it once
  reported "balanced" at a pixel-measured 0.93 lopsided.
- **Ground-truth pixel oracle** (`analyze.py`): rasterize the *rendered* page
  (Playwright screenshot or html2canvas) and take the centroid of actual non-paper
  pixels, weighting each pixel by its distance from the background color. It knows
  nothing about the layout's intent — it just counts ink. **When the box model and
  the pixels disagree, the pixels win.** (`asym.html` closes the loop: it regresses
  the box-vs-pixel discrepancy and offers a trust dial α to blend toward the oracle.)
- **Acceptance criterion (measurable):** `|centroid_x − 0.50| < 0.03` and
  `|centroid_y − 0.46| < 0.04`, plus low left/right and top/bottom imbalance
  (`|w_left − w_right| / total`).

**The verification gate (lighter than §4's, same spirit).** Before calling a
balance-critical layout "balanced", do NOT assert it from the code or a VLM opinion —
screenshot the *rendered* page, compute the ink-centroid offset from optical center,
and report the actual number. This is the design-skill application of
`verify-outputs-rule`: look at the real artifact, and make the validating check
(pixels) independent of the thing you tuned (the layout). It's the quantitative
complement to §1's qualitative critique.

## 7. The layout audit — metrics that MEDIATE the eye, never replace it

§6 covers balance; this generalizes it to a full deterministic sweep, and fixes the
failure mode that matters most: **the model reads a metric/JSON and never looks at the
screenshot, so it can't apply the common sense that catches the metric being wrong.**

`scripts/layout-audit.js` is a dependency-free pass you run via Playwright MCP
`browser_evaluate` on a rendered page. It measures six things deterministically — all
geometry, color, and pixels, no "does this look right?":

| check | how (deterministic) | tier |
|---|---|---|
| **collision** | content-rect intersection ≥12% | gate |
| **contrast** | WCAG luminance ratio of text vs effective bg (<4.5, large <3) | gate |
| **tap** | interactive targets <44×44 (Apple HIG) | gate |
| **overflow** | `scrollWidth − clientWidth` (the §4 gate) | gate |
| **alignment** | left-edge clusters → near-misses 1–7px off the shared line | signal |
| **spacing** | gap CoV among a container's children | signal |
| **balance** | ink-density-weighted centroid vs optical center (§6) | signal |

**What makes it mediate rather than replace:** it doesn't just return JSON — it **draws
every finding as an SVG overlay onto the page**, so the *next* `browser_take_screenshot`
is an **annotated screenshot**. The number tells you WHERE to look; you then look and
decide. This is mandatory, not optional:

```
browser_evaluate({ function: "() => { <paste scripts/layout-audit.js> ; return __audit({}); }" })
browser_take_screenshot()      // ← the overlay is now on the page. VIEW IT. Reason over it.
```

Pass `{align:'.card .title,.card .price', space:'.feature-list'}` to scope the two
selector-dependent checks; pass `{contentSelector:'…'}` for non-semantic layouts where
collision needs help finding the blocks.

**These are HEURISTICS, not laws — and they split into two kinds you must not conflate:**

- **GATES = correctness** (overflow, contrast, tap). These measure accessibility/
  usability *facts*, not taste. Failing one is a real defect. Safe to **block** on.
  (Collision is a near-gate: usually a real bug, but can be intentional — so eye-confirm,
  don't auto-fail.)
- **SIGNALS = convention** (balance, alignment, spacing rhythm). These measure how
  closely the layout matches a *symmetric, regular, gridded* aesthetic — which is exactly
  the **generic mean** §2 tells you to push *away* from. **Optimizing a layout to maximize
  these scores makes it blander.** An off-center balance, a deliberate misalignment, an
  uneven rhythm are core creative tools and frequently the best thing on the page. Treat
  signals as "worth a look," **never** as defects to fix.

**The discipline (the whole point — bias hard toward this):**
- **Never accept a metric you have not looked at.** A flag is a *pointer to look*, not a
  verdict. Reading `collisions: 1` and acting without viewing the annotated shot is the
  exact failure this section exists to kill.
- **Use signals to catch ACCIDENTS, never to enforce convention.** A 7px alignment drift
  you didn't mean, a phantom scrollbar, a 1.9:1 caption — catch those. But the *same*
  balance/alignment/spacing signal fires on deliberate asymmetry, intentional overlap,
  and expressive rhythm. **When the metric and the interesting choice conflict, the
  interesting choice usually wins.** Do not "fix" a signal toward symmetry/evenness unless
  the eye judges the deviation actually worse. A model that maximizes these scores designs
  the mean.
- **Overrule flags the eye judges intentional.** Brutalist headline overlap, avatar on a
  banner, asymmetric hero — the metric flags them; common sense overrules. Proven live in
  the worked example: obeying the collision check on the brutalist mock removes the overlap
  and the design goes *flat*.
- **Gates are necessary, not sufficient.** `gates_pass:true` (overflow/contrast/tap all 0)
  clears the deterministic floor — it does **not** mean the layout is good. A bland centered
  template passes every gate and is still the mean. After gates pass, the real judgment (§1
  fresh-eyes critique, taste, brand fit) still has to happen.

**The proof, made concrete:** build a page that runs all six algorithms live on a few
realistic mock sites in different styles, each with a toggle between the layout **as
designed** and the version **obeying the metric**, plus on-render overlays. It shows both
halves: obeying a *gate* fixes a real bug (low-contrast CTA, sub-44 tap target, overlapping
cards), while obeying a *signal* makes it worse (an asymmetric editorial hero is the more
interesting layout; "correcting" a deliberate brutalist overlap flattens it). That explorable
is where `layout-audit.js` was distilled from.

## 8. Optical craft — perception beats geometry

The audit's alignment check (§7) measures *geometric* edges. The eye doesn't read geometry,
it reads perception — so a few cases need a manual nudge the metric can't make. These are
eye-judgments, not gates. (From the Web Interface Guidelines, `vercel-labs/web-interface-guidelines` @ `4e799d4`.)

- **Optical alignment — nudge ±1–2px when it *looks* off though it measures centered.** A
  play-triangle in a round button must shift right of geometric center to look centered (its
  visual mass is left-biased). Glyphs, arrows, and asymmetric icons often need the same. Text
  vertically centered by box metrics frequently sits a hair low — lift it. Geometry is the
  starting point; the eye is the judge.
- **Balance icon/text lockups.** When an icon sits beside text, match their *visual weight* —
  adjust the icon's stroke, size, spacing, or color so neither overpowers. A thin-stroke icon
  next to medium-weight text looks weak; thicken its stroke (or size it up slightly) so they
  read as one lockup. Optical size, not equal pixel size, is the target.
- This is the same principle as the §6/§7 debias: the number gets you close; the eye makes the
  final 1px call. Don't let a geometric alignment metric *prevent* an optical correction.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
