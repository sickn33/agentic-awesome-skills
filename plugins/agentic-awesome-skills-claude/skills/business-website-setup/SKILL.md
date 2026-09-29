---
name: business-website-setup
description: 'Website page register: URL, title, meta description, search intent, NAP block, schema type, canonical, indexability and Core Web Vitals target. Use for site builds and SEO reviews.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, website, seo, page-map, nap, schema, structured-data, core-web-vitals, performance, local-seo, sitemap, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Business Website Setup

**What it is:** the smallest site that ranks and converts - the page list, what each page is
for, which search intent it answers, and the technical and structured-data requirements
that make it findable.

## Overview

Works out the smallest useful site for the business in front of it, then builds the plan
only when asked. The default output is a short recommendation, not a page map. The page
register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on request, from one
field list so the four cannot drift apart.

Layer: Layer 5: Fulfil. Fits: Growth stage. Table code: n/a.

**The rule this table exists to enforce:** a page with no declared search intent is a page
that ranks for nothing and a page with no declared owner is a page that rots. `Primary
Keyword`, `Search Intent` and `Owner` are therefore required, and the NAP block is a
per-page field rather than a global assumption - a business with one location and one
service area genuinely does repeat the NAP on every page, and a multi-location business
genuinely does not.

## When to Use This Skill

- build a website, set up a website, website plan
- page structure, sitemap, site map, information architecture
- "we have a website but nobody finds us"
- on-page SEO, meta titles, meta descriptions, headings
- structured data, schema, LocalBusiness, Service, FAQ
- Core Web Vitals, page speed, mobile
- NAP on the website, local signals, Google Search Console

Do not use it for: the ranking asset that is not the website - that is
`gbp-local-seo-intent`; the design tokens (`design-theme-guide`); off-site citations
(`seo-directory-backlinks`); or a one-page campaign, which is `linktree-link-hub`.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "build" / "set up" / "we need" -> artifacts wanted; go to Step 2.
- "we have one already" -> something exists; capture it, then Step 2.
- "not ranking" / "not found" / "fix" -> capture the current state and the queries, then
  Step 2.
- "review" / "audit" / "check" -> a check, not a build.
- "which pages should we have" -> a decision question, not a build.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the page list.

- **Business** - Name, address, phone, services, service area? / Do customers visit a
  location, or is it a service-area business? / One location or several?
- **Current** - Is there a site today, and on what - WordPress, Shopify, Wix, Squarespace,
  a builder, or hand-built? / Who can publish a page? / Is there a developer or is it
  self-serve?
- **Customers** - What are the three questions a customer asks before they buy? / What do
  they search for? / Do they compare, or just want the nearest option?
- **Proof** - Any reviews, ratings, certifications, case studies or photos that can be shown?
  / Is there a team, a location, a process worth showing?
- **Outcome** - What is the site's job - calls, enquiries, bookings, direct sales, or just
  credibility? / Is there a phone number or WhatsApp that must be reachable in one tap?

Never invent an answer. Services, keywords, addresses, phone numbers, review counts,
platforms and metrics the user has not supplied are `Unknown`.

### Step 3 - Hold the internal context

