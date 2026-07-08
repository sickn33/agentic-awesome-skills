---
name: seo-aeo-content-quality-auditor
description: "Audits content for SEO and AEO performance with scored reports, severity-ranked fix lists, and projected scores after fixes. Activate when the user wants to audit, review, or score content for SEO or AEO compliance."
risk: safe
source: community
date_added: "2026-04-01"
---

# SEO-AEO Content Quality Auditor

## Overview

Runs a dual SEO + AEO audit on any landing page or blog post. Produces an overall score, SEO score, AEO score, and readability score — each out of 100 — with severity-ranked issue lists (Critical / Warning / Polish), exact fix instructions for every issue, and projected scores after all fixes are applied.

Part of the [SEO-AEO Engine](https://github.com/mrprewsh/seo-aeo-engine).

## When to Use This Skill

- Use when auditing a landing page or blog post before publishing
- Use after the blog-writer or landing-page-writer skill outputs content
- Use when diagnosing why existing content is underperforming in search
- Use when you need a scored, actionable SEO and AEO report

## How It Works

### Step 1: Run SEO Checks
Verify keyword density, H1/H2/H3 structure, meta elements, word count, sentence length, and paragraph density. Flag every issue with its severity.

### Step 2: Run AEO Checks
Check for TL;DR block, definition sentence, FAQ section (minimum 4 entries), bullet and numbered lists, comparison table, and extractable direct answers. Score each signal as found or missing.

### Step 3: Run Readability Checks
Check passive voice ratio, transition word presence, wall-of-text paragraphs, subheading frequency, and reading level.

### Step 4: Score and Prioritise
Calculate three scores out of 100. Sort all issues into Critical (fix before publishing), Important (fix soon), and Polish (optional improvements). Generate projected scores after all fixes are applied.

## Scoring System

| Score | Status | Label |
|-------|--------|-------|
| 85–100 | ✅ Pass | Strong |
| 70–84 | ⚠️ Warn | Acceptable |
| 50–69 | 🔶 Weak | Needs work |
| 0–49 | ❌ Fail | Do not publish |

## Examples

### Example: Audit Summary
Overall Score:    84/100  ⚠️ Acceptable
SEO Score:        88/100  ✅ Pass
AEO Score:        74/100  ⚠️ Acceptable
Readability:      91/100  ✅ Pass
Verdict: Strong SEO foundation. AEO needs a TL;DR block
and one more FAQ entry before publishing.
🔴 Critical (fix before publishing):

AEO: No TL;DR block found
Fix: Add a 2–3 sentence direct-answer block in a
blockquote immediately after the H1.

🟡 Important (fix soon):
2. AEO: FAQ has 3 entries — minimum is 4
Fix: Add one more FAQ entry using a secondary keyword
as the question.
Projected score after fixes: 93/100 ✅

## Best Practices

- ✅ **Do:** Fix all Critical issues before publishing — they block AEO extraction
- ✅ **Do:** Use the projected score to prioritise which fixes to make first
- ✅ **Do:** Run the audit on both the landing page and blog post in the same session
- ❌ **Don't:** Publish content scoring below 50/100 overall
- ❌ **Don't:** Ignore AEO warnings — they directly affect AI engine citation probability

## Common Pitfalls

- **Problem:** SEO score is high but AEO score is low
  **Solution:** Traditional SEO tools miss AEO signals entirely. Run the AEO checklist separately and treat it as equally important.

- **Problem:** Fix list is long and overwhelming
  **Solution:** Work through Critical issues only first, re-run the audit, then tackle Important issues.

## Related Skills

- `@seo-aeo-blog-writer` — produces the content this skill audits
- `@seo-aeo-landing-page-writer` — produces landing pages this skill audits
- `@seo-aeo-schema-generator` — uses audit output to determine schema priorities

## Additional Resources

- [SEO-AEO Engine Repository](https://github.com/mrprewsh/seo-aeo-engine)
- [Full Content Quality Auditor SKILL.md](https://github.com/mrprewsh/seo-aeo-engine/blob/main/.agent/skills/content-quality-auditor/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
