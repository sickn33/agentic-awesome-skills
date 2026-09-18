---
name: seo-aeo-blog-writer
description: "Writes search-intent-led long-form articles with answer-first structure, FAQ coverage, internal links, and conversion paths for SEO and AEO."
risk: safe
source: community
date_added: "2026-04-01"
---

# Blog Writer Skill

## Description
Activate this skill when the user wants to write a blog post, article, or
long-form content piece for SEO and AEO purposes. Trigger phrases include:
"write a blog post", "create an article", "generate blog content",
"write a long-form post about", "blog writer".

## Input Format
```json
{
  "topic": "string — the main subject of the article",
  "primary_keyword": "string — exact keyword to rank for",
  "secondary_keywords": ["string", "string"],
  "target_audience": "string — who is reading this",
  "tone": "informational | conversational | authoritative | persuasive",
  "word_count": "integer — minimum 800, maximum 3000, default 1500",
  "cluster_context": "string — optional, paste content cluster output here",
  "internal_link_targets": ["string — page/post titles to link to"],
  "product_cta": "string — optional CTA and destination",
  "search_intent_evidence": "string — optional observed SERP/API evidence",
  "distribution_platforms": ["string — optional external platforms"]
}
```

Write to the dominant search intent, not merely the keyword. The article should solve a recognizable problem and make the next product action clear without turning an informational article into an unsupported sales pitch.

## Output Structure

The skill must always produce a blog post in this exact section order:
```markdown
# [H1: Primary Keyword-Optimised Title]

> **TL;DR:** [2–3 sentence direct answer to the article's core question.
> This is the AEO extraction block — write it to be lifted by AI engines.]

## Introduction
[Hook sentence. State the problem or question clearly in the first 2 lines.
Mention the primary keyword naturally within the first 100 words.]

---

## [H2: What Is {Topic}]
[Definition block — write a single, clean, extractable definition sentence
as the very first line of this section. Follow with 2–3 paragraphs of context.]

---

## [H2: Why {Topic} Matters / The Core Problem]
[Establish relevance. Use bullet points or a numbered list in this section.]

---

## [H2: How {Topic} Works / Main Body Section]
[Deepest section. Use H3 subheadings for sub-concepts. Include at least
one comparison block formatted as a table if comparing two or more things.]

### [H3: Sub-concept 1]
### [H3: Sub-concept 2]
### [H3: Sub-concept 3]

---

## [H2: Practical Steps / How To Section — if applicable]
[Numbered list of steps. Each step max 2 sentences. Scannable.]

---

## [H2: Common Mistakes / What To Avoid — if applicable]
[Bullet list format. Short, punchy, extractable by AI.]

---

## Frequently Asked Questions

**Q: [Question using a long-tail keyword]**
A: [Direct answer, 2–3 sentences max. No fluff.]

**Q: [Question using a secondary keyword]**
A: [Direct answer.]

**Q: [Question the target audience commonly asks]**
A: [Direct answer.]

**Q: [Question about cost, time, or comparison]**
A: [Direct answer.]

**Q: [Question about a common misconception]**
A: [Direct answer.]

---

## Conclusion
[Restate the core answer from the TL;DR in new words.
One call to action sentence at the end.]

---

## Internal Links
[INTERNAL LINK: {internal_link_target_1}]
[INTERNAL LINK: {internal_link_target_2}]

## External Links
[EXTERNAL LINK: authoritative source relevant to primary keyword]

## Product CTA
[CTA: relevant product action and destination]

## External Distribution Notes
- [Platform]: [adaptation angle, canonical-link decision, and backlink target]
```

---

## AEO Requirements
Every blog post produced by this skill MUST contain:

- [ ] A TL;DR block immediately after the H1
- [ ] A clean definition sentence as the first line of the "What Is" section
- [ ] At least one comparison table (if topic involves comparing options)
- [ ] Exactly 5 FAQ entries with direct, concise answers
- [ ] Bullet or numbered lists in at least 2 sections
- [ ] Primary keyword in: H1, first 100 words, at least one H2, meta description
- [ ] A relevant product CTA or next step is present when the article supports conversion
- [ ] Internal links connect the article to a foundational page and, where relevant, the product

---

## SEO Requirements

- H1: appears exactly once, contains primary keyword
- H2s: 4–6 per article, no keyword stuffing
- H3s: used only inside H2 sections, not standalone
- Word count: stay within the range specified in input; default 1500 words
- Keyword use: natural and intent-aligned; do not force a density percentage
- No duplicate headings

---

## Execution Steps

1. Read `cluster_context` if provided — use it to decide which sub-topics
   to cover and which to leave for linked cluster articles
2. Review `search_intent_evidence` if provided and state the problem the article solves
3. Write the TL;DR block first — this anchors the whole article's direction
4. Build the heading skeleton before writing body content
5. Write the definition block in the "What Is" section as a single sentence
6. Write the FAQ section using long-tail and secondary keywords as questions
7. Insert internal links at natural transition points, including a foundational page and product CTA where appropriate
8. Add external-source suggestions only when they are authoritative and relevant
9. Do a final keyword placement check against the SEO Requirements checklist
10. Do a final AEO, conversion, and claim-verification pass before outputting

---

## Connected Skills
- Receives output from: `seo-aeo-content-cluster`
- Feeds output to: `seo-aeo-content-quality-auditor`, `seo-aeo-internal-linking`

## When to Use

Use when creating or revising a long-form article intended to capture a specific search intent and guide readers toward a relevant next step.

## Limitations

- Search performance depends on the actual site, competition, content quality, and indexing; this skill cannot guarantee rankings or traffic.
