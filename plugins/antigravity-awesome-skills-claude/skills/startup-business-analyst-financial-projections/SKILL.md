---
name: startup-business-analyst-financial-projections
description: 'Create detailed 3-5 year financial model with revenue, costs, cash

  flow, and scenarios

  '
risk: unknown
source: community
date_added: '2026-02-27'
---

# Financial Projections

Create a comprehensive 3-5 year financial model with revenue projections, cost structure, headcount planning, cash flow analysis, and three-scenario modeling (conservative, base, optimistic) for startup financial planning and fundraising.

## Use this skill when

- Working on financial projections tasks or workflows
- Needing guidance, best practices, or checklists for financial projections

## Do not use this skill when

- The task is unrelated to financial projections
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## What This Command Does

This command builds a complete financial model including:
1. Cohort-based revenue projections
2. Detailed cost structure (COGS, S&M, R&D, G&A)
3. Headcount planning by role
4. Monthly cash flow analysis
5. Key metrics (CAC, LTV, burn rate, runway)
6. Three-scenario analysis

## Instructions for Claude

When this command is invoked, follow these steps:

### Step 1: Gather Model Inputs

Ask the user for essential information:

**Business Model:**
- Revenue model (SaaS, marketplace, transaction, etc.)
- Pricing structure (tiers, average price)
- Target customer segments

**Starting Point:**
- Current MRR/ARR (if any)
- Current customer count
- Current team size
- Current cash balance

**Growth Assumptions:**
- Expected monthly customer acquisition
- Customer retention/churn rate
- Average contract value (ACV)
- Sales cycle length

**Cost Assumptions:**
- Gross margin or COGS %
- S&M budget or CAC target
- Current burn rate (if applicable)

**Funding:**
- Planned fundraising (amount, timing)
- Pre/post-money valuation

### Step 2: Activate startup-financial-modeling Skill

The startup-financial-modeling skill provides frameworks. Reference it for:
- Revenue modeling approaches
- Cost structure templates
- Headcount planning guidance
- Scenario analysis methods

### Step 3: Build Revenue Model

**Use Cohort-Based Approach:**

For each month, track:
1. New customers acquired
2. Existing customers retained (apply churn)
3. Revenue per cohort (customers × ARPU)
4. Expansion revenue (upsells)

**Formula:**
```
MRR (Month N) = Σ across all cohorts:
  (Cohort Size × Retention Rate × ARPU) + Expansion
```

**Project:**
- Monthly detail for Year 1-2
- Quarterly detail for Year 3
- Annual for Years 4-5

### Step 4: Model Cost Structure

Break down operating expenses:

**1. Cost of Goods Sold (COGS)**
- Hosting/infrastructure (% of revenue or fixed)
- Payment processing (% of revenue)
- Variable customer support
- Third-party services

Target gross margin:
- SaaS: 75-85%
- Marketplace: 60-70%
- E-commerce: 40-60%

**2. Sales & Marketing (S&M)**
- Sales team compensation
- Marketing programs
- Tools and software
- Target: 40-60% of revenue (early stage)

**3. Research & Development (R&D)**
- Engineering team
- Product management
- Design
- Target: 30-40% of revenue

**4. General & Administrative (G&A)**
- Executive team
- Finance, legal, HR
- Office and facilities
- Target: 15-25% of revenue

### Step 5: Plan Headcount

Create role-by-role hiring plan:

**Reference team-composition-analysis skill for:**
- Roles by stage
- Compensation benchmarks
- Hiring velocity assumptions

**For each role:**
- Title and department
- Start date (month/quarter)
- Base salary
- Fully-loaded cost (salary × 1.3-1.4)
- Equity grant

**Track departmental ratios:**
- Engineering: 40-50% of team
- Sales & Marketing: 25-35%
- G&A: 10-15%
- Product/CS: 10-15%

### Step 6: Calculate Cash Flow

Monthly cash flow projection:

```
Beginning Cash Balance
+ Cash Collected (revenue, consider payment terms)
- Operating Expenses
- CapEx
= Ending Cash Balance

Monthly Burn = Revenue - Expenses (if negative)
Runway = Cash Balance / Monthly Burn Rate
```

**Include Funding Events:**
- Timing of raises
- Amount raised
- Use of proceeds
- Impact on cash balance

### Step 7: Compute Key Metrics

Calculate monthly/quarterly:

**Unit Economics:**
- CAC (S&M spend / new customers)
- LTV (ARPU × margin% / churn rate)
- LTV:CAC ratio (target > 3.0)
- CAC payback period (target < 18 months)

