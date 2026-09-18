---
name: seo-aeo-schema-generator
description: "Generates and validates implementation-ready JSON-LD structured data for relevant page types and rich-result eligibility."
risk: safe
source: community
date_added: "2026-04-01"
---

# Schema Generator Skill

## Description
Activate this skill when the user wants to generate, write, 
or validate structured data markup for any page. 
Trigger phrases include: "generate schema", "create JSON-LD", 
"schema markup for", "structured data for", 
"FAQ schema", "product schema", "article schema", 
"help Google understand my page", "rich results schema", 
"schema generator: [type]", "add schema to [page]".

---

## Input Format
````json
{
  "page_type": "landing-page | blog-post | pillar-page | 
                product-page | homepage | faq-page | 
                how-to-page",
  "schema_types": ["string — list all types needed for 
                    this page, see Schema Type Menu below"],
  "page_data": {
    "url": "string — canonical URL of the page",
    "title": "string — page title",
    "description": "string — page meta description 
                    or content summary",
    "primary_keyword": "string",
    "date_published": "string — ISO format: YYYY-MM-DD",
    "date_modified": "string — ISO format: YYYY-MM-DD",
    "author_name": "string — for Article schema",
    "brand_name": "string",
    "brand_url": "string — homepage URL",
    "logo_url": "string — absolute URL to brand logo",
    "product": {
      "name": "string",
      "description": "string",
      "image_url": "string",
      "price": "decimal",
      "currency": "string — ISO 4217, e.g. USD, GBP",
      "availability": "InStock | OutOfStock | PreOrder",
      "sku": "string — optional"
    },
    "reviews": [
      {
        "author": "string",
        "rating": "integer — 1 to 5",
        "review_body": "string",
        "date": "string — YYYY-MM-DD"
      }
    ],
    "aggregate_rating": {
      "rating_value": "decimal — e.g. 4.7",
      "review_count": "integer",
      "best_rating": "integer — usually 5",
      "worst_rating": "integer — usually 1"
    },
    "faqs": [
      {
        "question": "string",
        "answer": "string"
      }
    ],
    "how_to": {
      "name": "string — title of the how-to",
      "description": "string",
      "total_time": "string — ISO 8601 duration, e.g. PT30M",
      "steps": [
        {
          "name": "string — step title",
          "text": "string — step instructions"
        }
      ]
    },
    "breadcrumbs": [
      {
        "position": "integer — 1, 2, 3...",
        "name": "string — label",
        "url": "string — absolute URL"
      }
    ]
  }
}
````

---

## Schema Type Menu

This skill supports the following schema types. 
Multiple types can be requested for a single page:

| Schema Type          | Best For                                    | Rich Result Unlocked                    |
|----------------------|---------------------------------------------|-----------------------------------------|
| `Article`            | Blog posts, pillar pages, news              | Article rich result, Top Stories        |
| `FAQPage`            | FAQ sections on any page                    | FAQ accordion in SERP — AEO critical    |
| `HowTo`              | Step-by-step guides                         | Step-by-step rich result                |
| `Product`            | Product or pricing pages                    | Price, availability, rating in SERP     |
| `Review`             | Individual product or service reviews       | Star rating in SERP                     |
| `AggregateRating`    | Pages with multiple reviews                 | Star rating with review count           |
| `BreadcrumbList`     | Any page with a navigation hierarchy        | Breadcrumb path shown in SERP URL       |
| `Organization`       | Homepage or About page                      | Brand knowledge panel signals           |
| `WebPage`            | Any page needing basic structured identity  | Enhances page understanding by crawlers |
| `WebSite`            | Homepage only                               | Sitelinks Searchbox in SERP             |

**AEO Priority:** `FAQPage` and `HowTo` are the two schema 
types most directly responsible for AI engine extraction. 
Always include `FAQPage` on landing pages and blog posts 
that contain a FAQ section.

---

## Rich Result Eligibility Rules

Google requires specific fields to be present for each 
schema type to qualify for rich results. 
Missing required fields disqualifies the page entirely.

### FAQPage
| Field          | Status      | Notes                                    |
|----------------|-------------|------------------------------------------|
| `@type`        | Required    | Must be `FAQPage`                        |
| `mainEntity`   | Required    | Array of `Question` objects              |
| `name`         | Required    | The question text                        |
| `acceptedAnswer` | Required  | `Answer` object containing `text`        |
| Minimum Qs     | Required    | At least 2 question-answer pairs         |
| Answer length  | Recommended | Under 300 words per answer               |

### Article
| Field              | Status      | Notes                                |
|--------------------|-------------|--------------------------------------|
| `headline`         | Required    | Under 110 characters                 |
| `image`            | Required    | At least one image URL               |
| `datePublished`    | Required    | ISO 8601 format                      |
| `dateModified`     | Recommended | ISO 8601 format                      |
| `author`           | Required    | `Person` or `Organization` object    |
| `publisher`        | Required    | `Organization` with `logo`           |

### Product
| Field              | Status      | Notes                                |
|--------------------|-------------|--------------------------------------|
| `name`             | Required    | Product name                         |
| `image`            | Required    | Absolute URL                         |
| `description`      | Recommended |                                      |
| `offers`           | Required    | `Offer` object with price + currency |
| `price`            | Required    | Numeric value                        |
| `priceCurrency`    | Required    | ISO 4217 currency code               |
| `availability`     | Recommended | Schema.org availability URL          |
| `aggregateRating`  | Recommended | Unlocks star rating display          |

### HowTo
| Field              | Status      | Notes                                |
|--------------------|-------------|--------------------------------------|
| `name`             | Required    | Title of the how-to                  |
| `step`             | Required    | Array of `HowToStep` objects         |
| `text`             | Required    | Instructions for each step           |
| `totalTime`        | Recommended | ISO 8601 duration                    |
| `image`            | Recommended | Image per step if available          |

### BreadcrumbList
| Field              | Status      | Notes                                |
|--------------------|-------------|--------------------------------------|
| `itemListElement`  | Required    | Array of `ListItem` objects          |
| `position`         | Required    | Integer, starts at 1                 |
| `name`             | Required    | Breadcrumb label                     |
| `item`             | Required    | Absolute URL for each crumb          |

---

## Output Structure

The skill must always produce output in this exact format:
````markdown
# Schema Markup Output

**Page:** [page title]
**URL:** [url]
**Schema Types Generated:** [list all types]
**Rich Results Unlocked:** [list eligible rich results]
**AEO Signals Added:** [list AEO-relevant schema types]

---

## Validation Summary

| Schema Type       | Required Fields Complete | Rich Result Eligible | Issues Found |
|-------------------|--------------------------|----------------------|--------------|
| [type]            | ✅ / ❌                  | ✅ / ❌              | [n or none]  |
| [type]            | ✅ / ❌                  | ✅ / ❌              | [n or none]  |

---

## Issues Found

[If no issues: ✅ All schema types passed validation.]

**Issue:** [Specific field missing or incorrect]
**Schema Type:** [type]
**Severity:** Required / Recommended
**Fix:** [Exact instruction — what to add or change]

---

## JSON-LD Output

Place all script blocks inside the `<head>` of your HTML.
Use one `<script>` block per schema type.

### [Schema Type 1]
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "[type]",
  [all populated fields from references/ template]
}
</script>
```

### [Schema Type 2]
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "[type]",
  [all populated fields]
}
</script>
```

