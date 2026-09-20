---
name: geo-citability
description: AI citability scoring and optimization.
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
allowed-tools:
- Read
- Grep
- Glob
- Bash
- WebFetch
- Write
---

# AI Citability Scoring Skill

## Core Insight

AI language models cite passages that meet specific structural criteria. Research from Princeton, Georgia Tech, and IIT Delhi (2024) found that GEO-optimized content achieves 30-115% higher visibility in AI-generated responses. The key finding: AI systems preferentially extract and cite passages that are **134-167 words long**, **self-contained** (understandable without surrounding context), **fact-rich** (containing specific statistics, dates, or named entities), and **directly answer a question** in the first 1-2 sentences.

This is fundamentally different from traditional SEO copywriting, which optimizes for keyword density and user engagement metrics. GEO citability optimizes for **extractability** -- the ease with which an AI system can pull a passage from your content and present it as a direct answer.

---

## Citability Scoring Rubric (0-100)

### Category 1: Answer Block Quality (30% of total score)

This measures whether content contains clear, quotable answer passages that AI systems can extract verbatim.

**Scoring Criteria:**

| Score | Criteria |
|---|---|
| **90-100** | Every major section opens with a 1-2 sentence direct answer. Uses "X is..." or "X refers to..." patterns. First 40-60 words of each section can stand alone as a complete answer. |
| **70-89** | Most sections have clear answer openings. Some definition patterns present. Answers are identifiable but may need minor context. |
| **50-69** | Some sections have answer-like openings but many bury the answer in the middle or end of paragraphs. Few explicit definition patterns. |
| **30-49** | Answers are generally buried in long paragraphs. No consistent definition patterns. Content is narrative-driven rather than answer-driven. |
| **0-29** | No identifiable answer blocks. Content is entirely narrative, conversational, or fragmented. AI would struggle to extract any quotable passage. |

**What to look for:**

- **Definition patterns:** "X is [definition]." / "X refers to [explanation]." / "X means [meaning]."
- **Answer-first structure:** The answer appears in the first sentence, followed by supporting detail.
- **Quantified answers:** "The average cost of X is $Y" rather than "Many factors affect the cost of X."
- **Comparison answers:** "X differs from Y in three ways: [list]" rather than "X and Y are often confused."

**High-citability example:**
```
Content delivery networks (CDNs) are distributed server systems that cache and serve
web content from locations geographically close to end users. A CDN reduces latency
by 50-70% on average by serving assets from edge servers rather than a single origin
server. The three largest CDN providers as of 2025 are Cloudflare (serving approximately
20% of all websites), Amazon CloudFront, and Akamai Technologies.
```
Word count: 58. Self-contained: Yes. Facts: 3 specific data points. Definition pattern: Yes.

**Low-citability example:**
```
If you've ever wondered why some websites load faster than others, the answer might
surprise you. There's this amazing technology that has been around for a while now.
It's changed the way we think about web performance. Let me explain how it works and
why you should care about it for your business.
```
Word count: 52. Self-contained: No (no topic identified). Facts: 0. Definition pattern: No.

---

### Category 2: Passage Self-Containment (25% of total score)

This measures whether individual passages can be extracted and understood without needing the surrounding content.

**Scoring Criteria:**

| Score | Criteria |
|---|---|
| **90-100** | 80%+ of content blocks are fully self-contained. Each passage names its subject explicitly. No reliance on pronouns referencing earlier content. Contains specific facts within the passage. |
| **70-89** | 60-79% of content blocks are self-contained. Most passages name their subject. Occasional pronoun references that require context. |
| **50-69** | 40-59% of content blocks are self-contained. Mixed use of explicit subjects and pronouns. Some passages require reading prior sections. |
| **30-49** | 20-39% of content blocks are self-contained. Heavy reliance on pronouns and contextual references. Most passages need surrounding text. |
| **0-29** | Under 20% self-contained. Content reads as a continuous narrative where extracting any paragraph loses meaning. |

**Self-containment checklist for each passage:**

1. Does the passage explicitly name the subject (not "it," "this," "they")?
2. Can someone understand the main point reading ONLY this passage?
3. Does the passage contain at least one specific fact, statistic, or named entity?
4. Is the passage between 50-200 words (the optimal extraction length)?
5. Does the passage avoid starting with conjunctions ("But," "However," "And") that imply prior context?

---

### Category 3: Structural Readability (20% of total score)

This measures the structural formatting that helps AI systems parse and segment content.

**Scoring Criteria:**

