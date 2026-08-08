# Output Templates Reference

Complete formatting templates for all supported output formats.
Every output must be wrapped in a delivery envelope with metadata.

---

## Delivery Envelope (Required)

Every extraction result MUST include this metadata wrapper,
regardless of output format:

```markdown
## Extraction Results

**Source:** [Page Title](https://example.com/page)
**Date:** 2026-02-25 14:30 UTC
**Items:** 47 records
**Confidence:** HIGH
**Format:** Markdown Table

---

[DATA GOES HERE]

---

**Notes:**
- Any gaps, anomalies, or observations
- Filters or sorts applied
- Pages scraped (if paginated)
```

---

## Markdown Table Format

### Standard Table

```markdown
| Name           | Price    | Rating | Availability |
|:---------------|---------:|:------:|:-------------|
| Product Alpha  |   $29.99 |  4.5   | In Stock     |
| Product Beta   |   $49.99 |  4.2   | In Stock     |
| Product Gamma  |  $119.00 |  4.8   | Pre-order    |
| Product Delta  |   $15.50 |  3.9   | Out of Stock |
```

### Alignment Rules

| Data Type    | Alignment | Markdown Syntax |
|:-------------|:----------|:----------------|
| Text         | Left      | `:---`          |
| Numbers      | Right     | `---:`          |
| Centered     | Center    | `:---:`         |
| Mixed/Status | Left      | `:---`          |

### Table with Summary Row

```markdown
| Product        | Units Sold | Revenue    |
|:---------------|----------:|-----------:|
| Widget A       |     1,234 |  $12,340   |
| Widget B       |       567 |   $8,505   |
| Widget C       |     2,890 |  $57,800   |
| **Total**      | **4,691** | **$78,645**|
```

### Wide Data (Split Tables)

When data has more than 10 columns, split into logical groups:

```markdown
### Basic Information

| Name    | Category | Brand   | SKU      |
|:--------|:---------|:--------|:---------|
| Item A  | Tools    | Acme    | ACM-001  |

### Pricing and Availability

| Name    | Price   | Sale Price | Stock | Ships In |
|:--------|--------:|-----------:|:------|:---------|
| Item A  | $49.99  |    $39.99  | 142   | 2 days   |
```

### Multi-URL Comparison Table

```markdown
| Source       | Product    | Price   | Rating |
|:-------------|:-----------|--------:|:------:|
| store-a.com  | Laptop X   | $999    |  4.3   |
| store-b.com  | Laptop X   | $949    |  4.5   |
| store-c.com  | Laptop X   | $1,029  |  4.1   |
```

### Truncation Rules

For values exceeding 60 characters:
```markdown
| Title                                                       | Author  |
|:------------------------------------------------------------|:--------|
| Introduction to Advanced Machine Learning Techni...         | J. Smith|
```

---

## JSON Format

### Standard JSON Output

```json
{
  "metadata": {
    "source": "https://example.com/products",
    "title": "Product Catalog - Example Store",
    "extractedAt": "2026-02-25T14:30:00Z",
    "itemCount": 3,
    "confidence": "HIGH",
    "fields": ["name", "price", "rating", "availability"],
    "notes": []
  },
  "data": [
    {
      "name": "Product Alpha",
      "price": 29.99,
      "currency": "USD",
      "rating": 4.5,
      "availability": "In Stock"
    },
    {
      "name": "Product Beta",
      "price": 49.99,
      "currency": "USD",
      "rating": 4.2,
      "availability": "In Stock"
    },
    {
      "name": "Product Gamma",
      "price": 119.00,
      "currency": "USD",
      "rating": 4.8,
      "availability": "Pre-order"
    }
  ]
}
```

### JSON Key Naming

| Rule                   | Example                           |
|:-----------------------|:----------------------------------|
| camelCase              | `productName`, `unitPrice`        |
| Numbers stay numeric   | `29.99` not `"29.99"`             |
| Booleans stay boolean  | `true` not `"true"`               |
| Missing = null         | `null` not `""` or `"N/A"`        |
| Arrays for multiples   | `"tags": ["sale", "new"]`         |
| ISO-8601 for dates     | `"2026-02-25T14:30:00Z"`         |

### Nested JSON (Product with Details)

