---
name: product-engineering-competitor-analysis
description: 'Competitive research or a competitive brief: competitors and substitutes, their strengths and weaknesses, where to differentiate.'
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: product
---

# Competitor analysis

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Competitive research or a competitive brief: competitors and substitutes, their strengths and weaknesses, where to differentiate.


## Purpose

**Compare up to five direct competitors and the substitutes people use.** Map the competitive landscape and positioning. Synthesize strengths and weaknesses to uncover opportunities for strategic differentiation.

## Instructions

**Work as a strategic product analyst and competitive intelligence expert.** Specialize in competitive positioning and market landscape mapping.

### Input

**Analyze the competitive landscape for $ARGUMENTS.** Use the market or industry segment when specified. Conduct web research to identify direct competitors. Read and analyze any supplied market research, competitor data, pricing sheets, feature comparisons or customer feedback about competitors. Synthesize the data into a comprehensive competitive view.

**Every figure needs its source and the date it was read.** Include market size and growth, market share, customer counts, founding dates and funding only with a source. Where none is found, write "no source found", never an estimate.

**A competitor's own page shows its positioning, not what it does.** Beside direct competitors, name substitutes people use: a spreadsheet, an agency, a manual workaround, and doing nothing.

### Analysis steps

1. **Define the market, industry and addressable customer base for $ARGUMENTS.**
2. **Use web search to identify up to five direct competitors.** If the evidence supports fewer, give the set you found and explain the limit.
3. **Research each competitor's positioning, features, pricing and go-to-market strategy.**
4. **Assess each competitor's capabilities, limitations and market positioning.**
5. **Identify gaps, overlaps and opportunities for $ARGUMENTS to differentiate.**
6. **Develop insights about competitive dynamics and future threats.** Think through the analysis step by step.

### Output structure

**Compare the alternatives and recommend where to differentiate.** Give a short market overview, then compare positioning, pricing, strengths and gaps. Write company dossiers only on request. Open `references/competitor-dossiers.md` when the request calls for those profiles.

#### Market overview and definition

- Market size and growth trends, each with its source and date, or "no source found"
- Primary customer segments and use cases
- Key success factors in this market
- Market dynamics and competitive intensity

#### Competitive set summary

- Up to five direct competitors, with evidence for including each
- Each alternative's positioning, pricing, strengths and gaps
- Market positions: leaders, challengers, niche players
- Positioning; market share only with its source and date
- Substitutes (a spreadsheet, an agency, a manual workaround) and doing nothing

#### Differentiation opportunities for $ARGUMENTS

- Unmet customer needs across the competitive set
- Feature/pricing/UX opportunities to stand out
- Target segments underserved by competitors
- Jobs-to-be-done not effectively solved by competitors
- Channel or go-to-market approaches not yet deployed
- Potential partnerships or integrations competitors lack

#### Competitive positioning recommendation

- Recommended competitive positioning for $ARGUMENTS
- Key differentiators to emphasize
- Segments or use cases to target or avoid
- Competitive threats to monitor
- 12-18 month competitive risks and opportunities

## Best practices

- **Research current competitor websites, pricing pages and customer reviews.**
- **Use web search for product launches, funding and executive moves.**
- **Distinguish direct competitors from adjacent alternatives.**
- **Validate competitive insights across multiple sources.**
- **Identify both obvious and subtle differentiation opportunities.**
- **Consider customer pain points the market has not yet addressed.**
- **Look for emerging competitors or new market entrants.**
- **Flag competitors gaining traction or market share.**
- **Consider long-term competitive dynamics and market shifts.**
- **Use `propose` step 2 when this is part of wider market research.** It gives the skill order and rules for quoting public posts. That wider research covers segments, a value proposition, a value curve and quotes.

## How you can tell it worked

Every claim about a competitor has a source and a date, and the alternatives include substitutes and doing nothing. Differentiation follows from weaknesses found, not from wishes.

## Example

When comparing onboarding, record the same task and observation date for each vendor, then distinguish verified steps from hypotheses about buyer preference.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/product/skills/competitor-analysis).
