---
name: hasdata
description: Use HasData APIs for web scraping and structured web data extraction.
risk: safe
source: official
source_type: official
source_repo: HasData/hasdata-cli
license: MIT
license_source: "https://github.com/HasData/hasdata-cli/blob/main/LICENSE"
date_added: "2026-06-04"
---

# HasData

Cloud platform for extracting public web data. One API key, three execution modes. All endpoints sit under `https://api.hasdata.com` and authenticate with `x-api-key`.

```bash
curl -G 'https://api.hasdata.com/scrape/google/serp' \
  --data-urlencode 'q=coffee' \
  -H 'x-api-key: <your-api-key>'
```

`401` invalid key, `403` quota exhausted, `429` concurrency cap, `500` server error (retry).

## When to Use

Use this skill when:

- The user needs web scraping.
- The user needs search engine results.
- The user needs structured data extraction.
- The user needs ecommerce, travel, jobs, or local business data.
- The user explicitly asks about HasData.

## Three execution modes

| Mode | Latency | When | Endpoint |
|---|---|---|---|
| **Web Scraping API** | seconds | Arbitrary URL — JS rendering, CSS/AI extraction, screenshots | `POST /scrape/web` |
| **Scraper APIs** (sync) | seconds | Pre-parsed JSON for known platforms (Google, Amazon, Zillow, …) | `GET /scrape/<vertical>/<resource>` |
| **Scraper Jobs** (async) | minutes–hours | Bulk extraction, recursive crawling, webhook fan-out | `POST /scrapers/<slug>/jobs` |

**Decision rule.** Default to a **Scraper API** when one exists for the platform (pre-parsed JSON, no selector maintenance). Use **Web Scraping** for arbitrary URLs not covered by an API. Reach for a **Scraper Job** only when no API equivalent exists — `crawler`, `contacts`, `sec-edgar`, `amazon-bestsellers`, `amazon-product-reviews` — *or* when async fan-out + webhooks save engineering time over a paginated client loop.

## Always-true response shape

```json
{ "requestMetadata": { "id": "…", "status": "ok", "url": "…" }, "...": "endpoint-specific" }
```

Treat data as valid only if `requestMetadata.status === "ok"`. HTTP 200 alone isn't enough.

## High-leverage patterns

- **SERP-first enrichment.** Google SERP can surface public snippets for company and professional-profile lookup. Use it for business or authorized research, avoid unnecessary direct scraping, and treat personal email/phone lookup as allowed only with a legitimate purpose and user authorization.
- **AI Mode + verify.** `/scrape/google/ai-mode` for the answer + references → `/scrape/web` (markdown) on each reference URL → cited RAG context, no vector DB.
- **Maps → leads.** `/scrape/google-maps/search` returns business websites and phones; collect contact details only from public, permitted sources and apply opt-out, rate, and privacy-law constraints before any outreach use.
- **Crawler → corpus.** `crawler` Scraper Job with `outputFormat: ["markdown"]` + `includePaths: "/docs/.+"` produces an LLM-ready corpus in one submission.
- **Pre-extracted via SERP rich snippets.** `knowledgeGraph`, `localResults`, `inlineShoppingResults`, `relatedQuestions` carry pre-parsed public facts. Always check them before considering direct page access.

## When to call from code (the wiring)

- **Auth:** `x-api-key` header on every request. Read from `HASDATA_API_KEY` env. Never hardcode, never log.
- **Timeouts:** **set client timeout ≥ 300 s.** HasData's own deadline is 300 s; shorter clients produce phantom failures while still being billed on completion.
- **Retries:** `429` and `5xx` only — exponential backoff, jitter. Never retry `4xx` (auth, validation).
- **Concurrency:** cap at your plan limit. The free tier is 1; anything higher just generates `429`s.
- **Async jobs:** the submit response handle is `body.id` (integer), **not `jobId`**. Persist it immediately. Poll `GET /scrapers/jobs/<id>` every 10–30 s with backoff; treat webhooks as best-effort and always pair with polling. On `finished` the status carries `data: {csv, json, xlsx}` short-lived URLs — download immediately.

See `references/code-recipes.md` for ready-to-paste Python and TypeScript clients with retry, backoff, bounded concurrency, and the full job lifecycle.

## Common gotchas

- **300 s server deadline.** Match client timeout.
- **Disable `jsRendering` first**, enable only if the page needs it — most static pages parse fine without a headless browser.
- **No `cookies` parameter** — cookies go through `headers["Cookie"]`.
- **`includePaths` regex is case-sensitive.** `/blog/.+` won't match `/Blog/...`.
- **Scraper Job `data` is double-wrapped.** Each row is `body.data[i].data`; outer wraps with `id`, `jobId`, `dataId`, `createdAt`, `updatedAt`.
- **`requestMetadata.status === "ok"` is the only success signal.** HTTP 200 alone isn't enough.
- **Webhooks are best-effort with 3 retries.** Always have a polling fallback.

## References

- [`references/web-scraping.md`](references/web-scraping.md) — `POST /scrape/web` parameters, JS scenarios, AI extraction, cookie auth.
- [`references/search.md`](references/search.md) — Google SERP / Light / AI Mode / News / Shopping / Bing / Trends + pagination.
- [`references/ecommerce.md`](references/ecommerce.md) — Amazon (product, search, seller, seller-products) and Shopify.
- [`references/real-estate.md`](references/real-estate.md) — Zillow, Redfin (bracketed filters).
- [`references/travel.md`](references/travel.md) — Airbnb, Booking, Google Flights (occupancy rules, token pagination, IATA codes).
- [`references/local-business.md`](references/local-business.md) — Maps (search/place/reviews/photos/posts), Yelp, YellowPages.
- [`references/jobs.md`](references/jobs.md) — Indeed and Glassdoor.
- [`references/youtube.md`](references/youtube.md) — YouTube search / video / channel / transcript.
- [`references/scraper-jobs.md`](references/scraper-jobs.md) — async submit/poll/results, Crawler, Contacts, SEC EDGAR, webhook receiver.
- [`references/code-recipes.md`](references/code-recipes.md) — Python / TypeScript clients with retry, backoff, concurrency, polling.

## Resources

- Sitemap: <https://docs.hasdata.com/llms.txt>
- API status codes: <https://docs.hasdata.com/api-codes>
- Credits & concurrency: <https://docs.hasdata.com/credits-and-concurrency>
- Dashboard: <https://app.hasdata.com>

## Limitations

* Requires access to HasData services and valid credentials.
* Data quality and available fields depend on the target website and extraction method used.
* JavaScript-heavy websites may require rendering, which can affect performance and cost.
* Use only for public data or content the user is authorized to access; respect site terms, robots/access controls, privacy law, and rate limits.
* Rate limits, quotas, and account restrictions may apply depending on the endpoint and subscription plan.
