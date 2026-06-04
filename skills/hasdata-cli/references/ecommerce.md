# E-commerce reference

Subcommands: `amazon-search`, `amazon-product`, `amazon-seller`, `amazon-seller-products`, `shopify-products`, `shopify-collections`. 5 credits each.

---

## amazon-search

```bash
hasdata amazon-search --q "wireless earbuds" [--domain amazon.com] --raw | jq '.results[]'
```

- `--q TEXT` (required)
- `--domain amazon.com|amazon.co.uk|amazon.de|amazon.in|amazon.co.jp|amazon.fr|amazon.it|amazon.es|amazon.com.br|amazon.com.mx|amazon.ca|amazon.com.au`
- `--page N` — pagination
- `--sort featured|price-asc-rank|price-desc-rank|review-rank|date-desc-rank`
- `--node ID` — restrict to category node
- `--customer-reviews` — only items with reviews

Per-result fields: `asin`, `title`, `price`, `link`, `image`, `rating`, `reviews_count`, `prime`.

## amazon-product

```bash
hasdata amazon-product --asin B08N5WRWNW [--domain amazon.com] --raw | jq .
```

- `--asin ASIN` (required)
- `--domain` as above
- `--include-reviews` — include first page of reviews
- `--include-html` — return raw HTML alongside parsed data

Returns: title, price, availability, features, descriptions, variants, images, ratings, top reviews, A+ content.

## amazon-seller

```bash
hasdata amazon-seller --seller-id A1234567890ABC [--domain amazon.com] --raw
```

Seller profile: name, ratings, review count, returns policy, shipping policy, "About" content.

## amazon-seller-products

```bash
hasdata amazon-seller-products --seller-id A1234567890ABC [--domain amazon.com] [--page 1] --raw
```

List of products from a specific seller — useful for competitor analysis or storefront crawling.

---

## shopify-products

```bash
hasdata shopify-products --url "https://store.example.com" [--page 1] --raw | jq '.products[]'
```

Works on any Shopify store (it queries the public `/products.json`-style endpoint). Returns title, vendor, product_type, variants[] (with prices, SKUs, stock), images, tags, handle.

## shopify-collections

```bash
hasdata shopify-collections --url "https://store.example.com" --raw | jq '.collections[]'
```

For drilling into a specific collection, append `/collections/SLUG` to the URL or use the collection handle returned here.

---

## Non-obvious use cases

- **Cross-marketplace price arbitrage** — same `--asin` across `--domain amazon.com|amazon.co.uk|amazon.de` shows currency-normalized regional differences; useful for grey-market resellers and buyers shipping internationally.
- **"Is this product still available?"** — `amazon-product --asin X --raw | jq '.availability'`. Avoids hallucinating an answer based on stale training data.
- **Variant matrix dump** — `amazon-product --asin X --raw | jq '.variants[] | {asin, color, size, price}'` returns the full color/size/etc. lattice with current prices.
- **Counterfeit-listing detection** — `amazon-search --q "BRAND PRODUCT" --raw` then check `.results[].seller_name` for non-authorized sellers; pivot to `amazon-seller` to inspect their other listings.
- **Storefront catalog** — `amazon-seller-products --seller-id X --page 1..N` paginates a seller's full catalog; useful for competitor analysis or due diligence on a vendor.
- **"What were the bestsellers in category X?"** — `amazon-search --q "CATEGORY KEYWORD" --sort featured` returns Amazon's own ranking (`--sort review-rank` for review-weighted).
- **Lead enrichment for a Shopify store** — `shopify-products --url store.example.com --raw` exposes vendor names, tags, product types, SKUs — useful for competitor product-line audits.
- **Stock check** — `shopify-products` returns each variant's `available` boolean; can power "notify me when X is back" without scraping the cart UI.
- **Price-drop monitoring** — schedule `amazon-product --asin X` daily; persist `.price` to a file; alert when delta > N%.
- **A/B-test detection** — same `--asin` from two different `--proxy-country` settings (via web-scraping fallback if amazon-product doesn't support it) sometimes shows different price/title due to A/B tests.
- **Gift-card / coupon discovery** — `google-shopping --q "PRODUCT"` often surfaces resellers offering rebates Amazon doesn't show.
- **Product-image extraction for a moodboard** — `amazon-product --asin X --raw | jq -r '.images[]'` returns CDN URLs you can download separately.
- **Compare reviews summary** — `amazon-product --asin X --include-reviews --raw | jq '.reviews[] | {rating, title, body}'` gives a quick sentiment sample without scraping the review page.
- **Build a Shopify product feed for ads** — `shopify-products --url X --raw | jq -c '.products[] | {id, title, price: .variants[0].price, url: ("https://" + $store + "/products/" + .handle)}'`.

## Common patterns

```bash
# Price tracking — pull current price for a known ASIN
hasdata amazon-product --asin "$ASIN" --raw | jq '.price'

# Product discovery → details fan-out
hasdata amazon-search --q "$Q" --raw \
  | jq -r '.results[].asin' \
  | head -5 \
  | xargs -I{} hasdata amazon-product --asin {} --raw

# Compare across marketplaces
for d in amazon.com amazon.co.uk amazon.de; do
  echo "=== $d ==="
  hasdata amazon-product --asin "$ASIN" --domain "$d" --raw \
    | jq '{currency: .currency, price: .price}'
done
```

