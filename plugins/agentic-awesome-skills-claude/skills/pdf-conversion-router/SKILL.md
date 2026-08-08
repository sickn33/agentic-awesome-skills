---
name: pdf-conversion-router
description: Use when converting a PDF into another format such as Markdown, HTML, text, JSON, DOCX, or structured notes and the agent must choose the best extraction route, settings, and cleanup strategy for maximum fidelity and readability.
risk: safe
source: community
date_added: "2026-05-23"
metadata:
  category: technique
  triggers: pdf conversion, convert pdf, pdf to markdown, pdf to html, pdf to text, pdf to json, pdf to docx, OCR pdf, slide deck pdf, medical pdf, scanned pdf
---

# PDF Conversion Router

Route every PDF conversion through a short analysis step before choosing tools or CLI flags.

The goal is not "extract the most text". The goal is:
- preserve structure
- preserve attachment between labels and values
- choose the most faithful output shape
- avoid noisy defaults when a better route exists

## When to Use

- The user wants a PDF converted into another format.
- The requested output is `.md`, `.html`, `.txt`, `.json`, `.docx`, or structured notes.
- The PDF may be scanned, OCR-heavy, table-heavy, slide-based, medical, academic, or multi-column.

## Core Rule

Never start with one fixed default pipeline.

Always:
1. classify the PDF
2. classify the target output
3. choose the strongest route for that combination
4. validate the result on representative sections
5. if needed, retry with better settings before delivering

Heuristics are starting points, not guarantees.

Do not promote one flag combination into a universal default just because it worked well on one PDF.
Prefer document-specific evidence over habit.

## Primary Engine Rule

Use `opendataloader-pdf` as the primary conversion engine for every PDF conversion task by default.

This skill should assume:
- `opendataloader-pdf` is always the first conversion attempt
- other tools are used to classify, validate, OCR, inspect, or support cleanup
- other extractors are not the default replacement for the main conversion route

Use other tools only for one of these reasons:
- quick classification of the PDF
- OCR preprocessing before conversion
- validation against layout-preserving text
- manual repair when the generated output is still noisy
- fallback only if `opendataloader-pdf` cannot produce a usable result

## Step 1: Classify the Source PDF

Identify the document class as quickly as possible:

- Native digital PDF with selectable text
- OCR PDF with noisy text
- Image-only/scanned PDF
- Slide deck / presentation export
- Medical or lab report
- Table-heavy business/finance document
- Narrative report / letter / article
- Mixed layout document with diagrams, tables, and prose

Useful fast checks:

```bash
pdfinfo input.pdf
pdftotext -layout input.pdf -
```

If text is missing or very poor, treat OCR as required.

## Document-Type Heuristics

Use these as default starting points:

- medical / lab report
  `markdown-with-html + --table-method cluster + --image-output off`

- slide deck / PowerPoint export
  `markdown-with-html + --image-output off`
  add `--table-method cluster` only if the default route under-structures important tabular content
  if tables are visually obvious but missing or badly fused, treat this as a detection problem, not a Markdown formatting problem
  if the selected route already reconstructs a real table but clips leading characters at column boundaries, treat that as a boundary-splitting defect, not a missing-table failure

- narrative / article / letter
  start with `markdown` or `text`
  use `markdown-with-html` only if structure clearly matters

- table-heavy business / finance PDF
  start with `markdown-with-html`
  add `--table-method cluster` when rows or columns flatten

- scanned / image-heavy PDF
  OCR first, then convert with `opendataloader-pdf`

- mixed-layout PDF
  prefer `markdown-with-html`
  validate one easy section and one hard section before accepting output

## Step 2: Choose the Output Shape

Pick the output that best matches the document and the user's goal.

- `markdown-with-html`
  Use by default when the user wants Markdown and fidelity matters.
  Prefer this for tables, medical reports, slides, mixed-layout PDFs, and anything likely to break in pure Markdown.

- `markdown`
  Use only when clean plain Markdown matters more than layout fidelity.

- `html`
  Use when visual structure matters more than LLM readability.

- `text`
  Use for quick linear extraction, narrative documents, or when structure is unimportant.

- `json`
  Use when downstream machine processing matters more than human readability.

- `docx`
  Use when the user wants editable office output and layout reconstruction matters.

## Step 3: Choose the Extraction Route

### For OpenDataLoader CLI

Use OpenDataLoader as the default route.

Preferred defaults:

