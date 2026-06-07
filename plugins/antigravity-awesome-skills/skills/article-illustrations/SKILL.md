---
name: article-illustrations
description: "Generate hand-drawn 16:9 article illustrations with the Grav character IP, sparse annotations, and absurd but clear visual metaphors."
category: creative
risk: safe
source: community
source_repo: vipin-si/article-illustrations
source_type: community
license: MIT
license_source: https://github.com/vipin-si/article-illustrations/blob/main/LICENSE
date_added: "2026-06-06"
author: vipin-si
tags: [illustration, article-graphics, visual-metaphors, image-generation, whiteboard-sketch]
tools: [image-generation]
---

# Article Illustrations — Grav Hand-Drawn Style

## Overview

Generate 16:9 landscape hand-drawn illustrations for articles, blog posts, and technical content. Each illustration captures one cognitive anchor point from an article and turns it into a clean, absurd, memorable whiteboard-sketch explanation.

The skill uses a recurring character IP called **Grav**: a small, round, always-floating figure with dot eyes and a thin antenna. Grav participates in the core action of every illustration — never just decoration.

**Repository:** [vipin-si/article-illustrations](https://github.com/vipin-si/article-illustrations)

## When to Use This Skill

- Use when writing articles, blog posts, or documentation that need inline illustrations
- Use when you want to turn abstract concepts into concrete visual metaphors
- Use when you want a consistent visual language across multiple articles
- Use when you need hand-drawn explanation sketches, not PPT infographics

## How It Works

### Step 1: Digest the Article

Read the article and identify cognitive anchor points — core judgments, turning points, input/output loops, before/after contrasts, and common pitfalls. Don't distribute illustrations evenly; prioritize moments that benefit from visual explanation.

### Step 2: Plan a Shot List

For each illustration, define:
- **Placement**: After which section
- **Theme**: What this image is about
- **Core Meaning**: The one idea it conveys
- **Structure Type**: One of 8 composition patterns (Workflow, System Closeup, Before/After, Role States, Conceptual Metaphor, Layered Method, Map Route, Mini Comic)
- **Grav's Action**: What Grav is doing in the scene
- **Annotation Labels**: 3–5 short English labels

### Step 3: Generate Images

Use the `generate_image` tool with the built-in prompt template. Each image follows strict style rules:
- Pure white background, no textures
- Black hand-drawn line art with slight wobble
- Sparse red/orange/blue handwritten annotations
- Grav always floating (never touching surfaces)
- One core idea per image
- 40–60% canvas usage, 35%+ whitespace

### Step 4: QA Check

Verify each image against the QA checklist: correct format, Grav present and active, original metaphor, clean composition, sparse annotations, correct color usage.

## Examples

### Example 1: Plan illustrations for an article

```
Analyze this article and create a shot list of 5 illustrations.
Don't generate images yet — just plan which cognitive anchor points
deserve illustrations and what each image should convey.

<paste article>
```

### Example 2: Generate illustrations directly

```
Generate 4 Grav-style illustrations for this article.
Requirements: 16:9 landscape, pure white background, black hand-drawn
line art, sparse red/orange/blue English annotations.

<paste article>
```

### Example 3: Single concept illustration

```
Generate one 16:9 illustration for this concept:
"Trust isn't declared — it's built one piece of evidence at a time."
Grav must perform the core action. Maximum 5 annotation labels.
```

### Example 4: Iterate on a result

```
This illustration is on the right track, but Grav feels like decoration.
Keep the core meaning but regenerate: make Grav the one actually
driving the structure.
```

## Visual Style

| Element | Rule |
|:--------|:-----|
| Background | Pure white — no cream, texture, gradients, or shadows |
| Line art | Black, hand-drawn, slightly wobbly, not mechanical |
| Whitespace | Main subject 40–60% of canvas, 35%+ empty space |
| Annotations | Handwritten English, 2–5 words each, max 5–8 per image |
| Color: Black | Main line art, characters, structures, objects |
| Color: Red | Key highlights, problems, warnings, results |
| Color: Orange | Main flow, paths, arrows, direction |
| Color: Blue | Supplementary notes, feedback, system state |
| Prohibited | Green, purple, yellow, pink, gradients, drop shadows, 3D, realistic UI |

## Character: Grav

- Small round body (pebble/potato shape)
- Two dot eyes (slightly asymmetric)
- One thin bent antenna with tiny circle tip
- Thin stick legs that dangle without touching surfaces
- Always hovering — visible gap between Grav and any surface
- Expression: calm, focused, deadpan
- Role: active participant in the system, never decoration

## Best Practices

- ✅ Start with a shot list before generating images
- ✅ Invent a new metaphor for every illustration — never reuse compositions
- ✅ Make Grav the action protagonist, not a bystander
- ✅ Keep it absurd but structurally clear
- ✅ Use color sparingly — when in doubt, use black
- ❌ Don't make PPT infographics or formal flowcharts
- ❌ Don't add title bars or decorative frames
- ❌ Don't let Grav touch the ground or stand on surfaces
- ❌ Don't make Grav cute, smiling, or emoji-like

## Limitations

- Requires access to an image-generation tool that can follow composition, line-art, and annotation constraints.
- The recurring Grav character style can drift between generations; verify every output against the QA checklist.
- Text in generated images may be misspelled or distorted, so short labels and post-generation review are required.
- The style is intended for explanatory article illustrations, not photorealistic product imagery or brand-final artwork.

## Common Pitfalls

- **Problem:** Illustration looks like a PPT slide
  **Solution:** Remove 30% of elements, increase whitespace, make it weirder

- **Problem:** Grav is just standing next to the action
  **Solution:** Redesign so Grav IS the mechanism — becomes the funnel, dangles from the lever, is suspended inside the machine

- **Problem:** Same metaphor as a previous illustration
  **Solution:** Replace the physical object entirely — same concept, different analogy

## Additional Resources

- [Full skill with prompt templates and QA checklist](https://github.com/vipin-si/article-illustrations)
- [Example illustrations](https://github.com/vipin-si/article-illustrations#examples)
