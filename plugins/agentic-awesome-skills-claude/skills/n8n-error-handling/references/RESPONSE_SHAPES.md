# Response Shapes

Conventions for webhook API response bodies — both success and error. The goal is **predictability**: a caller, a dashboard, or a retry loop should be able to branch on your response without guessing. Pick a shape and hold it across every endpoint on the instance.

This file is opinions with reasons. The one hard rule is consistency: **consistency within your project beats consistency with this file.** If your repo or company already has a documented API style, that wins.

---

## First, match what's already on the instance

Before adopting any shape here, look at the API workflows already running and reuse their conventions. A one-off custom shape is hard to undo once callers depend on it, and inconsistency across endpoints is worse than any single choice.

Search with the MCP, then read each result:

```javascript
search_nodes({ query: "webhook" })          // find webhook-shaped workflows via templates
n8n_list_workflows({ /* filter */ })          // list workflows on the instance
n8n_get_workflow({ id: "<id>" })               // read each one's Respond to Webhook nodes
```

In each existing `Respond to Webhook`, note:

- Top-level keys — envelope vs bare, presence of `error`/`message`/`request_id`.
- Whether success bodies wrap the payload or return it bare.
- The exact error-code strings in use (`validation_error` vs `bad_request` vs `INVALID_INPUT`).
- Header conventions (`Content-Type`, `Retry-After`, `X-Request-Id`).

If results are sparse, mixed, or you can't tell whether a convention exists — **ask the user.** "Endpoints A and B use shape X, C uses Y; which is house style?" saves a future migration. Don't invent a domain prefix or envelope from nothing.

---

## Success shape

Return the data bare. For requests that **create or update** a resource, prefer returning the **full resource** with a 200, not `{ "ok": true }` or just the new ID:

```json
{
  "customer_id": "cus_123",
  "balance": 4200,
  "currency": "USD",
  "created_at": "2026-04-25T12:34:00Z"
}
```

Returning the resource saves the caller a follow-up GET, lets them confirm what actually persisted (server defaults, normalized values, generated timestamps), and makes the endpoint a single round-trip for a UI that renders the result immediately.

Deviate only when:

- The resource is genuinely large and the caller doesn't need it → return the ID, document why.
- There is no resource (event ingestion, fire-and-forget) → `{}` or `204 No Content`.
- The payload is list-shaped → a top-level array, or `{ "items": [...] }` (friendlier to future pagination metadata).

---

## Error shape (the default envelope)

```json
{
  "error": "<machine-readable code>",
  "message": "<human-readable explanation>"
}
```

- `error` is a **stable string identifier**, not a sentence. Clients branch on it.
- `message` is the human version — safe to log, safe to show users *after* sanitization.
- No `ok: false` flag — the HTTP status code already separates success from failure.

Optional fields by case:

| Field | When to include |
|---|---|
| `details` | Validation errors, with a field-by-field map |
| `retry_after` | Rate limits (also set the `Retry-After` header) |
| `request_id` | When you run distributed tracing (then on *every* response, not just errors) |
| `documentation_url` | Public APIs where you want callers to RTFM |

---

## `responseCode` defaults to 200 — set it on every error branch

This is the single most common API error-handling bug, and it's worth its own section because it produces a *worse-than-useless* result: the body says failure while the status says success.

**Every `Respond to Webhook` node defaults `responseCode` to 200** — including the ones you wired to error paths. An error branch that returns 200 with `{ "error": "..." }` looks like success to the caller's HTTP client, so their error handling (which keys off the status code) **never fires**. They process your error body as if it were data.

So: set `responseCode` **explicitly** on every Respond node — not just the success one. (This trap is also documented in **n8n-node-configuration** NODE_FAMILY_GOTCHAS.md, "Webhook / Respond to Webhook".) A workflow can have many Respond nodes, one per response shape; n8n returns whichever fires first.

```json
{ "responseCode": 502,
  "responseBody": "={{ JSON.stringify({ error: 'upstream_error', message: 'External service failed' }) }}" }
```

For paths that differ only by number, set it with an expression instead of fanning out to N nodes — see **API_WORKFLOWS.md**, "5xx: differentiate the body".

---

## Status code → cause

The status code is the caller's first signal; be deliberate.

- **2xx** — success. 200 sync, 202 "accepted, processing".
- **4xx** — caller's fault. 400 bad input, 401 no auth, 403 not allowed, 404 not found, 409 conflict, 429 rate limited.
- **5xx** — your fault. 500 unexpected internal, 502 upstream broken, 503 temporarily down, 504 upstream timeout.

Distinguishing 4xx from 5xx matters because the caller's tooling depends on it:

