---
name: seo-aeo-meta-description-generator
description: "Writes 3 title tag variants and 3 meta description variants per page with SERP preview, OG tags, and Twitter Card tags. Activate when the user wants to write meta tags, title tags, or social sharing tags for any page."
risk: safe
source: community
date_added: "2026-04-01"
---

# SEO-AEO Meta Description Generator

## Overview

Produces 3 title tag variants and 3 meta description variants for any page, each using a different CTR mechanic (benefit lead, question hook, social proof). Also generates Open Graph and Twitter Card tags. Includes a SERP preview block and a variant comparison table with a recommended selection.

Part of the [SEO-AEO Engine](https://github.com/mrprewsh/seo-aeo-engine).

## When to Use This Skill

- Use when a page needs a title tag and meta description written or optimised
- Use when preparing social sharing tags for LinkedIn, X, or WhatsApp
- Use when A/B testing CTR on search results
- Use after the landing-page-writer or blog-writer skill completes

## How It Works

### Step 1: Identify CTR Angle Per Variant
- **V1 Benefit Lead** — leads with the outcome or benefit
- **V2 Question Hook** — opens with the question the searcher is asking
- **V3 Social Proof / Specificity** — leads with a number, stat, or specific claim

### Step 2: Apply Character Limits
- Title tag: 50–60 characters (hard limit: 60)
- Meta description: 140–155 characters (hard limit: 160)
- Never end a description mid-sentence near the limit

### Step 3: Apply CTR Rules
- Primary keyword in first 3 words of every title variant
- Primary keyword in first half of every description variant
- At least one power word per description
- Every description ends with a CTA verb
- Never use "click here", passive openers, or all-caps

### Step 4: Write Social Tags
OG and Twitter tags can be more conversational than SERP tags. Write them as distinct copy — not copy-pastes of the meta description.

## Examples

### Example 1: Landing Page Variants
Title V1: Remote Project Management Software | Syncro
(51 chars) — Keyword first, brand at end
Title V2: Manage Remote Teams Without the Chaos | Syncro
(54 chars) — Pain-point led with power word
Description V1 (Benefit Lead):
Ship faster with your distributed team. Syncro centralises
tasks, async updates, and sprints in one tool. Start free today.
(141 chars) ✅
Description V2 (Question Hook):
Struggling to keep your remote team aligned? Syncro replaces
scattered tools with one async-first workspace. Try it free.
(140 chars) ✅

## Best Practices

- ✅ **Do:** Write 3 variants — always give the user options to test
- ✅ **Do:** Keep OG and Twitter descriptions more conversational than SERP versions
- ✅ **Do:** Verify character count on every variant before outputting
- ❌ **Don't:** Use the same exact-match anchor or keyword more than once per description
- ❌ **Don't:** Copy-paste the meta description into the OG description
- ❌ **Don't:** Let any description end mid-sentence near the character limit

## Common Pitfalls

- **Problem:** Description truncates mid-word in search results
  **Solution:** Always trim a clause rather than letting natural truncation cut the sentence.

- **Problem:** All 3 variants sound identical
  **Solution:** Each variant must use a genuinely different CTR mechanic — not just rearranged words.

## Related Skills

- `@seo-aeo-landing-page-writer` — provides the page content this skill writes tags for
- `@seo-aeo-content-quality-auditor` — verifies meta elements as part of the full audit

## Additional Resources

- [SEO-AEO Engine Repository](https://github.com/mrprewsh/seo-aeo-engine)
- [Full Meta Description Generator SKILL.md](https://github.com/mrprewsh/seo-aeo-engine/blob/main/.agent/skills/meta-description-generator/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
