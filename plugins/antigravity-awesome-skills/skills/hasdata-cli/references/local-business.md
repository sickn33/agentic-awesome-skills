# Local-business / maps reference

Subcommands: `google-maps`, `google-maps-place`, `google-maps-reviews`, `google-maps-contributor-reviews`, `google-maps-photos`, `google-maps-posts`, `yelp-search`, `yelp-place`, `yellowpages-search`, `yellowpages-place`. 5 credits each (10 for `google-maps-posts` and YellowPages).

---

## google-maps

```bash
hasdata google-maps --q "coffee" --ll "@30.2672,-97.7431,14z" --raw | jq '.local_results[]'
```

Required: `--q TEXT`. Other useful flags:
- `--ll "@LAT,LNG,ZOOMz"` — center point + zoom (Google's `ll` parameter)
- `--gl us|gb|...` — country
- `--hl en|es|...` — language
- `--type search|place` — search vs. specific place lookup
- `--data` / `--cid` / `--fid` — Google identifiers (advanced)

Per-result: `title`, `place_id`, `rating`, `reviews`, `address`, `phone`, `website`, `types[]`, `gps_coordinates`.

## google-maps-place

```bash
hasdata google-maps-place --place-id "ChIJ..." --raw | jq .
```

Single place: full details, hours, popular times, attributes.

## google-maps-reviews

```bash
hasdata google-maps-reviews --place-id "ChIJ..." [--sort newest|highest|lowest] --raw \
  | jq '.reviews[] | {author, rating, date, snippet}'
```

For pagination, the response includes a `next_page_token` — pass via `--next-page-token`.

## google-maps-contributor-reviews

Reviews authored by a specific Google contributor (by `--contributor-id`). Useful for local-guide analysis.

## google-maps-photos

```bash
hasdata google-maps-photos --place-id "ChIJ..." --raw
```

Returns photo URLs by category (interior, exterior, food, etc.).

## google-maps-posts (10 credits)

```bash
hasdata google-maps-posts --place-id "ChIJ..." [--hl en] [--next-page-token TOKEN] --raw \
  | jq '.posts[] | {postedAt, description, cta, postUrl}'
```

Posts are the business-owner publications shown on a Maps listing: offers, events, holiday hours, announcements. Either `--place-id` **or** `--data-id` is required.

Per-post fields (verified live): `postId`, `locationId`, `title`, `description`, `image`, `cta` (object with `label` + `url`), `createdAt` (ISO), `postedAt` (human-readable), `shareUrl`, `postUrl`. Use `pagination.nextPageToken` for older posts.

---

## yelp-search

```bash
hasdata yelp-search --query "italian" --location "Brooklyn, NY" [--page 1] --raw \
  | jq '.businesses[] | {name, rating, review_count, price, categories}'
```

## yelp-place

```bash
hasdata yelp-place --url "https://www.yelp.com/biz/SLUG" --raw | jq .
```

Single business: full details, hours, top reviews, photos, attributes.

## yellowpages-search

```bash
hasdata yellowpages-search --search-terms "plumber" --geo-location-terms "Atlanta, GA" --raw
```

## yellowpages-place

```bash
hasdata yellowpages-place --url "https://www.yellowpages.com/atlanta-ga/mip/..." --raw
```

---

## Non-obvious use cases

- **Sales-lead research** — `google-maps --q "INDUSTRY" --ll "@LAT,LNG,12z"` to enumerate businesses, then `xargs` into `google-maps-place` for public phone/website details. Use email collection only for legitimate business outreach with opt-out, privacy-law, and rate-limit controls.
- **Reputation monitoring** — `google-maps-reviews --place-id X --sort lowest` returns the worst reviews first; great for surfacing crisis signals fast. Run weekly to detect new 1-star drops.
- **"Is this business open?"** — `google-maps-place --place-id X --raw | jq '.hours'` for current hours; also surfaces `permanently_closed` status.
- **Verify an address user gave you** — `google-maps --q "BUSINESS NAME, CITY" --raw | jq '.local_results[0].address'`. Don't trust user-provided addresses for high-stakes actions (mailing, payments).
- **Public business contact lookup** — `google-maps-place` includes phone and website; `web-scraping --url WEBSITE --extract-emails` returns emails parsed from the homepage. Use only for public business contact channels and disclose uncertainty.
- **Competitive-density mapping** — `google-maps --q "coffee shop" --ll "@LAT,LNG,Zz"` at varying zoom levels; aggregate `.local_results[]` into a CSV with addresses + ratings to find under-served zones.
- **Service-area validation** — chain `yelp-search --location "CITY"` for a few cities to confirm a business with the same name covers them.
- **Find recently opened businesses** — `google-maps-place` returns `description.years_in_business` and posts/updates timestamps; sort.
- **Negative-review sample for product analysis** — `yelp-place --url X --raw | jq '.reviews[] | select(.rating <= 2)'`; useful as input to a "what do customers complain about" summary.
- **Photo-mining for visual docs** — `google-maps-photos --place-id X` returns categorized photo URLs (interior, food, exterior). Useful when the user needs an image and doesn't want to rely on `google-images`.
- **Local-guide credibility** — `google-maps-contributor-reviews --contributor-id X` shows everything a specific reviewer wrote, useful for filtering out shilling/fake reviewers when their pattern is suspicious.
- **YellowPages for B2B niches** — service-business categories (plumbers, electricians, lawyers) are often better indexed by YellowPages than Yelp; try both when one comes up empty.
- **Cross-platform reputation diff** — same business name + city via `yelp-search` and `google-maps` to compare ratings across platforms (gap often signals fake reviews on one).
- **Promo / event surveillance** — `google-maps-posts --place-id X` surfaces current offers, holiday hours, and limited-time events the business is actively pushing. Cheaper signal than scraping the website, and the `cta.url` typically links to the canonical landing page.
- **Detect a business about to relaunch / rebrand** — sudden burst of new `google-maps-posts` after months of silence usually precedes a re-grand-opening or ownership change.

## Common patterns

```bash
# Build a directory: search → fan out to per-place details
hasdata google-maps --q "yoga studios" --ll "@30.27,-97.74,12z" --raw \
  | jq -r '.local_results[].place_id' \
  | head -10 \
  | xargs -I{} hasdata google-maps-place --place-id {} --raw

# Sentiment / review analysis
hasdata google-maps-reviews --place-id "$PID" --sort lowest --raw \
  | jq '.reviews[] | {rating, snippet}'
```
