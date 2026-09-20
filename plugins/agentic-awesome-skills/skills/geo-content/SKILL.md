---
name: geo-content
description: Content quality and E-E-A-T assessment for AI citability — evaluate experience,
  expertise, authoritativeness, trustworthiness, and content structure
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
- content-quality
- eeat
- citability
- ai-content
- topical-authority
allowed-tools: Read, Grep, Glob, Bash, WebFetch, Write
---

# GEO Content Quality & E-E-A-T Assessment

## Purpose

AI search platforms do not just find content — they evaluate whether content deserves to be cited. The primary framework for this evaluation is **E-E-A-T** (Experience, Expertise, Authoritativeness, Trustworthiness), which per Google's December 2025 Quality Rater Guidelines update now applies to **ALL competitive queries**, not just YMYL (Your Money Your Life) topics. Content that scores high on E-E-A-T is dramatically more likely to be cited by AI platforms.

This skill evaluates content through two lenses:
1. **E-E-A-T signals** — does the content demonstrate real expertise and trust?
2. **AI citability** — is the content structured so AI platforms can extract and cite specific claims?

## How to Use This Skill

1. Fetch the target page(s) — homepage, key blog posts, service/product pages
2. Evaluate E-E-A-T across the 4 dimensions (25% each)
3. Assess content quality metrics (structure, readability, depth)
4. Check for AI content quality signals
5. Evaluate topical authority across the site
6. Score and generate GEO-CONTENT-ANALYSIS.md

---

## E-E-A-T Framework (100 points total)

### Experience — 25 points
First-hand knowledge and direct involvement with the topic. AI platforms increasingly distinguish between content that reports on a topic and content from someone who has DONE it.

**Signals to evaluate:**

| Signal | Points | How to Score |
|---|---|---|
| First-person accounts ("I tested...", "We implemented...") | 5 | 5 if present and specific, 3 if generic, 0 if absent |
| Original research or data not available elsewhere | 5 | 5 if original data, 3 if references original work, 0 if none |
| Case studies with specific results | 4 | 4 if detailed with numbers, 2 if general, 0 if none |
| Screenshots, photos, or evidence of direct use | 3 | 3 if authentic evidence, 1 if stock/generic, 0 if none |
| Specific examples from personal experience | 4 | 4 if specific and unique, 2 if somewhat specific, 0 if generic |
| Demonstrations of process (not just outcome) | 4 | 4 if step-by-step from experience, 2 if partial, 0 if none |

**What to flag as weak Experience:**
- Content that only summarizes what other sources say without adding new perspective
- Generic advice that could apply to any situation ("It depends on your needs")
- No mention of actual usage, testing, or direct involvement
- Hedging language that suggests lack of direct knowledge ("reportedly", "supposedly", "some say")

### Expertise — 25 points
Demonstrated knowledge depth and professional competence in the subject matter.

**Signals to evaluate:**

| Signal | Points | How to Score |
|---|---|---|
| Author credentials visible (bio, degrees, certifications) | 5 | 5 if full credentials, 3 if basic bio, 0 if no author |
| Technical depth appropriate to topic | 5 | 5 if thorough technical treatment, 3 if adequate, 0 if superficial |
| Methodology explanation (how conclusions were reached) | 4 | 4 if clear methodology, 2 if some explanation, 0 if none |
| Data-backed claims (statistics, research citations) | 4 | 4 if well-sourced, 2 if some data, 0 if unsupported claims |
| Industry-specific terminology used correctly | 3 | 3 if accurate specialized language, 1 if basic, 0 if errors |
| Author page with detailed professional background | 4 | 4 if dedicated author page, 2 if brief bio, 0 if none |

**What to flag as weak Expertise:**
- Claims without supporting evidence or sources
- Surface-level coverage of complex topics
- Misuse of technical terminology
- No visible author or author without relevant credentials
- Content that is broad and generic rather than deep and specific

### Authoritativeness — 25 points
Recognition by others as a credible source on the topic.

**Signals to evaluate:**

| Signal | Points | How to Score |
|---|---|---|
| Inbound citations from authoritative sources | 5 | 5 if cited by major sources, 3 if some citations, 0 if none |
| Author quoted or cited in press/media | 4 | 4 if media mentions, 2 if industry mentions, 0 if none |
| Industry awards or recognition mentioned | 3 | 3 if relevant awards, 1 if tangential, 0 if none |
| Speaker credentials (conferences, events) | 3 | 3 if listed, 0 if none |
| Published in peer-reviewed or respected outlets | 4 | 4 if tier-1 publications, 2 if industry outlets, 0 if none |
| Comprehensive topic coverage (topical authority) | 3 | 3 if site covers topic thoroughly, 1 if some coverage, 0 if isolated |
| Brand mentioned on Wikipedia or authoritative references | 3 | 3 if Wikipedia, 2 if other encyclopedic refs, 0 if none |

**What to flag as weak Authoritativeness:**
- Single-topic site with no depth of coverage
- No external validation of expertise claims
- No backlinks from authoritative sources
- Claims of authority without evidence (self-proclaimed "expert")

