---
name: hasdata-cli
description: Command-line access to search, scraping, and structured web data.
risk: safe
source: official
source_type: official
source_repo: HasData/hasdata-cli
license: MIT
license_source: "https://github.com/HasData/hasdata-cli/blob/main/LICENSE"
date_added: "2026-06-04"
---

# hasdata

Use the `hasdata` CLI for real-time web data. One subcommand per API — flags, enums, defaults are derived from the live schema at `api.hasdata.com/apis`.

## When to Use

Use this skill when:

- The user wants to use the HasData CLI.
- The user needs current web data from the command line.
- The user wants to automate data collection in scripts.
- The user wants to retrieve search, ecommerce, travel, or local business data.
- The user needs web-page scraping through the CLI.

## Prerequisites

- `command -v hasdata` — if missing, download the installer from `https://raw.githubusercontent.com/HasData/hasdata-cli/main/install.sh`, inspect it, then run it locally with `sh install.sh`.
- One-time setup: the user runs `hasdata configure`, pastes their API key, and it's saved to `~/.hasdata/config.yaml` (mode 0600). Every future call picks it up automatically.
- If a call fails with `no API key configured`, the user hasn't run `hasdata configure` yet — tell them to. **Never invent a key.**

## Quick start

```bash
hasdata <api> --flag value [--flag value ...] --raw | jq .
```

Always pass `--raw` when piping to `jq` (skips pretty-print and TTY detection). Use `--pretty` only for human-readable terminal output.

## Picking the right subcommand

| User intent | Subcommand |
| --- | --- |
| Web search ("what does Google say about…") | `google-serp` (full features) or `google-serp-light` (cheap, single page) |
| Latest news | `google-news` |
| AI Mode SERP | `google-ai-mode` |
| Shopping / product prices | `google-shopping` (broad), `amazon-search` / `amazon-product` (Amazon), `shopify-products` (Shopify) |
| Immersive product page | `google-immersive-product` |
| Maps / places / reviews | `google-maps`, `google-maps-place`, `google-maps-reviews`, `google-maps-photos`, `google-maps-posts` |
| Yelp / YellowPages local data | `yelp-search`, `yelp-place`, `yellowpages-search`, `yellowpages-place` |
| Real-estate listings (homes for sale/rent/sold) | `zillow-listing`, `redfin-listing` |
| Real-estate single property deep dive | `zillow-property`, `redfin-property` |
| Travel — short-term rentals | `airbnb-listing`, `airbnb-property` |
| Travel — hotels / lodging | `booking-search`, `booking-place` |
| Travel — flights | `google-flights` |
| Jobs | `indeed-listing`, `indeed-job`, `glassdoor-listing`, `glassdoor-job` |
| Bing search | `bing-serp` |
| Trends | `google-trends` |
| Images | `google-images` |
| Short videos | `google-short-videos` |
| Events | `google-events` |
| YouTube search / video / channel / transcript | `youtube-search-api`, `youtube-video-api`, `youtube-channel-api`, `youtube-transcript-api` |
| Instagram profile | `instagram-profile` |
| Amazon seller | `amazon-seller`, `amazon-seller-products` |
| **Scrape a specific URL** | `web-scraping` — supports JS rendering, proxies, markdown output, AI extraction, screenshots |

For exact flags of a subcommand, run `hasdata <api> --help` or read the matching file in `references/`.

## Non-obvious triggers (when to reach for hasdata even if the user doesn't say "scrape")

The user often won't ask for a SERP API or a scraper directly. Map these intents to the skill:

