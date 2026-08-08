# Travel APIs — Airbnb, Booking, Google Flights

| Endpoint | Returns |
|---|---|
| `/scrape/airbnb/listing` | Airbnb search results |
| `/scrape/airbnb/property` | Single Airbnb listing |
| `/scrape/booking/search` | Booking.com search results (hotels, apartments) |
| `/scrape/booking/place` | Single Booking.com property with room/rate list |
| `/scrape/google/flights` | Google Flights prices and itineraries |

All synchronous `GET`. Airbnb is 5 credits; Booking is 10; Google Flights is 15.

For activities at the destination see `/scrape/google/events` (in `search.md`); for ground transport, scrape the operator's site with `POST /scrape/web`.

## Airbnb

```python
import requests

def airbnb_search(location, check_in, check_out, **kwargs):
    return requests.get(
        "https://api.hasdata.com/scrape/airbnb/listing",
        headers={"x-api-key": API_KEY},
        params={"location": location, "checkIn": check_in, "checkOut": check_out, **kwargs},
        timeout=300,
    ).json()
```

| Param | Notes |
|---|---|
| `location` | **Required.** Free-form. |
| `checkIn` | **Required.** `YYYY-MM-DD`. |
| `checkOut`, `adults`, `children`, `infants`, `pets` | Optional. |
| `nextPageToken` | Pagination cursor. |

### Token pagination

```python
def airbnb_all(location, check_in, check_out):
    out, token = [], None
    while True:
        page = airbnb_search(location, check_in, check_out,
                             **({"nextPageToken": token} if token else {}))
        out.extend(page.get("listings", []))
        token = page.get("nextPageToken")
        if not token:
            return out
```

### Airbnb Property

```python
requests.get(
    "https://api.hasdata.com/scrape/airbnb/property",
    headers={"x-api-key": API_KEY},
    params={"url": "https://www.airbnb.com/rooms/12345678"},
    timeout=300,
)
```

## Booking Search

```python
import json, requests

def booking_search(keyword, check_in, check_out, *, adults=2, children=0,
                   children_ages=None, rooms=1, **filters):
    params = {
        "keyword":      keyword,
        "checkInDate":  check_in,
        "checkOutDate": check_out,
        "adults":       adults,
        "children":     children,
        "rooms":        rooms,
        **filters,
    }
    if children and children_ages:
        params["childrenAgesJson"] = json.dumps(children_ages)
    return requests.get(
        "https://api.hasdata.com/scrape/booking/search",
        headers={"x-api-key": API_KEY},
        params=params, timeout=300,
    ).json()
```

| Param | Notes |
|---|---|
| `keyword` | **Required.** City, neighborhood, or property name. |
| `checkInDate` / `checkOutDate` | **Required.** `YYYY-MM-DD`. |
| `adults`, `children`, `rooms` | **Required.** Pass `children=0` explicitly when none. |
| `childrenAgesJson` | Required iff `children > 0` — JSON array of ages (0–17), one per child. |
| `price[min]` / `price[max]` | `>= 10` / `>= 20`. Bracketed — `requests`/`axios` serialize nested dicts as `price[min]=…`. |
| `rating[]`, `reviewScore[]`, `propertyType[]`, `facilities[]`, `meals[]`, `bedPreference[]`, `roomFacilities[]`, `propertyAccessibility[]`, `roomAccessibility[]`, `distanceFromCenter[]`, `travelGroup[]`, `onlinePayment[]`, `reservationPolicy[]` | Multi-value filters (OR). |
| `bedrooms`, `bathrooms` | Minimum count. |
| `sort` | `ourTopPicks`, `homesAndApartmentsFirst`, `priceLowestFirst`, `priceHighestFirst`, `bestReviewedAndLowestPrice`, `ratingHighToLow`, `ratingLowToHigh`, `ratingAndPrice`, `distanceFromDowntown`, `topReviewed`. |
| `page` | 1-indexed, 25 results per page. |
| `currency` | ISO code or `hotelCurrency` to keep native. |
| `language` | UI locale. |

Top-level response (verified live): `requestMetadata`, `searchInformation`, `pagination`, `results`. Per-result keys: `hotelId`, `roomId`, `title`, `url`, `location`, `rating`, `reviews`, `price` (object with `total` / `nightly` / `currency`), `room`, `beds`, `bedTypes`, `policies`, `photo`.

## Booking Place

