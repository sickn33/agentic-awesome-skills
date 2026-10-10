# QRX REST API fallback

Use this only when the QRX MCP tools are not connected (connecting the MCP server needs sign-in or an API key; prefer signing in). Requires an API key from https://qrx.codes/developers/keys, read from the environment variable `QRX_API_KEY`. Never print the key.

Base URL: `https://qrx.codes/v1`. The OpenAPI 3.1 spec is at `https://qrx.codes/v1/openapi.json`, and the reference is at https://qrx.codes/developers/docs/reference (append `.md` to any docs page for Markdown). None of these need a key.

Send the key as `Authorization: Bearer $QRX_API_KEY` (preferred) or `X-API-Key: $QRX_API_KEY`. If both are sent, `Authorization` wins.

## Create a code

```bash
curl -sS -X POST "https://qrx.codes/v1/codes?wait=45" \
  -H "Authorization: Bearer $QRX_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen 2>/dev/null || date +%s)" \
  -d '{"prompt":"a lighthouse on a cliff at sunset, watercolour, navy and coral","destination":"https://example.com/menu"}'
```

- `prompt` (required, up to 1,000 characters), `destination` (an absolute `http` or `https` URL, up to 2,048; anything else is a `400`) **or** `wifi` `{ "ssid", "password", "security": "wpa"|"wep" }` (only if the account's plan includes Wi-Fi codes), optional `style` (an id from `GET /v1/styles`).
- `?wait=` (0 to 50; use 45) holds the request open: `201` means it finished within the wait, `202` means it is still `processing`. The `Location` header is the code's absolute URL.
- Always send an `Idempotency-Key` so a retried request cannot make a second code. A retry with the same key and body within a day answers with the code as it is now; one that arrives before the first request has made its code answers `409` with `Retry-After`.

## Wait for it

```bash
curl -sS "https://qrx.codes/v1/codes/<id>?wait=45" -H "Authorization: Bearer $QRX_API_KEY"
```

Repeat until `status` is `succeeded` or `failed`. A finished code has `imageUrl` (PNG), `shortUrl` (the short link, `https://qrx.to/<id>` on qrx.codes), `destination` and `pageUrl`. A code's `id` and `shortUrl` never change. A link code's `id` is currently 6 lowercase letters and digits, such as `k7m2qz`; a Wi-Fi code's `id` is a UUID and its `shortUrl` is null. Treat ids as opaque strings.

## Other endpoints

| Method and path | Purpose |
| - | - |
| `GET /v1/codes?limit=10&cursor=...` | List codes, newest first (`nextCursor` for the next page) |
| `PATCH /v1/codes/{id}` with `{"destination":"https://..."}` | Re-point a link code (only if the account's plan allows changing destinations) |
| `GET /v1/account` | Plan, allowance, features and limits |
| `GET /v1/styles` | Style ids, names and preview images |

Errors are RFC 9457 `application/problem+json` with a `type` (`https://qrx.codes/developers/docs/errors#<code>`), `title` and `detail`; `403 plan-required` means the feature is not included in the account's plan, and `429` means a rate or daily limit was hit (check `GET /v1/account`). Rate limits are reported in the `RateLimit-Policy` and `RateLimit` headers (for example `RateLimit-Policy: "requests";q=30;w=60` and `RateLimit: "requests";r=29;t=2`); creates on accounts with a daily allowance also carry a `"codes"` policy for the day's codes.
