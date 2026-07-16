---
name: seo-aeo-landing-page-writer
description: "Writes complete, structured landing pages optimized for SEO ranking, AEO citation, and visitor conversion. Activate when the user wants to write or generate a landing page for a product, service, or offer."
risk: safe
source: community
date_added: "2026-04-01"
---

# SEO-AEO Landing Page Writer

## Overview

Generates a full, publish-ready landing page following a defined section order with SEO heading structure, AEO extraction blocks, FAQ section, comparison table, social proof, and conversion-focused CTAs. Every section serves a specific purpose in a narrative arc that moves the visitor from awareness to action.

Part of the [SEO-AEO Engine](https://github.com/mrprewsh/seo-aeo-engine).

## When to Use This Skill

- Use when building a landing page for a new product or service
- Use when an existing landing page needs a full SEO and AEO rewrite
- Use when you need a page that can be cited by AI engines like Perplexity or ChatGPT
- Use when you want conversion copy that leads with pain before pitching the product

## How It Works

### Step 1: Map Inputs
Extract product name, audience, primary keyword, pain points, features, benefits, USPs, social proof, and CTAs. Map every feature to a user outcome before writing any copy.

### Step 2: Write AEO Extraction Sentence
Write one 25–40 word sentence that answers "What is [product]?" — standalone, no jargon, placed in a blockquote immediately after the H1. This is the sentence AI engines extract.

### Step 3: Follow the Narrative Arc
Write sections in this exact order:
1. Hero — H1 + AEO sentence + CTA
2. Problem — audience pain, no product mention yet
3. Solution — introduce product as the answer
4. Features as Benefits — table format
5. Social Proof — testimonials, logos, stats
6. Mid-page CTA
7. How It Works — numbered steps
8. Comparison — table with honest competitor comparison
9. FAQ — minimum 6 entries, each under 50 words
10. Trust Signals
11. Final CTA

### Step 4: Run SEO and AEO Checklists
Verify keyword placement, heading hierarchy, FAQ count, AEO block presence, and meta description placeholder before outputting.

## Examples

### Example 1: Hero Section Output
Ship Faster With Your Remote Team

Syncro is a remote-first project management platform that helps
distributed engineering teams track work, communicate
asynchronously, and ship without the chaos of email and
scattered spreadsheets.

[Start Free Trial]  [See How It Works]
"4,000+ remote teams" · "40% fewer status meetings" · "4.8/5 on G2"

### Example 2: FAQ Section Output
Q: What is Syncro?
A: Syncro is a remote-first project management platform for
distributed engineering teams. It centralises task tracking,
async communication, and sprint planning in one tool.
Q: How much does Syncro cost?
A: Syncro offers a flat-rate plan at $49/month for unlimited
users. A 14-day free trial is available — no credit card required.

## Best Practices

- ✅ **Do:** Write the problem section before mentioning the product — empathy first
- ✅ **Do:** Place the AEO extraction sentence in a blockquote immediately after H1
- ✅ **Do:** Write FAQ answers as standalone — each must make sense without context
- ✅ **Do:** Include at least one honest point in the comparison table where the alternative wins
- ❌ **Don't:** Use "revolutionary", "game-changing", or "best-in-class" anywhere
- ❌ **Don't:** Use "Submit" or "Click Here" as CTA button text
- ❌ **Don't:** Write paragraphs longer than 4 lines

## Common Pitfalls

- **Problem:** Product mentioned in the pain section
  **Solution:** The pain section exists to build empathy. Save the product introduction for the solution section.

- **Problem:** FAQ answers are too long to be extracted by AI engines
  **Solution:** Every FAQ answer must be under 50 words and self-contained.

## Related Skills

- `@seo-aeo-keyword-research` — provides the primary keyword and AEO queries
- `@seo-aeo-meta-description-generator` — writes title and meta description from page output
- `@seo-aeo-content-quality-auditor` — audits the completed landing page

## Additional Resources

- [SEO-AEO Engine Repository](https://github.com/mrprewsh/seo-aeo-engine)
- [Full Landing Page Writer SKILL.md](https://github.com/mrprewsh/seo-aeo-engine/blob/main/.agent/skills/landing-page-writer/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