```python
resp = requests.get(
    "https://api.hasdata.com/scrape/booking/place",
    headers={"x-api-key": API_KEY},
    params={
        "url":           "https://www.booking.com/hotel/fr/le-bristol-paris.html",
        "checkInDate":   "2026-07-10",
        "checkOutDate":  "2026-07-13",
        "adults":         2,
        "children":       0,
        "rooms":          1,
    },
    timeout=300,
).json()
```

`url` must be `booking.com` / `www.booking.com`. The remaining stay/guest parameters share the same rules as `booking-search` (including `childrenAgesJson` when `children > 0`).

Response top-level keys: `requestMetadata`, `overview`, `bookingDetails`, `rooms`, `facilities`, `houseRules`, `ratings`, `reviews`, `restaurants`, `breadcrumbs`, `questionsAndAnswers`.

- `overview` → `id`, `title`, `address`, `description`, `propertyType`, `photos`, `highlights`, `mostPopularFacilities`.
- `rooms[i]` → `roomId`, `name`, `bedTypes`, `beds`, `facilities`, `otherFacilities`, `variants[]` (per-rate price/availability). Variants are the actual buyable units; `rooms[i]` is the floor-plan.

## Google Flights

```python
resp = requests.get(
    "https://api.hasdata.com/scrape/google/flights",
    headers={"x-api-key": API_KEY},
    params={
        "departureId":  "JFK",
        "arrivalId":    "LAX",
        "outboundDate": "2026-06-15",
        "returnDate":   "2026-06-22",     # omit for one-way
        "currency":     "USD",
    },
    timeout=300,
).json()
```

| Param | Notes |
|---|---|
| `departureId` / `arrivalId` | **Required.** IATA airport codes (`JFK`, `LAX`). |
| `outboundDate` | **Required.** `YYYY-MM-DD`. |
| `returnDate` | Optional — omit for one-way. |
| `currency` | ISO code. |
| `gl`, `hl` | Country / language. |
| `travelClass` | `1` economy, `2` premium economy, `3` business, `4` first. |
| `stops` | `0` any, `1` non-stop, `2` ≤1 stop, `3` ≤2 stops. |
| `adults`, `children`, `infantsInSeat`, `infantsOnLap` | Passenger counts. |

## Patterns

### STR yield estimate

```python
rentals = airbnb_search(area, ci, co).get("listings", [])           # Airbnb → "listings"
# pair with /scrape/zillow/listing (see real-estate.md) for purchase price
night   = sum(r.get("price", 0) for r in rentals) / max(len(rentals), 1)
```

### Hotel-vs-rental price diff

```python
b = booking_search(city, ci, co, adults=2, children=0, rooms=1, sort="priceLowestFirst")
a = airbnb_search(city, ci, co, adults=2)
def median(xs): xs = sorted(xs); return xs[len(xs)//2] if xs else None
median_hotel = median([r["price"]["nightly"] for r in b.get("results", []) if r.get("price")])
median_str   = median([r["price"]            for r in a.get("listings", []) if r.get("price")])
```

### Full trip cost

```python
flight = requests.get(
    "https://api.hasdata.com/scrape/google/flights",
    headers={"x-api-key": API_KEY},
    params={"departureId": origin, "arrivalId": dest_iata,
            "outboundDate": dep, "returnDate": ret, "currency": "USD"},
    timeout=300,
).json()
cheapest_flight = min((f["price"] for f in flight.get("best_flights", [])), default=None)

stay = booking_search(city, dep, ret, adults=2, children=0, rooms=1, sort="priceLowestFirst")
cheapest_stay = stay.get("results", [{}])[0].get("price", {}).get("total")

total = (cheapest_flight or 0) + (cheapest_stay or 0)
```

## Gotchas

- **Airbnb requires `checkIn`** and uses **token** pagination — store `nextPageToken`, not page numbers.
- **Airbnb property endpoints take URLs**, not IDs.
- **Booking requires `children` even when zero.** Pass `children=0`. When `children > 0`, also pass `childrenAgesJson` with exactly that many ages.
- **Booking `price[min]` / `price[max]`** are bracketed — use a nested dict with `requests`/`axios`.
- **Booking `rooms[i].variants[]` is where prices live** — the parent `rooms[i]` describes the floor-plan, variants are the buyable rates with `priceBreakdown` / `cancellationPolicy` / `mealPlan`.
- **`bookingDetails` carries the resolved stay context** the response was priced for — echo it back when persisting results so future comparisons use the same dates / occupancy.
- **Google Flights uses IATA codes**, not city names. `JFK` not `New York`.
- **Round-trip vs one-way** is determined by `returnDate` presence — pass it for round-trip, omit for one-way.