```json
{
  "metadata": { "..." : "..." },
  "data": [
    {
      "name": "Laptop Pro X",
      "brand": "TechCo",
      "pricing": {
        "current": 999.99,
        "original": 1299.99,
        "currency": "USD",
        "discount": "23%"
      },
      "rating": {
        "score": 4.5,
        "count": 1234
      },
      "specifications": {
        "processor": "M3 Pro",
        "ram": "16 GB",
        "storage": "512 GB SSD",
        "display": "14.2 inch Retina"
      },
      "availability": {
        "inStock": true,
        "shipsIn": "2-3 business days"
      }
    }
  ]
}
```

### Multi-URL JSON

```json
{
  "metadata": {
    "sources": [
      "https://store-a.com/laptop-x",
      "https://store-b.com/laptop-x"
    ],
    "extractedAt": "2026-02-25T14:30:00Z",
    "itemCount": 2,
    "confidence": "HIGH"
  },
  "data": [
    {
      "source": "store-a.com",
      "name": "Laptop X",
      "price": 999,
      "currency": "USD",
      "rating": 4.3
    },
    {
      "source": "store-b.com",
      "name": "Laptop X",
      "price": 949,
      "currency": "USD",
      "rating": 4.5
    }
  ]
}
```

---

## CSV Format

### Standard CSV

```csv
# Source: https://example.com/products
# Extracted: 2026-02-25 14:30 UTC
# Items: 3 | Confidence: HIGH
name,price,currency,rating,availability
"Product Alpha",29.99,USD,4.5,"In Stock"
"Product Beta",49.99,USD,4.2,"In Stock"
"Product Gamma",119.00,USD,4.8,"Pre-order"
```

### CSV Rules

