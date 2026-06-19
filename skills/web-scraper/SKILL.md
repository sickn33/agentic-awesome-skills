---
name: web-scraper
description: Web scraping inteligente multi-estrategia. Extrai dados estruturados de paginas web (tabelas, listas, precos). Paginacao, monitoramento e export CSV/JSON.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- scraping
- data-extraction
- automation
- csv
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Web Scraper

## Overview

Web scraping inteligente multi-estrategia. Extrai dados estruturados de paginas web (tabelas, listas, precos). Paginacao, monitoramento e export CSV/JSON.

## When to Use This Skill

- When the user mentions "scraper" or related topics
- When the user mentions "scraping" or related topics
- When the user mentions "extrair dados web" or related topics
- When the user mentions "web scraping" or related topics
- When the user mentions "raspar dados" or related topics
- When the user mentions "coletar dados site" or related topics

## Do Not Use This Skill When

- The task is unrelated to web scraper
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Execute phases in strict order. Each phase feeds the next.

```
1. CLARIFY  ->  2. RECON  ->  3. STRATEGY  ->  4. EXTRACT  ->  5. TRANSFORM  ->  6. VALIDATE  ->  7. FORMAT
```

Never skip Phase 1 or Phase 2. They prevent wasted effort and failed extractions.

**Fast path**: If user provides URL + clear data target + the request is simple
(single page, one data type), compress Phases 1-3 into a single action:
fetch, classify, and extract in one WebFetch call. Still validate and format.

---

## Capabilities

- **Multi-strategy**: WebFetch (static), Browser automation (JS-rendered), Bash/curl (APIs), WebSearch (discovery)
- **Extraction modes**: table, list, article, product, contact, FAQ, pricing, events, jobs, custom
- **Output formats**: Markdown tables (default), JSON, CSV
- **Pagination**: auto-detect and follow (page numbers, infinite scroll, load-more)
- **Multi-URL**: extract same structure across sources with comparison and diff
- **Validation**: confidence ratings (HIGH/MEDIUM/LOW) on every extraction
- **Auto-escalation**: WebFetch fails silently -> automatic Browser fallback
- **Data transforms**: cleaning, normalization, deduplication, enrichment
- **Differential mode**: detect changes between scraping runs

## Web Scraper

Multi-strategy web data extraction with intelligent approach selection,
automatic fallback escalation, data transformation, and structured output.

## Phase 1: Clarify

Establish extraction parameters before touching any URL.

## Required Parameters

| Parameter     | Resolve                              | Default        |
|:--------------|:-------------------------------------|:---------------|
| Target URL(s) | Which page(s) to scrape?             | *(required)*   |
| Data Target   | What specific data to extract?       | *(required)*   |
| Output Format | Markdown table, JSON, CSV, or text?  | Markdown table |
| Scope         | Single page, paginated, or multi-URL?| Single page    |

## Optional Parameters

| Parameter     | Resolve                                | Default      |
|:--------------|:---------------------------------------|:-------------|
| Pagination    | Follow pagination? Max pages?          | No, 1 page   |
| Max Items     | Maximum number of items to collect?    | Unlimited    |
| Filters       | Data to exclude or include?            | None         |
| Sort Order    | How to sort results?                   | Source order  |
| Save Path     | Save to file? Which path?              | Display only |
| Language      | Respond in which language?             | User's lang  |
| Diff Mode     | Compare with previous run?             | No           |

## Clarification Rules

- If user provides a URL and clear data target, proceed directly to Phase 2.
  Do NOT ask unnecessary questions.
- If request is ambiguous (e.g. "scrape this site"), ask ONLY:
  "What specific data do you want me to extract from this page?"
- Default to Markdown table output. Mention alternatives only if relevant.
- Accept requests in any language. Always respond in the user's language.
- If user says "everything" or "all data", perform recon first, then present
  what's available and let user choose.

## Discovery Mode

When user has a topic but no specific URL:
1. Use WebSearch to find the most relevant pages
2. Present top 3-5 URLs with descriptions
3. Let user choose which to scrape, or scrape all
4. Proceed to Phase 2 with selected URL(s)

Example: "find and extract pricing data for CRM tools"
-> WebSearch("CRM tools pricing comparison 2026")
-> Present top results -> User selects -> Extract

---

## Phase 2: Reconnaissance

