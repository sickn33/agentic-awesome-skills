---
name: html-docs
description: "Create source-grounded HTML documents, narrated videos, or courses, then publish and review them through HTML Docs. Use for visual explanations, artifact publishing, comments, and iterative updates."
category: content
risk: critical
source: https://github.com/raunaqbn/html-docs-skill/tree/main/html-docs
source_repo: raunaqbn/html-docs-skill
source_type: community
date_added: "2026-08-25"
author: Raunaq Naidu
tags: [documentation, html, publishing, video, courses, mcp]
tools: [claude, codex, cursor, gemini]
license: MIT
license_source: https://github.com/raunaqbn/html-docs-skill/blob/main/LICENSE
---

# HTML Docs

Create the clearest useful explanation of the user’s source. Use the active
Codex or Claude session to research, write, design, and author the artifacts.
Use the local CLI only to normalize sources, compile, validate, render,
synchronize, and publish. Never invoke a hidden authoring model.

## When to Use

- Use when a user wants source material turned into a polished visual document,
  narrated explainer, combined document and video, or structured course.
- Use when an existing HTML Docs page must be read, edited, reviewed, commented
  on, versioned, or updated without overwriting newer human work.
- Use when a coding agent needs to publish HTML at a stable URL for collaborative
  review or expose the workflow through CLI, API, or MCP tools.
- Do not use for a quick factual answer, a throwaway note, or publication that
  the user has not explicitly authorized.

## Examples

- `Use HTML Docs to turn this repository into a private onboarding course for new engineers.`
- `Create a cited visual document and narrated explainer for this research paper.`
- `Read the comments on this html-docs.com page, apply the requested edits, and verify the new version.`

## Choose the output

Resolve an explicit user request first. Otherwise use `auto`:

| Mode | Choose when | Deliver |
|---|---|---|
| `document` | Detail, scanning, reference, data, or collaboration matters | Designed responsive HTML document |
| `video` | Motion, sequence, mechanism, or narration is the main value | Captioned deterministic HTML video |
| `document-video` | A focused subject benefits from both explanation and reference | Rich document with embedded live video |
| `course` | The source has several learning outcomes or the user asks for training | Learning site with modules, lesson pages, videos, checks, and progress |
| `auto` | The user leaves the format open | `document-video` for one focused outcome; `course` for several cumulative outcomes |

State the chosen mode in one short working update, then continue. Do not stop
for storyboard or voice approval unless the user requests an approval gate.
Finish automatic work as a private preview. Publish publicly or unlisted only
after explicit instruction.

## Start from any source

Classify the input before authoring:

- HTML Docs document or folder: read it through the API.
- Local document, PDF, HTML, Markdown, or text: recover its structure and facts.
- Directory or Git repository: respect ignore rules; exclude credentials,
  dependencies, build output, binaries, and VCS internals.
- URL: capture the requested page. For a site-level request, crawl same-origin
  links to depth two and at most 100 pages unless the user sets another bound.
- Research topic: perform deep research with primary and authoritative sources.
  Freeze a source manifest before writing.
- Pasted material: preserve it as a source record rather than treating it as
  unsupported background knowledge.

Read [references/source-grounding.md](references/source-grounding.md) for source
normalization, research, privacy, evidence IDs, and refresh rules.

## Universal production loop

1. **Define mastery.** Identify the audience, prerequisites, confusion gap,
   desired capability, thesis, mechanism, evidence, and limits.
2. **Ground claims.** Create stable source/evidence records. Every substantive
   claim and knowledge-check answer must cite evidence.
3. **Design the explanation.** Build a cumulative teaching spine. Do not follow
   source order when another sequence teaches better.
4. **Specify the learning experience.** For a course, define the learner
   contract, demonstrated mastery states, assessment seams, dependencies, and
   vertical production slices before authoring.
5. **Choose a visual language.** Set typography, dominant color, contrast,
   diagram grammar, layout rhythm, and one memorable visual signature.
6. **Author the selected outputs.** Derive the page and video from the same
   lesson/evidence model without duplicating them: the page is the reference;
   the video teaches the mental model.
7. **Audit.** Check facts, citations, readability, responsive behavior,
   accessibility, visual quality, narration coverage, cue ownership, captions,
   deterministic seeking, and contact sheets.
8. **Refine until clean.** Fix every failing audit and every visibly weak scene.
9. **Publish privately.** Return the private document/course link and the stable
   video player link. Mention raw MP4 only as a fallback or requested download.

## Document workflow

Read [references/design-system.md](references/design-system.md) before any
substantial document. Use [references/anti-slop.md](references/anti-slop.md) as
the final visual linter. Use inline CSS and inline SVG; freeze assets locally.

Publish:

```bash
npx @html-docs/cli publish page.html
npx @html-docs/cli publish ./site --slug my-site
```

Authenticate owned work once:

```bash
npx @html-docs/cli auth
```

Read [references/api.md](references/api.md) when editing regions, commenting,
versioning, or using document APIs. Read [references/pdf.md](references/pdf.md)
for PDF import or export.

For documents that will be reviewed or updated later, give each meaningful
HTML block a stable `data-hd-block-id`. Use targeted block/region PATCH calls
for local changes. Before a whole-document PUT, GET the document and send its
ETag in `If-Match`; never overwrite a newer human review revision blindly.

### Agent editing loop

For an existing HTML Docs document, treat `GET /api/v1/docs/:id/editor` as the
live semantic source of truth. Apply the smallest precise batch through
`POST /api/v1/docs/:id/editor/commands`, then read the editor state again to
verify it. Use visible UTF-16 offsets and `expectedText` for region selections;
round-trip `node_checks` as `target_checks` for structured documents. A `409`
is a request to reread and replan, never permission to overwrite.

