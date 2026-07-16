---
name: startup-business-analyst-market-opportunity
description: 'Generate comprehensive market opportunity analysis with TAM/SAM/SOM

  calculations

  '
risk: unknown
source: community
date_added: '2026-02-27'
---

# Market Opportunity Analysis

Generate a comprehensive market opportunity analysis for a startup, including Total Addressable Market (TAM), Serviceable Available Market (SAM), and Serviceable Obtainable Market (SOM) calculations using both bottom-up and top-down methodologies.

## Use this skill when

- Working on market opportunity analysis tasks or workflows
- Needing guidance, best practices, or checklists for market opportunity analysis

## Do not use this skill when

- The task is unrelated to market opportunity analysis
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## What This Command Does

This command guides through an interactive market sizing process to:
1. Define the target market and customer segments
2. Gather relevant market data
3. Calculate TAM using bottom-up methodology
4. Validate with top-down analysis
5. Narrow to SAM with appropriate filters
6. Estimate realistic SOM (3-5 year opportunity)
7. Present findings in a formatted report

## Instructions for Claude

When this command is invoked, follow these steps:

### Step 1: Gather Context

Ask the user for essential information:
- **Product/Service Description:** What problem is being solved?
- **Target Customers:** Who is the ideal customer? (industry, size, geography)
- **Business Model:** How does pricing work? (subscription, transaction, etc.)
- **Stage:** What stage is the company? (pre-launch, seed, Series A)
- **Geography:** Initial target market (US, North America, Global)

### Step 2: Activate market-sizing-analysis Skill

The market-sizing-analysis skill provides comprehensive methodologies. Reference it for:
- Bottom-up calculation frameworks
- Top-down validation approaches
- Industry-specific templates
- Data source recommendations

### Step 3: Conduct Bottom-Up Analysis

**For B2B/SaaS:**
1. Define customer segments (company size, industry, use case)
2. Estimate number of companies in each segment
3. Determine average contract value (ACV) per segment
4. Calculate TAM: Σ (Segment Size × ACV)

**For Consumer/Marketplace:**
1. Define target user demographics
2. Estimate total addressable users
3. Determine average revenue per user (ARPU)
4. Calculate TAM: Total Users × ARPU × Frequency

**For Transactions/E-commerce:**
1. Estimate total transaction volume (GMV)
2. Determine take rate or margin
3. Calculate TAM: Total GMV × Take Rate

### Step 4: Gather Market Data

Use available tools to research:
- **WebSearch:** Find industry reports, market size estimates, public company data
- **Cite all sources** with URLs and publication dates
- **Document assumptions** clearly

Recommended data sources (from skill):
- Government data (Census, BLS)
- Industry reports (Gartner, Forrester, Statista)
- Public company filings (10-K reports)
- Trade associations
- Academic research

### Step 5: Top-Down Validation

Validate bottom-up calculation:
1. Find total market category size from research
2. Apply geographic filters
3. Apply segment/product filters
4. Compare to bottom-up TAM (should be within 30%)

If variance > 30%, investigate and explain differences.

### Step 6: Calculate SAM

Apply realistic filters to narrow TAM:
- **Geographic:** Regions actually serviceable
- **Product Capability:** Features needed to serve
- **Market Readiness:** Customers ready to adopt
- **Addressable Switching:** Can reach and convert

Formula:
```
SAM = TAM × Geographic % × Product Fit % × Market Readiness %
```

### Step 7: Estimate SOM

Calculate realistic obtainable market share:

**Conservative Approach (Recommended):**
- Year 3: 2-3% of SAM
- Year 5: 4-6% of SAM

**Consider:**
- Competitive intensity
- Available resources (funding, team)
- Go-to-market effectiveness
- Differentiation strength

### Step 8: Create Market Sizing Report

Generate a comprehensive markdown report with:

**Section 1: Executive Summary**
- Market opportunity in one paragraph
- TAM/SAM/SOM headline numbers

**Section 2: Market Definition**
- Problem being solved
- Target customer profile
- Geographic scope
- Time horizon

**Section 3: Bottom-Up Analysis**
- Customer segment breakdown
- Segment sizing with sources
- TAM calculation with formula
- Assumptions documented

**Section 4: Top-Down Validation**
- Industry category and size
- Filter application
- Validated TAM
- Comparison to bottom-up

**Section 5: SAM Calculation**
- Filters applied with rationale
- SAM formula and result
- Segment-level breakdown

**Section 6: SOM Projection**
- Market share assumptions
- Year 3 and Year 5 estimates
- Customer count implications
- Revenue projections

**Section 7: Market Growth**
- Industry growth rate (CAGR)
- Key growth drivers
- 5-year market evolution

**Section 8: Validation and Sanity Checks**
- Public company comparisons
- Customer count validation
- Competitive context

**Section 9: Investment Thesis**
- Market opportunity assessment
- Key positives and risks
- Venture-scale potential
- Next steps

### Step 9: Save Report

Offer to save the report as a markdown file:
- Suggest filename: `market-opportunity-analysis-YYYY-MM-DD.md`
- Use Write tool to create file
- Confirm file location with user

## Tips for Best Results

**Do:**
- Start with bottom-up (most credible)
- Always triangulate with top-down
- Cite all data sources
- Document every assumption
- Be conservative on SOM
- Compare to public company benchmarks
- Explain any data gaps or limitations

**Don't:**
- Rely solely on top-down
- Cherry-pick optimistic data
- Claim >10% SOM without strong justification
- Mix methodologies inappropriately
- Ignore competitive context
- Skip validation steps

## Example Usage

```
User: /market-opportunity

Claude: I'll help you create a comprehensive market opportunity analysis. Let me start by gathering some context.

What product or service are you analyzing?
→ "AI-powered email marketing for e-commerce companies"

Who are your target customers?
→ "E-commerce companies with $1M+ annual revenue in North America"

What's your pricing model?
→ "Subscription: $50-500/month based on email volume, average $300/month"

[Claude proceeds with analysis, gathering data, calculating TAM/SAM/SOM, and generating report]
```

## Integration with Other Commands

This command pairs well with:
- `/financial-projections` - Use SOM to build revenue model
- `/business-case` - Include market sizing in business case

## Notes

- Market sizing typically takes 30-60 minutes for thorough analysis
- Quality depends on data availability - explain limitations
- Update annually as market evolves
- Conservative estimates build credibility with investors

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
