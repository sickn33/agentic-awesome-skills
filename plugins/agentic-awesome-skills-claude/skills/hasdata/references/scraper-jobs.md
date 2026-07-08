# Scraper Jobs — async, bulk

Use only when there's no Scraper-API equivalent (`crawler`, `contacts`, `sec-edgar`, `amazon-bestsellers`, `amazon-product-reviews`) or when you want webhook-driven fan-out without managing your own polling loop. Otherwise the matching Scraper API + paginated client loop is simpler.

| Slug | Notes |
|---|---|
| `crawler` | Recursive site crawl. Accepts every Web Scraping API parameter. |
| `contacts` | URL list → emails / phones / social profiles. |
| `sec-edgar` | Bulk SEC filings by CIK / ticker / company name. |
| `google-serp`, `google-maps`, `google-maps-reviews`, `google-trends` | Bulk Google. |
| `amazon-search`, `amazon-product`, `amazon-product-reviews`, `amazon-seller-products`, `amazon-bestsellers` | Bulk Amazon. |
| `shopify` | Multi-store crawl. |
| `zillow`, `redfin`, `airbnb` | Bulk real estate. |
| `yelp`, `yellow-pages` | Bulk local. |
| `indeed`, `glassdoor` | Bulk jobs. |

## Lifecycle

1. `POST /scrapers/<slug>/jobs` → returns the full job record. **The handle is `body.id` (numeric integer), not `jobId`** despite older doc snippets — store this. Status starts as `pending`.
2. `GET /scrapers/jobs/<id>` — poll status.
3. `GET /scrapers/jobs/<id>/results?page=…&limit=100` — once `status === "finished"`.
4. `DELETE /scrapers/jobs/<id>` — stop early (rows produced before stop are kept).

Status values: `pending` → `in_progress` → `finished` (or `stopped` if cancelled).

**Shortcut for finished jobs:** the status response on a `finished` job carries a `data` object with direct download URLs:

```json
"data": {
  "csv":  "https://f005.backblazeb2.com/file/.../{uuid}.csv",
  "json": "https://f005.backblazeb2.com/file/.../{uuid}.json",
  "xlsx": "https://f005.backblazeb2.com/file/.../{uuid}.xlsx"
}
```

For one-shot ingestion, fetch `data.json` directly instead of paging `/results`. **These URLs are short-lived** — download immediately on `finished`.

## End-to-end (Python)

```python
import os, time, requests

API_KEY = os.environ["HASDATA_API_KEY"]
H = {"x-api-key": API_KEY, "Content-Type": "application/json"}
BASE = "https://api.hasdata.com"

def submit(slug, body):
    r = requests.post(f"{BASE}/scrapers/{slug}/jobs", headers=H, json=body, timeout=60)
    r.raise_for_status()
    return r.json()["id"]                            # numeric job id — not "jobId"

def wait(job_id, poll=10, cap=60, timeout=3600):
    deadline = time.time() + timeout
    while time.time() < deadline:
        s = requests.get(f"{BASE}/scrapers/jobs/{job_id}", headers=H, timeout=60).json()
        if s["status"] in ("finished", "stopped"):
            return s
        time.sleep(poll)
        poll = min(poll * 1.5, cap)
    raise TimeoutError(job_id)

def results(job_id):
    page = 1
    while True:
        body = requests.get(
            f"{BASE}/scrapers/jobs/{job_id}/results",
            headers=H, params={"page": page, "limit": 100}, timeout=120,
        ).json()
        for row in body["data"]:
            yield row["data"]                       # double-wrapped — see below
        if body["meta"]["currentPage"] >= body["meta"]["lastPage"]:
            return
        page += 1
```

### Response shapes

Submit (live):
```json
{
  "id": 416349,                        // ← the job handle, integer
  "scraperId": 26,
  "status": "pending",
  "creditsSpent": 0,
  "dataRowsCount": 0,
  "input": { ... },
  "createdAt": "...", "updatedAt": "...",
  "scraper": { "slug": "contacts", ... },
  "columns": [ ... ]
}
```

Status (live; numeric fields arrive as **strings** when populated):
```json
{
  "id": 416349,
  "status": "finished",
  "creditsSpent": "5",                 // string!
  "dataRowsCount": "1",                // string!
  "input": { ... },
  "data": {
    "csv":  "https://f005.backblazeb2.com/.../{uuid}.csv",
    "json": "https://f005.backblazeb2.com/.../{uuid}.json",
    "xlsx": "https://f005.backblazeb2.com/.../{uuid}.xlsx"
  }
}
```

