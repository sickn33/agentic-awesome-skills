---
name: pagespeed-enhancer
description: "Scan, audit, and fix web performance issues across all four Lighthouse/PageSpeed Insights pillars — Performance, Accessibility, Best Practices, and SEO — in structured batches."
risk: safe
source: personal
date_added: "2026-06-14"
author: WHOISABHISHEKADHIKARI
---

# PageSpeed Enhancer Skill

A structured, batch-wise audit-and-fix workflow for all four Lighthouse pillars. Always follow the batch flow in order. Never jump straight to fixes without completing the scan and risk assessment phases.

---

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- User pastes a PageSpeed Insights report or mentions Lighthouse scores
- User asks to improve Core Web Vitals (LCP, FCP, CLS, TBT, SI)
- User needs help with render-blocking resources, unused JavaScript, image optimisation, security headers, ARIA compliance, or SEO meta-tag fixes
- User asks "why is my LCP slow", "fix accessibility issues", "improve my SEO score", or "my site scores 80 on performance"
- Any mention of PageSpeed, Lighthouse, Web Vitals, or site speed

---

## Examples

### Example 1: User pastes a PageSpeed report

**User:** "My site scores 65 on Performance. LCP is 4.2s."

**Agent:**
1. Parses the score summary table — identifies LCP as critical bottleneck
2. Runs Batch A scan — finds lazy-loaded hero image and render-blocking CSS
3. Outputs risk report: F1.1 (CSS @import → link) ranked P1, F1.5 (LCP image eager) ranked P1
4. Applies Fix Batch 1, verifies with re-test

### Example 2: User asks about slow LCP

**User:** "Why is my LCP slow?"

**Agent:**
1. Asks for a PageSpeed report URL or pasted results
2. Runs LCP-specific audit from Batch A — checks TTFB, element render delay, lazy loading
3. Identifies the LCP element, its current loading strategy, and the critical path chain
4. Recommends targeted fix (preload, eager loading, or server response time improvement)

---

## Limitations

- Does not run actual Lighthouse or PageSpeed tests — the user must provide the report or URL
- Security header recommendations assume the user controls the deployment platform (Netlify, Vercel, etc.)
- Fixes are general patterns; exact file paths and config syntax may vary by project setup
- Does not cover server-level optimisations (CDN config, PHP opcode caching, database queries, etc.)
- Image conversion commands assume the user has the required tools installed (cwebp, sharp, Pillow)
- CSP guidance uses a report-only iterative approach — the final policy must be tuned to each project's actual resource origins

---
