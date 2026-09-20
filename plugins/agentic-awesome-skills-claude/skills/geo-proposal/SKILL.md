---
name: geo-proposal
description: Auto-generate a professional, client-ready GEO service proposal from
  audit data.
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
tags:
- geo
- business
- proposal
- sales
- pricing
- client
allowed-tools: Read, Write, Bash, Glob, WebFetch
---

# GEO Proposal Generator

## Purpose

Generate a fully customized, client-ready GEO service proposal that:
1. Pulls findings directly from the prospect's GEO audit
2. Translates technical gaps into business pain points
3. Presents 3 service tiers with clear pricing
4. Includes a realistic ROI projection
5. Outputs a professional markdown document ready to send

---

## Command

```
/geo proposal <domain-or-audit-file> [--tier basic|standard|premium] [--client-name "Name"] [--monthly EUR]
```

**Examples:**
```
/geo proposal electron-srl.com
/geo proposal electron-srl.com --tier standard --client-name "Electron Srl"
/geo proposal ~/.geo-prospects/audits/electron-srl.com-2026-03-12.md
```

---

## Workflow

### Step 1: Load Audit Data

1. Check if `~/.geo-prospects/audits/<domain>*.md` exists
2. If not, suggest running `/geo quick <domain>` first
3. Extract from audit:
   - GEO Score (overall and per-category)
   - Top 3 critical findings
   - Quick wins list
   - Business type
   - Estimated organic traffic impact

### Step 2: Customize the Proposal

Auto-fill proposal template with:
- Company name (from domain or prospect record)
- GEO score and tier label
- 3 most critical pain points (translated to business language)
- Estimated revenue at risk from AI search shift
- Recommended service tier based on score:
  - Score 0-40 → Recommend Premium (critical issues need full attention)
  - Score 41-60 → Recommend Standard (significant gaps, needs monthly work)
  - Score 61-75 → Recommend Basic (solid base, needs monitoring)

### Step 3: Generate Proposal File

Output to `~/.geo-prospects/proposals/<domain>-proposal-<date>.md`
Also update prospect record if it exists in `~/.geo-prospects/prospects.json`

---

## Proposal Template

Generate the following document, filling all `[PLACEHOLDERS]` with real audit data:

---

