---
name: mdpr-skill
description: "Review MDPR Markdown presentation workflows with semantic hints, visual checks, and deterministic renderer boundaries."
category: productivity
risk: safe
source: community
source_repo: ch040602/mdpr-skill
source_type: community
date_added: "2026-07-01"
author: ch040602
tags: [mdpr, presentations, markdown, powerpoint, codex, visual-review, agent-hints]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT"
license_source: "https://github.com/ch040602/mdpr-skill/blob/main/LICENSE"
---

# mdpr-skill

## Overview

Use this skill as the optional agent companion for
[MDPR](https://github.com/ch040602/MdPr), a deterministic
Markdown-to-presentation runtime. MDPR owns parsing, layout, theming,
validation, and final PPTX/HTML/PDF rendering. This skill helps an agent review
MDPR workflows, propose weak semantic hints, and explain visual findings without
taking control of slide geometry.

The upstream skill source is
[`ch040602/mdpr-skill`](https://github.com/ch040602/mdpr-skill), which includes
schemas, review commands, compatibility artifacts, visual evidence examples, and
MDPR boundary documentation.

## When to Use This Skill

- Use when the user asks about MDPR, `mdpresent`, Markdown-to-PPTX, or
  Markdown presentation review.
- Use when generated MDPR artifacts need semantic, narrative, accessibility, or
  visual review notes.
- Use when the user wants Codex-style presentation workflow hints while keeping
  MDPR as the deterministic renderer.
- Use when comparing MDPR output against image-only deck generators such as a
  codex-ppt style workflow.
- Use when a reusable theme or style-pack proposal should be expressed as an
  approval-bound MDPR candidate instead of direct final slide edits.

## Core Boundary

- Let MDPR own parsing, slide splitting, recipes, layout, coordinates,
  geometry, typography, colors, z-order, arrows, effects, exact icon assets,
  renderer object IDs, and final PPTX objects.
- Keep agent output semantic, evidence-based, and schema-valid.
- Express fixes as Markdown cleanup, MDPR rulebook changes, config changes,
  deterministic policy changes, or approval-bound proposals.
- Preserve the ability to build the same deck with all agent hints disabled.
- Do not mutate source Markdown unless the user explicitly asks for a cleaned
  source draft.

## How It Works

### Step 1: Identify the MDPR Surface

Classify the user's request before producing advice:

- `semantic hints`: compact intent, grouping, importance, and icon-keyword
  suggestions.
- `review report`: visual or narrative concerns grounded in rendered evidence,
  manifests, or validation reports.
- `layout intent`: high-level layout goals from a summarized template catalog,
  never concrete placeholder coordinates.
- `theme candidate`: reusable token and style-pack proposal for later MDPR
  approval/import gates.
- `codex-ppt compatibility`: feature mapping and comparison notes only; do not
  turn MDPR into a full-slide image renderer.

### Step 2: Ground Every Finding

Reference available evidence such as:

- source Markdown path or heading text
- MDPR manifest summaries
- rendered preview image paths
- validation report IDs
- source notes or citation metadata
- schema names such as `agent-hint.json`, `review-report.json`, or
  `mdpr-theme-candidate-v1`

If evidence is missing, say what artifact is needed instead of inventing a
pass/fail result.

### Step 3: Keep Hints Weak

Allowed hints:

- slide or section intent
- content grouping
- relative importance
- icon-search keywords
- accessibility or citation review notes
- generated-image candidate briefs when an icon would be too small or too
  semantically ambiguous

Disallowed hints:

- final coordinates, sizes, z-order, geometry, or object IDs
- exact colors, typography, arrows, effects, or icon asset choices
- final layout IDs or placeholder IDs
- pass/fail validation decisions not backed by MDPR validation

### Step 4: Route Fixes to MDPR-Owned Changes

When repeated issues appear, recommend a deterministic follow-up surface:

- Markdown cleanup
- MDPR rulebook change
- MDPR config/profile change
- MDPR theme-pack registration
- MDPR validation improvement
- approval-bound deck-local override or style-pack candidate

## Useful Local Commands

Run these only when the upstream `mdpr-skill` CLI is available in the current
workspace and the referenced input files exist.

```bash
node bin/mdpr-skill.js hint --source-sha256 <64hex> --out .mdpresent/proposals/agent-hint.json
node bin/mdpr-skill.js review --manifest dist/mdpresent-manifest.json --out .mdpresent/review/review-report.json
node bin/mdpr-skill.js narrative --markdown deck.md --manifest dist/mdpresent-manifest.json --out .mdpresent/review/narrative-review.json
node bin/mdpr-skill.js layout-intent --layout-catalog template-layout-catalog.json --out .mdpresent/review/layout-intent.json
node bin/mdpr-skill.js accessibility --markdown deck.md --audience "executive review" --out .mdpresent/review/accessibility-review.json
```

## Examples

### Review a Rendered MDPR Deck

1. Read the source Markdown, manifest summary, rendered image list, and any
   validation report.
2. Separate source-content problems from renderer/rulebook problems.
3. Report only evidence-backed visual concerns.
4. Recommend deterministic MDPR fixes when the same issue repeats.

### Propose a Theme Candidate

1. Treat the source design as a visual system, not content to copy.
2. Extract reusable tokens, semantic layout blueprints, decoration grammar, and
   best-fit scenarios.
3. Emit an approval-bound `mdpr-theme-candidate-v1`.
4. Keep `mdprOwnsFinalLayout`, `mdprOwnsFinalThemeBinding`, and
   `noRawUseInAgentHints` true.

### Compare with codex-ppt Style Workflows

Use codex-ppt only as a capability reference or image-only baseline. Preserve
the output-model distinction: codex-ppt style workflows may produce full-slide
images, while MDPR defaults to editable PPTX/HTML/PDF with deterministic
validation.

## Best Practices

- Prefer concise semantic hints over restating the source.
- Keep review notes actionable for MDPR maintainers.
- Call out missing evidence before making quality claims.
- Treat LLM judgment as triage only; MDPR validation remains the release gate.
- Keep generated asset prompts as semantic briefs, not final asset selections.

## Limitations

- This skill does not replace MDPR runtime validation.
- This skill does not generate final slide coordinates or final PPTX objects.
- This skill does not make MDPR depend on an LLM.
- This skill should not be used to copy private deck designs or proprietary
  slide content.

## Common Pitfalls

- **Problem:** Treating mdpr-skill output as final slide layout.
  **Solution:** Keep hints semantic and let MDPR choose final layout, geometry,
  and renderer objects.

- **Problem:** Reporting visual issues without evidence.
  **Solution:** Link each finding to source Markdown, a manifest entry, rendered
  previews, validation reports, or another concrete artifact.

- **Problem:** Copying codex-ppt image-only behavior into MDPR.
  **Solution:** Use image-only generators as comparison baselines while
  preserving MDPR's editable PPTX/HTML/PDF output model.

## Security & Safety Notes

- Review only files the user has provided or authorized.
- Do not fetch private references, credentials, or paid assets without explicit
  permission.
- Do not include secrets, API keys, or private source content in generated
  review reports or theme candidates.
- Treat all CLI commands as local workspace commands; confirm input paths exist
  before running them.

## Related Skills

- `@frontend-slides` - Use for browser-native HTML presentation generation.
- `@2slides-ppt-generator` - Use for hosted API-based presentation generation.
- `@office-productivity` - Use for broader document, spreadsheet, and slide
  workflow coordination.