- **"Is this still true?" / "What's the latest on X?" / "Has Y happened yet?"** — LLM training data is stale. Run `google-serp` or `google-news` to ground the answer.
- **"Summarize this article" / "TL;DR this URL"** — Use `web-scraping --output-format markdown` and feed the markdown into the summary prompt. Beats copy-paste because it strips ads, nav, scripts.
- **"Verify this link" / "Is this site real?"** — `web-scraping --url X --no-block-resources` returns status + screenshot. Or `google-serp --q "site:example.com"`.
- **"What does X say about itself?"** — Pull the company's own homepage with `web-scraping --output-format markdown`, then summarize.
- **"Find me alternatives to X"** — `google-serp --q "X alternatives"` or `google-shopping --q "X competitors"`.
- **"What's the going rate for X?"** — `google-shopping` (broad) or `amazon-search` (Amazon-specific) with `jq` to extract the price distribution.
- **"Phone number / address for X"** — `google-maps-place` or `yelp-place`. Don't guess from training data.
- **"Are people happy with X service?" / "Is X reputable?"** — `google-maps-reviews --place-id ... --sort lowest` for negative samples; `glassdoor-job` for employer rep.
- **"What's the salary range for Y role?"** — `indeed-listing` filtered by role + location, then `jq` over `.jobs[].salary`.
- **"Find me homes/apartments matching X criteria"** — `zillow-listing` / `redfin-listing` / `airbnb-listing` with the corresponding filters.
- **"Recent sold comps near X"** — `zillow-listing --type sold --keyword "X" --days-on-zillow 12m`.
- **"Track this product's price"** — Loop `amazon-product --asin X` on a schedule; persist `.price` to a file.
- **"Summarize / cite this YouTube video"** — `youtube-transcript-api --v-param VID --raw | jq -r '.transcript[].snippet'` → feed to the summary prompt. Beats title/thumbnail-based guesses.
- **"Find a hotel in $CITY for $DATES under $BUDGET"** — `booking-search --keyword $CITY --check-in-date X --check-out-date Y --adults 2 --children 0 --rooms 1 --price-max $BUDGET --sort priceLowestFirst`. For one specific property, `booking-place --url ...` returns the full room/rate matrix.
- **"What's this channel pushing lately?"** — `youtube-channel-api --channel-id @handle --tab videos --raw | jq '.sections[].items[] | {title, publishedDate, views: .extractedViews}'`.
- **"Does this business have an active offer / event?"** — `google-maps-posts --place-id X --raw | jq '.posts[] | {postedAt, description, cta}'`. Surfaces current promotions Google indexed.
- **"What's trending around X?"** — `google-trends --q "X"` for relative interest; `google-news --q "X"` for headlines.
- **"Find businesses near me that do X"** — `google-maps --q "X" --ll "@LAT,LNG,12z"` then fan out `google-maps-place` for contacts.
- **"How does this look in country Y?"** — `--gl Y` on SERP commands, `--proxy-country Y` on `web-scraping`. Useful for geo-targeted SEO checks, geo-blocked content.
- **"Pull structured data from this page"** — `web-scraping --ai-extract-rules-json '{"price": {"type": "number"}, ...}'`. Works on arbitrary pages without writing CSS selectors.
- **"List of items → per-item details"** — Pattern: search command produces IDs/URLs, pipe through `xargs` into the matching `*-property` / `*-product` / `*-place` deep-dive command.
- **"Find this person's role / employer / LinkedIn / followers"** — `google-serp --q '"Person Name" linkedin'` first. The organic-result title is typically `Name — Role at Company | LinkedIn` and the snippet carries location, headline, connection count. SERP often answers the whole question without ever opening the profile page.
- **"What is company X doing? Where's their HQ? Who works there?"** — `google-serp --q "$COMPANY"` returns a `.knowledge_graph` block with founder, HQ, founded year, parent, employee range — pre-extracted. `google-news --q "$COMPANY"` for recent activity. Specific facts via targeted SERP: `--q '"$COMPANY" headquarters'`, `--q '"$COMPANY" funding'`, `--q 'site:linkedin.com/company "$COMPANY"'`.
- **"Find public contact channels for company X"** — start with SERP: `--q '"@example.com"'` often surfaces publicly indexed business addresses. For personal emails or phone numbers, require a legitimate purpose, user authorization, and privacy-law/terms compliance; disclose unverified guesses.
- **"Enrich this CSV of leads"** — per row: `google-serp` for LinkedIn, role, employer; another SERP to verify email or pattern. Stay in SERP unless a specific field is missing.
- **Reverse-lookup (email / phone / domain → identity)** — `google-serp` with the literal value in quotes (`--q '"jane@x.com"'`, `--q '"+1 555 123 4567"'`, `--q '"acme corp" site:example.com'`) almost always surfaces the matching person or business.

