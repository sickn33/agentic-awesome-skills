---
name: tools-page-seo-optimizer
description: "Framework-agnostic SEO workflow for any site with multiple tool, product, or feature pages. Covers duplicate content, unique meta tags, heading hierarchy, internal linking, URL slugs, E-E-A-T, content registry pattern for scaling 50–500 pages, and blog content strategy for position 50–68 keywords."
category: seo
risk: safe
source: community
source_type: community
author: whoisabhishekadhikari
date_added: "2026-06-19"
tags: [seo, tools-pages, product-pages, duplicate-content, content-registry, meta-tags, internal-linking, url-slugs, e-e-a-t, framework-agnostic]
tools: [claude-code, cursor, codex-cli, gemini-cli, opencode]
version: 1.0.0
---

# Tools Page SEO Optimizer

You are an expert in technical SEO and content strategy for sites with large collections of tool, product, or feature pages. Your workflow is framework-agnostic — applies to Django, Rails, Laravel, Express, Next.js, Nuxt, Astro, WordPress, and static HTML.

Derived from a real audit that found 93 of 105 tool pages sharing identical template prose and ranking at average position 68. This skill is the playbook that fixes it.

---

## Quick-Start Decision Tree

```
Full audit from scratch?              → Run all phases in order
All tool pages rank the same?         → Phase 2 (Content Registry) first
Meta titles/descriptions all generic? → Phase 1 (Meta Tags)
Tool pages buried / hard to navigate? → Phase 5 (Internal Linking)
Bad URL slugs?                        → Phase 6 (URL Slug Hygiene)
Site looks authorless to Google?      → Phase 7 (E-E-A-T)
Stuck at position 50–68 on keywords?  → Phase 9 (Blog Content Strategy)
Fixes deployed but unsure they're live? → Phase 10 (Live Verification)
```

---

## Phase 0 — Codebase Reconnaissance

**Before writing any code**, locate these in the codebase. Names vary by framework — adapt.

| What to find | Common locations |
|---|---|
| URL routing | `routes.rb`, `urls.py`, `routes/`, `pages/`, `app/` |
| Head / meta template | `_head.html`, `layout.js`, `base.html`, `app.blade.php` |
| Tool/page registry | config file, database seed, JSON, `lib/guides.js`, `data/tools.js` |

**Answer these before writing a single line:**

1. How are tool pages generated — static files, database loop, config registry, CMS?
2. Where is the shared template that renders `<title>`, `<meta name="description">`, `<h1>`?
3. Does each tool have its own content fields, or does every tool fall back to the same template prose?
4. Is there a central list of all tool slugs you can iterate over programmatically?

---

## Phase 1 — Meta Titles & Descriptions

### The core problem

Every tool page sharing the same `<title>` template with only the tool name swapped in
is the single most common reason tool sites rank poorly. Google treats near-identical titles
as duplicate pages and demotes all of them.

### Title tag formula

```
{Tool Name} | {Specific Outcome} — {Brand}
```

| ✅ Good | ❌ Bad |
|---|---|
| `Meta Tag Generator \| Create Perfect SEO Titles Free — MySite` | `Meta Tag Generator - MySite Tools` |
| `Broken Link Finder \| Scan Any Page for Dead URLs — MySite` | `Broken Link Finder - Free Online Tool \| MySite` |

**Rules:**
- ≤ 60 characters total
- Primary keyword in the first 40 characters
- Every tool has a **unique** title — no two tools share the same one
- Include "Free" where accurate — measurably improves CTR

### Meta description formula

```
{What it does — one action sentence}. {Key differentiator}. {CTA}.
```

Example: `Scan any webpage for broken links in seconds. Checks internal and external URLs,
exports results as CSV. Free, no account needed.`

**Rules:**
- 120–160 characters
- Action verbs: Generate, Scan, Check, Analyze, Convert, Build, Find
- Every tool gets a **custom** description — zero template filler

### Implementation (any framework)

```html
<!-- Generic template pattern -->
<title>{{ tool.meta_title | default(tool.name + " | " + site_name) }}</title>
<meta name="description" content="{{ tool.meta_description | default(tool.tagline) }}">
```

### Validation script — run before every deploy

```python
# validate_meta.py
import json, sys

tools = json.load(open('data/tools.json'))
errors = []

for t in tools:
    slug  = t.get('slug', '?')
    title = t.get('meta_title', '')
    desc  = t.get('meta_description', '')
    if not title:          errors.append(f"MISSING TITLE: {slug}")
    elif len(title) > 60:  errors.append(f"TITLE TOO LONG ({len(title)}): {slug}")
    if not desc:           errors.append(f"MISSING DESC: {slug}")
    elif len(desc) < 120:  errors.append(f"DESC TOO SHORT ({len(desc)}): {slug}")
    elif len(desc) > 160:  errors.append(f"DESC TOO LONG ({len(desc)}): {slug}")

if errors:
    print('\n'.join(errors)); sys.exit(1)
print(f"✅ All {len(tools)} tools passed meta validation")
```

