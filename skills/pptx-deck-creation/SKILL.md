---
name: pptx-deck-creation
description: "Create editable, production-ready PPTX decks with narrative planning, explicit layout specs, asset guidance, and quality checks."
category: office-productivity
risk: safe
source: community
source_repo: kimtth/agent-pptify-kit
source_type: community
date_added: "2026-07-14"
author: kimtth
tags: [powerpoint, pptx, presentation, slide-design, document-generation]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT"
license_source: "https://github.com/kimtth/agent-pptify-kit/blob/main/LICENSE"
---

# PPTX Deck Creation

## Overview

Create an editable PowerPoint deck from a clear narrative, source evidence, and
explicit layout decisions. Keep the deck specification and its native
PowerPoint objects as the source of truth. Images may support a slide, but they
must not replace editable titles, labels, data, tables, or diagrams.

Use the bundled references for design-profile selection, reference-deck
analysis, visual-asset decisions, and final quality checks. The skill does not
ship a general-purpose renderer or bundled runtime scripts.

## Scope Boundary

Use this skill as the primary workflow for creating a new, editable PPTX deck.
It owns the path from a deck brief through narrative planning, a
coordinate-explicit specification, task-specific PPTX generation, and final
quality assurance. Do not redirect a net-new deck to another skill merely
because the requested deliverable is a `.pptx` file.

Use `@pptx-official` when work starts with an existing PPTX and requires
package-level operations: raw OOXML editing, template duplication and text
replacement, speaker notes, comments, animations, or other structural changes
to that file. It may support a build when those operations are necessary, but
it is not the default workflow for a net-new deck authored here.

## When to Use This Skill

* Use when a user asks to create a new editable PowerPoint or PPTX deck
* Use as the default workflow when a new deck needs to be delivered as a `.pptx` file
* Use when a deck needs a narrative framework, a design direction, and final coordinates
* Use when analyzing a reference PPTX without copying its binary content
* Use when reviewing a generated PPTX for layout, package, or accessibility defects

## How It Works

### Step 1: Understand the requested deck

Collect the audience, decision or purpose, language, slide count, source
material, brand requirements, and delivery format. Ask the user to select a
narrative framework if they have not already done so. Do not select one on the
user's behalf.

Use one of these framework spines, or a user-defined alternative:

| Framework | Use case |
|---|---|
| `mckinsey` | Executive proposals and strategic recommendations |
| `scqa` | Situation, complication, question, answer narratives |
| `pyramid` | Main answer followed by supporting arguments |
| `mece` | Issue decomposition and workstream synthesis |
| `action-title` | Executive communications with conclusion-led titles |
| `assertion-evidence` | Technical or research presentations |
| `exec-summary-first` | Board and leadership briefings |
| `custom` | User-defined structure or organization playbook |

Record the resolved framework, its source, title rules, slide sequence, and
any approved assumptions in the deck summary.

### Step 2: Establish source and design context

Give each factual source a stable ID. Record a source reference for every
metric, chart value, quotation, and factual claim that appears in the deck.
Summarize source material into one message per slide rather than pasting long
documents into the specification.

For a reference presentation, inspect it read-only. Extract palette, font,
slide-size, template, layout-flow, and topic-sequence signals. Re-author target
slides with their own explicit coordinates. Do not copy, mutate, or use the
source PPTX as a template for generated content.

Select a documented design profile from
[design profiles](references/design-profiles.md). Use the user's named profile
first. Use a reference deck when one is available. Otherwise, use Fluent UI
Design Token Guidance by default, use Primer Primitives for GitHub-focused
technical decks, and use a broader style catalog only when the user requests
multiple visual directions. Record the selected profile, source URL, license,
palette, typography, spacing, and signature visual treatment in
`summary.design_context`.

### Step 3: Plan the story and visual structure

Create one defensible message per slide. Use conclusion-led slide titles when
the selected framework calls for them. Keep the storyline mutually exclusive
and collectively exhaustive where appropriate. Include concrete numbers, dates,
owners, and sources only when supported by the evidence.

Every normal content slide needs a visible, style-derived structure such as an
accent band, card shell, divider, grid, diagram primitive, or image treatment.
Avoid plain title-and-bullets slides, default theme colors, and Calibri-only
output unless the user explicitly requests that treatment.

### Step 4: Author a coordinate-explicit specification

Create a JSON object with `summary` and `slides`. Every generated slide needs
an `id`, `title`, and complete `layout_tree`. Use final inch-based bounding
boxes, z-order, colors, font sizes, and grouping. Do not rely on a renderer to
make layout decisions.

Include this production metadata before building:

```json
{
  "summary": {
    "layout_policy": {
      "safe_margin": 0.5,
      "content_bottom": 6.7,
      "footer_top": 6.85,
      "minimum_gap": 0.12
    },
    "accessibility": {
      "language": "en-US",
      "presentation_title": "Deck title"
    }
  }
}
```

Keep content inside the safe margin and above the footer rail. Use native
`text`, `shape`, `line`, `table`, and `image` objects. Add alt text to
meaningful images and a reading order for each production slide. Use images as
supporting visuals only; recreate essential labels, legend entries, process
steps, and data values as editable objects.

