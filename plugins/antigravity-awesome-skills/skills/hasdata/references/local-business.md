# Local Business APIs — Google Maps, Yelp, YellowPages

| Endpoint | Returns |
|---|---|
| `/scrape/google-maps/search` | Search results in a viewport |
| `/scrape/google-maps/place` | Single place details |
| `/scrape/google-maps/reviews` | Reviews for a place, paginated |
| `/scrape/google-maps/photos` | Photo gallery |
| `/scrape/google-maps/posts` | Owner-published posts (offers, events, announcements) |
| `/scrape/google-maps/contributor-reviews` | All reviews by a Google reviewer |
| `/scrape/yelp/search` | Yelp search |
| `/scrape/yelp/place` | Yelp business detail |
| `/scrape/yellowpages/search` | YellowPages search |
| `/scrape/yellowpages/place` | YellowPages business detail |

All synchronous `GET`.

## Google Maps Search

```python
import requests

resp = requests.get(
    "https://api.hasdata.com/scrape/google-maps/search",
    headers={"x-api-key": API_KEY},
    params={"q": "Pizza", "ll": "@40.7455,-74.0083,14z"},
    timeout=300,
)
```

| Param | Notes |
|---|---|
| `q` | **Required.** Free-form query. |
| `ll` | `@LAT,LNG,ZOOMz` viewport — **lat/lng + zoom, not a city name**. Required for tight pagination. |
| `domain`, `gl`, `hl` | Standard. |
| `start` | Pagination offset, **steps of 20**. |

Response: `localResults` — each entry has `position`, `title`, `placeId`, `dataId`, `kgmid`, `thumbnail`, `phone`, `address`, `website`, `description`, `workingHours` (object with `timezone` + `days[]`), `openState`, `rating`, `reviews`, `type` + `types[]` (categories), `price`, `priceDescription`, `gpsCoordinates`, `serviceOptions[]`, `extensions` (offerings, accessibility, payments, …), `menu`. Feed `placeId`/`dataId` into `/place` and `/reviews`.

## Google Maps Place

```python
params = {"placeId": "ChIJFU2bda4SM4cRKSCRyb6pOB8"}
```

Returns full place detail — coordinates, hours by day, phone, website, popular times, attributes (delivery, dine-in), photo summary.

## Google Maps Reviews

```python
def reviews(place_id=None, data_id=None, sort_by="newestFirst", token=None):
    params = {}
    if place_id: params["placeId"] = place_id
    if data_id:  params["dataId"]  = data_id
    if sort_by:  params["sortBy"]  = sort_by
    if token:    params["nextPageToken"] = token
    return requests.get(
        "https://api.hasdata.com/scrape/google-maps/reviews",
        headers={"x-api-key": API_KEY},
        params=params, timeout=300,
    ).json()
```

| Param | Notes |
|---|---|
| `placeId` / `dataId` | Pass one. `dataId` is the hex pair from Maps results. |
| `sortBy` | `newestFirst`, `highestRating`, `lowestRating`, `mostRelevant`. |
| `topicId` | Filter by review topic. |
| `nextPageToken` | Cursor pagination. |

## Google Maps Posts

```python
resp = requests.get(
    "https://api.hasdata.com/scrape/google-maps/posts",
    headers={"x-api-key": API_KEY},
    params={"placeId": "ChIJ..."},      # or dataId="0x...:0x..."
    timeout=300,
)
for p in resp.json().get("posts", []):
    print(p["postedAt"], p["description"][:120], p.get("cta", {}).get("url"))
```

Either `placeId` **or** `dataId` is required. Optional: `hl` (UI language), `nextPageToken` (cursor pagination). 10 credits/call.

Per-post fields (verified live): `postId`, `locationId`, `title`, `description`, `image`, `cta` (`label` + `url`), `createdAt` (ISO), `postedAt` (human-readable), `shareUrl`, `postUrl`. Response top-level: `posts`, `pagination`, `source`, `requestMetadata`.

Posts surface current offers, holiday hours, events, and product launches the business is actively promoting. Cheaper signal than the homepage scrape, and `cta.url` is the canonical landing page.

## Yelp & YellowPages

```python
# Yelp
params = {"keyword": "McDonald's", "location": "New York, NY", "start": 0}  # steps of 10
# YellowPages
params = {"keyword": "Plumbers", "location": "New York, NY", "page": 1}
```

YellowPages is US-only — EU/APAC searches return nothing useful.

## Patterns

### Lead-gen with emails (Maps + Web Scraping)

Maps results have website + phone but **not email**. Combine with the Web Scraping API's `extractEmails` only for public business contact pages, legitimate outreach, and workflows that honor opt-out, privacy-law, rate, and terms-of-service constraints:

```python
leads = []
for biz in maps_results.get("localResults", []):
    site = biz.get("website")
    if not site: continue
    page = requests.post(
        "https://api.hasdata.com/scrape/web",
        headers={"x-api-key": API_KEY},
        json={"url": site, "extractEmails": True},
        timeout=300,
    ).json()
    leads.append({
        "name":    biz["title"],
        "phone":   biz.get("phone"),
        "website": site,
        "emails":  page.get("extractedEmails") or [],
    })
```

For higher volume, switch to the `contacts` Scraper Job (see `scraper-jobs.md`) only when you have a legitimate purpose, a compliant outreach process, and rate/opt-out controls.

### New-business discovery

Filter Maps by review count `< 5` — usually means recently opened.

```python
new = [b for b in localResults if (b.get("reviews") or 0) < 5]
```

### Multi-location chain mapping

Search the brand name; every `localResults` entry is a branch.

## Gotchas

- **`ll` is a viewport, not a city.** `@lat,lng,zoom`. Pasting "Brooklyn" fails.
- **Pagination steps differ.** Maps `start` = +20, Yelp `start` = +10, Maps Reviews uses `nextPageToken`.
- **`placeId` vs `dataId`** — Place prefers `placeId`; Reviews accepts either.
- **YellowPages is US-only.**