---

## Implementation Instructions

1. Copy each `<script>` block above
2. Paste inside the `<head>` tag of your HTML — 
   after the `<title>` tag, before `</head>`
3. One script block per schema type — 
   do not combine multiple types in one block
4. Test immediately using Google's Rich Results 
   Test: https://search.google.com/test/rich-results
5. Test using Schema.org Validator: 
   https://validator.schema.org
6. After deploying, request re-indexing in 
   Google Search Console

---

## Testing Checklist

- [ ] All required fields populated for each schema type
- [ ] No placeholder text left in any field
- [ ] All URLs are absolute (https://...) not relative (/page)
- [ ] Date fields use ISO 8601 format (YYYY-MM-DD)
- [ ] Price uses decimal format (e.g. 49.00 not $49)
- [ ] Currency uses ISO 4217 code (USD not $)
- [ ] FAQPage has minimum 2 question-answer pairs
- [ ] No HTML tags inside JSON-LD string values
- [ ] Each schema type in its own `<script>` block
- [ ] Tested in Google Rich Results Test ✅
- [ ] Tested in Schema.org Validator ✅
````

---

## References Folder

The `references/` folder contains pre-validated 
JSON-LD templates for all supported schema types. 
The script uses these as base structures and 
populates them with page data.
````
references/
├── faq-schema.json
├── article-schema.json
├── product-schema.json
├── review-schema.json
├── aggregate-rating-schema.json
├── howto-schema.json
├── breadcrumb-schema.json
├── organization-schema.json
├── webpage-schema.json
└── website-schema.json
````

Each template contains all required and recommended 
fields with placeholder values in this format: 
`"{{field_name}}"`. The `schema_builder.py` script 
replaces all placeholders with the values from `page_data`.

---

## Execution Steps

1. Read `page_type` and `schema_types` — 
   if `schema_types` is empty, recommend the 
   appropriate types based on `page_type` using 
   the Schema Type Menu before proceeding
2. For each requested schema type, load the 
   corresponding template from `references/`
3. Map all fields from `page_data` to the 
   template placeholders
4. Check every required field against the 
   Rich Result Eligibility Rules — 
   flag any missing required field as an issue 
   before outputting
5. Check every recommended field — flag as 
   a warning if missing but do not block output
6. Validate all URLs are absolute, 
   all dates are ISO 8601, 
   all prices are decimal format
7. Generate one clean `<script>` block 
   per schema type
8. Build the Validation Summary table
9. List all issues with severity and exact fix instructions
10. Write Implementation Instructions 
    and Testing Checklist
11. Populate the selected reference template from supplied page data, validate required fields, and show unresolved placeholders as blocking issues. Use a project-provided schema helper only as a supplementary check; never emit fabricated review, rating, or product claims.

---

## Connected Skills
- Receives output from: `seo-aeo-landing-page-writer`, 
  `seo-aeo-blog-writer`, `seo-aeo-content-quality-auditor`, 
  `seo-aeo-internal-linking`
- Feeds output to: orchestrator workflow — 
  final step before publish checklist

## When to Use

Use when adding or validating JSON-LD structured data for a page and the supplied visible content supports the selected schema type.

## Limitations

- Structured data must match visible, truthful page content; valid JSON-LD does not guarantee rich results, indexing, or display.
