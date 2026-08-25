# html-docs.com API Reference

Base URL: `https://www.html-docs.com/api/v1`

## Authentication

- **Agent key**: `Authorization: Bearer hdk_…` — account-level, permanent docs
- **Doc token**: `x-doc-token: <token>` — per-document, returned on create
- **Agent name**: `x-agent-name: <name>` — optional, labels comments/versions

## Endpoints

### POST /api/v1/docs — Create and publish

Publish HTML or Markdown to a live URL at `/site/<slug>`.

**Headers:**
- `Content-Type: text/html` or `text/markdown` (required)
- `Authorization: Bearer hdk_…` (optional — makes it permanent)
- `X-Slug: custom-slug` (optional — choose your URL)
- `x-agent-name: Claude Code` (optional — attribution)

**Query params:**
- `?slug=custom-slug` — alternative to X-Slug header
- `?title=My Page` — alternative to inferring from HTML

**Response (201):**
```json
{
  "id": "uuid",
  "url": "https://www.html-docs.com/site/<slug>",
  "slug": "<slug>",
  "editUrl": "https://www.html-docs.com/s/<code>?present=1",
  "token": "<token>",
  "revision": 42,
  "region_sync_engine": "yjs"
}
```

The response also carries `ETag: "42"`. Static HTML documents use the
compatibility-safe Yjs region transport when available. Script-rendered apps,
rich HTML regions, tables, embeds, and custom visuals remain on the canonical
HTML-region persistence path automatically.

### GET /api/v1/docs/:id — Read a document

Returns title, html_content (with region placeholders), regions array,
`editor_engine`, `revision`, and `region_sync_engine`. The numeric revision is
also returned as an `ETag` response header. Use the editor endpoint below for
agent edits; it exposes the live state of both document engines in one shape.

### GET /api/v1/docs/:id/editor — Read live semantic editor state

For a Notion/imported-HTML (`regions`) document:

```json
{
  "editor_engine": "regions",
  "blocks": [
    {
      "position": 0,
      "region_key": "region-a1",
      "type": "text",
      "tag": "p",
      "content": "Vibe: <em>relaxed</em>",
      "atomic": false,
      "style": {
        "textAlign": null,
        "indentPx": 0,
        "lineHeight": null,
        "color": null,
        "backgroundColor": null
      }
    }
  ],
  "offset_unit": "visible UTF-16 characters inside block.content"
}
```

Character ranges address the decoded visible text, not HTML source bytes.
`<em>Maui</em>` therefore occupies four characters. Exclude text inside
`script`, `style`, and `template`; count `<br>` as one newline.

For a Google Docs-style (`structured`) document:

```json
{
  "editor_engine": "structured",
  "content": { "type": "doc", "content": [] },
  "theme": { "pageMode": "paged" },
  "node_checks": [
    {
      "nodeId": "node-a1",
      "type": "paragraph",
      "text": "Vibe: relaxed",
      "expectedTextHash": "sha256…",
      "expectedAttributes": { "id": "node-a1", "textAlign": null }
    }
  ]
}
```

The objects in `node_checks` can be sent unchanged in `target_checks`.

### POST /api/v1/docs/:id/editor/commands — Precise agent editing

Applies 1–50 commands through the same persistence and collaboration paths as
the human editor. Every accepted batch first creates a forced recovery version.
Open editors receive changes without a page refresh. A stale target returns
`409` with conflicts; read `/editor` again and replan.

Format one exact range in a region document:

```json
{
  "commands": [
    {
      "type": "set_marks",
      "regionKey": "region-a1",
      "from": 6,
      "to": 13,
      "expectedText": "relaxed",
      "add": [{ "type": "bold" }]
    }
  ]
}
```

Region commands are:

- `set_marks`: exact `regionKey`, `from`, `to`, optional `expectedText`,
  optional `add`, and optional `remove`.
- `replace_text`: exact range plus `text`; use `from == to` for insertion.
- `set_block_type`: `text`, `h1`, `h2`, `h3`, `bullet`, `numbered`, `quote`,
  `callout`, `todo`, or `code`.
