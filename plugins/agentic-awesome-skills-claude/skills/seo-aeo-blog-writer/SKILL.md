---
name: seo-aeo-blog-writer
description: "Writes long-form blog posts with TL;DR block, definition sentence, comparison table, and 5-question FAQ for SEO ranking and AEO citation. Activate when the user wants to write a blog post, article, or long-form content piece."
risk: safe
source: community
date_added: "2026-04-01"
---

# SEO-AEO Blog Writer

## Overview

Writes structured long-form blog posts (800–3000 words) that satisfy both SEO ranking signals and AEO citation requirements. Every post includes a TL;DR direct-answer block, a definition sentence, structured H2/H3 hierarchy, a comparison table where relevant, and exactly 5 FAQ entries written for AI extraction.

Part of the [SEO-AEO Engine](https://github.com/mrprewsh/seo-aeo-engine).

## When to Use This Skill

- Use when writing a cluster article from a content cluster map
- Use when creating a long-form guide to build topical authority
- Use when you need content that can be cited by AI engines like Perplexity or ChatGPT
- Use when you need a blog post that follows a consistent, auditable structure

## How It Works

### Step 1: Write the TL;DR Block First
Write a 2–3 sentence direct answer to the article's core question. Place it immediately after the H1 in a blockquote. This is the first block AI engines attempt to extract.

### Step 2: Build the Heading Skeleton
Set H1, H2s (4–6), and H3s before writing any body content. The first H2 must be a "What Is" section with a clean definition sentence as its opening line.

### Step 3: Write Body Sections
Follow the section order: What Is → Why It Matters → How It Works (with H3 sub-concepts) → Practical Steps → Common Mistakes → FAQ → Conclusion.

### Step 4: Write 5 FAQ Entries
Use long-tail and secondary keywords as questions. Each answer must be under 50 words and self-contained — readable without any surrounding context.

### Step 5: Run AEO and SEO Checklists
Verify TL;DR presence, definition sentence, FAQ count, keyword placement, and heading structure before outputting.

## Examples

### Example: TL;DR Block
How to Manage a Remote Engineering Team

TL;DR: Managing a remote engineering team requires async
communication tools, clear documentation standards, and
timezone-aware sprint planning. Teams that nail these three
areas ship consistently regardless of where members are located.


### Example: FAQ Section
Q: What is the biggest challenge of remote engineering teams?
A: Async communication. Without shared hours, decisions slow down
and context gets lost. Teams that document decisions in writing
and use structured standup tools close this gap fastest.
Q: How do you run a daily standup with a remote team?
A: Use async video or text standups posted at the start of each
member's day. Tools like Loom or Slack threads work well.
Avoid live calls across more than 2 timezones.

## Best Practices

- ✅ **Do:** Write the TL;DR block before writing anything else — it anchors the article
- ✅ **Do:** Make the "What Is" definition sentence extractable on its own — one clean sentence
- ✅ **Do:** Use secondary keywords as FAQ questions to capture long-tail traffic
- ❌ **Don't:** Write FAQ answers longer than 50 words — AI engines skip long answers
- ❌ **Don't:** Use duplicate H2 headings anywhere in the article
- ❌ **Don't:** Skip the comparison table if the topic involves comparing options

## Common Pitfalls

- **Problem:** TL;DR block is too vague to be extracted as a direct answer
  **Solution:** The TL;DR must answer the article's core question in 2–3 sentences. If it doesn't answer a specific question, rewrite it.

- **Problem:** FAQ answers reference "as mentioned above" or other context
  **Solution:** Every FAQ answer must stand completely alone — no references to other parts of the article.

## Related Skills

- `@seo-aeo-content-cluster` — provides the topic and keyword for this article
- `@seo-aeo-content-quality-auditor` — audits the completed post for SEO and AEO signals
- `@seo-aeo-internal-linking` — maps links between this post and related pages

## Additional Resources

- [SEO-AEO Engine Repository](https://github.com/mrprewsh/seo-aeo-engine)
- [Full Blog Writer SKILL.md](https://github.com/mrprewsh/seo-aeo-engine/blob/main/.agent/skills/blog-writer/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