- For Markdown output with fidelity priority:
  `-f markdown-with-html`

- For medical PDFs:
  add `--table-method cluster`

- For table-heavy PDFs:
  add `--table-method cluster`

- For slide decks:
  start without `--table-method cluster`
  add it only after a structure check shows meaningful improvement
  if a pseudo-table is already collapsed inside one detected row, changing only the Markdown flavor usually will not fix it
  if the active engine build recovers the pseudo-table structure, prefer fixing residual boundary artifacts before escalating to hybrid/full mode

- For conversions where images are not requested:
  add `--image-output off`

- For slide decks, medical reports, and structure-sensitive PDFs:
  prefer validating both the command success and the actual rendered structure

- For referts/reports where exact values matter:
  validate key sections after conversion instead of trusting first pass

### For medical or lab PDFs

Default route:

```bash
opendataloader-pdf -f markdown-with-html --table-method cluster --image-output off
```

Then verify:
- main table headers
- attachment of value, unit, and reference range
- legends/comments separated from result rows

If a clinical table is flattened, compare against `pdftotext -layout` before accepting output.

### For slide decks

Prefer:

```bash
opendataloader-pdf -f markdown-with-html --image-output off
```

Then check for:
- repeated footers
- page numbers
- diagram pseudo-tables
- orphan symbols and chart labels

If CLI output is still poor, do a cleanup pass tuned for slides instead of assuming the raw extract is final.
If the slide contains obvious table-like blocks that are not detected as tables at all, prefer a same-engine retry with a stronger route such as hybrid/full mode before jumping to unrelated extractors.
If the slide now produces a real table, validate the first column and header boundaries before assuming the table is fully correct.

### For scanned PDFs

If the text layer is poor or absent:
- run OCR first
- then convert the OCR'd PDF with `opendataloader-pdf`

Prefer conservative reconstruction over aggressive guessing.

## Step 4: Validation Gates

Before claiming success, inspect the output for the patterns most likely to break.

For medical PDFs:
- values attached to correct exam names
- units and reference ranges not merged into neighbors
- comments not merged into rows

For slides:
- bullets normalized
- footers/page numbers removed when they are noise
- diagrams not causing crashes
- remaining tables readable enough to follow
- first column labels not losing their first character at inferred column boundaries
- pseudo-table recovery not breaking row grouping or spilling labels into the next column

For table-heavy documents:
- no catastrophic row flattening
- headers preserved
- repeated empty separator rows minimized
- sparse or single-column tables not accidentally collapsed into prose
- table bodies not fused into a single HTML or Markdown row containing many logical records

For every document class:
- check the first representative section, not just the top of the file
- check one complex section, not only a simple section
- prefer document-level confidence over success on page 1

## Red Flags

Treat these as signals that the current output is not ready:

- table rows flattened into long prose lines
- table header looks correct but the entire body is fused into one row with multi-value cells
- labels detached from values
- units or reference ranges drifting into adjacent rows
- repeated page footers or page numbers
- pseudo-tables with mostly empty cells
- legitimate sparse tables collapsed into paragraphs
- single-column tables flattened because they looked "too simple"
- stray symbols, bullets, or OCR fragments
- good command exit code but visibly poor structure
- page 1 looks fine but a later complex section is broken
- switching from `markdown` to `markdown-with-html` improves wrapping but does not restore missing row boundaries
- a pseudo-table is now emitted as a table, but key labels are clipped at the left edge of cells

## Never Trust Page 1

Do not accept a conversion just because the top of the file looks good.

Always validate:
- one early section
- one structurally difficult section
- one section likely to matter most to the user

For medical PDFs, this means checking a real lab table, not just the heading block.

For slide decks, this means checking at least one dense diagram or pseudo-table, not just the title slides.

## Step 5: Post-Conversion Repair Pass

Conversion is not finished just because a file was generated.

If the output is structurally correct but still noisy or hard to read, perform a cleanup pass before delivering it.

Use three buckets:

- `cleanup`
  For noise reduction without changing meaning.
  Examples:
  - repeated footers
  - page numbers
  - duplicated bullet markers
  - stray symbols
  - empty separator rows
  - trivial one-cell pseudo-tables that should become plain text

  Important:
  do not collapse a table just because it is sparse, narrow, or mostly empty.
  Preserve legitimate single-column and sparse tables if they still carry table meaning.

