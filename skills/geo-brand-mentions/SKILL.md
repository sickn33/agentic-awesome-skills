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

[Ahrefs' December 2025 observational study](https://ahrefs.com/blog/ai-brand-visibility-correlations/)
examined 75,000 brands across ChatGPT, AI Mode and AI Overviews. It reported a
roughly 0.737 correlation for YouTube mentions and 0.66–0.71 for branded web
mentions. These are associations with brand visibility, not evidence that
buying mentions causes citations or that an unlinked mention is worth three
backlinks. The study does not establish universal Reddit/Wikipedia/LinkedIn
weights, undisclosed model training composition, or a site's probability of
being recommended. Use the rubric as an explicit planning heuristic and measure
actual answers separately.
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

## Sampling, scoring and publication boundaries

Record query, platform, locale, date, result URLs and sampled denominator. Search snippets and result-count estimates cannot establish all mentions, absence or sentiment prevalence. Mark inaccessible or unmeasured channels unknown instead of zero; do not silently renormalize weights or compare scores produced under different coverage. The five platform weights and subscriber thresholds are custom and unvalidated. Separate observed brand mentions from source citations, positive recommendations and company-name collisions. Do not create reviews, undisclosed endorsements, spam, paid-link schemes or promotional Wikipedia edits to increase the score. A report-writing request does not authorize posts or outreach, and report output must not overwrite an existing file.
