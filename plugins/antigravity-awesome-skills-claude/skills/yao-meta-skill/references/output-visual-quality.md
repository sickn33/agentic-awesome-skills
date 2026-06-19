# Output Visual Quality

Use this checklist before approving a generated skill that produces reports, tutorials, HTML pages, screenshots, Markdown deliverables, or slide-like artifacts.

## Common Visual Failures

- generic headings such as Overview, Key Points, Summary, or Next Steps when the user's domain needs sharper section names
- large citation or footnote clusters that break sentence flow
- Markdown tables with paragraph-length cells or weak hierarchy
- screenshots captured from the wrong state, viewport, crop, or missing asset
- HTML reports that look like raw JSON converted into cards
- repeated cards with identical weight, making the page hard to scan
- decorative gradients, shadows, or glass effects that do not serve the content
- mobile layouts that collapse into long undifferentiated blocks

## Design Quality Gates

### P0 Must Fix

- no absolute `/Users/...` paths in final HTML
- no placeholder titles, labels, screenshots, or source notes
- no invented screenshots, charts, citations, or visual evidence
- no table with paragraph-length cells when bullets or cards would scan better
- no fixed design palette copied from another skill without content justification

### P1 Should Fix

- title and section headings use domain nouns and the target outcome
- each report has one clear first-screen explanation of what it is for
- visual hierarchy separates decisions, evidence, risks, and next actions
- dense content is split across sections instead of squeezed into one block
- reviewer-only detail is present but not pushed into the user's main reading flow

### P2 Polish

- typography roles are consistent
- whitespace rhythm supports reading speed
- cards, tables, and callouts are used for different semantic jobs
- source notes are grouped where they preserve flow
- mobile, print, and static-file viewing are considered when relevant

## Self-Repair Pass

Before handoff, scan the generated artifact for:

1. heading specificity
2. table readability
3. citation density
4. screenshot truthfulness
5. local path leakage
6. placeholder remnants
7. mobile scanability
8. reviewer-visible evidence
