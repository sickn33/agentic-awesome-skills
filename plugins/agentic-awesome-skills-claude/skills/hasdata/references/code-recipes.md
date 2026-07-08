# Code recipes — wiring HasData into your code

## Ground rules

- **Base URL:** `https://api.hasdata.com`. Header `x-api-key` on every request.
- **Methods:** Scraper APIs are `GET`; Web Scraping is `POST`; Scraper Jobs use `POST` (submit) + `GET` (status/results) + `DELETE` (stop).
- **Key handling:** read from env (`HASDATA_API_KEY`). Never hardcode, never log.
- **Timeouts:** **client timeout ≥ 300 s.** HasData's deadline is 300 s; shorter clients get phantom failures while still being billed.
- **Retries:** `429` and `5xx` only with exponential backoff + jitter. Never retry `4xx`.
- **Concurrency:** cap at plan limit. Free tier = 1.
- **Success signal:** sync APIs require `body.requestMetadata.status === "ok"`. HTTP 200 alone isn't enough.

## Status codes

| Code | Meaning | Action |
|---|---|---|
| 200 + `status:"ok"` | OK | Use body |
| 401 | Bad/missing key | Fix — don't retry |
| 403 | Quota exhausted | Don't retry |
| 429 | Concurrency cap | Backoff + retry |
| 500 | Server error | Retry |

## Python — minimal client

```python
import os, requests

class HasData:
    BASE = "https://api.hasdata.com"

    def __init__(self, api_key=None, timeout=300):
        self.s = requests.Session()
        self.s.headers["x-api-key"] = api_key or os.environ["HASDATA_API_KEY"]
        self.timeout = timeout

    def get(self, path, **params):
        r = self.s.get(f"{self.BASE}{path}", params=params, timeout=self.timeout)
        r.raise_for_status()
        body = r.json()
        if body.get("requestMetadata", {}).get("status") != "ok":
            raise RuntimeError(f"hasdata not-ok: {body.get('requestMetadata')}")
        return body

    def post(self, path, body):
        r = self.s.post(f"{self.BASE}{path}", json=body, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

hd = HasData()
serp = hd.get("/scrape/google/serp", q="coffee", num=20)["organicResults"]
md   = hd.post("/scrape/web", {"url": "https://example.com", "outputFormat": ["markdown"]})["markdown"]
```

## Python — retry + bounded concurrency

```python
import time, random
from concurrent.futures import ThreadPoolExecutor, as_completed
from requests import HTTPError

def with_retry(fn, attempts=5, base=1.0, cap=60.0):
    for i in range(attempts):
        try:
            return fn()
        except HTTPError as e:
            code = e.response.status_code
            if code == 429 or 500 <= code < 600:
                time.sleep(min(cap, base * 2 ** i) + random.random())
                continue
            raise
    raise RuntimeError("retry exhausted")

def scrape_many(urls, workers=5):
    out = {}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(lambda u=u: hd.post("/scrape/web", {"url": u, "outputFormat": ["markdown"]})): u
                for u in urls}
        for f in as_completed(futs):
            try:
                out[futs[f]] = f.result().get("markdown")
            except Exception as e:
                out[futs[f]] = e
    return out
```

Cap `workers` at your plan's concurrency — anything higher just generates `429`s.

## TypeScript — minimal client

```typescript
const BASE = "https://api.hasdata.com";
const KEY  = process.env.HASDATA_API_KEY!;

async function get<T = any>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const r = await fetch(`${BASE}${path}?${qs}`, {
    headers: { "x-api-key": KEY },
    signal:  AbortSignal.timeout(300_000),
  });
  if (!r.ok) throw new Error(`HasData ${r.status} ${await r.text()}`);
  const body = await r.json() as any;
  if (body?.requestMetadata?.status && body.requestMetadata.status !== "ok") {
    throw new Error(`HasData not-ok: ${JSON.stringify(body.requestMetadata)}`);
  }
  return body as T;
}

async function post<T = any>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(300_000),
  });
  if (!r.ok) throw new Error(`HasData ${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

// Bounded concurrency, no deps
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>) {
  const out: R[] = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}
```

## Pagination cheat sheet

| Endpoint family | Pagination |
|---|---|
| Google SERP / Light SERP / Bing | `start` + `num` (max 100) |
| Google Maps Search | `start` (steps of 20) |
| Yelp Search | `start` (steps of 10) |
| Google Maps Reviews / Glassdoor / Airbnb | `nextPageToken` |
| Indeed / YellowPages / Amazon Search | `start` or `page` |
| Shopify Products | `page` (with `limit` ≤ 250) |
| Scraper-Job results | `page` + `limit` (max 100) until `meta.currentPage >= meta.lastPage` |

## Pre-ship checklist

- [ ] Key from env, never logged.
- [ ] All HTTP timeouts ≥ 300 s.
- [ ] `requestMetadata.status === "ok"` checked on every sync response.
- [ ] Backoff on 429 + 5xx; never on 4xx.
- [ ] Concurrency capped at plan limit.
- [ ] Job `id` (from submit response) persisted to durable storage immediately.
- [ ] Webhooks paired with polling fallback.
- [ ] Result files downloaded immediately on `scraper.job.finished`.