Analyze the target page before extraction.

## Step 2.1: Initial Fetch

Use WebFetch to retrieve and analyze the page structure:

```
WebFetch(
  url = TARGET_URL,
  prompt = "Analyze this page structure and report:
    1. Page type: article, product listing, search results, data table,
       directory, dashboard, API docs, FAQ, pricing page, job board, events, or other
    2. Main content structure: tables, ordered/unordered lists, card grid, free-form text,
       accordion/collapsible sections, tabs
    3. Approximate number of distinct data items visible
    4. JavaScript rendering indicators: empty containers, loading spinners,
       SPA framework markers (React root, Vue app, Angular), minimal HTML with heavy JS
    5. Pagination: next/prev links, page numbers, load-more buttons,
       infinite scroll indicators, total results count
    6. Data density: how much structured, extractable data exists
    7. List the main data fields/columns available for extraction
    8. Embedded structured data: JSON-LD, microdata, OpenGraph tags
    9. Available download links: CSV, Excel, PDF, API endpoints"
)
```

## Step 2.2: Evaluate Fetch Quality

| Signal                                      | Interpretation                    | Action                    |
|:--------------------------------------------|:----------------------------------|:--------------------------|
| Rich content with data clearly visible      | Static page                       | Strategy A (WebFetch)     |
| Empty containers, "loading...", minimal text | JS-rendered                       | Strategy B (Browser)      |
| Login wall, CAPTCHA, 403/401 response       | Blocked                           | Report to user            |
| Content present but poorly structured       | Needs precision                   | Strategy B (Browser)      |
| JSON or XML response body                   | API endpoint                      | Strategy C (Bash/curl)    |
| Download links for CSV/Excel available      | Direct data file                  | Strategy C (download)     |

## Step 2.3: Content Classification

Classify into an extraction mode:

| Mode       | Indicators                                 | Examples                          |
|:-----------|:-------------------------------------------|:----------------------------------|
| `table`    | HTML `<table>`, grid layout with headers   | Price comparison, statistics, specs|
| `list`     | Repeated similar elements, card grids      | Search results, product listings  |
| `article`  | Long-form text with headings/paragraphs    | Blog post, news article, docs     |
| `product`  | Product name, price, specs, images, rating | E-commerce product page           |
| `contact`  | Names, emails, phones, addresses, roles    | Team page, staff directory        |
| `faq`      | Question-answer pairs, accordions          | FAQ page, help center             |
| `pricing`  | Plan names, prices, features, tiers        | SaaS pricing page                 |
| `events`   | Dates, locations, titles, descriptions     | Event listings, conferences       |
| `jobs`     | Titles, companies, locations, salaries     | Job boards, career pages          |
| `custom`   | User specified CSS selectors or fields     | Anything not matching above       |

Record: **page type**, **extraction mode**, **JS rendering needed (yes/no)**,
**available fields**, **structured data present (JSON-LD etc.)**.

If user asked for "everything", present the available fields and let them choose.

---

## Phase 3: Strategy Selection

Choose the extraction approach based on recon results.

## Decision Tree

```
Structured data (JSON-LD, microdata) has what we need?
 |
 +-- YES --> STRATEGY E: Extract structured data directly
 |
 +-- NO: Content fully visible in WebFetch?
      |
      +-- YES: Need precise element targeting?
      |    |
      |    +-- NO  --> STRATEGY A: WebFetch + AI extraction
      |    +-- YES --> STRATEGY B: Browser automation
      |
      +-- NO: JavaScript rendering detected?
           |
           +-- YES --> STRATEGY B: Browser automation
           +-- NO:  API/JSON/XML endpoint or download link?
                |
                +-- YES --> STRATEGY C: Bash (curl + jq)
                +-- NO  --> Report access issue to user
```

## Strategy A: Webfetch With Ai Extraction

**Best for**: Static pages, articles, simple tables, well-structured HTML.

Use WebFetch with a targeted extraction prompt tailored to the mode:

```
WebFetch(
  url = URL,
  prompt = "Extract [DATA_TARGET] from this page.
    Return ONLY the extracted data as [FORMAT] with these columns/fields: [FIELDS].
    Rules:
    - If a value is missing or unclear, use 'N/A'
    - Do not include navigation, ads, footers, or unrelated content
    - Preserve original values exactly (numbers, currencies, dates)
    - Include ALL matching items, not just the first few
    - For each item, also extract the URL/link if available"
)
```

