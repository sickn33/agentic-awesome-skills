---
name: wordpress-centric-high-seo-optimized-blogwriting-skill
description: "Generate clean, human-sounding, SEO-optimized WordPress blog posts with optional Yoast metadata, JSON-LD schema markup, and image SEO planning. Supports modular batch output."
category: content
risk: safe
source: self
source_type: self
date_added: "2026-04-12"
author: Whoisabhishekadhikari
tags: [writing, blog, seo, content, wordpress]
tools: [claude, cursor, gemini]
version: 1.1.0
---

# WordPress SEO Blog Writing Skill

## Overview

This skill enables Senior Content Strategists and Expert Copywriters to produce long-form, publication-ready blog posts for WordPress. It enforces professional structure, factual rigor, and comprehensive SEO optimization — including Yoast metadata and JSON-LD schema markup.

---

## When to Use This Skill

- Writing a professional blog post or article for WordPress
- Creating SEO-optimized content targeting a specific keyword and intent
- Structuring content with Truth Boxes, Comparison Tables, and FAQ sections
- Generating Yoast SEO metadata and JSON-LD schema markup

---

## Inputs Required

| Field | Required | Description |
|---|---|---|
| Title | Yes | The blog post headline |
| Primary Keyword | Yes | The target SEO keyword |
| Intent | Yes | Informational, Commercial, or Transactional |
| Niche / Industry | Yes | The subject area or vertical |
| Yoast SEO | Ask if missing | Whether to include Yoast metadata |
| Image Count | Ask if missing | Number of images to plan SEO for |
| Brand | Optional | Brand name for tone alignment |
| Target Audience | Optional | Intended reader profile |
| Key Themes / Context | Optional | Specific locations, products, or pain points |

---

## How It Works

### Step 1 — Gather Inputs
Collect all required fields. If Yoast SEO preference or image count is missing, ask before proceeding.

### Step 2 — Generate Content
Produce a structured, long-form blog post following the content rules and format below.

### Step 3 — Generate SEO & Schema (If Requested)
Append Yoast metadata and JSON-LD schema after the blog post, in the order specified.

---

## Prompt Template

```text
You are a Senior Content Strategist, Expert Copywriter, and Subject Matter Expert
in the provided niche.

Your task is to write a long-form, SEO-optimized blog post that is clear, engaging,
and ready to publish directly in WordPress.

---

INPUT

Title:            {Insert Title}
Primary Keyword:  {Insert Primary Keyword}
Intent:           {Informational / Commercial / Transactional}
Niche/Industry:   {Insert Industry or Subject Area}

OPTIONAL CONTEXT

Brand:                  {Insert Brand Name}
Target Audience:        {Insert Target Audience}
Key Themes / Context:   {Insert specific context, locations, products, or pain points}

---

RESEARCH REQUIREMENT

If web browsing is available:
- Review at least 10 reliable sources to ensure accuracy and depth.

If web browsing is unavailable:
- Disclose the limitation immediately.
- Do not claim a specific source count.
- Rely only on verified internal knowledge, or clearly state when information
  cannot be confirmed.

---

WRITING RULES

- Use simple, natural, human language.
- Avoid robotic or AI-like tone.
- Keep sentences short and paragraphs concise.
- Do not use long dashes, unnecessary symbols, or brackets.
- Do not number headings.
- Maintain clean, consistent formatting throughout.
- Prioritize readability and scannability.

---

ACCURACY RULES

- Do not guess or fabricate data.
- Provide citation-backed estimates with a verifiable source, or state explicitly
  that no reliable estimate is available.
- Do not use vague fallbacks such as "industry estimates suggest" without
  verifiable evidence.
- Avoid fake or unreliable sources.
- Keep all information practical, realistic, and current.

---

CONTENTS SECTION

Generate a clickable table of contents using this structure:

  Contents

  Introduction
  [Core Topic Section 1 — e.g., Overview or Key Concepts]
  [Core Topic Section 2 — e.g., Deep Dive or Analysis]
  [Core Topic Section 3 — e.g., Practical Application or Steps]
  [Comparison or Alternatives Section]
  [Industry or Market Context]
  Common Misconceptions
  FAQ
  Conclusion

Do not use hyphen bullets in the final output.

---

MAIN BLOG STRUCTURE

  Main Title

  Introduction

  Truth Box

  [Core Topic Section 1]
  [Relevant Table 1 — e.g., Key Features, Pros/Cons, Pricing, or Summary]

  [Core Topic Section 2]
  [Relevant Table 2 — e.g., Data, Comparison, or Checklist]

  [Core Topic Section 3]

  [Comparison / Alternatives Section]

  Common Misconceptions

  FAQ

  Conclusion

---

TRUTH BOX

A table with 5 strong, topic-relevant insights.

Columns: Key Point | Insight

---

TABLES

Use clean markdown tables where they add clarity, such as:
- Feature or pricing comparisons
- Pros and cons
- Industry or category breakdowns
- Step-by-step summaries

---

COMMON MISCONCEPTIONS

Include 3 common myths about the topic with clear, simple corrections.

---

FAQ SECTION

Include 5 real user questions relevant to the topic, intent, and target keywords.
Keep answers short and direct.

---

IMAGE SEO SECTION

Plan SEO for {User Requested Count} images.

For each image, provide:
- Alt Text (at least one must include the primary keyword)
- Title
- Caption
- Description
- Placement in the post

Always include one Featured Image.

---

FINAL CHECKLIST

Before delivering the output, confirm:
- No unnecessary symbols
- No numbered headings
- No long dashes
- Content is readable and well-paced
- Formatting is WordPress-ready and consistent
```

