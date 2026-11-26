---
name: ui-nanobanana
description: "Anti-slop UI & frontend art-direction skill combining Taste Skill gallery composition, Impeccable deterministic DESIGN.md guardrails (58 anti-slop rules), studio prompt architecture, and a 2K/4K Series-Locked Nano Banana & Gemini 4 (Carbon, Argon, Neon, Hydrogen) visual pipeline."
category: frontend
risk: critical
source: community
source_repo: AntonioCardenas/ui-nanobanana
source_type: community
date_added: "2026-11-20"
author: antonio
tags: [ui-design, frontend, nanobanana, gemini-4, gemini-4-carbon, gemini-4-argon, gemini-4-neon, gemini-4-hydrogen, taste-skill, impeccable, image-generation]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT"
license_source: "https://github.com/AntonioCardenas/ui-nanobanana/blob/main/LICENSE"
---

# UI Nanobanana — Taste + Impeccable + Nano Banana (2K/4K OP Edition)

## Overview

`ui-nanobanana` prevents AI coding agents from producing generic, templated frontend code ("AI slop") or empty placeholder pages by combining three systems into one deterministic workflow:

1. **Impeccable Deterministic Guardrails (`DESIGN.md` + `PRODUCT.md` + 58 Anti-Slop Rules)** — Locks brand tokens, surface mode (`Persuade`, `Operate`, `Read`, `Experience`), voice, and explicit `anti_references` before a single component or image is created, backed by 21 sub-commands (`/ui audit`, `/ui normalize`, `/ui polish`, `/ui prompt`, `/ui wireframe-to-comp`, `/ui localize-assets`, `/ui typeset`, `/ui animate`, `/ui bolder`, `/ui quieter`, `/ui overdrive`, etc.).
2. **Taste Skill Art Direction & Copy Arithmetic** — Enforces a **Subject Inventory** (8–12 specifics unique to the client), the **Competitor Test**, **One Live Thing** (a real interactive micro-instrument on the page), **Two-Line Headline Arithmetic** (`<= 32` chars for Hero `h1` across `1440px`, `768px`, and `390px`), and **Combinatorial Composition Variety** (no default left-text/right-image hero; no two neighboring sections sharing a layout).
3. **OP High-Resolution Nano Banana & Gemini 4 Visual Pipeline** — Syncs `DESIGN.md` into `generations/refs/brand/style.md`, runs an **offline `$0` request-shape and MIME preflight check**, presents one upfront **Batch Media Plan & `WHY THESE CHOICES` Rationale Quote**, generates the **2K/4K Hero plate first** on **Nano Banana 2.1** (`gemini-nano-banana-2.1`) or **Nano Banana Pro** (`gemini-3-pro-image`) with engineered negative-space safe zones for UI typography, and passes that approved Hero as a MIME-verified `{"type": "image", ...}` block inside `input=[...]` (**Series Lock**) for subsequent image routes and **Gemini Omni 1.2 Flash** (`gemini-omni-1.2-flash`) starting-frame video loops, alongside **Gemini 4** (`gemini-4-carbon`, `gemini-4-argon`, `gemini-4-neon`, `gemini-4-hydrogen`) text/code visual routes (`SVG`, `Three.js`, `GLSL` shaders).

