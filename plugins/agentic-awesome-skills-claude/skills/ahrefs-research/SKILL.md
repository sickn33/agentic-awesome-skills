---
name: "ahrefs-research"
description: "Use Ahrefs exports or an authorized connector to score competitor page gaps, qualify backlinks, cluster forum topics and find editorial fit."
category: "marketing"
risk: "critical"
source: "https://github.com/Illyism/seo-skills"
source_repo: "Illyism/seo-skills"
source_type: "community"
license: "MIT"
license_source: "https://github.com/Illyism/seo-skills/blob/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/README.md#license"
author: "Ilias Ism"
upstream_commit: "a158c36a1c2c84a44ee7a1ae69c009caf73e1a35"
date_added: "2026-11-21"
---

# Ahrefs Research for Coding Agents

## When to Use

Use for Ahrefs-specific competitor top-page gaps, qualified backlink opportunities, search-led forum topic discovery or editorial placement research.

## Choose a data source

Prefer a user-supplied export when it covers the question. Use an existing authorized Ahrefs MCP connection or REST v3 client for missing data. Discover the current read-only tool schema and confirm the target domains, market, selected fields, row limits, total API-unit budget and outbound data before calling it. Check the provider's current unit estimate and stop before the approved ceiling. Keep credentials in the client's credential store. Keep raw exports outside the tracked repo or in user-approved private storage.

## Workflow A: Competitor top-page gaps

1. Collect top pages for the target and a capped set of real competitors. Use the same market and date. Collect URL, top keyword, estimated traffic and traffic value, and referring domains where available.
2. Group rows by search intent. Preserve modifiers that change intent. Exclude competitor-brand navigation, duplicate pages and unrelated high-traffic domains.
3. Cross-check existing site routes and the sitemap. Mark each group Covered, Refresh, New Page or Tool Candidate.
4. Prioritize using `traffic value sum × number of distinct competitors ÷ (1 + median referring domains ÷ 10)`. Report the scoring currency and unit, and leave rows unscored where inputs are missing. Inspect the actual SERP and product fit before selecting tasks.
5. Write `seo/competitor-gaps.md` with the score, rationale, comparable pages and recommended next step. Scaffold approved routes only after checking for duplication.

## Workflow B: Qualify backlink opportunities

1. Inspect the competitor's organic traffic and ranking distribution alongside its referring domains. Treat abrupt spikes, thin keywords and sitewide links as investigation signals.
2. Use a bounded backlinks report with one candidate per referring domain. Check editorial context and topical relevance on the referring page. Exclude irrelevant templates and link farms.
3. Write `seo/link-targets.csv` with the source URL, destination, fit, traffic estimate, evidence date and a proposed legitimate outreach path. Escape formula-leading spreadsheet cells and quote CSV fields.

## Workflow C: Discover forum questions

1. Request top pages scoped to the community path. Capture ranking thread URL, search term, volume and estimated traffic.
2. Cluster buyer questions by intent and read the threads for context. Record the thread links, a paraphrase of the problem and the proposed content format in `seo/reddit-topics.md`.
3. Cross-check product fit and content already published. Keep direct quotes minimal and attributed. Do not post replies or collect private user information.

## Workflow D: Find an editorial fit

1. Review the most relevant eligible article pages for each prospect. Skip navigation, legal and account pages.
2. Record one contextual opportunity or “no fit” with the best matching URL, topic, evidence and relevance in `seo/insertion-targets.md`.
3. Keep any proposed editorial pitch in draft. Do not buy links or contact prospects as part of the research.

## Example

Three peer domains rank for preview deployments and the target already has an unranked guide for that topic. Calculate a score using one comparable row per peer, label the opportunity Refresh, and cite the guide and the source report in the backlog. A report with only one overlapping peer stays low-confidence.

## Limitations

Ahrefs traffic and link metrics are estimates. Thresholds and scores are prioritization tools, and an apparent anomaly does not prove manipulation. Report missing or stale fields and never fabricate rows to meet a quota.

Adapted from [Ilias Ism’s upstream skill](https://github.com/Illyism/seo-skills/tree/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/seo/ahrefs-research).
