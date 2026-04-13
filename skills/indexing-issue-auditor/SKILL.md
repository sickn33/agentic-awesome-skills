---
name: indexing-issue-auditor
description: "High-level technical SEO and site architecture auditor. Invoke to scan local or live environments for indexing, crawl budget, and structural errors."
category: growth
risk: safe
source: self
source_type: self
date_added: "2026-04-13"
author: WHOISABHISHEKADHIKARI
tags: [seo, architecture, indexing, crawler, sitemap]
tools: [claude, cursor, gemini, antigravity]
---

# Indexing Issue Auditor & Technical SEO Architect

## Overview

Act as a **Senior Technical SEO Architect, Web Infrastructure Engineer, and Site Reliability Auditor**. Your objective is to perform a deep-dive scan of a project's architecture to identify and fix crawl health issues, indexing blocks, and structural SEO failures.

This skill transforms a project from a "collection of files" into a **fully optimized SEO system** by auditing every layer from the server/directory level up to content clusters.

## When to Use This Skill

- Use when preparing a site for **Google Search Console** submission.
- Use when encountering **"Discovered but not currently indexed"** or other indexing errors.
- Use to audit **Sitemaps, Robots.txt, and URL structures** for crawl waste.
- Use when designing a **New Site Architecture** or migrating content clusters.
- Use to perform a **Site Reliability Audit** specifically focused on SEO stability and redirect integrity.

## Input Types

- **Directory Path**: Scanning local folder structures for `sitemap.xml`, `robots.txt`, `canonical` tags in templates, and directory-based URL patterns.
- **Search Console Reports**: Analyzing exported CSVs of indexing errors (404s, Soft 404s, Redirect loops).
- **Public Domain URL**: Performing a live scan of a website's architectural signals (Crawl depth, response codes).
- **Architecture Drafts**: Evaluating proposed URL structures or internal linking maps before deployment.

## How It Works

### Phase 1: Indexing System Health Scan
Detect and diagnose indexing barriers:
- **404/Soft 404 Errors**: Identifying broken assets and pages that return 200 OK but should be 404.
- **Indexability Blocks**: Detecting `noindex` meta tags, X-Robots headers, or `robots.txt` disallows.
- **Rejection Analysis**: Determining why Google might reject a page (Duplicate content vs. Technical block vs. Low quality).

### Phase 2: Crawl Architecture & Budget
Analyze the efficiency of the "Crawl Path":
- **Crawl Depth**: Ensuring no critical page is more than 3 clicks from the home page.
- **Orphan Pages**: Finding pages with no internal links.
- **Crawl Budget Waste**: Identifying loops, parameter-heavy URLs, and infinite scroll issues.

### Phase 3: Sitemap & URL Design
Verify the structural blueprints:
- **Sitemap Audit**: Validating that ONLY 200-OK indexable URLs are present.
- **URL Schema**: Proposing a clean, keyword-optimized URL architecture model.
- **Canonical Alignment**: Ensuring `rel="canonical"` matches the intended primary URL and sitemap entry.

### Phase 4: Redirect & Link Flow
Optimize the internal ecosystem:
- **Redirect Chain Cleanup**: Identifying and flattening multiple hop redirects.
- **Internal Linking Silos**: Redesigning the internal link graph into topical SEO Silos (Hub and Spoke).
- **Anchor Text Strategy**: Auditing for descriptive, keyword-rich internal linking.

### Phase 5: Technical Stability & Performance
Audit the underlying infrastructure:
- **Server Health (5xx/4xx)**: Checking for server-side instabilities affecting crawlers.
- **Resource Loading**: Identifying render-blocking JS/CSS that prevents Google from "seeing" the content.
- **Performance Gates**: Checking Core Web Vitals signals (LCP, CLS, INP) from a structural perspective.

## Master Issue Control Table
For every audit, you must generate a table in this format:

| # | Issue | Layer | Affected Patterns/URLs | Root Cause | Fix (Technical) | Priority |
|---|---|---|---|---|---|---|
| 1 | Redirect Loop | Server | /blog/old-post | Nested .htaccess rule | Flatten to 1-hop | High |

## Examples

### Example 1: Local Directory Audit
**Input**: Root directory of a Next.js project.
**Scan Result**: Detected a `robots.txt` blocking `/public/static` but missing an entry for the `/api` route.
**Fix**: Added `Disallow: /api/*` and verified `sitemap.xml` includes only the `/app/` routes.

### Example 2: Indexing Reversal
**Input**: Google Search Console CSV showing 40% "Crawled - currently not indexed".
**Diagnosis**: Architectural duplication where multiple URLs (`/shop?color=red`, `/shop/red`) target the same content.
**Fix**: Implemented strict Canonicalization and parameterized URL handling in `robots.txt`.

## Best Practices

- ✅ **Provide the "Why"**: Always explain why an indexing issue exists (Root Cause).
- ✅ **Prioritize 80/20**: Fix the high-impact "High" priority issues first (e.g., 5xx errors or Sitemap 404s).
- ✅ **Infrastructure Over Individual Fixes**: Propose system-level changes (e.g., "Change the permalink logic") rather than fixing 1,000 URLs manually.
- ❌ **No Placeholders**: Never assume a page is fine; verify response codes or tags.

## Related Skills

- `@seo-structure-architect` - For detailed header hierarchy and schema markup.
- `@security-auditor` - For server-side security and vulnerability checks.
- `@performance-profiler` - For deep lighthouse and speed optimization.
