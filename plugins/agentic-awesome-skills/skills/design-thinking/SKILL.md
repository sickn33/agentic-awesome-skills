---
name: design-thinking
description: Direction and intent for frontend design. Use with design when defining purpose, tone, domain, color world, and review bar; includes cross-domain lens from cinema, architecture, marketing, UX, automotive, industrial design.
risk: unknown
source: https://github.com/connerkward/ckw-design-skill/tree/main/design-thinking
source_repo: connerkward/ckw-design-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/connerkward/ckw-design-skill/blob/main/LICENSE
author: Conner K Ward
---

# Design thinking
## When to Use

Use this skill when you need direction and intent for frontend design. Use with design when defining purpose, tone, domain, color world, and review bar; includes cross-domain lens from cinema, architecture, marketing, UX, automotive, industrial design.


Apply with the **design** skill on every design task. Do this before coding.

## Design thinking (before coding)

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme and execute with intention — e.g. brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian.
- **Constraints**: Framework, performance, accessibility.
- **Differentiation**: One thing that makes it unforgettable.

Commit to one bold direction. Intentionality over intensity.

## Reserve impact for punctuation (use sparingly for effect)

High-impact devices — full-bleed media, dramatic motion, oversized type, a saturated accent, parallax — lose their force the moment they become the default. If every section is a full-screen video, none of them land. Choose 1–2 moments to go big (the hero, the payoff) and make everything else quiet and contained, so the big moments read as deliberate punctuation rather than noise. Restraint is what gives the rare full-bleed beat its hit; wall-to-wall intensity reads as flat. This is the luxury of reduction — a single bold gesture in generous negative space beats maximalism. Applies equally to scale, color (one accent, not five), and motion (one signature move, not constant animation).

## Domain and color

- **Domain**: 5+ concepts, metaphors, or vocabulary from the product's world (territory, not features).
- **Color world**: 5+ colors that "belong" in that world — what you'd see if this product were a physical space. Not "warm" or "cool"; name actual colors from that domain.
- **Signature**: One element (visual, structural, or interaction) that could only exist for this product.

## Review bar

Ask: "Would I put my name on this?" Design-lead review means: not "does it work?" but "is this unmistakably intentional and crafted?"

Non-negotiable craft invariants (a single failure fails the review):

- **No font pop-in. Ever.** Title/display text must never flash a fallback face or reflow as the webfont loads. Gate it on `document.fonts.ready` and fade in. See design-system → *Never let fonts pop in*.
- **First seen, first loaded.** Whatever is in the opening viewport (hero text, hero media, brand mark) must be prioritized to paint complete and correct before anything below the fold loads. See design-system → *Loading order*.

---

## Cross-domain lens

When defining direction, choose which disciplines fit the product and apply 2–3 principles from each. Examples: dashboard → UX + automotive; brand campaign → cinema + marketing; app → UX + industrial design.

### Cinema

- **Framing and composition**: Viewport as frame; rule of thirds, leading lines, foreground/mid/background depth. What's in focus = primary hierarchy.
- **Pacing and rhythm**: Sequence of reveals (like editing). One well-orchestrated load or scroll beat beats scattered motion.
- **Color and mood**: Color grading = mood; consistent palette as "look."
- **Focus and depth**: Focal plane and depth of field → visual hierarchy and layering (blur, opacity, scale).

### Architecture

- **Scale and proportion**: Human scale, rhythm of columns/grid, proportion of elements to viewport.
- **Wayfinding**: User always knows where they are and where they can go (orientation, nav, breadcrumbs).
- **Material and light**: Texture and shadow create depth; light direction implies elevation and emphasis.
- **Negative space**: Intentional emptiness; space as structure, not leftover.
- **Thresholds**: Entrance and transition moments (landing → app, modal open) as deliberate "crossings."

### Marketing

- **One hero message**: Single value proposition or takeaway above the fold; hierarchy of message, not feature list.
- **Emotional vs rational**: Decide whether the first beat is emotional pull or rational clarity; align layout and copy.
- **CTA prominence**: Primary action unmistakable; secondary actions present but not competing.
- **Audience fit**: Tone and imagery match who it's for; avoid "generic user."
- **Brand consistency**: One coherent voice and visual system across the artifact.

### UX

- **Goals and tasks**: Design around user goals and key tasks; reduce steps to completion.
- **Information architecture**: Clear grouping and hierarchy; cognitive load minimal.
- **Feedback and state**: Every action has visible feedback; loading, success, error states considered.
- **Accessibility**: Color contrast, focus order, semantics. (Reduced motion: honor `prefers-reduced-motion` for public/multi-user projects; personal projects may ship full motion.)
- **Progressive disclosure**: Show essentials first; detail on demand (expand, modal, step).

### Automotive (exterior / interior)

- **Silhouette and character**: One strong silhouette or "character line"; recognizable at a glance.
- **Surface language**: Tension, flow, continuity of surfaces (like body panels); avoid arbitrary bumps.
- **Proportion**: Balance of "cab" (content) to "wheel" (chrome/nav); stable, not top-heavy.
- **Materials and trim**: Hard/soft, cold/warm, matte/gloss as hierarchy; primary = one material language, accent = another.
- **Driver-centric layout**: Primary controls and info where the "driver" (user) looks first; secondary in reach but not competing.
- **Control hierarchy**: One primary action surface; secondary actions grouped and identifiable.

### Industrial design

- **Form follows function**: Shape and layout reflect use; no decoration without reason.
- **Material honesty**: Materials (or visual equivalent: texture, weight) feel appropriate to the function.
- **Affordances**: Shape suggests use (clickable, draggable, input); obvious without labels where possible.
- **Tactility**: Buttons and controls feel "pressable" or "grabbable" (hover/active state, depth).
- **Product personality**: One clear character (friendly, serious, playful, premium); consistent across the UI.
- **Simplify**: Remove until it breaks; "best part is no part" for UI clutter.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
