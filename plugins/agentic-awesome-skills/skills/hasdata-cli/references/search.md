# Search references

Subcommands: `google-serp`, `google-serp-light`, `google-ai-mode`, `google-news`, `google-shopping`, `bing-serp`, `google-trends`, `google-images`, `google-events`, `google-short-videos`, `google-immersive-product`.

For `google-flights`, see `travel.md`.

Run `hasdata <api> --help` for the live, authoritative flag set. Below are the commonly-used flags and example invocations.

---

## google-serp (10 credits)

```bash
hasdata google-serp --q "QUERY" [--gl COUNTRY] [--hl LANG] [--num 10] [--start 0] --raw | jq .
```

Common flags:
- `--q TEXT` (required) — search query
- `--gl us|gb|ca|de|fr|...` — country code; affects results
- `--hl en|es|fr|de|...` — UI language
- `--num 10..100` — results per page
- `--start 0|10|20...` — pagination offset (multiples of 10)
- `--location "Austin,Texas,United States"` — Google canonical location
- `--device-type desktop|mobile|tablet`
- `--tbm isch|vid|nws|shop|lcl` — search type
- `--safe active|off`
- `--lr lang_en --lr lang_fr` — restrict to language(s)
- `--domain google.com|google.co.uk|...`
- `--tbs cdr:1,cd_min:10/17/2018,cd_max:3/8/2021` — advanced search filters

Useful response fields (via `jq`):
- `.organic_results[] | {title, link, snippet}` — main results
- `.ai_overview` — AI Overview block (when present)
- `.answer_box`, `.knowledge_graph`, `.related_searches`, `.people_also_ask`
- `.local_results`, `.shopping_results`, `.news_results`

Example — top-10 organic for prompt grounding:
```bash
hasdata google-serp --q "$Q" --num 10 --raw \
  | jq -r '.organic_results[] | "- \(.title): \(.snippet)"'
```

## google-serp-light (5 credits)

Same flags as `google-serp` but cheaper and returns a single page. Use when the user wants quick results and doesn't need PAA/AI Overview/local sections.

## google-ai-mode (5 credits)

Returns Google's AI Mode answer for a query. Same `--q` / `--gl` / `--hl` semantics.

## google-news (10 credits)

```bash
hasdata google-news --q "QUERY" [--gl us] [--hl en] --raw | jq '.news_results[]'
```

Per-article fields: `title`, `link`, `source.name`, `date`, `snippet`, `thumbnail`.

## google-shopping (10 credits)

```bash
hasdata google-shopping --q "PRODUCT" [--gl us] --raw | jq '.shopping_results[]'
```

Per-result: `title`, `link`, `price`, `extracted_price`, `source`, `rating`, `reviews`, `delivery`.

## bing-serp (10 credits)

```bash
hasdata bing-serp --q "QUERY" [--cc us] [--setlang en] --raw | jq '.organic_results[]'
```

Use when the user explicitly asks for Bing or wants a non-Google second opinion.

## google-trends (5 credits)

```bash
hasdata google-trends --q "TERM" [--geo US] [--cat 0] [--time "today 12-m"] --raw | jq .
```

Multiple terms for comparison: `--q "term1,term2,term3"` (comma-separated, max 5).

## google-images (5 credits)

```bash
hasdata google-images --q "QUERY" --raw | jq '.images_results[] | {title, original, source}'
```

## google-events (5 credits)

```bash
hasdata google-events --q "concerts in austin" [--gl us] --raw | jq '.events_results[]'
```

## google-short-videos (10 credits) / google-immersive-product (5 credits)

Less common — run `--help` to see flags when needed.

---

## Non-obvious use cases

- **Fact-check a claim before answering** — instead of relying on training data, run `google-serp --q "EXACT CLAIM"` and check whether top results corroborate or contradict.
- **Resolve "what is the URL for X?"** — agents often hallucinate URLs. `google-serp --q "X official site" --num 3` and pick the result with the matching domain.
- **Source-find a quote** — `google-serp --q "\"the exact quoted text here\""` (escape the inner quotes). Returns the page that originated it.
- **Compare same query across regions** — same `--q`, different `--gl us|gb|de|fr` to see how SERP differs by geo. Useful for international SEO and "what do users in country Y see".
- **Time-bound search** — `--tbs qdr:d` (past day), `qdr:w` (week), `qdr:m` (month), `qdr:y` (year). Combine with `google-news` for fresh-only news. Or `--tbs cdr:1,cd_min:M/D/YYYY,cd_max:M/D/YYYY` for an explicit window.
- **Site-restricted search** — `--q "site:example.com TOPIC"` to search within one domain (better than scraping the site's own search box).
- **"What's been written about X recently?"** — `google-news --q "X" --gl us` then `jq` over `.news_results[] | select(.date | test("hours? ago|day ago"))`.
- **Discover competitors** — `google-serp --q "best alternatives to PRODUCT"` followed by extracting brand names from the top results' titles.
- **Find documentation links** — `google-serp --q "LIBRARY official docs"` instead of guessing a URL pattern.
- **Translate search intent** — `--hl de --gl de --q "the English query"` shows German-language ranking; useful for multi-locale SEO checks.
- **Trends over time** — `google-trends --q "term1,term2"` (comma-separated, ≤5 terms) for relative interest curves. Better than guessing "is X popular now" from training data.
- **Image-driven research** — `google-images --q "X"` to grab source URLs; pipe top results into `web-scraping` to read context.
- **Map-distance trick** — for "things near X", use `google-maps --ll "@LAT,LNG,Zz"` not a SERP query — much higher signal for proximity intent.
- **Fact-check pricing** — when training data has stale prices for SaaS or subscription services, search and read the pricing page rather than answering from memory.

## Picking the right SERP variant

- Use `google-serp-light` when only top organic results are needed (skips PAA / AI overview / local sections).
- Use `google-serp` when you need the full SERP feature set (PAA, AI overview, knowledge graph, local pack).
- Cache results client-side when running the same query repeatedly — the CLI does not cache.
