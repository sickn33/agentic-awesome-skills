---
name: geo-brand-mentions
description: Brand mention and authority scanner for AI visibility.
category: seo
risk: safe
source: https://github.com/zubair-trabzada/geo-seo-claude
source_repo: zubair-trabzada/geo-seo-claude
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/zubair-trabzada/geo-seo-claude/blob/main/LICENSE
compatibility: Docs-only; upstream helper scripts and templates are not bundled. Site
  audits need network access to the target site; PDF reports need pandoc and headless
  Chrome.
allowed-tools:
- Read
- Grep
- Glob
- Bash
- WebFetch
- Write
---

# Brand Mention Scanner Skill

## Core Insight

Brand mentions correlate approximately 3x more strongly with AI visibility than traditional backlinks. An Ahrefs study published in December 2025, analyzing 75,000 brands across AI search platforms, found that **unlinked brand mentions** -- references to a brand name without a hyperlink -- are a stronger predictor of whether AI systems cite and recommend a brand than Domain Rating or backlink count.

The critical finding: **the platform where the mention appears matters enormously.** Not all mentions are equal. A mention on YouTube or Reddit carries far more weight for AI citation than a mention on a low-authority blog, because AI training data and retrieval systems disproportionately index high-engagement platforms.

This inverts a core assumption of traditional SEO. In traditional SEO, a backlink from a high-DR site is the gold standard. In GEO, an unlinked mention on Reddit or a YouTube video description may be more valuable than a dofollow backlink from a DR 70 blog.

---


## Contents

- [Platform Importance Ranking for AI Citations](references/details.md)
- [Composite Brand Authority Score](references/details.md)
- [Analysis Procedure](references/details.md)
- [Output Format](references/details.md)
- [Brand Authority Score: [X]/100 ([Rating])](references/details.md)
- [Platform Detail](references/details.md)
- [Recommendations](references/details.md)
- [Competitive Context](references/details.md)
- [Key Takeaway](references/details.md)
- [Reference Data](references/details.md)

## When to Use

- You need a Generative Engine Optimization task for a website: audit, citability, crawlers, schema, llms.txt, content, platform tuning, or client reporting.
- Run read-only analysis first; propose site changes before making any.

## Limitations

- Audits are read-only analysis; never publish, deploy, or modify the target site without explicit approval.
- Scores and citation likelihoods are heuristics, not guarantees from AI search platforms.
- Docs-only import: upstream scripts, agents, hooks, and schema templates are not bundled.

### Example

```bash
curl -s https://example.com/robots.txt
curl -s https://example.com/llms.txt
```

> Adapted from [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: upstream runtime helpers not bundled.
