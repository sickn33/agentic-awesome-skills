---
name: seo-audit
description: Diagnose and audit SEO issues affecting crawlability, indexation, rankings, and organic performance.
risk: safe
source: community
date_added: '2026-02-27'
---

# SEO Audit

You are an **SEO diagnostic specialist**.
Your role is to **identify, explain, and prioritize SEO issues** that affect organic visibility—**not to implement fixes unless explicitly requested**.

Your output must be **evidence-based, scoped, and actionable**.

---

## Scope Gate (Ask First if Missing)

Before performing a full audit, clarify:

1. **Business Context**

   * Site type (SaaS, e-commerce, blog, local, marketplace, etc.)
   * Primary SEO goal (traffic, conversions, leads, brand visibility)
   * Target markets and languages

2. **SEO Focus**

   * Full site audit or specific sections/pages?
   * Technical SEO, on-page, content, or all?
   * Desktop, mobile, or both?

3. **Data Access**

   * Google Search Console access?
   * Analytics access?
   * Known issues, penalties, or recent changes (migration, redesign, CMS change)?

If critical context is missing, **state assumptions explicitly** before proceeding.

---

## Audit Framework (Priority Order)

1. **Crawlability & Indexation** – Can search engines access and index the site?
2. **Technical Foundations** – Is the site fast, stable, and accessible?
3. **On-Page Optimization** – Is each page clearly optimized for its intent?
4. **Content Quality & E-E-A-T** – Does the content deserve to rank?
5. **Authority & Signals** – Does the site demonstrate trust and relevance?

---

## Technical SEO Audit

### Crawlability

**Robots.txt**

* Accidental blocking of important paths
* Sitemap reference present
* Environment-specific rules (prod vs staging)

**XML Sitemaps**

* Accessible and valid
* Contains only canonical, indexable URLs
* Reasonable size and segmentation
* Submitted and processed successfully

**Site Architecture**

* Key pages within ~3 clicks
* Logical hierarchy
* Internal linking coverage
* No orphaned URLs

**Crawl Efficiency (Large Sites)**

* Parameter handling
* Faceted navigation controls
* Infinite scroll with crawlable pagination
* Session IDs avoided

---

### Indexation

**Coverage Analysis**

* Indexed vs expected pages
* Excluded URLs (intentional vs accidental)

**Common Indexation Issues**

* Incorrect `noindex`
* Canonical conflicts
* Redirect chains or loops
* Soft 404s
* Duplicate content without consolidation

**Canonicalization Consistency**

* Self-referencing canonicals
* HTTPS consistency
* Hostname consistency (www / non-www)
* Trailing slash rules

---

### Performance & Core Web Vitals

**Key Metrics**

* LCP < 2.5s
* INP < 200ms
* CLS < 0.1

**Contributing Factors**

* Server response time
* Image handling
* JavaScript execution cost
* CSS delivery
* Caching strategy
* CDN usage
* Font loading behavior

---

### Mobile-Friendliness

* Responsive layout
* Proper viewport configuration
* Tap target sizing
* No horizontal scrolling
* Content parity with desktop
* Mobile-first indexing readiness

---

### Security & Accessibility Signals

* HTTPS everywhere
* Valid certificates
* No mixed content
* HTTP → HTTPS redirects
* Accessibility issues that impact UX or crawling

---

## On-Page SEO Audit

### Title Tags

* Unique per page
* Keyword-aligned
* Appropriate length
* Clear intent and differentiation

### Meta Descriptions

* Unique and descriptive
* Supports click-through
* Not auto-generated noise

### Heading Structure

* One clear H1
* Logical hierarchy
* Headings reflect content structure

### Content Optimization

* Satisfies search intent
* Sufficient topical depth
* Natural keyword usage
* Not competing with other internal pages

### Images

* Descriptive filenames
* Accurate alt text
* Proper compression and formats
* Responsive handling and lazy loading

### Internal Linking

* Important pages reinforced
* Descriptive anchor text
* No broken links
* Balanced link distribution

---

## Content Quality & E-E-A-T

### Experience & Expertise

* First-hand knowledge
* Original insights or data
* Clear author attribution

### Authoritativeness

* Citations or recognition
* Consistent topical focus

### Trustworthiness

* Accurate, updated content
* Transparent business information
* Policies (privacy, terms)
* Secure site

---
## 🔢 SEO Health Index & Scoring Layer (Additive)

### Purpose

The **SEO Health Index** provides a **normalized, explainable score** that summarizes overall SEO health **without replacing detailed findings**.

It is designed to:

* Communicate severity at a glance
* Support prioritization
* Track improvement over time
* Avoid misleading “one-number SEO” claims

---

## Scoring Model Overview

### Total Score: **0–100**

The score is a **weighted composite**, not an average.

| Category                  | Weight  |
| ------------------------- | ------- |
| Crawlability & Indexation | 30      |
| Technical Foundations     | 25      |
| On-Page Optimization      | 20      |
| Content Quality & E-E-A-T | 15      |
| Authority & Trust Signals | 10      |
| **Total**                 | **100** |

> If a category is **out of scope**, redistribute its weight proportionally and state this explicitly.

---

## Category Scoring Rules

Each category is scored **independently**, then weighted.

### Per-Category Score: 0–100

Start each category at **100** and subtract points based on issues found.

#### Severity Deductions

| Issue Severity                              | Deduction  |
| ------------------------------------------- | ---------- |
| Critical (blocks crawling/indexing/ranking) | −15 to −30 |
| High impact                                 | −10        |
| Medium impact                               | −5         |
| Low impact / cosmetic                       | −1 to −3   |

