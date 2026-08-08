---
name: sendblue-api
description: "Send and receive iMessage, SMS, and RCS from application code via the Sendblue HTTP API — text, media, group messages, send styles, reactions, typing indicators, status callbacks, and inbound webhooks."
category: api-integration
risk: critical
source: community
source_type: official
date_added: "2026-05-22"
author: AnthonyFirth
tags: [sendblue, imessage, sms, rcs, messaging, api, webhooks]
tools: [claude, cursor, gemini]
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# Sendblue API

## Overview

Sendblue is a REST API that sends iMessage (blue bubbles), SMS, and RCS from a provisioned phone number. Everything is plain JSON over HTTPS — no SDK is required. The API covers outbound 1:1 and group sends, iMessage effects, reactions, typing indicators, status callbacks, and inbound webhooks.

## When to Use This Skill

- Use when writing application code (server, worker, function) that sends Sendblue messages as part of a long-running service.
- Use when receiving inbound messages via webhooks.
- Use when you need features the CLI does not expose: send styles, reactions, group messages, typing indicators, status callbacks, media uploads, or the contacts API beyond basic CRUD.
- Reach for [[sendblue-cli]] instead for shell-context outbound: one-shot scripts, cron jobs, agent hooks, "ping me when X" workflows.

## How It Works

### Step 1: Authenticate

```
https://api.sendblue.com
```

Every request needs two headers:

```
sb-api-key-id: <YOUR_API_KEY_ID>
sb-api-secret-key: <YOUR_API_SECRET>
Content-Type: application/json
```

Keep both values server-side — never ship them to a browser or mobile client.

### Step 2: Send a message

```bash
curl -X POST https://api.sendblue.com/api/send-message \
  -H "sb-api-key-id: $KEY_ID" \
  -H "sb-api-secret-key: $SECRET" \
  -H 'Content-Type: application/json' \
  -d '{
    "number": "+15551234567",
    "from_number": "+1YOUR_SENDBLUE_NUMBER",
    "content": "Hello from the API!"
  }'
```

Phone numbers must be E.164. `from_number` must be a line you own — list yours with `GET /api/lines`.

### Step 3: Track delivery

The synchronous response includes a `message_handle` (Apple GUID — persist this; you need it for reactions and replies) and a `status` from `REGISTERED`, `PENDING`, `QUEUED`, `ACCEPTED`, `SENT`, `DELIVERED`, `DECLINED`, `ERROR`. Only `DELIVERED` means it landed. Use `status_callback` instead of polling `/api/status`.

### Step 4: Receive inbound

Configure webhook URLs in the dashboard or via `POST /api/account/webhooks`. Sendblue POSTs JSON to your endpoint. Respond with 2xx promptly — non-2xx triggers retries and duplicate deliveries. Event types: `receive`, `outbound`, `typing_indicator`, `call_log`, `line_blocked`, `line_assigned`, `contact_created`.

## Core Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/send-message` | Send a 1:1 message (text and/or media) |
| POST | `/api/send-group-message` | Send to multiple recipients |
| POST | `/api/create-group` | Create a named group thread |
| POST | `/api/send-reaction` | Send a tapback (love/like/dislike/laugh/emphasize/question) |
| POST | `/api/send-typing-indicator` | Show "typing…" in the recipient's thread |
| POST | `/api/mark-read` | Send a read receipt |
| POST | `/api/upload-file` / `/api/upload-media-object` | Upload media (direct or from URL) |
| GET | `/api/status` | Poll a message's delivery status |
| GET | `/api/evaluate-service` | Check whether a number is on iMessage |
| GET | `/api/v2/messages` / `/api/v2/messages/:id` | Read message history |
| GET / POST / PUT / DELETE | `/api/v2/contacts[...]` | Manage contacts |
| GET | `/api/lines` | List your Sendblue phone numbers |
| POST | `/api/account/webhooks` | CRUD webhook subscriptions |

## Examples

### Example 1: Send with media, effects, and a status callback

```json
POST /api/send-message
{
  "number": "+15551234567",
  "from_number": "+1YOUR_SENDBLUE_NUMBER",
  "content": "Optional text",
  "media_url": "https://example.com/img.jpg",
  "send_style": "celebration",
  "status_callback": "https://yourapp.com/sendblue/status"
}
```

`content` and/or `media_url` is required. `send_style` is iMessage-only — valid values: `celebration`, `shooting_star`, `fireworks`, `lasers`, `love`, `confetti`, `balloons`, `spotlight`, `echo`, `invisible`, `gentle`, `loud`, `slam`. Ignored on SMS. Text up to 18,996 chars; media up to 100 MB on iMessage, 5 MB on SMS.

