---
name: seo-aeo-content-quality-auditor
description: "Audits a website, codebase, page, or content set for technical SEO, search intent, AEO, conversion paths, and publishing readiness, then produces prioritised fixes that can be implemented and verified."
risk: safe
source: community
date_added: "2026-04-01"
---


# Content Quality Auditor Skill

## Description
Activate this skill when the user wants to audit, review, or score
a website, codebase, URL, page, or content set for SEO and AEO performance. Trigger phrases include:
"audit this content", "SEO review", "AEO audit", "check this page",
"score this article", "content auditor", "what's wrong with this content",
"review this landing page", "analyze content quality".

---

## Input Format
```json
{
  "content": "string — paste raw content, provide a URL, or provide a project path",
  "input_type": "text | url | website | codebase",
  "primary_keyword": "string — the main keyword this content should rank for",
  "secondary_keywords": ["string"],
  "content_type": "landing-page | blog-post | pillar-page | product-page",
  "word_count_target": "integer — expected word count, default 1500",
  "business_context": "string — optional description of the business and conversion goal",
  "existing_content": ["string — optional URLs or titles already published"]
}
```

For a new project, default to a full website/codebase audit before recommending new content. If the user has not supplied target keywords, identify candidate keywords from the site and ask which ones matter before finalizing the content strategy. If the user does not know, continue with a clearly labelled fallback strategy based on observed search intent.

Read [references/seo-audit-checklist.md](references/seo-audit-checklist.md) for the audit dimensions, evidence rules, and audit-to-implementation loop.

---

## Scoring System

All scores are out of 100. Use these thresholds consistently:

| Score     | Status   | Label                        |
|-----------|----------|------------------------------|
| 85–100    | ✅ Pass   | Strong — minor polish needed |
| 70–84     | ⚠️ Warn  | Acceptable — fixes recommended |
| 50–69     | 🔶 Weak  | Needs work before publishing |
| 0–49      | ❌ Fail   | Do not publish as-is         |

---

## Output Structure

