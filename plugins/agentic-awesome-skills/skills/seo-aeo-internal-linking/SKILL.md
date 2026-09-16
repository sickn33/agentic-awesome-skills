---
name: seo-aeo-internal-linking
description: "Maps internal link opportunities between pages with relevant anchor text, placement instructions, orphan-page detection, and cannibalisation checks."
risk: safe
source: community
date_added: "2026-04-01"
---

# Internal Linking Skill

## Description
Activate this skill when the user wants to build, audit, or optimise
the internal link structure across a set of pages or a full site.
Trigger phrases include: "internal linking strategy", "find internal
link opportunities", "link these pages together", "internal link map",
"suggest anchor text", "fix orphan pages", "internal links for
[page or topic]", "link equity distribution".

---

## Input Format
```json
{
  "pages": [
    {
      "title": "string — page or post title",
      "url": "string — URL if published, leave blank if not yet live",
      "primary_keyword": "string — the keyword this page targets",
      "page_type": "pillar | cluster-article | landing-page |
                    blog-post | product-page",
      "content_summary": "string — 1-2 sentences describing the page"
    }
  ],
  "focus_page": "string — title of the page you most want to
                  boost with incoming links",
  "cluster_context": "string — optional, paste content cluster
                       output to inform link map",
  "product_pages": ["string — product, signup, pricing, or demo pages that should receive relevant CTAs"],
  "audit_findings": "string — optional orphan, cannibalization, or priority findings"
}
```

For a foundational content system, ensure every article has a contextual path to a relevant product, signup, pricing, demo, or next-step page. Do not add the same CTA or exact-match anchor mechanically to every article; match the destination to the reader’s intent.

---

## Link Type Definitions

This skill recognises four distinct link types.
Every suggestion must be labelled with one:

| Link Type               | Direction                          | SEO Purpose                                 |
|-------------------------|------------------------------------|---------------------------------------------|
| Pillar → Cluster        | Pillar page links to cluster post  | Distributes authority downward              |
| Cluster → Pillar        | Cluster post links back to pillar  | Consolidates authority upward — highest priority |
| Cluster → Cluster       | Cluster post links to related post | Builds semantic depth across the topic      |
| Contextual Boost        | Any page → focus page              | Concentrates link equity on target page     |

**Rule:** Every cluster article must have at least one
Cluster → Pillar link. No exceptions.

---

## Anchor Text Rules

Anchor text is critical. Follow these rules on every suggestion:

| Rule                                     | Limit                              |
|------------------------------------------|------------------------------------|
| Exact match anchor (keyword as-is)       | Max 1 per target page across site  |
| Partial match anchor (keyword + words)   | Max 2 per target page across site  |
| Branded anchor (site or product name)    | Unlimited                          |
| Generic anchor ("click here", "read more")| Never use — flag as error          |
| Naked URL as anchor                      | Avoid unless no alternative        |

If the skill detects the same exact-match anchor being used
more than once for the same target page, flag it as a
**Cannibalization Risk** in the output.

---

## Output Structure