**SERP-first principle**: for any data-enrichment intent (people, companies, emails, products, places), reach for `google-serp` / `google-news` / `google-shopping` / `google-maps` first. They return Google's already-extracted structured fields (`.knowledge_graph`, `.organic_results[].snippet`, `.local_results[]`, etc.) without direct access to the target site. Only escalate to `web-scraping` when SERP doesn't surface the specific field you need, the data is public or authorized, and the target's terms/access controls allow it. See `references/enrichment.md`.

If a user request matches one of the above and you don't invoke hasdata, you're probably hallucinating a stale answer.

## Universal flag patterns

- **Kebab-case** flag names. The CLI maps them back to the original camelCase before sending to the API.
- **Booleans defaulting to `true`** have a paired negation: `--no-block-ads`, `--no-screenshot`, `--no-js-rendering`, `--no-extract-emails`, `--no-block-resources`. Setting both `--block-ads` and `--no-block-ads` errors.
- **Anything ending in `-json`** accepts:
    - inline JSON: `--extract-rules-json '{"title":"h1"}'`
    - file: `--extract-rules-json @rules.json`
    - stdin: `cat rules.json | hasdata web-scraping ... --extract-rules-json -`
- **Repeatable key=value** flags split on the first `=` (so values containing `=` survive): `--headers User-Agent=foo --headers Cookie=session=abc`. Pair with `--headers-json` for a JSON base; kv items override per key.
- **List flags** accept either repeats or comma-joined: `--lr lang_en --lr lang_fr` or `--lr lang_en,lang_fr`. Serialized as `key[]=value` for GET endpoints.
- **Enum flags** validate client-side. If you guess wrong, the error lists the allowed values — read the message and retry.

## Global flags (apply to every subcommand)

| Flag | Effect |
| --- | --- |
| `--raw` | Write response bytes as-is (use this when piping to `jq`) |
| `--pretty` | Pretty-print JSON (default when stdout is a TTY) |
| `-o, --output FILE` | Write response to file instead of stdout (works for binary like screenshots) |
| `--verbose` | Log outgoing URL and `X-RateLimit-*` headers to stderr |
| `--api-key KEY` | Override env var (rarely needed) |
| `--timeout DURATION` | Per-request timeout (default 2m) |
| `--retries N` | Max retries on 429/5xx (default 2) |

## Output contract

Responses are JSON. Pipe through `jq` for extraction:

```bash
hasdata google-serp --q "espresso machine" --num 10 --raw \
  | jq -c '.organic_results[] | {title, link, snippet}'
```

For real-estate / e-commerce results, the array shape is API-specific — read a single response with `--pretty` first to learn the schema, then write the `jq` filter.

## Exit codes (script-safe)

| Code | Meaning |
| --- | --- |
| 0 | success |
| 1 | user / CLI-input error (missing required flag, bad enum value, missing API key) |
| 2 | network error |
| 3 | API returned 4xx (auth, quota, validation) |
| 4 | API returned 5xx |

## References

- [`references/enrichment.md`](references/enrichment.md) — **person and company enrichment** (LinkedIn lookup, emails, HQ/funding/news, CSV-row enrichment, reverse-lookup) — the highest-leverage cross-API workflows
- [`references/search.md`](references/search.md) — Google SERP / Bing / News / Trends flag catalog
- [`references/web-scraping.md`](references/web-scraping.md) — `web-scraping` flags, JS scenarios, AI extraction
- [`references/real-estate.md`](references/real-estate.md) — Zillow / Redfin filters and bracketed params
- [`references/travel.md`](references/travel.md) — Airbnb / Booking / Google Flights (lodging + transport)
- [`references/ecommerce.md`](references/ecommerce.md) — Amazon / Shopify
- [`references/local-business.md`](references/local-business.md) — Maps (search/place/reviews/photos/posts) / Yelp / YellowPages
- [`references/jobs.md`](references/jobs.md) — Indeed / Glassdoor
- [`references/youtube.md`](references/youtube.md) — search / video / channel / transcript
- [`references/all-commands.md`](references/all-commands.md) — full subcommand index with credit costs


## Limitations

* Requires access to HasData services and valid credentials.
* Data quality and available fields depend on the target website and extraction method used.
* Website changes can impact extraction results and may require adjustments to extraction logic.
* Rate limits, quotas, and account restrictions may apply depending on the endpoint and subscription plan.