### Trustworthiness — 25 points
Signals that the content and its publisher are reliable and transparent.

**Signals to evaluate:**

| Signal | Points | How to Score |
|---|---|---|
| Contact information visible (address, phone, email) | 4 | 4 if full contact info, 2 if email only, 0 if none |
| Privacy policy present and linked | 2 | 2 if present, 0 if absent |
| Terms of service present | 1 | 1 if present, 0 if absent |
| HTTPS with valid certificate | 2 | 2 if valid HTTPS, 0 if not |
| Editorial standards or corrections policy | 3 | 3 if documented, 1 if implicit, 0 if none |
| Transparent about business model and conflicts | 3 | 3 if clear disclosures, 1 if some, 0 if none |
| Reviews and testimonials from real customers | 3 | 3 if verified reviews, 1 if testimonials, 0 if none |
| Accurate claims (no misinformation detected) | 4 | 4 if all claims accurate, 2 if mostly accurate, 0 if errors found |
| Clear affiliate/sponsorship disclosures | 3 | 3 if properly disclosed, 0 if undisclosed or absent |

**What to flag as weak Trustworthiness:**
- No contact information or physical address
- Missing privacy policy or terms
- Undisclosed affiliate links or sponsored content
- Claims that are verifiably false or misleading
- No way to contact the publisher for corrections

---

## Content Quality Metrics

### Word Count Benchmarks
These are **floors, not targets**. More words does not mean better content. The benchmark is the minimum length to adequately cover a topic for AI citability.

| Page Type | Minimum Words | Ideal Range | Notes |
|---|---|---|---|
| Homepage | 500 | 500-1,500 | Clear value proposition, not a wall of text |
| Blog post | 1,500 | 1,500-3,000 | Thorough but focused |
| Pillar content / Ultimate guide | 2,000 | 2,500-5,000 | Comprehensive topic coverage |
| Product page | 300 | 500-1,500 | Descriptions, specs, use cases |
| Service page | 500 | 800-2,000 | What, how, why, for whom |
| About page | 300 | 500-1,000 | Company/person story and credentials |
| FAQ page | 500 | 1,000-2,500 | Thorough answers, not one-liners |

### Readability Assessment
- **Target Flesch Reading Ease**: 60-70 (8th-9th grade level)
- This is NOT a direct ranking factor but affects citability — AI platforms prefer content that is clear and unambiguous
- Overly academic writing (score < 30) reduces citability for general queries
- Overly simple writing (score > 80) may lack the depth needed for expertise signals

**How to estimate without a tool:**
- Average sentence length: 15-20 words is ideal
- Average paragraph length: 2-4 sentences
- Presence of jargon: should be defined when first used
- Passive voice: < 15% of sentences

### Paragraph Structure for AI Parsing
AI platforms extract content at the paragraph level. Each paragraph should be a self-contained unit of meaning.

**Optimal paragraph structure:**
- **2-4 sentences** per paragraph (1-sentence paragraphs are weak; 5+ sentences are hard to extract)
- **One idea per paragraph** — do not mix topics within a paragraph
- **Lead with the key claim** — first sentence should contain the main point
- **Support with evidence** — remaining sentences provide data, examples, or context
- **Quotable standalone** — each paragraph should make sense if extracted in isolation

### Heading Structure
- **One H1 per page** — the primary topic/title
- **H2 for major sections** — should represent distinct subtopics
- **H3 for subsections** — nested under relevant H2
- **No skipped levels** — do not go from H1 to H3 without an H2
- **Descriptive headings** — "How to Optimize for AI Search" not "Section 2"
- **Question-based headings** where appropriate — these map directly to AI queries

### Internal Linking
- Every content page should link to 3-5 related pages on the same site
- Links should use descriptive anchor text (not "click here")
- Create a topic cluster structure: pillar page linked to/from all related subtopic pages
- Orphan pages (no internal links pointing to them) are rarely cited by AI

---

## AI Content Assessment

### AI-Generated Content Policy
AI-generated content is **acceptable** per Google's guidance (March 2024 clarification) as long as it demonstrates genuine E-E-A-T signals and has human oversight. The concern is not HOW content is created but WHETHER it provides value.

### Signs of Low-Quality AI Content (flag these)

| Signal | Description |
|---|---|
| Generic phrasing | "In today's fast-paced world...", "It's important to note that...", "At the end of the day..." |
| No original insight | Content that only rephrases widely available information |
| Lack of first-hand experience | No personal anecdotes, case studies, or specific examples |
| Perfect but empty structure | Well-formatted headings with shallow content beneath them |
| No specific examples | Uses abstract explanations without concrete instances |
| Repetitive conclusions | Each section ends with a variation of the same point |
| Hedging overload | "Generally speaking", "In most cases", "It depends on various factors" without specifying which factors |
| Missing human voice | No opinions, preferences, or professional judgment expressed |
| Filler content | Paragraphs that could be deleted without losing information |
| No data or sources | Claims presented as facts without attribution or evidence |

### High-Quality Content Signals (regardless of production method)

