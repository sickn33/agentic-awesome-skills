---
name: seo-aeo-meta-description-generator
description: "Writes title tags, meta descriptions, Open Graph tags, and Twitter Card tags aligned to page intent and conversion goals."
risk: safe
source: community
date_added: "2026-04-01"
---

# Meta Description Generator Skill

## Description
Activate this skill when the user wants to write, generate, 
or optimise meta titles, meta descriptions, or social sharing 
tags for any page. Trigger phrases include: "write meta tags", 
"generate a meta description", "meta description for [page]", 
"write title tag", "optimise CTR for", "meta generator", 
"write OG tags", "social sharing tags", "SERP snippet for [page]".

---

## Input Format
````json
{
  "page_title": "string — working title of the page",
  "page_type": "landing-page | blog-post | pillar-page | 
                product-page | homepage | category-page",
  "primary_keyword": "string — the main keyword this page targets",
  "secondary_keywords": ["string"],
  "content_summary": "string — 2–4 sentences describing 
                       what the page covers and who it is for",
  "target_audience": "string — who is searching for this page",
  "cta_intent": "learn | buy | try | compare | download | sign-up",
  "usp": "string — the single strongest differentiator 
          or benefit to lead with",
  "brand_name": "string — optional, include if brand 
                 should appear in title tag"
}
````

---

## CTR Framework

Every meta title and description produced by this skill 
must be built on these CTR mechanics:

### What Drives Clicks

| Signal               | How to Use It                                        |
|----------------------|------------------------------------------------------|
| Keyword match        | Primary keyword first in title — matches search term |
| Benefit lead         | Lead description with outcome, not feature           |
| Power words          | Words that trigger action or curiosity (see list)    |
| Specificity          | Numbers and specifics outperform vague claims        |
| CTA verb             | End description with an action word                  |
| Emotional trigger    | Speak to the feeling behind the search               |
| Urgency / scarcity   | Use only when genuine — never fabricate              |

### Power Word Bank

Use these only where accurate and supported by the supplied page evidence; omit power words rather than inventing guarantees, free offers, rankings, expertise or statistics:

**Curiosity:** Discover, Uncover, Exactly, The Truth About,
               What Nobody Tells You

**Benefit:** Proven, Guaranteed, Free, Instant, 
             Without [pain point]

**Authority:** Complete Guide, Expert, #1, Most Trusted

**Action:** Get, Start, Try, See, Learn, Find Out

**Specificity:** [number] Ways, In [timeframe], 
                 Step-by-Step, [stat]

### What to Never Use

- "Click here" or "Click to learn more" — usually less informative than a specific benefit
- Unnecessary all caps — can reduce readability
- Keyword stuffing — using primary keyword more than once 
  in the meta description
- Duplicate meta descriptions — every page needs unique copy
- Vague openers — "This page is about..." or 
  "We offer..." wastes character space
- Empty brand-centric claims — prefer information useful to the searcher

---

## Character Limits and Behaviour

| Element              | Editorial Target | Planning Threshold | Preview Risk              |
|----------------------|----------------|------------|----------------------------|
| Title Tag            | 50–60 chars    | 60 chars   | Truncated with "..." in SERP|
| Meta Description     | 140–155 chars  | 160 chars  | Truncated mid-sentence     |
| OG Title             | 40–60 chars    | 88 chars   | Truncated in social preview|
| OG Description       | 100–200 chars  | 300 chars  | Truncated in social preview|
| Twitter Title        | 40–60 chars    | 70 chars   | Truncated in card          |
| Twitter Description  | 100–200 chars  | 200 chars  | Truncated in card          |

