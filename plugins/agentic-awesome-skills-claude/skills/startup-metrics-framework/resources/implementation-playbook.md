# Startup Metrics Framework Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Startup Metrics Framework

Comprehensive guide to tracking, calculating, and optimizing key performance metrics for different startup business models from seed through Series A.

## Overview

Track the right metrics at the right stage. Focus on unit economics, growth efficiency, and cash management metrics that matter for fundraising and operational excellence.

## Universal Startup Metrics

### Revenue Metrics

**MRR (Monthly Recurring Revenue)**
```
MRR = Σ (Active Subscriptions × Monthly Price)
```

**ARR (Annual Recurring Revenue)**
```
ARR = MRR × 12
```

**Growth Rate**
```
MoM Growth = (This Month MRR - Last Month MRR) / Last Month MRR
YoY Growth = (This Year ARR - Last Year ARR) / Last Year ARR
```

**Target Benchmarks:**
- Seed stage: 15-20% MoM growth
- Series A: 10-15% MoM growth, 3-5x YoY
- Series B+: 100%+ YoY (Rule of 40)

### Unit Economics

**CAC (Customer Acquisition Cost)**
```
CAC = Total S&M Spend / New Customers Acquired
```

Include: Sales salaries, marketing spend, tools, overhead

**LTV (Lifetime Value)**
```
LTV = ARPU × Gross Margin% × (1 / Churn Rate)
```

Simplified:
```
LTV = ARPU × Average Customer Lifetime × Gross Margin%
```

**LTV:CAC Ratio**
```
LTV:CAC = LTV / CAC
```

**Benchmarks:**
- LTV:CAC > 3.0 = Healthy
- LTV:CAC 1.0-3.0 = Needs improvement
- LTV:CAC < 1.0 = Unsustainable

**CAC Payback Period**
```
CAC Payback = CAC / (ARPU × Gross Margin%)
```

**Benchmarks:**
- < 12 months = Excellent
- 12-18 months = Good
- > 24 months = Concerning

### Cash Efficiency Metrics

**Burn Rate**
```
Monthly Burn = Monthly Revenue - Monthly Expenses
```

Negative burn = losing money (typical early-stage)

**Runway**
```
Runway (months) = Cash Balance / Monthly Burn Rate
```

**Target:** Always maintain 12-18 months runway

**Burn Multiple**
```
Burn Multiple = Net Burn / Net New ARR
```

**Benchmarks:**
- < 1.0 = Exceptional efficiency
- 1.0-1.5 = Good
- 1.5-2.0 = Acceptable
- > 2.0 = Inefficient

Lower is better (spending less to generate ARR)

## SaaS Metrics

### Revenue Composition

**New MRR**
New customers × ARPU

**Expansion MRR**
Upsells and cross-sells from existing customers

**Contraction MRR**
Downgrades from existing customers

**Churned MRR**
Lost customers

**Net New MRR Formula:**
```
Net New MRR = New MRR + Expansion MRR - Contraction MRR - Churned MRR
```

### Retention Metrics

**Logo Retention**
```
Logo Retention = (Customers End - New Customers) / Customers Start
```

**Dollar Retention (NDR - Net Dollar Retention)**
```
NDR = (ARR Start + Expansion - Contraction - Churn) / ARR Start
```

**Benchmarks:**
- NDR > 120% = Best-in-class
- NDR 100-120% = Good
- NDR < 100% = Needs work

**Gross Retention**
```
Gross Retention = (ARR Start - Churn - Contraction) / ARR Start
```

**Benchmarks:**
- > 90% = Excellent
- 85-90% = Good
- < 85% = Concerning

### SaaS-Specific Metrics

**Magic Number**
```
Magic Number = Net New ARR (quarter) / S&M Spend (prior quarter)
```

**Benchmarks:**
- > 0.75 = Efficient, ready to scale
- 0.5-0.75 = Moderate efficiency
- < 0.5 = Inefficient, don't scale yet

**Rule of 40**
```
Rule of 40 = Revenue Growth Rate% + Profit Margin%
```