The skill must always produce output in this exact format:
```markdown
# Internal Linking Report

## Summary

| Metric                          | Value      |
|---------------------------------|------------|
| Total Pages Analysed            | [n]        |
| Total Link Opportunities Found  | [n]        |
| Orphan Pages Detected           | [n]        |
| Cannibalization Risks           | [n]        |
| Focus Page Incoming Links       | [n]        |
| Pages Exceeding Link Limit      | [n]        |

---

## Orphan Page Alert

Pages with no incoming internal links — these are invisible
to search engines and must be linked immediately:

| Page Title                  | URL                  | Fix                              |
|-----------------------------|----------------------|----------------------------------|
| [title]                     | [url or "unpublished"]| Link from [suggested source page]|

---

## Link Opportunities

Listed in priority order — highest impact first.

---

### 🔴 High Priority — Do These First

**Link [n]**
| Field              | Value                                             |
|--------------------|---------------------------------------------------|
| Link Type          | [Cluster → Pillar / Pillar → Cluster / etc]       |
| Source Page        | [title]                                           |
| Target Page        | [title]                                           |
| Anchor Text        | [suggested anchor text]                           |
| Anchor Type        | Partial match / Exact match / Branded             |
| Placement          | [Where in the source page — intro / body / CTA]   |
| Context Sentence   | "[Write the sentence the anchor should appear in, |
|                    |  with anchor text in brackets like [this]]"       |
| Impact             | [Why this link matters for SEO or AEO]            |

---

**Link [n]**
[same format]

---

### 🟡 Medium Priority — Do These Second

**Link [n]**
[same format]

---

### 🟢 Low Priority — Polish Round

**Link [n]**
[same format]

---

## Cannibalization Risks

Anchor text conflicts that could confuse search engines:

| Anchor Text Used    | Used On              | Points To            | Fix                        |
|---------------------|----------------------|----------------------|----------------------------|
| [anchor]            | [source page title]  | [target page title]  | [alternative anchor text]  |

If none detected: ✅ No cannibalization risks found.

---

## Link Equity Map

Visual representation of how authority flows across the content:

[Focus Page / Pillar: {page title}]
    ↑ receives links from:
    ├── [Cluster Article 1] — anchor: [text]
    ├── [Cluster Article 2] — anchor: [text]
    └── [Cluster Article 3] — anchor: [text]

    ↓ sends links to:
    ├── [Cluster Article 1] — anchor: [text]
    └── [Cluster Article 2] — anchor: [text]

Cross-links between cluster articles:
    [Article 1] ↔ [Article 3] — anchor: [text]
    [Article 2] → [Article 4] — anchor: [text]

---

## Links Per Page Check

| Page Title          | Incoming Links | Outgoing Links | Status                          |
|---------------------|----------------|----------------|---------------------------------|
| [title]             | [n]            | [n]            | ✅ Healthy / ⚠️ Too many outgoing|

**Rule:** No page should have more than 100 outgoing internal links.
**Rule:** Focus page should have the highest incoming link count.

---

## Action Checklist

- [ ] All orphan pages have been linked
- [ ] Every cluster article has a Cluster → Pillar link
- [ ] No exact-match anchor used more than once per target
- [ ] No generic anchors ("click here", "read more") present
- [ ] Focus page has the highest incoming link count
- [ ] No page exceeds 100 outgoing internal links
- [ ] Cannibalization risks resolved
```

---

## Execution Steps

1. Read `cluster_context` if provided — use it to understand
   the pillar/cluster relationships before mapping any links
2. Index all pages by `page_type` — pillar pages should receive
   the most incoming links by default
3. Run orphan detection — flag any page with zero incoming
   links from other pages in the input set
4. Build semantic overlap matrix — match pages by
   `primary_keyword` similarity and `content_summary`
   to identify natural linking opportunities
5. Assign each opportunity a link type from the
   Link Type Definitions table
6. Write a context sentence for every suggestion —
   the sentence should flow naturally and make the anchor
   text feel editorially placed, not forced
7. Check anchor text across all suggestions — flag any
   exact-match anchor used more than once for the same
   target page as a Cannibalization Risk
8. Sort all opportunities into High, Medium, and Low
   priority tiers based on link type and focus page impact
9. Build the Link Equity Map showing authority flow
10. Run the Links Per Page check — flag any page
    exceeding 100 outgoing links
11. Check product-page paths separately — confirm each
    foundational article has at least one relevant conversion route
12. Verify the map against the actual page inventory and links. If the project already provides a semantic-link helper, use it as a supplementary check; otherwise complete the checks manually and record the evidence used.

---

## Connected Skills
- Receives output from: `seo-aeo-content-cluster`,
  `seo-aeo-content-quality-auditor`
- Feeds output to: `seo-aeo-schema-generator`

## When to Use

Use when mapping links between existing pages, identifying orphaned content, or improving conversion paths from informational pages.

## Limitations

- Recommendations depend on the completeness and accuracy of the supplied page inventory and cannot replace a live crawl.