```markdown
# GEO Optimization Proposal
## [COMPANY NAME] — AI Search Visibility

**Prepared by:** [YOUR AGENCY NAME]
**Prepared for:** [CONTACT NAME], [COMPANY NAME]
**Date:** [DATE]
**Valid until:** [DATE + 30 DAYS]
**Reference:** GEO-PROP-[YYMMDD]-[DOMAIN]

---

## Executive Summary

[COMPANY NAME] operates in [INDUSTRY] and serves customers across [GEOGRAPHY].
Our GEO audit of [DOMAIN], conducted on [DATE], reveals a GEO Readiness Score
of **[SCORE]/100 ([TIER LABEL])**.

This means your website currently has [TIER DESCRIPTION — use score interpretation table].
As AI-powered search (ChatGPT, Google AI Overviews, Perplexity) now influences
**[X]% of online discovery** and is growing at 527% year-over-year, this gap
represents a measurable risk to your pipeline.

The three most urgent issues are:
1. **[CRITICAL FINDING 1]** — [Business impact in one sentence]
2. **[CRITICAL FINDING 2]** — [Business impact in one sentence]
3. **[CRITICAL FINDING 3]** — [Business impact in one sentence]

We recommend the **[TIER NAME] package** at **€[PRICE]/month**, which addresses
all critical issues within 90 days and positions [COMPANY] as an AI-visible
authority in [INDUSTRY].

---

## The Opportunity: Why GEO Matters for [COMPANY NAME]

### The AI Search Shift Is Already Happening

| Metric | Value |
|--------|-------|
| AI-referred traffic growth (2025) | +527% YoY |
| AI traffic conversion vs. organic | 4.4x higher |
| ChatGPT weekly active users | 900M+ |
| Google AI Overviews monthly reach | 1.5B users, 200+ countries |
| Gartner: traditional search traffic drop by 2028 | -50% |
| Marketers investing in GEO today | Only 23% |

**First-mover advantage is real.** Companies that invest in GEO now will
capture the AI search channel before competitors do.

### Your Current Position

| Metric | [COMPANY] | Industry Average | Top Performers |
|--------|-----------|------------------|----------------|
| GEO Score | [SCORE]/100 | 45/100 | 75+/100 |
| AI Crawlers Allowed | [X]/14 | 8/14 | 14/14 |
| Brand Mentions (AI platforms) | [STATUS] | Moderate | High |
| Schema Coverage | [STATUS] | Partial | Complete |
| llms.txt | [Yes/No] | 12% have it | 78% have it |

---

## Audit Findings Summary

### GEO Score Breakdown

| Category | Your Score | Weight | Weighted | Priority |
|----------|-----------|--------|---------|----------|
| AI Citability & Visibility | [SCORE]/100 | 25% | [WEIGHTED] | [HIGH/MED/LOW] |
| Brand Authority Signals | [SCORE]/100 | 20% | [WEIGHTED] | [HIGH/MED/LOW] |
| Content Quality & E-E-A-T | [SCORE]/100 | 20% | [WEIGHTED] | [HIGH/MED/LOW] |
| Technical Foundations | [SCORE]/100 | 15% | [WEIGHTED] | [HIGH/MED/LOW] |
| Structured Data | [SCORE]/100 | 10% | [WEIGHTED] | [HIGH/MED/LOW] |
| Platform Optimization | [SCORE]/100 | 10% | [WEIGHTED] | [HIGH/MED/LOW] |
| **TOTAL GEO SCORE** | | | **[SCORE]/100** | **[TIER]** |

### Critical Issues Found

[For each critical issue from audit:]

#### 🔴 [ISSUE TITLE]
**What we found:** [Technical finding in plain language]
**Business impact:** [What this means for their revenue/visibility]
**Our fix:** [What we will do to resolve it]
**Timeline:** [When they will see improvement]

---

## Our Solution: Service Packages

We offer three engagement models based on the scope of optimization needed.

---

### BASIC — €2,500/month
*Best for: Sites with score 61-75 needing targeted improvements*

**What's included:**
- Quarterly full GEO audit (4x/year)
- Quarterly client report with score tracking
- Schema.org implementation (Organization + key page schemas)
- AI crawler access optimization (robots.txt)
- llms.txt creation and maintenance
- Email support (48-hour response)

**Estimated GEO score improvement:** +10-20 points in 6 months
**Contract:** Minimum 6 months

---

### STANDARD — €5,000/month ⭐ Recommended for [COMPANY]
*Best for: Sites with score 40-60 needing structured monthly work*

**Everything in Basic, plus:**
- Monthly full GEO audit + delta report
- Monthly strategy call (60 minutes)
- Content citability optimization (up to 10 pages/month)
- Brand authority building (Wikipedia, Wikidata, LinkedIn optimization)
- Platform-specific optimization (Google AIO, ChatGPT, Perplexity)
- E-E-A-T improvements (author pages, credentials, freshness signals)
- Slack channel for fast communication (24-hour response)

**Estimated GEO score improvement:** +25-40 points in 6 months
**Contract:** Minimum 6 months

---

### PREMIUM — €9,500/month
*Best for: Sites with score 0-40 with critical issues, or competitive industries*

**Everything in Standard, plus:**
- Bi-weekly strategy calls
- Technical SEO implementation support (Core Web Vitals, SSR, speed)
- Full content strategy + production (4 optimized articles/month)
- Active brand building (Reddit, YouTube, industry citations)
- Competitor monitoring and response
- Dedicated account manager
- Priority support (4-hour response)

**Estimated GEO score improvement:** +40-60 points in 6 months
**Contract:** Minimum 12 months

---

## ROI Projection for [COMPANY NAME]

Based on your current GEO score of [SCORE]/100 and industry benchmarks:

| Scenario | 6-Month Score | AI Traffic Increase | Est. Additional Value/Month |
|----------|--------------|--------------------|-----------------------------|
| No action | [SCORE + 2]/100 | +5% (organic growth) | €[LOW] |
| Basic package | [SCORE + 15]/100 | +30-40% | €[MED] |
| Standard package | [SCORE + 32]/100 | +60-90% | €[HIGH] |
| Premium package | [SCORE + 50]/100 | +100-150% | €[VERY HIGH] |

**Assumptions:**
- Based on estimated [X] monthly organic visitors to [DOMAIN]
- AI search is projected to drive 25-40% of organic discovery by end of 2026
- AI-referred traffic converts at 4.4x the rate of regular organic traffic
- Calculations use conservative estimates — actual results may vary

**Payback period (Standard package):** [X] months based on current traffic

---

## Engagement Timeline

### Month 1 — Foundation
- Kick-off call and onboarding (Week 1)
- Full technical audit + baseline metrics capture
- Quick wins implementation: robots.txt, schema, llms.txt, meta descriptions
- Expected score improvement: +5-10 points

### Month 2-3 — Optimization
- Content citability rewrites (top 10 pages)
- E-E-A-T improvements: author pages, credentials, dates
- Platform-specific optimization (Google AIO, ChatGPT, Perplexity)
- Brand presence: LinkedIn, Wikipedia/Wikidata groundwork
- Expected score improvement: +15-25 points cumulative

### Month 4-6 — Authority Building
- Brand mention campaigns (Reddit, industry sites, YouTube)
- Topical authority content strategy
- Monthly reports showing score improvements
- Expected score improvement: +30-45 points cumulative

### Month 6 — Review
- Full re-audit with before/after comparison
- ROI report
- Renewal discussion

---

## Why Us

- **GEO specialists**: We focus exclusively on AI search optimization, not traditional SEO agencies adapting to GEO
- **Transparent reporting**: Monthly reports show exactly what changed and why
- **No lock-in beyond minimum**: Month-to-month after initial commitment
- **Proven methodology**: 11-dimension GEO audit covering all major AI platforms
- **Fast results**: Quick wins visible within 30 days

---

## Investment Summary

| Package | Monthly | 6-Month | 12-Month |
|---------|---------|---------|----------|
| Basic | €2,500 | €15,000 | €30,000 |
| Standard | €5,000 | €30,000 | €60,000 |
| Premium | €9,500 | €57,000 | €114,000 |

*All prices exclude VAT. Payment terms: monthly, due within 15 days of invoice.*

---

## Next Steps

To move forward:

1. **Review this proposal** and share any questions
2. **Schedule a 30-minute call** to walk through findings together: [CALENDAR LINK]
3. **Sign the service agreement** (sent separately upon acceptance)
4. **Kick-off call** scheduled for your chosen start date

This proposal is valid for **30 days** from the date above.

---

## Terms & Conditions

- **Minimum commitment:** As stated per package above
- **Cancellation:** 30-day written notice after minimum term
- **Confidentiality:** All audit findings and client data are strictly confidential
- **Results:** We guarantee effort and methodology, not specific ranking outcomes
- **Reporting:** Monthly reports delivered by the 5th of each month
- **Access needed:** Read access to Google Analytics / Search Console (if available)

---

*This proposal was prepared using GEO-SEO analysis tools and reflects findings
from the audit of [DOMAIN] conducted on [DATE]. All scores and recommendations
are based on current industry best practices for Generative Engine Optimization.*
```

---

## Output

1. Save proposal to `~/.geo-prospects/proposals/<domain>-proposal-<date>.md`
2. Update prospect record: set `status` to `proposal`, save `proposal_file` path
3. Print confirmation:
   ```
   ✓ Proposal generated: ~/.geo-prospects/proposals/electron-srl.com-proposal-2026-03-12.md
   ✓ Prospect status updated: Qualified → Proposal
   ✓ Recommended package: STANDARD (€5,000/month) — Score 32/100

   Next: Share the proposal file or run `/geo report-pdf` for a visual version.
   ```

## Pricing Recommendation Logic

Base recommendation on GEO score:
- Score 0-40 → Recommend **Premium** (critical issues require intensive work)
- Score 41-60 → Recommend **Standard** (structured monthly optimization)
- Score 61-75 → Recommend **Basic** (maintenance + targeted improvements)
- Score 76+ → Offer **Basic** or quarterly retainer check-in

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
