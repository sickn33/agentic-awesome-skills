---
name: fixing-metadata
description: "Audit and fix HTML metadata including page titles, meta descriptions, canonical URLs, Open Graph tags, Twitter cards, favicons, JSON-LD structured data, and robots directives. Use when adding or reviewing SEO and social metadata."
risk: safe
source: community
version: 1.0.1
license: MIT
---

## Workflow

1. Identify pages with missing or incorrect metadata (titles, descriptions, canonical, OG tags)
2. Audit against the priority rules below — fix critical issues (duplicates, indexing) first
3. Ensure title, description, canonical, and og:url all agree with each other
4. Verify social cards render correctly on a real URL, not localhost
5. Keep diffs minimal and scoped to metadata only — do not refactor unrelated code
## When to Use
Reference these guidelines when:
- adding or changing page titles, descriptions, canonical, robots
- implementing Open Graph or Twitter card metadata
- setting favicons, app icons, manifest, theme-color
- building shared SEO components or layout metadata defaults
- adding structured data (JSON-LD)
- changing locale, alternate languages, or canonical routing
- shipping new pages, marketing pages, or shareable links

## rule categories by priority

| priority | category | impact |
|----------|----------|--------|
| 1 | correctness and duplication | critical |
| 2 | title and description | high |
| 3 | canonical and indexing | high |
| 4 | social cards | high |
| 5 | icons and manifest | medium |
| 6 | structured data | medium |
| 7 | locale and alternates | low-medium |
| 8 | tool boundaries | critical |

## quick reference

### 1. correctness and duplication (critical)

- define metadata in one place per page, avoid competing systems
- do not emit duplicate title, description, canonical, or robots tags
- metadata must be deterministic, no random or unstable values
- escape and sanitize any user-generated or dynamic strings
- every page must have safe defaults for title and description

### 2. title and description (high)

- every page must have a title
- use a consistent title format across the site
- keep titles short and readable, avoid stuffing
- shareable or searchable pages should have a meta description
- descriptions must be plain text, no markdown or quote spam

### 3. canonical and indexing (high)

- canonical must point to the preferred URL for the page
- use noindex only for private, duplicate, or non-public pages
- robots meta must match actual access intent
- previews or staging pages should be noindex by default when possible
- paginated pages must have correct canonical behavior

### 4. social cards (high)

- shareable pages must set Open Graph title, description, and image
- Open Graph and Twitter images must use absolute URLs
- prefer correct image dimensions and stable aspect ratios
- og:url must match the canonical URL
- use a sensible og:type, usually website or article
- set twitter:card appropriately, summary_large_image by default

### 5. icons and manifest (medium)

- include at least one favicon that works across browsers
- include apple-touch-icon when relevant
- manifest must be valid and referenced when used
- set theme-color intentionally to avoid mismatched UI chrome
- icon paths should be stable and cacheable

### 6. structured data (medium)

- do not add JSON-LD unless it clearly maps to real page content
- JSON-LD must be valid and reflect what is actually rendered
- do not invent ratings, reviews, prices, or organization details
- prefer one structured data block per page unless required

### 7. locale and alternates (low-medium)

- set the html lang attribute correctly
- set og:locale when localization exists
- add hreflang alternates only when pages truly exist
- localized pages must canonicalize correctly per locale

### 8. tool boundaries (critical)

- prefer minimal changes, do not refactor unrelated code
- do not migrate frameworks or SEO libraries unless requested
- follow the project's existing metadata pattern (Next.js metadata API, react-helmet, manual head, etc.)

## review guidance

- fix critical issues first (duplicates, canonical, indexing)
- ensure title, description, canonical, and og:url agree
- verify social cards on a real URL, not localhost
- prefer stable, boring metadata over clever or dynamic
- keep diffs minimal and scoped to metadata only

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
