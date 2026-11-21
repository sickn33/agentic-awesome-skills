---
name: "blitz-seo"
description: "Plan a 30-day SEO sprint for one existing commercial page with search-intent checks, relevant internal links, first-hand evidence and change tracking."
category: "marketing"
risk: "safe"
source: "https://github.com/Illyism/seo-skills"
source_repo: "Illyism/seo-skills"
source_type: "community"
license: "MIT"
license_source: "https://github.com/Illyism/seo-skills/blob/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/README.md#license"
author: "Ilias Ism"
upstream_commit: "a158c36a1c2c84a44ee7a1ae69c009caf73e1a35"
date_added: "2026-11-21"
---

# Blitz SEO: a 30-day sprint to rank one page

Put 30 days of effort into ranking one page for one money keyword (3 at most). Most SEO work is spread across too many pages. Use the site’s own rankings and conversion data to choose the page and set a baseline.

## Initial assessment

**Check for project context first:** if `.cursor/project-context.md` or `.claude/project-context.md` exists, read it for product, audience, and current rankings. Otherwise identify:

1. **Money keyword candidates**: high-intent, high-volume keywords tied to the core offering. Not blog keywords, not long-tails.
2. **Current position**: a page stuck at position 5-20 is the ideal Blitz target (already indexed, needs pressure).
3. **Revenue link**: would ranking top 3 for this keyword directly produce signups or sales?
4. **Available resources**: backlink budget, existing blog posts for internal links, social accounts for signals.

**The target test:** your Blitz keyword should be something that _hurts to lose_ to competitors.

## The sprint

### Step 1: Pick one keyword that matters

- High intent, tied to the core offering, with real revenue behind it
- Check the SERP: if competitors with weaker products outrank the user, that is the target
- Limit to 1 keyword (3 absolute max). Saying no to everything else is the strategy.

### Step 2: Choose one page to win with

Rewrite and optimize a single page to own that keyword:

- Tight H1 with the keyword
- Keyword in title tag, URL, and meta description
- Relevant subtopics in subheadings
- Fast load speed, mobile-optimized
- Visual trust: screenshots, logos, charts, testimonials
- Make it the hero of the domain: link to it from the homepage and main nav if possible

### Step 3: The daily optimization ritual (30 days)

Every day:

- [ ] Add internal links from older posts/pages to the target page
- [ ] Review outreach opportunities that make sense for readers. Prepare drafts for approved prospects.
- [ ] Queue an on-page change only when the baseline and search intent support it.
- [ ] Check indexing after material changes. Avoid repeated submissions.
- [ ] Record relevant distribution opportunities for the user to review.
- [ ] Log every change and the daily rank position

Do not overthink any single change. Iterate fast, observe, adjust.

## Output

When the user invokes this skill, produce a concrete sprint plan:

1. Recommended target keyword (with reasoning) and target page
2. On-page rewrite checklist specific to that page
3. A 30-day calendar with the daily ritual filled in
4. A simple tracking log format (date, change made, position, notes)
5. Baseline and review checkpoints using the same market, query group, and measurement window

## When to Use

Use Blitz SEO when:

- Stuck on page 2 for a keyword that brings revenue
- Launching something new that needs one page to win fast
- Weaker competitors outrank the user

Do not use it for brand-new domains with zero authority, or for keywords with no revenue attached.

## Example

A pricing page averages position 14 for a high-intent query. In week 1, record the baseline and align the title and content with the query. In week 2, add relevant links from existing guides. In week 3, verify first-hand proof and draft partner outreach. In week 4, compare clicks, conversions and rank with the baseline and record which changes actually shipped.

## Limitations

A 30-day interval is a planning horizon. Rankings and revenue are uncertain and movement cannot be attributed to a single edit. Confirm scope before changing a live page, buying services, contacting prospects or posting publicly. Avoid paid links intended to manipulate rankings.

Adapted from [Ilias Ism’s upstream skill](https://github.com/Illyism/seo-skills/tree/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/seo/blitz-seo).
