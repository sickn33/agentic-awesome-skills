# OOXML Parsing Reference

A `.pptx` is an Open Packaging Conventions ZIP archive. Inspect it read-only
by resolving its relationship graph; do not assume sequential filenames or
copy package parts into a generated deck.

## Package-Part Map

| Need | Parts |
| --- | --- |
| Slide order | `ppt/presentation.xml`, `ppt/_rels/presentation.xml.rels` |
| Slide text and shapes | Slide parts resolved from presentation relationships (commonly `ppt/slides/slideN.xml`) |
| Layout, notes, images, charts | The slide's relationship part (commonly `ppt/slides/_rels/slideN.xml.rels`) |
| Template geometry | `ppt/slideLayouts/`, `ppt/slideMasters/` |
| Colors and fonts | Theme parts resolved from presentation/master relationships (commonly under `ppt/theme/`) |
| Notes and comments | `ppt/notesSlides/`, `ppt/comments/` |
| Media and embeddings | `ppt/media/`, `ppt/embeddings/` |

## Relationship Resolution

1. Start with `ppt/presentation.xml`; use its slide ID list and
   `ppt/_rels/presentation.xml.rels` to resolve slides in presentation order.
2. For every part that needs linked content, resolve targets from that part's
   `.rels` file relative to the owning part rather than from a hard-coded path.
3. Retain the relationship ID, type, resolved target, and any unreadable or
   missing target in the analysis result.
4. Treat raw element ordering as evidence for rendering, not as a reason to
   reproduce a source slide or its package XML.

## Namespaces

- PresentationML: `http://schemas.openxmlformats.org/presentationml/2006/main`
- DrawingML: `http://schemas.openxmlformats.org/drawingml/2006/main`
- Office relationships: `http://schemas.openxmlformats.org/officeDocument/2006/relationships`
- Package relationships: `http://schemas.openxmlformats.org/package/2006/relationships`

## Analysis Output Guidance

For a read-only extraction, retain the slide number, resolved relationship
target, concatenated text, shape counts, notes, relationship types, and
OOXML-only markers such as animations, comments, transitions, unsupported
shapes, and non-modeled formatting. For design context, retain theme
color/font tokens without inventing an RGB value when a scheme or system color
cannot be fully resolved.

Record the input deck path, inspected parts, relationship-resolution errors,
and unreadable XML in the analysis manifest. Keep the result limited to the
evidence needed for the requested analysis.

## Secure, Read-Only Handling

- Treat a source deck as untrusted input. Reject path traversal, symlinks,
  oversized members, and compressed archive bombs before reading ZIP members.
- Parse XML with a secure parser. Disable DTD loading, entity expansion, and
  network access.
- Preserve `xml:space="preserve"` semantics when collecting text.
- Do not modify the source archive, overwrite it, or blindly copy XML, media,
  fonts, images, or embedded files into a new deck.