---
name: seo-aeo-schema-generator
description: "Generates valid JSON-LD structured data for 10 schema types with rich result eligibility validation and implementation-ready script blocks. Activate when the user wants to generate schema markup, JSON-LD, or structured data for any page."
risk: safe
source: community
date_added: "2026-04-01"
---

# SEO-AEO Schema Generator

## Overview

Generates implementation-ready JSON-LD schema markup for 10 schema types including FAQPage, Article, Product, HowTo, and BreadcrumbList. Validates all required fields against Google rich result eligibility rules, flags missing fields with exact fix instructions, and outputs one clean `<script>` block per schema type ready to paste into the page `<head>`.

Part of the [SEO-AEO Engine](https://github.com/mrprewsh/seo-aeo-engine).

## When to Use This Skill

- Use when adding structured data to a new landing page or blog post
- Use when a page needs FAQ rich results or product star ratings in search
- Use when validating existing schema for Google rich result eligibility
- Use after the content-quality-auditor flags missing schema

## Supported Schema Types

| Type | Rich Result Unlocked |
|------|---------------------|
| FAQPage | FAQ accordion in SERP — AEO critical |
| Article | Article rich result, Top Stories |
| Product | Price, availability, rating in SERP |
| HowTo | Step-by-step rich result |
| Review | Star rating in SERP |
| AggregateRating | Star rating with review count |
| BreadcrumbList | Breadcrumb path in SERP URL |
| Organization | Brand knowledge panel signals |
| WebPage | Enhanced page understanding |
| WebSite | Sitelinks Searchbox |

## How It Works

### Step 1: Recommend Schema Types
If schema types are not specified, recommend the appropriate types based on the page type. Landing pages get FAQPage + Product + BreadcrumbList. Blog posts get Article + FAQPage + BreadcrumbList.

### Step 2: Use Built-In Schema Templates
Using your knowledge of schema.org and Google's rich result requirements, construct the JSON-LD template for each requested schema type. Use the required and recommended fields listed in the Google Rich Results documentation for that type.

### Step 3: Populate Fields
Map all page data to template placeholders. Check every required field against the rich result eligibility rules.

### Step 4: Validate
Flag any missing required field as a Critical issue. Flag missing recommended fields as warnings. Do not output schema with missing required fields.

### Step 5: Output Script Blocks
Write one `<script type="application/ld+json">` block per schema type. Include implementation instructions and testing tool links.

## Examples

### Example: FAQPage Schema Output
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Syncro?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Syncro is a remote-first project management platform for distributed engineering teams. It centralises task tracking, async communication, and sprint planning in one tool."
      }
    }
  ]
}
</script>
```

## Best Practices

- ✅ **Do:** Always include FAQPage schema on any page with a FAQ section — it is the strongest AEO signal
- ✅ **Do:** Use one `<script>` block per schema type — never combine multiple types
- ✅ **Do:** Test every output in Google's Rich Results Test before deploying
- ❌ **Don't:** Use relative URLs anywhere in schema — all URLs must start with `https://`
- ❌ **Don't:** Leave placeholder text in any field before deploying
- ❌ **Don't:** Use HTML tags inside JSON-LD string values

## Common Pitfalls

- **Problem:** Schema passes validation but rich result doesn't appear in search
  **Solution:** Rich results can take weeks to appear after deployment. Request re-indexing in Google Search Console immediately after adding schema.

- **Problem:** Product schema missing star rating display
  **Solution:** Add AggregateRating object with ratingValue, reviewCount, bestRating, and worstRating — all four fields required.

## Related Skills

- `@seo-aeo-landing-page-writer` — provides the FAQ and product data for schema population
- `@seo-aeo-content-quality-auditor` — flags schema gaps during the audit

## Additional Resources

- [SEO-AEO Engine Repository](https://github.com/mrprewsh/seo-aeo-engine)
- [Full Schema Generator SKILL.md](https://github.com/mrprewsh/seo-aeo-engine/blob/main/.agent/skills/schema-generator/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
