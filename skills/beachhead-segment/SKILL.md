---
name: beachhead-segment
description: Choosing the first market or customer segment to win, scored on burning pain, willingness to pay, winnable share and referrals.
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

# Beachhead segment

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Choosing the first market or customer segment to win, scored on burning pain, willingness to pay, winnable share and referrals.


## Overview

**Choose the first market segment to win before expanding to adjacent markets.** Evaluate potential segments to find an initial winner that enables fast PMF validation.

## When to use

Use this analysis for:

- Choosing a first market for your product
- Targeting an initial customer segment
- Planning initial market entry strategy
- Deciding where to focus limited resources
- Validating GTM assumptions with early adopters

## Key evaluation criteria

### 1. Burning pain point

**Assess whether the segment experiences an acute, unmet problem.** Look for:

- Daily frustration with the status quo
- Significant productivity loss or cost impact
- Emotional urgency to find a solution
- Current workarounds that are expensive or fragile
- A problem getting worse over time

### 2. Willingness to pay

**Assess whether the segment has budget and motivation to pay.** Look for:

- Documented budget allocation for this problem area
- Clear and compelling ROI (value > cost)
- Economic impact of the problem that justifies the solution cost
- A decision-maker with autonomy or influence over budget
- No free or DIY alternatives that fully satisfy the need

### 3. Winnable market share

**Show why the segment is winnable with your time and resources.** In a measurable niche, use 60–70% capture in 3–18 months as a heuristic. Label any assumptions behind your estimate. Look for:

- A segment large enough but not oversaturated
- Limited competition or easy differentiation
- Fragmented or complacent market players
- Your product's clear competitive advantage
- Your unique access or distribution advantage

### 4. Referral potential

**Assess whether customers will naturally refer or recommend the product.** Look for:

- Professional communities within the segment
- Customers interacting with adjacent segments (expansion opportunity)
- A high word-of-mouth culture in the industry
- Network effects within the segment
- Demand in adjacent segments created by solving the problem for one

## How it works

### Step 1: List potential segments

**Brainstorm all possible target segments.** Consider:

- Industry verticals (SaaS, healthcare, manufacturing, etc.)
- Company size (SMB, mid-market, enterprise)
- Job titles or roles
- Geographic regions
- Use cases or use-case variations
- Customer maturity level

### Step 2: Research pain points

**Validate burning pain in each segment.** Use:

- Customer interviews and discovery calls
- Problem validation through surveys
- Market research and analyst reports
- Competitor positioning and customer reviews

Quantify the problem's cost or impact, and identify current workarounds and their limitations.

### Step 3: Assess willingness to pay

**Determine the segment's budget and economic viability.** Assess:

- The segment's budget for this problem category
- ROI calculation (value gained vs cost)
- Current spending on solutions or workarounds
- Budget decision-making process
- Typical deal size expectations
- Pricing sensitivity in the segment

### Step 4: Evaluate winnability

**Assess realistic market share potential.** Consider:

- Total addressable market (TAM) size
- Competitive landscape and positioning
- Your differentiation or unfair advantage
- Distribution access to this segment
- Time and resources required
- Market growth and momentum

### Step 5: Identify referral pathways

**Map the segment's opportunities for expansion.** Include:

- Adjacent segments that the reference segment influences
- Network effects within the segment
- Professional communities and associations
- Customer-to-customer recommendations
- A natural expansion path to adjacent markets
- Viral or network effects from solving the core pain

### Step 6: Select beachhead

**Choose your primary launch segment across all four criteria.** Look for:

- The highest combined score across the four criteria
- The most achievable segment for your current resources
- The shortest path to PMF and revenue
- The best reference for adjacent expansion
- The most enthusiastic early customer cohort

## Input format

**Pass the product and market context through $ARGUMENTS.** Include:

- Product description and capabilities
- Initial market research and validation data
- Potential segment options
- Constraints and limitations
- Timeline and resource constraints
- Current customer data or feedback

## Output

**Recommend a beachhead with supporting evidence and a first acquisition test.** Include:

- Top 3-5 recommended segments with scoring
- Primary beachhead segment recommendation
- Pain point validation and evidence
- Willingness to pay assessment and pricing guidance
- Realistic market share and revenue potential, with projections where the evidence supports them
- Referral and expansion pathways to adjacent segments

**Add the 90-day acquisition plan and expansion roadmap on request.** Use evidence about the chosen segment to plan that work.

**Every displayed score names its scale beside the number or in the subtitle.**

## Framework

Based on Geoffrey Moore's beachhead market strategy in "Crossing the Chasm." The focus is the smallest winnable, referenceable market that validates PMF and enables expansion.

## Tips

- **Start absurdly specific.** A niche beachhead is better than a vague mass market.
- **Choose the segment most likely to evangelize your solution.**
- **Validate all four criteria with at least 10 customer interviews.**
- **Select the segment with the fastest path to revenue and references.**
- **Ensure the beachhead can reference to adjacent market segments.**
- **Focus all resources on dominating the beachhead.** Do not dilute efforts.
- **Use customer references and evidence of traction to judge when to expand.**

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

One segment is chosen, each score carries its source, and the owner can say why it beats the runner-up.

## Example

A scheduling tool can target independent clinics first. Record their recurring booking work, reachable buyers and the evidence required before targeting larger hospitals.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/product/skills/beachhead-segment).