**Efficiency Metrics:**
- Burn multiple (net burn / net new ARR) - target < 2.0
- Magic number (net new ARR / S&M spend) - target > 0.5
- Rule of 40 (growth% + margin%) - target > 40%

**Cash Metrics:**
- Monthly burn rate
- Runway in months
- Cash efficiency

### Step 8: Create Three Scenarios

Build conservative, base, and optimistic projections:

**Conservative (P10):**
- New customers: -30% vs. base
- Churn: +20% vs. base
- Pricing: -15% vs. base
- CAC: +25% vs. base

**Base (P50):**
- Most likely assumptions
- Primary planning scenario

**Optimistic (P90):**
- New customers: +30% vs. base
- Churn: -20% vs. base
- Pricing: +15% vs. base
- CAC: -25% vs. base

### Step 9: Generate Financial Model Report

Create comprehensive markdown report with tables:

**Section 1: Executive Summary**
- 3-5 year financial snapshot
- Key metrics at scale
- Funding requirements

**Section 2: Model Assumptions**
- Revenue model and pricing
- Growth assumptions
- Cost structure assumptions
- Headcount plan summary

**Section 3: Revenue Projections**
Monthly/quarterly tables showing:
```
| Month | New Customers | Total Customers | MRR | ARR | Growth % |
|-------|---------------|-----------------|-----|-----|----------|
```

**Section 4: Cost Breakdown**
```
| Department | Year 1 | Year 2 | Year 3 | % Revenue |
|------------|--------|--------|--------|-----------|
| COGS       | $X     | $Y     | $Z     | XX%       |
| S&M        | $X     | $Y     | $Z     | XX%       |
| R&D        | $X     | $Y     | $Z     | XX%       |
| G&A        | $X     | $Y     | $Z     | XX%       |
```

**Section 5: Headcount Plan**
```
| Department | Current | Year 1 | Year 2 | Year 3 |
|------------|---------|--------|--------|--------|
| Engineering| X       | Y      | Z      | W      |
```

**Section 6: Cash Flow Analysis**
```
| Quarter | Revenue | Expenses | Net Burn | Cash Balance | Runway |
|---------|---------|----------|----------|--------------|--------|
```

**Section 7: Key Metrics**
```
| Metric | Year 1 | Year 2 | Year 3 | Target |
|--------|--------|--------|--------|--------|
| CAC | $X | $Y | $Z | <$A |
| LTV | $X | $Y | $Z | >$B |
| Burn Multiple | X | Y | Z | <2.0 |
```

**Section 8: Scenario Analysis**
```
| Scenario | Year 3 ARR | Customers | Burn | Runway |
|----------|------------|-----------|------|--------|
| Conservative | $Xم | Y | $Z | W mo |
| Base | $X | Y | $Z | W mo |
| Optimistic | $X | Y | $Z | W mo |
```

**Section 9: Funding Requirements**
- Amount needed
- Use of proceeds breakdown
- Milestones to achieve
- Expected valuation impact

**Section 10: Validation**
- Sanity checks performed
- Benchmark comparisons
- Risk factors
- Assumptions to monitor

### Step 10: Save Model

Offer to save as markdown file:
- Suggest filename: `financial-projections-YYYY-MM-DD.md`
- Include note that user can convert to Excel/Sheets
- Provide formulas for key calculations

## Financial Model Best Practices

**Do:**
- Use cohort-based revenue model
- Include 3 scenarios
- Show monthly detail (Year 1-2)
- Calculate key metrics
- Validate against benchmarks
- Document all assumptions
- Show cash flow and runway
- Include fundraising milestones

**Don't:**
- Be overly optimistic on growth
- Underestimate costs
- Forget fully-loaded compensation
- Ignore cash timing
- Skip scenario analysis
- Use static headcount
- Forget to validate

## Integration with Other Commands

Pairs well with:
- `/market-opportunity` - Use SOM for revenue ceiling
- `/business-case` - Include projections in business case

## Example Usage

```
User: /financial-projections

Claude: I'll create a comprehensive financial model for your startup. Let me gather the key inputs.

What's your business model?
→ "B2B SaaS, subscription-based"

Current state?
→ "$50K MRR, 100 customers, 5-person team, $500K cash"

Growth assumptions?
→ "Expect 15% MoM growth, 10% monthly churn, $500 ACV"

[Claude builds complete model with all sections]
```

## Notes

- Model building takes 45-90 minutes
- Results in comprehensive planning tool
- Update monthly to track vs. actuals
- Share with investors and board
- Use for fundraising decks
- Basis for budget and hiring decisions

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