- `set_block_style`: bounded wrapper formatting using `textAlign`
  (`left|center|right|justify|null`), `indentPx` (`0–400|null`), `lineHeight`
  (`1|1.15|1.5|2|null`), and six-digit hex `color` or `backgroundColor`.
  Null removes a property. This is the same persisted path used by the human
  alignment, indentation, and line-spacing toolbar controls.

Both engines support `bold`, `italic`, `underline`, `strike`, `code`, `link`,
`highlight`, and `textStyle`. A link uses `attrs.href`; highlight uses
`attrs.color`; `textStyle` accepts bounded `color`, `backgroundColor`,
`fontFamily`, and `fontSize`. Structured text style also accepts `lineHeight`
and links may use `target: "_blank"`. Unsafe protocols and invalid styles are
rejected.

Format one exact node-relative range in a structured document:

```json
{
  "target_checks": [
    {
      "nodeId": "node-a1",
      "expectedTextHash": "sha256…",
      "expectedAttributes": { "id": "node-a1", "textAlign": null }
    }
  ],
  "commands": [
    {
      "type": "set_marks",
      "nodeId": "node-a1",
      "from": 6,
      "to": 13,
      "add": [
        { "type": "highlight", "attrs": { "color": "#fef08a" } }
      ]
    }
  ]
}
```

Structured commands also include `replace_text`, `insert_nodes`,
`delete_nodes`, `move_node`, `set_node_type`, `set_node_attributes`, and
`set_document_theme`. They also support an explicit `replace_document` command
whose `content` is a complete structured `doc` JSON object and whose optional
`theme` is applied with it. `replace_document` must be the only command in its
batch. Use it only for an explicit whole-document request; acceptance creates a
forced recovery version and the complete replacement is one collaborative undo
event.

Use block/node types for hierarchy and marks only for
character-level formatting. Prefer one title, consistent heading levels,
predictable labels, short paragraphs or lists, and a brief final Notes section.
Do not simulate layout with spaces, tabs, or empty paragraphs.

### POST /api/v1/docs/:id/editor/visuals — Design-system visual

Insert one deterministic visual after a real region key or structured node ID.
The same schema renders in both editors, all supplied strings are escaped, and
the server creates a recovery version before committing through the active
collaboration backend.

```json
{
  "anchor_id": "region-a1",
  "spec": {
    "kind": "flow",
    "title": "Review path",
    "eyebrow": "Decision workflow",
    "summary": "Every change has a visible owner and recovery path.",
    "tone": "forest",
    "items": [
      { "title": "Draft", "detail": "Create semantic blocks." },
      { "title": "Review", "detail": "Comment on exact passages." },
      { "title": "Decide", "detail": "Accept or restore." }
    ],
    "note": "Arrows indicate sequence, not system boundaries."
  }
}
```

`kind` is `callout`, `metrics`, `flow`, `timeline`, `comparison`, or
`matrix`. Tones are `ink`, `ocean`, `forest`, `amber`, `plum`, and `rose`.
Metrics use `items[].label/value/detail`; comparison additionally supports
`left` (strength) and `right` (trade-off). A matrix uses `columns` plus
`rows: [{ "label": "...", "values": ["..."] }]`.

### POST /api/v1/docs/:id/videos — Generate and embed video

Requires an account agent key and document ownership; doc tokens are not
accepted because generation consumes model and rendering resources.

Body:

```json
{
  "prompt": "Animate the three key ideas",
  "title": "Optional title",
  "after_region_key": "region-optional",
  "aspect_ratio": "landscape",
  "duration_seconds": 8,
  "quality": "standard"
}
```

`aspect_ratio` is `landscape`, `portrait`, or `square`; duration is 3–15
seconds; quality is `draft`, `standard`, or `high`. Returns the MP4 and poster
URLs, composition/render IDs, inserted region key, and validation report.

### PUT /api/v1/docs/:id — Replace content

Full content replacement. Prior state is snapshotted to version history.

Send the ETag from the latest GET as `If-Match`; a concurrent human or agent
edit returns `412 revision_conflict` instead of being overwritten:

```bash
curl -X PUT https://www.html-docs.com/api/v1/docs/<id> \
  -H 'Authorization: Bearer hdk_…' \
  -H 'Content-Type: text/html' \
  -H 'If-Match: "42"' \
  --data-binary @page.html
```

