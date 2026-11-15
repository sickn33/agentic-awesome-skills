# Competitor & Alternative Pages - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Initial Assessment

Before creating competitor pages, understand:

1. **Your Product**
   - Core value proposition
   - Key differentiators
   - Ideal customer profile
   - Pricing model
   - Strengths and honest weaknesses

2. **Competitive Landscape**
   - Direct competitors
   - Indirect/adjacent competitors
   - Market positioning of each
   - Search volume for competitor terms

3. **Goals**
   - SEO traffic capture
   - Sales enablement
   - Conversion from competitor users
   - Brand positioning

---


## Core Principles

### 1. Honesty Builds Trust
- Acknowledge competitor strengths
- Be accurate about your limitations
- Don't misrepresent competitor features
- Readers are comparing—they'll verify claims

### 2. Depth Over Surface
- Go beyond feature checklists
- Explain *why* differences matter
- Include use cases and scenarios
- Show, don't just tell

### 3. Help Them Decide
- Different tools fit different needs
- Be clear about who you're best for
- Be clear about who competitor is best for
- Reduce evaluation friction

### 4. Modular Content Architecture
- Competitor data should be centralized
- Updates propagate to all pages
- Avoid duplicating research
- Single source of truth per competitor

---


## Page Formats

### Format 1: [Competitor] Alternative (Singular)

**Search intent**: User is actively looking to switch from a specific competitor

**URL pattern**: `/alternatives/[competitor]` or `/[competitor]-alternative`

**Target keywords**:
- "[Competitor] alternative"
- "alternative to [Competitor]"
- "switch from [Competitor]"
- "[Competitor] replacement"