---

## Phase 2 — Content Registry (The Highest-Leverage Fix)

**Root cause of poor rankings on tool sites:** 80–95% of tool pages share identical
template prose. Google sees them as thin, near-duplicate pages and ranks none well.
Fix this before anything else.

### Diagnosis

```bash
# Find shared prose in your templates — if these strings appear in a shared template
# file, you have the problem
D1=$(grep -rn "powerful tool that helps" templates/ src/ 2>/dev/null | head -5)
[ -n "$D1" ] && echo "  ✗ Shared template prose found" || echo "  ✓ No shared prose"
D2=$(grep -rn "easy to use" templates/ src/ 2>/dev/null | head -5)
[ -n "$D2" ] && echo "  ✗ Template filler found"
```

### Registry entry structure (framework-agnostic)

```yaml
# data/tools/meta-tag-generator.yaml  (or JSON, DB columns, JS object — adapt to your stack)
slug: meta-tag-generator
name: Meta Tag Generator
meta_title: "Meta Tag Generator | Create Perfect SEO Titles & Descriptions Free"
meta_description: "Generate optimized title tags and meta descriptions with live character
  counters. Enforces Google's 60/160 char limits. Instant, free, no account needed."

introduction: >
  The meta tag generator creates the two most critical on-page SEO elements —
  your title tag and meta description — with live character counters that enforce
  Google's recommended limits before you publish. [80+ unique words minimum]

best_practices:
  - "Include your primary keyword within the first 40 characters of the title"
  - "Write a unique description per page — duplicate descriptions waste crawl budget"
  - "Use action verbs in descriptions: Generate, Find, Check, Analyze"

how_to_steps:
  - name: "Enter your page details"
    text: "Type your target keyword, page topic, and a brief summary of the content"
  - name: "Check the live character counters"
    text: "Keep title ≤60 chars and description ≤160 chars"
  - name: "Copy and paste the output"
    text: "Paste the generated tags into your HTML <head> section"

faqs:
  - q: "Does Google always use my meta description?"
    a: "No — Google rewrites descriptions ~63% of the time. Write them anyway for
       social shares and some SERPs."
  - q: "What happens if my title is over 60 characters?"
    a: "Google truncates it with an ellipsis, cutting off your message mid-sentence."

related_tools:
  - og-tag-generator
  - schema-markup-generator
  - heading-analyzer
```

### Minimum viable unique content per tool

| Field | Minimum | Priority |
|---|---|---|
| `meta_title` | Unique, ≤60 chars | 🔴 Critical |
| `meta_description` | Unique, 120–160 chars | 🔴 Critical |
| `introduction` | 80+ unique words | 🔴 Critical |
| `best_practices` | 3–5 tool-specific items | 🟡 High |
| `how_to_steps` | 3 real steps for THIS tool | 🟡 High |
| `faqs` | 2 tool-specific Q&As | 🟡 High |
| `related_tools` | 2–4 slug references | 🟢 Medium |

**Rule: complete one tool fully before starting the next.**

---

## Phase 3 — H1 and Heading Hierarchy

### H1 formula

```
{Tool Name} | {Outcome Phrase}
```

**Rules:**
- One `<h1>` per page — only the tool name/title
- Must be unique per page

### Heading hierarchy

```
h1 — Tool name (one per page)
  h2 — Major sections: "How It Works", "Best Practices", "FAQs", "Related Tools"
    h3 — Subsections: individual FAQ items, feature callouts, step headers
```

Never skip levels. No h1 → h3 without an h2.

```bash
# Audit heading hierarchy on a live page
curl -s "https://yourdomain.com/tools/meta-tag-generator" \
  | grep -oE '<h[1-6][^>]*>.*?</h[1-6]>'
```

---

## Phase 4 — Accessibility

Accessibility failures lower Core Web Vitals scores — a direct ranking signal.

Every icon-only interactive element needs `aria-label`:

```html
<button aria-label="Copy to clipboard"><svg>...</svg></button>
<button aria-label="Go to next page">›</button>
<input type="search" aria-label="Search tools" placeholder="Search...">
```

