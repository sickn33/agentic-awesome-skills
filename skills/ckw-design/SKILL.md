---
name: ckw-design
description: "Frontend design entry point: direction, design system, visual philosophy. Use whenever building or touching the look of any web UI (components, pages, dashboards, React/Vue/HTML-CSS) or when the user says \"make this look better\", \"fix the spacing/layout\", or mentions styling, color, type, or polish."
risk: safe
source: community
source_type: community
source_repo: connerkward/ckw-design-skill
date_added: "2026-06-16"
author: Conner K Ward
license: MIT
tags:
  - design
  - frontend
  - ui
  - css
  - typography
  - responsive
tools:
  - claude-code
  - antigravity
  - cursor
  - gemini-cli
  - codex-cli
---
## When to Use

Use whenever building or styling web UIs — components, pages, dashboards, landing pages, React/Vue/HTML-CSS layouts — or whenever the user asks to make something "look better/nicer", fix spacing/layout, or mentions styling, color, typography, fonts, responsive design, polish, or aesthetics, even without the word "design".

_Source: [connerkward/ckw-design-skill](https://github.com/connerkward/ckw-design-skill) (MIT)._

# Design (entry)

Use this skill when the user asks to build or style web UIs: components, pages, dashboards, landing pages, React/Vue/HTML-CSS layouts, or any frontend interface. Goal: distinctive, production-grade output that avoids generic AI aesthetics.

**Before reporting any design "done": render it and have a *separate* judge critique the image** (not the code, not self-grading) — see design-spatial §1. Blind generation can't see its own collisions; this applies to all design output, not just spatial work.

> **MANDATORY HORIZONTAL-OVERFLOW GATE — runs before ANY web UI is "done".**
> Measure `document.documentElement.scrollWidth - document.documentElement.clientWidth`
> at a **narrow width (~390px and ~1024px), this turn**, and confirm it's `0`. This
> bug is invisible at desktop width and re-appears every time a row (header, nav,
> toolbar) gains an item, so it ships repeatedly. Default to `flex-wrap:wrap` on
> header/toolbar rows + `body{overflow-x:clip}`, and **re-measure after adding any
> element to a horizontal row.** Full procedure + recurrence cases: design-spatial §4.
> If you haven't measured narrow, you are not done — don't claim it.

## Sub-skills (load when relevant)

- **design-thinking** — Load for every design task. Defines purpose, tone, domain, color world, review bar, and cross-domain lens (cinema, architecture, marketing, UX, automotive, industrial design). See [design-thinking/SKILL.md](https://github.com/connerkward/ckw-design-skill/blob/main/design-thinking/SKILL.md).
- **design-system** — Load when implementing: tokens, typography, motion, color semantics, backgrounds. Use when building components, pages, or design systems. See [design-system/SKILL.md](https://github.com/connerkward/ckw-design-skill/blob/main/design-system/SKILL.md).
- **design-spatial** — Load when composing layout: explicit grid + 8-point spacing constraints, visual-weight/balance/alignment, and a render-then-critique vision loop. The fix for "spatial understanding is off" — generated layout that's centered mush, misaligned, or breaks at some widths. See [design-spatial/SKILL.md](https://github.com/connerkward/ckw-design-skill/blob/main/deterministic-design/design-spatial/SKILL.md).
- **design-ux** — Load when auditing USABILITY (not just looks): a UI that "feels off"/"sucks to use", is hard to learn, needs an instruction wall, or any interactive tool/editor/app before shipping. Scores the rendered UI against Nielsen's 10 + interaction heuristics via a SEPARATE fresh-eyes judge → prioritized fix list. Usability ≠ aesthetics. See [design-ux/SKILL.md](https://github.com/connerkward/ckw-design-skill/blob/main/deterministic-design/design-ux/SKILL.md).
- **design-philosophy** — Load for high-concept work, campaigns, or when the user asks for a visual philosophy, manifesto, or unmistakable art-like aesthetic. See [design-philosophy/SKILL.md](https://github.com/connerkward/ckw-design-skill/blob/main/design-philosophy/SKILL.md).

## Visual assets — generate or source

When design-thinking identifies a need for visual assets (logos, icons, hero images, textures, backgrounds):

1. **Generate** → use an image-generation model or API for synthetic/branded assets.
2. **Source a real/archival one** → free stock or archival image search, often cheaper and more authentic than generating.
3. Use design-thinking output (tone, domain, color world) to craft prompts / queries.
4. Evaluate against the design philosophy, refine, integrate into the build.

## LLM-assisted work — always annotate model + cost

When design work involves running an LLM (generative assets, VLM analysis, layout critique, prompt generation, etc.):

- **Before running:** state which model will be used and the estimated cost (e.g., "gpt-4o-mini · ~$0.005/image" or "FLUX v1 · ~$0.006 per gen").
- **After results:** annotate the output with the model used, actual cost if different from estimate, and any key params (seed, prompt, settings). Cost goes *visible to the user* (in the message, contact sheet header, or asset caption), not buried in logs.
- **Why:** the user is deciding whether the cost-to-quality trade-off is worth it. Unlabeled or hidden costs hide the most important lever. This rule mirrors `media-attribution-rule` for generative assets and extends it to any LLM operation in the design workflow.

**Examples:**
- "Running gpt-4o-mini layout critique on 8 designs · est. ~$0.04 total" (before).
- Contact sheet header: "FLUX v1 · $0.48 total (6 gen × $0.08)" (after).
- Asset caption: "hero_banner_flux-dev_seed3891.jpg" (seeds enable reproducibility).
- Uncertainty slider result: "VLM triage on 46,978 images · gpt-4o-mini · ~$9.40" (before); "✓ Completed: 12,447 images classified · gpt-4o-mini · $7.62" (after).

## Algorithm / model explainers — show the equation, annotate the terms

Whenever a UI surfaces an algorithm or model to the user (an "ⓘ how this works"
panel, a model breakdown, a methods note), **include the actual equation, typeset,
with its key terms annotated** — don't settle for prose. A scorer described only in
words ("ranks by how much of the picked color is present") is unfalsifiable hand-
waving; the formula `score = Σ fracᵢ · max(0, 1 − ΔEᵢ/τ)` with each term labelled
tells the user *exactly* what the knob does and builds trust that there's real math
under the hood.

**How to apply:**
- Render one clean, central equation per algorithm — the "sexy" core, not every
  detail. Use proper notation: σ for sigmoid, Σ for sums, ‖·‖ for norms,
  superscripts, ΔE, ∇²; a monospace/serif-math block set off from the prose.
- **Annotate every symbol** immediately below: what `e_x`, `w`, `τ`, `Q` each are,
  in one line each. An unlabelled equation is decoration; a labelled one is a spec.
- Keep it dependency-light — styled HTML/Unicode math is fine and works offline; only
  reach for KaTeX/MathJax if the expressions genuinely need it.
- State the **decision rule** alongside the score (e.g. "personal if P ≥ 0.55").
- This composes with the model+cost annotation above: the equation says *what* it
  computes, the model/cost line says *what ran it and for how much*.

**Example (a logistic head):**
> P(personal │ x) = σ(**w**·**e**ₓ + b),  σ(z) = 1 / (1 + e⁻ᶻ)
> • **e**ₓ — the image's 768-d embedding · **w**, b — weights learned from your labels
> · decision: personal if P ≥ 0.55, reference if P ≤ 0.40.

## Select-all always has a deselect — no dead-end selections

Any **"Select all"** affordance MUST be paired with a way to **clear the selection** —
preferably the *same button*, label-flipped when everything is already selected
("Select all" ⇄ "Deselect all"). A select-all with no inverse is a trap: the user
over-selects (or hits it by reflex), then has to un-click items one by one, or reload
the page, to get back. The cost is silent — it only bites *after* they've committed to
the wrong set.

**How to apply:**
- **Toggle the same button** (simplest, fewest controls): when all visible items are
  selected, the button reads "Deselect all" and clears; otherwise "Select all". One
  control, no dead end.
- Or a **separate Clear/Deselect** shown whenever the selection is non-empty.
- The deselect must reach the **same scope** the select-all did (all *shown*, all
  *filtered*, all *on this page*) — don't let "Select all" grab 500 but "Clear" only
  drop the 50 on screen.
- This generalizes: any reversible bulk toggle (select, expand-all, mute-all,
  check-all) needs its inverse one tap away. Symmetry of action — see
  restraint-rule (don't strand the user mid-task).