**Page structure**:
1. Why people look for alternatives (validate their pain)
2. Summary: You as the alternative (quick positioning)
3. Detailed comparison (features, service, pricing)
4. Who should switch (and who shouldn't)
5. Migration path
6. Social proof from switchers
7. CTA

**Tone**: Empathetic to their frustration, helpful guide

---

### Format 2: [Competitor] Alternatives (Plural)

**Search intent**: User is researching options, earlier in journey

**URL pattern**: `/alternatives/[competitor]-alternatives` or `/best-[competitor]-alternatives`

**Target keywords**:
- "[Competitor] alternatives"
- "best [Competitor] alternatives"
- "tools like [Competitor]"
- "[Competitor] competitors"

**Page structure**:
1. Why people look for alternatives (common pain points)
2. What to look for in an alternative (criteria framework)
3. List of alternatives (rank by disclosed criteria and disclose your affiliation; do not imply an independent ranking if self-positioned)
4. Comparison table (summary)
5. Detailed breakdown of each alternative
6. Recommendation by use case
7. CTA

**Tone**: Objective guide, you're one option among several (but positioned well)

**Important**: Include 4-7 real alternatives. Choose enough genuinely relevant alternatives; list length does not guarantee search ranking.

---

### Format 3: You vs [Competitor]

**Search intent**: User is directly comparing you to a specific competitor

**URL pattern**: `/vs/[competitor]` or `/compare/[you]-vs-[competitor]`

**Target keywords**:
- "[You] vs [Competitor]"
- "[Competitor] vs [You]"
- "[You] compared to [Competitor]"
- "[You] or [Competitor]"

**Page structure**:
1. TL;DR summary (key differences in 2-3 sentences)
2. At-a-glance comparison table
3. Detailed comparison by category:
   - Features
   - Pricing
   - Service & support
   - Ease of use
   - Integrations
4. Who [You] is best for
5. Who [Competitor] is best for (be honest)
6. What customers say (testimonials from switchers)
7. Migration support
8. CTA

**Tone**: Confident but fair, acknowledge where competitor excels

---

### Format 4: [Competitor A] vs [Competitor B]

**Search intent**: User comparing two competitors (not you directly)

**URL pattern**: `/compare/[competitor-a]-vs-[competitor-b]`

**Target keywords**:
- "[Competitor A] vs [Competitor B]"
- "[Competitor A] or [Competitor B]"
- "[Competitor A] compared to [Competitor B]"

**Page structure**:
1. Overview of both products
2. Comparison by category
3. Who each is best for
4. The third option (introduce yourself)
5. Comparison table (all three)
6. CTA

**Tone**: Objective analyst, earn trust through fairness, then introduce yourself

**Why this works**: Captures search traffic for competitor terms, positions you as knowledgeable, introduces you to qualified audience.

---


## Index Pages

Each format needs an index page that lists all pages of that type. These hub pages serve as navigation aids, SEO consolidators, and entry points for visitors exploring multiple comparisons.

### Alternatives Index

**URL**: `/alternatives` or `/alternatives/index`

**Purpose**: Lists all "[Competitor] Alternative" pages

**Page structure**:
1. Headline: "[Your Product] as an Alternative"
2. Brief intro on why people switch to you
3. List of all alternative pages with:
   - Competitor name/logo
   - One-line summary of key differentiator vs. that competitor
   - Link to full comparison
4. Common reasons people switch (aggregated)
5. CTA

**Example**:
```markdown
## Explore [Your Product] as an Alternative

Looking to switch? See how [Your Product] compares to the tools you're evaluating:

- **[Notion Alternative](#)** — Better for teams who need [X]
- **[Airtable Alternative](#)** — Better for teams who need [Y]
- **[Monday Alternative](#)** — Better for teams who need [Z]
```

---

### Alternatives (Plural) Index

**URL**: `/alternatives/compare` or `/best-alternatives`

**Purpose**: Lists all "[Competitor] Alternatives" roundup pages

**Page structure**:
1. Headline: "Software Alternatives & Comparisons"
2. Brief intro on your comparison methodology
3. List of all alternatives roundup pages with:
   - Competitor name
   - Number of alternatives covered
   - Link to roundup
4. CTA

**Example**:
```markdown
## Find the Right Tool

Comparing your options? Our guides cover the top alternatives:

- **[Best Notion Alternatives](#)** — 7 tools compared
- **[Best Airtable Alternatives](#)** — 6 tools compared
- **[Best Monday Alternatives](#)** — 5 tools compared
```

---

### Vs Comparisons Index

**URL**: `/vs` or `/compare`

**Purpose**: Lists all "You vs [Competitor]" and "[A] vs [B]" pages

**Page structure**:
1. Headline: "Compare [Your Product]"
2. Section: "[Your Product] vs Competitors" — list of direct comparisons
3. Section: "Head-to-Head Comparisons" — list of [A] vs [B] pages
4. Brief methodology note
5. CTA

**Example**:
```markdown
## Compare [Your Product]

### [Your Product] vs. the Competition

- **[[Your Product] vs Notion](#)** — Best for [differentiator]
- **[[Your Product] vs Airtable](#)** — Best for [differentiator]
- **[[Your Product] vs Monday](#)** — Best for [differentiator]

### Other Comparisons

Evaluating tools we compete with? We've done the research:

- **[Notion vs Airtable](#)**
- **[Notion vs Monday](#)**
- **[Airtable vs Monday](#)**
```

---

### Index Page Best Practices

**Keep them updated**: When you add a new comparison page, add it to the relevant index.

**Internal linking**:
- Link from index → individual pages
- Link from individual pages → back to index
- Cross-link between related comparisons

**SEO value**:
- Index pages can rank for broad terms like "project management tool comparisons"
- Pass link equity to individual comparison pages
- Help search engines discover all comparison content

**Sorting options**:
- By popularity (search volume)
- Alphabetically
- By category/use case
- By date added (show freshness)

**Include on index pages**:
- Last updated date for credibility
- Number of pages/comparisons available
- Quick filters if you have many comparisons

---


## Content Architecture

### Centralized Competitor Data

Create a single source of truth for each competitor:

```
competitor_data/
├── notion.md
├── airtable.md
├── monday.md
└── ...
```

**Per competitor, document**:

```yaml
# Fictional illustration only; replace every product fact with dated evidence.
name: Example Workspace A
website: https://workspace-a.example
checked_at: null
primary_use_case: null
pricing:
  source_url: null
  region: null
  currency: null
  billing_period: null
  seat_minimum: null
  taxes_addons: null
  amount: null
features: [] # each: claim, plan/version/platform, source_url, checked_at, limitations
strengths: [] # evidence-supported and scoped
weaknesses: [] # distinguish observed limitation from review opinion
best_for: [] # criteria-based editorial recommendation, not universal fact
migration_from:
  tested: false
  export_formats: []
  what_transfers: []
  what_doesnt: []
  time_estimate: null
```

### Your Product Data

Same structure for yourself—be honest:

```yaml
name: [Your Product]
# ... same fields

strengths:
  - [Your real strengths]

weaknesses:
  - [Your honest weaknesses]

best_for:
  - [Your ideal customers]

not_ideal_for:
  - [Who should use something else]
```

### Page Generation

Each page pulls from centralized data:

- **[Competitor] Alternative page**: Pulls competitor data + your data
- **[Competitor] Alternatives page**: Pulls competitor data + your data + other alternatives
- **You vs [Competitor] page**: Pulls your data + competitor data
- **[A] vs [B] page**: Pulls both competitor data + your data

**Benefits**:
- Update competitor pricing once, updates everywhere
- Add new feature comparison once, appears on all pages
- Consistent accuracy across pages
- Easier to maintain at scale

---


## Section Templates

### TL;DR Summary

Start every page with a quick summary for scanners:

```markdown
**TL;DR**: [Competitor] excels at [strength] but struggles with [weakness].
[Your product] is built for [your focus], offering [key differentiator].
Choose [Competitor] if [their ideal use case]. Choose [You] if [your ideal use case].
```

### Paragraph Comparison (Not Just Tables)

For each major dimension, write a paragraph:

```markdown
## Features

[Competitor] offers [description of their feature approach].
Their strength is [specific strength], which works well for [use case].
However, [limitation] can be challenging for [user type].

[Your product] takes a different approach with [your approach].
This means [benefit], though [honest tradeoff].
Teams who [specific need] often find this more effective.
```

### Feature Comparison Section

Go beyond checkmarks:

```markdown
## Feature Comparison

### [Feature Category]

**[Competitor]**: [2-3 sentence description of how they handle this]
- Strengths: [specific]
- Limitations: [specific]

**[Your product]**: [2-3 sentence description]
- Strengths: [specific]
- Limitations: [specific]

**Bottom line**: Choose [Competitor] if [scenario]. Choose [You] if [scenario].
```

### Pricing Comparison Section

```markdown
## Pricing

| | [Competitor] | [Your Product] |
|---|---|---|
| Free tier | [Details] | [Details] |
| Starting price | $X/user/mo | $X/user/mo |
| Business tier | $X/user/mo | $X/user/mo |
| Enterprise | Custom | Custom |

**What's included**: [Competitor]'s $X plan includes [features], while
[Your product]'s $X plan includes [features].

**Total cost consideration**: Beyond per-seat pricing, consider [hidden costs,
add-ons, implementation]. [Competitor] charges extra for [X], while
[Your product] includes [Y] in base pricing.

**Value comparison**: For a 10-person team, [Competitor] costs approximately
$X/year while [Your product] costs $Y/year, with [key differences in what you get].
```

### Service & Support Comparison

```markdown
## Service & Support

| | [Competitor] | [Your Product] |
|---|---|---|
| Documentation | [Quality assessment] | [Quality assessment] |
| Response time | [SLA if known] | [Your SLA] |
| Support channels | [List] | [List] |
| Onboarding | [What they offer] | [What you offer] |
| CSM included | [At what tier] | [At what tier] |

**Support quality**: Based on [G2/Capterra reviews, your research],
[Competitor] support is described as [assessment]. Common feedback includes
[quotes or themes].

[Your product] offers [your support approach]. [Specific differentiator like
response time, dedicated CSM, implementation help].
```

### Who It's For Section

```markdown
## Who Should Choose [Competitor]

[Competitor] is the right choice if:
- [Specific use case or need]
- [Team type or size]
- [Workflow or requirement]
- [Budget or priority]

**Ideal [Competitor] customer**: [Persona description in 1-2 sentences]

## Who Should Choose [Your Product]

[Your product] is built for teams who:
- [Specific use case or need]
- [Team type or size]
- [Workflow or requirement]
- [Priority or value]

**Ideal [Your product] customer**: [Persona description in 1-2 sentences]
```

### Migration Section

```markdown
## Switching from [Competitor]

### What transfers
- [Data type]: [How easily, any caveats]
- [Data type]: [How easily, any caveats]

### What needs reconfiguration
- [Thing]: [Why and effort level]
- [Thing]: [Why and effort level]

### Migration support

We offer [migration support details]:
- [Free data import tool / white-glove migration]
- [Documentation / migration guide]
- [Timeline expectation]
- [Support during transition]

### What customers say about switching

> "[Quote from customer who switched]"
> — [Name], [Role] at [Company]
```

### Social Proof Section

Focus on switchers:

```markdown
## What Customers Say

### Switched from [Competitor]

> "[Specific quote about why they switched and outcome]"
> — [Name], [Role] at [Company]

> "[Another quote]"
> — [Name], [Role] at [Company]

### Results after switching
- [Company] saw [specific result]
- [Company] reduced [metric] by [amount]
```

---


## Comparison Table Best Practices

### Beyond Checkmarks

Instead of:
| Feature | You | Competitor |
|---------|-----|-----------|
| Feature A | ✓ | ✓ |
| Feature B | ✓ | ✗ |

Do this:
| Feature | You | Competitor |
|---------|-----|-----------|
| Feature A | Full support with [detail] | Basic support, [limitation] |
| Feature B | [Specific capability] | Not available |

### Organize by Category

Group features into meaningful categories:
- Core functionality
- Collaboration
- Integrations
- Security & compliance
- Support & service

### Include Ratings Where Useful

| Category | You | Competitor | Notes |
|----------|-----|-----------|-------|
| Ease of use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | [Brief note] |
| Feature depth | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | [Brief note] |

---


## Research Process

### Deep Competitor Research

For each competitor, gather:

1. **Product research**
   - Read official public docs first; create a trial only when account/data/possible billing authority is explicit
   - Use the product yourself
   - Document features, UX, limitations
   - Take screenshots

2. **Pricing research**
   - Current pricing (check regularly)
   - What's included at each tier
   - Hidden costs, add-ons
   - Contract terms

3. **Review mining**
   - G2, Capterra, TrustRadius reviews
   - Common praise themes
   - Common complaint themes
   - Ratings by category

4. **Customer feedback**
   - Use authorized interviews/feedback; do not contact customers without explicit messaging authorization
   - Talk to customers who switched only within that authorization
   - Talk to prospects who chose competitor
   - Document real quotes

5. **Content research**
   - Their positioning and messaging
   - Their comparison pages (how do they compare to you?)
   - Their documentation quality
   - Their changelog (recent development)

### Ongoing Updates

Competitor pages need maintenance; recheck changeable pricing/features immediately before publication, not only on a quarterly timer:

- **Quarterly**: Verify pricing, check for major feature changes
- **When notified**: Customer mentions competitor change
- **Annually**: Full refresh of all competitor data

---


## SEO Considerations

### Keyword Targeting

| Format | Primary Keywords | Secondary Keywords |
|--------|-----------------|-------------------|
| Alternative (singular) | [Competitor] alternative | alternative to [Competitor], switch from [Competitor], [Competitor] replacement |
| Alternatives (plural) | [Competitor] alternatives | best [Competitor] alternatives, tools like [Competitor], [Competitor] competitors |
| You vs Competitor | [You] vs [Competitor] | [Competitor] vs [You], [You] compared to [Competitor] |
| Competitor vs Competitor | [A] vs [B] | [B] vs [A], [A] or [B], [A] compared to [B] |

### Internal Linking

- Link between related competitor pages
- Link from feature pages to relevant comparisons
- Link from blog posts mentioning competitors
- Hub page linking to all competitor content

### Schema Markup

Use FAQ markup only for visible genuine Q&A that meets the target search engine’s current eligibility requirements; it does not guarantee rich results. Do not add ratings/review markup for invented scores or self-serving testimonials:

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the best alternative to [Competitor]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Your answer positioning yourself]"
      }
    }
  ]
}
```

---


## Output Format

### Competitor Data File

```yaml
# [competitor].yaml
# Complete competitor profile for use across all comparison pages
```

### Page Content

For each page:
- URL and meta tags
- Full page copy organized by section
- Comparison tables
- CTAs

### Page Set Plan

Recommended pages to create:
1. [List of alternative pages]
2. [List of vs pages]
3. Priority order based on search volume

---


## Questions to Ask

If you need more context:
1. Who are your top 3-5 competitors?
2. What's your core differentiator?
3. What are common reasons people switch to you?
4. Do you have customer quotes about switching?
5. What's your pricing vs. competitors?
6. Do you offer migration support?

---


## Related Skills

- **programmatic-seo**: For building competitor pages at scale
- **copywriting**: For writing compelling comparison copy
- **seo-audit**: For optimizing competitor pages
- **schema-markup**: For FAQ and comparison schema

## Evidence, rights and publication boundary

Templates are drafts, not completed research or publication authority. Every current
price/feature/security/compliance claim needs an official dated source and relevant
plan/region/version; unavailable data is “not verified,” not “not available.” Reviews
are attributed opinions from a disclosed sample/date, not representative user facts.
Never fabricate quotations, switcher identities, outcomes or migration support. Use
only consented, accurately quoted testimonials and appropriately licensed logos/
screenshots; avoid implying competitor endorsement or independent analysis.

For example, fictional A at 10 USD/seat/month billed annually for 10 seats is 1,200
USD/year before tax/add-ons; fictional B at 120 USD/year per seat is also 1,200, not
a “12× saving.” Compare equivalent quotas and billing commitments, then test migration
on synthetic export/import fixtures including permissions, attachments, relations and
automations. Do not promise 1–3 days or lossless transfer without measured scope.
Keep a claim-to-source ledger and correction date; SEO/readability recommendations
are hypotheses, not ranking or conversion guarantees. No trials, interviews, product
checks, migration or publication occurred in this static review.