```bash
# Find icon-only buttons missing aria-label
B=$(grep -rn "<button" templates/ 2>/dev/null | grep -v "aria-label" | grep -v ">[A-Za-z]" | head -5)
[ -n "$B" ] && echo "  ⚠ Icon buttons missing aria-label:" && echo "$B" || echo "  ✓ Buttons have aria-labels"
```

---

## Phase 5 — Internal Linking

Internal links between tools are how PageRank flows through your site. A tool with no
inbound internal links is effectively invisible to Google even with great content.

### Hub-and-Spoke model

```
Homepage
  └── Category: Keyword Tools
        ├── Keyword Density Checker  ←→  Keyword Suggestion Tool
        └── SERP Preview Tool        ←→  Meta Tag Generator
  └── Category: Technical SEO
        ├── XML Sitemap Visualizer   ←→  Robots.txt Creator
        └── Robots.txt Creator       ←→  Redirect Generator
```

### Rules

- Every tool links **to** at least 2 related tools (use `related_tools` from registry)
- Every tool is linked **from** at least 2 other tools or category pages
- No orphan tools — every tool reachable within 3 clicks from homepage

```bash
# Orphan detection — tools with too few inbound references
for slug in $(cat data/slugs.txt 2>/dev/null); do
  C=$(grep -rl "$slug" templates/ 2>/dev/null | wc -l | tr -d ' ')
  [ "$C" -lt 2 ] && echo "  ORPHAN RISK: $slug ($C refs)"
done
```

### Template implementation

```html
{% if tool.related_tools %}
<section>
  <h2>Related Tools</h2>
  {% for slug in tool.related_tools %}
  {% set rel = get_tool(slug) %}
  <a href="/tools/{{ slug }}">{{ rel.name }} — {{ rel.tagline }}</a>
  {% endfor %}
</section>
{% endif %}
```

---

## Phase 6 — URL Slug Hygiene

| ✅ Good | ❌ Bad | Problem |
|---|---|---|
| `/tools/meta-tag-generator` | `/tools/tool-1` | No keywords |
| `/tools/keyword-density-checker` | `/tools/free-online-keyword-density-checker-tool-free` | Keyword stuffed |
| `/tools/broken-link-finder` | `/tools/brokenLinkFinder` | camelCase |

**Formula:** `{primary-keyword-phrase}` — lowercase, hyphens, no stop words, no "free" / "online" / "tool" padding.

```bash
# Audit — list longest slugs (likely stuffed)
curl -s "https://yourdomain.com/sitemap.xml" \
  | grep -oE '<loc>[^<]+' | sed 's/<loc>//' \
  | grep "/tools/" \
  | awk -F'/tools/' '{print length($2), $2}' | sort -n | tail -20
```

If renaming a slug, always 301 redirect old → new and update all internal links.

---

## Phase 7 — E-E-A-T Signals

Tool sites rank poorly when they look authorless and dateless.

### Author byline + date (every tool page)

```html
<p class="tool-byline">
  Built by <a href="/about">Your Name</a>
  <time datetime="{{ tool.updated_at }}"> · Updated {{ tool.updated_at | date }}</time>
</p>
```

### Trust pillars section

```html
<section class="trust-pillars">
  <div>✅ <strong>100% Free</strong> — no account, no credit card</div>
  <div>🔒 <strong>Privacy First</strong> — your data never leaves your browser</div>
  <div>⚡ <strong>Instant Results</strong> — processed in under 1 second</div>
</section>
```

### About / author page

Create `/about` with: real name, credentials, why you built the tools, contact info.
Link to it from every tool page byline. This is the single highest-impact E-E-A-T fix
for solo-built tool sites.

---

## Phase 8 — Scaling to 100+ Tools

When the content registry pattern is working for 10–20 tools, the next challenge is
scaling it to 100+ without losing quality or introducing duplicates.

### Batch completion gate

Never commit a partial batch. Before every commit touching tool content:

```bash
# Count tools with introduction content vs total tools
python3 -c "
import json
tools = json.load(open('data/tools.json'))
total   = len(tools)
done    = sum(1 for t in tools if t.get('introduction','').strip())
print(f'{done}/{total} tools have introduction content')
if done < total:
    missing = [t['slug'] for t in tools if not t.get('introduction','').strip()]
    print('Missing:', missing)
"
```

Only commit when the count is **100% complete**. A partial batch (e.g. 93/105) means
12 tools still have thin template prose — enough for Google to flag the site as inconsistent.

### Batch writing order

Prioritise tools in this order:
1. Tools already receiving impressions in Google Search Console (low-hanging fruit)
2. Tools in your most-linked categories (PageRank concentration)
3. Remaining tools alphabetically

### Build verification before commit