### Example 2: Group message

```json
POST /api/send-group-message
{
  "numbers": ["+15551234567", "+15557654321"],
  "from_number": "+1YOUR_SENDBLUE_NUMBER",
  "content": "Hey team"
}
```

The response returns a `group_id` — persist it to send follow-ups into the same thread instead of creating a new one each time.

### Example 3: React to a message

```json
POST /api/send-reaction
{
  "from_number": "+1YOUR_SENDBLUE_NUMBER",
  "message_handle": "<message_handle from prior send>",
  "reaction": "love"
}
```

Reactions only work on iMessage and need the original message's `message_handle`. Valid values: `love`, `like`, `dislike`, `laugh`, `emphasize`, `question`.

### Example 4: Inbound webhook payload (`receive`)

```json
{
  "accountEmail": "you@example.com",
  "content": "Reply text",
  "media_url": "https://...",
  "is_outbound": false,
  "number": "+15551234567",
  "from_number": "+1YOUR_SENDBLUE_NUMBER",
  "service": "iMessage",
  "group_id": "...",
  "date_sent": "2024-01-01T12:00:00Z"
}
```

Status callback payloads (`outbound`) mirror the send-message response and update as the message moves through `SENT` → `DELIVERED` (or `ERROR`).

## Best Practices

- ✅ **Persist `message_handle` on every send.** You need it for reactions, replies, and correlating status callbacks.
- ✅ **Use `status_callback` over polling.** It's lower-cost and more accurate than `GET /api/status`.
- ✅ **Return 2xx fast from your webhook**, then process async. Non-2xx triggers duplicate deliveries.
- ✅ **Check service with `/api/evaluate-service`** before relying on iMessage-only features for a recipient.
- ✅ **Rehost inbound media on receipt** — media URLs expire in ~30 days.
- ❌ **Don't ship `sb-api-key-id` / `sb-api-secret-key` to a client.** They are server-side credentials.
- ❌ **Don't treat a 200 on `/api/send-message` as delivery.** It only means "accepted".

## Limitations

- Synchronous send responses only report acceptance, not delivery. Final state arrives via `status_callback` or `GET /api/status`.
- `send_style` silently no-ops on SMS (green-bubble recipients).
- Inbound media URLs expire in ~30 days.
- Per-line rate limits apply; bursting many sends from one number can trip Apple's spam heuristics — pace them or split across lines.
- Reactions and effects are iMessage-only.

## Security & Safety Notes

- Keep `sb-api-key-id` and `sb-api-secret-key` server-side. They are not safe in browser, mobile, or CI logs.
- Treat every outbound send, contact/webhook mutation, read receipt, reaction, or typing indicator as state-changing. Preview the recipient, sender line, content, and callback/webhook changes, then wait for explicit user confirmation before sending.
- Webhook endpoints should be on HTTPS and idempotent — same `message_handle` may arrive more than once.
- Sensitive data in message content is visible in lock-screen previews on the recipient's device. Don't embed secrets, tokens, or full PII — link to an authenticated dashboard or shortened payload instead.
- Rotate API keys from the Sendblue dashboard if either value is exposed; the old pair is invalidated on rotation.

## Common Pitfalls

- **E.164 only.** `5551234567` or `(555) 123-4567` will fail — always send `+15551234567`.
- **`from_number` must be one of your lines.** A spoofed or unprovisioned number returns an error.
- **`send_style` silently no-ops on SMS.** If the recipient is green-bubble, effects don't render — check service first with `/api/evaluate-service` if it matters.
- **Store `message_handle`.** You need it for reactions, replies, and correlating status callbacks back to your records.
- **Media URLs expire in ~30 days.** If you need durable media from inbound webhooks, download and re-host on receipt.
- **Status is async.** A 200 on `/api/send-message` means accepted, not delivered. Use `status_callback` rather than blocking on the synchronous response.
- **Webhook retries on non-2xx.** Return 200 even when you've decided to ignore the event; otherwise expect duplicate deliveries.
- **Rate limits apply per line.** Bursting many sends from one number trips Apple's spam heuristics — pace them or split across lines.

## Related Skills

- `@sendblue-cli` — Shell wrapper for shell-context outbound (scripts, cron, agent hooks). Use it when you don't need a full HTTP integration.
- `@sendblue-notify` — Patterns and copy rules for outbound "text me when X is done" notifications layered on top of the API or CLI.

## Links

- Full reference: <https://docs.sendblue.com/>
- Sendblue: <https://sendblue.com>
- Useful undocumented-here features: carousels (`/api/send-carousel`), FaceTime/contact-card sharing, advanced webhook filtering, contacts API beyond basic CRUD — see the docs site.