```yaml
module: business-website-setup
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Business": null
  "Current": null
  "Customers": null
  "Proof": null
  "Outcome": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Five to eight pages, one per service and one per place, plus home,
about, contact and a service-area page. Every service gets its own page with its own
intent, its own NAP block and `LocalBusiness` or `Service` structured data. Mobile-first,
fast, one clear call to action per page, and a review widget on the pages that earn trust.
No blog unless someone will actually write it.

**Why this one:** One page per service is what ranks - a single homepage cannot rank for
six different things at once, and a page covering three services ranks for none of them
clearly. A blog is the classic SME trap: an unwritten blog is worse than no blog, because
it signals an abandoned site.

**Workflow:** Services and areas listed → Page map agreed → Primary keyword and intent per
page → NAP block placed → Structured data added → Titles, descriptions and headings written
→ Mobile and Core Web Vitals verified → Search Console and sitemap connected → Launched and
submitted

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

```csv
Page ID,Page URL,Page Title,Meta Description,Primary Keyword,Secondary Keywords,Search Intent,H1,NAP Block Present,Schema Type,Canonical URL,Indexable,Sitemap Included,Image Alt Text Rule,Target Device,Core Web Vitals Target,Build Platform,HTTPS,Mobile First,Structured Data Valid,Owner,Review Date,Status,Notes
,https://example.com/services/example-service,Example Service in Example City | Example Retail,"Book Example Service in Example City. Same-week appointments, fixed prices and a 12-month workmanship guarantee.",example service example city,example service near me,example service cost,Transactional,Example Service in Example City,Yes,Service,Yes,Yes,"Example image alt text",Mobile first,"LCP under 2.5s, INP under 200ms, CLS under 0.1",Unknown,Yes,Yes,Not tested,Unknown,2026-10-27,Draft,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE website_page (
  page_id BIGINT PRIMARY KEY,
  page_url TEXT NOT NULL,
  page_title VARCHAR(255) NOT NULL,
  meta_description VARCHAR(500) NOT NULL,
  primary_keyword VARCHAR(255) NOT NULL,
  secondary_keywords TEXT,
  search_intent VARCHAR(100) NOT NULL,
  h1 VARCHAR(255) NOT NULL,
  nap_block_present BOOLEAN NOT NULL,
  schema_type VARCHAR(100) NOT NULL,
  canonical_url TEXT NOT NULL,
  indexable BOOLEAN NOT NULL,
  sitemap_included BOOLEAN NOT NULL,
  image_alt_text_rule VARCHAR(255) NOT NULL,
  target_device VARCHAR(50) NOT NULL,
  core_web_vitals_target VARCHAR(100) NOT NULL,
  build_platform VARCHAR(100),
  https BOOLEAN NOT NULL,
  mobile_first BOOLEAN NOT NULL,
  structured_data_valid BOOLEAN NOT NULL,
  owner VARCHAR(255),
  review_date DATE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT website_page_intent CHECK (search_intent IN ('Informational','Commercial investigation','Transactional','Navigational','Local intent')),
  CONSTRAINT website_page_status CHECK (status IN ('Planned','In build','In review','Live','Needs update','Retired'))
);

CREATE INDEX idx_website_page_status ON website_page (status);
CREATE INDEX idx_website_page_intent ON website_page (search_intent);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Business Website Setup",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Page ID": { "type": "integer" },
      "Page URL": { "type": "string", "format": "uri" },
      "Page Title": { "type": "string" },
      "Meta Description": { "type": "string" },
      "Primary Keyword": { "type": "string" },
      "Secondary Keywords": { "type": "string" },
      "Search Intent": { "type": "string" },
      "H1": { "type": "string" },
      "NAP Block Present": { "type": "boolean" },
      "Schema Type": { "type": "string" },
      "Canonical URL": { "type": "string", "format": "uri" },
      "Indexable": { "type": "boolean" },
      "Sitemap Included": { "type": "boolean" },
      "Image Alt Text Rule": { "type": "string" },
      "Target Device": { "type": "string" },
      "Core Web Vitals Target": { "type": "string" },
      "Build Platform": { "type": "string" },
      "HTTPS": { "type": "boolean" },
      "Mobile First": { "type": "boolean" },
      "Structured Data Valid": { "type": "boolean" },
      "Owner": { "type": "string" },
      "Review Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Page URL",
      "Page Title",
      "Meta Description",
      "Primary Keyword",
      "Search Intent",
      "H1",
      "NAP Block Present",
      "Schema Type",
      "Canonical URL",
      "Indexable",
      "Sitemap Included",
      "Image Alt Text Rule",
      "Target Device",
      "Core Web Vitals Target",
      "HTTPS",
      "Mobile First",
      "Structured Data Valid",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Page ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Page URL | URL | Convert to URL. The canonical address, not the one in the CMS |
