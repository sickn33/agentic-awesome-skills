---
name: curlshot
description: "Capture web page screenshots, PDFs and scrolling videos, or render HTML/Markdown to images, with the hosted CurlShot API."
category: api-integration
risk: safe
source: "https://github.com/SergiuPogor/curlshot-mcp/tree/main/skills/curlshot"
source_repo: SergiuPogor/curlshot-mcp
source_type: official
date_added: "2026-10-16"
author: SergiuPogor
tags: [screenshot, pdf, html-to-image, headless-browser, api, mcp]
tools: [claude-code, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/SergiuPogor/curlshot-mcp/blob/main/LICENSE"
---

# CurlShot screenshots

CurlShot (https://curlshot.com) is a hosted screenshot API. It renders a web
page in a real browser and returns an image (PNG, JPEG, WebP), a PDF, or a
video of the page scrolling (MP4, WebM, GIF). One HTTP request does it.

## When to Use

- Use when the user wants a screenshot, full-page capture, or mobile/tablet view of a public URL.
- Use when the user wants a PDF or a scrolling video (MP4, WebM, GIF) of a web page.
- Use when the user wants their own HTML or Markdown rendered to an image or PDF (social cards, reports, previews).
- Requires a CurlShot access key in the `CURLSHOT_API_KEY` environment variable.

## Before you start

- The access key is read from `CURLSHOT_API_KEY`. If it is not set, ask the user to set it. Check current account eligibility and quotas at https://curlshot.com/register.
- Never print the key, write it into a file in the repository, or put it in a link you show the user.
- Only public pages work out of the box. Local and private network addresses (localhost, 192.168.x.x, ...) are refused: for a local page, send its HTML instead (see below).
- Sending HTML or Markdown uploads that content to CurlShot. Confirm with the user before sending anything private or confidential.

## Take a screenshot

```bash
curl --fail-with-body --max-time 60 -sS -G "https://curlshot.com/api/v1/screenshot" \
  -H "X-Access-Key: $CURLSHOT_API_KEY" \
  --data-urlencode "url=https://example.com" \
  -d format=png \
  --output screenshot.png
```

`-G` with `--data-urlencode` keeps the page address correctly encoded. Check response status and content type before treating the saved bytes as an image; an error may still be written to the output file. Use a new non-overwriting output path. Check
the HTTP status: on an error the body is JSON with `error_code` and
`error_message` instead of an image.

## Common options

Add each option as one more `-d name=value` (GET) or as a field in a POST JSON body.

| Want | Option |
| --- | --- |
| Whole page, top to bottom | `full_page=true` |
| Phone or tablet view | `viewport_device=<preset>` (list: https://curlshot.com/docs/devices.md) |
| Window size | `viewport_width=1440`, `viewport_height=900` |
| Retina sharpness | `device_scale_factor=2` |
| Dark theme | `dark_mode=true` |
| One element only | `selector=<css selector>` |
| Output format | `format=png` / `jpeg` / `webp` / `pdf` / `mp4` / `webm` / `gif` |
| Hide cookie banners and ads | `block_cookie_banners=true`, `block_ads=true` |
| Wait for content | `wait_until=networkidle`, `delay=2`, `wait_for_selector=<css selector>` |
| Reuse a stored copy for free | `cache=true` |

A misspelled option is rejected with `invalid_options` and a hint, never
ignored. Every option: https://curlshot.com/docs/options.md

## Render your own HTML or Markdown

POST JSON when the input is long:

```bash
curl --fail-with-body --max-time 60 -sS -X POST "https://curlshot.com/api/v1/screenshot" \
  -H "X-Access-Key: $CURLSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello</h1>", "format": "png", "viewport_width": 1200, "viewport_height": 630}' \
  --output card.png
```

Use `"markdown": "..."` instead of `html` to render Markdown as a styled page,
and `"format": "pdf"` for a PDF.

## Examples

### Example 1: Full-page mobile screenshot without cookie banners

```bash
curl --fail-with-body --max-time 60 -sS -G "https://curlshot.com/api/v1/screenshot" \
  -H "X-Access-Key: $CURLSHOT_API_KEY" \
  --data-urlencode "url=https://example.com/pricing" \
  -d viewport_device=iphone_15_pro \
  -d full_page=true \
  -d block_cookie_banners=true \
  -d format=webp \
  --output pricing-mobile.webp
```

Check https://curlshot.com/docs/devices.md for the exact preset names.

### Example 2: Save a page as PDF

```bash
curl --fail-with-body --max-time 60 -sS -G "https://curlshot.com/api/v1/screenshot" \
  -H "X-Access-Key: $CURLSHOT_API_KEY" \
  --data-urlencode "url=https://example.com/docs" \
  -d format=pdf \
  --output docs.pdf
```

## Usage and billing

Verify current pricing, per-format charges, rate limits and account quota before use. Do not infer that failures/cache hits are free or that every render costs the same. Agree a batch cost cap and reconcile ambiguous outcomes before retrying.

## MCP alternative

Agents with MCP support can use the hosted server instead of HTTP calls:
`https://curlshot.com/api/mcp` (streamable HTTP, `Authorization: Bearer <key>`),
tools `take_screenshot` and `list_devices`. Setup per client is in the
[curlshot-mcp README](https://github.com/SergiuPogor/curlshot-mcp).

## Limitations

- Needs network access to `curlshot.com` and a CurlShot account key; it does not run a browser locally.
- Pages behind a login, on localhost, or on private networks cannot be captured by URL; render their HTML instead.
- Each successful render uses one screenshot from the account's monthly quota.
- HTML and Markdown inputs are sent to a third-party service; do not send secrets or confidential content without the user's consent.
- Sites with aggressive bot protection may return an error page or a challenge screen instead of the real content.

## Docs

- Getting started: https://curlshot.com/docs/getting-started.md
- Errors: https://curlshot.com/docs/errors.md
- Everything in one file: https://curlshot.com/llms-full.txt
