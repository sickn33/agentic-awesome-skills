# Web Scraping API — `POST /scrape/web`

One endpoint to fetch any URL, optionally with JS rendering, proxies, AI extraction, and screenshots. Synchronous.

> Reach for this only when the user gave you a specific URL, or when no Scraper API covers the field. Otherwise the platform-specific APIs return pre-extracted JSON and bypass anti-bot.

## Minimal request

```python
import requests

# Multiple outputs (or include "json") → response is a JSON object
resp = requests.post(
    "https://api.hasdata.com/scrape/web",
    headers={"x-api-key": API_KEY},
    json={"url": "https://example.com", "outputFormat": ["markdown", "json"]},
    timeout=300,
)
data = resp.json()
assert data["requestMetadata"]["status"] == "ok"
print(data["markdown"])

# Single non-JSON output → response IS the raw content (markdown/html/text bytes)
resp = requests.post(
    "https://api.hasdata.com/scrape/web",
    headers={"x-api-key": API_KEY},
    json={"url": "https://example.com", "outputFormat": ["markdown"]},
    timeout=300,
)
print(resp.text)            # raw markdown — no JSON parsing
```

## Body parameters

| Parameter | Type | Notes |
|---|---|---|
| `url` | string | **Required.** Absolute URL. |
| `outputFormat` | string[] | `html`, `text`, `markdown`, `json`. **Single non-JSON format → raw content as the body** (not JSON-wrapped); multiple formats → JSON object with one key per format. Always include `"json"` (or another format) when you also need `requestMetadata`. |
| `proxyType` | enum | `datacenter` (default) or `residential` — use residential only when datacenter IPs get blocked. |
| `proxyCountry` | string | ISO 3166-1 alpha-2 — `US`, `UK`, `DE`, `FR`, `IT`, `SE`, `BR`, `CA`, `JP`, `SG`, `IN`, `ID`, `IE`. |
| `jsRendering` | bool | Headless browser — required for SPAs and dynamically-injected content. |
| `wait` / `waitFor` | int (ms) / CSS string | Fixed delay vs. wait-until-selector. Prefer `waitFor`. |
| `jsScenario` | array | Sequence of click/fill/wait/scroll/evaluate. Requires `jsRendering`. |
| `headers` | object | Custom headers. **Cookies go here too — no separate `cookies` parameter.** |
| `screenshot` | bool | Returns a CDN URL in the response. |
| `extractRules` | object | CSS selectors → field text. `@attr` for attributes. **First match only**, missing → `null`. |
| `aiExtractRules` | object | Typed LLM extraction. Types: `string`, `number`, `boolean`, `list`, `item`. |
| `extractEmails` / `extractLinks` | bool | Quick helpers. |
| `blockResources` / `blockAds` | bool | Skip images/CSS/ads — speeds text-only scrapes. |
| `blockUrls` | string[] | Glob patterns to block subresources. |
| `removeBase64Images` | bool | Strip inline base64 from response. |
| `includeOnlyTags` / `excludeTags` | string[] | Trim DOM before serialization. |

## CSS extraction (`extractRules`)

```python
"extractRules": {
    "title": "h1",
    "links": "a @href",   # @attr extracts attribute
    "price": ".price-now",
}
```

First match per selector. For lists of records, use `aiExtractRules` with `type: "list"`.

## AI extraction (`aiExtractRules`)

```python
"aiExtractRules": {
    "title":    {"type": "string"},
    "price":    {"type": "number"},
    "in_stock": {"type": "boolean"},
    "tags":     {"type": "list", "description": "category tags"},
    "author":   {"type": "item", "output": {
        "name":     {"type": "string"},
        "verified": {"type": "boolean"},
    }},
    "reviews":  {"type": "list", "output": {
        "rating": {"type": "number"},
        "text":   {"type": "string"},
    }},
}
```

Use when layout varies across pages; otherwise prefer `extractRules` for determinism and predictability.

## JS scenarios

```python
"jsScenario": [
    {"fill": ["#email", "user@example.com"]},
    {"fill": ["#password", PASSWORD]},
    {"click": "#login"},
    {"waitFor": ".dashboard"},
    {"scrollY": 2000},
    {"waitForAndClick": ".load-more"},
    {"evaluate": "window.__APP_STATE__"},
]
```

Actions: `click`, `fill: [sel, val]`, `wait: ms`, `waitFor: sel`, `waitForAndClick: sel`, `scrollX/scrollY: px`, `evaluate: "JS"`. Sequential. Missing element on `click`/`fill` fails the request — wrap with `waitFor` first.

## Auth via cookies

```python
"headers": {
    "User-Agent": "Mozilla/5.0 ...",
    "Cookie": "session=abc; csrf=xyz",
    "Accept-Language": "en-US,en;q=0.9",
}
```

Capture cookies once in a real browser (devtools → Storage → Cookies), forward via the `Cookie` header. Only with explicit user permission.

## Slim response & speed

```python
{
    "blockResources": True,                       # skip images/CSS/fonts
    "blockAds": True,                             # skip ad/tracking
    "blockUrls": ["**.googletagmanager.com/**", "**.doubleclick.net/**"],
    "removeBase64Images": True,
    "excludeTags": ["script", "style", "nav", "footer"],
}
```

Reduces response size 60–90% on noisy pages.

## Response shape

The wrapper is JSON **only when** the response is JSON-wrapped — i.e. multiple `outputFormat` values, or a single value that includes `"json"`. With a single non-JSON format the response body is the raw content (`text/markdown`, `text/html`, `text/plain`).

```json
{
  "requestMetadata": { "id": "uuid", "status": "ok", "url": "..." },
  "headers": { "content-type": "text/html" },
  "screenshot": "https://...jpeg",
  "content": "<!DOCTYPE html>...",     // outputFormat: html
  "markdown": "# Title\n...",           // outputFormat: markdown
  "text":     "Title\n...",
  "extractRules":    { ... },           // present iff sent
  "aiExtractRules":  { ... },           // present iff sent
  "extractedEmails": [ ... ],           // iff extractEmails: true
  "extractedLinks":  [ ... ]            // iff extractLinks: true
}
```

## Batch (`POST /scrape/batch/web`)

Async wrapper for >1k URLs running the same extraction. Returns `jobId`; poll status, page `/results`. Per-batch cap **10,000 URLs**. For small workloads loop the sync endpoint at concurrency = plan limit.

## Gotchas

- **Disable `jsRendering` first**, enable only when the page needs it — most static pages parse fine without a headless browser.
- **`waitFor` > `wait`.** Selector-based waits adapt to network speed.
- **Cookies via `headers["Cookie"]` only.**
- **`extractRules` returns first match** — for arrays use `aiExtractRules` `type: "list"`.
- **Set client timeout ≥ 300 s** to match the server deadline.
- **`requestMetadata.status === "ok"` is the only success signal.**