Give important authored blocks stable IDs so comments stay attached through
whole-document updates:

```html
<h2 data-hd-block-id="overview">Overview</h2>
<p data-hd-block-id="overview-summary">...</p>
```

`data-editable-region="region-…"` values returned by GET are also preserved.
Prefer region/block PATCH endpoints when changing only part of a reviewed doc.

### GET /api/v1/docs/:id/blocks — List ordered blocks

Returns every editable block in document order:

```json
{
  "blocks": [
    {
      "position": 0,
      "region_key": "region-abc123",
      "type": "h2",
      "tag": "h2",
      "content": "Overview",
      "atomic": false
    }
  ],
  "updated_at": "2026-07-26T03:00:00.000Z"
}
```

### POST /api/v1/docs/:id/blocks — Insert a block

Uses the same structural mutation engine as the human editor. Insert an
atomic HTML/SVG visual after an existing block:

```json
{
  "after_region_key": "region-abc123",
  "type": "html",
  "content": "<svg viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" /></svg>"
}
```

Other supported types are `text`, `h1`, `h2`, `h3`, `bullet`, `numbered`,
`quote`, `divider`, `callout`, `todo`, `code`, `image`, `video`, `embed`, and
`table`. Use `media_url` for image, video, and embed blocks. HTML/SVG blocks
preserve nested markup, SVG definitions, and inline styling while removing
scripts, event handlers, unsafe URLs, frames, and nested editor markers.

### GET /api/v1/docs/:id/blocks/:key — Read one block

### PATCH /api/v1/docs/:id/blocks/:key — Edit, convert, or move

Send exactly one operation:

```json
{ "content": "Replace this block's content" }
{ "type": "callout", "content": "<strong>Important</strong>" }
{ "move": "up" }
{ "target_region_key": "region-def456", "position": "after" }
```

For an existing HTML/SVG block, `{ "content": "<svg>…</svg>" }` runs through
the HTML-block sanitizer and updates the live document atomically.

### DELETE /api/v1/docs/:id/blocks/:key — Delete one block

Every block write snapshots the prior document version and is attributed
using the API key/device identity and optional `x-agent-name`. Region content
and structural shell changes publish through the collaboration backend, so
open editors see agent edits without manually refreshing.

### PATCH /api/v1/docs/:id/regions/:key — Edit one region

Precise content edit that preserves comment anchors. HTML/SVG block content
is sanitized automatically. Prefer the `/blocks` endpoints when adding,
moving, converting, or deleting structure.

### GET /api/v1/docs/:id/comments — List comments

Query: `?resolved=true|false|all`, `?region_key=<key>`

### POST /api/v1/docs/:id/comments — Add a comment

Region body:

```json
{ "content": "...", "region_key": "region-a1", "selected_text": "relaxed" }
```

Structured body:

```json
{
  "content": "Can we make this more specific?",
  "structured_node_id": "node-a1",
  "selected_text": "relaxed",
  "from": 6,
  "to": 13
}
```

Structured `from`/`to` are node-relative UTF-16 offsets. Replies use
`parent_id`. Agent comments remain durable, attributed, and visible in the
normal comment panel.

### POST /api/v1/docs/:id/comments/:id/resolve — Resolve thread

Body: `{ "resolved": true }` (or omit body to resolve)

### GET /api/v1/docs/:id/versions — List versions

### POST /api/v1/docs/:id/versions — Capture a version

Body: `{ "name": "Draft v2" }` (optional)

### POST /api/v1/docs/:id/versions/:id/restore — Restore a version

### GET /api/v1/docs/:id/activity — Activity feed

Query: `?since=<ISO>`, `?type=comment.created,version.created`, `?limit=50`

### POST /api/v1/webhooks — Register a webhook

Body: `{ "url": "https://...", "event_types": ["comment.created"], "document_id": "..." }`

## Rate Limits

- 600 reads / 60 writes per 60-second window per credential
- Max body: 2 MB
- 429 responses include `Retry-After` header

## Error Format

```json
{ "error": "Description of what went wrong." }
```

Status codes: 200/201/204 (success), 400, 401, 403, 404, 409, 412, 413, 429,
500. `409` means an editor command target changed; `412` means a whole-document
ETag changed.