Use `set_marks` to format only the selected phrase, semantic block/node types
for hierarchy, bounded block styles for alignment and spacing, and comments for
review feedback. Prefer one title, consistent heading levels, predictable
labels, short paragraphs or lists, and a final Notes section. Every agent
command batch creates a recovery version and publishes through the
collaboration backend, so do not replace the whole document for a local
formatting change.

For a flow, timeline, callout, metric strip, comparison, or decision matrix,
send a semantic visual specification to
`POST /api/v1/docs/:id/editor/visuals`; do not improvise a large HTML/SVG block.
The endpoint uses the same deterministic renderer as Docsmith in both editor
engines and creates a recovery version first.

When the user explicitly asks for a complete transformation, read the entire
editor payload before writing. For structured documents, send one isolated
`replace_document` command with the complete semantic `doc` JSON. For region
documents, use a conditional whole-document `PUT` with the latest ETag. Both
paths must preserve the pre-change version; a `409` or `412` means reread and
replan, not force overwrite.

## Video workflow

Read both:

- [references/html-video.md](references/html-video.md) for project format,
  narration, timing, captions, compilation, rendering, and publication.
- [references/video-scene-craft.md](references/video-scene-craft.md) for
  explanatory scene grammar, layout rhythm, cue choreography, and visual review.

For narrated work, render captions in the composition itself as a karaoke rail:
keep the phrase readable while the exact word currently spoken receives the
design-matched highlight. WebVTT/SRT metadata alone is not a finished caption
system.

For a narrated explainer:

```bash
<skill-root>/scripts/video.sh build ./video-project
<skill-root>/scripts/video.sh check ./video-project
<skill-root>/scripts/video.sh audit ./video-project
<skill-root>/scripts/video.sh render ./video-project --output ./final.mp4
```

For a document-linked video:

```bash
<skill-root>/scripts/video.sh publish ./video-project \
  --document <document-id> \
  --prompt "Teach the central mechanism clearly" \
  --provider codex
```

For a standalone video, omit `--document` after the standalone video API is
available in the installed CLI release. Always prefer the stable `/v/<code>`
player link over the raw storage URL.

## Course workflow

Read all three:

- [references/html-course.md](references/html-course.md) for portable course
  artifacts, paired pages/videos, checks, publication, and refresh.
- [references/learning-design.md](references/learning-design.md) for the learner
  contract, mastery evidence, retrieval, feedback, adaptation, and reusable
  teaching components.
- [references/course-specification.md](references/course-specification.md) for
  decision-rich course specs, vertical production slices, dependencies,
  validation seams, and large-project uncertainty.

Then:

```bash
<skill-root>/scripts/video.sh course init <source> \
  --output ./course-project --title "Course title"
<skill-root>/scripts/video.sh course build ./course-project
<skill-root>/scripts/video.sh course audit ./course-project
<skill-root>/scripts/video.sh course preview ./course-project
<skill-root>/scripts/video.sh course publish ./course-project
```

The scaffold is not the course. Replace it with a real evidence graph, course
specification, learner model, course map, vertical lesson slices, lesson pages,
locked narration, cue-directed storyboards, semantic scene modules, diagnostic
checks, captions, and source dependencies before building.

For changed sources:

```bash
<skill-root>/scripts/video.sh course diff ./course-project
<skill-root>/scripts/video.sh course refresh ./course-project
```

Regenerate only affected lessons, preserve surviving semantic overrides, audit
again, and create a new private version. Never replace the published version
automatically.

## Guided Studio

Use Studio after a private version exists:

```bash
<skill-root>/scripts/video.sh studio context <video-id>
<skill-root>/scripts/video.sh studio requests <video-id>
```

Treat a Studio selection as precise source context: composition version, scene,
timestamp, semantic element ID, bounds, text, evidence, and surrounding cue.
Apply direct layout/text/color changes as structured overrides. Apply narration,
voice, evidence, or generative scene changes in the local project, audit, then
push a new immutable version.

## Publication and authentication

- Anonymous documents can be published with `curl` or the CLI.
- Owned videos, courses, edits, and durable publication require
  `HTMLDOCS_API_KEY` or credentials saved by `npx @html-docs/cli auth`.
- Keep provider keys local. Never upload TTS keys or put them in a project
  bundle.
- Keep source projects and diagnostics private. Only published runtime bundles,
  posters, and media should be public.

Machine-readable API:

```bash
curl https://www.html-docs.com/api/v1
```

Human documentation:

- https://www.html-docs.com/agents
- https://www.html-docs.com/developers
- https://www.html-docs.com/showcase

## Limitations

- Hosted editing, video, course, and durable publication operations require the
  relevant HTML Docs service capability and authorization.
- Source quality bounds output quality; ambiguous, inaccessible, or unsupported
  inputs must be surfaced rather than filled with invented claims.
- A successful local build does not replace factual, accessibility, responsive,
  visual, and publication review.

## Security & Safety Notes

- Keep provider keys and HTML Docs credentials local. Never place them in source
  bundles, published pages, shell history, logs, or examples.
- Treat `publish_result.token` values and anonymous edit URLs as credentials;
  redact them from shared terminals, logs, screenshots, and reports.
- Treat public or unlisted publication as an external side effect that requires
  explicit user instruction. Automatic production finishes as a private preview.
- Preserve concurrent human work with targeted edits, current editor state,
  ETags, and `If-Match`; a `409` or `412` requires rereading and replanning.
- Exclude credentials, ignored files, dependency trees, build output, binaries,
  and VCS internals when a directory or repository is used as source material.
