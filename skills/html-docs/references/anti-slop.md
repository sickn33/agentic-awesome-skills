# Anti-Slop — the tells of AI-generated design, and how to avoid them

"Slop" is the generic, default-looking output that screams *an AI made this in
one pass*. It's not that any single choice is wrong — it's that the same dozen
defaults show up in every page, so everything looks the same and nothing looks
*designed*. This file is a catalog of the most common tells, each with a way to
**detect** it (a heuristic you can check against your own draft) and a **fix**.

Read [design-system.md](design-system.md) first for the positive vision. This
file is the negative space: what to stop doing. Run through it like a linter
before you publish anything non-trivial.

> How to use this: after you draft a doc, scan this list and honestly ask "did
> I do that?" for each entry. Every "yes" is a place the doc looks like every
> other AI doc. Fix the worst three before shipping.

---

## Typography tells

### 1. The default font stack nobody chose
- **Detect:** Body text is in Inter, Roboto, Arial, Helvetica, or unstyled
  `sans-serif`, and you never made a deliberate type decision.
- **Why it's slop:** These are the fonts that appear when no one picked a font.
  They carry no mood, so the page reads as "untouched template."
- **Fix:** Choose a stack that fits the doc's character (see the mood stacks in
  design-system.md). A serif display face for the headline alone transforms a
  page. System stacks are fine — `ui-serif, Georgia, serif` for an editorial
  feel, `ui-monospace, "SF Mono", monospace` for something technical — but
  *choose* one.

### 2. One size fits all
- **Detect:** The biggest text on the page is less than ~2.5× the body size.
  Headings are `1.25rem`, body is `1rem`, everything is muddy and flat.
- **Why it's slop:** No dramatic scale means no hierarchy means no focal point.
- **Fix:** Make the hero/headline genuinely large (`clamp(2.5rem, 6vw, 4.5rem)`
  for a title). Let the jump between levels be obvious. Contrast in size is the
  cheapest, strongest hierarchy tool you have.

### 3. Gradient text on everything
- **Detect:** `background: linear-gradient(...); -webkit-background-clip: text;`
  applied to headings as the default "make it pop" move.
- **Why it's slop:** It was novel in 2021. Now it's the single most overused
  AI-design flourish, and it usually hurts legibility.
- **Fix:** Use a solid, confident color. If you want emphasis, use weight, size,
  or a single accent color on one word — not a rainbow on the whole heading.

### 4. Everything is centered
- **Detect:** Most text blocks, headings, and cards are center-aligned.
- **Why it's slop:** Center-alignment is the default when no one thought about
  rhythm. Long centered paragraphs are hard to read; centered everything has no
  edge to anchor the eye.
- **Fix:** Left-align body copy and most content. Reserve centering for short
  hero statements, single CTAs, or genuinely symmetric layouts.

---

## Color tells

### 5. Five balanced colors instead of one
- **Detect:** The palette has 4–5 roughly equal-weight colors, none clearly
  dominant. Often a primary, secondary, success, warning, info — all loud.
- **Why it's slop:** Balanced palettes have no point of view. Designed pages
  almost always have ONE dominant hue carrying ~70% of the color, plus a single
  accent.
- **Fix:** Pick one dominant hue and commit. Add exactly one accent for the
  things that must stand out. Everything else is neutral.

### 6. Pure black on pure white
- **Detect:** `color: #000` on `background: #fff`, or the reverse.
- **Why it's slop:** Real designs almost never use `#000`/`#fff`. Pure black on
  pure white vibrates and feels cheap.
- **Fix:** Use a near-black (`#1a1a1a`, `#16161a`, a very dark version of your
  hue) on an off-white or tinted background (`#fafaf8`, `#f7f6f3`, a 2–4%
  tint of your hue). The page instantly feels considered.

### 7. Flat stark-white background
- **Detect:** `background: #fff` with no texture, tint, or gradient anywhere.
- **Why it's slop:** Default canvas = no canvas decision.
- **Fix:** Give the background character: a soft tint of the dominant hue, a
  barely-there radial or linear gradient, or a subtle section banding. Keep it
  quiet — this is atmosphere, not decoration.

### 8. Gray text on a colored background
- **Detect:** Muted gray body text (`#6b7280` and friends) sitting on a colored
  or tinted panel.
- **Why it's slop:** Gray was chosen for white backgrounds; on color it looks
  muddy and the contrast is often poor.
- **Fix:** Derive the "muted" text from the background's own hue — a darker or
  lighter shade of the panel color, not a neutral gray. Check contrast.

---

## Layout & spacing tells

### 9. Nested cards (cards inside cards inside cards)
- **Detect:** A bordered/shadowed card contains another bordered/shadowed card,
  sometimes three deep.
- **Why it's slop:** It's the default way an AI "groups" things. The result is
  busy, boxy, and depthless.
- **Fix:** Flatten. Use whitespace and typography to group, not nested
  containers. One level of card is plenty; inside it, use spacing and headings.

### 10. Cramped padding
- **Detect:** Content touches the edges of its container; padding is `0.5rem`
  or less; sections butt against each other with no breathing room.
