---
name: seo-aeo-content-cluster
description: "Builds a topical authority map with a pillar page, prioritised cluster articles, content types, internal link map, and content gap analysis. Activate when the user wants to build a content cluster, topic map, or content strategy."
risk: safe
source: community
date_added: "2026-04-01"
---

# SEO-AEO Content Cluster

## Overview

Maps out a complete topical authority structure around a pillar keyword. Produces a pillar page definition, 8–15 cluster articles sorted into Priority 1/2/3 tiers, a content type for each, an internal link map, and a content gap analysis identifying AEO opportunities competitors are missing.

Part of the [SEO-AEO Engine](https://github.com/mrprewsh/seo-aeo-engine).

## When to Use This Skill

- Use when building topical authority around a new subject
- Use when you need to know what to write next to support a pillar page
- Use when planning a content calendar for a niche
- Use when you want to identify AEO content gaps competitors are missing

## How It Works

### Step 1: Define the Pillar Page
Set the primary keyword, target audience, and word count target (2500–4000 words) for the pillar page that anchors the cluster.

### Step 2: Generate Cluster Articles
Produce 8–15 subtopics sorted into three priority tiers:
- **Priority 1** — High volume, clear intent. Write these first.
- **Priority 2** — Medium volume, long-tail focus. Write second.
- **Priority 3** — Low volume, high conversion intent. Write last.

Assign each article a unique keyword, content type, search intent, and link map.

### Step 3: Build Internal Link Map
Every cluster article must link back to the pillar page. No orphan articles. Show the full tree of relationships.

### Step 4: Run Content Gap Analysis
Identify angles that competitors likely miss — especially question-based AEO opportunities that AI engines commonly surface.

## Examples

### Example: Automated Budgeting Cluster
Pillar: The Complete Guide to Automated Budgeting
Priority 1:

How to Build a Budget That Actually Works | how-to guide
Best Budgeting Apps Compared | comparison
What Is Zero-Based Budgeting? | explainer ← AEO priority

Priority 2:
4. How to Automate Your Savings in 3 Steps | how-to guide
5. Budgeting for Millennials: What Nobody Tells You | opinion
Link Map:
Pillar ← Article 1, 2, 3, 4, 5
Article 1 ↔ Article 4
Article 2 → Article 3
AEO Priority:
★ Article 3 — "What Is" format has highest AI extraction probability
★ Article 2 — comparison table will be lifted for product queries

## Best Practices

- ✅ **Do:** Assign every cluster article a unique target keyword — no overlap
- ✅ **Do:** Include at least one FAQ page and one comparison article in every cluster
- ✅ **Do:** Flag the 2 highest AEO-opportunity articles for priority writing
- ❌ **Don't:** Let any article become an orphan — every article links to at least one other
- ❌ **Don't:** Target the same keyword on both the pillar and a cluster article

## Common Pitfalls

- **Problem:** Cluster articles all target similar keywords and cannibalise each other
  **Solution:** Run a uniqueness check — every article needs a distinct keyword with no semantic overlap.

- **Problem:** No AEO content in the cluster
  **Solution:** At least 2 articles must be structured as direct-answer pages (FAQ or "What Is" explainer).

## Related Skills

- `@seo-aeo-keyword-research` — provides the keyword foundation for the cluster
- `@seo-aeo-blog-writer` — writes the Priority 1 cluster articles
- `@seo-aeo-internal-linking` — builds the detailed link map from cluster output

## Additional Resources

- [SEO-AEO Engine Repository](https://github.com/mrprewsh/seo-aeo-engine)
- [Full Content Cluster SKILL.md](https://github.com/mrprewsh/seo-aeo-engine/blob/main/.agent/skills/content-cluster/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
