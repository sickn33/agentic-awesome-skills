---
name: apify-ecommerce
description: "Extract product data, prices, reviews, and seller information from any e-commerce platform using Apify's E-commerce Scraping Tool."
risk: unknown
source: community
---

# E-commerce Data Extraction

Extract product data, prices, reviews, and seller information from any e-commerce platform using Apify's E-commerce Scraping Tool.

## When to Use
- You need product, pricing, review, stock, or seller data from e-commerce sites.
- The task involves price monitoring, competitor product comparison, MAP enforcement, or review analysis.
- You need a guided workflow for extracting marketplace data and summarizing findings.

## Prerequisites

- `.env` file with `APIFY_TOKEN` (at `~/.claude/.env`)
- Node.js 20.6+ (for native `--env-file` support)

## Workflow Selection

| User Need | Workflow | Best For |
|-----------|----------|----------|
| Track prices, compare products | Workflow 1: Products & Pricing | Price monitoring, MAP compliance, competitor analysis. Add AI summary for insights. |
| Analyze reviews (sentiment or quality) | Workflow 2: Reviews | Brand perception, customer sentiment, quality issues, defect patterns |
| Find sellers across stores | Workflow 3: Sellers | Unauthorized resellers, vendor discovery via Google Shopping |

## Progress Tracking

```
Task Progress:
- [ ] Step 1: Select workflow and determine data source
- [ ] Step 2: Configure Actor input
- [ ] Step 3: Ask user preferences (format, filename)
- [ ] Step 4: Run the extraction script
- [ ] Step 5: Summarize results
```

---

## Workflow 1: Products & Pricing

**Use case:** Extract product data, prices, and stock status. Track competitor prices, detect MAP violations, benchmark products, or research markets.

**Best for:** Pricing analysts, product managers, market researchers.

### Input Options

| Input Type | Field | Description |
|------------|-------|-------------|
| Product URLs | `detailsUrls` | Direct URLs to product pages (use object format) |
| Category URLs | `listingUrls` | URLs to category/search result pages |
| Keyword Search | `keyword` + `marketplaces` | Search term across selected marketplaces |

### Example - Product URLs
```json
{
  "detailsUrls": [
    {"url": "https://www.amazon.com/dp/B09V3KXJPB"},
    {"url": "https://www.walmart.com/ip/123456789"}
  ],
  "additionalProperties": true
}
```

### Example - Keyword Search
```json
{
  "keyword": "Samsung Galaxy S24",
  "marketplaces": ["www.amazon.com", "www.walmart.com"],
  "additionalProperties": true,
  "maxProductResults": 50
}
```

### Optional: AI Summary

Add these fields to get AI-generated insights:

| Field | Description |
|-------|-------------|
| `fieldsToAnalyze` | Data points to analyze: `["name", "offers", "brand", "description"]` |
| `customPrompt` | Custom analysis instructions |

**Example with AI summary:**
```json
{
  "keyword": "robot vacuum",
  "marketplaces": ["www.amazon.com"],
  "maxProductResults": 50,
  "additionalProperties": true,
  "fieldsToAnalyze": ["name", "offers", "brand"],
  "customPrompt": "Summarize price range and identify top brands"
}
```

### Output Fields
- `name` - Product name
- `url` - Product URL
- `offers.price` - Current price
- `offers.priceCurrency` - Currency code (may vary by seller region)
- `brand.slogan` - Brand name (nested in object)
- `image` - Product image URL
- Additional seller/stock info when `additionalProperties: true`

> **Note:** Currency may vary in results even for US searches, as prices reflect different seller regions.

---

## Workflow 2: Customer Reviews

**Use case:** Extract reviews for sentiment analysis, brand perception monitoring, or quality issue detection.

**Best for:** Brand managers, customer experience teams, QA teams, product managers.

### Input Options

| Input Type | Field | Description |
|------------|-------|-------------|
| Product URLs | `reviewListingUrls` | Product pages to extract reviews from |
| Keyword Search | `keywordReviews` + `marketplacesReviews` | Search for product reviews by keyword |

### Example - Extract Reviews from Product
```json
{
  "reviewListingUrls": [
    {"url": "https://www.amazon.com/dp/B09V3KXJPB"}
  ],
  "sortReview": "Most recent",
  "additionalReviewProperties": true,
  "maxReviewResults": 500
}
```

### Example - Keyword Search
```json
{
  "keywordReviews": "wireless earbuds",
  "marketplacesReviews": ["www.amazon.com"],
  "sortReview": "Most recent",
  "additionalReviewProperties": true,
  "maxReviewResults": 200
}
```

### Sort Options
- `Most recent` - Latest reviews first (recommended)
- `Most relevant` - Platform default relevance
- `Most helpful` - Highest voted reviews
- `Highest rated` - 5-star reviews first
- `Lowest rated` - 1-star reviews first