**Auto-escalation**: If WebFetch returns suspiciously few items (less than
50% of expected from recon), or mostly empty fields, automatically escalate
to Strategy B without asking user. Log the escalation in notes.

## Strategy B: Browser Automation

**Best for**: JS-rendered pages, SPAs, interactive content, lazy-loaded data.

Sequence:
1. Get tab context: `tabs_context_mcp(createIfEmpty=true)` -> get tabId
2. Navigate to URL: `navigate(url=TARGET_URL, tabId=TAB)`
3. Wait for content to load: `computer(action="wait", duration=3, tabId=TAB)`
4. Check for cookie/consent banners: `find(query="cookie consent or accept button", tabId=TAB)`
   - If found, dismiss it (prefer privacy-preserving option)
5. Read page structure: `read_page(tabId=TAB)` or `get_page_text(tabId=TAB)`
6. Locate target elements: `find(query="[DESCRIPTION]", tabId=TAB)`
7. Extract with JavaScript for precise data via `javascript_tool`

```javascript
// Table extraction
const rows = document.querySelectorAll('TABLE_SELECTOR tr');
const data = Array.from(rows).map(row => {
  const cells = row.querySelectorAll('td, th');
  return Array.from(cells).map(c => c.textContent.trim());
});
JSON.stringify(data);
```

```javascript
// List/card extraction
const items = document.querySelectorAll('ITEM_SELECTOR');
const data = Array.from(items).map(item => ({
  field1: item.querySelector('FIELD1_SELECTOR')?.textContent?.trim() || null,
  field2: item.querySelector('FIELD2_SELECTOR')?.textContent?.trim() || null,
  link: item.querySelector('a')?.href || null,
}));
JSON.stringify(data);
```

8. For lazy-loaded content, scroll and re-extract:
   `computer(action="scroll", scroll_direction="down", tabId=TAB)`
   then `computer(action="wait", duration=2, tabId=TAB)`

## Strategy C: Bash (Curl + Jq)

**Best for**: REST APIs, JSON endpoints, XML feeds, CSV/Excel downloads.

```bash

## Json Api

curl -s "API_URL" | jq '[.items[] | {field1: .key1, field2: .key2}]'

## Csv Download

curl -s "CSV_URL" -o /tmp/scraped_data.csv

## Xml Parsing

curl -s "XML_URL" | python3 -c "
import xml.etree.ElementTree as ET, json, sys
tree = ET.parse(sys.stdin)

## ... Parse And Output Json

"
```

## Strategy D: Hybrid

When a single strategy is insufficient, combine:
1. WebSearch to discover relevant URLs
2. WebFetch for initial content assessment
3. Browser automation for JS-heavy sections
4. Bash for post-processing (jq, python for data cleaning)

## Strategy E: Structured Data Extraction

When JSON-LD, microdata, or OpenGraph is present:
1. Use Browser `javascript_tool` to extract structured data:
```javascript
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
const data = Array.from(scripts).map(s => {
  try { return JSON.parse(s.textContent); } catch { return null; }
}).filter(Boolean);
JSON.stringify(data);
```
2. This often provides cleaner, more reliable data than DOM scraping
3. Fall back to DOM extraction only for fields not in structured data

## Pagination Handling

When pagination is detected and user wants multiple pages:

**Page-number pagination (any strategy):**
1. Extract data from current page
2. Identify URL pattern (e.g. `?page=N`, `/page/N`, `&offset=N`)
3. Iterate through pages up to user's max (default: 5 pages)
4. Show progress: "Extracting page 2/5..."
5. Concatenate all results, deduplicate if needed

**Infinite scroll (Browser only):**
1. Extract currently visible data
2. Record item count
3. Scroll down: `computer(action="scroll", scroll_direction="down", tabId=TAB)`
4. Wait: `computer(action="wait", duration=2, tabId=TAB)`
5. Extract newly loaded data
6. Compare count - if no new items after 2 scrolls, stop
7. Repeat until no new content or max iterations (default: 5)

**"Load More" button (Browser only):**
1. Extract currently visible data
2. Find button: `find(query="load more button", tabId=TAB)`
3. Click it: `computer(action="left_click", ref=REF, tabId=TAB)`
4. Wait and extract new content
5. Repeat until button disappears or max iterations reached

