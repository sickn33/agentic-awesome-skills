# Extraction Patterns Reference

CSS selectors, JavaScript snippets, and domain-specific tips for
common web scraping scenarios.

---

## CSS Selector Patterns

### Tables

```css
/* Standard HTML tables */
table                               /* All tables */
table.data-table                    /* Class-based */
table[id*="result"]                 /* ID contains "result" */
table thead th                      /* Header cells */
table tbody tr                      /* Data rows */
table tbody tr td                   /* Data cells */
table tbody tr td:nth-child(2)      /* Specific column (2nd) */

/* Grid layouts acting as tables */
[role="table"]                      /* ARIA table role */
[role="row"]                        /* ARIA row */
[role="gridcell"]                   /* ARIA grid cell */
.table-responsive table             /* Bootstrap responsive wrapper */
```

### Product Listings

```css
/* E-commerce product grids */
.product-card, .product-item, .product-tile
[data-product-id]                   /* Data attribute markers */
.product-name, .product-title, h2.title
.price, .product-price, [data-price]
.price--sale, .price--original      /* Sale vs original price */
.rating, .stars, [data-rating]
.availability, .stock-status
.product-image img, .product-thumb img

/* Common e-commerce patterns */
.search-results .result-item
.catalog-grid .catalog-item
.listing .listing-item
```

### Search Results

```css
/* Generic search result patterns */
.search-result, .result-item, .search-entry
.result-title a, .result-link
.result-snippet, .result-description
.result-url, .result-source
.result-date, .result-timestamp
.pagination a, .page-numbers a, [aria-label="Next"]
```

### Contact / Directory

```css
/* People and contact cards */
.team-member, .staff-card, .person, .contact-card
.member-name, .person-name, h3.name
.member-title, .job-title, .role
.member-email a[href^="mailto:"]
.member-phone a[href^="tel:"]
.member-bio, .person-description
.vcard                              /* hCard microformat */
```

### FAQ / Accordion

```css
/* FAQ and accordion patterns */
.faq-item, .accordion-item, [itemtype*="FAQPage"] [itemprop="mainEntity"]
.faq-question, .accordion-header, [itemprop="name"], summary
.faq-answer, .accordion-body, .accordion-content, [itemprop="acceptedAnswer"]
details, details > summary          /* Native HTML accordion */
[role="tabpanel"]                   /* Tab-based FAQ */
```

### Pricing Tables

```css
/* SaaS pricing page patterns */
.pricing-table, .pricing-card, .plan-card, .pricing-tier
.plan-name, .tier-name, .pricing-title
.plan-price, .pricing-amount, .price-value
.plan-period, .billing-cycle        /* monthly/annually */
.plan-features li, .feature-list li
.plan-cta, .pricing-button
[class*="popular"], [class*="recommended"], [class*="featured"]  /* highlighted plan */
```

### Job Listings

```css
/* Job board patterns */
.job-listing, .job-card, .job-posting, [itemtype*="JobPosting"]
.job-title, [itemprop="title"]
.company-name, [itemprop="hiringOrganization"]
.job-location, [itemprop="jobLocation"]
.job-salary, [itemprop="baseSalary"]
.job-type, .employment-type
.job-date, [itemprop="datePosted"]
```

### Events

```css
/* Event listing patterns */
.event-card, .event-item, [itemtype*="Event"]
.event-title, [itemprop="name"]
.event-date, [itemprop="startDate"], time[datetime]
.event-location, [itemprop="location"]
.event-description, [itemprop="description"]
.event-speaker, .speaker-name
```

### Navigation / Pagination

```css
/* Pagination controls */
.pagination, .pager, nav[aria-label*="pagination"]
.pagination .next, a[rel="next"]
.pagination .prev, a[rel="prev"]
.page-numbers, .page-link
button[data-page], a[data-page]
.load-more, button.show-more
```

### Articles / Blog Posts

```css
/* Article content */
article, .post, .entry, .article-content
article h1, .post-title, .entry-title
.author, .byline, [rel="author"]
time, .date, .published, .post-date
.post-content, .entry-content, .article-body
.tags a, .categories a, .post-tags a
```

---

## JavaScript Extraction Snippets

### Generic Table Extractor

```javascript
function extractTable(selector) {
  const table = document.querySelector(selector || 'table');
  if (!table) return { error: 'No table found' };

  const headers = Array.from(
    table.querySelectorAll('thead th, tr:first-child th, tr:first-child td')
  ).map(el => el.textContent.trim());

  const rows = Array.from(table.querySelectorAll('tbody tr, tr:not(:first-child)'))
    .map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'))
        .map(td => td.textContent.trim());
      return cells.length > 0 ? cells : null;
    })
    .filter(Boolean);

  return { headers, rows, rowCount: rows.length };
}
JSON.stringify(extractTable());
```

### Multi-Table Extractor

```javascript
function extractAllTables() {
  const tables = document.querySelectorAll('table');
  return Array.from(tables).map((table, idx) => {
    const caption = table.querySelector('caption')?.textContent?.trim()
      || table.getAttribute('aria-label') || `Table ${idx + 1}`;
    const headers = Array.from(
      table.querySelectorAll('thead th, tr:first-child th')
    ).map(el => el.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'))
      .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()))
      .filter(r => r.length > 0);
    return { caption, headers, rows, rowCount: rows.length };
  });
}
JSON.stringify(extractAllTables());
```