- **Why it's slop:** Generous space is a deliberate choice; cramped space is
  what you get by default.
- **Fix:** Be generous. `1.5–2rem` inside cards, large gaps between sections
  (`4–6rem`), a comfortable max-width on text (`60–72ch`). Whitespace is the
  cheapest way to look expensive.

### 11. The three-equal-columns reflex
- **Detect:** Content is jammed into a 3-up grid of equal cards regardless of
  whether the content wants it.
- **Why it's slop:** It's the default "features section" shape. Real layouts
  vary block size to match content importance.
- **Fix:** Let importance drive size. A hero metric can span full width; a
  detail can be a narrow aside. Asymmetry reads as intent.

### 12. Wall of text, no visual lead
- **Detect:** The page opens with paragraphs. The first visual element (diagram,
  metric, image, pull quote) is far down or absent.
- **Why it's slop:** AI defaults to prose. Designed docs lead with something to
  look at.
- **Fix:** Open with a visual anchor — a big number, a diagram, a striking
  headline treatment, a chart. Earn the reader's attention before the prose.

---

## Motion & effect tells

### 13. Bounce / overshoot easing
- **Detect:** `cubic-bezier(...)` with overshoot, `animation: bounce`, springy
  entrances on everything.
- **Why it's slop:** Playful bounce is rarely appropriate and always reads as
  "default fun animation."
- **Fix:** Use calm, purposeful easing (`ease-out`, `cubic-bezier(0.16,1,0.3,1)`)
  and at most ONE entrance animation for the whole page. Motion should feel like
  the page settling, not performing.

### 14. Everything animates in
- **Detect:** Multiple staggered fade/slide-in animations on load; elements
  appear one after another across the whole page.
- **Why it's slop:** It's the default "make it feel alive" move and it delays
  the content the reader came for.
- **Fix:** One restrained entrance, or none. Never animate body text into view.
  If you stagger, keep it to a single hero region and keep it fast (<400ms).

### 15. Hover-lift on every card
- **Detect:** Every card has `transform: translateY(-4px)` + bigger shadow on
  hover, including non-interactive cards.
- **Why it's slop:** Default interactivity theater. Lifting things that aren't
  clickable is misleading.
- **Fix:** Only animate genuine affordances (links, buttons, clickable cards).
  Make the hover state subtle and meaningful.

---

## Decoration tells

### 16. The left side-stripe border
- **Detect:** Callouts/quotes with a thick colored `border-left`, the same on
  every block.
- **Why it's slop:** It's the default "this is a callout" shape, repeated until
  it's wallpaper.
- **Fix:** Vary how you signal emphasis: a tinted background, an icon, a change
  in type, a full-bleed band. Use the side-stripe sparingly if at all.

### 17. Emoji as iconography
- **Detect:** 🚀 ✨ 💡 🎯 used as section bullets or feature icons.
- **Why it's slop:** It's the laziest visual shorthand and it dates instantly.
- **Fix:** Use inline SVG icons (simple, consistent stroke width) or no icons.
  If you must use a symbol, make it part of a deliberate system.

### 18. Drop shadows on everything
- **Detect:** Every element has a `box-shadow`, often a harsh default
  (`0 4px 6px rgba(0,0,0,0.1)`).
- **Why it's slop:** Uniform shadows flatten hierarchy — if everything floats,
  nothing does.
- **Fix:** Use shadow to signal genuine elevation, sparingly. Prefer soft,
  large-radius, low-opacity shadows tinted with the hue. Often a hairline
  border reads better than a shadow.

### 19. Rounded-corner sameness
- **Detect:** `border-radius: 8px` on literally everything.
- **Why it's slop:** One radius everywhere is the default; designed systems use
  a deliberate radius scale (or sharp corners by choice).
- **Fix:** Choose a radius personality — soft (`16–24px`) for friendly, small
  (`4–6px`) for precise, zero for editorial/brutalist — and apply it
  consistently as a system, not a reflex.

---

## The meta-tell

### 20. This page looks like the last page
- **Detect:** Your doc could be swapped with the previous doc you made and no
  one would notice. Same fonts, same hero, same card grid, same accent.
- **Why it's slop:** The biggest tell of all. Real design responds to *this*
  content; AI defaults produce one house style for everything.
- **Fix:** Start every doc from the creative brief (design-system.md): what is
  this *about*, who is it *for*, what's the *metaphor*, what's the *one*
  memorable thing? Let the answers make this doc look unlike the last. If two
  docs look the same, at least one of them isn't designed.

---

## Quick pre-publish checklist

- [ ] Did I choose the typeface, or accept the default?
- [ ] Is there ONE dominant hue, not five balanced colors?
- [ ] Is the background tinted/textured, not flat `#fff`?
- [ ] Is the largest text genuinely large (dramatic scale)?
- [ ] Does the page lead with a visual, not a wall of text?
- [ ] Is there at most one entrance animation, calm easing?
- [ ] Are cards flat (not nested), with generous padding?
- [ ] No gradient text, no emoji icons, no uniform shadows?
- [ ] Does this doc look *different* from the last one I made?