The skill must always produce output in this exact format:
```markdown
# Content Quality Audit Report

## Summary

| Metric              | Score     | Status  |
|---------------------|-----------|---------|
| Overall Score       | [X/100]   | [label] |
| SEO Score           | [X/100]   | [label] |
| AEO Score           | [X/100]   | [label] |
| Readability Score   | [X/100]   | [label] |

**Verdict:** [One sentence summary of the content's current state
and the single most important fix needed.]

---

## SEO Report

### Score: [X/100] — [Status Label]

#### ✅ Passing Checks
- [Check name]: [what was found]
- [Check name]: [what was found]

#### ❌ Critical Issues — Fix Before Publishing

**Issue:** [Specific problem, e.g. "Primary keyword missing from H1"]
**Severity:** Critical
**Fix:** [Exact instruction, e.g. "Rewrite H1 to include '[keyword]'
naturally within the first 6 words"]

**Issue:** [Specific problem]
**Severity:** Critical
**Fix:** [Exact instruction]

#### ⚠️ Warnings — Fix Soon

**Issue:** [Specific problem]
**Severity:** Medium
**Fix:** [Exact instruction]

#### Keyword Analysis

| Keyword              | Found | Occurrences | Density | Target   | Status  |
|----------------------|-------|-------------|---------|----------|---------|
| [primary keyword]    | Yes/No| [n]         | [x.x%]  | Natural use | ✅ / ❌ |
| [secondary keyword]  | Yes/No| [n]         | [x.x%]  | Natural use | ✅ / ❌ |

#### Heading Structure

| Heading | Text                        | Contains Keyword | Status  |
|---------|-----------------------------|------------------|---------|
| H1      | [heading text]              | Yes/No           | ✅ / ❌ |
| H2 #1   | [heading text]              | Yes/No           | ✅ / ❌ |
| H2 #2   | [heading text]              | Yes/No           | ✅ / ❌ |

H1 count: [n] — must be exactly 1
H2 count: [n] — recommended 4–6 for blog posts
H3 count: [n] — should only appear inside H2 sections

#### Meta Elements

| Element          | Found    | Content                          | Status  |
|------------------|----------|----------------------------------|---------|
| Title Tag        | Yes/No   | [content or "missing"]           | ✅ / ❌ |
| Meta Description | Yes/No   | [content or "missing"]           | ✅ / ❌ |
| Title Length     | [n] chars| Target: 50–60 characters         | ✅ / ❌ |
| Meta Length      | [n] chars| Target: 140–160 characters       | ✅ / ❌ |
| Keyword in Title | Yes/No   | —                                | ✅ / ❌ |

#### Word Count

| Metric             | Actual     | Target               | Status  |
|--------------------|------------|----------------------|---------|
| Word Count         | [n] words  | [word_count_target]  | ✅ / ❌ |
| Avg Sentence Length| [n] words  | Target: under 20     | ✅ / ❌ |
| Avg Paragraph Length| [n] lines | Target: 3–5 lines    | ✅ / ❌ |

---

## AEO Report

### Score: [X/100] — [Status Label]

#### ✅ Passing Checks
- [Check name]: [what was found]

#### ❌ Critical Issues — Fix Before Publishing

**Issue:** [Specific AEO problem,
e.g. "No TL;DR or direct-answer block found"]
**Severity:** Critical
**Fix:** [Exact instruction, e.g. "Add a TL;DR block immediately
after the H1 — 2–3 sentences that directly answer the article's
core question. This is the block AI engines extract first."]

#### ⚠️ Warnings — Fix Soon

**Issue:** [Specific problem]
**Severity:** Medium
**Fix:** [Exact instruction]

#### AEO Signal Checklist

| Signal                              | Found    | Count    | Target       | Status  |
|-------------------------------------|----------|----------|--------------|---------|
| TL;DR / Direct Answer Block         | Yes/No   | —        | Required     | ✅ / ❌ |
| Definition Sentence ("X is...")     | Yes/No   | [n]      | Min 1        | ✅ / ❌ |
| FAQ Section                         | Yes/No   | [n] Qs   | Min 4        | ✅ / ❌ |
| Numbered or Bullet Lists            | Yes/No   | [n]      | Min 2        | ✅ / ❌ |
| Comparison Table                    | Yes/No   | [n]      | Recommended  | ✅ / ❌ |
| Primary Keyword in First 100 Words  | Yes/No   | —        | Required     | ✅ / ❌ |
| Concise Answers Under 50 Words      | Yes/No   | [n]      | Min 2        | ✅ / ❌ |
| Schema Markup Detected              | Yes/No   | —        | Recommended  | ✅ / ❌ |

#### Extractability Assessment

Rate how likely AI engines are to extract answers from this content:

| Question Type               | Extractable | Confidence | Notes              |
|-----------------------------|-------------|------------|--------------------|
| "What is [topic]?"          | Yes/No      | High/Med/Low| [brief reason]    |
| "How does [topic] work?"    | Yes/No      | High/Med/Low| [brief reason]    |
| "How much does [topic] cost?"| Yes/No     | High/Med/Low| [brief reason]    |
| "What are the benefits?"    | Yes/No      | High/Med/Low| [brief reason]    |

---

## Readability Report

### Score: [X/100] — [Status Label]

| Check                        | Result         | Target             | Status  |
|------------------------------|----------------|--------------------|---------|
| Passive Voice Usage          | [x%]           | Under 10%          | ✅ / ❌ |
| Transition Words Present     | Yes/No         | Required           | ✅ / ❌ |
| Wall-of-Text Paragraphs      | [n found]      | 0                  | ✅ / ❌ |
| Subheading Frequency         | Every [n] words| Every 300 words    | ✅ / ❌ |
| Reading Level                | [Grade level]  | Grade 7–9          | ✅ / ❌ |

---

## Prioritised Fix List

Work through these in order:

### 🔴 Do First (Critical — blocks publishing)
1. [Fix instruction]
2. [Fix instruction]

### 🟡 Do Second (Important — affects ranking)
3. [Fix instruction]
4. [Fix instruction]

### 🟢 Do Last (Polish — improves performance)
5. [Fix instruction]
6. [Fix instruction]

---

## Estimated Score After Fixes

| Metric            | Current Score | Projected Score |
|-------------------|---------------|-----------------|
| SEO Score         | [X/100]       | [X/100]         |
| AEO Score         | [X/100]       | [X/100]         |
| Readability Score | [X/100]       | [X/100]         |
| Overall Score     | [X/100]       | [X/100]         |
```

---

## Execution Steps

1. Detect `input_type` — inspect the project structure for a codebase, fetch a URL when allowed, or analyze supplied text.
2. Establish the business, audience, conversion goal, existing content, and known target keywords. If keywords are missing, produce candidate keywords but ask for confirmation before treating them as final.
3. Check technical SEO: crawlability, indexability, robots.txt, sitemap, canonical URLs, redirects, status codes, metadata, structured data, mobile/performance signals, image text alternatives, and broken links.
4. Check information architecture and content: page purpose, search intent, H1/H2 hierarchy, topical coverage, duplication, cannibalization, thin pages, internal links, orphan pages, and conversion paths.
5. Run keyword analysis using natural placement and intent alignment. Report counts as evidence, never as a mandatory density target.
6. Run the AEO signal checklist and extractability assessment for direct answers, definitions, steps, FAQs, comparisons, and visible supporting evidence.
7. Score SEO, AEO, readability, and conversion readiness against the rubric, including confidence and evidence for each major finding.
8. Build a prioritized fix plan with exact files/pages affected, implementation notes, dependencies, and verification criteria.
9. If implementation is authorized, apply the fixes in priority order, re-run the audit, and report before/after results. Never publish or mutate external accounts without explicit authorization.
10. Verify the findings against the supplied content or project files. If a repository already provides an audit helper, use it as a supplementary check; never replace evidence-based review with a hard-coded demo or an unsupported density score.

---

## Connected Skills
- Receives output from: `seo-aeo-blog-writer`, `seo-aeo-landing-page-writer`
- Feeds output to: `seo-aeo-internal-linking`, `seo-aeo-schema-generator`

## When to Use

Use before implementing SEO/AEO changes on a website, codebase, URL, page, or content set, and again when verifying the fixes.

## Limitations

- An audit cannot prove indexing, ranking, conversion, or third-party platform state without current observable evidence.