These are drafting targets, not universal platform limits. [Google documents no fixed meta-description length limit](https://developers.google.com/search/docs/appearance/snippet); displayed snippets depend on device width/query and can be rewritten. Verify current social-card requirements before delivery. Character counts cannot guarantee truncation behavior.

**Rule:** Never deliberately end a meta description mid-sentence.
If approaching the limit, cut a clause rather than 
let it truncate naturally.

---

## Page Type Copy Rules

Adjust tone and structure based on `page_type`:

| Page Type      | Title Format                        | Description Approach                        |
|----------------|-------------------------------------|---------------------------------------------|
| Landing Page   | Keyword + Outcome + Brand           | Benefit lead → USP → CTA                   |
| Blog Post      | Keyword + Curiosity hook            | Question or provocative statement → answer  |
| Pillar Page    | Keyword + "Complete Guide"          | Scope statement → depth signal → CTA       |
| Product Page   | Product Name + Keyword + Brand      | Feature benefit → social proof signal → CTA|
| Homepage       | Brand + Core keyword + Tagline      | Who you are + who you serve + CTA          |
| Category Page  | Category keyword + "Best / Top"     | What's covered → audience signal → CTA     |

---

## Output Structure

The skill must always produce output in this exact format:
````markdown
# Meta Tag Output

**Page:** [page_title]
**Primary Keyword:** [primary_keyword]
**Page Type:** [page_type]

---

## SERP Preview

This is approximately how the page will appear in search results:

┌─────────────────────────────────────────────────────────────┐
│ [Title Tag — displayed in blue]                             │
│ https://yourdomain.com/page-url                             │
│ [Meta Description — displayed in grey below the URL]        │
└─────────────────────────────────────────────────────────────┘

---

## Title Tag Variants

Write 3 variants — compare with a controlled test where feasible; search changes and query mix can confound results:

| #   | Title Tag                          | Chars | Keyword Position | CTR Angle         |
|-----|------------------------------------|-------|------------------|-------------------|
| V1  | [variant 1 — keyword first]        | [n]   | First word       | Benefit-led       |
| V2  | [variant 2 — keyword + power word] | [n]   | First phrase     | Curiosity/urgency |
| V3  | [variant 3 — keyword + brand]      | [n]   | First phrase     | Authority/brand   |

**Recommended:** V[n] — [one sentence reason why 
this variant is the preferred hypothesis for this page type
and audience]

---

## Meta Description Variants

Write 3 variants — compare with a controlled test where feasible; search changes and query mix can confound results:

**V1 — Benefit Lead**
[Description starting with the outcome or benefit. 
Primary keyword in first half. 
Ends with a CTA verb. 140–155 chars.]

Character count: [n]
Power words used: [list]
CTA intent: [learn/buy/try/compare/download/sign-up]

---

**V2 — Question Hook**
[Description opening with a direct question the 
searcher is asking. Answers it partially, 
then drives the click for the full answer. 
Primary keyword present. Ends with CTA. 140–155 chars.]

Character count: [n]
Power words used: [list]
CTA intent: [intent]

---

**V3 — Social Proof / Specificity**
[Description leading with a number, stat, or 
specific claim that signals authority. 
Primary keyword present. Ends with CTA. 140–155 chars.]

Character count: [n]
Power words used: [list]
CTA intent: [intent]

**Recommended:** V[n] — [one sentence reason]

---

## Open Graph Tags (Social Sharing)

Used when the page is shared on LinkedIn, Facebook, 
WhatsApp, and Slack:
```html
<meta property="og:title" 
  content="[OG title — can be more creative than title tag, 
  40–60 chars]" />
<meta property="og:description" 
  content="[OG description — can be more conversational 
  than meta description, 100–200 chars, no char limit 
  pressure]" />
<meta property="og:type" 
  content="[website / article / product]" />
<meta property="og:url" 
  content="[canonical URL placeholder]" />
<meta property="og:image" 
  content="[image URL placeholder — recommended 
  1200x630px]" />
```

---

## Twitter / X Card Tags

Used when the page is shared on X (Twitter):
```html
<meta name="twitter:card" 
  content="summary_large_image" />
<meta name="twitter:title" 
  content="[Twitter title — punchy, 40–60 chars, 
  can differ from title tag]" />
<meta name="twitter:description" 
  content="[Twitter description — conversational tone, 
  100–200 chars]" />
<meta name="twitter:image" 
  content="[image URL placeholder — recommended 
  1200x628px]" />
```

---

## Quality Checklist

Before accepting any variant, verify:

### Title Tag
- [ ] Primary keyword appears in first 3 words
- [ ] Character count is 50–60
- [ ] No keyword duplication within the title
- [ ] Does not start with the brand name 
      (unless homepage)
- [ ] Does not use all caps
- [ ] Reads naturally — not a keyword string

### Meta Description
- [ ] Primary keyword appears in first half 
      of the description
- [ ] Character count is 140–155
- [ ] Any power word or claim is accurate and supported; omit it otherwise
- [ ] Ends with a CTA verb or action phrase
- [ ] Does not duplicate the title tag phrasing
- [ ] Does not use "click here" or passive openers
- [ ] Sentence is complete — does not truncate 
      mid-word near the limit
- [ ] Unique — does not match any other 
      page's meta description

### Social Tags
- [ ] OG title differs from title tag 
      (more creative or conversational)
- [ ] OG description is not a copy-paste 
      of meta description
- [ ] Twitter title is punchy and 
      under 70 characters
- [ ] Image placeholder included for both 
      OG and Twitter

---

## Variant Comparison Table

| Variant             | Chars | Keyword in First Half | Power Words | CTA Verb | Recommended |
|---------------------|-------|-----------------------|-------------|----------|-------------|
| Title V1            | [n]   | ✅ / ❌               | [words]     | —        | ✅ / —      |
| Title V2            | [n]   | ✅ / ❌               | [words]     | —        | — / —       |
| Title V3            | [n]   | ✅ / ❌               | [words]     | —        | — / —       |
| Description V1      | [n]   | ✅ / ❌               | [words]     | [verb]   | ✅ / —      |
| Description V2      | [n]   | ✅ / ❌               | [words]     | [verb]   | — / —       |
| Description V3      | [n]   | ✅ / ❌               | [words]     | [verb]   | — / —       |
````

---

Escape attribute values in generated HTML (including quotes and ampersands), use verified canonical/image URLs, and leave unavailable facts as explicit placeholders. Metadata drafts do not authorize publishing changes.

## Execution Steps

1. Read `page_type` and apply the corresponding 
   copy rules from the Page Type Copy Rules table
2. Extract the single most compelling benefit or 
   outcome from `content_summary` and `usp` — 
   this becomes the lead for Description V1
3. Identify the core question the searcher is asking 
   when they type `primary_keyword` — 
   this becomes the hook for Description V2
4. Find the strongest specific claim, number, or 
   social proof signal from `content_summary` — 
   this becomes the lead for Description V3
5. Write Title V1 — keyword first, benefit second, 
   brand third if `brand_name` provided
6. Write Title V2 — keyword + power word combination, 
   curiosity or urgency angle
7. Write Title V3 — keyword + authority signal or 
   brand, suited to navigational intent
8. Write all three meta description variants using 
   the CTR framework — check character count 
   after every draft
9. Verify no variant ends mid-sentence near 
   the character limit — trim if needed
10. Write OG title and description — 
    these can be more conversational and creative 
    than the SERP versions
11. Write Twitter title and description — 
    punchy, platform-appropriate tone
12. Build the SERP preview block using 
    the recommended title and description
13. Run the full Quality Checklist on all variants
14. Build the Variant Comparison Table
15. State the recommended title and description 
    variant with a one-sentence reason for each

---

## Connected Skills
- Receives output from: `seo-aeo-landing-page-writer`, 
  `seo-aeo-blog-writer`, `seo-aeo-keyword-research`
- Feeds output to: `seo-aeo-content-quality-auditor`

## When to Use

Use when writing or revising title tags, meta descriptions, Open Graph metadata, or Twitter Card metadata for a page.

## Limitations

- Search engines may rewrite snippets, and metadata alone cannot guarantee rankings, click-through rate, or social preview behavior.