---

## Phase 4: Extract

Execute the selected strategy using mode-specific patterns.
See [references/extraction-patterns.md](references/extraction-patterns.md)
for CSS selectors and JavaScript snippets.

## Table Mode

WebFetch prompt:
```
"Extract ALL rows from the table(s) on this page.
Return as a markdown table with exact column headers.
Include every row - do not truncate or summarize.
Preserve numeric precision, currencies, and units."
```

## List Mode

WebFetch prompt:
```
"Extract each [ITEM_TYPE] from this page.
For each item, extract: [FIELD_LIST].
Return as a JSON array of objects with these keys: [KEY_LIST].
Include ALL items, not just the first few. Include link/URL for each item if available."
```

## Article Mode

WebFetch prompt:
```
"Extract article metadata:
- title, author, date, tags/categories, word count estimate
- Key factual data points, statistics, and named entities
Return as structured markdown. Summarize the content; do not reproduce full text."
```

## Product Mode

WebFetch prompt:
```
"Extract product data with these exact fields:
- name, brand, price, currency, originalPrice (if discounted),
  availability, description (first 200 chars), rating, reviewCount,
  specifications (as key-value pairs), productUrl, imageUrl
Return as JSON. Use null for missing fields."
```

Also check for JSON-LD `Product` schema (Strategy E) first.

## Contact Mode

WebFetch prompt:
```
"Extract contact information for each person/entity:
- name, title, role, email, phone, address, organization, website, linkedinUrl
Return as a markdown table. Only extract real contacts visible on the page."
```

## Faq Mode

WebFetch prompt:
```
"Extract all question-answer pairs from this page.
For each FAQ item extract:
- question: the exact question text
- answer: the answer text (first 300 chars if long)
- category: the section/category if grouped
Return as a JSON array of objects."
```

## Pricing Mode

WebFetch prompt:
```
"Extract all pricing plans/tiers from this page.
For each plan extract:
- planName, monthlyPrice, annualPrice, currency
- features (array of included features)
- limitations (array of limits or excluded features)
- ctaText (call-to-action button text)
- highlighted (true if marked as recommended/popular)
Return as JSON. Use null for missing fields."
```

## Events Mode

WebFetch prompt:
```
"Extract all events/sessions from this page.
For each event extract:
- title, date, time, endTime, location, description (first 200 chars)
- speakers (array of names), category, registrationUrl
Return as JSON. Use null for missing fields."
```

## Jobs Mode

WebFetch prompt:
```
"Extract all job listings from this page.
For each job extract:
- title, company, location, salary, salaryRange, type (full-time/part-time/contract)
- postedDate, description (first 200 chars), applyUrl, tags
Return as JSON. Use null for missing fields."
```

## Custom Mode

When user provides specific selectors or field descriptions:
- Use Browser automation with `javascript_tool` and user's CSS selectors
- Or use WebFetch with a prompt built from user's field descriptions
- Always confirm extracted schema with user before proceeding to multi-URL

## Multi-Url Extraction

When extracting from multiple URLs:
1. Extract from the **first URL** to establish the data schema
2. Show user the first results and confirm the schema is correct
3. Extract from remaining URLs using the same schema
4. Add a `source` column/field to every record with the origin URL
5. Combine all results into a single output
6. Show progress: "Extracting 3/7 URLs..."

---

## Phase 5: Transform

Clean, normalize, and enrich extracted data before validation.
See [references/data-transforms.md](references/data-transforms.md) for patterns.

## Automatic Transforms (Always Apply)

| Transform              | Action                                               |
|:-----------------------|:-----------------------------------------------------|
| Whitespace cleanup     | Trim, collapse multiple spaces, remove `\n` in cells |
| HTML entity decode     | `&amp;` -> `&`, `&lt;` -> `<`, `&#39;` -> `'`       |
| Unicode normalization  | NFKC normalization for consistent characters          |
| Empty string to null   | `""` -> `null` (for JSON), `""` -> `N/A` (for tables)|

## Conditional Transforms (Apply When Relevant)

