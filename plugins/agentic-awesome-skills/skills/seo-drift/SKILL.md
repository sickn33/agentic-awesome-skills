---
name: seo-drift
description: "Snapshot a site's SEO state and detect ranking, indexation, metadata, canonical, robots, schema, and on-page regressions over time."
category: marketing
risk: safe
source: https://github.com/nowork-studio/NotFair/tree/main/seo/seo-drift
source_repo: nowork-studio/NotFair
source_type: official
date_added: "2026-07-22"
author: nowork-studio
tags: [seo, monitoring, search-console, technical-seo, regression-testing]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/nowork-studio/NotFair/blob/main/LICENSE
---

# SEO Drift Monitoring

## Overview

Capture a known-good SEO baseline and compare later snapshots against it so regressions become visible. The skill combines search-performance data with live on-page checks to surface ranking drops, deindexation, overwritten metadata, directive changes, and missing schema before they quietly cost traffic.

This portable version is adapted from the official [`seo-drift` skill in NotFair](https://github.com/nowork-studio/NotFair/tree/main/seo/seo-drift).

## When to Use

Use this skill when the user asks to:

- baseline or monitor a site's SEO over time;
- check whether a migration, redesign, CMS change, or redeploy damaged SEO;
- compare current search performance and page metadata with a prior snapshot;
- investigate titles, descriptions, canonicals, robots directives, or schema that changed unexpectedly;
- identify rankings or indexed pages that disappeared.

For a one-time comprehensive SEO audit with no historical comparison, use a general SEO audit skill instead.

## Prerequisites

Before capturing data:

1. Confirm the site and the key URLs in scope. Prefer top organic landing pages, commercial pages, and any URLs affected by a recent release.
2. Confirm baseline or compare mode. If no prior snapshot exists, use baseline mode and explain that there is nothing to compare yet.
3. Ask where the snapshot should be stored. Use a local `seo-drift/` directory alongside the user's other audit reports only after confirming the intended project or reports location.
4. Prefer a connected Google Search Console source for query, page, position, impression, click, and indexation signals.
5. Use a browser or web-fetch capability for current on-page values. Respect robots directives and avoid high-volume crawling.

If Search Console is unavailable, continue only with the on-page comparison and state that ranking and indexation drift could not be measured. Never infer missing Search Console values from a live crawl.

## How It Works

### 1. Choose the comparison boundary

Record:

- the site property and snapshot date supplied by the user or runtime;
- whether the snapshot is a baseline or comparison;
- the prior snapshot used for comparison, when applicable;
- the exact URL set and search-data window;
- any known migration, release, or CMS event that may explain expected changes.

Do not invent dates or silently compare mismatched date windows.

### 2. Capture the current snapshot

For the agreed URL set, collect:

- **Search performance:** query and page clicks, impressions, click-through rate, and average position for a stable window;
- **Indexation:** indexed status or coverage evidence for each key URL when the connected source exposes it;
- **Metadata:** title, meta description, and H1;
- **Directives:** canonical URL, robots header, and meta-robots value;
- **Structured data:** schema types present;
- **Content shape:** word count and another stable content fingerprint or summary useful for detecting large changes.

Persist both the values and their source. Keep unavailable fields as `unknown`; do not coerce them to zero or absent.

### 3. Diff against the previous baseline

Surface changes in five groups:

1. **Rankings:** queries that dropped by the agreed threshold or disappeared from the observed window.
2. **Indexation:** key pages that lost indexed status or a material drop in indexed-page count.
3. **Metadata:** titles, descriptions, or H1s that changed, became blank, or fell back to a generic template.
4. **Directives:** canonicals that changed or disappeared, and newly introduced `noindex` directives.
5. **Schema:** structured-data types that disappeared from pages where they previously existed.

Separate expected content changes from unexplained regressions. A changed value is evidence of drift, not proof of causation.

### 4. Rank severity

Use these default levels:

- **Critical:** an important page is newly `noindex`, deindexed, or canonicalized to an unintended URL.
- **Warning:** a material ranking decline, lost query visibility, blank or generic metadata, or missing schema.
- **Info:** an expected content or metadata change with no observed search-performance harm.

Put directive and indexation failures first because they can suppress the entire page regardless of content quality.

### 5. Report and preserve evidence

For every reported change, include:

- URL and field or metric;
- before and after values;
- comparison dates and data window;
- severity and likely cause, clearly labeled as an inference;
- the next verification or repair action.

End by offering to create a new baseline only after the user confirms that intended changes and critical repairs are complete.

## Example

```text
User: Baseline SEO for https://example.com before Friday's redesign. Track /, /pricing, and /docs.

Agent: I will capture a dated baseline for those three URLs, using Search Console for
query/page performance and live fetches for metadata, directives, schema, and content
shape. I will save it under the confirmed reports directory and use the same URL set and
Search Console window for the post-redesign comparison.
```

## Best Practices

- Keep the key URL set stable so comparisons remain interpretable.
- Compare equivalent Search Console windows and call out incomplete or delayed data.
- Preserve raw snapshot evidence separately from the narrative report.
- Treat missing data as unknown, not as a decline.
- Verify a critical directive or canonical change with a second live fetch before escalating it.
- Label likely causes as hypotheses until repository, CMS, deployment, or change-history evidence confirms them.

## Limitations

- Search Console data can lag and may suppress low-volume queries.
- A live crawl cannot prove that Google has indexed a page or adopted its canonical.
- Position changes can reflect seasonality, SERP composition, location, device mix, or competitors rather than a site regression.
- The skill does not replace server-log analysis, full-crawl tooling, or manual review of a large migration.
- Comparisons are unreliable when URL sets, date windows, locales, or device filters differ without normalization.

## Security & Safety Notes

- Write snapshots only inside the user-confirmed project or reports directory.
- Do not store authentication tokens, cookies, or raw credentials in snapshots.
- Use read-only Search Console access and non-mutating page fetches.
- Avoid aggressive crawling; honor access restrictions and keep requests bounded to the agreed scope.
- Do not change production metadata, canonicals, robots directives, or deployment settings without a separate, explicit implementation request.
