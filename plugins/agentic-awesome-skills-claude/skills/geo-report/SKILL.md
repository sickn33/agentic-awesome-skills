---
name: geo-report
description: Generate a professional, client-facing GEO report combining all audit
  results into a single deliverable with scores, findings, and prioritized actions
category: seo
risk: safe
source: https://github.com/zubair-trabzada/geo-seo-claude
source_repo: zubair-trabzada/geo-seo-claude
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/zubair-trabzada/geo-seo-claude/blob/main/LICENSE
compatibility: Docs-only; upstream helper scripts and templates are not bundled. Site
  audits need network access to the target site; PDF reports need pandoc and headless
  Chrome.
version: 1.0.0
author: geo-seo-claude
tags:
- geo
- report
- client-deliverable
- executive-summary
- action-plan
allowed-tools: Read, Grep, Glob, Bash, WebFetch, Write
---

# GEO Client Report Generator

## Purpose

This skill aggregates outputs from all GEO audit skills into a single, professional report that can be delivered directly to a client or stakeholder. The report is written for **business owners and marketing leaders**, not developers — technical findings are translated into business impact and clear action items with priority levels.

## How to Use This Skill

1. Run the following audits first (or use existing report data):
   - `geo-platform-optimizer` -> GEO-PLATFORM-OPTIMIZATION.md
   - `geo-schema` -> GEO-SCHEMA-REPORT.md
   - `geo-technical` -> GEO-TECHNICAL-AUDIT.md
   - `geo-content` -> GEO-CONTENT-ANALYSIS.md
   - (Optional) `geo-llmstxt` -> llms.txt assessment
   - (Optional) `geo-brand-mentions` -> brand authority data
2. Collect all scores and findings
3. Calculate the composite GEO Readiness Score
4. Generate the client report using the template below
5. Output: GEO-CLIENT-REPORT.md

---

## GEO Readiness Score Calculation

### Component Weights

| Component | Weight | Source Skill |
|---|---|---|
| AI Platform Readiness | 25% | geo-platform-optimizer |
| Content Quality & E-E-A-T | 25% | geo-content |
| Technical Foundation | 20% | geo-technical |
| Schema & Structured Data | 15% | geo-schema |
| Brand Authority & Entity Presence | 15% | geo-platform-optimizer (entity signals) |

### Score Formula
```
GEO Score = (Platform Score * 0.25) + (Content Score * 0.25) + (Technical Score * 0.20) + (Schema Score * 0.15) + (Brand Score * 0.15)
```

Validate each available component in [0,100] and round only the final sum. These weights are an editorial rubric, not a platform-endorsed ranking or citation probability. Missing audits are N/A, not zero; do not publish a comparable composite unless all five components use the same rubric/scope/date. Example: five scores of 80 yield 80/100; this does not predict 80% citation likelihood.

### Score Interpretation for Clients

| Score Range | Label | Client-Facing Description |
|---|---|---|
| 85-100 | Excellent | Few gaps under the documented audit rubric; actual visibility unmeasured unless separately sampled. |
| 70-84 | Good | Several documented improvements remain. |
| 55-69 | Moderate | Review the observed gaps and coverage limits. |
| 40-54 | Below Average | Many rubric checks need attention; no competitive-loss inference follows. |
| 0-39 | Needs Attention | Prioritize verified access/content defects; score alone does not prove invisibility. |

---

## Report Template

The complete report follows this exact structure. Each section includes instructions on what to write and how.

---

### Section 1: Executive Summary

Write exactly ONE paragraph (4-6 sentences) covering:
- What was analyzed (domain, number of pages, date of analysis)
- The overall GEO Readiness Score with context ("XX/100, which places [brand] in the [label] tier")
- The single most impactful finding (positive or negative)
- Top 3 priority recommendations in one sentence
- One evidence-supported business implication. Include monetary scenarios only with measured baseline, explicit assumptions and uncertainty; otherwise state impact unmeasured.

**Tone**: Confident, direct, professional. No jargon. Distinguish observations, uncertainty and hypotheses. Write as a consultant delivering findings, not as a tool generating a report.

### Section 2: GEO Readiness Score

Present the overall score prominently:

```
## GEO Readiness Score: XX/100 — [Label]
```

Then break down by component in a table:

```markdown
| Component | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Platform Readiness | XX/100 | 25% | XX |
| Content Quality & E-E-A-T | XX/100 | 25% | XX |
| Technical Foundation | XX/100 | 20% | XX |
| Schema & Structured Data | XX/100 | 15% | XX |
| Brand Authority | XX/100 | 15% | XX |
| **Overall** | | | **XX/100** |
```

