---
name: geo-technical
description: Technical SEO audit with GEO-specific checks — crawlability, indexability,
  security, performance, SSR, and AI crawler access
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
version: 1.0.0
author: geo-seo-claude
tags:
- geo
- technical-seo
- core-web-vitals
- ssr
- crawlability
- security
- performance
allowed-tools: Read, Grep, Glob, Bash, WebFetch, Write
---

# GEO Technical SEO Audit

## Purpose

Technical SEO forms the foundation of both traditional search visibility and AI search citation. A technically broken site cannot be crawled, indexed, or cited by any platform. This skill audits 8 categories of technical health with specific attention to GEO requirements — most critically, **server-side rendering** (AI crawlers do not execute JavaScript) and **AI crawler access** (many sites inadvertently block AI crawlers in robots.txt).


## Contents

- [How to Use This Skill](references/details.md)
- [Category 1: Crawlability (15 points)](references/details.md)
- [Category 2: Indexability (12 points)](references/details.md)
- [Category 3: Security (10 points)](references/details.md)
- [Category 4: URL Structure (8 points)](references/details.md)
- [Category 5: Mobile Optimization (10 points)](references/details.md)
- [Category 6: Core Web Vitals (15 points)](references/details.md)
- [Category 7: Server-Side Rendering (15 points) — CRITICAL FOR GEO](references/details.md)
- [Category 8: Page Speed & Server Performance (15 points)](references/details.md)
- [Category 9: Agent-Readiness Signals (non-scoring)](references/details.md)
- [IndexNow Protocol](references/details.md)
- [Overall Scoring](references/details.md)
- [Output Format](references/details.md)
- [Technical Score: XX/100](references/details.md)
- [Score Breakdown](references/details.md)
- [AI Crawler Access](references/details.md)
- [Critical Issues (fix immediately)](references/details.md)
- [Warnings (fix this month)](references/details.md)
- [Recommendations (optimize this quarter)](references/details.md)
- [Agent-Readiness Signals (non-scoring)](references/details.md)
- [Detailed Findings](references/details.md)

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
