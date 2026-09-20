---
name: geo-compare
description: Monthly delta tracking and progress reporting for GEO clients.
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
- delta
- monthly
- reporting
- client
- progress
allowed-tools: Read, Write, Bash, Glob
---

# GEO Monthly Delta Report Generator

## Purpose

The single most powerful retention tool for a GEO agency: show clients **exactly**
what improved since they started working with you. Every point gained on the GEO
score is proof of value. This skill generates the "here's your progress" report.

---

## Commands

```
/geo compare <domain>
/geo compare <baseline-file> <current-file>
/geo compare electron-srl.com --month march-2026
```

**Examples:**
```
/geo compare electron-srl.com
/geo compare ~/.geo-prospects/audits/electron-srl.com-2026-01-15.md ~/.geo-prospects/audits/electron-srl.com-2026-03-12.md
```

---

## Workflow

### Step 1: Find Audit Files

If only domain is provided:
1. Look in `~/.geo-prospects/audits/` for files matching `<domain>-*.md`
2. Sort by date
3. Use oldest as baseline, newest as current
4. If only one file exists: use it as baseline, run a fresh quick audit as current
5. If no files exist: suggest running `/geo prospect audit <domain>` first

### Step 2: Parse Both Audits

Extract from each audit file:
- Overall GEO Score
- Per-category scores (6 categories)
- Per-platform scores (5 platforms)
- AI crawler status (14 crawlers)
- Critical issues list
- Action items list with status

### Step 3: Calculate Deltas

For each metric:
- Delta = Current - Baseline
- Trend = ▲ (improved), ▼ (declined), ── (unchanged)
- Color coding in report: green (+), red (-), gray (=)

### Step 4: Generate Monthly Report

Output to `~/.geo-prospects/reports/<domain>-monthly-<date>.md`

---

## Report Template

Generate the following document:

```markdown
# GEO Monthly Progress Report
## [COMPANY NAME] — [MONTH YEAR]

**Reporting period:** [BASELINE DATE] → [CURRENT DATE]
**Prepared by:** [AGENCY NAME]
**Report reference:** GEO-MONTHLY-[DOMAIN]-[YYMMDD]

---

## Executive Summary

[2-3 sentences: What improved, what's the trend, what to focus on next month.]

Example: "Electron Srl's GEO Score improved from 32 to 44 this month (+12 points),
placing the site firmly in the 'Below Average' tier and on track to reach 'Moderate'
by May. The biggest wins were AI crawler access (+3 crawlers now allowed) and schema
implementation (+Organization and LocalBusiness schemas live). Next month's focus is
content citability — the highest-weighted remaining gap."

---

## GEO Score Progress

```
OVERALL GEO SCORE

  Baseline   [▓▓▓▓░░░░░░░░░░░░░░░░]  32/100  (Critical)
  Current    [▓▓▓▓▓▓▓▓░░░░░░░░░░░░]  44/100  (Below Average)
  Change     ▲ +12 points (+37.5%)

  Target:    65/100 by Month 6 (on track ✓)