| Score | Criteria |
|---|---|
| **90-100** | Clean H1 > H2 > H3 hierarchy. Question-based headings for informational content. Short paragraphs (2-4 sentences). Tables for comparisons. Ordered lists for processes. Unordered lists for features/options. |
| **70-89** | Good heading hierarchy with minor skips. Some question-based headings. Mostly short paragraphs. Some use of tables and lists. |
| **50-69** | Heading hierarchy present but inconsistent. Few question-based headings. Mix of short and long paragraphs. Limited tables/lists. |
| **30-49** | Minimal heading structure. No question-based headings. Long paragraphs dominate. Rare use of tables/lists. |
| **0-29** | No heading structure or severely broken hierarchy. Wall-of-text paragraphs. No tables or lists. |

**Structural best practices for AI citability:**

- **Heading hierarchy:** H1 (page title) > H2 (major sections) > H3 (subsections). Never skip levels.
- **Question-based headings:** "What is [topic]?" and "How does [topic] work?" are directly matchable to AI queries.
- **Paragraph length:** 2-4 sentences per paragraph. AI systems parse short paragraphs more reliably.
- **Tables:** Use for any comparison of 3+ items. AI systems extract table data with high accuracy.
- **Lists:** Use ordered lists for sequential processes, unordered lists for non-sequential items.
- **Bold key terms:** Bold the first use of important terms. This aids AI entity recognition.

---

### Category 4: Statistical Density (15% of total score)

This measures the presence of specific, verifiable data points that AI systems prioritize when selecting citation sources.

**Scoring Criteria:**

| Score | Criteria |
|---|---|
| **90-100** | 5+ specific statistics per 500 words. All claims backed by named sources or dates. Uses exact numbers (not "many" or "several"). Includes percentages, dollar amounts, timeframes, and named studies. |
| **70-89** | 3-4 statistics per 500 words. Most claims have sources. Mostly specific numbers with occasional vague quantifiers. |
| **50-69** | 1-2 statistics per 500 words. Some claims sourced. Mix of specific and vague numbers. |
| **30-49** | Less than 1 statistic per 500 words. Few sourced claims. Predominantly vague quantifiers. |
| **0-29** | No statistics. No sourced claims. All quantifiers are vague ("many," "most," "a lot"). |

**What counts as a statistic:**
- Specific percentages: "73% of marketers report..."
- Dollar amounts: "The average cost is $4,500 per month"
- Timeframes: "Implementation takes 6-8 weeks on average"
- Named studies: "According to the 2025 HubSpot State of Marketing Report..."
- Specific counts: "The platform integrates with 340+ tools"
- Comparison data: "40% faster than the industry average"

**What does NOT count:**
- "Many companies use..." (vague)
- "A significant percentage..." (vague)
- "Studies show that..." (no named source)
- "Experts agree..." (no named experts)

---

### Category 5: Uniqueness & Original Data (10% of total score)

This measures whether the content provides information that AI systems cannot find elsewhere, making it a necessary citation source.

**Scoring Criteria:**

| Score | Criteria |
|---|---|
| **90-100** | Contains first-party research, proprietary data, original surveys, or unique datasets. Presents analysis or insights not found on any other page. Clear methodological descriptions. |
| **70-89** | Contains some original insights or unique analysis of existing data. Offers a distinct perspective with original examples. |
| **50-69** | Mostly synthesizes existing information but adds some unique commentary or examples. |
| **30-49** | Largely derivative content that restates common knowledge with minimal original contribution. |
| **0-29** | Entirely derivative. All information is available (often verbatim) on higher-authority sources. |

**Signals of unique content:**
- "Our analysis of [X] data found..."
- "We surveyed [N] [professionals] and found..."
- "Based on our experience with [N] clients..."
- Custom charts, graphs, or data visualizations
- Case studies with specific named outcomes
- Original frameworks, methodologies, or taxonomies

---

## Analysis Procedure

### Step 1: Fetch and Parse Page Content

1. Use WebFetch to retrieve the target URL.
2. Extract the main content area (exclude navigation, footer, sidebar, ads).
3. Preserve heading structure (H1-H6 tags).
4. Preserve paragraph boundaries, lists, and tables.
5. Calculate total word count of main content.

### Step 2: Segment Content into Blocks

1. Split content at each heading (H2 or H3) to create content blocks.
2. For each block, record:
   - The heading text
   - The full text content under that heading
   - Word count of the block
   - Number of paragraphs
   - Number of lists and tables
   - Number of statistics/data points
   - Whether the block contains a definition pattern
   - Whether the first 60 words form a standalone answer

### Step 3: Score Each Block