---

## Output Order

In default (non-batch) mode, deliver output in this sequence:

1. Full blog post (Main Title through Conclusion)
2. SEO Section (if requested)
3. Schema Markup (if requested)

When a batch mode is selected, return only the requested component(s).

---

## Batch Output Options

Use batch mode when the user requests individual components separately.

### Batch 1 — Blog Post Only
Full blog post from title to conclusion. No SEO metadata, schema, or image SEO.

### Batch 2 — SEO Metadata
Yoast SEO elements only:
- Focus keyphrase
- SEO title
- Slug
- Meta description
- Social title
- Social description
- Suggested internal links
- Suggested external link types

### Batch 3 — Image SEO
Image SEO assets only:
- Featured image concept
- Supporting image concepts
- Alt text, title, caption, description, and placement for each

### Batch 4 — Schema Markup
JSON-LD schema only:
- `BlogPosting` schema
- `FAQPage` schema

---

## SEO Section (Yoast)

*Generate only if the user requested Yoast SEO elements.*

Provide:
- Focus Keyphrase
- SEO Title
- Slug
- Meta Description
- Social Title
- Social Description

If reliable, cited market sources were reviewed, append:
> Data accurate as of [Month Year] based on cited market research.

If no reliable sources were reviewed, omit this line entirely.

---

## Schema Markup

*Generate only if the user requested schema markup.*

Provide clean JSON-LD for:
- `BlogPosting`
- `FAQPage`

Use placeholder URLs where actual URLs are unavailable.

---

## Best Practices

- Write short, direct sentences.
- Use `|` markdown syntax for clean, readable tables.
- Place the Truth Box immediately after the introduction for maximum engagement.
- Use `#`, `##`, and `###` for headings — never number them.
- Avoid hyphen bullets in the contents section.

---

## Limitations

- This skill does not replace expert review, fact-checking, or environment-specific validation.
- Stop and ask for clarification if required inputs, permissions, or scope boundaries are unclear.
- Use this skill only for tasks that match the scope described above.

---

## Security and Safety Notes

- This skill is limited to content generation. It does not execute shell commands or mutate system state.
- Ensure any generated JSON-LD is properly escaped before use in a programmatic context.

---

## Common Pitfalls

**Primary keyword missing from alt text**
Explicitly include the primary keyword in at least one alt text field in the Image SEO section.

**AI-sounding or repetitive tone**
Revisit the Writing Rules. Shorten sentences, vary structure, and remove filler phrases.

---

## Related Skills

- `@seo-plan` — High-level SEO strategy before writing
- `@seo-content` — Broader SEO content optimization across platforms
- `@copywriting` — General professional writing and marketing copy