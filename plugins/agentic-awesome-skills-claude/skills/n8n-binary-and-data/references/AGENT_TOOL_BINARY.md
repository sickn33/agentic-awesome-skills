# Agent Tools and Binary

The hard wall: an AI Agent and its tools talk to each other in JSON. Binary doesn't fit through that pipe in either direction, and it catches people twice.

1. **Inbound** — a user uploads a file. The agent can *see* an image via vision, but tool calls don't carry the file.
2. **Outbound** — a tool generates a file. Its result back to the agent is JSON, so it can't return raw bytes.

The workaround has the same shape both ways: **stage the bytes in storage, pass a key or URL through the JSON boundary, fetch on the other side.**

## Contents

- [Why the boundary exists](#why-the-boundary-exists)
- [Inbound: an uploaded file into a tool](#inbound-an-uploaded-file-into-a-tool)
- [The two pieces of plumbing that look optional](#the-two-pieces-of-plumbing-that-look-optional)
- [What the system prompt and the tool argument look like](#what-the-system-prompt-and-the-tool-argument-look-like)
- [passthroughBinaryImages](#passthroughbinaryimages)
- [Outbound: a tool that produces a file](#outbound-a-tool-that-produces-a-file)
- [Storage choices](#storage-choices)
- [Hashing, cleanup, long-running tools](#hashing-cleanup-long-running-tools)
- [Surface-specific seams](#surface-specific-seams)
- [Common mistakes](#common-mistakes)

---

## Why the boundary exists

A tool call is a function call the LLM makes by emitting JSON arguments; the result comes back as a JSON observation. Tool parameters are filled by `$fromAI()`, which only produces strings, numbers, booleans, and objects — never file bytes. And a tool's return is a string/JSON the model reads as text. Base64-stuffing a 2 MB image into a JSON field would bloat every tool call and the agent's context window, and some runtimes reject oversized observations outright. So in practice: **binary never crosses the boundary.**

---

## Inbound: an uploaded file into a tool

The user pastes an image into chat. The chat trigger exposes a `files[]` array. If the agent only needs to *look* at the image, `passthroughBinaryImages: true` on the agent handles that (vision). But the moment a **tool** must operate on the file — OCR, image edit, document parse — the tool can't receive it directly. You pre-stage it.

```
[Chat Trigger]
   │ files[]
   ▼
[IF: files empty?]
   ├── empty ────────────────────────────────────────────► [AI Agent]
   └── not empty:
         [Split Out files]
            ↓
         [Crypto: hash → storage key]
            ↓
         [HTTP Request / S3 / Drive: upload to PRIVATE storage by key]
            ↓
         [Merge: combineByPosition]  ← synchronization barrier, see below
            ↓
         [AI Agent]   ← executeOnce: true; system prompt is told the keys
              │ tool call:  imageKey = "sess12-abc123.png"
              ▼
         [Call n8n Workflow Tool → sub-workflow]
              ↓
            [Download from storage by key]
              ↓
            [Operate on bytes: edit / OCR / parse]
              ↓
            [Upload result, return JSON { key, url }]
```

Building this with the community MCP server, the wiring goes in as `n8n_update_partial_workflow` operations — `addNode` for each step, `addConnection` to thread them, and `updateNode`/`patchNodeField` to set `executeOnce` and the system prompt. The agent's tool is a `Call n8n Workflow Tool` node pointed at the sub-workflow; the sub-workflow itself is a normal workflow that starts with an Execute Workflow Trigger.

> The Execute Workflow Trigger's input mode matters here. The default typed-input mode carries only named JSON fields and **drops `$binary`** at the boundary; for a sub-workflow that needs to receive binary directly, use the passthrough input mode. (When the sub-workflow downloads by key instead of receiving bytes, this is moot — which is exactly why the key pattern is cleaner.)

---

## The two pieces of plumbing that look optional

Both of these are silent-failure traps — leave them out and the workflow runs, then misbehaves.

**The Merge is a synchronization barrier, not decoration.** The chat trigger fans out to the IF branch and the upload branch in parallel. Without merging the upload branch back before the agent, the agent fires while uploads are still in flight. The system prompt's key template then renders against partial state, the model gets keys that don't exist in storage yet, and the tool's download 404s. The Merge forces the agent to wait for the upload to finish.

**`executeOnce: true` on the AI Agent node.** When files split out and merge back, the merged item count equals the file count. Without `executeOnce`, the agent runs once per file — N agent runs, N replies, N times the token cost — for what is one logical user message. Set it on the agent node:

```json
{ "executeOnce": true }
```

(Apply with `patchNodeField` on the agent node, or include it in the `updateNode` payload.)

---

## What the system prompt and the tool argument look like

The agent has to know which keys exist *for this turn*. Inject them into the system prompt, listing both the original name (human context for the model) and the storage key (what the tool needs):

```
## File Handling
Files passed in this turn:
{{ JSON.stringify($('Chat Trigger').first().json.files.map((f, i) => ({
    originalFileName: f.fileName,
    storageKey: $('Crypto').all()[i].json.hash + '.' + f.fileExtension
})), null, 2) }}

CRITICAL: Use EXACTLY the `storageKey` value above when calling a tool. Do not paraphrase or reconstruct it.
```

Two details earn their keep:

1. **Both names are listed.** The original (`photo.png`) tells the model what kind of file it is; the storage key is what the tool can actually resolve.
2. **The "use EXACTLY".** Without it, the model paraphrases — "the user's image", "photo.png" — and the tool can't find the file.

On the tool side, the storage-key parameter is bound with `$fromAI` and described so the model fills it correctly:

```
$fromAI('imageKey', 'Storage key of an existing uploaded image to operate on, taken verbatim from the system prompt (e.g. "sess12-abc123.png"). Leave empty to generate a new image. Do not invent or reconstruct keys.', 'string')
```

The description is the model's only guidance on the value's shape — match it to the storage backend the workflow actually uses, and name only that one shape (not a menu of possibilities).

**Generate vs edit in one tool.** If the tool serves both "make a new image" and "edit this one", branch inside the sub-workflow on whether `imageKey` is empty — empty means generate, present means download-then-edit. One tool with an internal IF is usually clearer for the model than two near-identical tools. If the model keeps misfiring on that discriminator, the viable alternative is two `Call n8n Workflow Tool` nodes pointing at the **same** sub-workflow with different parameter wiring (one hardcodes an empty key, the other lets the model fill it) — one sub-workflow, two front doors with sharply different descriptions.

---

## passthroughBinaryImages

Set `passthroughBinaryImages: true` on the agent when the model should be able to *see* uploaded images (multimodal vision). It adds the image to the LLM's prompt context.

Two limits to keep straight:

- **Image-only.** It does nothing for PDFs, audio, or video. For those, the model only knows what the system prompt tells it (name, type, storage key) and must call a tool to extract content. For PDFs, that means an OCR/parse tool.
- **It does not feed tools.** Tools still receive only their `$fromAI` parameters, regardless of this flag. Vision and tool access are separate channels:
  - `passthroughBinaryImages: true` → the model can *see and reason about* the image.
  - Pre-staged storage + key in the prompt → the model can ask a tool to *do something* with the file.

You usually want both at once.

---

## Outbound: a tool that produces a file

A tool generates a PDF, image, or document. Its result to the agent is JSON, so it returns a *reference*, not the bytes.

```
[Agent calls tool]
   ▼
[Sub-workflow]
   ↓ generate or transform binary
   ↓ (provider AI node: set options.binaryPropertyOutput so bytes land in the slot)
   [Upload to storage by key]
   ↓
   [Respond with JSON: { ok, key, url, mimeType, sizeBytes, expiresAt }]
   ▼
[Agent receives JSON — embeds the URL in its reply, or passes the key to another tool]
```

A useful return shape:

```json
{
  "ok": true,
  "key": "sess12-9f3c1a.png",
  "url": "https://storage.example.com/files/sess12-9f3c1a.png",
  "mimeType": "image/png",
  "sizeBytes": 184320,
  "expiresAt": "2026-06-25T12:00:00Z"
}
```

Then tell the agent how to present it, in the system prompt — and be explicit about images vs video, because the model will copy the image pattern onto video and produce a broken thumbnail:

```
## Display Protocol
Show generated images inline using markdown: ![alt text](url)
Share generated VIDEO as a plain link, NOT an embed: [title](url)
```

(The `![]()` markdown is the canvas chat trigger's syntax — production surfaces differ; see [Surface-specific seams](#surface-specific-seams).)

**When you don't need any of this:** if one node generates binary and another consumes it *in the same workflow* with no agent involved, just pass binary through normally — there's no boundary. And a plain webhook API that returns a file can use `Respond to Webhook` with binary in the body. The upload-and-return-key dance is specifically for the agent-calls-tool-and-tool-produces-a-file case.

---

## Storage choices

**Ask which service before building.** n8n has native nodes for many backends, and defaulting to S3 is presumptuous.

- **Object storage:** Amazon S3, Cloudflare R2, Google Cloud Storage, Azure Blob, Backblaze B2, Supabase Storage. Most expose S3-compatible APIs (the S3 node with the right endpoint, or HTTP Request with AWS auth) or ship a dedicated node. Keys, optional public buckets, signed URLs, lifecycle rules for TTL.
- **Drive-style:** Dropbox, Google Drive, OneDrive, Box. File IDs and share links instead of keys, folder permissions instead of bucket ACLs, no built-in TTL (cleanup is its own workflow).
- **Self-hosted / FTP / SFTP:** when the user has on-prem infrastructure.
- **Caller-supplied URL:** the agent's caller provides the storage location as input.

A common production split: a **private** bucket/folder for inbound user files, and a **public** (or signed-URL) bucket/folder for outbound results so the agent can return a fetchable URL. The choice changes credential setup, URL shape, and how the tool's `$fromAI` description should explain the key/URL format — don't pick on the user's behalf.

---

## Hashing, cleanup, long-running tools

**Hash strategy differs by direction:**

- **Inbound** files may be referenced repeatedly within a session, so use a stable key — re-uploading the same file lands at the same key and the agent's reference doesn't break. A session-and-filename composite hash works.
- **Outbound** artifacts are single-use, so use a fresh random key every time, or concurrent generations overwrite each other. Pattern: `<session-suffix>-<random-hex>.<ext>`.

Two `Crypto` nodes in one of these workflows is usually deliberate, not a copy-paste error — one for the inbound stable hash, one for the outbound unique suffix.

**Cleanup** keeps the bill down. Object storage has lifecycle rules (auto-delete after 7–30 days). Drive-style backends need a scheduled cleanup workflow. For precise control, track live keys in a Data Table (the `n8n_manage_datatable` surface — see **n8n-mcp-tools-expert**) and delete unreferenced files.

**Long-running tools** (video generation, large batches): agent tool calls have no agent-layer timeout — a sub-workflow tool returns whenever it returns and the agent waits. The one real timeout is on the **HTTP Request node** itself (default ~5 minutes). If the tool is an HTTP Request Tool calling a slow external API, bump `options.timeout` past the expected duration, or the HTTP call aborts mid-job while the work keeps running and the agent gets nothing. Error-branch these steps so a failed upload or a storage 404 surfaces instead of vanishing — see **n8n-error-handling**.

---

## Surface-specific seams

The examples above use the canvas Chat Trigger's conventions: `$('Chat Trigger').first().json.files[]` inbound, `![]()` markdown outbound. **These shapes are not universal.** Production surfaces (Slack, Discord, Microsoft Teams, Telegram, WhatsApp Business, custom webhooks) each differ on:

- **Inbound file event shape** — where the file lives in the trigger payload, and whether the file URL needs a bearer/bot token to download.
- **Outbound rendering** — markdown image, Block Kit image block, adaptive card, Discord embed, or a dedicated file-upload API that pushes bytes natively.

Before wiring an inbound or outbound binary path on a real surface, check the platform's official API docs and the n8n node docs for two things: the exact path to the file in the trigger event (and whether downloading it needs auth), and the exact shape the platform expects for an image/file in a reply. Get those right and the patterns here carry over; guess from the canvas examples and the workflow ships looking correct, then fails on real messages.

---

## Common mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Passing binary through `$fromAI()` | Can't carry binary; tool gets nothing | Pass a key/URL, re-fetch on the other side |
| Forgetting to inject keys into the system prompt | Agent hallucinates names or refuses | List original + storage key, "use EXACTLY" |
| Skipping the Merge synchronization barrier | Agent fires before uploads finish; tool 404s | Merge the upload branch back before the agent |
| Forgetting `executeOnce: true` when files split | N files → N agent runs → N replies | Set `executeOnce: true` on the agent |
| Forgetting `options.binaryPropertyOutput` on provider AI nodes | Produced bytes don't land where upload looks | Set it explicitly on image/audio/video gen nodes |
| Public bucket for inbound user files | Privacy hole | Private bucket, session-scoped keys, short TTL |
| Returning binary in the tool response | Bloated context, some runtimes reject | Upload, return `{ key, url }` |
| Assuming `passthroughBinaryImages` feeds tools | Tools still get only `$fromAI` params | Use the upload-and-pass-key pattern |
| Default HTTP timeout on a slow generation endpoint | Call aborts mid-job, agent gets nothing | Bump `options.timeout` past expected duration |
| Embedding video as `![]()` | Broken thumbnail on most surfaces | Use `[title](url)` link form for video |
