# SEO/AEO Website Audit Checklist

Use this reference for a new project or a request to audit a live site. The audit is evidence-first: distinguish what was observed, what is inferred, and what still needs access or verification.

## Audit modes

### Codebase audit

Inspect the framework, routes, page components, content files, metadata helpers, sitemap and robots generation, canonical handling, redirects, image handling, structured-data code, internal links, and deployment configuration. Identify the exact file and route affected by every implementation recommendation.

### Live-site audit

Inspect the supplied URL and representative pages. Check rendered HTML where possible, status codes, titles, descriptions, headings, canonical tags, robots directives, sitemap availability, structured data, links, visible answer content, conversion paths, and mobile/performance symptoms. Use browser inspection or a permitted search/API source when available.

### Content-only audit

Assess the supplied text for intent match, topical completeness, direct answers, readability, metadata, headings, internal-link opportunities, conversion clarity, and unsupported claims. Do not imply that technical checks passed when no site or codebase was available.

## Dimensions to inspect

| Dimension | Look for | Critical failure examples |
|---|---|---|
| Crawlability | robots.txt, sitemap, status codes, redirects, canonical URLs | Important pages blocked or unreachable |
| Indexability | noindex rules, canonical consistency, duplicate routes | Target page cannot be indexed |
| Metadata | unique title, description, canonical, Open Graph, Twitter data | Missing or duplicated metadata across important pages |
| Information architecture | clear page purpose, URL structure, navigation, breadcrumbs | Important content is orphaned or buried |
| Content and intent | query-to-page match, problem solved, topical coverage, proof | Page targets a query but does not answer it |
| AEO | direct-answer block, definitions, lists, steps, FAQs, visible evidence | No concise answer to the page’s main question |
| Internal links | relevant contextual links, descriptive anchors, product path | Foundational content does not lead to the product |
| Structured data | schema matches visible content and page type | Invalid, misleading, or unsupported schema |
| Conversion | CTA clarity, signup path, objections, trust evidence | Content attracts visits but gives no next step |
| Quality and trust | accuracy, originality, authorship, dates, claim support | Invented proof or unverifiable claims |

## Finding format

Every finding should include:

1. Severity: Blocker, High, Medium, or Low.
2. Evidence: URL, route, file, selector, snippet, or command output.
3. Impact: ranking, indexation, answer extraction, conversion, or maintenance.
4. Fix: the smallest practical change that resolves the issue.
5. Verification: the observable check that proves the fix worked.
6. Dependency: credentials, deployment, content input, or user decision required.

Do not assign a score without evidence. Mark checks as `Not assessed` when the required site, code, credential, or live data is unavailable.

## Audit-to-implementation loop

1. Run the audit and group findings by page, route, and system.
2. Ask for target keywords and business priorities. If the user does not know them, offer candidate keywords derived from the site and label them as provisional.
3. Convert findings into an ordered implementation checklist.
4. Apply code/content changes only after the user has authorized implementation.
5. Re-run the relevant audit checks and compare before/after evidence.
6. Verify build, routes, metadata, sitemap, robots, links, schema, and deployment status.
7. Report unresolved findings and the next decision, rather than declaring success from a code diff alone.

## Safety and evidence rules

- Never fabricate search volume, rankings, impressions, clicks, customers, backlinks, reviews, or performance claims.
- Never claim Google Search Console or Bing Webmaster setup is complete without verified access and a successful property/sitemap check.
- Treat search-result observations as time- and location-dependent. Record the source, date, market, and device when available.
- Do not add FAQ or review schema for content that is not visible and truthful on the page.
- Avoid arbitrary keyword-density targets. Intent coverage, natural language, and helpfulness matter more than a percentage.