**Benchmarks:**
- > 40% = Excellent
- 20-40% = Acceptable
- < 20% = Needs improvement

**Example:**
50% growth + (10%) margin = 40% ✓

**Quick Ratio**
```
Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
```

**Benchmarks:**
- > 4.0 = Healthy growth
- 2.0-4.0 = Moderate
- < 2.0 = Churn problem

## Marketplace Metrics

### GMV (Gross Merchandise Value)

**Total Transaction Volume:**
```
GMV = Σ (Transaction Value)
```

**Growth Rate:**
```
GMV Growth Rate = (Current Period GMV - Prior Period GMV) / Prior Period GMV
```

**Target:** 20%+ MoM early-stage

### Take Rate

```
Take Rate = Net Revenue / GMV
```

**Typical Ranges:**
- Payment processors: 2-3%
- E-commerce marketplaces: 10-20%
- Service marketplaces: 15-25%
- High-value B2B: 5-15%

### Marketplace Liquidity

**Time to Transaction**
How long from listing to sale/match?

**Fill Rate**
% of requests that result in transaction

**Repeat Rate**
% of users who transact multiple times

**Benchmarks:**
- Fill rate > 80% = Strong liquidity
- Repeat rate > 60% = Strong retention

### Marketplace Balance

**Supply/Demand Ratio:**
Track relative growth of supply and demand sides.

**Warning Signs:**
- Too much supply: Low fill rates, frustrated suppliers
- Too much demand: Long wait times, frustrated customers

**Goal:** Balanced growth (1:1 ratio ideal, but varies by model)

## Consumer/Mobile Metrics

### Engagement Metrics

**DAU (Daily Active Users)**
Unique users active each day

**MAU (Monthly Active Users)**
Unique users active each month

**DAU/MAU Ratio**
```
DAU/MAU = DAU / MAU
```

**Benchmarks:**
- > 50% = Exceptional (daily habit)
- 20-50% = Good
- < 20% = Weak engagement

**Session Frequency**
Average sessions per user per day/week

**Session Duration**
Average time spent per session

### Retention Curves

**Day 1 Retention:** % users who return next day
**Day 7 Retention:** % users active 7 days after signup
**Day 30 Retention:** % users active 30 days after signup

**Benchmarks (Day 30):**
- > 40% = Excellent
- 25-40% = Good
- < 25% = Weak

**Retention Curve Shape:**
- Flattening curve = good (users becoming habitual)
- Steep decline = poor product-market fit

### Viral Coefficient (K-Factor)

```
K-Factor = Invites per User × Invite Conversion Rate
```

**Example:**
10 invites/user × 20% conversion = 2.0 K-factor

**Benchmarks:**
- K > 1.0 = Viral growth
- K = 0.5-1.0 = Strong referrals
- K < 0.5 = Weak virality

## B2B Metrics

### Sales Efficiency

**Win Rate**
```
Win Rate = Deals Won / Total Opportunities
```

**Target:** 20-30% for new sales team, 30-40% mature

**Sales Cycle Length**
Average days from opportunity to close

**Shorter is better:**
- SMB: 30-60 days
- Mid-market: 60-120 days
- Enterprise: 120-270 days

**Average Contract Value (ACV)**
```
ACV = Total Contract Value / Contract Length (years)
```

### Pipeline Metrics

**Pipeline Coverage**
```
Pipeline Coverage = Total Pipeline Value / Quota
```

**Target:** 3-5x coverage (3-5x pipeline needed to hit quota)

**Conversion Rates by Stage:**
- Lead → Opportunity: 10-20%
- Opportunity → Demo: 50-70%
- Demo → Proposal: 30-50%
- Proposal → Close: 20-40%

## Metrics by Stage

### Pre-Seed (Product-Market Fit)

**Focus Metrics:**
1. Active users growth
2. User retention (Day 7, Day 30)
3. Core engagement (sessions, features used)
4. Qualitative feedback (NPS, interviews)

**Don't worry about:**
- Revenue (may be zero)
- CAC (not optimizing yet)
- Unit economics

