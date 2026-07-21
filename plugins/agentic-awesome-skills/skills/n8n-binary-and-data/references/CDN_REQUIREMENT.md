# The CDN / URL Requirement for Chat Surfaces

When a workflow generates an image and the user wants it shown inside a chat message — Slack, Discord, Teams, Telegram, embedded webhook chat — the image in `$binary` is not enough. Chat clients render messages that reference images by **URL** (or push bytes through the platform's own file-upload API). None of them read the `$binary` slot. The bytes have to live somewhere a URL can fetch them over HTTPS, and n8n does not bundle a CDN — the user provides the storage.

## Contents

- [Why $binary doesn't display](#why-binary-doesnt-display)
- [What the user needs](#what-the-user-needs)
- [What the workflow does](#what-the-workflow-does)
- [How to tell the user](#how-to-tell-the-user)
- [Signing and expiration](#signing-and-expiration)
- [File naming](#file-naming)
- [Cleanup](#cleanup)

---

## Why $binary doesn't display

A chat message is HTML or a JSON block. An embedded image is a reference to a URL:

```html
<img src="https://cdn.example.com/img/abc123.png">
```

Some surfaces accept bytes directly through a platform file API instead of a URL — Slack's two-step `files.getUploadURLExternal` + `files.completeUploadExternal`, Discord attachments, Telegram `sendPhoto`. Either way, the bytes have to be reachable: either at a URL the client fetches, or handed to the platform's upload endpoint. The raw `$binary` slot inside an n8n execution is neither — it's internal to the workflow run.

---

## What the user needs

A place that serves the image over a fetchable URL. Ask what they already have, but lead with a recommendation:

1. **A real object store / CDN (recommended).** Cloudflare R2, AWS S3 (+ CloudFront), Google Cloud Storage, Azure Blob, Backblaze B2, Vercel Blob, Supabase Storage, Bunny CDN. Direct URL embedding works once the object is public, edge caching keeps latency low, and signed-URL flows are first-class. Cloudflare R2 is the lowest-friction starting point if they have nothing — a few minutes to set up, generous free tier, no egress fees.
2. **Drive-style services (fallback).** Dropbox, Google Drive, OneDrive, Box can produce shareable links, but the URL shape and whether it renders as an `<img src>` varies, and some need the share link converted to a direct-download URL first. Confirm the service can serve an inline-renderable URL before committing to it.
3. **Self-hosted.** The user serves from their own domain. Fine if it already exists; don't propose standing one up just for this.

The right choice depends on the user's existing infrastructure, cost tolerance, and how sensitive the content is.

---

## What the workflow does

The shape is always generate → upload → reply-with-URL:

```
[Generate image] → [Upload to storage] → [Set: imageUrl = response URL] → [Send chat reply referencing imageUrl]
```

Concretely, uploading to an S3-compatible store (R2 here) via the HTTP Request node:

```
[AI node: generate image]            ← set options.binaryPropertyOutput so bytes land in $binary
   ↓ binary on the item
[HTTP Request: PUT to R2]
   url: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
   authentication: AWS-style signed (or the S3 node with the R2 endpoint)
   contentType: binaryData
   binaryPropertyName: data
   ↓
[Set: { imageUrl: "https://pub-<id>.r2.dev/<key>" }]
   ↓
[Send to chat surface: imageUrl embedded — markdown, Block Kit image block, adaptive card, etc.]
```

Upload mechanics vary by provider; most expose S3-compatible APIs usable through n8n's S3 node or HTTP Request with AWS auth. Confirm the upload node's field names (`contentType`, `binaryPropertyName`) with `get_node`, and **error-branch the upload** so a failed write surfaces instead of producing a reply that references a URL that was never written — see **n8n-error-handling**. The exact reply shape per platform is surface-specific (see `AGENT_TOOL_BINARY.md`).

---

## How to tell the user

Don't quietly ship a workflow that generates images "but they don't display." Surface the requirement before building:

> "I can generate the image, but the chat surface can't display raw binary — it embeds images by URL. So I'll need to upload the image somewhere that serves a public URL first. What do you use for image/file storage today (R2, S3, GCS, Dropbox, Google Drive, …)? If you don't have anything set up, Cloudflare R2 is the lowest-friction starting point."

There is no fallback that hides this — n8n won't host the file. If the user has no storage, pause until they pick a service and provision a bucket and credentials, then resume. (Posting the URL as a plain link rather than an inline image is a lighter option if inline rendering isn't critical — but that link still has to come from somewhere.)

---

## Signing and expiration

| URL type | Trade-off | Use for |
|---|---|---|
| **Public** | Anyone with the URL can fetch it; simplest | Non-sensitive content (already-public assets) |
| **Signed, with expiry** | Per-request URL that expires (e.g. 1 hour) | Sensitive or user-specific content |

For internal chat with scoped channels, public is usually fine — the URL only lives inside messages a known set of users sees. For compliance-sensitive content, default to signed URLs with a short expiry. A permanently public, unguessable-but-non-expiring URL is a slow leak for anything private.

---

## File naming

| Scheme | Example | Note |
|---|---|---|
| UUID / random | `img/abc-123-def-456.png` | Unguessable; good default |
| Content hash | `img/sha256-abc123….png` | Free deduplication |
| User-prefixed | `users/<userId>/<name>.png` | Easy per-user cleanup |

Avoid user-controlled filenames (path traversal, collisions) and sequential IDs (predictable, scrapeable).

---

## Cleanup

Without it, storage costs grow:

- **Lifecycle rules** — object stores (S3, R2, GCS, Azure Blob) auto-delete objects after N days. 7–30 days is usually plenty for chat use cases.
- **Scheduled cleanup workflow** — for drive-style backends that have no TTL, run a workflow that lists and deletes old files.

Ask the user's retention preference rather than picking a window for them — chat artifacts are often disposable, but some surfaces (audit, support transcripts) need them kept.
