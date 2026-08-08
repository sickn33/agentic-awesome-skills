---
name: deepapi
description: "Use DeepAPI for supported scraping, research, and email workflows with explicit credentials and approval."
category: research
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [deepapi, scraping, email, api]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
version: b17ad5148ab7
---

# DeepAPI

## When to Use

- Use when the task needs supported DeepAPI scraping, research, or email endpoints.
- Use when the user has provided or confirmed the required DeepAPI credentials and scope.

Use this skill when the user asks you to scrape public web data or draft/read/send email through DeepAPI.

## Version Pinning

- The installed copy is pinned to the `version` value in the frontmatter above.
- If a request or API response reports a different `skillVersion`, report the mismatch and
  stop. Do not fetch, overwrite, or otherwise self-update this `SKILL.md`.
- Updates must arrive through the reviewed repository release process, with explicit user
  approval for any package or repository update.

## Required Environment

- Read `DEEPAPI_API_BASE_URL` from the environment.
- Read `DEEPAPI_API_KEY` from the environment.
- If either value is missing, stop and ask the user for setup.
- Never commit, print, log, paste, or expose `DEEPAPI_API_KEY`.

## Request Rules

- Send `Authorization: Bearer $DEEPAPI_API_KEY` on every request.
- Send `Content-Type: application/json` when sending JSON.
- Send a unique `Idempotency-Key` for every `POST`.
- For scrape work, set explicit `maxCostUsd` or `maxCostMicrousd`.
- Keep email as `send: false` or `mode: draft` unless the user explicitly approves sending.
- Do not pass inbox IDs. Use `emailIdentityId` or omit it.

## Execution Loop

1. Choose the narrowest endpoint that matches the task.
2. Build the request from the endpoint schema and examples below.
3. Run the request with the required headers.
4. If the response has `status: running`, wait `next.afterSecs` and call `next.method` + `next.path` until `status` is `succeeded` or `failed`.
5. If `error.retryable` is true, wait `error.retryAfterSecs` before retrying.
6. If the response is HTTP 402 with `error.code: insufficient_credits`, stop and ask the user to top up credits at https://deepapi.co/credits. After top-up, retry with the same `Idempotency-Key`.
7. Report `requestId`, `status`, `debitMicrousd`, `costFinal`, and the useful part of `output`.

## Endpoints

| Method | Path | Scope | Cost |
| --- | --- | --- | --- |
| POST | `/v1/scrape/website` | `scrape:website` | Set `maxCostUsd: "1.00"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/linkedin/profile` | `scrape:linkedin` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/github/profile` | `scrape:github` | Set `maxCostUsd: "0.03"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/twitter/search` | `scrape:twitter` | Set `maxCostUsd: "0.03"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/linkedin/jobs` | `scrape:linkedin` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/linkedin/company` | `scrape:linkedin` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/linkedin/people` | `scrape:linkedin` | Set `maxCostUsd: "0.50"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/linkedin/posts` | `scrape:linkedin` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/twitter/user` | `scrape:twitter` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/twitter/replies` | `scrape:twitter` | Set `maxCostUsd: "0.20"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/youtube/transcript` | `scrape:youtube` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/youtube/channel` | `scrape:youtube` | Set `maxCostUsd: "0.30"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/youtube/search` | `scrape:youtube` | Set `maxCostUsd: "0.10"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/linkedin` | `scrape:linkedin` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/github` | `scrape:github` | Set `maxCostUsd: "0.03"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/scrape/twitter` | `scrape:twitter` | Set `maxCostUsd: "0.03"` unless the user gives a different cap. The route requires maxCostUsd or maxCostMicrousd as the customer spend cap. The final debit is capped by that amount and reported as debitMicrousd. |
| POST | `/v1/email/send` | `email:send` | Uses configured email unit pricing; the route does not accept maxCostUsd. Check debitMicrousd in the response. |
| GET | `/v1/email/messages` | `email:read` | Read route returns debitMicrousd 0. |
| GET | `/v1/email/drafts` | `email:read` | Read route returns debitMicrousd 0. |
| POST | `/v1/email/drafts/{draftId}/send` | `email:send` | Uses configured email unit pricing; the route does not accept maxCostUsd. Check debitMicrousd in the response. |
| POST | `/v1/research/deep` | `research:deep` | Set `maxCostUsd: "0.10"` unless the user gives a different cap. Defaults to maxCostUsd 0.10. Pass maxCostUsd or maxCostMicrousd to choose a different customer spend cap. The final debit is capped and reported as debitMicrousd. |
| POST | `/v1/generate/image` | `generate:image` | Set `maxCostUsd: "0.20"` unless the user gives a different cap. Defaults to maxCostUsd 0.20. Pass maxCostUsd or maxCostMicrousd to choose a different customer spend cap. The final debit is capped and reported as debitMicrousd. |
| POST | `/v1/search/web` | `search:web` | Set `maxCostUsd: "0.05"` unless the user gives a different cap. Defaults to maxCostUsd 0.05. Pass maxCostUsd or maxCostMicrousd to choose a different customer spend cap. The final debit is capped and reported as debitMicrousd. |
| GET | `/v1/requests/{requestId}` | `same key` | Status polling does not create a new debit. |

## Endpoint Details

### Scrape Website

Use `POST /v1/scrape/website`. Crawl website pages and return clean text and markdown per page.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "1.00",
  "waitForFinishSecs": 60,
  "urls": [
    "https://example.com"
  ],
  "maxPages": 1
}
```