| Transform             | When                         | Action                                  |
|:----------------------|:-----------------------------|:----------------------------------------|
| Price normalization   | Product/pricing modes        | Extract numeric value + currency symbol |
| Date normalization    | Any dates found              | Normalize to ISO-8601 (YYYY-MM-DD)      |
| URL resolution        | Relative URLs extracted      | Convert to absolute URLs                |
| Phone normalization   | Contact mode                 | Standardize to E.164 format if possible |
| Deduplication         | Multi-page or multi-URL      | Remove exact duplicate rows             |
| Sorting               | User requested or natural    | Sort by user-specified field            |

## Data Enrichment (Only When Useful)

| Enrichment             | When                         | Action                                |
|:-----------------------|:-----------------------------|:--------------------------------------|
| Currency conversion    | User asks for single currency| Note original + convert (approximate) |
| Domain extraction      | URLs in data                 | Add domain column from full URLs      |
| Word count             | Article mode                 | Count words in extracted text         |
| Relative dates         | Dates present                | Add "X days ago" column if useful     |

## Deduplication Strategy

When combining data from multiple pages or URLs:
1. Exact match: rows with identical values in all fields -> keep first
2. Near match: rows with same key fields (name+source) but different details
   -> keep most complete (fewer nulls), flag in notes
3. Report: "Removed N duplicate rows" in delivery notes

---

## Phase 6: Validate

Verify extraction quality before delivering results.

## Validation Checks

| Check                | Action                                              |
|:---------------------|:----------------------------------------------------|
| Item count           | Compare extracted count to expected count from recon |
| Empty fields         | Count N/A or null values per field                   |
| Data type consistency| Numbers should be numeric, dates parseable           |
| Duplicates           | Flag exact duplicate rows (post-dedup)               |
| Encoding             | Check for HTML entities, garbled characters           |
| Completeness         | All user-requested fields present in output          |
| Truncation           | Verify data wasn't cut off (check last items)        |
| Outliers             | Flag values that seem anomalous (e.g. $0.00 price)  |

## Confidence Rating

Assign to every extraction:

| Rating     | Criteria                                                        |
|:-----------|:----------------------------------------------------------------|
| **HIGH**   | All fields populated, count matches expected, no anomalies      |
| **MEDIUM** | Minor gaps (<10% empty fields) or count slightly differs        |
| **LOW**    | Significant gaps (>10% empty), structural issues, partial data  |

Always report confidence with specifics:
> Confidence: **HIGH** - 47 items extracted, all 6 fields populated,
> matches expected count from page analysis.

## Auto-Recovery (Try Before Reporting Issues)

| Issue              | Auto-Recovery Action                                  |
|:-------------------|:------------------------------------------------------|
| Missing data       | Re-attempt with Browser if WebFetch was used          |
| Encoding problems  | Apply HTML entity decode + unicode normalization      |
| Incomplete results | Check for pagination or lazy-loading, fetch more      |
| Count mismatch     | Scroll/paginate to find remaining items               |
| All fields empty   | Page likely JS-rendered, switch to Browser strategy   |
| Partial fields     | Try JSON-LD extraction as supplement                  |

Log all recovery attempts in delivery notes.
Inform user of any irrecoverable gaps with specific details.

---

## Phase 7: Format And Deliver

Structure results according to user preference.
See [references/output-templates.md](references/output-templates.md)
for complete formatting templates.

## Delivery Envelope

ALWAYS wrap results with this metadata header:

```markdown

## Extraction Results

**Source:** [Page Title](http://example.com)
**Date:** YYYY-MM-DD HH:MM UTC
**Items:** N records (M fields each)
**Confidence:** HIGH | MEDIUM | LOW
**Strategy:** A (WebFetch) | B (Browser) | C (API) | E (Structured Data)
**Format:** Markdown Table | JSON | CSV

---

[DATA HERE]

---

**Notes:**
- [Any gaps, issues, or observations]
- [Transforms applied: deduplication, normalization, etc.]
- [Pages scraped if paginated: "Pages 1-5 of 12"]
- [Auto-escalation if it occurred: "Escalated from WebFetch to Browser"]
```

## Markdown Table Rules

- Left-align text columns (`:---`), right-align numbers (`---:`)
- Consistent column widths for readability
- Include summary row for numeric data when useful (totals, averages)
- Maximum 10 columns per table; split wider data into multiple tables
  or suggest JSON format
- Truncate long cell values to 60 chars with `...` indicator
- Use `N/A` for missing values, never leave cells empty
- For multi-page results, show combined table (not per-page)