### Section 3: AI Visibility Dashboard

Present per-platform readiness scores:

```markdown
## AI Visibility Dashboard

| AI Platform | Readiness Score | Key Gap | Priority Action |
|---|---|---|---|
| Google AI Overviews | XX/100 | [One-line gap] | [One-line action] |
| ChatGPT Web Search | XX/100 | [One-line gap] | [One-line action] |
| Perplexity AI | XX/100 | [One-line gap] | [One-line action] |
| Google Gemini | XX/100 | [One-line gap] | [One-line action] |
| Bing Copilot | XX/100 | [One-line gap] | [One-line action] |
```

Add a brief paragraph explaining what these scores mean: "These scores summarize checks in our disclosed rubric; they do not estimate citation probability. Report measured citations separately with prompt set, locale, date, account/mode and sampling limitations."

### Section 4: AI Crawler Access Status

Present as a clear table:

```markdown
## AI Crawler Access

| AI Crawler | Platform | Status | Impact | Recommendation |
|---|---|---|---|---|
| Googlebot | Google Search + AIO | Allowed/Blocked | Critical | [Action] |
| OAI-SearchBot | OpenAI search discovery | Allowed/Blocked/Unknown | [Observed effect] | [Action] |
| GPTBot | OpenAI model-training crawl | Allowed/Blocked/Unknown | Policy choice | [Action] |
| Bingbot | Bing + Copilot + ChatGPT | Allowed/Blocked | High | [Action] |
| PerplexityBot | Perplexity AI | Allowed/Blocked | Medium | [Action] |
| Google-Extended | Gemini Training | Allowed/Blocked | Medium | [Action] |
| ClaudeBot | Anthropic Claude | Allowed/Blocked | Medium | [Action] |
| Applebot-Extended | Apple Intelligence | Allowed/Blocked | Medium | [Action] |
```

**Translate for the client**: Distinguish search discovery, user-requested fetching and training controls using current vendor documentation. Allowing training is not required for search eligibility. Respect the owner’s licensing/privacy opt-outs; robots rules do not guarantee crawling, indexing, citation or access control.

### Section 5: Brand Authority Analysis

Present entity presence across platforms:

```markdown
## Brand Authority

| Platform | Presence | Status | Impact on AI Visibility |
|---|---|---|---|
| Wikipedia | Yes/No | [Detail] | [Observed relevance; no universal citation share] |
| Wikidata | Yes/No | [Detail] | High — machine-readable entity data |
| LinkedIn | Yes/No | [Detail] | High — Bing Copilot and ChatGPT signal |
| YouTube | Yes/No | [Detail] | High — Gemini and Perplexity signal |
| Reddit | Yes/No | [Detail] | [Observed relevance; no universal citation share] |
| Google Knowledge Panel | Yes/No | [Detail] | High — Gemini entity recognition |
| Crunchbase | Yes/No | [Detail] | Medium — entity validation |
| GitHub | Yes/No | [Detail] | Medium — tech brand signal |
```

**Translate for the client**: "AI platforms build trust by cross-referencing your brand across multiple authoritative sources. Accurate relevant profiles help readers verify identity; no causal citation increase is established by profile count alone."

### Section 6: Citability Analysis

#### Top 5 Most Citable Pages
For each page:
- URL
- Why it is citable (structure, depth, E-E-A-T signals)
- One specific improvement that would make it even more citable

#### Top 5 Least Citable Pages
For each page:
- URL
- Why it is unlikely to be cited (thin content, poor structure, missing signals)
- Specific rewrite or restructure recommendation

**Business impact framing**: "Your most citable pages are your best candidates for appearing in AI-generated answers. Prioritize those pages only after assessing audience need, observed defects, effort and measured outcomes."

### Section 7: Technical Health Summary

Present the key technical findings in business-friendly language:

```markdown
## Technical Health

| Area | Status | Business Impact |
|---|---|---|
| Core Web Vitals | Good/Needs Work/Poor | [Impact on user experience and rankings] |
| Server-Side Rendering | Yes/Partial/No | [Impact on AI crawler visibility] |
| Mobile Optimization | Good/Needs Work/Poor | [Impact on Google's mobile-first indexing] |
| Security (HTTPS + Headers) | Good/Needs Work/Poor | [Impact on trust signals] |
| Page Speed | Fast/Average/Slow | [Impact on user experience and crawl budget] |
| IndexNow Protocol | Implemented/Not | [Impact on Bing/ChatGPT indexing speed] |
```

**Rendering finding**: Compare fetched HTML and rendered content for representative URLs and named crawlers. Client-side rendering does not by itself prove an empty page, exclusion or the highest-impact defect. Report observed missing content and rendering limitations.

