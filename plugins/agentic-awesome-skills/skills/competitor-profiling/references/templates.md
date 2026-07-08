# Profile Templates

Ready-to-use templates for competitor profile sections and the summary document.

## Contents
- Quick Scan Template
- Summary Comparison Table
- Positioning Map
- Competitive SWOT
- Profile Update Changelog

---

## Quick Scan Template

Abbreviated profile for when speed matters more than depth.

```markdown
# [Competitor Name] — Quick Profile

**URL**: [website]
**Generated**: [date]

## At a Glance

| Metric | Value |
|--------|-------|
| Tagline | [from homepage] |
| Target audience | [inferred from copy] |
| Pricing starts at | [lowest paid tier] |
| Free tier/trial | [yes/no + details] |
| Domain rank | [from DataForSEO] |
| Est. organic traffic | [monthly] |
| Organic keywords (top 10) | [count] |
| Referring domains | [count] |

## Positioning

**Headline**: "[exact homepage headline]"
**Subheadline**: "[exact subheadline]"
**Positioning angle**: [1-2 sentence summary of how they position]

## Pricing Summary

| Tier | Price | Notable Inclusions |
|------|-------|-------------------|
| [tier] | [price] | [key items] |
| [tier] | [price] | [key items] |

## Key Takeaway

[2-3 sentences: what makes this competitor notable, where they're strong, where they're weak]
```

---

## Summary Comparison Table

Use after profiling all competitors to create a side-by-side view.

```markdown
# Competitive Landscape Summary

**Generated**: [date]
**Your product**: [name]
**Competitors profiled**: [count]

## Side-by-Side Comparison

| Dimension | [Your Product] | [Competitor 1] | [Competitor 2] | [Competitor 3] |
|-----------|---------------|----------------|----------------|----------------|
| **Tagline** | [yours] | [theirs] | [theirs] | [theirs] |
| **Target audience** | [yours] | [theirs] | [theirs] | [theirs] |
| **Positioning** | [angle] | [angle] | [angle] | [angle] |
| **Starting price** | $[X]/mo | $[X]/mo | $[X]/mo | $[X]/mo |
| **Free tier** | [yes/no] | [yes/no] | [yes/no] | [yes/no] |
| **Domain rank** | [score] | [score] | [score] | [score] |
| **Est. organic traffic** | [number] | [number] | [number] | [number] |
| **Referring domains** | [count] | [count] | [count] | [count] |
| **G2 rating** | [score] | [score] | [score] | [score] |
| **Key strength** | [one-liner] | [one-liner] | [one-liner] | [one-liner] |
| **Key weakness** | [one-liner] | [one-liner] | [one-liner] | [one-liner] |
```

---

## Positioning Map

Visual representation of where competitors sit along two key dimensions. Choose the two axes most relevant to your market.

### Common Axis Pairs

| Market Type | X-Axis | Y-Axis |
|-------------|--------|--------|
| SaaS tools | Simple → Complex | Cheap → Expensive |
| Developer tools | Low-code → Code-first | Individual → Team |
| B2B platforms | SMB-focused → Enterprise-focused | Point solution → Platform |
| Content tools | Template-driven → Custom | Self-serve → Managed |

### Format

```markdown
## Positioning Map

**Axes**: [X-axis label] vs. [Y-axis label]

                    [Y-axis high label]
                           │
                           │
          [Competitor A]   │    [Competitor B]
                           │
    ───────────────────────┼───────────────────────
    [X-axis low]           │           [X-axis high]
                           │
          [Your Product]   │    [Competitor C]
                           │
                    [Y-axis low label]

### Interpretation
- [1-2 sentences about what the map reveals]
- [where the whitespace / opportunity is]
```

---

## Competitive SWOT

Per-competitor SWOT relative to your product.

```markdown
## SWOT: [Competitor] vs. [Your Product]

### Strengths (theirs vs. ours)
- [Where they genuinely outperform us — be honest]

### Weaknesses (theirs vs. ours)
- [Where they fall short compared to us — with evidence]

### Opportunities (for us)
- [Gaps in their offering we can exploit]
- [Segments they're ignoring]
- [Messaging angles they're missing]

### Threats (from them)
- [Areas where they're improving fast]
- [Features they're building that overlap with us]
- [Market moves that could shift perception]
```

---

## Profile Update Changelog

Append to the bottom of any profile when updating it.

```markdown
---

## Change Log

| Date | What Changed | Source |
|------|-------------|--------|
| [date] | Pricing increased from $X to $Y | Pricing page re-scrape |
| [date] | Launched [feature] | Changelog scrape |
| [date] | Domain rank changed from X to Y | DataForSEO re-pull |
| [date] | Added [integration] | Integrations page re-scrape |
```
