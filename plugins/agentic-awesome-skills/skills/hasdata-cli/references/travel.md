# Travel reference

Subcommands:
- `airbnb-listing`, `airbnb-property` (5 credits each) — short-term rentals.
- `booking-search`, `booking-place` (10 credits each) — hotels and other lodging on Booking.com.
- `google-flights` (15 credits) — flight prices and itineraries via Google Flights.

`*-listing` / `*-search` is the filtered search; `*-property` / `*-place` is a single-property deep dive.

For activities at the destination see `google-events` (in `search.md`); for ground transport scrape the operator's site with `web-scraping`.

---

## airbnb-listing

```bash
hasdata airbnb-listing --location "Lisbon, Portugal" \
  --check-in 2026-06-15 --check-out 2026-06-22 \
  --adults 2 --price-max 200 --raw
```

Run `--help` for the full filter set (room type, amenities, instant book, etc.).

## airbnb-property

```bash
hasdata airbnb-property --url "https://www.airbnb.com/rooms/12345678" --raw
```

## booking-search (10 credits)

```bash
hasdata booking-search \
  --keyword "Lisbon" \
  --check-in-date 2026-07-10 --check-out-date 2026-07-13 \
  --adults 2 --children 0 --rooms 1 \
  [--price-min 50 --price-max 250] [--rating 4 --rating 5] \
  [--review-score reviewScoreVeryGood --review-score reviewScoreSuperb] \
  [--property-type hotels --property-type apartments] \
  [--meals breakfastIncluded] [--facilities freeParking --facilities pool] \
  [--sort priceLowestFirst|ratingHighToLow|topReviewed|...] \
  [--page 2] [--currency USD] [--language en-us] \
  --raw | jq '.results[]'
```

Required (no defaults work in production, even though `--help` shows them): `--keyword`, `--check-in-date`, `--check-out-date`, `--adults`, `--children`, `--rooms`. Pass `--children 0` explicitly when none.

When `--children > 0`, **also pass `--children-ages-json '[5,7]'`** with one age per child (0–17). Booking rejects the request otherwise.

Bracketed price filters (`--price-min` / `--price-max`) require `>= 10` / `>= 20` respectively; one of the two is required when filtering on price.

Top-level response: `results`, `searchInformation`, `pagination`, `requestMetadata`. Per-result keys (verified live): `hotelId`, `roomId`, `title`, `url`, `location`, `rating`, `reviews`, `price`, `room`, `beds`, `bedTypes`, `policies`, `photo`.

```bash
# Cheap-first filtered search
hasdata booking-search --keyword "Paris" \
  --check-in-date 2026-08-01 --check-out-date 2026-08-04 \
  --adults 2 --children 0 --rooms 1 \
  --review-score reviewScoreVeryGood \
  --sort priceLowestFirst --raw \
  | jq -c '.results[] | {title, price: .price.total, rating, url}'
```

## booking-place (10 credits)

```bash
hasdata booking-place \
  --url "https://www.booking.com/hotel/fr/le-bristol-paris.html" \
  --check-in-date 2026-07-10 --check-out-date 2026-07-13 \
  --adults 2 --children 0 --rooms 1 \
  [--currency USD] [--language en-us] \
  --raw | jq .
```

Required: `--url` (must be on `booking.com` / `www.booking.com`), stay dates, `--adults`, `--children`, `--rooms`.

Response: `overview`, `bookingDetails`, `rooms[]`, `facilities`, `houseRules`, `ratings`, `reviews`, `restaurants`, `breadcrumbs`, `questionsAndAnswers`. `overview` carries `id`, `title`, `address`, `description`, `propertyType`, `photos`, `highlights`, `mostPopularFacilities`. Each `rooms[i]` has `roomId`, `name`, `bedTypes`, `beds`, `facilities`, `otherFacilities`, `variants[]` (pricing/availability per package).

## google-flights (15 credits)

```bash
hasdata google-flights \
  --departure-id "JFK" --arrival-id "LAX" \
  --outbound-date 2026-06-15 --return-date 2026-06-22 \
  --currency USD --raw | jq .
```

Round-trip vs. one-way controlled by presence/absence of `--return-date`. Run `--help` for the full flag set (cabin class, max stops, preferred airlines, etc.).

---

## Non-obvious use cases

- **Hotel-vs-rental arbitrage** — same dates and party size via `booking-search` and `airbnb-listing`; compare nightly cost percentile-for-percentile. The cheaper platform isn't always the same one across cities.
- **Conference-room pricing audit** — `booking-search --keyword "$CITY" --check-in-date $START --check-out-date $END --sort priceHighestFirst` during a known conference window vs an idle week; the delta is the conference premium.
- **Family-friendly filter** — `--children-ages-json '[5,9]' --children 2 --rooms 1 --travel-group family` and Booking returns only properties that accept the party size with appropriate beds.
- **Loyalty-program portfolio** — `booking-search --keyword "$CITY" --raw | jq '.results[] | select(.title | test("Marriott|Hilton|Hyatt"))'` filters to chains you collect points with.
- **Airbnb price-arbitrage check** — same dates, same area, two `airbnb-listing` calls with different `--adults` counts to surface listings that don't scale per-person price. Sometimes the difference is the deal.
- **STR-vs-LTR feasibility** — pair `airbnb-listing` for nightly rates with `zillow-listing --type forSale` (see `real-estate.md`) for purchase price in the same area; compute gross yield client-side.
- **Flights without a travel API** — `google-flights` with `--departure-id`, `--arrival-id`, dates, and `--currency` for ad-hoc fare checks against a vendor like Skyscanner.
- **Multi-leg cost planning** — chain `google-flights` calls for each leg and sum `.best_flights[].price`; cheaper than the round-trip price-bot SaaS for one-off itineraries.
- **Trip-cost preview** — combine `google-flights` (transport) + `booking-search` / `airbnb-listing` (lodging) + `google-events` (activities, see `search.md`) into one cost estimate before pitching a destination.