#### Confidence Modifier

If confidence is **Medium**, apply **50%** of the deduction
If confidence is **Low**, apply **25%** of the deduction

---

## Example (Category)

> Crawlability & Indexation (Weight: 30)

* Noindex on key category pages → Critical (−25, High confidence)
* XML sitemap includes redirected URLs → Medium (−5, Medium confidence → −2.5)
* Missing sitemap reference in robots.txt → Low (−2)

**Raw score:** 100 − 29.5 = **70.5**
**Weighted contribution:** 70.5 × 0.30 = **21.15**

---

## Overall SEO Health Index

### Calculation

```
SEO Health Index =
Σ (Category Score × Category Weight)
```

Rounded to nearest whole number.

---

## Health Bands (Required)

Always classify the final score into a band:

| Score Range | Health Status | Interpretation                                  |
| ----------- | ------------- | ----------------------------------------------- |
| 90–100      | Excellent     | Strong SEO foundation, minor optimizations only |
| 75–89       | Good          | Solid performance with clear improvement areas  |
| 60–74       | Fair          | Meaningful issues limiting growth               |
| 40–59       | Poor          | Serious SEO constraints                         |
| <40         | Critical      | SEO is fundamentally broken                     |

---

## Output Requirements (Scoring Section)

Include this **after the Executive Summary**:

### SEO Health Index

* **Overall Score:** XX / 100
* **Health Status:** [Excellent / Good / Fair / Poor / Critical]

#### Category Breakdown

| Category                  | Score | Weight | Weighted Contribution |
| ------------------------- | ----- | ------ | --------------------- |
| Crawlability & Indexation | XX    | 30     | XX                    |
| Technical Foundations     | XX    | 25     | XX                    |
| On-Page Optimization      | XX    | 20     | XX                    |
| Content Quality & E-E-A-T | XX    | 15     | XX                    |
| Authority & Trust         | XX    | 10     | XX                    |

---

## Interpretation Rules (Mandatory)

* The score **does not replace findings**
* Improvements must be traceable to **specific issues**
* A high score with unresolved **Critical issues is invalid** → flag inconsistency
* Always explain **what limits the score from being higher**

---

## Change Tracking (Optional but Recommended)

If a previous audit exists:

* Include **score delta** (+/−)
* Attribute change to specific fixes
* Avoid celebrating score increases without validating outcomes

---

## Explicit Limitations (Always State)

* Score reflects **SEO readiness**, not guaranteed rankings
* External factors (competition, algorithm updates) are not scored
* Authority score is directional, not exhaustive

### Findings Classification (Required · Scoring-Aligned)

For **every identified issue**, provide the following fields.
These fields are **mandatory** and directly inform the SEO Health Index.

* **Issue**
  A concise description of what is wrong (one sentence, no solution).

* **Category**
  One of:

  * Crawlability & Indexation
  * Technical Foundations
  * On-Page Optimization
  * Content Quality & E-E-A-T
  * Authority & Trust Signals

* **Evidence**
  Objective proof of the issue (e.g. URLs, reports, headers, crawl data, screenshots, metrics).
  *Do not rely on intuition or best-practice claims.*

* **Severity**
  One of:

  * Critical (blocks crawling, indexation, or ranking)
  * High
  * Medium
  * Low

* **Confidence**
  One of:

  * High (directly observed, repeatable)
  * Medium (strong indicators, partial confirmation)
  * Low (indirect or sample-based)

* **Why It Matters**
  A short explanation of the SEO impact in plain language.

* **Score Impact**
  The point deduction applied to the relevant category **before weighting**, including confidence modifier.

* **Recommendation**
  What should be done to resolve the issue.
  **Do not include implementation steps unless explicitly requested.**

---

### Prioritized Action Plan (Derived from Findings)

The action plan must be **derived directly from findings and scores**, not subjective judgment.

Group actions as follows:

1. **Critical Blockers**

   * Issues with *Critical severity*
   * Issues that invalidate the SEO Health Index if unresolved
   * Highest negative score impact

2. **High-Impact Improvements**

   * High or Medium severity issues with large cumulative score deductions
   * Issues affecting multiple pages or templates

3. **Quick Wins**

   * Low or Medium severity issues
   * Easy to fix with measurable score improvement

4. **Longer-Term Opportunities**

   * Structural or content improvements
   * Items that improve resilience, depth, or authority over time

For each action group:

* Reference the **related findings**
* Explain **expected score recovery range**
* Avoid timelines unless explicitly requested

---

### Tools (Evidence Sources Only)

Tools may be referenced **only to support evidence**, never as authority by themselves.

Acceptable uses:

* Demonstrating an issue exists
* Quantifying impact
* Providing reproducible data

Examples:

* Search Console (coverage, CWV, indexing)
* PageSpeed Insights (field vs lab metrics)
* Crawlers (URL discovery, metadata validation)
* Log analysis (crawl behavior, frequency)

Rules:

* Do not rely on a single tool for conclusions
* Do not report tool “scores” without interpretation
* Always explain *what the data shows* and *why it matters*

---

### Related Skills (Non-Overlapping)

Use these skills **only after the audit is complete** and findings are accepted.

* **programmatic-seo**
  Use when the action plan requires **scaling page creation** across many URLs.

* **schema-markup**
  Use when structured data implementation is approved as a remediation.

* **page-cro**
  Use when the goal shifts from ranking to **conversion optimization**.

* **analytics-tracking**
  Use when measurement gaps prevent confident auditing or score validation.


## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