## Json Rules

- Use camelCase for keys (e.g. `productName`, `unitPrice`)
- Wrap in metadata envelope:
  ```json
  {
    "metadata": {
      "source": "URL",
      "title": "Page Title",
      "extractedAt": "ISO-8601",
      "itemCount": 47,
      "fieldCount": 6,
      "confidence": "HIGH",
      "strategy": "A",
      "transforms": ["deduplication", "priceNormalization"],
      "notes": []
    },
    "data": [ ... ]
  }
  ```
- Pretty-print with 2-space indentation
- Numbers as numbers (not strings), booleans as booleans
- null for missing values (not empty strings)

## Csv Rules

- First row is always headers
- Quote any field containing commas, quotes, or newlines
- UTF-8 encoding with BOM for Excel compatibility
- Use `,` as delimiter (standard)
- Include metadata as comments: `# Source: URL`

## File Output

When user requests file save:
- Markdown: `.md` extension
- JSON: `.json` extension
- CSV: `.csv` extension
- Confirm path before writing
- Report full file path and item count after saving

## Multi-Url Comparison Format

When comparing data across multiple sources:
- Add `Source` as the first column/field
- Use short identifiers for sources (domain name or user label)
- Group by source or interleave based on user preference
- Highlight differences if user asks for comparison
- Include summary: "Best price: $X at store-b.com"

## Differential Output

When user requests change detection (diff mode):
- Compare current extraction with previous run
- Mark new items with `[NEW]`
- Mark removed items with `[REMOVED]`
- Mark changed values with `[WAS: old_value]`
- Include summary: "Changes since last run: +5 new, -2 removed, 3 modified"

---

## Rate Limiting

- Maximum 1 request per 2 seconds for sequential page fetches
- For multi-URL jobs, process sequentially with pauses
- If a site returns 429 (Too Many Requests), stop and report to user

## Access Respect

- If a page blocks access (403, CAPTCHA, login wall), report to user
- Do NOT attempt to bypass bot detection, CAPTCHAs, or access controls
- Do NOT scrape behind authentication unless user explicitly provides access
- Respect robots.txt directives when known

## Copyright

- Do NOT reproduce large blocks of copyrighted article text
- For articles: extract factual data, statistics, and structured info;
  summarize narrative content
- Always include source attribution (http://example.com) in output

## Data Scope

- Extract ONLY what the user explicitly requested
- Warn user before collecting potentially sensitive data at scale
  (emails, phone numbers, personal information)
- Do not store or transmit extracted data beyond what the user sees

## Failure Protocol

When extraction fails or is blocked:
1. Explain the specific reason (JS rendering, bot detection, login, etc.)
2. Suggest alternatives (different URL, API if available, manual approach)
3. Never retry aggressively or escalate access attempts

---

## Quick Reference: Mode Cheat Sheet

| User Says...                         | Mode      | Strategy  | Output Default   |
|:-------------------------------------|:----------|:----------|:-----------------|
| "extract the table"                  | table     | A or B    | Markdown table   |
| "get all products/prices"            | product   | E then A  | Markdown table   |
| "scrape the listings"                | list      | A or B    | Markdown table   |
| "extract contact info / team page"   | contact   | A         | Markdown table   |
| "get the article data"               | article   | A         | Markdown text    |
| "extract the FAQ"                    | faq       | A or B    | JSON             |
| "get pricing plans"                  | pricing   | A or B    | Markdown table   |
| "scrape job listings"                | jobs      | A or B    | Markdown table   |
| "get event schedule"                 | events    | A or B    | Markdown table   |
| "find and extract [topic]"           | discovery | WebSearch | Markdown table   |
| "compare prices across sites"        | multi-URL | A or B    | Comparison table |
| "what changed since last time"       | diff      | any       | Diff format      |

---

## References

- **Extraction patterns**: [references/extraction-patterns.md](references/extraction-patterns.md)
  CSS selectors, JavaScript snippets, JSON-LD parsing, domain tips.

- **Output templates**: [references/output-templates.md](references/output-templates.md)
  Markdown, JSON, CSV templates with complete examples.

- **Data transforms**: [references/data-transforms.md](references/data-transforms.md)
  Cleaning, normalization, deduplication, enrichment patterns.

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
