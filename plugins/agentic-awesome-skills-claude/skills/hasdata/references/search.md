# Search & SERP APIs

Pre-parsed JSON for Google, AI Mode, Bing, and the specialized Google panels. Synchronous `GET` under `https://api.hasdata.com`.

| Endpoint | Returns |
|---|---|
| `/scrape/google/serp` | Full SERP — organic + every rich-snippet block |
| `/scrape/google-light/serp` | Organic only |
| `/scrape/google/ai-mode` | Gemini answer + references |
| `/scrape/google/ai-overview` | AI Overview block |
| `/scrape/google/news` | News articles |
| `/scrape/google/shopping` | Shopping carousel |
| `/scrape/google/images` | Image search |
| `/scrape/google/events` | Local events |
| `/scrape/google/short-videos` | Short-video panel |
| `/scrape/google/immersive-product` | Expanded product pop-up |
| `/scrape/google-trends/search` | Trends + related queries |
| `/scrape/bing/serp` | Bing SERP |

For `/scrape/google/flights`, see `travel.md`.

## Google SERP

```python
import requests

resp = requests.get(
    "https://api.hasdata.com/scrape/google/serp",
    headers={"x-api-key": API_KEY},
    params={"q": "coffee beans", "gl": "us", "hl": "en", "num": 100},
    timeout=300,
)
for hit in resp.json().get("organicResults", []):
    print(hit["position"], hit["title"], hit["link"])
```

### Query parameters

| Param | Default | Notes |
|---|---|---|
| `q` | — | **Required.** |
| `location` | — | Canonical, e.g. `"Austin,Texas,United States"`. Hyper-local. |
| `uule` | — | Pre-encoded location (mutually exclusive with `location`). |
| `domain` | `google.com` | `google.co.uk`, `google.de`, … |
| `gl` | — | 2-letter country (`us`, `de`, `jp`). |
| `hl` | — | 2-letter UI language. |
| `lr` | — | Content-language filter (`lang_en`). |
| `tbs` | — | Filters — `qdr:d|w|m|y` for time, `li:1` verbatim, sort, image type. |
| `safe` | — | `active` / `off`. |
| `start` | `0` | Pagination offset. |
| `num` | `10` | Results/page. **Max 100** |
| `tbm` | — | `isch` images, `vid`, `nws`, `shop`, `lcl`. |
| `deviceType` | — | `desktop`, `mobile`, `tablet`. |

### Response keys

```
requestMetadata, searchInformation, organicResults, knowledgeGraph, answerBox,
aiOverview, topStories, newsResults, localResults, inlineShoppingResults,
inlineVideos, inlineImages, recipesResults, perspectives, discussionsAndForums,
relatedQuestions, relatedSearches, adResults, pagination
```

Rich-snippet keys appear **only when the SERP shows that block** — always `data.get(key, default)`.

### Tips

- `gl`/`hl` change ranking, not just localization. Run the same `q` with different `gl` to study geo-bias.
- `location="Austin,Texas,United States"` produces hyperlocal results that differ from `gl=us` alone.

## Google Light SERP

Same params as full SERP, but the response is trimmed to a few keys — typically `requestMetadata`, `searchInformation`, `organicResults`, `relatedSearches`, and `pagination` when present. Use for crawler seeding and link discovery when you don't need the heavier rich-snippet blocks.

## Google AI Mode

```python
resp = requests.get(
    "https://api.hasdata.com/scrape/google/ai-mode",
    headers={"x-api-key": API_KEY},
    params={"q": "is coffee good for health?", "location": "Austin,Texas,United States"},
    timeout=300,
)
```

Params: `q` (required), `location`, `uule`, `gl`. Response:

```json
{
  "requestMetadata": {...},
  "textBlocks": [
    {"type":"heading","snippet":"..."},
    {"type":"paragraph","snippet":"...","snippetHighlightedWords":["..."]},
    {"type":"list","list":[{"snippet":"..."}]},
    {"type":"table","table":{...}},
    {"type":"code","code":"..."}
  ],
  "references": [{"index":1,"link":"...","title":"...","snippet":"...","source":"..."}]
}
```

Block types observed in practice: `heading`, `paragraph`, `list`, `table`, `code`. Always switch on `type` rather than assuming a fixed set.

Pattern: AI Mode for the answer → `/scrape/web` (markdown) on each `references[].link` → cited RAG context.

## Google News / Shopping / Bing

Same shape: `q` + `gl`/`hl`/`location`. News supports `tbs=qdr:d|w|m|y` for time windows. Bing returns the same key set as Google SERP — useful for cross-engine consensus (disagreement = contested topic).

## Patterns

### Pagination

```python
def all_organic(q, target=300):
    out, start = [], 0
    while len(out) < target:
        page = requests.get(
            "https://api.hasdata.com/scrape/google-light/serp",
            headers={"x-api-key": API_KEY},
            params={"q": q, "num": 100, "start": start},
            timeout=300,
        ).json().get("organicResults", [])
        if not page:
            break
        out.extend(page)
        start += 100
    return out[:target]
```

### Reverse lookup (email / phone / domain → identity)

```python
requests.get(
    "https://api.hasdata.com/scrape/google/serp",
    headers={"x-api-key": API_KEY},
    params={"q": f'"{literal}"', "num": 20},
    timeout=300,
).json().get("organicResults", [])
```

Quoted literals (emails, phones, error strings) usually surface the canonical mention.

### Indexation check

```python
def is_indexed(url):
    r = requests.get(
        "https://api.hasdata.com/scrape/google-light/serp",
        headers={"x-api-key": API_KEY},
        params={"q": f"site:{url}", "num": 1}, timeout=300,
    )
    return bool(r.json().get("organicResults"))
```