Use the following object constraints:

* Keep content text at 9 pt or larger; prefer 10 to 12 pt for body copy
* Keep every child object inside its parent group bounding box
* Keep table column widths equal to the table width and split dense tables across slides
* Keep normal content objects within slide bounds; only decorative full-bleed elements may cross an edge
* Keep images behind overlapping text and preserve their aspect ratio
* Store `source_ref` with source ID, locator, claim type, and verification status for sourced claims

### Step 5: Create the PPTX deck when requested

Own net-new PPTX creation in this workflow. When a PPTX file is required,
create a small task-specific builder with the user's approved environment. Start
slides from a blank layout and create native objects from the final bounding
boxes. Enable word wrap, disable automatic text resizing, set text insets and
alignment explicitly, and reject zero or negative bounding boxes before
building.

Save the authored specification, PPTX, build manifest, audit records, and
source manifest together. Do not add a large shared renderer or copy source
presentation content. Use `@pptx-official` only when the requested result also
requires an existing-file or OOXML workflow.

### Step 6: Validate and repair

Apply the [manual audit checklist](references/audit-checklist.md) before and
after building. Check collisions, text capacity, font sizes, safe margins,
group containment, table fit, object bounds, design context, and native
editability. Reopen the PPTX to verify slide count, package structure, hidden
slides, actual geometry, language, image alt text, reading order, and table
headers.

Inspect rendered previews when a compatible renderer is available. Check
clipping, font fallback, contrast, image crops, and visual hierarchy. Repair
the specification or the task-specific builder, rebuild, and repeat the audit
until all deterministic failures are resolved. Report any remaining exception
with the slide ID, object ID, reason, owner, and review date.

## Reference-Deck Analysis

The skill provides a read-only analysis contract, not packaged code. For a
specific task, use `python-pptx` and the Office Open XML package to inspect a
presentation. Produce only the context needed for the task:

* Compact prompt context with slide count, styles, brands, template, and layout
* Full extraction with `layout_tree`, summary metrics, and render-aware elements
* Folder-level diagnostics with one result per deck and a manifest
* Style-master analysis with colors, fonts, layout usage, and flow patterns

Use [reference-deck analysis recipes](references/reference-deck-analysis.md)
and [Python guidance](references/python-snippets.md) as static implementation
references. Keep all extraction read-only.

## Visual Assets

Use [visual asset guidelines](references/visual-asset-adapters.md) when an icon,
image, SVG, or user-managed infographic is needed. Confirm image licensing
before placing it. Record asset provenance, local path, and alt text. Never ask
users to provide secrets in chat, and never use a placeholder when acquisition
fails.

When a provider, output path, or other required setting is missing, ask for the
non-secret information before generating an infographic. If no configured
provider is available, omit the asset and continue with editable native slide
objects.

## Examples

### Example 1: Executive recommendation deck

A user asks for a 10-slide leadership deck based on a project brief. Confirm
the audience, choose `exec-summary-first`, summarize the brief into one claim
per slide, and create coordinate-explicit content cards with a documented
Fluent UI design context. Add source references for each brief-derived metric,
then build and audit the requested PPTX.

### Example 2: Reference-deck-informed proposal

A user supplies a prior PPTX and asks for a new proposal in a similar visual
language. Extract only the existing deck's palette, typography, layout rhythm,
and template usage. Use those signals to design a new outline and native layout
tree. Do not duplicate slides, copy the deck's binary parts, or present the
reference deck as the new deliverable.

## Best Practices

* Keep the business framework and source lineage visible in the deck summary
* Make each slide title convey the slide's conclusion or narrative role
* Use source evidence for charts and dashboard-like exhibits
* Build meaningful content from native editable PowerPoint objects
* Add a deliberate visual structure to every normal content slide
* Rebuild and inspect previews after repairing layout or text issues

## Limitations

* This skill does not replace a user-provided brand guide, legal asset review, or expert accessibility review
* It does not include a general renderer, a bundled extraction module, or credentials for external providers
* It does not own raw OOXML editing, template duplication, or other mutations of an existing PPTX package
* Stop and ask for clarification when the audience, source evidence, brand requirements, or required output path is missing

## Security and Safety Notes

* Keep reference-deck analysis read-only and never overwrite the source deck
* Request confirmation before any task-specific build or repair overwrites an existing output file
* Use user-managed providers only and keep credentials outside chat and skill content
* Omit unlicensed or license-ambiguous visual assets instead of substituting placeholders

## Common Pitfalls

### Problem: A slide has more copy than its bounding box can hold

Shorten the copy, enlarge the bounding box, or split the content across slides.
Do not solve the issue by reducing meaningful content below 9 pt.

### Problem: The deck resembles an unstyled default PowerPoint file

Select and record a design profile, then add explicit background, typography,
accent, card, divider, or grid primitives to the layout tree.

### Problem: A reference deck is used as a source file for the output

Treat the reference deck as read-only context. Re-author the target deck with
its own slide specification and native editable content.

## Related Skills

* `@pptx-official` - Use for existing PPTX, OOXML, and template-mutation workflows, not default net-new deck creation
* `@python-pptx-generator` - Use for focused Python PPTX generation patterns