| Page Title | Text | Leave as Text. Aim for 50-60 characters before truncation |
| Meta Description | Text | Leave as Text. 140-160 characters. It is a sales line, not a summary |
| Primary Keyword | Text | Leave as Text. One per page. Two primary keywords is one page too many |
| Secondary Keywords | Title | Use as the database title |
| Search Intent | Select (add options after import) | Convert to Select, add options: "Informational", "Commercial investigation", "Transactional", "Navigational", "Local intent" |
| H1 | Text | Leave as Text. One per page, and it should be close to the primary keyword |
| NAP Block Present | Checkbox | Convert to Checkbox. Tick only if the exact canonical NAP is on the page |
| Schema Type | Select (add options after import) | Convert to Select, add options: "LocalBusiness", "Service", "Organization", "BreadcrumbList", "FAQPage", "Product", "Article", "WebSite", "None" |
| Canonical URL | URL | Convert to URL |
| Indexable | Checkbox | Convert to Checkbox. Off for thank-you, search results and filtered views |
| Sitemap Included | Checkbox | Convert to Checkbox |
| Image Alt Text Rule | Text | Leave as Text. The house rule, same on every page |
| Target Device | Select (add options after import) | Convert to Select, add options: "Mobile first", "Desktop first", "Responsive" |
| Core Web Vitals Target | Text | Leave as Text. State the numbers once and repeat them on every row |
| Build Platform | Text | Leave as Text |
| HTTPS | Checkbox | Convert to Checkbox |
| Mobile First | Checkbox | Convert to Checkbox |
| Structured Data Valid | Checkbox | Convert to Checkbox. Only true after the Rich Results Test or Schema.org validator has passed |
| Owner | Text | Leave as Text |
| Review Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Planned", "In build", "In review", "Live", "Needs update", "Retired" |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. `Structured Data Valid` is false until a
validator has actually run - it is never optimistic.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Page ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Page URL | `url` | `TEXT` | `string, format: uri` | URL | *(blank)* |
| 3 | Page Title | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 4 | Meta Description | `long_text` | `VARCHAR(500)` | `string` | Text | *(blank)* |
| 5 | Primary Keyword | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 6 | Secondary Keywords | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 7 | Search Intent | `select` | `VARCHAR(100)` | `string` | Select | `Transactional` |
| 8 | H1 | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 9 | NAP Block Present | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 10 | Schema Type | `select` | `VARCHAR(100)` | `string` | Select | `Service` |
| 11 | Canonical URL | `url` | `TEXT` | `string, format: uri` | URL | *(blank)* |
| 12 | Indexable | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 13 | Sitemap Included | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 14 | Image Alt Text Rule | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 15 | Target Device | `select` | `VARCHAR(50)` | `string` | Select | `Mobile first` |
| 16 | Core Web Vitals Target | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 17 | Build Platform | `text` | `VARCHAR(100)` | `string` | Text | `Unknown` |
| 18 | HTTPS | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 19 | Mobile First | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `true` |
| 20 | Structured Data Valid | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `false` |
| 21 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Unknown` |
| 22 | Review Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 23 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 24 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Search Intent** - the four standard intents plus a local one. Every page has exactly one,
and it decides the page's structure, its length and its call to action.

```
Informational | Commercial investigation | Transactional | Navigational | Local intent
```

**Schema Type** - a starting set, all schema.org. `FAQPage` markup was restricted by
Google for most commercial sites, so it earns its place only where the questions are real
and visible on the page.

```
LocalBusiness | Service | Organization | BreadcrumbList | FAQPage | Product | Article | WebSite | None
```

**Target Device**

```
Mobile first | Desktop first | Responsive
```

**Status** - `Needs update` is the important one. It is what a page becomes when its
service, price or staff changes and nobody has updated it.

```
Planned | In build | In review | Live | Needs update | Retired
```

## Relations

None standalone. Two natural links worth confirming before making them live:

- `Primary Keyword` and `Search Intent` link to the keyword and intent map in
  `gbp-local-seo-intent`, which is a different table. Confirm whether the business wants
  one keyword map or two before joining them.
- `Owner` points at the people register in the operational pack, which is not in this
  artifact set. It stays Text here with a note naming the intended target.

## Examples

**Prompt**

```
We want a website. We do about six different services, we have one shop, and the last
one was made by a nephew on a drag-and-drop builder and has not been touched in four
years.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods, one shop in Example City.
>
> **Q:** Can customers visit the shop, or do you go to them?
> **A:** The shop, mostly. We do a little delivery.
>
> **Q:** Who are the three questions a customer asks before they buy?
> **A:** What does it cost, is it in stock, and how long does it take.
>
> **Q:** What do you have that proves you are any good - reviews, certifications, photos?
> **A:** Google reviews, and a lot of photos of the shop.
>
> **Q:** Is there anyone who can publish a page without a developer?
> **A:** The founder, on the current site.

**Recommended next step** - offered, not built:

> Seven pages - home, six service pages, about, contact and a service-area page. Each
> service page answers cost, availability and time-to-serve, because those are the three
> questions your customers actually ask. One canonical NAP block repeated on every page,
> `Service` structured data on each, the real shop photos rather than stock, and the Google
> review widget on the pages that earn trust. No blog, because nobody would write it.
>
> Workflow: Services and areas listed → Page map agreed → Primary keyword and intent per
> page → NAP block placed → Structured data added → Titles, descriptions and headings
> written → Mobile and Core Web Vitals verified → Search Console and sitemap connected →
> Launched and submitted
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- One page per service, one primary keyword per page. A page trying to rank for three
  things ranks for none of them clearly.
- Write the page for the question, not for the keyword. Check the actual search results for
  the term and give people what the other results give them.
