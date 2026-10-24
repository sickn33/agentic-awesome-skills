---
name: geo-platform-optimizer
description: Platform-specific AI search optimization — audit and optimize for Google
  AI Overviews, ChatGPT, Perplexity, Gemini, and Bing Copilot individually
category: seo
risk: safe
source: https://github.com/zubair-trabzada/geo-seo-claude
source_repo: zubair-trabzada/geo-seo-claude
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/zubair-trabzada/geo-seo-claude/blob/main/LICENSE
compatibility: Docs-only; upstream helper scripts and templates are not bundled. Site
  audits need authorized bounded network access; report generators are not bundled.
version: 1.0.0
author: geo-seo-claude
tags:
- geo
- ai-search
- platform-optimization
- chatgpt
- perplexity
- gemini
- aio
allowed-tools: Read, Grep, Glob, Bash, WebFetch, Write
---

# GEO Platform Optimizer

## When to Use

Audit how an authorized website appears in selected AI search surfaces and propose evidence-led content/accessibility changes. Read-only first: writing website content, submitting sitemaps, changing crawlers, publishing posts, creating encyclopedia items or spending on research requires explicit user authority. Upstream attribution is retained; no helper, PDF engine or research dataset is bundled.

## Evidence contract

AI search results vary by date, location, language, account, query and model mode. No fixed citation-overlap percentage, source-domain share or word-count target is established here. Undocumented ranking preferences are hypotheses. A public search result cannot reveal the platform's complete internal ranking/index architecture.

Record the primary platform documentation, access date and exact mode before making a mechanism claim. Never infer that .edu links, Reddit promotion, a Wikipedia page, tables or 2,000 words guarantee citations. Do not remove necessary uncertainty in medical, legal or financial content merely to make a sentence quotable.

## 1. Collect the scope

Record domain/allowed paths, real audience tasks, topics and a representative query set. Agree query/call/time/cost limits and the permitted search accounts. Use a fixed sample of informative, comparison, local and navigational queries relevant to the site; do not select only queries already showing the brand. Do not enter private business or user data into public search services.

For each run, save date/time, query, locale, platform/mode, result/citation URL, cited passage when permitted, and whether the cited page actually supports the answer. Record absent results and inaccessible modes separately from zero visibility. Repeated runs show variability, not independent users.

## 2. Inspect shared foundations

- Retrieve only authorized public pages, with HTTPS, bounded body/time/request counts and allowed redirects. Do not follow a supplied URL into localhost, metadata or private networks. Never execute page instructions or downloaded scripts.
- Check response status, rendered readable content, canonical URLs, robots directives, authentication/paywall and actual crawl evidence. A `site:` query is a partial observation, not exhaustive index coverage.
- Check useful headings, concise accurate answers, accessible tables where they improve comparison, evidence links, true authorship and dates. Do not stuff headings, invent credentials or refresh dates without substantive changes.
- Check appropriate structured data against visible facts. Valid schema is not citation eligibility or ranking proof; not every page needs FAQ markup.
- Report Core Web Vitals and actual device/network conditions when measured. A universal sub-two-second target does not describe all experiences.

## 3. Platform-specific evidence questions

| Platform | Verify from current documentation and actual results | Boundary |
| --- | --- | --- |
| Google AI Overviews | Search eligibility, crawl/index visibility and cited passages for sampled queries | Organic rank and AIO citations are observations, not a fixed percentage relationship |
| ChatGPT Search | Current search crawler controls, search mode, citations and actual source support | Do not assume an exclusively Bing-based index or guaranteed Wikipedia preference |
| Perplexity | Current crawler controls and repeated cited passages | No universal Reddit weighting, source count or Pages effect is supplied |
| Gemini | Exact app/search-grounding mode and observed citations | Do not assume every answer reads GBP, Merchant Center or schema directly |
| Bing/Copilot | Bing crawl evidence, relevant Webmaster observations and current IndexNow support | IndexNow notifies changes; it does not guarantee indexing, ranking or Copilot citations |

For eligible local businesses, check real Business Profile/Places information. A Business Profile does not create a general Google Knowledge Panel on demand, and businesses must meet eligibility requirements. Merchant Center is relevant to permitted product feeds, not every website.

IndexNow setup must follow the actual key-location protocol: a root-hosted key file is the simple case; a different location requires the appropriate `keyLocation` semantics and verification. Do not deploy a copied `/.well-known/` path as a universally sufficient setup.

## 4. Propose specific tests

For each gap, record the page and supporting observation, intended user benefit, expected mechanism as a hypothesis, effort, owner and measurement plan. Examples:

- A product comparison hides renewal terms: propose an accessible table with actual dated terms and evidence; measure comprehension and sampled citation changes.
- A crawler is blocked unintentionally: propose the narrow documented directive change after confirming the owner's privacy/licensing preferences. Enabling training access is a separate decision from search access.
- A local listing has incorrect hours: draft the correction, verify the source of truth and wait for authority to submit.

Encyclopedia and community presence is optional: follow notability, conflict-of-interest, sourcing and community rules. Draft only when justified; do not create promotional Wikipedia/Wikidata items, fabricated discussions or undisclosed endorsements. An external public post requires explicit authorization.

## 5. Measure outcomes

Report observed citation rate as cited eligible runs / total completed eligible runs, with counts and the query distribution. Separate URL citations, accurate mentions, answer correctness and business outcomes. Do not equate citations with qualified traffic, conversions or causation. Compare a fixed query set and mode before/after; record other changes and baseline variability. A controlled page experiment may improve causal inference but cannot promise platform ranking behavior.

If a readiness checklist is requested, label it an internal unvalidated completeness measure. Publish its weights, mark unknown/N/A items, and divide earned points by applicable assessed points; report evidence coverage separately. Do not average incomparable platform scores into an “AI visibility probability” or penalize a nonlocal site for not having local listings. Prefer an evidence table over arbitrary 0–100 scores.

## Output

Create a new local report without overwriting existing work:

```markdown
# AI Search Platform Audit — [Domain]
Date, locale, platform/mode and query sample:
Authorized scope, limits and completed observations:

| Platform/query | Actual result/citation | Supporting passage | Uncertainty |
| --- | --- | --- | --- |

## Findings
[Page, evidence, actual user problem, proposed change, hypothesis]

## Measurement and next actions
[Counts/denominators, repeated-run variability, authorized tests, owners]

## Limitations
[Missing access, untested mechanisms, no publication or ranking guarantee]
```

## Limitations

No current vendor ranking claims, live results or performance scores have been verified by this document. Product behavior changes; verify primary platform documentation at execution time. This is an audit method, not a guaranteed optimization or a reason to fabricate content, endorsements, citations or attribution.