### Generic List Extractor

```javascript
function extractList(containerSelector, itemSelector, fieldMap) {
  // fieldMap: { fieldName: { selector: 'CSS', attr: 'href'|'src'|null } }
  const container = document.querySelector(containerSelector);
  if (!container) return { error: 'Container not found' };

  const items = Array.from(container.querySelectorAll(itemSelector));
  const data = items.map(item => {
    const record = {};
    for (const [key, config] of Object.entries(fieldMap)) {
      const sel = typeof config === 'string' ? config : config.selector;
      const attr = typeof config === 'object' ? config.attr : null;
      const el = item.querySelector(sel);
      if (!el) { record[key] = null; continue; }
      record[key] = attr ? el.getAttribute(attr) : el.textContent.trim();
    }
    return record;
  });
  return { data, itemCount: data.length };
}

// Example usage:
JSON.stringify(extractList('.results', '.result-item', {
  title: '.result-title',
  description: '.result-snippet',
  url: { selector: '.result-title a', attr: 'href' },
  date: '.result-date'
}));
```

### JSON-LD Structured Data Extractor

Many pages embed structured data that's easier to parse than DOM:

```javascript
function extractJsonLd(targetType) {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const allData = Array.from(scripts).map(s => {
    try { return JSON.parse(s.textContent); } catch { return null; }
  }).filter(Boolean);

  // Flatten @graph arrays
  const flat = allData.flatMap(d => d['@graph'] || [d]);

  if (targetType) {
    return flat.filter(d =>
      d['@type'] === targetType ||
      (Array.isArray(d['@type']) && d['@type'].includes(targetType))
    );
  }
  return flat;
}
// Extract products: extractJsonLd('Product')
// Extract articles: extractJsonLd('Article')
// Extract all: extractJsonLd()
JSON.stringify(extractJsonLd());
```

Common JSON-LD types and their useful fields:
- `Product`: name, offers.price, offers.priceCurrency, aggregateRating, brand.name
- `Article`: headline, author.name, datePublished, description, wordCount
- `Organization`: name, address, telephone, email, url
- `BreadcrumbList`: itemListElement[].name (navigation path)
- `FAQPage`: mainEntity[].name (question), mainEntity[].acceptedAnswer.text
- `JobPosting`: title, hiringOrganization.name, jobLocation, baseSalary
- `Event`: name, startDate, endDate, location, performer

### OpenGraph / Meta Tag Extractor

```javascript
function extractMeta() {
  const meta = {};
  document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')
    .forEach(el => {
      const key = el.getAttribute('property') || el.getAttribute('name');
      meta[key] = el.getAttribute('content');
    });
  meta.title = document.title;
  meta.description = document.querySelector('meta[name="description"]')
    ?.getAttribute('content');
  meta.canonical = document.querySelector('link[rel="canonical"]')
    ?.getAttribute('href');
  return meta;
}
JSON.stringify(extractMeta());
```

### Pricing Plan Extractor

```javascript
function extractPricingPlans() {
  const cards = document.querySelectorAll(
    '.pricing-card, .plan-card, .pricing-tier, [class*="pricing"] [class*="card"]'
  );
  return Array.from(cards).map(card => ({
    name: card.querySelector('[class*="name"], [class*="title"], h2, h3')
      ?.textContent?.trim() || null,
    price: card.querySelector('[class*="price"], [class*="amount"]')
      ?.textContent?.trim() || null,
    period: card.querySelector('[class*="period"], [class*="billing"]')
      ?.textContent?.trim() || null,
    features: Array.from(card.querySelectorAll('[class*="feature"] li, ul li'))
      .map(li => li.textContent.trim()),
    highlighted: card.matches('[class*="popular"], [class*="recommended"], [class*="featured"]'),
    ctaText: card.querySelector('a, button')?.textContent?.trim() || null,
    ctaUrl: card.querySelector('a')?.href || null,
  }));
}
JSON.stringify(extractPricingPlans());
```

### FAQ Extractor

```javascript
function extractFAQ() {
  // Try JSON-LD first
  const ldFaq = extractJsonLd('FAQPage');
  if (ldFaq.length > 0 && ldFaq[0].mainEntity) {
    return ldFaq[0].mainEntity.map(q => ({
      question: q.name,
      answer: q.acceptedAnswer?.text || null
    }));
  }

  // Try <details>/<summary> pattern
  const details = document.querySelectorAll('details');
  if (details.length > 0) {
    return Array.from(details).map(d => ({
      question: d.querySelector('summary')?.textContent?.trim() || null,
      answer: Array.from(d.children).filter(c => c.tagName !== 'SUMMARY')
        .map(c => c.textContent.trim()).join(' ')
    }));
  }

  // Try accordion pattern
  const items = document.querySelectorAll(
    '.faq-item, .accordion-item, [class*="faq"] [class*="item"]'
  );
  return Array.from(items).map(item => ({
    question: item.querySelector(
      '[class*="question"], [class*="header"], [class*="title"], h3, h4'
    )?.textContent?.trim() || null,
    answer: item.querySelector(
      '[class*="answer"], [class*="body"], [class*="content"], p'
    )?.textContent?.trim() || null
  }));
}
JSON.stringify(extractFAQ());
```

