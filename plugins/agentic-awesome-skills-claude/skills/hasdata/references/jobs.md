# Jobs APIs — Indeed & Glassdoor

| Endpoint | Returns |
|---|---|
| `/scrape/indeed/listing` | Indeed search results |
| `/scrape/indeed/job` | Single Indeed job detail |
| `/scrape/glassdoor/listing` | Glassdoor search results |
| `/scrape/glassdoor/job` | Single Glassdoor job (incl. salary band, company snippet) |

All synchronous `GET`.

## Indeed Listing

```python
import requests

resp = requests.get(
    "https://api.hasdata.com/scrape/indeed/listing",
    headers={"x-api-key": API_KEY},
    params={
        "keyword":  "software engineer",
        "location": "New York, NY",
        "sort":     "date",
        "domain":   "www.indeed.com",
        "start":    0,
    },
    timeout=300,
)
```

| Param | Notes |
|---|---|
| `keyword` | **Required.** |
| `location` | **Required.** |
| `sort` | `date`, `relevance` (default). |
| `domain` | Country site — `www.indeed.com`, `uk.indeed.com`, `de.indeed.com`. |
| `start` | Offset, **steps of 10**. |

Response: `jobs` array with `title`, `company`, `location`, `salary`, `description`, `postedAt`, `link`, `jobKey`. Salary is free-form string — parse with regex.

## Indeed Job

Pass `jobKey` from listing → returns full description, requirements, benefits, company URL.

## Glassdoor Listing & Job

```python
params = {"keyword": "software engineer", "location": "New York, NY", "sort": "recent"}
# pagination: pass back nextPageToken
```

| Param | Notes |
|---|---|
| `keyword`, `location` | **Required.** |
| `sort` | `recent` (default), `relevant`. |
| `domain` | Country site. |
| `nextPageToken` | Cursor pagination. |

## Patterns

### Salary band

```python
import re, statistics

def salary_band(role, location):
    page = requests.get(
        "https://api.hasdata.com/scrape/indeed/listing",
        headers={"x-api-key": API_KEY},
        params={"keyword": role, "location": location}, timeout=300,
    ).json()
    nums = [int(m.replace(",", ""))
            for j in page.get("jobs", [])
            for m in re.findall(r"\$([\d,]+)", j.get("salary") or "")]
    if not nums: return None
    return {"n": len(nums), "median": statistics.median(nums)}
```

### Hiring velocity by company

```python
from collections import Counter

page = indeed_listing(role, loc, sort="date")
Counter(j.get("company") for j in page.get("jobs", []))
```

Run weekly; sustained increases often precede earnings/PR signals.

### Pagination differs

```python
# Indeed: numeric start
for p in range(10):
    page = indeed_listing(kw, loc, start=p * 10)

# Glassdoor: cursor token
out, token = [], None
while True:
    page = glassdoor_listing(kw, loc, next_token=token)
    out.extend(page.get("jobs", []))
    token = page.get("nextPageToken")
    if not token: break
```

## Gotchas

- **Salary is free-form string.** Always regex-parse.
- **Indeed = numeric start (10), Glassdoor = token.** Don't mix.
- **`domain` matters for non-US.** `uk.indeed.com`, `ca.indeed.com`, etc.
- **Prefer the API + pagination for bulk.** Reach for the matching Scraper Job only when you want webhook-driven fan-out across many keyword × location pairs without managing the polling loop yourself.
