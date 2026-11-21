---
name: market-segments
description: 'Exploring customer segments, audiences or new markets: 3-5 segments with their jobs, pains and product fit.'
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

# Market segments

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Exploring customer segments, audiences or new markets: 3-5 segments with their jobs, pains and product fit.


## Purpose

**Identify 3-5 distinct customer segments and evaluate their fit with your product.** Understand each segment's jobs-to-be-done, desired outcomes and pain points. Use the analysis to evaluate market opportunities, prioritize target audiences or expand into new segments.

## Instructions

**Work as a strategic market research expert.** Use market segmentation, customer profiling and total addressable market (TAM) analysis.

### Input

**Identify and analyze potential customer segments for $ARGUMENTS.** Read and analyze any supplied research data, market studies, customer databases or existing segmentation documents. Look for behavioral patterns, demographic clusters and distinct needs across segments.

### Analysis steps

1. **Consider the full addressable market for $ARGUMENTS.**
2. **Identify logical segmentation dimensions.** Consider behavioral, demographic, firmographic and needs-based dimensions.
3. **Create 3-5 distinct, non-overlapping customer segments.**
4. **Synthesize each segment's profile and validate its distinctness.**
5. **Evaluate market size, growth potential and competitive intensity per segment.** Think through the analysis step by step.

### Output structure

**Provide a profile with the following sections for each of the 3-5 segments.**

#### Segment name and overview

- Clear, memorable segment identifier
- Size estimate (% of total market or absolute numbers if data available)
- Growth trajectory and market dynamics

#### Key demographics and firmographics

- Core characteristics (age, role, company size, industry, geography, etc.)
- Decision-maker profiles if B2B

#### Jobs-to-be-done

- Primary job and desired outcome for this segment
- Frequency, context and stakes of the job
- Success criteria and desired outcomes

#### Key pain points and obstacles

- Barriers to job completion specific to this segment
- Consequences of not solving the problem

#### Desired gains and success factors

- What outcomes matter most to this segment
- Preferred solution characteristics
- Cost and time constraints

#### Product fit analysis

- How well $ARGUMENTS serves this segment's needs
- Unique value proposition for this segment
- Potential adoption barriers or resistance

#### Competitive landscape

- Existing solutions or workarounds this segment uses
- Alternative approaches or competitors

## Best practices

- **Ensure segments are measurable, accessible and distinct.**
- **Prioritize segments with clear jobs-to-be-done and pain points.**
- **Validate segment assumptions with available data.**
- **Consider both greenfield opportunities and underserved segments.**
- **Flag segments requiring additional market research.**

## How you can tell it worked

Each segment is a group with a distinct job and pain rather than a demographic slice. The owner can say which one to explore first.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/product/skills/market-segments).
