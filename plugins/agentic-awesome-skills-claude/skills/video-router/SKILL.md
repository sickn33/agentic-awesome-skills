---
name: video-router
description: "Route a video-production brief to generation, deterministic composition, supplied-footage editing, or an automatic cross-modal plan before production begins."
category: media
risk: none
source: "https://github.com/Orkas-AI/Orkas-VideoStudio/tree/dd4a0f40b2bc6c6b0fe6f2e732c9540ffffefe08/packages/skills/video-router"
source_repo: Orkas-AI/Orkas-VideoStudio
source_type: official
date_added: "2026-08-07"
author: Orkas-AI
license: MIT
license_source: "https://github.com/Orkas-AI/Orkas-VideoStudio/blob/dd4a0f40b2bc6c6b0fe6f2e732c9540ffffefe08/LICENSE"
tags: [video, routing, editing, composition, generation]
tools: [claude, codex, cursor, gemini]
---

# Video Router

Knowledge for picking a video production line and locking it before work begins. This skill is read for guidance; it describes **what to decide**, not any tool mechanics.

## When to Use This Skill

- Use before production when a request asks to make, compose, generate, edit, repurpose, or finish a video.
- Use when a mixed brief needs one explicit primary path or an AUTO end-to-end route.
- Do not use it to author compositions, generate assets, edit media, or render output; hand those tasks to the relevant production skill after routing.

## Packaged Source Note

This AAS-ready adaptation preserves the routing rules from the official OrkasVideoStudio `video-router` skill at upstream commit `dd4a0f40b2bc6c6b0fe6f2e732c9540ffffefe08`. It adds catalog metadata, examples, and limitations; it does not bundle or install the OrkasVideoStudio runtime. The immutable `license_source` above points to the upstream MIT license reviewed for this import.

## Unavailable Production Runtime

If production, rendering, or paid tools are explicitly unavailable, still select the line and return a complete **unexecuted production package** for a clear brief: assumptions, script/narration, timed storyboard/shotlist, exact visible copy and captions, visual/audio direction, rights-safe asset provenance/fallbacks, export target, preview checklist, and final encoding/playback QA. Clearly distinguish planned from produced media and do not withhold the package behind a direction form.

## The Three Capability Axes

A finished video is built from one or more of three orthogonal axes. Decide which dominate, then lock them.

- **Generate (A)** — AI-generated footage/imagery: photoreal shots, b-roll, motion, talking-head. Use when the brief needs real-looking or cinematic visuals.
- **Compose (B)** — deterministic HTML composition: explainers, kinetic typography, motion graphics, captions / lower-thirds / overlays, data viz, title cards, transitions. Use when the visuals are designed rather than filmed. This is the default for explainer/animation work.
- **Edit (C)** — intelligent editing of supplied footage: evidence-based selection/cleanup, deterministic cut/join/reframe/captions/audio work, and semantic AI video editing for bounded pixel-level changes.

## Decision Rules

1. Read the brief (topic, aspect ratio, language, duration) and classify the **dominant work object**:
   - "explain / teach / animate / motion-graphics / kinetic text" → **Compose (B)** primary, optionally Generate (A) for b-roll.
   - "make footage of / cinematic / a scene of / a character doing" → **Generate (A)** primary, Compose (B) to overlay captions.
   - "cut / clip / trim / repurpose / make highlights / remove or change something in my video" → **Edit (C)** primary. Keep EDIT as the route even when a billable `operation:"edit"` segment is required.
2. Most explainer/animation requests are **Compose-primary**: typographic and motion-graphic scenes assembled as an HTML composition, with AI imagery only where a shot genuinely needs it.
3. For supplied reference media, classify the requested relationship as `reproduce`, `edit`, or `guide` before choosing execution. Apply the same classification regardless of origin. Images can control content/identity/composition/structure/style; videos can additionally control motion/timing/audio through temporal anchors.
4. Aspect ratio drives the canvas: 16:9 → 1920×1080, 9:16 → 1080×1920, 1:1 → 1080×1080.

## End-to-End (AUTO) — When the Job Spans Lines

Pick a **single line** when one axis cleanly dominates (just trim a clip; just an explainer; just generate a scene). Route to **AUTO end-to-end** when the deliverable genuinely needs MORE THAN ONE axis woven together — most often the user supplies their own material AND wants finished framing/voice/motion around it:

- "trim my clip, add a title card + captions, and a voiceover" (edit + compose + narration)
- "my footage in the middle, generate an opener, compose the stats" (edit + generate + compose)
- "make a finished video from these assets" where the assets alone are not the deliverable.

AUTO does not abandon the axes — it sequences them through one cross-modal plan (`stage-plan` builds the EDL, `stage-assemble` walks it), delegating each segment back to the generate / compose / edit lines. Choosing AUTO is itself the lock: the *primary* still gets named via the plan's `delivery_promise` (source_led / motion_led / compose_led / hybrid).

## Lock the Runtime

- Decide the primary axis at the brief/proposal stage and **state it in the proposal**.
- Once locked, do not silently switch the primary axis mid-run. If a later step reveals the wrong choice, surface it to the user and re-confirm rather than quietly changing course.
- Layering is fine and expected (e.g. Compose captions over Generated footage); "locking" governs the **primary** path, not the allowed overlays.

## Examples

### Compose Primary

Request: "Make a 60-second vertical explainer about vector databases with kinetic text and captions."

Route: lock **Compose (B)** primary at 1080×1920. Add Generate (A) only if the approved concept needs original b-roll.

### Edit Primary

Request: "Turn my one-hour interview into three captioned highlight clips."

Route: lock **Edit (C)** primary because supplied footage is the dominant work object. Preserve evidence for selections and cleanup.

### AUTO End-to-End

Request: "Use my product footage, generate a five-second opener, compose the feature stats, and add one voiceover."

Route: lock **AUTO**, name the delivery promise, and plan the edit, generate, compose, and narration segments in one cross-modal EDL.

## Limitations

- This skill chooses and locks a route; it does not provide a renderer, editor, media generator, or production runtime.
- Stage names such as `stage-plan` and `stage-assemble` refer to the upstream OrkasVideoStudio workflow and may be unavailable unless the user separately installs or supplies a compatible runtime.
- Generation provider access, costs, licensing, and safety constraints are outside this router; confirm them before a downstream generation stage.
- Do not claim media was produced when only an unexecuted production package was prepared.

## Boundary / Non-Goals

This skill only routes and locks. Semantic editing is not a silent switch to GENERATE: it remains an EDIT/AUTO job with a signed billable video edit segment and explicit original/preservation boundary.