### Scrape LinkedIn Profile

Use `POST /v1/scrape/linkedin/profile`. Scrape public LinkedIn profile details.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.05",
  "waitForFinishSecs": 60,
  "profiles": [
    "williamhgates"
  ]
}
```

### Scrape GitHub Profile

Use `POST /v1/scrape/github/profile`. Scrape public GitHub profile details.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.03",
  "waitForFinishSecs": 60,
  "usernames": [
    "octocat"
  ]
}
```

### Search X/Twitter

Use `POST /v1/scrape/twitter/search`. Scrape X/Twitter posts from a search query or account handles.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.03",
  "waitForFinishSecs": 60,
  "handles": [
    "nasa"
  ],
  "maxItems": 1,
  "sort": "latest"
}
```

### Scrape LinkedIn Jobs

Use `POST /v1/scrape/linkedin/jobs`. Scrape public LinkedIn job listings for a search query.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.05",
  "waitForFinishSecs": 60,
  "query": "software engineer",
  "location": "United States",
  "maxItems": 5
}
```

### Scrape LinkedIn Company

Use `POST /v1/scrape/linkedin/company`. Scrape public LinkedIn company pages for firmographic details.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.05",
  "waitForFinishSecs": 60,
  "companies": [
    "microsoft"
  ]
}
```

### Search LinkedIn People

Use `POST /v1/scrape/linkedin/people`. Search public LinkedIn profiles by role, location, company, or school. Requires maxCostUsd of at least 0.50.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.50",
  "waitForFinishSecs": 60,
  "titles": [
    "Founder"
  ],
  "locations": [
    "San Francisco"
  ],
  "maxItems": 5
}
```

### Scrape LinkedIn Posts

Use `POST /v1/scrape/linkedin/posts`. Scrape recent public posts from LinkedIn profiles or company pages.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.05",
  "waitForFinishSecs": 60,
  "profiles": [
    "williamhgates"
  ],
  "maxItems": 3
}
```

### Scrape X/Twitter User

Use `POST /v1/scrape/twitter/user`. Scrape public X/Twitter account profiles, with optional follower and following lists.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.05",
  "waitForFinishSecs": 60,
  "handles": [
    "nasa"
  ]
}
```

### Scrape X/Twitter Replies

Use `POST /v1/scrape/twitter/replies`. Scrape the public reply thread of an X/Twitter post. Requires maxCostUsd of at least 0.20.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.20",
  "waitForFinishSecs": 60,
  "url": "https://x.com/NASA/status/1234567890123456789",
  "maxItems": 5
}
```

### Scrape YouTube Transcript

Use `POST /v1/scrape/youtube/transcript`. Scrape the transcript of a YouTube video as plain text plus timed segments. Videos without captions return an empty result.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.05",
  "waitForFinishSecs": 60,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### Scrape YouTube Channel

Use `POST /v1/scrape/youtube/channel`. Scrape a YouTube channel's stats and recent videos. Each video item includes subscriber and channel totals.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.30",
  "waitForFinishSecs": 60,
  "channels": [
    "mkbhd"
  ],
  "maxItems": 3
}
```

### Search YouTube

Use `POST /v1/scrape/youtube/search`. Search YouTube videos by keyword and return video metadata.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.10",
  "waitForFinishSecs": 60,
  "query": "ai agents",
  "sort": "views",
  "maxItems": 3
}
```

### Scrape LinkedIn

Use `POST /v1/scrape/linkedin`. Backward-compatible alias for LinkedIn profile scraping.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.05",
  "waitForFinishSecs": 60,
  "profiles": [
    "williamhgates"
  ]
}
```

### Scrape GitHub