```bash
# Confirm build compiles cleanly after batch content additions
npm run build        # Next.js / Nuxt
python manage.py check  # Django
rails assets:precompile  # Rails
# Zero errors = safe to commit
```

---

## Phase 9 — Blog Content Strategy (Position 50–68 Keywords)

Tool pages rank well for transactional keywords ("meta tag generator", "check broken links").
But informational keywords ("how to write meta descriptions", "what is keyword density") sit
at position 50–68 — too deep to get clicks — because tool pages aren't the right content
format for them. Blog posts are.

### Diagnosis: find your 50–68 keywords

In Google Search Console → Search Results → filter by Position > 49 AND Position < 69.
These are queries where you have enough authority to rank but the wrong page type is ranking.

### Blog post targeting formula

```
Post title: {Informational keyword} — {Year} Guide
Target keyword: the exact query from GSC
Content length: 1,000–1,500 words
Internal links: link to 2–3 relevant tools from within the post body
```

Example mapping:

| GSC keyword (pos 50–68) | Blog post title | Tool to link |
|---|---|---|
| "how to write meta descriptions" | "How to Write Meta Descriptions That Get Clicks (2025)" | meta-tag-generator |
| "what is keyword density" | "Keyword Density: What It Is and How to Check It" | keyword-density-checker |
| "how to find broken links" | "How to Find and Fix Broken Links on Any Website" | broken-link-finder |
| "xml sitemap best practices" | "XML Sitemap Best Practices for 2025" | xml-sitemap-visualizer |

### Blog post structure (SEO-optimised)

```
H1: {Target keyword} — the exact GSC query, naturally phrased
Intro (100 words): answer the question directly in the first paragraph
  H2: What is {topic}?
  H2: Why it matters for SEO
  H2: How to {action} — step by step
    H3: Step 1
    H3: Step 2
    H3: Step 3
  H2: Common mistakes
  H2: {Tool name} — try it free   ← internal link to your tool
Conclusion: summarise + CTA to the tool
```

### Blog post meta requirements

- `meta_title`: include year where relevant ("2025") — improves CTR on informational queries
- `meta_description`: answer the question in one sentence + "Free tool included"
- `canonical`: must point to the exact blog URL
- `datePublished` + `dateModified` in schema — critical for freshness signals

### Internal link rule for blog posts

Every blog post must contain at least **2 contextual inline links** to relevant tools,
not just a "Related Tools" sidebar. Inline links within body copy pass significantly
more PageRank than sidebar links.

```html
<!-- Good — inline contextual link -->
<p>Use our <a href="/tools/meta-tag-generator">meta tag generator</a> to preview
how your title and description appear in Google results before publishing.</p>

<!-- Weak — sidebar only, no body link -->
<aside>Related: Meta Tag Generator</aside>
```

---

## Phase 10 — Live Deployment Verification

A fix that compiles cleanly can still fail in production. After every push, verify
the live site — not just the build.

```bash
seo:verify() {
  local D="$1"; local F=0
  for p in "/" "/tools/meta-tag-generator" "/blog" "/category" "/privacy" "/terms"; do
    local C=$(curl -so /dev/null -w "%{http_code}" "$D$p")
    echo "$C $p"; [ "$C" = "200" ] || ((F++))
  done
  local C=$(curl -so /dev/null -w "%{http_code}" "$D/tools/this-slug-does-not-exist-xyz")
  echo "Soft 404 check: $C (expect 404)"; [ "$C" = "404" ] || { echo "  ✗ Soft 404"; ((F++)); }
  curl -s "$D/tools/meta-tag-generator" | grep -qi "canonical" && echo "  ✓ Canonical present" || { echo "  ✗ Canonical missing"; ((F++)); }
  local C2=$(curl -so /dev/null -w "%{http_code}" "$D/favicon.ico")
  echo "Favicon: $C2 (expect 200)"; [ "$C2" = "200" ] || { echo "  ✗ Favicon missing"; ((F++)); }
  local J=$(curl -s "$D/tools/meta-tag-generator" | grep -c "application/ld+json" || true)
  [ "$J" -ge 1 ] && echo "  ✓ Schema: $J blocks" || { echo "  ✗ No schema found"; ((F++)); }
  return $F
}
```

### Expected results

| Check | Expected |
|---|---|
| All key pages | 200 |
| Invalid tool slug | 404 |
| `<link rel="canonical">` present | Yes |
| `/favicon.ico` | 200 |
| `application/ld+json` blocks | ≥ 1 per tool page |

If any check fails — **do not move on**. Diagnose and fix before the next phase.

---

## Phase 11 — Pre-Commit Validation

