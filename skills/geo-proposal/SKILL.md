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
4. Includes clearly labeled scenarios only when measured inputs support them
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

This is a draft generator, not a validated scoring/ROI model or authority to contact a prospect. Use observed audit evidence with source/time/scope, separate unknowns and proposals, and leave agency capabilities, prices, terms and case claims unfilled unless confirmed. GEO scores are internal heuristics, not platform scores or proven revenue predictors. Do not select an expensive package solely from an unvalidated score. Preserve existing files and update prospect records only when that local workflow is requested.

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
[Describe a measured audience/search change with its dated source and relevant scope. If evidence is unavailable, state that the business impact is unquantified.]

The three most urgent issues are:
1. **[CRITICAL FINDING 1]** — [Business impact in one sentence]
2. **[CRITICAL FINDING 2]** — [Business impact in one sentence]
3. **[CRITICAL FINDING 3]** — [Business impact in one sentence]

We recommend the **[TIER NAME] package** at **€[PRICE]/month**, which addresses
the agreed findings and deliverables on a confirmed schedule; search outcomes remain uncertain.

---

## The Opportunity: Why GEO Matters for [COMPANY NAME]

### Evidence for the Opportunity

[Use dated primary sources and client analytics with comparable windows. Do not invent market growth, conversion multipliers, industry averages, crawler counts or llms.txt adoption rates. Google does not require llms.txt for Search; its existence is not proof of AI visibility.]

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

### BASIC — [CONFIRMED PRICE]/month
*Best for: Sites with score 61-75 needing targeted improvements*

**What's included:**
- Quarterly full GEO audit (4x/year)
- Quarterly client report with score tracking
- Schema.org implementation (Organization + key page schemas)
- AI crawler access optimization (robots.txt)
- llms.txt creation and maintenance
- Email support (48-hour response)

**Contract:** Minimum 6 months

---

### STANDARD — [CONFIRMED PRICE]/month
*Best for: Sites with score 40-60 needing structured monthly work*

**Everything in Basic, plus:**
- Monthly full GEO audit + delta report
- Monthly strategy call (60 minutes)
- Content citability optimization (up to 10 pages/month)
- Brand authority building (Wikipedia, Wikidata, LinkedIn optimization)
- Platform-specific optimization (Google AIO, ChatGPT, Perplexity)
- E-E-A-T improvements (author pages, credentials, freshness signals)
- Slack channel for fast communication (24-hour response)

**Contract:** Minimum 6 months

---

### PREMIUM — [CONFIRMED PRICE]/month
*Best for: Sites with score 0-40 with critical issues, or competitive industries*

**Everything in Standard, plus:**
- Bi-weekly strategy calls
- Technical SEO implementation support (Core Web Vitals, SSR, speed)
- Full content strategy + production (4 optimized articles/month)
- Active brand building (Reddit, YouTube, industry citations)
- Competitor monitoring and response
- Dedicated account manager
- Priority support (4-hour response)

**Contract:** Minimum 12 months

---

## Scenario Analysis for [COMPANY NAME]

[If measured inputs are available, define baseline traffic, qualified conversions, attributable margin/value, total costs, scenario assumptions and time window. Show low/base/high scenarios and sensitivity without claiming causation or guaranteed improvement. If inputs are absent, omit numeric ROI/payback and propose a bounded measurement pilot. Never convert heuristic score points into traffic or revenue.]

---

## Engagement Timeline

### Month 1 — Foundation
- Kick-off call and onboarding (Week 1)
- Full technical audit + baseline metrics capture
- Quick wins implementation: robots.txt, schema, llms.txt, meta descriptions

### Month 2-3 — Optimization
- Content citability rewrites (top 10 pages)
- E-E-A-T improvements: author pages, credentials, dates
- Platform-specific optimization (Google AIO, ChatGPT, Perplexity)
- Brand presence: LinkedIn, Wikipedia/Wikidata groundwork

### Month 4-6 — Authority Building
- Brand mention campaigns (Reddit, industry sites, YouTube)
- Topical authority content strategy
- Monthly reports showing score improvements

### Month 6 — Review
- Full re-audit with before/after comparison
- ROI report
- Renewal discussion

---

## Why Us

- **GEO specialists**: We focus exclusively on AI search optimization, not traditional SEO agencies adapting to GEO
- **Transparent reporting**: Monthly reports show exactly what changed and why
- **No lock-in beyond minimum**: Month-to-month after initial commitment
- **Methodology**: [Describe the actual reviewed audit scope and limitations]
- **Measurement**: [Define observed deliverables separately from uncertain search outcomes]

---

All package capacities, prices and terms below are illustrative and must be replaced or removed using confirmed provider commitments before delivery.

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