Adapted from [AntonioCardenas/ui-nanobanana](https://github.com/AntonioCardenas/ui-nanobanana).

## When to Use This Skill

- Use whenever building, designing, redesigning, auditing, normalizing, or polishing a website, landing page, portfolio, product page, dashboard, or app screen in any stack (Angular, React, Next.js, Astro, Vue, Svelte, HTML/CSS, Tailwind, GSAP, Lenis).
- Use when a user says a UI looks generic, templated, "AI-made", wants a `$0` studio image prompt (`/ui prompt`), wants to convert a wireframe/2D floor plan to a 2K/4K comp (`/ui wireframe-to-comp`), or needs cohesive 2K/4K studio visuals locked to their design tokens.
- Use when invoking `/ui init`, `/ui craft`, `/ui visual-plan`, `/ui prompt`, `/ui wireframe-to-comp`, `/ui localize-assets`, `/ui audit`, `/ui normalize`, `/ui polish`, `/ui typeset`, `/ui colorize`, `/ui layout`, `/ui animate`, `/ui bolder`, `/ui quieter`, `/ui distill`, `/ui harden`, or `/ui overdrive`.

## How It Works

1. **Surface Mode & Contract (`PRODUCT.md` & `DESIGN.md`)** — Classify the surface (`Persuade`, `Operate`, `Read`, `Experience`), compile the 8–12 item **Subject Inventory**, and synchronize `DESIGN.md` tokens and `anti_references` into `generations/refs/brand/style.md` (see [`references/design-contract.md`](references/design-contract.md)).
2. **Argument, Two-Line Copy Math & Composition Matrix** — Structure sections as **Claims -> Proof**, verify every `h1`–`h6` fits in `<= 2` lines at `1440px`, `768px`, and `390px`, choose a non-default Hero Scale and varied per-section Composition Anchors, and design **One Live Thing** (see [`references/art-direction-and-copy.md`](references/art-direction-and-copy.md)).
3. **Offline `$0` Request-Shape Check & Upfront Batch Media Plan** — Validate every planned payload offline at `$0` cost (`validate_interaction_request` and `detect_image_mime` in [`references/prompt-engineering.md`](references/prompt-engineering.md), tested against [`references/fixtures/offline-request-fixtures.json`](references/fixtures/offline-request-fixtures.json) and [`references/fixtures/offline-timeout-uri-fixtures.json`](references/fixtures/offline-timeout-uri-fixtures.json)). Present the consolidated Batch Media Plan Table + `PROMPT` and `WHY THESE CHOICES` rationale, and wait for explicit user approval.
4. **Pinned Interactions API Schema & Hero-First Series Lock** — In `client.interactions.create(...)`, there is **no** `reference_images` request argument (`reference_images` exists strictly in the local `<basename>.json` sidecar log). Instead, generate Slot 1 (Hero) first, inspect its magic bytes to verify MIME (`image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif`), and pass `{"type": "image", "data": "<base64>", "mime_type": "<detected_mime>"}` inside `input=[...]` only on routes that accept reference image inputs per the route matrix below (or chain statefully via `previous_interaction_id`) (see [`references/nanobanana-visual-pipeline.md`](references/nanobanana-visual-pipeline.md)).
5. **58-Rule Deterministic Audit & Multi-Viewport Polish** — Verify `0 FAIL` across all 58 anti-slop rules (`SLOP-01` through `SLOP-58`) at `1440px`, `768px`, and `390px` (see [`references/anti-slop-58-rules.md`](references/anti-slop-58-rules.md) and [`references/commands-playbook.md`](references/commands-playbook.md)).

## Model Routing & Pinned API Schema Matrix

Each route has distinct `response_format`, `input` image-part limits, aspect ratios, and `thinking_level` constraints enforced by `validate_interaction_request`:

| Role in UI / Frontend | Model ID | `response_format.type` & Sizes | Allowed `input` Image Parts & Route Rules | Reference |
| --- | --- | --- | --- | --- |
| Fast UI Drafts | `gemini-3.1-flash-lite-image` | `"image"` (`"1K"` only; standard ratios) | `0–2` MIME-verified `input` image parts; `thinking_level`: `"minimal"` \| `"high"` | [`references/nano-banana-2-lite.md`](references/nano-banana-2-lite.md) |
| Standard 2K/4K & Panoramic Plates | `gemini-nano-banana-2.1` | `"image"` (`"1K"`, `"2K"`, `"4K"`; includes `1:4`, `4:1`, `1:8`, `8:1`) | Up to `14` `input` image parts (`<=4` chars + `<=10` objects); `thinking_level`: `"minimal"` \| `"medium"` \| `"high"` | [`references/nano-banana-2.md`](references/nano-banana-2.md) |
| Studio 2K/4K Hero & Brand Fusion | `gemini-3-pro-image` | `"image"` (`"1K"`, `"2K"`, `"4K"`; standard ratios only, no `1:4`/`8:1`) | Up to `14` `input` image parts (`<=5` chars + `<=6` objects + `<=3` style refs) | [`references/nano-banana-pro.md`](references/nano-banana-pro.md) |
| Starting-Frame Muted Video Loops | `gemini-omni-1.2-flash` | `"video"` (`360p`–`4k`, `16:9`\|`9:16`, `3s`–`15s`) | `1` start frame, `2` start+end keyframes (`3s`–`10s`), or `<=6` R2V image parts in `input`; verified `files/<id>` URI + bounded deadline | [`references/gemini-omni-flash.md`](references/gemini-omni-flash.md) |
| Fast UI/SVG Code & Ref Analysis | `gemini-4-hydrogen` | Text/code only (never `"image"` or `"video"`) | Multimodal `input` inspection (`image`/`video`/`PDF`) -> outputs `.svg`/`.html`/`.md`; `thinking_level`: `"low"`..`"xhigh"` | [`references/gemini-4-hydrogen.md`](references/gemini-4-hydrogen.md) |
| Fast Frontier UI & 3D Code | `gemini-4-neon` | Text/code only (never `"image"` or `"video"`) | Multimodal `input` inspection -> outputs `.svg`/`.html`/`.glsl`; `thinking_level`: `"low"`..`"xhigh"` | [`references/gemini-4-neon.md`](references/gemini-4-neon.md) |
| Efficient Frontier 3D/Shaders | `gemini-4-argon` | Text/code only (never `"image"` or `"video"`) | Multimodal `input` inspection -> outputs `.svg`/`.html`/`.glsl`; `thinking_level`: `"low"` \| `"medium"` \| `"high"` | [`references/gemini-4-argon.md`](references/gemini-4-argon.md) |
| Maximum-Depth 3D & GLSL Shaders | `gemini-4-carbon` | Text/code only (never `"image"` or `"video"`) | Multimodal `input` inspection -> outputs `.svg`/`.html`/`.glsl`; `thinking_level`: `"low"` \| `"medium"` \| `"high"` | [`references/gemini-4-carbon.md`](references/gemini-4-carbon.md) |

## Examples

### Example 1: Full Page Art Direction & Schema-Checked Batch Media Plan (`/ui craft`)

```
User: /ui craft a landing page for our minimalist Solarpunk architectural studio on a #0c1624 dark base
```

The skill creates `PRODUCT.md`, `DESIGN.md`, and `generations/refs/brand/style.md`, compiles an 8–12 item Subject Inventory, enforces two-line headlines (`<= 32` chars for `h1`), runs `validate_interaction_request` offline at `$0` cost, and presents one upfront **Batch Media Plan Table** + `WHY THESE CHOICES` rationale quoting the 4K Hero plate (`gemini-3-pro-image`) and Series-Locked 2K section plates (`gemini-nano-banana-2.1`, passing the Hero as a MIME-verified `{"type": "image", ...}` part inside `input=[...]`).

### Example 2: 58-Rule Deterministic Audit (`/ui audit`)

```
User: /ui audit src/app/landing/landing.component.html
```

Scans the component template and styles against all 58 deterministic anti-slop rules (`SLOP-01` through `SLOP-58`), reporting any banned purple/indigo gradients, eyebrow badges, 3-card icon rows, headlines wrapping past 2 lines, or missing image dimensions without modifying code until `/ui polish` is requested.

## Best Practices

- ✅ Run `validate_interaction_request` and magic-byte `detect_image_mime` offline (`$0` cost) before presenting the Batch Media Plan quote.
- ✅ Pass reference images, starting frames, and layout wireframes strictly as `{"type": "image", "data": ..., "mime_type": ...}` parts inside `input=[...]` per each route's cap; reserve `reference_images` strictly for the local `.json` sidecar log.
- ✅ Enforce bounded `time.monotonic()` deadlines and strict `https://generativelanguage.googleapis.com` `files/<id>` regex validation when polling large `delivery: "uri"` video outputs or background Gemini 4 decodes.
- ❌ Don't pass `response_format={"type": "image"}` to `gemini-4-*` text/code routes, `image_size="4K"` to `gemini-3.1-flash-lite-image`, or panoramic `8:1` ratios to `gemini-3-pro-image`.
- ❌ Don't default to a left-text / right-image hero, three identical icon-in-a-square feature cards, eyebrow pills, or `01 / 02 / 03` decorative numbering.

## Limitations

- Paid media and reasoning calls require a `GEMINI_API_KEY` and spend against Google AI Studio billing (except `/ui audit`, `/ui normalize`, `/ui polish`, and `/ui prompt`, which require zero paid API calls).
- No Gemini image or video model documents a `seed` parameter on the Interactions API; visual consistency across image sections relies on passing approved `input` image blocks, `previous_interaction_id`, and verbatim `style.md` anchors rather than deterministic seeds.
- Static code auditing (`/ui audit`) catches structural and CSS anti-patterns (`SLOP-01` to `SLOP-58`), while final multi-viewport layout (`1440px`, `768px`, `390px`) should be verified in a rendered browser.

## Common Pitfalls

- **Problem:** Passing a top-level `reference_images` argument to `client.interactions.create(...)` or labeling a `.jpg`/`.webp` file as `image/png`.
  **Solution:** Inspect magic bytes with `detect_image_mime` and pass `{"type": "image", "data": ..., "mime_type": ...}` inside `input=[...]`, verified offline by `validate_interaction_request`.
- **Problem:** Display headlines wrapping to 3 or 4 lines on mobile (`390px`) or split desktop columns.
  **Solution:** Use the Two-Line Headline Arithmetic (`<= 32` chars / 4–6 words for `h1`) with `max-width: XXch` and `text-wrap: balance`.

## Security & Safety Notes

- **Network** — Paid media/reasoning calls go strictly to `generativelanguage.googleapis.com` via Google's official `google-genai >= 3.2.0` SDK. Returned `delivery: "uri"` video links are validated against `https://generativelanguage.googleapis.com` and `/v1(beta)?/files/[a-z0-9-]+` before polling with a bounded deadline.
- **Secrets** — `GEMINI_API_KEY` is only ever read from the environment or an existing workspace `.env`; never written, logged, or committed.
- **File writes** — Confined to the active project workspace (`DESIGN.md`, `PRODUCT.md`, project source/asset folders, and `generations/`).
- **Cost Gate** — Every paid batch or single asset edit quotes expected USD cost from live Google AI Studio pricing alongside the exact `PROMPT` and waits for explicit user approval before running sequentially.

## Related Skills

- `@generate-nanobanana` - Direct multi-model Gemini media & visual reasoning generation (`/generate`) with reference sets and sidecar logging.
- `@frontend-design` - Core frontend UI implementation patterns.
