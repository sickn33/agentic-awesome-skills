# PDF — turn a PDF into a beautiful doc, and export a clean PDF back

Two directions, one skill:

1. **PDF in → designed doc.** Take a source PDF and re-author it as a genuinely
   *designed* HTML doc (then publish it, and optionally export a clean PDF).
2. **Doc → PDF out.** Export any hosted doc to a well-laid-out PDF that paginates
   properly — not a screenshot, a real document.

This is **not** a "print to PDF" button. The goal is a doc that looks
*intentionally typeset*, on screen and on the page. Read
[design-system.md](design-system.md) and [anti-slop.md](anti-slop.md) first —
everything here sits on top of them.

---

## Part 1 — PDF in → a designed doc

### The wrong way (don't do this)
Dumping the PDF's text into `<p>` tags, or OCR-flattening each page into an
image, gives you a *reflow*, not a *design*. It carries over the source's bad
typography and none of its meaning-structure. Skip it.

### The right way: read → understand → re-author
You (Claude Code) can read a PDF directly. Use that. The job is to understand
the document's **structure and intent**, then rebuild it as a designed doc.

1. **Read the source.** Pull the full text, the heading hierarchy, tables,
   figures, and the reading order. Note what *kind* of document it is — report,
   contract, paper, deck, invoice, résumé, manual. That choice picks an
   archetype (design-system.md).

2. **Recover the structure, not just the words.** A heading that was big-bold in
   the PDF is an `<h2>`, not a fat `<p>`. A two-column comparison is a real
   table or grid. A boxed aside is a callout. Reconstruct the *semantics* the
   PDF only expressed visually.

3. **Extract real assets.** Diagrams and charts that were bitmap images in the
   PDF should be re-authored as inline SVG / styled HTML where feasible (sharp
   at any zoom, recolorable, accessible). Keep genuine photos as images. Never
   leave a wall of low-res page screenshots.

4. **Author from the creative brief.** Don't mirror the source's look — design
   *for the content*. Pick the archetype, one dominant hue, a real type scale,
   a signature. Preserve every fact, number, link, and table from the source;
   invent nothing.

5. **Run the linter.** Before publishing, pass the draft through
   [anti-slop.md](anti-slop.md). A re-authored PDF should look better than the
   original, not like a default template.

6. **Publish** (see the main skill): `POST /api/v1/docs` or
   `npx @html-docs/cli publish doc.html`.

### When the source is faithful-reproduction territory
Some PDFs (signed contracts, regulatory filings, anything where exact layout is
legally meaningful) should be reproduced faithfully rather than redesigned. In
that case preserve structure and content precisely and keep styling minimal and
neutral — fidelity over flair. Use judgment: redesign explainers and reports;
reproduce documents of record.

---

## Part 2 — Doc → PDF out

### The key idea: author a *print edition*, don't just print the screen doc

The single biggest lever on PDF quality is this: **a great PDF is a second
rendition of the document, authored for the page — not the on-screen HTML run
through a printer.** The screen edition and the print edition want different
things, and forcing one to be both gives you a mediocre version of each.

| | Screen edition | Print edition |
|---|---|---|
| Hero | full-bleed, scrolls | cover/title block ≈ one page |
| Type | screen scale, tints | print scale, ink-on-paper contrast |
| Flow | one continuous column | paginated; chapters start fresh |
| Motion | entrances, hover | none |
| Width | viewport-driven | fitted to the page box |
| Chrome | nav, scroll-spy | dropped |

So the quality workflow is: take the doc's content and **transform it into a
print-oriented HTML rendition**, then export *that*. Concretely:

1. **Cover/title block** sized to roughly one page — not a giant scroll hero
   that wastes the first printed sheet.
2. **Print type scale** — slightly smaller body, tighter leading, contrast
   tuned for paper (deep ink on near-white) rather than screen tints/glows.
3. **Deliberate pagination** — major sections / chapters begin on a fresh page
   via the break hooks below; a short TOC up front if the doc is long.
4. **Figures & tables fitted to the page box** — `max-width: 100%`, repeating
   table headers, no element wider than the printable area.
5. **Strip screen-only behavior** — motion, hover states, sticky nav, anything
   that only makes sense while scrolling.

Keep both renditions from one source of truth: the screen edition stays live and
interactive; the print edition is what you hand to the `/pdf` endpoint. This is
also exactly the HTML you'd feed a Paged Media engine (Paged.js, WeasyPrint,
Prince) if you want running headers and TOC leaders later.