### Seed ($500K-$2M ARR)

**Focus Metrics:**
1. MRR growth rate (15-20% MoM)
2. CAC and LTV (establish baseline)
3. Gross retention (> 85%)
4. Core product engagement

**Start tracking:**
- Sales efficiency
- Burn rate and runway

### Series A ($2M-$10M ARR)

**Focus Metrics:**
1. ARR growth (3-5x YoY)
2. Unit economics (LTV:CAC > 3, payback < 18 months)
3. Net dollar retention (> 100%)
4. Burn multiple (< 2.0)
5. Magic number (> 0.5)

**Mature tracking:**
- Rule of 40
- Sales efficiency
- Pipeline coverage

## Metric Tracking Best Practices

### Data Infrastructure

**Requirements:**
- Single source of truth (analytics platform)
- Real-time or daily updates
- Automated calculations
- Historical tracking

**Tools:**
- Mixpanel, Amplitude (product analytics)
- ChartMogul, Baremetrics (SaaS metrics)
- Looker, Tableau (BI dashboards)

### Reporting Cadence

**Daily:**
- MRR, active users
- Sign-ups, conversions

**Weekly:**
- Growth rates
- Retention cohorts
- Sales pipeline

**Monthly:**
- Full metric suite
- Board reporting
- Investor updates

**Quarterly:**
- Trend analysis
- Benchmarking
- Strategy review

### Common Mistakes

**Mistake 1: Vanity Metrics**
Don't focus on:
- Total users (without retention)
- Page views (without engagement)
- Downloads (without activation)

Focus on actionable metrics tied to value.

**Mistake 2: Too Many Metrics**
Track 5-7 core metrics intensely, not 50 loosely.

**Mistake 3: Ignoring Unit Economics**
CAC and LTV are critical even at seed stage.

**Mistake 4: Not Segmenting**
Break down metrics by customer segment, channel, cohort.

**Mistake 5: Gaming Metrics**
Optimize for real business outcomes, not dashboard numbers.

## Investor Metrics

### What VCs Want to See

**Seed Round:**
- MRR growth rate
- User retention
- Early unit economics
- Product engagement

**Series A:**
- ARR and growth rate
- CAC payback < 18 months
- LTV:CAC > 3.0
- Net dollar retention > 100%
- Burn multiple < 2.0

**Series B+:**
- Rule of 40 > 40%
- Efficient growth (magic number)
- Path to profitability
- Market leadership metrics

### Metric Presentation

**Dashboard Format:**
```
Current MRR: $250K (↑ 18% MoM)
ARR: $3.0M (↑ 280% YoY)
CAC: $1,200 | LTV: $4,800 | LTV:CAC = 4.0x
NDR: 112% | Logo Retention: 92%
Burn: $180K/mo | Runway: 18 months
```

**Include:**
- Current value
- Growth rate or trend
- Context (target, benchmark)

## Additional Resources

### Reference Files
- **`references/metric-definitions.md`** - Complete definitions and formulas for 50+ metrics
- **`references/benchmarks-by-stage.md`** - Target ranges for each metric by company stage
- **`references/calculation-examples.md`** - Step-by-step calculation examples

### Example Files
- **`examples/saas-metrics-dashboard.md`** - Complete metrics suite for B2B SaaS company
- **`examples/marketplace-metrics.md`** - Marketplace-specific metrics with examples
- **`examples/investor-metrics-deck.md`** - How to present metrics for fundraising

## Quick Start

To implement startup metrics framework:

1. **Identify business model** - SaaS, marketplace, consumer, B2B
2. **Choose 5-7 core metrics** - Based on stage and model
3. **Establish tracking** - Set up analytics and dashboards
4. **Calculate unit economics** - CAC, LTV, payback
5. **Set targets** - Use benchmarks for goals
6. **Review regularly** - Weekly for core metrics
7. **Share with team** - Align on goals and progress
8. **Update investors** - Monthly/quarterly reporting

For detailed definitions, benchmarks, and examples, see `references/` and `examples/`.
