# Real Estate APIs — Zillow, Redfin

| Endpoint | Returns |
|---|---|
| `/scrape/zillow/listing` | Search results by area + filters |
| `/scrape/zillow/property` | Single home (history, agent, schools, taxes) |
| `/scrape/redfin/listing` | Redfin search results |
| `/scrape/redfin/property` | Single Redfin home |

All synchronous `GET`. 5 credits each.

For short-term rentals (Airbnb), hotels (Booking), and flights, see `travel.md`.

## Zillow Listing

Filter params use **bracketed** keys (`price[min]`, `beds[max]`).

```python
import requests

def zillow_search(keyword, listing_type="forSale", **filters):
    r = requests.get(
        "https://api.hasdata.com/scrape/zillow/listing",
        headers={"x-api-key": API_KEY},
        params={"keyword": keyword, "type": listing_type, **filters},
        timeout=300,
    )
    return r.json()

zillow_search("Brooklyn, NY", price={"min": 800000, "max": 2000000})
zillow_search("33321", "sold", daysOnZillow="6m")  # recent comps
```

`requests` + `axios` serialize nested dicts as `price[min]=…&price[max]=…` automatically. With raw `URLSearchParams`, build the bracketed keys yourself.

| Param | Notes |
|---|---|
| `keyword` | **Required.** Area string ("New York, NY", zip, neighborhood). |
| `type` | **Required.** `forSale`, `forRent`, `sold`. |
| `price[min/max]`, `beds[min/max]`, `baths[min/max]`, `sqft[min/max]` | Range filters. |
| `daysOnZillow` | `24h`, `7d`, `14d`, `30d`, `90d`, `6m`, `12m`. |
| `page` | Pagination. |

Response: `requestMetadata`, `searchInformation`, **`properties`** (the listings array — not `listings`), `pagination`.

## Zillow Property

```python
requests.get(
    "https://api.hasdata.com/scrape/zillow/property",
    headers={"x-api-key": API_KEY},
    params={"url": url, "extractAgentEmails": "true"},
    timeout=300,
)
```

Takes a full Zillow URL (not zpid). Returns address, lot/sqft/beds/baths, price + tax history, schools, agent block, photos. Agent emails are best-effort.

## Redfin

```python
# Listing
params = {"keyword": "33321", "type": "forSale", "page": 1}
# Property
params = {"url": "https://www.redfin.com/FL/Tamarac/9...html"}
```

Same bracketed `price[min]`, `beds[min]`, etc. as Zillow. Zip codes work best for `keyword`.

## Patterns

### Sold comps for ROI

```python
sold = zillow_search(zip_code, "sold", daysOnZillow="6m").get("properties", [])
ppsf = [(l["price"] / l["livingArea"]) for l in sold if l.get("livingArea")]
```

## Gotchas

- **Bracketed query keys** — work with `requests`/`axios`, not raw `URLSearchParams`.
- **`type=sold` + `daysOnZillow` = comps recipe.** Without `daysOnZillow`, history is unbounded.
- **Property endpoints take URLs**, not IDs.
- **Agent emails are best-effort.**