Results page:
```json
{
  "meta": {
    "total": 1, "perPage": 100,
    "currentPage": 1, "lastPage": 1,
    "firstPage": 1, "firstPageUrl": "/?page=1",
    "lastPageUrl": "/?page=1",
    "nextPageUrl": null, "previousPageUrl": null
  },
  "data": [
    {
      "id": "...", "jobId": 416349, "dataId": "...",
      "data": { /* the actual scraped row */ },
      "createdAt": "...", "updatedAt": "..."
    }
  ]
}
```

**Double `data`** — the row is `body["data"][i]["data"]`; the outer wraps with `id`, `jobId`, `dataId`, `createdAt`, `updatedAt`.

## Common body fields

- `limit` (int) — max rows. `0` = no cap.
- `webhook.url` (string, https), `webhook.events` (any subset of `scraper.job.started`, `scraper.data.scraped`, `scraper.job.finished`), `webhook.headers` (sent on every callback — pin a shared secret here).

## Webhooks

```python
# Submit with webhook
submit("indeed", {
    "keywords":  ["software engineer", "data scientist"],
    "locations": ["New York, NY", "Remote"],
    "limit":     500,
    "webhook":   {
        "url":     "https://your.app/hasdata-hook",
        "events":  ["scraper.data.scraped", "scraper.job.finished"],
        "headers": {"x-shared-secret": SHARED_SECRET},
    },
})
```

```python
from flask import Flask, request, abort
app = Flask(__name__)

@app.post("/hasdata-hook")
def hook():
    if request.headers.get("x-shared-secret") != SHARED_SECRET:
        abort(401)
    e = request.json
    if e["event"] == "scraper.data.scraped":
        save_row(e["jobId"], e["data"])
    elif e["event"] == "scraper.job.finished":
        finalize(e["jobId"])
    return "", 200                  # 2xx prevents retry
```

- Async with **3 retries** on non-2xx. **Order not guaranteed** — payload is the source of truth.
- **No documented HMAC.** Pin a shared secret via `webhook.headers`, or just fetch results via the API on `scraper.job.finished` and ignore per-row deliveries.
- **Always pair webhooks with polling.** A long quiet period probably means missed callbacks.

## Per-scraper bodies

### `crawler` — recursive site crawl

Accepts every Web Scraping API parameter applied to **every page**.

| Field | Notes |
|---|---|
| `urls` | **Required.** Seed URLs. |
| `maxDepth` | Hops from seed. |
| `includePaths` / `excludePaths` | Regex. **Case-sensitive.** |
| `limit` | Cap on pages. `0` = unlimited. |

```python
job = submit("crawler", {
    "urls":         ["https://docs.example.com"],
    "maxDepth":     5,
    "includePaths": "/docs/.+",
    "outputFormat": ["markdown"],
    "excludeTags":  ["script", "style", "nav", "footer"],
    "limit":        2000,
})
```

### `contacts` — URLs → contact info

```python
submit("contacts", {"urls": ["https://example.com/about", "https://example.com/team"]})
```

Verified row schema (one row per input URL):

```json
{
  "url": "https://example.com/about",
  "emails":       ["..."],
  "phoneNumbers": ["..."],
  "linkedin":     ["..."],
  "xcom":         ["..."],          // X / Twitter — note key is "xcom"
  "facebook":     ["..."],
  "instagram":    ["..."],
  "dribbble":     ["..."],
  "clutch":       ["..."]
}
```

Empty arrays for missing categories — never null. If you only have a domain, discover URLs first via SERP `site:example.com`.

### `sec-edgar` — bulk SEC filings

```python
submit("sec-edgar", {
    "limit":       100,
    "ciks":        ["AAPL", "789019", "Alphabet Inc."],
    "filingTypes": "10-K, 10-Q, 8-K",
    "startDate":   "2024-01-01",
    "endDate":     "2025-12-31",
})
```

`ciks` accepts CIKs, tickers, or company names mixed.

### Bulk-API equivalents

`google-serp`, `google-maps`, `amazon-search`, `indeed`, `glassdoor`, etc. Jobs accept arrays of inputs (`keywords[]`, `locations[]`, etc.). Use them when you want webhook fan-out; otherwise the synchronous Scraper API + paginated client loop is simpler.

### Crawler vs Contacts vs Web Scraping batch

- **crawler** — unknown URL set, recursive discovery.
- **contacts** — known URL list, want extracted contact fields.
- **`/scrape/batch/web`** — known URL list, want full HTML/markdown/AI extraction at >1k scale.

## Gotchas

- **Persist the job `id` immediately** (the integer from the submit response — *not* `jobId`). Only handle to status, results, stop.
- **Result file retention is short.** Download right after `finished`.
- **Webhooks are best-effort.** Always poll as a backup.
- **`includePaths` regex is case-sensitive.**
- **Status `stopped` is terminal.** Rows already produced remain available.
- **Don't poll faster than every 10 s** — wastes concurrency cap.
- **Double-wrapped results** — `body["data"][i]["data"]`, not `body["data"][i]`.
