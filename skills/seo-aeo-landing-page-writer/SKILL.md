---
name: seo-aeo-landing-page-writer
description: "Writes or improves conversion-focused landing pages for products, services, and offers with practical SEO and AEO structure."
risk: safe
source: community
date_added: "2026-04-01"
---


# Landing Page Writer Skill

Write a publishable landing-page draft that helps the intended visitor understand the offer, trust it, and take the next step. Optimize for humans first, then make the page easy for search engines and answer engines to parse.

## Inputs

Use these fields when supplied. Infer only what is obvious; otherwise list missing assumptions before the draft.

```json
{
  "product_name": "string",
  "business_type": "string — what the product or service does",
  "target_audience": "string",
  "primary_keyword": "string — exact target phrase, if known",
  "secondary_keywords": ["string"],
  "usp": ["string — differentiators, up to 5"],
  "pain_points": ["string"],
  "features": ["string"],
  "benefits": ["string — user outcomes mapped to features"],
  "social_proof": {"testimonials": ["string"], "logos": ["string"], "stats": ["string"]},
  "cta_primary": "string",
  "cta_secondary": "string",
  "offer": "string — optional and factual",
  "keyword_data": "string — optional seo-aeo-keyword-research output",
  "competitor": "string — optional named alternative",
  "tone": "professional | conversational | bold | empathetic | authoritative"
}
```

If critical inputs are missing, proceed with clearly marked placeholders rather than inventing product facts. Never invent customers, reviews, logos, performance claims, prices, guarantees, awards, security claims, or compliance certifications. If a comparison lacks reliable competitor facts, compare against a generic alternative such as “doing this manually” and label it as a positioning draft.

## Decision rules

- Follow the visitor’s search intent and requested conversion goal; do not force a sales structure onto an informational request.
- Choose one emotional anchor from the pain points and one central outcome from the benefits.
- Map every included feature to a concrete user benefit. Omit features with no clear outcome.
- Keep the product out of the opening problem section so the reader’s situation is established before the pitch.
- Use the primary keyword naturally in the H1, opening copy, one relevant H2, and at least one FAQ answer when provided. Do not use arbitrary density targets.
- Make claims proportional to the evidence supplied. Use placeholders such as `[verified customer quote]` where proof is missing.
- Prefer short paragraphs, descriptive headings, scannable lists, and direct answers.

## Required page flow

Use this order unless the user requests another structure:

1. SEO metadata
2. Hero and direct-answer block
3. Problem
4. Solution
5. Features and benefits
6. Social proof or trust evidence
7. Mid-page CTA
8. How it works
9. Comparison or alternatives
10. FAQ
11. Trust and risk-reversal signals
12. Final CTA
13. Internal-link suggestions

The problem section must not mention the product. The hero must state what the product is, who it is for, and the primary outcome in one standalone sentence of roughly 25–40 words. Keep this AEO extraction block factual and free of hype.

## Output format

Return Markdown in the exact section order above. Include:

```markdown
## SEO Metadata
H1: [one H1, normally 6–10 words]
Meta Title: [50–60 characters where practical, keyword-led]
Meta Description: [draft only; hand off to seo-aeo-meta-description-generator when available]
URL Slug: /[short lowercase hyphenated slug]

## Hero
# [H1]
> [standalone definition and audience/outcome sentence]
[sub-headline]
[primary CTA]  [secondary CTA]

## Problem
## Solution
## Features and Benefits
| Feature | User outcome |
|---|---|

## Social Proof
## Mid-page CTA
## How It Works
1. **Step** — [short description]

## Comparison or Alternatives
| Dimension | Product | Alternative |
|---|---|---|

## Frequently Asked Questions
**Q: [question]**
A: [standalone answer]

## Trust and Risk Reversal
## Final CTA
## Internal-Link Suggestions
```

## Quality checks before returning

- Exactly one H1; headings are hierarchical and descriptive.
- The first paragraph explains the offer and audience without unexplained jargon.
- The hero contains one direct-answer block and a clear primary CTA.
- Include at least three useful FAQ entries when context allows; use six only when the audience has six genuine questions. The first FAQ should define the product when relevant.
- FAQ answers are standalone and normally under 50 words; never add FAQ schema for content that is not visible on the page.
- Features are rewritten as outcomes in a table, and every major pain point has a corresponding benefit or explanation.
- Comparison claims are fair and evidence-based; include a dimension where the alternative may be better when applicable.
- Metadata is concise, unique, and free of keyword stuffing. Do not fabricate character-perfect results.
- Suggest internal links only to supplied or clearly named related pages, using descriptive anchors rather than “click here”.
- End with `Assumptions and verification notes` only when placeholders, unsupported claims, or missing inputs remain.

## Connected skills

- Receives optional context from `seo-aeo-keyword-research` and `seo-aeo-content-cluster`.
- Hand off the completed page to `seo-aeo-meta-description-generator`, `seo-aeo-content-quality-auditor`, `seo-aeo-internal-linking`, and `seo-aeo-schema-generator` when available or requested.

## When to Use

Use when creating or improving a conversion-focused product, service, offer, or homepage while preserving clear search and answer-engine structure.

## Limitations

- Draft copy cannot validate legal claims, product capabilities, accessibility, performance, or actual conversion results without project-specific review.
