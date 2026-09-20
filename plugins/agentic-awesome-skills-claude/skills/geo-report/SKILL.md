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

Round to the nearest integer. Cap at 100.

### Score Interpretation for Clients

| Score Range | Label | Client-Facing Description |
|---|---|---|
| 85-100 | Excellent | Your site is well-positioned for AI search. Focus on maintaining and expanding your advantage. |
| 70-84 | Good | Solid foundation with clear opportunities to improve AI visibility. Targeted optimizations will yield significant results. |
| 55-69 | Moderate | Your site has gaps in AI readiness that competitors may be exploiting. A structured optimization plan will close these gaps. |
| 40-54 | Below Average | Significant barriers to AI search visibility exist. Without action, your brand risks being invisible in AI-generated answers. |
| 0-39 | Needs Attention | Critical AI readiness issues require immediate action. Your competitors are likely capturing the AI search traffic your brand should own. |

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
- One sentence on the business impact ("Addressing these recommendations could increase AI-driven traffic by an estimated XX%, representing approximately $X,XXX/month based on current traffic patterns")

**Tone**: Confident, direct, professional. No jargon. No hedging. Write as a consultant delivering findings, not as a tool generating a report.

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

Add a brief paragraph explaining what these scores mean: "These scores reflect how likely your content is to be cited by each AI search platform. A score below 50 indicates significant barriers to citation on that platform."

### Section 4: AI Crawler Access Status

Present as a clear table:

```markdown
## AI Crawler Access

| AI Crawler | Platform | Status | Impact | Recommendation |
|---|---|---|---|---|
| Googlebot | Google Search + AIO | Allowed/Blocked | Critical | [Action] |
| GPTBot | ChatGPT / OpenAI | Allowed/Blocked | High | [Action] |
| Bingbot | Bing + Copilot + ChatGPT | Allowed/Blocked | High | [Action] |
| PerplexityBot | Perplexity AI | Allowed/Blocked | Medium | [Action] |
| Google-Extended | Gemini Training | Allowed/Blocked | Medium | [Action] |
| ClaudeBot | Anthropic Claude | Allowed/Blocked | Medium | [Action] |
| Applebot-Extended | Apple Intelligence | Allowed/Blocked | Medium | [Action] |
```

**Translate for the client**: "Blocking AI crawlers is like closing your store during business hours. If a crawler cannot access your site, the AI platform it powers cannot cite your content. We recommend allowing all major AI crawlers unless you have a specific data licensing concern."

### Section 5: Brand Authority Analysis

Present entity presence across platforms:

```markdown
## Brand Authority

| Platform | Presence | Status | Impact on AI Visibility |
|---|---|---|---|
| Wikipedia | Yes/No | [Detail] | Very High — 47.9% of ChatGPT citations are Wikipedia |
| Wikidata | Yes/No | [Detail] | High — machine-readable entity data |
| LinkedIn | Yes/No | [Detail] | High — Bing Copilot and ChatGPT signal |
| YouTube | Yes/No | [Detail] | High — Gemini and Perplexity signal |
| Reddit | Yes/No | [Detail] | Very High — 46.7% of Perplexity citations are Reddit |
| Google Knowledge Panel | Yes/No | [Detail] | High — Gemini entity recognition |
| Crunchbase | Yes/No | [Detail] | Medium — entity validation |
| GitHub | Yes/No | [Detail] | Medium — tech brand signal |
```

**Translate for the client**: "AI platforms build trust by cross-referencing your brand across multiple authoritative sources. Each platform where your brand has an accurate, consistent presence increases the likelihood of being cited in AI answers."

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

**Business impact framing**: "Your most citable pages are your best candidates for appearing in AI-generated answers. Improving the 5 least citable pages represents the highest-ROI content investment you can make for AI visibility."

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

**Critical finding callout**: If SSR is missing or partial, highlight this prominently: "Your site uses client-side rendering, which means AI crawlers see an empty page when they visit. This is the single most impactful technical issue for AI search visibility. Until this is resolved, most AI platforms cannot cite your content."

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
| WebSite + SearchAction | Yes/No | [Valid/Issues] | Medium — sitelinks |
| BreadcrumbList | Yes/No | [Valid/Issues] | Low-Medium — navigation context |
```

If schemas are missing, note: "Ready-to-use structured data code has been prepared and is included in the technical appendix. Your development team can add this to your site with minimal effort."

### Section 9: llms.txt Status

```markdown
## llms.txt — AI Content Guide

| File | Status | Recommendation |
|---|---|---|
| /llms.txt | Present/Missing | [Action] |
| /llms-full.txt | Present/Missing | [Action] |
```

**Translate for the client**: "llms.txt is an emerging standard (similar to robots.txt) that tells AI systems what your site is about and which pages are most important. While not universally adopted yet, implementing it positions your brand ahead of competitors and provides direct guidance to AI platforms."

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

"Based on industry benchmarks and the specific gaps identified in this audit:
- **Quick Wins alone** could improve your GEO score by approximately [X-Y] points
- **Full implementation** of this action plan could improve your GEO score to approximately [XX]/100
- At current traffic levels and conversion rates, improved AI visibility represents an estimated **$X,XXX - $XX,XXX per month** in additional organic value"

Use conservative estimates. Base the dollar figure on:
- Current estimated organic traffic value (from analytics if available, or estimate from industry benchmarks)
- AI search is projected to drive 25-40% of organic discovery by end of 2026
- A 10-point GEO score improvement typically correlates with a 15-25% increase in AI citation frequency

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
- **Content assessment**: E-E-A-T framework (Experience, Expertise, Authoritativeness, Trustworthiness) per Google's December 2025 Quality Rater Guidelines
- **Schema validation**: JSON-LD parsing and Schema.org specification compliance
- **Date of analysis**: [Date]

### Data Sources
- Google Search Quality Rater Guidelines (December 2025 update)
- Schema.org full type hierarchy
- Industry citation studies (Zyppy, Authoritas, Semrush AI search research, 2025-2026)
- Core Web Vitals thresholds (web.dev, 2026 standards)
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
- **Confident and direct** — state findings as conclusions, not possibilities
- **Action-oriented** — every finding should connect to a specific action
- **Business-impact focused** — translate technical issues into business outcomes
- Avoid: jargon without explanation, hedging language, passive voice, excessive caveats
- Use: "Your site [does/does not]...", "We recommend...", "This impacts..."

### Dollar-Value Framing
Where possible, connect recommendations to business value:
- "Improving your Google AIO readiness from 35 to 70 could increase your presence in AI Overviews by an estimated 50%, which at current search volumes represents approximately 2,000 additional monthly visitors"
- "Server-side rendering would make your content accessible to ChatGPT, Perplexity, and other AI platforms — collectively representing an audience your competitors are already reaching"
- "The investment in Schema.org markup (estimated 8-16 hours of developer time) could increase your entity recognition score from 20 to 75, significantly improving citation probability"

Be conservative with estimates. State assumptions clearly. Never guarantee specific results.

---

## Output

Generate **GEO-CLIENT-REPORT.md** using the complete template above, filled with actual audit data. The report should be:
- 40-80 pages equivalent in detail (3,000-6,000 words)
- Ready to send to a client without editing
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