Use `POST /v1/scrape/github`. Backward-compatible alias for GitHub profile scraping.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.03",
  "waitForFinishSecs": 60,
  "usernames": [
    "octocat"
  ]
}
```

### Scrape Twitter

Use `POST /v1/scrape/twitter`. Backward-compatible alias for X/Twitter search scraping.

Side effects: Starts a scrape run and may debit credits when the run finishes.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Set an explicit customer spend cap with maxCostUsd or maxCostMicrousd before starting a scrape.
- Start with small result caps such as maxItems or capability-specific limits.
- Poll next.path while status is running and report the final debitMicrousd.

Example body:
```json
{
  "maxCostUsd": "0.03",
  "waitForFinishSecs": 60,
  "handles": [
    "nasa"
  ],
  "maxItems": 1,
  "sort": "latest"
}
```

### Send Email

Use `POST /v1/email/send`. Create an email draft from a workspace email identity; set send=true to send it.

Side effects: Creates a draft, or sends an email when direct send is approved.
Polling: This route returns a terminal envelope directly.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Keep send=false or mode=draft unless the user explicitly approves sending.
- Do not pass inboxId or inbox_id; use emailIdentityId or the workspace default.
- Attachments, hidden HTML, image HTML, URL shorteners, and high-risk direct sends are blocked by policy.

Example body:
```json
{
  "to": "<email-address>",
  "subject": "Quick hello",
  "text": "Hi, this is a draft from my agent.",
  "send": false
}
```

### Receive Email

Use `GET /v1/email/messages`. Read messages for a workspace email identity.

Side effects: Reads messages only.
Polling: This route returns a terminal envelope directly.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Do not pass inboxId or inbox_id; use emailIdentityId or the workspace default.

### List Drafts

Use `GET /v1/email/drafts`. List pending email drafts for a workspace email identity.

Side effects: Reads drafts only.
Polling: This route returns a terminal envelope directly.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Do not pass inboxId or inbox_id; use emailIdentityId or the workspace default.

### Send Draft

Use `POST /v1/email/drafts/{draftId}/send`. Approve and send an existing draft by draftId after review.

Side effects: Sends the reviewed draft as a real email when direct send is approved.
Polling: This route returns a terminal envelope directly.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Only send a draft after the user explicitly approves that draft.
- Do not pass inboxId or inbox_id; use emailIdentityId or the workspace default.
- Sending re-checks recipient and content policy against the stored draft; blocked drafts stay drafts.

Example body:
```json
{}
```

### Deep Research

Use `POST /v1/research/deep`. Answer a research question with current web evidence.

Side effects: Runs a paid web research request and debits credits when finished.
Polling: This route returns a terminal envelope directly.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Use query for the research question and context only for relevant background.
- Set maxCostUsd when you need a lower or higher spend cap than the default.
- Report debitMicrousd and summarize the returned sources when sources are present.

Example body:
```json
{
  "query": "What changed in EU AI Act compliance timelines for API startups?",
  "context": "We sell API tooling to EU customers.",
  "maxCostUsd": "0.10"
}
```

### Generate Image

Use `POST /v1/generate/image`. Generate an image from a text prompt.

Side effects: Runs a paid image generation request and debits credits when finished.
Polling: This route returns a terminal envelope directly.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Describe the image you want in prompt, including style and composition.
- Set maxCostUsd when you need a lower or higher spend cap than the default.
- output.images contains base64 data URLs; save them to files instead of printing them.

Example body:
```json
{
  "prompt": "A minimal flat illustration of a rocket launching from a laptop screen",
  "maxCostUsd": "0.20"
}
```

### Web Search

Use `POST /v1/search/web`. Search the web and return ranked results with title, url, and snippet.

Side effects: Runs a paid web search request and debits credits when finished.
Polling: This route returns a terminal envelope directly.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Send a unique Idempotency-Key for every POST.
- Use query for the search terms only; keep it under 500 characters.
- Set maxCostUsd when you need a lower or higher spend cap than the default.
- Treat snippets as page summaries; open a result URL when you need the full content.

Example body:
```json
{
  "query": "latest stable Node.js LTS version",
  "maxResults": 3,
  "maxCostUsd": "0.05"
}
```

### Request Status

Use `GET /v1/requests/{requestId}`. Poll a running request by requestId.

Side effects: Reads or refreshes request status.
Polling: If status is running, wait next.afterSecs and call next.method next.path until status is succeeded or failed.

Safety:
- Send Authorization: Bearer $DEEPAPI_API_KEY and never expose the key.
- Only poll request ids created by the same API key.

Example query: `waitForFinishSecs=60`

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
