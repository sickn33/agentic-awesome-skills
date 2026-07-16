---
name: lookdev-auto
description: "Automated visual tuning: a vision or video model rates rendered variants in a loop. Render several labeled variants into one artifact, ask the model to rate them and suggest better values, render the suggestions, ask it to pick the best, repeat until good — the model is the eye, you run the loop."
risk: safe
source: community
source_type: community
source_repo: connerkward/lookdev-auto-skill
date_added: "2026-06-16"
author: Conner K Ward
license: MIT
tags:
  - visual-eval
  - vision-model
  - tuning
  - automation
  - render-loop
tools:
  - claude-code
  - antigravity
  - cursor
  - gemini-cli
  - codex-cli
---
## When to Use

Use whenever "looks/feels right" is the success criterion and there's no cheap numeric metric — animation easing/timing, zoom/camera feel, color grade, layout/spacing, design params, render/encoder settings, prompt params. Use the automated counterpart to lookdev when there's no human to sit the loop.

_Source: [connerkward/lookdev-auto-skill](https://github.com/connerkward/lookdev-auto-skill) (MIT)._

# Visual eval loop — let a vision/video model tune what only an eye can judge

When the target is "does this LOOK/FEEL right" (not a number you can minimize), a
vision model (image) or video-understanding model (motion/timing) can be the judge in
a tight optimize loop. Worked reference: the `screenstudio-alternative` skill (`iteration.py`)
(tuned zoom-animation feel via `fal-ai/video-understanding`).

## The loop

1. **Render N labeled variants into ONE artifact.** Vary the parameter(s) across a
   small spread. **Annotate each variant's params ON the artifact** (burn the label in:
   "A · 2.2Hz · ζ0.5"). Images → a labeled grid/contact sheet. Video/motion → a
   labeled *sequence* (label card or burned-in overlay before/over each clip) so the
   model can compare temporally.
2. **One model call, structured output.** Send the single artifact with an explicit
   rubric (define what "good" means — and what "too much"/"too little" look like).
   Ask for **per-variant ratings + concrete suggested new values as JSON**:
   `{"ratings":{"A":n,...},"best_so_far":"X","suggest":[[p1,p2],...]}`.
3. **Coarse → fine.** Round 1 = wide spread to locate the region. Round 2 = render the
   model's suggestions (+ carry the current best) into one artifact; ask it to **pick
   the single best**. Usually converges in **2 rounds**.
4. **Stop when sufficient** — best rates high and suggestions cluster. Apply the winner.

## Token / quality / step reductions (do these)

- **One artifact per round, not one call per variant.** The biggest saver — a 6-variant
  round is 1 upload + 1 inference, not 6. Montage/grid beats a loop of single calls.
- **Burn params onto the artifact.** The model sees label+result together → no separate
  "variant A used X" context to carry → fewer tokens, fewer mistakes.
- **Structured JSON out + parse.** No re-asking, no free-text wrangling. Prompt "return
  ONLY JSON"; regex the first `{...}`.
- **Short representative sample.** Tune on a 3-5s clip / one frame / one component, not
  the whole asset. Cheaper render, smaller upload, faster inference. Apply the found
  params to the full render once.
- **Cap variants at ~5-6.** More doesn't improve the model's discrimination and multiplies
  render + token cost. Wide-but-sparse round 1, narrow round 2.
- **Calibration anchors.** Include one deliberately-bad and one safe-default variant as
  fixed anchors each round — gives the model a reference scale and exposes when its
  "best" is worse than the safe default (catch a bad recommendation early).
- **Independent rubric, stated up front.** Define "good" concretely in the prompt
  (smooth, subtle settle, not bouncy, not sluggish). Don't ask "which do you like" —
  that lets it echo your framing. A held-out criterion keeps the judge honest
  (see verify-outputs-rule: the check must be independent of what you tuned).
- **Reuse renders across rounds.** Carry the round-1 winner's clip into round 2 instead
  of re-rendering it.
- **Early-exit.** If round-1 top ≥9/10 and the three suggestions are within a small delta,
  skip round 2.
- **Cheapest judge that can see the failure.** Frames-through an image VLM can judge
  spatial things (layout, color, crop); only reach for a true *video* model when the
  thing being judged is **temporal** (easing, timing, motion smoothness) — those are
  invisible in stills.

## When NOT to use it

- A real numeric metric exists and correlates with quality → optimize that directly;
  don't pay a model per step.
- The judgment is subjective-to-the-user (their taste, brand) → show them the variants
  and let them pick; a model's "best" isn't their best. (This is why the screen-studio
  spring auto-tune was dropped — the model's pick didn't match the owner's eye.)
- One or two variants → just look yourself.

## Caveats (learned)

- The model's pick is an *opinion*, not ground truth — anchor it, and sanity-check the
  winner against the safe default yourself before committing.
- Vision/video models perceive gross differences well, fine ones poorly — keep variant
  spacing perceptible; near-identical variants get noise-rated.

## Limitations

- Model ratings are probabilistic aesthetic judgments, not objective truth; keep a human review step for brand-critical or subjective work.
- Automated rounds can become expensive or slow when renders are heavy or many variants are explored.
- This skill needs screenshots, frames, or clips that expose the quality difference; it is weak for subtle motion, audio, copy nuance, or user-preference calls.