| Signal | Description |
|---|---|
| Original data | Surveys, experiments, benchmarks, proprietary analysis |
| Specific examples | Named products, companies, dates, numbers |
| Contrarian or nuanced views | Disagreement with conventional wisdom, backed by reasoning |
| First-person experience | "When I tested this..." or "Our team found..." |
| Updated information | References to recent events, current data |
| Expert opinion | Clear professional judgment, not just facts |
| Practical recommendations | Specific, actionable advice, not vague guidance |
| Trade-offs acknowledged | "This approach works well for X but not for Y because..." |

---

## Content Freshness Assessment

### Publication Dates
- Check for visible `datePublished` and `dateModified` in both the content and structured data
- Content without dates is treated as less trustworthy by AI platforms
- Dates should be specific (January 15, 2026) not vague ("recently")

### Freshness Scoring

| Criterion | Score |
|---|---|
| Updated within 3 months | Excellent — current and relevant |
| Updated within 6 months | Good — still reasonably current |
| Updated within 12 months | Acceptable — may need refresh |
| Updated 12-24 months ago | Warning — review for accuracy |
| No date or 24+ months old | Critical — AI platforms may deprioritize |

### Evergreen Indicators
Some content remains relevant regardless of age. Flag content as evergreen if:
- It covers fundamental concepts that do not change (physics, basic math, legal definitions)
- It is clearly labeled as a reference/guide for lasting concepts
- It does not contain time-dependent claims ("the latest", "currently", "in 2024")

---

## Topical Authority Assessment

### What It Is
Topical authority measures whether a site comprehensively covers a topic rather than touching on it superficially. AI platforms prefer citing sites that are recognized authorities on their topics.

### How to Assess
1. **Content breadth**: Does the site have multiple pages covering different aspects of its core topic?
2. **Content depth**: Do individual pages go deep into subtopics?
3. **Topic clustering**: Are pages organized into logical groups with internal linking?
4. **Content gaps**: Are there obvious subtopics that the site should cover but does not?
5. **Competitor comparison**: Do competitors cover subtopics that this site misses?

### Scoring

| Level | Description | Score Impact |
|---|---|---|
| Authority | 20+ pages covering topic comprehensively, strong clustering | +10 bonus |
| Developing | 10-20 pages with some clustering | +5 bonus |
| Emerging | 5-10 pages on topic, limited clustering | +0 |
| Thin | < 5 pages, no clustering | -5 penalty |

---

## Overall Scoring (0-100)

### Score Composition
| Component | Weight | Max Points |
|---|---|---|
| Experience | 25% | 25 |
| Expertise | 25% | 25 |
| Authoritativeness | 25% | 25 |
| Trustworthiness | 25% | 25 |
| **Subtotal** | | **100** |
| Topical Authority Modifier | | +10 to -5 |
| **Final Score** | | **Capped at 100** |

### Score Interpretation
- **85-100**: Exceptional — strong AI citation candidate across platforms
- **70-84**: Good — solid foundation, specific improvements will increase citability
- **55-69**: Average — multiple E-E-A-T gaps reducing AI visibility
- **40-54**: Below Average — significant content quality and trust issues
- **0-39**: Poor — fundamental content strategy overhaul needed

---

## Output Format

Generate **GEO-CONTENT-ANALYSIS.md** with:

```markdown
# GEO Content Quality & E-E-A-T Analysis — [Domain]
Date: [Date]

## Content Score: XX/100

## E-E-A-T Breakdown
| Dimension | Score | Key Finding |
|---|---|---|
| Experience | XX/25 | [One-line summary] |
| Expertise | XX/25 | [One-line summary] |
| Authoritativeness | XX/25 | [One-line summary] |
| Trustworthiness | XX/25 | [One-line summary] |

## Topical Authority Modifier: [+10 to -5]

## Pages Analyzed
| Page | Word Count | Readability | Heading Structure | Citability Rating |
|---|---|---|---|---|
| [URL] | [Count] | [Score] | [Pass/Warn/Fail] | [High/Medium/Low] |

## E-E-A-T Detailed Findings

### Experience
[Specific passages and pages with strong/weak experience signals]

### Expertise
[Author credentials found, technical depth assessment, specific gaps]

### Authoritativeness
[External validation found, topical authority assessment, gaps]

### Trustworthiness
[Trust signals present/missing, accuracy concerns if any]

## Content Quality Issues
[Specific passages flagged with reasons and rewrite suggestions]

## AI Content Concerns
[Any low-quality AI content patterns detected, with specific examples]

## Freshness Assessment
| Page | Published | Last Updated | Status |
|---|---|---|---|
| [URL] | [Date] | [Date] | [Current/Stale/No Date] |

## Citability Assessment
### Most Citable Passages
[Top 5 passages that AI platforms are most likely to cite, with reasons]

### Least Citable Pages
[Pages with lowest citability, with specific improvement recommendations]

## Improvement Recommendations
### Quick Wins
[Specific content changes that can be made immediately]

### Content Gaps
[Topics the site should cover to strengthen topical authority]

### Author/E-E-A-T Improvements
[Specific steps to strengthen E-E-A-T signals]
```

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