- Repeat the exact canonical NAP on every page that carries a location. Do not rephrase it
  per page - variation across pages is a signal, not a style choice.
- `Service` and `LocalBusiness` structured data are the highest-value technical work for a
  local business, and they are under-used. Validate before shipping, not after.
- Mobile first, and check on a real mid-range phone. A page that is fast on a laptop and
  unusable on a phone loses the customer before the SEO matters.
- Core Web Vitals: LCP under 2.5s, INP under 200ms, CLS under 0.1 at the 75th percentile.
  Compress images, serve AVIF or WebP, and reserve space for anything that shifts the
  layout.
- Put the phone number and, where the market uses it, WhatsApp in one tap on mobile. A
  contact that needs a form is a contact most people abandon.
- One clear call to action per page. Two is none.
- Add a click-to-call link in the footer, correctly formatted for the country.
- Get Search Console and Bing Webmaster Tools connected on day one, and submit a sitemap.
  Then watch it weekly.
- Add real photographs - the shop, the team, the work. Stock images of a city are the
  clearest signal that nobody has ever visited.
- Ask every happy customer for a review on the site, not only on Google. On-site reviews
  with `Review` schema are a citation Google can use.
- Do not build a blog you will not write. A dead blog is an abandoned-site signal.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real page.

## Limitations

- This is a plan. It does not build, host or publish a website, and it cannot run a build
  tool or deploy.
- It does not do keyword research. `Primary Keyword` records what the business or the
  business's tool determined; this skill never invents search volume or difficulty.
- Core Web Vitals targets are goals, not measurements. `Core Web Vitals Target` states the
  number the business is aiming at; the real figure comes from PageSpeed Insights field
  data.
- `Structured Data Valid` is ticked by the business after running the Rich Results Test or
  the Schema.org validator. This skill does not run it and must never set it optimistically.
- Rich result eligibility is decided by Google and changes. A schema type that earns a rich
  result today may not in six months.
- It does not cover technical SEO beyond what is on the page: crawlability, redirects,
  canonical tags across duplicate URLs, Core Web Vitals code fixes, JavaScript rendering
  and index bloat all need a developer.
- It does not handle hosting, domain, DNS or email deliverability.
- It cannot predict rankings. Any output that implies a ranking outcome is out of bounds.
- A single-location site and a multi-location site need different structures - location
  pages, a location selector, hreflang, and unique NAP per location. Confirm the case
  before generating either.
- Accessibility compliance is a legal question in some markets. This table records
  requirements; it does not certify conformance.

## Security & Safety Notes

- Never invent a domain, a URL, a service, a keyword, a search volume, a metric, a review
  count or a rating. `Unknown` and blank are correct.
- Never paste a real customer list, a real analytics export or a real Search Console dump
  into this table. A visitor list is personal data.
- Structured data must describe what is actually visible on the page. Marking up reviews,
  prices or a business that are not on the page is a policy violation and can cost the
  whole site's rich results.
- Never claim or promise a ranking, and never quote a ranking position the skill did not
  measure.
- A website forms section collects personal data. Lawful basis, privacy notice, retention
  and consent apply. Flag it and refer it to `data-privacy-controls`.
- Do not paste API keys, CMS credentials or Search Console verification tokens into this
  table or into shared notes.
- If the review widget is third-party, its own cookie and consent behaviour applies. That
  is the business's decision to make, and it should be a deliberate one.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.

## Common Pitfalls

See the [bundled common-pitfalls reference](references/common-pitfalls.md) for review and troubleshooting guidance.

## Related Skills

- `brand-growth-system-builder` - routes to this skill and the other 12 brand and growth modules.
- @gbp-local-seo-intent - the local ranking asset that sits beside the site, sharing the
  same keywords and the same NAP.
- @seo-directory-backlinks - the off-site citations that must match this NAP exactly.
- @design-theme-guide - the tokens the site is built from, including the contrast floor.
- @logo-image-design - the mark, the favicon and the page imagery.
- @linktree-link-hub - where social traffic lands before the site exists.
- @social-media-setup - where the site's URLs get distributed.
- @presentation-deck - the pitch that sells the website build to a stakeholder.
- @free-design-resources - PageSpeed Insights, Lighthouse, WAVE, Search Console, schema
  validators and the free hosting tiers.

## Reusable Prompt

```
I want to set up a business website that ranks locally and converts - a page map, the
right page per service, NAP, structured data and speed targets.
Ask me one short question at a time, and only about what I have not already told you.
Never invent a keyword, a URL, a metric or a volume. Then recommend the smallest page
set that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
