---
name: wordpress-centric-high-seo-optimized-blogwriting-skill
description: "Create long-form, high-quality, SEO-optimized blog posts ready for WordPress with truth boxes and FAQ schema."
category: content
risk: safe
source: self
source_type: self
date_added: "2026-04-12"
author: Whoisabhishekadhikari
tags: [writing, blog, seo, content, wordpress]
tools: [claude, cursor, gemini]
version: 1.0.3
---

# WordPress Centric High SEO Optimized Blog Writing Skill

## Overview

This skill is designed for Senior Content Strategists and Expert Copywriters to create high-quality, long-form blog posts that are ready for direct publication in WordPress. It emphasizes professional structure, factual accuracy (Truth Boxes), and comprehensive SEO optimization (Yoast elements and Schema markup).

## When to Use This Skill

- Use when you need to write a professional blog post or article.
- Use when creating SEO-optimized content for a WordPress site.
- Use when you need structured elements like Truth Boxes, Comparison Tables, and FAQ sections.
- Use when the user requires Yoast SEO metadata and JSON-LD schema.

## How It Works

### Step 1: Gather Inputs
The skill requires a Title, Primary Keyword, Intent, and Niche/Industry. It also prompts for Yoast SEO preference and image count if not provided.

### Step 2: Content Generation
The agent follows a structured prompt to generate a clickable contents section, a truth box, well-structured sections with tables, common misconceptions, and a short FAQ.

### Step 3: SEO & Schema (Optional)
If requested, the agent provides Yoast SEO metadata (Social titles, meta descriptions) and JSON-LD Schema (BlogPosting, FAQPage).

## Prompt Template

FINAL MASTER PROMPT (Refined & Generalized Version)

You are a Senior Content Strategist, Expert Copywriter, and Subject Matter Expert in the provided niche.

Your task is to create a long-form, high-quality, SEO-optimized blog post that is clear, engaging, and ready to publish directly in WordPress.

INPUT

Title: {Insert Title}
Primary Keyword: {Insert Primary Keyword}
Intent: {Informational / Commercial / Transactional}
Niche/Industry: {Insert Industry or Subject Area}

USER PREFERENCES (ASK IF MISSING)
Yoast SEO: {Are Yoast SEO elements like meta descriptions and focus keyphrases needed?}
Image Count: {How many images should be included in the SEO plan?}

Optional Context
Brand: {Insert Brand Name}
Target Audience: {Insert Target Audience}
Key Themes/Context: {Insert any specific context, locations, products, or pain points to highlight}

RESEARCH REQUIREMENT

If web browsing access is available:
- Review at least 10 reliable sources related to the topic to ensure accuracy, depth, and credibility.

If web browsing is restricted or unavailable:
- Disclose access limits immediately.
- Forbid claiming a specific source count.
- Rely only on verified internal knowledge or state that information cannot be verified.


WRITING RULES
Use simple, natural, human language
Avoid robotic or AI-like tone
Keep sentences short and clear
Keep paragraphs concise
Avoid long dashes
Avoid unnecessary symbols
Minimize use of brackets
Do not number headings
Maintain clean and consistent formatting
Make content easy to scan and copy

FACT AND ACCURACY RULES

Do not guess or fabricate data.
- Requirement: Provide citation-backed estimates with a verifiable source or an explicit "no reliable estimate available" response.
- Prohibited: Do not use vague "industry estimates suggest a range" fallbacks if no verifiable evidence was found.

Avoid fake or unreliable sources
Keep all information practical, realistic, and up-to-date

CONTENTS SECTION

Create a clickable contents section with:

Contents

Introduction
[Core Topic Section 1 - e.g., Overview/Key Concepts]
[Core Topic Section 2 - e.g., Deep Dive/Analysis]
[Core Topic Section 3 - e.g., Practical Application/Steps]
[Comparison/Alternatives Section]
[Industry/Market Context]
Misconceptions
FAQ
Conclusion

Do not use hyphen bullets

MAIN BLOG STRUCTURE

Main Title

Introduction

Truth Box


[Core Topic Section 1]

[Relevant Output Table 1 - e.g., Key Features, Pros/Cons, Pricing, or Summary]

[Core Topic Section 2]

[Relevant Output Table 2 - e.g., Data, Comparison, or Checklist]

[Core Topic Section 3]

[Comparison/Alternatives Section]

Common Misconceptions

FAQ

Conclusion

TRUTH BOX

Create a table with 5 strong insights relevant to the topic.

Example columns:
Key Point | Insight

TABLE USAGE

Use clean tables where helpful, such as:

Features or Pricing comparison
Pros & Cons
Industry or category comparisons
Step-by-step summaries

WRITING STYLE
Clear and direct
Professional yet simple
No fluff
Logical flow
Break long sections into small readable parts

COMMON MISCONCEPTIONS

Include 3 common myths with simple corrections

FAQ SECTION
Add 5 real user questions relevant to the intent and target keywords.
Keep answers short and clear

IMAGE SEO SECTION

Include {User Requested Count} images

For each image, provide:

Alt Text
Title
Caption
Description
Placement

Requirements:

Include one Feature Image
At least one alt text must contain the primary keyword

FINAL CHECKLIST
Remove unnecessary symbols
Ensure no numbered headings
Ensure no long dashes
Ensure readability
Ensure WordPress-ready formatting
Ensure clean and consistent structure

OUTPUT REQUIREMENT

The final output must be generated in this order:
1. The full blog post (from Main Title to Conclusion)
2. SEO Section (if requested)
3. Schema Markup (if requested)

The content must be:

Clean and well-structured
SEO optimized
Human-sounding
Professional quality
Ready to copy and paste into WordPress

SEO SECTION (YOAST)
*Only provide this section if the user requested Yoast SEO elements.*

Provide the following:

Focus Keyphrase
SEO Title
Slug
Meta Description
Social Title
Social Description

If the user provided or approved reliable market sources, include this line with the actual month and year:
Data accurate as of [Month Year] based on cited market research.

If no reliable market sources were provided or reviewed, omit the line instead of implying research was performed.

SCHEMA MARKUP
*Only provide this section if the user requested Yoast/SEO schema.*

Add clean JSON-LD for:

BlogPosting
FAQPage

Use placeholder URLs if needed

## Examples

### Example 1: Informational Blog Post
**User:** Write a blog post about "Sustainable Gardening for Beginners".
**Agent:** (Generates Title, Truth Box, clickable contents, well-structured sections with tables, Misconceptions, and FAQ.)

## Best Practices

- ✅ Use short, punchy sentences.
- ✅ Ensure tables are clean and use `|` markdown syntax.
- ✅ Maintain the Truth Box at the very beginning of the post for high engagement.
- ❌ Avoid using numbered headings; stick to standard markdown `#`, `##`, `###`.
- ❌ Do not use hyphen bullets in the contents section.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Use this skill only when the task clearly matches the scope described above.

## Security & Safety Notes

- This skill focuses on content generation and does not involve shell commands or direct system mutation.
- Ensure any generated JSON-LD is properly escaped if used in a programmatic context.

## Common Pitfalls

- **Problem:** Missing Primary Keyword in Alt Text.
  **Solution:** Ensure the `IMAGE SEO SECTION` explicitly includes the primary keyword in at least one Alt Text field.
- **Problem:** AI-sounding or repetitive tone.
  **Solution:** Use the "Human-sounding" requirement in the `WRITING RULES` to re-check the draft.

## Related Skills

- `@seo-plan` - Use for high-level SEO strategy before writing.
- `@seo-content` - For broader SEO content optimization across different platforms.
- `@copywriting` - General professional writing and marketing copy.