For each content block, calculate:
- Answer Block Quality sub-score (0-100)
- Self-Containment sub-score (0-100)
- Structural Readability sub-score (0-100)
- Statistical Density sub-score (0-100)
- Uniqueness sub-score (0-100)

**Block Citability Score** = (Answer * 0.30) + (SelfContain * 0.25) + (Structure * 0.20) + (Stats * 0.15) + (Unique * 0.10)

### Step 4: Calculate Page-Level Score

1. Calculate the average of all block scores for the page-level citability score.
2. Identify the top 3 highest-scoring blocks (highlight as strengths).
3. Identify the bottom 3 lowest-scoring blocks (flag for rewriting).
4. Calculate the percentage of blocks scoring above 70 (the "citability coverage" metric).

### Step 5: Generate Rewrite Suggestions

For each block scoring below 60, generate a specific rewrite suggestion:
1. Identify the primary weakness (buried answer, lack of facts, poor structure, etc.).
2. Propose a rewritten opening sentence using a definition or answer-first pattern.
3. Suggest specific statistics or facts that could be added.
4. Recommend structural improvements (add list, add table, split paragraph).

---

## Output Format

Generate a file called `GEO-CITABILITY-SCORE.md`:

```markdown
# AI Citability Analysis: [Page Title]

**URL:** [URL]
**Analysis Date:** [Date]
**Overall Citability Score: [X]/100**
**Citability Coverage:** [X]% of content blocks score above 70

---

## Score Summary

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Answer Block Quality | [X]/100 | 30% | [X] |
| Passage Self-Containment | [X]/100 | 25% | [X] |
| Structural Readability | [X]/100 | 20% | [X] |
| Statistical Density | [X]/100 | 15% | [X] |
| Uniqueness & Original Data | [X]/100 | 10% | [X] |
| **Overall** | | | **[X]/100** |

---

## Strongest Content Blocks

### 1. "[Heading]" -- Score: [X]/100
> [First 2 sentences of the block]

**Why it works:** [Explanation]

### 2. "[Heading]" -- Score: [X]/100
> [First 2 sentences of the block]

**Why it works:** [Explanation]

---

## Weakest Content Blocks (Rewrite Priority)

### 1. "[Heading]" -- Score: [X]/100

**Current opening:**
> [First 2 sentences as they exist]

**Problem:** [Specific issue -- buried answer, no facts, etc.]

**Suggested rewrite:**
> [Rewritten opening 2-3 sentences with answer-first pattern and facts]

**Additional improvements:**
- [Add table comparing X, Y, Z]
- [Include statistic about ...]
- [Split long paragraph into 2-3 shorter ones]

---

## Quick Win Reformatting Recommendations

1. **[Specific recommendation]** -- Expected citability lift: +[X] points
2. **[Specific recommendation]** -- Expected citability lift: +[X] points
3. **[Specific recommendation]** -- Expected citability lift: +[X] points
4. **[Specific recommendation]** -- Expected citability lift: +[X] points
5. **[Specific recommendation]** -- Expected citability lift: +[X] points

---

## Per-Section Scores

| Section Heading | Words | Answer Quality | Self-Contained | Structure | Stats | Unique | Overall |
|---|---|---|---|---|---|---|---|
| [H2 heading] | [N] | [X] | [X] | [X] | [X] | [X] | [X] |
```

---

## Reference Data

### Optimal Passage Characteristics (from GEO Research)

- **Optimal length for AI citation:** 134-167 words (Bortolato 2025 analysis of AI Overview passages)
- **Definition patterns increase citation rate by:** 2.1x (Georgia Tech 2024)
- **Adding statistics to passages increases citation by:** 40% (Princeton GEO study 2024)
- **Adding quotations from authorities increases citation by:** 115% in certain categories (IIT Delhi 2024)
- **Fluency optimization increases visibility by:** 30% on average across all query types
- **Content with source citations is cited:** 20-25% more often by Perplexity and ChatGPT search

### AI System Citation Preferences

| AI System | Citation Preference |
|---|---|
| **ChatGPT (Search)** | Prefers passages with explicit definitions, named sources, and recent dates. Tends to cite 2-4 sources per response. |
| **Perplexity** | Heavily favors fact-dense passages with statistics. Cites 4-8 sources per response. Values recency highly. |
| **Claude** | Prefers well-structured, comprehensive passages. Values nuance and accuracy over brevity. |
| **Gemini (AI Overviews)** | Prefers concise answer blocks (40-60 words). Values content already ranking in top 10 organic results. |
| **Copilot (Bing)** | Similar to Gemini. Prefers passages from high-authority domains with clear factual claims. |

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
