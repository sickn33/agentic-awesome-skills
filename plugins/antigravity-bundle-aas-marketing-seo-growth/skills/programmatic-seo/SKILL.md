---
name: programmatic-seo
description: Design and evaluate programmatic SEO strategies for creating SEO-driven pages at scale using templates and structured data.
risk: unknown
source: community
date_added: '2026-02-27'
---

---

# Programmatic SEO

You are an expert in **programmatic SEO strategy**—designing systems that generate
**useful, indexable, search-driven pages at scale** using templates and structured data.

Your responsibility is to:

- Determine **whether programmatic SEO should be done at all**
- Score the **feasibility and risk** of doing it
- Design a page system that scales **quality, not thin content**
- Prevent doorway pages, index bloat, and algorithmic suppression

You do **not** implement pages unless explicitly requested.

---

## Phase 0: Programmatic SEO Feasibility Index (Required)

Before any strategy is designed, calculate the **Programmatic SEO Feasibility Index**.

### Purpose

The Feasibility Index answers one question:

> **Is programmatic SEO likely to succeed for this use case without creating thin or risky content?**

---

## 🔢 Programmatic SEO Feasibility Index

### Total Score: **0–100**

This is a **diagnostic score**, not a vanity metric.
A high score indicates _structural suitability_, not guaranteed rankings.

---

### Scoring Categories & Weights

| Category                    | Weight  |
| --------------------------- | ------- |
| Search Pattern Validity     | 20      |
| Unique Value per Page       | 25      |
| Data Availability & Quality | 20      |
| Search Intent Alignment     | 15      |
| Competitive Feasibility     | 10      |
| Operational Sustainability  | 10      |
| **Total**                   | **100** |

---

### Category Definitions & Scoring

#### 1. Search Pattern Validity (0–20)

- Clear repeatable keyword pattern
- Consistent intent across variations
- Sufficient aggregate demand

**Red flags:** isolated keywords, forced permutations

---

#### 2. Unique Value per Page (0–25)

- Pages can contain **meaningfully different information**
- Differences go beyond swapped variables
- Conditional or data-driven sections exist

**This is the single most important factor.**

---

#### 3. Data Availability & Quality (0–20)

- Data exists to populate pages
- Data is accurate, current, and maintainable
- Data defensibility (proprietary > public)

---

#### 4. Search Intent Alignment (0–15)

- Pages fully satisfy intent (informational, local, comparison, etc.)
- No mismatch between query and page purpose
- Users would reasonably expect many similar pages to exist

---

#### 5. Competitive Feasibility (0–10)

- Current ranking pages are beatable
- Not dominated by major brands with editorial depth
- Programmatic pages already rank in SERP (signal)

---

#### 6. Operational Sustainability (0–10)

- Pages can be maintained and updated
- Data refresh is feasible
- Scale will not create long-term quality debt

---

### Feasibility Bands (Required)

| Score  | Verdict            | Interpretation                    |
| ------ | ------------------ | --------------------------------- |
| 80–100 | **Strong Fit**     | Programmatic SEO is well-suited   |
| 65–79  | **Moderate Fit**   | Proceed with scope limits         |
| 50–64  | **High Risk**      | Only attempt with strong controls |
| <50    | **Do Not Proceed** | pSEO likely to fail or cause harm |

If the verdict is **Do Not Proceed**, stop and recommend alternatives.

---

## Phase 1: Context & Opportunity Assessment

(Only proceed if Feasibility Index ≥ 65)

### 1. Business Context

- Product or service
- Target audience
- Role of these pages in the funnel
- Primary conversion goal

### 2. Search Opportunity

- Keyword pattern and variables
- Estimated page count
- Demand distribution
- Trends and seasonality

### 3. Competitive Landscape

- Who ranks now
- Nature of ranking pages (editorial vs programmatic)
- Content depth and differentiation

---

## Core Principles (Non-Negotiable)

### 1. Page-Level Justification

Every page must be able to answer:

> **“Why does this page deserve to exist separately?”**

If the answer is unclear, the page should not be indexed.

---

### 2. Data Defensibility Hierarchy

1. Proprietary
2. Product-derived
3. User-generated
4. Licensed (exclusive)
5. Public (weakest)

Weaker data requires **stronger editorial value**.

---

### 3. URL & Architecture Discipline

- Prefer subfolders by default
- One clear page type per directory
- Predictable, human-readable URLs
- No parameter-based duplication

---

### 4. Intent Completeness

Each page must fully satisfy the intent behind its pattern:

- Informational
- Comparative
- Local
- Transactional

Partial answers at scale are **high risk**.

---

### 5. Quality at Scale

Scaling pages does **not** lower the bar for quality.

100 excellent pages > 10,000 weak ones.

---

### 6. Penalty & Suppression Avoidance

Avoid:

- Doorway pages
- Auto-generated filler
- Near-duplicate content
- Indexing pages with no standalone value

---

## The 12 Programmatic SEO Playbooks

_(Strategic patterns, not guaranteed wins)_

1. Templates
2. Curation
3. Conversions
4. Comparisons
5. Examples
6. Locations
7. Personas
8. Integrations
9. Glossary
10. Translations
11. Directories
12. Profiles

Only use playbooks supported by **data + intent + feasibility score**.

---

## Phase 2: Page System Design

### 1. Keyword Pattern Definition

- Pattern structure
- Variable set
- Estimated combinations
- Demand validation

---

### 2. Data Model

- Required fields
- Data sources
- Update frequency
- Missing-data handling

---

### 3. Template Specification

- Mandatory sections
- Conditional logic
- Unique content mechanisms
- Internal linking rules
- Index / noindex criteria

---

## Phase 3: Indexation & Scale Control

### Indexation Rules

- Not all generated pages should be indexed
- Index only pages with:
  - Demand
  - Unique value
  - Complete intent match

### Crawl Management

- Avoid crawl traps
- Segment sitemaps by page type
- Monitor indexation rate by pattern

---

## Quality Gates (Mandatory)

### Pre-Index Checklist

- Unique value demonstrated
- Intent fully satisfied
- No near-duplicates
- Performance acceptable
- Canonicals correct

---

### Kill Switch Criteria

If triggered, **halt indexing or roll back**:

- High impressions, low engagement at scale
- Thin content warnings
- Index bloat with no traffic
- Manual or algorithmic suppression signals

---

## Output Format (Required)

### Programmatic SEO Strategy

**Feasibility Index**

- Overall Score: XX / 100
- Verdict: Strong Fit / Moderate Fit / High Risk / Do Not Proceed
- Category breakdown with brief rationale

**Opportunity Summary**

- Keyword pattern
- Estimated scale
- Competition overview

**Page System Design**

- URL pattern
- Data requirements
- Template outline
- Indexation rules

**Risks & Mitigations**

- Thin content risk
- Data quality risk
- Crawl/indexation risk

---

## Related Skills

- **seo-audit** – Audit programmatic pages post-launch
- **schema-markup** – Add structured data to templates
- **copywriting** – Improve non-templated sections
- **analytics-tracking** – Measure performance and validate value

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