> **Note:** The `sortReview: "Lowest rated"` option may not work consistently across all marketplaces. For quality analysis, collect a large sample and filter by rating in post-processing.

### Quality Analysis Tips
- Set high `maxReviewResults` for statistical significance
- Look for recurring keywords: "broke", "defect", "quality", "returned"
- Filter results by rating if sorting doesn't work as expected
- Cross-reference with competitor products for benchmarking

---

## Workflow 3: Seller Intelligence

**Use case:** Find sellers across stores, discover unauthorized resellers, evaluate vendor options.

**Best for:** Brand protection teams, procurement, supply chain managers.

> **Note:** This workflow uses Google Shopping to find sellers across stores. Direct seller profile URLs are not reliably supported.

### Input Configuration
```json
{
  "googleShoppingSearchKeyword": "Nike Air Max 90",
  "scrapeSellersFromGoogleShopping": true,
  "countryCode": "us",
  "maxGoogleShoppingSellersPerProduct": 20,
  "maxGoogleShoppingResults": 100
}
```

### Options
| Field | Description |
|-------|-------------|
| `googleShoppingSearchKeyword` | Product name to search |
| `scrapeSellersFromGoogleShopping` | Set to `true` to extract sellers |
| `scrapeProductsFromGoogleShopping` | Set to `true` to also extract product details |
| `countryCode` | Target country (e.g., `us`, `uk`, `de`) |
| `maxGoogleShoppingSellersPerProduct` | Max sellers per product |
| `maxGoogleShoppingResults` | Total result limit |

---

## Supported Marketplaces

### Amazon (20+ regions)
`www.amazon.com`, `www.amazon.co.uk`, `www.amazon.de`, `www.amazon.fr`, `www.amazon.it`, `www.amazon.es`, `www.amazon.ca`, `www.amazon.com.au`, `www.amazon.co.jp`, `www.amazon.in`, `www.amazon.com.br`, `www.amazon.com.mx`, `www.amazon.nl`, `www.amazon.pl`, `www.amazon.se`, `www.amazon.ae`, `www.amazon.sa`, `www.amazon.sg`, `www.amazon.com.tr`, `www.amazon.eg`

### Major US Retailers
`www.walmart.com`, `www.costco.com`, `www.costco.ca`, `www.homedepot.com`

### European Retailers
`allegro.pl`, `allegro.cz`, `allegro.sk`, `www.alza.cz`, `www.alza.sk`, `www.alza.de`, `www.alza.at`, `www.alza.hu`, `www.kaufland.de`, `www.kaufland.pl`, `www.kaufland.cz`, `www.kaufland.sk`, `www.kaufland.at`, `www.kaufland.fr`, `www.kaufland.it`, `www.cdiscount.com`

### IKEA (40+ country/language combinations)
Supports all major IKEA regional sites with multiple language options.

### Google Shopping
Use for seller discovery across multiple stores.

---

## Running the Extraction

### Step 1: Set Skill Path
```bash
SKILL_PATH=~/.claude/skills/apify-ecommerce
```

### Step 2: Run Script

**Quick answer (display in chat):**
```bash
node --env-file=~/.claude/.env $SKILL_PATH/reference/scripts/run_actor.js \
  --actor "apify/e-commerce-scraping-tool" \
  --input 'JSON_INPUT'
```

**CSV export:**
```bash
node --env-file=~/.claude/.env $SKILL_PATH/reference/scripts/run_actor.js \
  --actor "apify/e-commerce-scraping-tool" \
  --input 'JSON_INPUT' \
  --output YYYY-MM-DD_filename.csv \
  --format csv
```

**JSON export:**
```bash
node --env-file=~/.claude/.env $SKILL_PATH/reference/scripts/run_actor.js \
  --actor "apify/e-commerce-scraping-tool" \
  --input 'JSON_INPUT' \
  --output YYYY-MM-DD_filename.json \
  --format json
```

### Step 3: Summarize Results

Report:
- Number of items extracted
- File location (if exported)
- Key insights based on workflow:
  - **Products:** Price range, outliers, MAP violations
  - **Reviews:** Average rating, sentiment trends, quality issues
  - **Sellers:** Seller count, unauthorized sellers found

---

## Error Handling

| Error | Solution |
|-------|----------|
| `APIFY_TOKEN not found` | Ensure `~/.claude/.env` contains `APIFY_TOKEN=your_token` |
| `Actor not found` | Verify Actor ID: `apify/e-commerce-scraping-tool` |
| `Run FAILED` | Check Apify console link in error output |
| `Timeout` | Reduce `maxProductResults` or increase `--timeout` |
| `No results` | Verify URLs are valid and accessible |
| `Invalid marketplace` | Check marketplace value matches supported list exactly |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