```bash
seo:validate() {
  python3 validate_meta.py || return 1
  python3 -c "
import json
from collections import Counter
tools = json.load(open('data/tools.json', 'r'))
titles = [t.get('meta_title', '') for t in tools]
dups = [t for t, c in Counter(titles).items() if c > 1 and t]
print(dups) if dups else print('All titles unique')
"
  python3 -c "
import json
tools = json.load(open('data/tools.json', 'r'))
missing = [t['slug'] for t in tools if not t.get('introduction', '').strip()]
print(f'Missing intro ({len(missing)}):', missing[:10])
"
}
```

---

## Consolidated Runners

```bash
# Quick check — meta validation + live site verification
seo:quick() { seo:verify "$PROD_URL" && seo:validate; }
# Full check — quick + duplicate title check
seo:full()  { seo:quick; }
```

---

## Master Issue Control Table

| # | Issue | Severity | Phase |
|---|---|---|---|
| 1 | Duplicate / template prose across tool pages | 🔴 Critical | 2 |
| 2 | Missing or generic meta titles | 🔴 Critical | 1 |
| 3 | Missing or generic meta descriptions | 🔴 Critical | 1 |
| 4 | H1 shared across all tools | 🔴 Critical | 3 |
| 5 | Orphan tool pages (no inbound internal links) | 🟡 High | 5 |
| 6 | Missing related tool links | 🟡 High | 5 |
| 7 | Keyword-stuffed or keywordless URL slugs | 🟡 High | 6 |
| 8 | No author byline or last-updated date | 🟡 High | 7 |
| 9 | Heading hierarchy violations | 🟢 Medium | 3 |
| 10 | Missing aria-labels on icon buttons | 🟢 Medium | 4 |

---

## Best Practices

| ✅ Do | ❌ Don't |
|-------|----------|
| Write unique meta title + description per tool | Use template prose shared across 80+ pages |
| Complete one tool's content fully before next | Batch-write partial entries across many tools |
| Link 2+ related tools from every tool page | Leave orphan tools with zero internal links |
| Use `{primary-keyword}` in URL slug | Pad slugs with "free" / "online" / "tool" |
| Add author byline + date to every tool page | Show authorless, dateless content |
| Blog about informational keywords (pos 50–68) | Rely on tool pages to rank for "how to" queries |
| 301 redirect old slugs when renaming | Delete old slugs without redirects |

---

## Key Principles

1. **Duplicate content first, always.** Identical template prose across 80+ pages is the
   root cause on almost every underperforming tool site. No other fix matters until this is done.

2. **Complete one tool fully before the next.** Never write partial entries across many tools.
   A half-written registry entry is worse than no entry — it signals thin content at scale.

3. **Internal links are PageRank distribution.** A tool with great content but zero inbound
   internal links is invisible to Google. Every tool needs at least 2 inbound links.

4. **URL slugs are permanent.** A clean slug outperforms a stuffed one from day one.
   Get them right before indexing — renaming later costs ranking momentum even with 301s.

5. **E-E-A-T is not decoration.** Authorless, dateless tool pages trigger quality rater
   guidelines as potential spam. A real name and a real date is the minimum baseline.

6. **Validate before every commit.** Catching a missing description before deploy is free.
   Fixing it after indexing costs weeks.

---

## Related Skills

- [schema-markup-generator](/skills/schema-markup-generator/SKILL.md) — JSON-LD structured data (HowTo, FAQPage, WebApplication) for tool pages
- [social-metadata-hardening](/skills/social-metadata-hardening/SKILL.md) — OG tags and social sharing previews for tool pages
- [indexing-issue-auditor](/skills/indexing-issue-auditor/SKILL.md) — full crawl audit and redirect mapping after slug changes
- [pagespeed-enhancer](/skills/pagespeed-enhancer/SKILL.md) — Lighthouse / Core Web Vitals audit for tool pages
- [wordpress-centric-high-seo-optimized-blogwriting-skill](/skills/wordpress-centric-high-seo-optimized-blogwriting-skill/SKILL.md) — blog post writing with SEO structure
- [vibecode-production-qa-validator](/skills/vibecode-production-qa-validator/SKILL.md) — end-to-end production QA including deployment verification

---

## When to Use

This skill is applicable to execute the workflow or actions described in the overview.
Use it whenever the user mentions poor rankings, tools not getting indexed, all tool pages ranking the same, duplicate content warnings, "how do I make each tool page unique", thin content, or Google not ranking tool pages.

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
- Content registry assumes a structured data source (JSON, YAML, DB) — static HTML tool pages will need a migration step first.
- Technical SEO factors (page speed, Core Web Vitals, render blocking) are delegated to the pagespeed-enhancer skill.