### Section 8: Schema & Structured Data

```markdown
## Schema & Structured Data

### Current Implementation
| Schema Type | Present | Status | AI Impact |
|---|---|---|---|
| Organization | Yes/No | [Valid/Issues] | Critical — entity recognition |
| Article + Author | Yes/No | [Valid/Issues] | High — E-E-A-T signal |
| sameAs (entity links) | Yes/No | [Count] links | Critical — cross-platform entity graph |
| [Business-specific] | Yes/No | [Valid/Issues] | [Impact] |
| WebSite | Yes/No | [Valid/Issues] | [Applicable use; Google sitelinks search box retired in 2024] |
| BreadcrumbList | Yes/No | [Valid/Issues] | Low-Medium — navigation context |
```

Only claim code is prepared if actual reviewed markup is included and matches visible content. Valid schema is not a promise of rich results or AI citation.

### Section 9: llms.txt Status

```markdown
## llms.txt — AI Content Guide

| File | Status | Recommendation |
|---|---|---|
| /llms.txt | Present/Missing | [Action] |
| /llms-full.txt | Present/Missing | [Action] |
```

**Translate for the client**: "llms.txt is a proposal for a content guide, not robots access control or a required AI-search eligibility file. No adoption, ranking or competitive benefit is implied; treat implementation as optional and avoid publishing private content."

### Section 10: Prioritized Action Plan

This is the most important section of the report. Organize actions by timeline and impact.

```markdown
## Prioritized Action Plan

### Quick Wins (This Week)
*High impact, low effort — can be implemented immediately*

| # | Action | Impact | Effort | Platforms Affected |
|---|---|---|---|---|
| 1 | [Specific action] | [High/Med] | [Hours estimate] | [Which AI platforms] |
| 2 | [Specific action] | [High/Med] | [Hours estimate] | [Which AI platforms] |
```

**Quick Win criteria**: Can be done in < 4 hours by one person. Examples:
- Unblock AI crawlers in robots.txt
- Add publication dates to existing content
- Add author bylines with credentials
- Fix broken meta descriptions
- Add sameAs properties to existing Organization schema
- Create/claim llms.txt file

```markdown
### Medium-Term Improvements (This Month)
*Significant impact, moderate effort — requires content or technical changes*

| # | Action | Impact | Effort | Platforms Affected |
|---|---|---|---|---|
| 1 | [Specific action] | [High/Med] | [Days estimate] | [Which AI platforms] |
```

**Medium-Term criteria**: 1-5 days of work. Examples:
- Restructure top 10 pages with question-based headings and direct answers
- Implement comprehensive Schema.org markup
- Create author pages with credentials and sameAs links
- Optimize Core Web Vitals (image compression, code splitting)
- Register and configure Bing Webmaster Tools
- Implement IndexNow protocol

```markdown
### Strategic Initiatives (This Quarter)
*Long-term competitive advantage, requires ongoing investment*

| # | Action | Impact | Effort | Platforms Affected |
|---|---|---|---|---|
| 1 | [Specific action] | [High/Med] | [Weeks estimate] | [Which AI platforms] |
```

**Strategic criteria**: Ongoing effort over weeks/months. Examples:
- Build Wikipedia/Wikidata entity presence
- Develop active Reddit community engagement strategy
- Create YouTube content strategy aligned with search queries
- Implement server-side rendering (if currently client-rendered)
- Build topical authority through comprehensive content strategy
- Establish original research/data publication program

### Estimated Impact
After the action plan, include an impact estimate:

Use measured baseline data or state “impact not quantified.” Never translate rubric
points directly into citation/traffic/revenue lift. An explicitly hypothetical scenario
may show the arithmetic: 100 incremental qualified visits × 2% conversion × $50
contribution per conversion = $100/month before implementation cost, assuming those
visits and conversions occur. Record attribution window, uncertainty and validation
plan; this arithmetic is not a forecast or industry benchmark.

### Section 11: Competitor Comparison (if competitor URLs provided)

If competitor URLs were analyzed alongside the primary domain:

```markdown
## Competitor Comparison

| Metric | [Your Brand] | [Competitor 1] | [Competitor 2] |
|---|---|---|---|
| Overall GEO Score | XX/100 | XX/100 | XX/100 |
| Google AIO Readiness | XX/100 | XX/100 | XX/100 |
| ChatGPT Readiness | XX/100 | XX/100 | XX/100 |
| Perplexity Readiness | XX/100 | XX/100 | XX/100 |
| Schema Coverage | [Detail] | [Detail] | [Detail] |
| Wikipedia Presence | Yes/No | Yes/No | Yes/No |
| Reddit Authority | [Detail] | [Detail] | [Detail] |
| SSR Status | Yes/No | Yes/No | Yes/No |

### Where You Lead
[Specific areas where the brand outperforms competitors]

### Where You Trail
[Specific areas where competitors have an advantage, with actions to close the gap]
```

