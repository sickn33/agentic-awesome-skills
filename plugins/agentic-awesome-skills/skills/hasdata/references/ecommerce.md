# E-commerce APIs — Amazon & Shopify

| Endpoint | Returns |
|---|---|
| `/scrape/amazon/product` | Single product (price, ratings, variants, other sellers, A+) |
| `/scrape/amazon/search` | Search results (sponsored + organic) |
| `/scrape/amazon/seller` | Seller profile |
| `/scrape/amazon/seller-products` | Seller catalog |
| `/scrape/shopify/products` | Products from any Shopify store |
| `/scrape/shopify/collections` | Collections from any Shopify store |

All synchronous `GET`.

## Amazon Product

```python
import requests

resp = requests.get(
    "https://api.hasdata.com/scrape/amazon/product",
    headers={"x-api-key": API_KEY},
    params={"asin": "B0DHJ7SBDR", "domain": "www.amazon.com", "otherSellers": "true"},
    timeout=300,
)
```

| Param | Notes |
|---|---|
| `asin` | **Required.**. |
| `domain` | `www.amazon.com` (default), `.co.uk`, `.de`, `.co.jp`, … |
| `language` | Locale per domain. |
| `deliveryZip` | Affects shipping/availability fields. |
| `shippingLocation` | 2-letter country code. |
| `otherSellers` | `true` (default) to include other-seller block. |

Response: top-level `requestMetadata` + `product`. The `product` object's keys (verified live): `asin`, `url`, `title`, `brand`, `isAvailable`, `primaryFeatures`, `features`, `featureBullets`, `description`, `badges`, `breadcrumbs`, `whatIsInTheBox`, `variants`, `totalImages`, `primaryImage`, `images`, `descriptionImages`, `totalVideos`, `primaryVideo`, `videos`, `specification`, `reviewsInfo` (rating + count + sample reviews live here, not at the root). Pricing fields are surfaced via `variants` and `specification`.

## Amazon Search

```python
params = {"q": "mechanical keyboard", "domain": "www.amazon.com", "page": 1}
```

Params: `q` (required), `domain`, `language`, `page`, `deliveryZip`, `shippingLocation`, `sortBy`.

## Amazon Seller / Seller Products

```python
profile = requests.get(
    "https://api.hasdata.com/scrape/amazon/seller",
    headers={"x-api-key": API_KEY},
    params={"sellerId": "A1MNOPQR", "domain": "www.amazon.com"},
    timeout=300,
).json()

catalog = requests.get(
    "https://api.hasdata.com/scrape/amazon/seller-products",
    headers={"x-api-key": API_KEY},
    params={"sellerId": "A1MNOPQR", "page": 1},
    timeout=300,
).json()
```

Use cases: counterfeit detection, MAP enforcement, competitor catalog mirroring.

## Shopify Products

Works on **any** Shopify storefront with no authentication.

```python
def shopify_all(store_url):
    page, out = 1, []
    while True:
        batch = requests.get(
            "https://api.hasdata.com/scrape/shopify/products",
            headers={"x-api-key": API_KEY},
            params={"url": store_url, "page": page, "limit": 250},
            timeout=300,
        ).json().get("products", [])
        if not batch:
            return out
        out.extend(batch)
        page += 1
```

| Param | Notes |
|---|---|
| `url` | **Required.** Storefront URL. |
| `limit` | 1–250, default `1`. **Bump to 250** for catalog work. |
| `page` | 1-indexed. |
| `collection` | Collection handle filter. |

`/scrape/shopify/collections` has the same shape and returns the collection list.

## Patterns

### Cross-merchant price comparison

```python
a = requests.get("https://api.hasdata.com/scrape/amazon/search",
                 headers={"x-api-key": API_KEY},
                 params={"q": query}, timeout=300).json()
g = requests.get("https://api.hasdata.com/scrape/google/shopping",
                 headers={"x-api-key": API_KEY},
                 params={"q": query, "gl": "us"}, timeout=300).json()
```

### Reviews & bestsellers go through Scraper Jobs

The Product API only includes a sample of reviews. For all reviews use the `amazon-product-reviews` Scraper Job. For bestseller ranks use `amazon-bestsellers` — there's no synchronous API. See `scraper-jobs.md`.

## Gotchas

- **Same ASIN ≠ same product across `domain`s.** `.com` vs `.co.uk` can differ.
- **`deliveryZip` changes availability.** Pass it when stock matters; omit for spec-only scrapes.
- **Shopify `limit` defaults to 1** — always set 250 for catalog crawls.