- `structural correction`
  For repairing attachment and readability when the extractor found the right content but the wrong structure.
  Examples:
  - flattened tables
  - fused columns
  - notes merged into result rows
  - legends mixed into measurements
  - broken section boundaries

- `route retry`
  For cases where the problem comes from the wrong extraction path, not from output cleanup.

Always prefer the least invasive repair that produces a faithful, readable result.

Do not leave raw noisy output untouched if it is clearly improvable.

## Step 6: Retry Rules

Do one targeted retry if the first route is wrong.

Examples:
- Markdown too flat for tables -> switch to `markdown-with-html`
- Table detection weak -> retry with `--table-method cluster`
- Table wrapper exists but body rows are fused -> treat as structural extraction failure; inspect JSON or a structure-preserving view, then retry the route instead of only cleaning Markdown
- Table structure is recovered but leading characters are clipped at cell boundaries -> treat as a boundary-splitting defect; prefer tightening the same-engine structure logic over routing to an unrelated extractor
- OCR missing text -> OCR first, then reconvert
- Slide output noisy but structurally usable -> keep extractor, improve cleanup
- Slide pseudo-table not detected -> retry same engine with hybrid/full mode before non-OpenDataLoader fallback

Do not keep blindly retrying many variants. Choose the next attempt based on the failure mode.

Prefer this retry order:
1. same engine, better flags
2. same engine, different output shape
3. same engine plus hybrid/full mode when available
4. same engine plus cleanup/repair
5. OCR preprocessing plus same engine
6. only then consider a non-OpenDataLoader fallback if truly blocked

For `--table-method cluster`, treat it as a targeted retry or document-specific default, not a universal default.
It is often the best choice for medical PDFs, but not automatically for every slide deck or every business document.

## Default Preferences

When the user does not specify otherwise:

- prefer `markdown-with-html` over pure `markdown`
- disable images unless the user wants them
- prefer `--table-method cluster` for medical PDFs
- consider `--table-method cluster` for table-heavy PDFs when rows or columns flatten
- do not assume `--table-method cluster` is the best default for slide decks
- do not assume `markdown-with-html` alone fixes fused table rows if the underlying table structure is already wrong
- do not assume hybrid/full is still necessary if the active engine now reconstructs the pseudo-table correctly enough
- verify the real output, not just the command exit code
- keep the original PDF untouched
- prefer creating the converted file in a dedicated output folder
- prefer giving the user the final chosen output path, not just a command summary

## Benchmark Safety Rule

If the work involves changing `opendataloader-pdf` behavior itself, not just running a conversion:
- validate the target real-world PDF
- validate at least one difficult public benchmark case if available
- avoid cleanup rules that improve one document by degrading sparse or edge-case tables elsewhere
- explicitly check for the failure mode where a valid-looking table header is followed by a single fused body row
- if fixing a slide pseudo-table, also re-check a previously recovered dense-table case so the new heuristic does not reopen an old regression
- distinguish benchmark wins from cosmetic residual defects such as left-edge character clipping inside recovered cells

Wins on one PDF are useful, but they do not justify turning a heuristic into a global default without broader validation.

## Limitations

- This skill routes and validates conversion work; it does not guarantee that `opendataloader-pdf`, OCR tools, or PDF utilities are installed in every environment.
- Complex PDFs can still require manual structural repair after the best route succeeds.
- OCR quality, source scan quality, and malformed PDF internals can limit fidelity no matter which route is chosen.
- Visual fidelity is secondary to document fidelity, so exact page layout may not be preserved unless the user explicitly requests it.

## Delivery Checklist

Before finishing, make sure you can state:
- which `opendataloader-pdf` route was chosen
- whether a retry was needed
- whether cleanup or repair was applied
- which output file is the recommended final one
- any remaining limitations that still affect readability or fidelity

## Fidelity Rule

Distinguish between:

- `document fidelity`
  correct content, correct attachment, correct section structure

- `visual fidelity`
  preserving the original visual layout as closely as possible

Optimize first for document fidelity.

Do not sacrifice semantic correctness just to imitate the original page visually.

For most conversions, a structurally correct and readable output is better than a visually similar but semantically broken one.

## Recommended Final Answer Format

When reporting back, prefer saying:
- the chosen route
- whether a retry was needed
- whether cleanup or repair was applied
- the recommended output file
- the remaining limitations, if any

## Delivery Rule

Do not deliver raw extractor output without a cleanup and validation pass when fidelity matters.

If the document is complex, say which route was chosen and why.