### Link Extractor

```javascript
function extractLinks(scope) {
  const container = scope ? document.querySelector(scope) : document;
  const links = Array.from(container.querySelectorAll('a[href]'))
    .map(a => ({
      text: a.textContent.trim(),
      href: a.href,
      title: a.title || null
    }))
    .filter(l => l.text && l.href && !l.href.startsWith('javascript:'));
  return { links, count: links.length };
}
JSON.stringify(extractLinks());
```

### Image Extractor

```javascript
function extractImages(scope) {
  const container = scope ? document.querySelector(scope) : document;
  const images = Array.from(container.querySelectorAll('img'))
    .map(img => ({
      src: img.src,
      alt: img.alt || null,
      width: img.naturalWidth,
      height: img.naturalHeight
    }))
    .filter(i => i.src && !i.src.includes('data:image/gif'));
  return { images, count: images.length };
}
JSON.stringify(extractImages());
```

### Scroll-and-Collect Pattern

For pages with lazy-loaded content, use this pattern with Browser automation:

```javascript
// Count items before scroll
function countItems(selector) {
  return document.querySelectorAll(selector).length;
}
```

Then in the workflow:
1. `javascript_tool`: `countItems('.item')` -> get initial count
2. `computer(action="scroll", scroll_direction="down")`
3. `computer(action="wait", duration=2)`
4. `javascript_tool`: `countItems('.item')` -> get new count
5. If new count > old count, repeat from step 2
6. If count unchanged after 2 scrolls, all items loaded
7. Extract all items at once

---

## Domain-Specific Tips

### E-Commerce Sites
- Check for JSON-LD `Product` schema first - often has cleaner data than DOM
- Prices may have hidden original/sale price elements
- Availability often encoded in data attributes (`data-available="true"`)
- Product variants (size, color) may require click interactions
- Review data often loaded lazily - scroll to reviews section first
- Many sites have internal APIs at `/api/products` - check Network tab

### Wikipedia
- Tables use class `.wikitable` - always prefer this selector
- Infoboxes use class `.infobox`
- References in `<sup class="reference">` - exclude from text extraction
- Table cells may contain complex nested HTML - use `.textContent.trim()`
- Sortable tables have class `.sortable` with sort buttons in headers

### News Sites
- Article body often in `<article>` or `[itemprop="articleBody"]`
- Paywall indicators: `.paywall`, `.subscribe-wall`, truncated with "Read more"
- Publication date in `<time>` element or `[itemprop="datePublished"]`
- Author in `[itemprop="author"]` or `.byline`
- JSON-LD `NewsArticle` often has complete metadata

### Government / Data Portals
- Often use HTML tables without JavaScript
- May have download links for CSV/Excel - check for `.csv`, `.xlsx` links
- Data dictionaries may be on separate pages
- Look for API endpoints in page source (`/api/`, `.json` links)
- CORS may block direct API access; use Bash curl instead

### Social Media (Public Profiles)
- Content is almost always JS-rendered - use Browser automation
- Rate limiting is aggressive - keep requests minimal
- Infinite scroll is the norm - set clear item limits
- Structure changes frequently - prefer text extraction over selectors

### SaaS Pricing Pages
- Pricing often changes dynamically (monthly vs annual toggle)
- May need to click "Annual" toggle to see annual prices
- Feature comparison tables often use checkmarks (Unicode or SVG)
- Check for hidden elements toggled by billing period selector

### Job Boards
- Most use JSON-LD `JobPosting` schema
- Salary ranges often hidden behind "View salary" buttons
- Location may include remote/hybrid indicators
- Filters are URL-parameter based - useful for pagination

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Better Approach |
|:-------------|:-------------|:----------------|
| Selectors with generated hashes (`.css-1a2b3c`) | Change on every deploy | Use semantic selectors, ARIA roles, data attributes |
| Deeply nested paths (`div > div > div > span`) | Fragile on layout changes | Use closest meaningful class or attribute |
| Index-based (`:nth-child(3)`) for dynamic lists | Order may change | Use content-based identification |
| Selecting by inline styles | Presentation, not semantics | Use classes, IDs, or data attributes |
| Hardcoded wait times for JS content | Too short or too long | Check for content presence in a loop |
| Single selector for variant pages | Different pages differ | Test selector on multiple pages first |

## Robust Selector Priority

Prefer selectors in this order (most stable to least):

1. `[data-testid="..."]`, `[data-id="..."]` - test/data attributes
2. `#unique-id` - unique IDs
3. `[role="..."]`, `[aria-label="..."]` - ARIA attributes
4. `[itemprop="..."]`, `[itemtype="..."]` - microdata / schema.org
5. `.semantic-class` - meaningful class names
6. `tag.class` - element type + class
7. Structural selectors - last resort