### The export endpoint

Every hosted doc exports to PDF via one endpoint, rendered with headless
Chromium for full visual fidelity (fonts, colors, gradients, inline SVG,
backgrounds all preserved exactly as on screen):

    GET /api/v1/docs/:id/pdf

Authenticated like every v1 endpoint (doc token or API key). Options:

| Param | Values | Effect |
|---|---|---|
| `format` | `letter` (default), `a4`, `legal` | page size |
| `landscape` | `1` | landscape orientation |
| `html` | `1` | return **print-ready HTML** instead of PDF bytes |

Examples:

    # Letter PDF
    curl 'https://www.html-docs.com/api/v1/docs/<id>/pdf' \
      -H 'x-doc-token: <token>' -o report.pdf

    # A4, landscape
    curl 'https://www.html-docs.com/api/v1/docs/<id>/pdf?format=a4&landscape=1' \
      -H 'Authorization: Bearer <key>' -o report.pdf

### Run your own PDF engine (`?html=1`)
Chromium has excellent fidelity but only partial CSS Paged Media support (no
running headers from content, no TOC leaders, limited named pages). If you want
book-grade output, fetch the **print-ready HTML** and run a dedicated engine:

    curl 'https://www.html-docs.com/api/v1/docs/<id>/pdf?html=1' \
      -H 'x-doc-token: <token>' -o print.html
    # then, with a Paged Media engine you control:
    weasyprint print.html out.pdf      # open-source, strong paged media, no JS
    prince print.html -o out.pdf       # commercial, best-in-class paged media

The returned HTML already has the print stylesheet injected (see below), so
these engines pick up the same break discipline.

---

## What "well laid out" means — and what the export already does for you

The export injects a print stylesheet so the PDF paginates like a document, not
a long screenshot. You get these **for free** on export:

- **No stranded lines** — `orphans`/`widows` keep at least 3 lines together.
- **Headings stay with their content** — a heading never sits alone at the foot
  of a page (`break-after: avoid-page`).
- **Atomic blocks don't split** — figures, images, tables, `pre`, blockquotes,
  cards, callouts, and timeline items use `break-inside: avoid`.
- **Tables repeat their header** on each page (`thead { display:
  table-header-group }`) and rows stay whole.
- **Code wraps** instead of clipping or running off the page edge.
- **Backgrounds and colors print** (`print-color-adjust: exact`).
- **On-screen-only chrome is hidden** (sidebars, scroll-spy, slide nav).
- **Entrance animations are neutralized** so nothing renders mid-fade.
- **Margins come from the engine** (uniform page gutter), not doubled in CSS.

### Authoring hooks you can use
When you author a doc and want explicit control over pagination, these class /
data-attribute hooks are honored on export:

| Hook | Effect |
|---|---|
| `class="page-break-before"` / `data-page-break="before"` | start a new page before this element |
| `class="page-break-after"` / `data-page-break="after"` | break the page after this element |
| `class="page-break-avoid"` / `data-page-break="avoid"` | keep this element whole on one page |
| `class="no-print"` / `class="screen-only"` / `data-print-hide` | hide this element in the PDF |
| `data-keep-together` | never split this block across pages |

Use them sparingly and deliberately — let the defaults do most of the work, and
reach for an explicit break only where the content genuinely demands it (e.g.
start each chapter or each major section on a fresh page).

### Print-friendly authoring tips
- Prefer relative widths (`max-width: 100%`) so content fits any page format.
- Keep hero/cover sections to roughly one page; a giant full-bleed hero wastes
  the first printed page.
- Color-code consistently and include legends — color survives to PDF.
- Test both `letter` and `a4` if the audience is international.
- For data tables longer than a page, rely on the repeating `thead` rather than
  forcing breaks.

---

## Quick recipes

**"Make this PDF into a nice web doc":** read the PDF → recover structure →
pick an archetype → author per design-system.md → `audit` against anti-slop.md →
publish. Offer the live URL; export a PDF too if they want the file back.

**"Export my doc as a polished PDF":** `GET /api/v1/docs/:id/pdf?format=…`. If
they need running headers / TOC leaders / book-grade paging, use `?html=1` and
run WeasyPrint or Prince on the returned HTML.

**"Round-trip a report":** import PDF → redesign → publish → export PDF. The
output is a designed document in both forms, not a reflow of the original.