### Section 12: Appendix

```markdown
## Appendix

### Methodology
This GEO audit was conducted using the following methodology:
- **Pages analyzed**: [List of specific URLs audited]
- **Platforms assessed**: Google AI Overviews, ChatGPT, Perplexity AI, Google Gemini, Bing Copilot
- **Technical checks**: HTTP headers, robots.txt, HTML source analysis, structured data validation
- **Content assessment**: E-E-A-T framework (Experience, Expertise, Authoritativeness, Trustworthiness) as a disclosed editorial framework; cite the exact edition actually consulted
- **Schema validation**: JSON-LD parsing and Schema.org specification compliance
- **Date of analysis**: [Date]

### Data Sources
- Google Search Quality Rater Guidelines (actual consulted edition/date/link)
- Schema.org full type hierarchy
- Only studies actually consulted, with URL, sample/method/date and applicable limitations
- Core Web Vitals documentation actually consulted (URL/date)
- AI crawler user-agent documentation (per-platform official docs)

### Glossary

| Term | Definition |
|---|---|
| GEO | Generative Engine Optimization — optimizing content to be cited by AI search platforms |
| AIO | AI Overviews — Google's AI-generated answer boxes at the top of search results |
| E-E-A-T | Experience, Expertise, Authoritativeness, Trustworthiness — Google's content quality framework |
| SSR | Server-Side Rendering — generating HTML on the server so crawlers can read content without JavaScript |
| CWV | Core Web Vitals — Google's page experience metrics (LCP, INP, CLS) |
| LCP | Largest Contentful Paint — time to render the largest visible element |
| INP | Interaction to Next Paint — responsiveness metric (replaced FID in March 2024) |
| CLS | Cumulative Layout Shift — visual stability metric |
| JSON-LD | JavaScript Object Notation for Linked Data — preferred structured data format |
| sameAs | Schema.org property linking an entity to its profiles on other platforms |
| IndexNow | Protocol for instantly notifying search engines of content changes |
| llms.txt | Proposed standard file for guiding AI systems about a site's content |
| YMYL | Your Money or Your Life — topics requiring highest E-E-A-T standards |
| SERP | Search Engine Results Page |
| Topical Authority | The depth and breadth of a site's coverage of its core topic area |
```

---

## Formatting and Tone Guidelines

### Formatting
- Use clean markdown throughout: tables, headers (H2/H3), bullet points, bold for emphasis
- Tables for data, bullets for recommendations, bold for key terms
- One blank line between sections for readability
- Use horizontal rules (---) to separate major sections
- All URLs should be absolute (not relative)

### Tone
- **Professional but accessible** — written for a business owner, not a developer
- **Confident and direct** — state verified observations clearly and label uncertain inferences
- **Action-oriented** — every finding should connect to a specific action
- **Business-impact focused** — translate technical issues into business outcomes
- Avoid: jargon without explanation, unsupported certainty, passive voice, irrelevant caveats
- Use: "Your site [does/does not]...", "We recommend...", "This impacts..."

### Dollar-Value Framing
Connect recommendations to verified user/business problems and measured baselines.
Use the explicit hypothetical arithmetic above only as a scenario, never as evidence
that a score increase causes traffic or revenue. Report implementation costs and
measurement gaps; never guarantee results.
---

## Output

Generate **GEO-CLIENT-REPORT.md** using the complete template above, filled with actual audit data. The report should be:
- Appropriate to scope and audience; word count does not imply a fixed page count
- Ready for factual/privacy/owner review before authorized delivery
- Self-contained (no references to other report files — all relevant data is included)
- Printable and presentable (clean markdown formatting)

## When to Use

- You need a Generative Engine Optimization task for a website: audit, citability, crawlers, schema, llms.txt, content, platform tuning, or client reporting.
- Run read-only analysis first; propose site changes before making any.

## Limitations

- Audits are read-only analysis; never publish, deploy, or modify the target site without explicit approval.
- Scores and citation likelihoods are heuristics, not guarantees from AI search platforms.
- Docs-only import: upstream scripts, agents, hooks, and schema templates are not bundled.

### Example

```bash
curl -s https://example.com/robots.txt
curl -s https://example.com/llms.txt
```

> Adapted from [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: upstream runtime helpers not bundled.
