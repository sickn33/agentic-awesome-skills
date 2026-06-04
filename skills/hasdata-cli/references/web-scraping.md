# web-scraping reference

Subcommand: `web-scraping` (10 credits/call). Single endpoint for arbitrary URL scraping with JS rendering, proxies, AI extraction, screenshots, markdown conversion.

> **`web-scraping` is the last resort, not the default.** Before reaching for it, ask: would `google-serp` (or `google-news` / `google-shopping` / `google-maps`) already have the field I need? Google's `.knowledge_graph`, `.organic_results[].snippet`, `.local_results[]` carry pre-extracted facts that bypass anti-bot, JS rendering, and selector-maintenance overhead. Only invoke `web-scraping` when:
>
> - the user gave you a specific URL to read, OR
> - SERP came up short for a specific field, OR
> - the target page renders content that doesn't show up in any SERP snippet.
>
> See `references/enrichment.md` for the SERP-first patterns.

```bash
hasdata web-scraping --url "URL" [flags] --raw | jq .
```

## Required

- `--url URL` — target page

## Output formats

- `--output-format html|text|markdown|json` (repeatable)
  - One format → that format directly (e.g. `--output-format markdown` returns markdown text under `.markdown`)
  - Multiple → JSON response with one key per format
  - `--output-format json` combined with others → wraps everything in JSON

```bash
# LLM-friendly markdown for prompt context
hasdata web-scraping --url "$URL" --output-format markdown --raw | jq -r .markdown
```

## Proxy & rendering

- `--proxy-type datacenter|residential` (default datacenter)
- `--proxy-country US|UK|DE|IE|FR|IT|SE|BR|CA|JP|SG|IN|ID` (default US)
- `--js-rendering` / `--no-js-rendering` (default on) — full headless browser
- `--block-ads` / `--no-block-ads` (default on)
- `--block-resources` / `--no-block-resources` (default on) — blocks images/CSS for speed
- `--screenshot` / `--no-screenshot` (default on; the result includes a screenshot URL)
- `--remove-base64-images` — strip inline base64 images from response
- `--extract-emails` / `--no-extract-emails` (default on)
- `--extract-links` (default off)

## Wait controls

- `--wait MS` — fixed wait after page load
- `--wait-for "CSS_SELECTOR"` — wait until selector appears

## Custom JS scenario (complex array — JSON only)

```bash
hasdata web-scraping --url "$URL" \
  --js-scenario-json '[
    {"wait": 2000},
    {"click": ".load-more"},
    {"waitFor": ".item"},
    {"scrollY": 1000},
    {"fill": ["input#q", "espresso"]}
  ]' --raw
```

Supported actions: `evaluate`, `click`, `wait`, `waitFor`, `waitForAndClick`, `scrollX`, `scrollY`, `fill`. Executed sequentially.

Accepts raw JSON, `@file.json`, or `-` (stdin).

## Headers (kvSlice + JSON escape)

```bash
# Repeatable kv form (splits on first `=`)
hasdata web-scraping --url "$URL" \
  --headers "User-Agent=hasdata-cli" \
  --headers "Accept-Language=en-US,en;q=0.9" \
  --headers "Cookie=session=abc=def" \
  --raw

# JSON base + kv overrides
hasdata web-scraping --url "$URL" \
  --headers-json '{"User-Agent":"base","X-Common":"shared"}' \
  --headers "User-Agent=override" \
  --raw
```

## CSS-selector data extraction (kvSlice or JSON)

```bash
# Lightweight kv form: --extract-rules KEY=SELECTOR
hasdata web-scraping --url "https://quotes.toscrape.com" \
  --extract-rules "quote=.quote .text" \
  --extract-rules "author=.quote .author" \
  --raw | jq .

# JSON form for complex selectors / attributes
hasdata web-scraping --url "$URL" \
  --extract-rules-json '{"title":"h1","links":"a @href","price":".price-now"}' \
  --raw
```

`@href`, `@src`, etc. extract attributes. Without `@`, extracts text content.

## AI extraction (LLM-driven)

```bash
hasdata web-scraping --url "$URL" \
  --ai-extract-rules-json '{
    "headline": {"type": "string", "description": "the main story headline"},
    "comments_count": {"type": "number"},
    "is_paid_content": {"type": "boolean"},
    "tags": {"type": "list", "description": "topic tags"},
    "author": {"type": "item", "output": {
      "name": {"type": "string"},
      "verified": {"type": "boolean"}
    }}
  }' --raw | jq .
```