| Rule                                 | Example                        |
|:-------------------------------------|:-------------------------------|
| Always include header row            | `name,price,rating`            |
| Quote fields with commas             | `"Smith, John"`                |
| Quote fields with quotes (escape)    | `"He said ""hello"""`          |
| Quote fields with newlines           | `"Line 1\nLine 2"`            |
| UTF-8 encoding with BOM             | `\xEF\xBB\xBF` prefix         |
| Comma delimiter (standard)           | `,`                            |
| Metadata as comments (# prefix)      | `# Source: URL`                |
| null/missing as empty field          | `field1,,field3`               |

### Multi-URL CSV

```csv
# Sources: store-a.com, store-b.com
# Extracted: 2026-02-25 14:30 UTC
source,name,price,currency,rating
"store-a.com","Laptop X",999,USD,4.3
"store-b.com","Laptop X",949,USD,4.5
```

---

## Summary Statistics Template

When extracted data contains numeric fields, include a summary block:

```markdown
### Summary Statistics

| Metric    | Price     | Rating |
|:----------|----------:|-------:|
| Count     |        47 |     47 |
| Min       |    $12.99 |    2.1 |
| Max       |   $299.99 |    5.0 |
| Average   |    $67.42 |    4.1 |
| Median    |    $54.99 |    4.3 |
```

Include only when:
- Data has numeric columns
- More than 5 items extracted
- User would likely benefit from aggregate view (prices, ratings, quantities)

---

## Contact Data Template

```markdown
| Name           | Title              | Email                | Phone          |
|:---------------|:-------------------|:---------------------|:---------------|
| Jane Smith     | CEO                | jane@example.com     | +1-555-0101    |
| John Doe       | CTO                | john@example.com     | +1-555-0102    |
| Alice Johnson  | VP Engineering     | alice@example.com    | N/A            |
```

---

## Article Extraction Template

```markdown
## Article: [Title]

**Author:** Author Name
**Published:** YYYY-MM-DD
**Source:** [Site Name](URL)

### Summary
[2-3 sentence summary of the article content]

### Key Data Points
- [Factual data point 1]
- [Factual data point 2]
- [Statistical finding]

### Tags
`tag1` `tag2` `tag3`
```

Note: Summarize article content. Do not reproduce full article text
due to copyright.

---

## FAQ Extraction Template

```markdown
### FAQ: [Page Title]

**Source:** [Site Name](URL)
**Items:** 12 questions

| # | Question | Answer (excerpt) |
|--:|:---------|:-----------------|
| 1 | How do I reset my password? | Navigate to Settings > Security and click "Reset..." |
| 2 | What payment methods do you accept? | We accept Visa, Mastercard, PayPal, and bank transfer... |
```

Or as JSON (default for FAQ mode):
```json
{
  "metadata": { "source": "URL", "itemCount": 12, "confidence": "HIGH" },
  "data": [
    { "question": "How do I reset my password?", "answer": "Navigate to...", "category": "Account" },
    { "question": "What payment methods?", "answer": "We accept...", "category": "Billing" }
  ]
}
```

---

## Pricing Plans Template

```markdown
### Pricing: [Product Name]

**Source:** [Site Name](URL)
**Plans:** 3 tiers

| Plan        | Monthly   | Annual    | Highlighted |
|:------------|----------:|----------:|:-----------:|
| Starter     |    $9/mo  |   $7/mo   |             |
| Pro         |   $29/mo  |  $24/mo   |     *       |
| Enterprise  |  Custom   |  Custom   |             |

#### Feature Comparison

| Feature               | Starter | Pro | Enterprise |
|:----------------------|:-------:|:---:|:----------:|
| Users                 | 1       | 10  | Unlimited  |
| Storage               | 5 GB    | 50 GB | Unlimited |
| API Access            | N/A     | Yes | Yes        |
| Priority Support      | N/A     | N/A | Yes        |
```

---

## Job Listings Template

```markdown
| Title              | Company     | Location       | Salary          | Type      | Posted     |
|:-------------------|:------------|:---------------|:----------------|:----------|:-----------|
| Senior Engineer    | TechCo      | Remote, US     | $150k - $200k   | Full-time | 2026-02-20 |
| Product Manager    | StartupXYZ  | San Francisco  | $130k - $160k   | Full-time | 2026-02-18 |
| Data Analyst       | DataCorp    | London, UK     | GBP 55k - 70k   | Contract  | 2026-02-22 |
```

---

## Events Template

```markdown
| Event                  | Date       | Time    | Location          | Speakers       |
|:-----------------------|:-----------|:--------|:------------------|:---------------|
| Opening Keynote        | 2026-03-15 | 09:00   | Main Hall         | J. Smith       |
| Workshop: AI Basics    | 2026-03-15 | 14:00   | Room 201          | A. Johnson     |
| Networking Reception   | 2026-03-15 | 18:00   | Rooftop Lounge    | N/A            |
```

---

## Differential (Diff) Output Template

When comparing current extraction with a previous run:

```markdown
## Extraction Results (Diff)

**Source:** [Page Title](URL)
**Date:** 2026-02-25 14:30 UTC
**Compared to:** 2026-02-20 10:00 UTC
**Changes:** +5 new, -2 removed, 3 modified

---

### New Items (+5)

| Name           | Price    | Rating |
|:---------------|--------:|:------:|
| Product Eta    |  $39.99 |  4.6   |
| Product Theta  |  $24.99 |  4.1   |
| ...            |         |        |

### Removed Items (-2)

| Name           | Price    | Rating |
|:---------------|--------:|:------:|
| ~~Product Alpha~~ | ~~$29.99~~ | ~~4.5~~ |
| ~~Product Beta~~  | ~~$49.99~~ | ~~4.2~~ |

### Modified Items (3)

| Name           | Field   | Was        | Now        |
|:---------------|:--------|:-----------|:-----------|
| Product Gamma  | Price   | $119.00    | $109.00    |
| Product Gamma  | Rating  | 4.8        | 4.9        |
| Product Delta  | Stock   | Out of Stock | In Stock |

---

**Summary:**
- 5 new products added since last extraction
- 2 products removed (possibly discontinued)
- Product Gamma had a price drop of $10 and rating increase
- Product Delta is back in stock
```

---

## Error / Partial Result Template

When extraction partially fails:

```markdown
## Extraction Results (Partial)

**Source:** [Page Title](URL)
**Date:** 2026-02-25 14:30 UTC
**Items:** 23 of ~50 expected records
**Confidence:** LOW
**Strategy:** A (WebFetch) -> escalated to B (Browser)

---

[PARTIAL DATA]

---

**Issues:**
- 27 items could not be extracted (content behind JS rendering)
- Price field missing for 5 items (marked N/A)
- Auto-escalation from WebFetch to Browser recovered 15 additional items

**Suggestions:**
- Re-run with explicit Browser automation for complete results
- Check if site has an API endpoint for direct data access
- Try at a different time if rate-limited
```
