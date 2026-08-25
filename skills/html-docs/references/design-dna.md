# Design DNA — extract a look you love, then author to match

Sometimes the user already knows the look they want: "make it feel like Stripe's
docs," "match this dashboard screenshot," "I want it to look like the New York
Times." Don't eyeball it and hope. **Extract the design DNA** — quantify what
makes that reference look the way it does — then author your doc to those
specs. The result matches on purpose instead of by accident.

This is the same idea as a design audit: turn a vibe into measurable parameters
so you can reproduce it deliberately. Read [design-system.md](design-system.md)
for the authoring fundamentals; this file is the *capture* step that feeds them.

---

## The three dimensions of design DNA

A look is never one thing. Decompose any reference into three layers, capture
each, and you can rebuild it.

### 1. Design system — the measurable tokens
The quantitative skeleton. These are numbers and discrete values you can read
off a reference and reproduce exactly.

- **Color:** dominant hue (HSL), accent hue, surface/background, text colors,
  borders. Note the *ratio* — which color dominates, which is the rare accent.
- **Typography:** display face + body face (or closest system equivalents),
  the size scale (e.g. 14 / 16 / 20 / 32 / 56), weights used, line-heights,
  letter-spacing on headings.
- **Spacing:** the base unit (4px? 8px?) and the rhythm built on it; section
  gaps; padding inside containers.
- **Radius:** the corner-radius scale (0 / 4 / 8 / 16?).
- **Borders & lines:** hairline color and weight; do they use borders or
  shadows to separate?
- **Shadows:** elevation steps — blur, spread, opacity, and whether tinted.

### 2. Design style — the qualitative character
The adjectives. These don't have units but they govern every choice.

- **Mood:** editorial / technical / playful / luxe / brutalist / warm / clinical.
- **Density:** airy and spacious, or dense and information-rich?
- **Contrast:** high-drama (big jumps, bold hits) or subtle and even?
- **Formality:** buttoned-up corporate or loose and human?
- **Era / influence:** Swiss/International, 90s web, editorial print,
  terminal/CLI, modern SaaS, etc.
- **Personality in one line:** "calm precise instrument," "loud confident
  pitch," "quiet literary essay."

### 3. Visual effects — the finishing layer
The treatments that sit on top. Keep these self-contained (CSS-only) — see
[effects.md](effects.md) for the constrained palette.

- **Backgrounds:** flat tint, gradient, grain/noise, banding, subtle pattern.
- **Depth:** layering, soft shadows, glassy panels, borders-only flatness.
- **Texture:** grain overlays, hairline grids, dotted rules.
- **Motion:** entrance style and easing (usually one, restrained).
- **Accents:** underlines, highlight marks, tags, dividers, signature flourish.

---

## The DNA spec — capture it as JSON

When you study a reference (a screenshot the user shared, a site they named, or
a look you're committing to), write down the DNA as a compact spec before you
author. This keeps you honest and consistent across a multi-page doc or a set
of docs that should match.

```json
{
  "name": "Editorial Brief",
  "system": {
    "color": {
      "dominant": "hsl(28 40% 96%)",
      "accent": "hsl(348 72% 47%)",
      "ink": "hsl(20 14% 12%)",
      "muted": "hsl(20 8% 38%)",
      "surface": "hsl(28 30% 99%)",
      "border": "hsl(28 16% 86%)",
      "ratio": "warm-neutral dominant ~80%, crimson accent rare"
    },
    "type": {
      "display": "ui-serif, Georgia, 'Times New Roman', serif",
      "body": "ui-serif, Georgia, serif",
      "scale": [15, 17, 21, 32, 56],
      "weights": [400, 600, 700],
      "leading": { "body": 1.65, "display": 1.05 },
      "tracking": { "display": "-0.02em" }
    },
    "space": { "unit": 8, "section_gap": 72, "container_pad": 32 },
    "radius": [0, 4],
    "shadow": "hairline borders, no shadows"
  },
  "style": {
    "mood": "editorial",
    "density": "airy",
    "contrast": "high-drama headline, calm body",
    "formality": "literary, considered",
    "influence": "print magazine feature",
    "personality": "a quiet literary essay with one bold opening"
  },
  "effects": {
    "background": "2% warm tint, no gradient",
    "depth": "flat, hairline rules between sections",
    "texture": "thin top-rule above each section",
    "motion": "single fade-up on the title only, ease-out 320ms",
    "signature": "oversized serif drop-cap on the opening paragraph"
  }
}
```

You don't need every field every time — but the act of writing the spec forces
the decisions that separate "designed" from "default."

---

## Workflow: reference → DNA → doc

1. **Identify the reference.** A screenshot, a named site, or a target mood. If
   the user gave a URL or image, study it specifically; if they gave a vibe
   word, pick a concrete exemplar and commit.
2. **Extract the DNA.** Fill in the three dimensions. Read real values off the
   reference where you can (hues, scale, spacing rhythm); infer the qualitative
   layer; choose self-contained effects.
3. **Map to system equivalents.** Match brand fonts to the closest system /
   web-safe stack (you're authoring self-contained HTML — no external font CDNs
   unless the user explicitly wants them and accepts the dependency). Round
   tokens to a clean scale.
4. **Author to the spec.** Build the doc using *only* the captured tokens and
   style rules. When you reach for a color or size, take it from the DNA, not
   from instinct. This is what makes the result match.
5. **Audit against the DNA.** Before publishing, compare the draft to the spec
   and to the reference. Does the dominant-hue ratio match? Is the type scale
   right? Did slop creep in? (Run [anti-slop.md](anti-slop.md).)

---

## When to use this vs. the creative brief

- **No reference, fresh look:** start from the **creative brief** in
  design-system.md — invent the DNA from the content's purpose and metaphor.
- **A reference exists** (screenshot, named site, "match my brand", a series of
  docs that must look consistent): use **Design DNA** to capture it, then
  author to it.

Either way you end up with the same thing: a small, explicit set of decisions
that every line of CSS answers to. That's what designed looks like.