- Caller monitoring alerts on 5xx (your fault) but not 4xx (their fault). Returning 500 for bad input fires *their* pager on *their* bug.
- 5xx implies "retry", 4xx implies "don't bother".
- Aggregated error rates segment by class — collapse everything to 500 and you lose that.

### Error codes (a small, stable set)

Adding a code is fine; renaming an existing one breaks callers.

**4xx — caller's fault**

| Code | Meaning |
|---|---|
| `validation_error` | Required field missing / type wrong |
| `invalid_input` | Field present but value invalid |
| `unauthorized` | No auth or expired auth |
| `forbidden` | Authenticated but not allowed |
| `not_found` | Resource doesn't exist |
| `conflict` | Conflicts with current state (duplicate key, race) |
| `rate_limit_exceeded` | Too many requests |
| `unsupported_media_type` | Content-Type wrong |

**5xx — your fault**

| Code | Meaning |
|---|---|
| `internal_error` | Catch-all, something failed unexpectedly |
| `upstream_error` | Third-party API returned an error |
| `upstream_timeout` | Third-party API didn't respond in time |
| `service_unavailable` | Temporarily can't process (down, or rate-limited upstream) |
| `not_implemented` | Operation not supported in this version |

---

## Validation error details (400)

For `validation_error`, include per-field detail so the caller can fix the request without guessing. The Set-node schema validator (API_WORKFLOWS.md) produces this directly:

```json
{
  "error": "validation_error",
  "message": "Validation failed (3 issues):\n• name: Missing required field \"name\"\n• email: \"not-an-email\" is not valid - Contact email address\n• plan: \"premium\" is not allowed. Must be one of: starter, pro, enterprise - Subscription plan",
  "details": { "name": "Missing required field \"name\"", "email": "\"not-an-email\" is not valid", "plan": "\"premium\" is not allowed" },
  "request_schema": { "type": "object", "properties": { } }
}
```

`message` is the human summary (safe to show), `details` is the structured per-field map (safe to bind to UI fields), and `request_schema` is the schema echoed back so an LLM-driven or programmatic caller can self-correct on the next attempt.

---

## Rate-limit responses (429)

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Retry after 30s.",
  "retry_after": "2026-05-08T21:10:05.135Z"
}
```

Also set the HTTP `Retry-After` header (in the Respond node's `options.responseHeaders`). Well-behaved clients respect the header without parsing the body.

---

## What NOT to put in an error response

The body goes to the caller. Treat everything in it as public.

| Don't include | Why |
|---|---|
| **Stack traces** — `{ "stack": "Error at line 42 of /opt/..." }` | Reveals paths, versions, library names. A gift to attackers, useless to callers. |
| **Upstream errors verbatim** — `{ "details": "<raw upstream body>" }` | Upstream may embed *their* tokens and PII. Surface "upstream service failed" + a request id; details go to your logs. |
| **SQL queries** — `{ "query": "SELECT * FROM users WHERE ..." }` | Exposes schema and access patterns. |
| **Tokens / credentials / auth values** | Even innocuous-looking `headers`, `config`, or `request` fields can carry token values. Audit error bodies — leaks are easier than you'd expect. |

The pattern is always the same: **log the full error privately, return a sanitized message.** See "Don't leak internals" in API_WORKFLOWS.md for the log-then-respond wiring.

---

## Respond node shape (JSON, for the community MCP)

Success:

```json
{
  "type": "n8n-nodes-base.respondToWebhook",
  "name": "Respond Success",
  "parameters": {
    "respondWith": "json",
    "responseCode": 200,
    "responseBody": "={{ JSON.stringify($json) }}",
    "options": { "responseHeaders": { "entries": [{ "name": "Content-Type", "value": "application/json" }] } }
  }
}
```

Error:

```json
{
  "type": "n8n-nodes-base.respondToWebhook",
  "name": "Respond Error",
  "parameters": {
    "respondWith": "json",
    "responseCode": 502,
    "responseBody": "={{ JSON.stringify({ error: 'upstream_error', message: 'External service failed' }) }}",
    "options": { "responseHeaders": { "entries": [{ "name": "Content-Type", "value": "application/json" }] } }
  }
}
```

Two notes that bite people:

- **Always set `Content-Type: application/json` explicitly.** Default behavior depends on the body shape and isn't reliable.
- **With `respondWith: "json"`, pass the object, not a stringified string.** If you hand it `JSON.stringify(obj)` it serializes that string *again* and you get a double-encoded body. Either use `respondWith: "json"` with an object expression (`={{ { error: 'x' } }}`), or keep `JSON.stringify(...)` and let the node treat it as the already-final body — pick one and be consistent. (See **n8n-node-configuration** NODE_FAMILY_GOTCHAS.md.)