Supported types: `string`, `number`, `boolean`, `list`, `item` (nested object — defines its shape under `output`).

## Tag filtering

- `--include-only-tags "main,article"` (comma-joined CSS selectors) — keep only matching elements
- `--exclude-tags script --exclude-tags style` (repeatable) — remove elements

```bash
hasdata web-scraping --url "$URL" \
  --output-format markdown \
  --include-only-tags "article,main" \
  --exclude-tags script --exclude-tags style --exclude-tags nav \
  --raw | jq -r .markdown
```

## URL blocklist

```bash
--block-urls-json '["**.googletagmanager.com/**","**.doubleclick.net/**"]'
```

Glob patterns block specific subresource URLs from loading.

## Saving binary output

The `web-scraping` response is JSON, but if `--output-format` is set to a single non-JSON format, the wrapped result is still JSON. Use `jq -r .markdown > file.md` to extract text. For screenshots specifically, the response contains a screenshot URL — fetch it separately with `curl`.

## Non-obvious use cases

- **Page-to-prompt grounding** — `--output-format markdown` produces clean LLM-ready text from any URL. Strip nav/ads with `--exclude-tags script --exclude-tags style --exclude-tags nav`. Beats fetch + regex.
- **JavaScript-rendered SPAs that `curl` can't read** — default `--js-rendering` uses a real browser, so React/Vue/Angular pages return their hydrated DOM, not the empty shell.
- **Bypass rudimentary anti-bot** — `--proxy-type residential` rotates through residential IPs; use only when datacenter (default) gets blocked.
- **Geo-targeted content** — `--proxy-country DE` to see what users in Germany see (different prices, currencies, A/B variants, or geo-blocked content).
- **Quick "is this page real" check** — `--screenshot` (default on) returns a screenshot URL in the response; verify visually without manually opening the URL.
- **Universal price extractor** — `--ai-extract-rules-json '{"price":{"type":"number"},"currency":{"type":"string"},"in_stock":{"type":"boolean"}}'` works on arbitrary retailer pages without writing a CSS selector. Cheaper than maintaining per-site selectors when the user only needs occasional spot-checks.
- **Cookie-walled / login-walled "view-source" peek** — `--headers Cookie=session=...` injects auth cookies if the user has them. Use sparingly and only with explicit user permission.
- **Convert paginated lists to a clean record set** — combine `--js-scenario-json` (click "Load more" 5×) with `--ai-extract-rules-json` (pull the list shape). Lets you scrape paginated SPAs with one CLI call instead of N.
- **Headless screenshot of a layout** — set `--js-rendering`, `--no-block-resources` (so CSS loads), and capture the screenshot URL from the response. Useful for "render this URL and show me what it looks like".
- **Markdown for RAG ingestion** — pipe `.markdown` from many URLs into a JSONL corpus; embed and store. The CLI handles JS, ads, images so you don't need a custom pipeline.
- **Fallback for any other API** — when no purpose-built API exists for a vertical (e.g. niche directories, government pages, less-popular real-estate sites), `web-scraping` is the catch-all.
- **Detect content changes** — schedule `web-scraping --url X --output-format markdown` and diff the output across runs to flag pricing-page or terms-of-service changes.
- **Read PDFs / non-HTML resources** — `--output-format text` works on text-extractable PDFs accessible via URL (the underlying renderer handles them).
- **AI extraction for forms or tables** — pages with structured data in HTML tables are easy: `--ai-extract-rules-json '{"rows":{"type":"list","output":{"name":{"type":"string"},"value":{"type":"number"}}}}'`. The model fills in nested rows.

## Common patterns

```bash
# Full-page markdown for RAG
hasdata web-scraping --url "$URL" \
  --output-format markdown --no-screenshot --no-block-resources \
  --raw | jq -r .markdown >> corpus.md

# JS-heavy SPA: wait + scroll
hasdata web-scraping --url "$URL" \
  --js-scenario-json '[{"wait":2000},{"scrollY":2000},{"wait":1500}]' \
  --wait-for ".item" \
  --output-format html --raw | jq -r .html

# Extract structured data from an arbitrary page
hasdata web-scraping --url "$URL" \
  --ai-extract-rules-json '{"price":{"type":"number"},"in_stock":{"type":"boolean"}}' \
  --raw | jq .
```