```

---

## Score Breakdown: Before vs. After

| Category | Baseline | Current | Change | Trend |
|----------|---------|---------|--------|-------|
| AI Citability & Visibility | [X]/100 | [X]/100 | [+/-X] | [▲/▼/──] |
| Brand Authority Signals | [X]/100 | [X]/100 | [+/-X] | [▲/▼/──] |
| Content Quality & E-E-A-T | [X]/100 | [X]/100 | [+/-X] | [▲/▼/──] |
| Technical Foundations | [X]/100 | [X]/100 | [+/-X] | [▲/▼/──] |
| Structured Data | [X]/100 | [X]/100 | [+/-X] | [▲/▼/──] |
| Platform Optimization | [X]/100 | [X]/100 | [+/-X] | [▲/▼/──] |
| **TOTAL** | **[X]/100** | **[X]/100** | **[+/-X]** | **[▲/▼]** |

---

## Platform Readiness: Before vs. After

| AI Platform | Baseline | Current | Change |
|-------------|---------|---------|--------|
| Google AI Overviews | [X]/100 | [X]/100 | [+/-X] |
| ChatGPT Web Search | [X]/100 | [X]/100 | [+/-X] |
| Perplexity AI | [X]/100 | [X]/100 | [+/-X] |
| Google Gemini | [X]/100 | [X]/100 | [+/-X] |
| Bing Copilot | [X]/100 | [X]/100 | [+/-X] |

---

## AI Crawler Access Changes

| Crawler | Baseline | Current | Change |
|---------|---------|---------|--------|
| GPTBot (ChatGPT) | Blocked/Allowed | Blocked/Allowed | ✓ Fixed / No change |
| ClaudeBot (Anthropic) | Blocked/Allowed | Blocked/Allowed | ✓ Fixed / No change |
| PerplexityBot | Blocked/Allowed | Blocked/Allowed | ✓ Fixed / No change |
| Google-Extended (Gemini) | Blocked/Allowed | Blocked/Allowed | ✓ Fixed / No change |
| Bingbot | Blocked/Allowed | Blocked/Allowed | ✓ Fixed / No change |

[Show only crawlers that changed, or all if few crawlers.]

---

## Action Plan Progress

### Quick Wins — Status Update

| # | Action | Assigned | Status | Impact |
|---|--------|---------|--------|--------|
| 1 | Allow all AI crawlers in robots.txt | Client dev | ✅ Done | +3 crawlers |
| 2 | Add Organization schema to homepage | Client dev | ✅ Done | Schema score +15 |
| 3 | Create llms.txt | Agency | ✅ Done | AI visibility +8 |
| 4 | Add author bylines to all articles | Client content | 🔄 In Progress | — |
| 5 | Fix meta descriptions (47 pages missing) | Client dev | ❌ Not started | — |

**Quick wins completed: [X]/[Y] ([%])**

### Medium-Term — Status Update

| # | Action | Target Month | Status |
|---|--------|-------------|--------|
| 1 | Rewrite top 10 pages with Q&A structure | Month 2 | 🔄 3/10 done |
| 2 | E-E-A-T: Create author pages | Month 2 | ❌ Not started |
| 3 | Register Bing Webmaster Tools | Month 1 | ✅ Done |
| 4 | Implement IndexNow | Month 2 | 🔄 In Progress |

### Strategic — Status Update

| # | Action | Target | Status |
|---|--------|--------|--------|
| 1 | Wikipedia entity creation | Month 4 | 📋 Planned |
| 2 | YouTube channel launch | Month 3 | 📋 Planned |
| 3 | Reddit presence (industry subs) | Month 3 | 📋 Planned |

---

## This Month's Wins

> Use this section to celebrate — clients need to see the value clearly.

✅ **[WIN 1]:** [Specific, tangible result — e.g., "GPTBot and ClaudeBot are now allowed. ChatGPT can now crawl and cite your content."]
✅ **[WIN 2]:** [e.g., "Organization schema implemented on homepage. Your brand entity is now machine-readable."]
✅ **[WIN 3]:** [e.g., "llms.txt created and deployed at electron-srl.com/llms.txt — one of only ~12% of sites in your industry to have this."]

---

## New Issues Discovered

> Issues found in current audit that weren't in baseline.

⚠️ **[ISSUE 1]:** [What it is, what it means, how we'll fix it]
⚠️ **[ISSUE 2]:** [What it is, what it means, how we'll fix it]

---

## Next Month Focus

### Priority Actions for [NEXT MONTH]:

| Priority | Action | Owner | Expected Impact |
|----------|--------|-------|----------------|
| 1 | [Highest ROI action] | [Agency/Client] | +[X] GEO points |
| 2 | [Second priority] | [Agency/Client] | +[X] GEO points |
| 3 | [Third priority] | [Agency/Client] | +[X] GEO points |

**Target GEO Score next month:** [CURRENT + estimated gain]/100

---

## 6-Month Trajectory

| Month | Date | Score | Delta | Key Achievement |
|-------|------|-------|-------|----------------|
| Baseline | [Date] | [Score] | — | Initial audit |
| Month 1 | [Date] | [Score] | [+X] | Quick wins implemented |
| Month 2 | [Date] | [Score] | [+X] | *Current month* |
| Month 3 | [Date] | — | — | Content citability |
| Month 4 | — | — | — | Brand authority |
| Month 5 | — | — | — | Strategic initiatives |
| Month 6 | — | **Target: [X]** | — | Full review |

[Only fill rows that have happened. Show projected rows as "—"]

---

## Estimated Business Impact

Based on the [X]-point improvement this month:

- **AI citation likelihood:** Increased by approximately [X]%
- **Crawlers with access:** [X]/14 → [Y]/14 (better coverage on [platforms])
- **Estimated monthly AI-referred traffic improvement:** +[X]% (conservative)
- **Traffic value at current conversion rates:** +€[X]/month in organic value

*Note: Full traffic impact from GEO changes typically takes 4-8 weeks to materialize
as AI platforms re-index and update their knowledge bases.*

---

*GEO Monthly Report — [COMPANY NAME] — [DATE]*
*Questions or comments? [CONTACT EMAIL]*
```

---

## Delta Calculation Logic

When parsing two audit files, look for these patterns:

```
Score markers to extract:
- "GEO Score: XX/100"
- "Overall Score: XX"
- "AI Citability: XX/100"
- "Brand Authority: XX/100"
- "Technical: XX/100"
- "Schema: XX/100"
- "Platform: XX/100"
- "Content: XX/100"
- "GPTBot: Allowed/Blocked"
- "ClaudeBot: Allowed/Blocked"
```

If exact scores are not found in audit files, use contextual analysis of the
written findings to estimate approximate scores based on issues described.

---

## Trend Interpretation

| Delta | Trend Symbol | Meaning |
|-------|-------------|---------|
| +5 or more | ▲▲ | Strong improvement |
| +1 to +4 | ▲ | Improvement |
| 0 | ── | No change |
| -1 to -4 | ▼ | Slight decline |
| -5 or more | ▼▼ | Significant decline — needs discussion |

A decline is not necessarily bad — it can mean new issues were discovered in the
fresh audit that weren't visible before. Frame declines as "newly discovered opportunities."

---

## Output

1. Save report to `~/.geo-prospects/reports/<domain>-monthly-<YYYY-MM>.md`
2. Print confirmation with key stats:
   ```
   ✓ Monthly report generated: ~/.geo-prospects/reports/electron-srl.com-monthly-2026-03.md

   SUMMARY:
   GEO Score: 32 → 44 (+12 points) ▲
   Quick wins completed: 3/5 (60%)
   New issues found: 2 (minor)
   On track for Month 6 target: YES (65/100)
   ```
3. Suggest next action: "Share with client or run `/geo report-pdf` for a visual version"

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
