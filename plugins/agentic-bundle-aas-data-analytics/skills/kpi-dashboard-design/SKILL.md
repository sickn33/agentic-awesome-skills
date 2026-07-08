---
name: kpi-dashboard-design
description: "Comprehensive patterns for designing effective Key Performance Indicator (KPI) dashboards that drive business decisions."
risk: unknown
source: community
date_added: "2026-02-27"
---

# KPI Dashboard Design

Comprehensive patterns for designing effective Key Performance Indicator (KPI) dashboards that drive business decisions.

## Do not use this skill when

- The task is unrelated to kpi dashboard design
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Designing executive dashboards
- Selecting meaningful KPIs
- Building real-time monitoring displays
- Creating department-specific metrics views
- Improving existing dashboard layouts
- Establishing metric governance

## Core Concepts

### 1. KPI Framework

| Level           | Focus            | Update Frequency  | Audience   |
| --------------- | ---------------- | ----------------- | ---------- |
| **Strategic**   | Long-term goals  | Monthly/Quarterly | Executives |
| **Tactical**    | Department goals | Weekly/Monthly    | Managers   |
| **Operational** | Day-to-day       | Real-time/Daily   | Teams      |

### 2. SMART KPIs

```
Specific: Clear definition
Measurable: Quantifiable
Achievable: Realistic targets
Relevant: Aligned to goals
Time-bound: Defined period
```

### 3. Dashboard Hierarchy

```
├── Executive Summary (1 page)
│   ├── 4-6 headline KPIs
│   ├── Trend indicators
│   └── Key alerts
├── Department Views
│   ├── Sales Dashboard
│   ├── Marketing Dashboard
│   ├── Operations Dashboard
│   └── Finance Dashboard
└── Detailed Drilldowns
    ├── Individual metrics
    └── Root cause analysis
```

## Common KPIs by Department

### Sales KPIs

```yaml
Revenue Metrics:
  - Monthly Recurring Revenue (MRR)
  - Annual Recurring Revenue (ARR)
  - Average Revenue Per User (ARPU)
  - Revenue Growth Rate

Pipeline Metrics:
  - Sales Pipeline Value
  - Win Rate
  - Average Deal Size
  - Sales Cycle Length

Activity Metrics:
  - Calls/Emails per Rep
  - Demos Scheduled
  - Proposals Sent
  - Close Rate
```

### Marketing KPIs

```yaml
Acquisition:
  - Cost Per Acquisition (CPA)
  - Customer Acquisition Cost (CAC)
  - Lead Volume
  - Marketing Qualified Leads (MQL)

Engagement:
  - Website Traffic
  - Conversion Rate
  - Email Open/Click Rate
  - Social Engagement

ROI:
  - Marketing ROI
  - Campaign Performance
  - Channel Attribution
  - CAC Payback Period
```

### Product KPIs

```yaml
Usage:
  - Daily/Monthly Active Users (DAU/MAU)
  - Session Duration
  - Feature Adoption Rate
  - Stickiness (DAU/MAU)

Quality:
  - Net Promoter Score (NPS)
  - Customer Satisfaction (CSAT)
  - Bug/Issue Count
  - Time to Resolution

Growth:
  - User Growth Rate
  - Activation Rate
  - Retention Rate
  - Churn Rate
```

### Finance KPIs

```yaml
Profitability:
  - Gross Margin
  - Net Profit Margin
  - EBITDA
  - Operating Margin

Liquidity:
  - Current Ratio
  - Quick Ratio
  - Cash Flow
  - Working Capital

Efficiency:
  - Revenue per Employee
  - Operating Expense Ratio
  - Days Sales Outstanding
  - Inventory Turnover
```

## Dashboard Layout Patterns

### Pattern 1: Executive Summary

```
┌─────────────────────────────────────────────────────────────┐
│  EXECUTIVE DASHBOARD                        [Date Range ▼]  │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│   REVENUE   │   PROFIT    │  CUSTOMERS  │    NPS SCORE    │
│   $2.4M     │    $450K    │    12,450   │       72        │
│   ▲ 12%     │    ▲ 8%     │    ▲ 15%    │     ▲ 5pts     │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│                                                             │
│  Revenue Trend                    │  Revenue by Product     │
│  ┌───────────────────────┐       │  ┌──────────────────┐   │
│  │    /\    /\          │       │  │ ████████ 45%     │   │
│  │   /  \  /  \    /\   │       │  │ ██████   32%     │   │
│  │  /    \/    \  /  \  │       │  │ ████     18%     │   │
│  │ /            \/    \ │       │  │ ██        5%     │   │
│  └───────────────────────┘       │  └──────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🔴 Alert: Churn rate exceeded threshold (>5%)              │
│  🟡 Warning: Support ticket volume 20% above average        │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 2: SaaS Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  SAAS METRICS                     Jan 2024  [Monthly ▼]     │
├──────────────────────┬──────────────────────────────────────┤
│  ┌────────────────┐  │  MRR GROWTH                          │
│  │      MRR       │  │  ┌────────────────────────────────┐  │
│  │    $125,000    │  │  │                          /──   │  │
│  │     ▲ 8%       │  │  │                    /────/      │  │
│  └────────────────┘  │  │              /────/            │  │
│  ┌────────────────┐  │  │        /────/                  │  │
│  │      ARR       │  │  │   /────/                       │  │
│  │   $1,500,000   │  │  └────────────────────────────────┘  │
│  │     ▲ 15%      │  │  J  F  M  A  M  J  J  A  S  O  N  D  │
│  └────────────────┘  │                                      │
├──────────────────────┼──────────────────────────────────────┤
│  UNIT ECONOMICS      │  COHORT RETENTION                    │
│                      │                                      │
│  CAC:     $450       │  Month 1: ████████████████████ 100%  │
│  LTV:     $2,700     │  Month 3: █████████████████    85%   │
│  LTV/CAC: 6.0x       │  Month 6: ████████████████     80%   │
│                      │  Month 12: ██████████████      72%   │
│  Payback: 4 months   │                                      │
├──────────────────────┴──────────────────────────────────────┤
│  CHURN ANALYSIS                                             │
│  ┌──────────┬──────────┬──────────┬──────────────────────┐ │
│  │ Gross    │ Net      │ Logo     │ Expansion            │ │
│  │ 4.2%     │ 1.8%     │ 3.1%     │ 2.4%                 │ │
│  └──────────┴──────────┴──────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 3: Real-time Operations

```
┌─────────────────────────────────────────────────────────────┐
│  OPERATIONS CENTER                    Live ● Last: 10:42:15 │
├────────────────────────────┬────────────────────────────────┤
│  SYSTEM HEALTH             │  SERVICE STATUS                │
│  ┌──────────────────────┐  │                                │
│  │   CPU    MEM    DISK │  │  ● API Gateway      Healthy    │
│  │   45%    72%    58%  │  │  ● User Service     Healthy    │
│  │   ███    ████   ███  │  │  ● Payment Service  Degraded   │
│  │   ███    ████   ███  │  │  ● Database         Healthy    │
│  │   ███    ████   ███  │  │  ● Cache            Healthy    │
│  └──────────────────────┘  │                                │
├────────────────────────────┼────────────────────────────────┤
│  REQUEST THROUGHPUT        │  ERROR RATE                    │
│  ┌──────────────────────┐  │  ┌──────────────────────────┐  │
│  │ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅ │  │  │ ▁▁▁▁▁▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁  │  │
│  └──────────────────────┘  │  └──────────────────────────┘  │
│  Current: 12,450 req/s     │  Current: 0.02%                │
│  Peak: 18,200 req/s        │  Threshold: 1.0%               │
├────────────────────────────┴────────────────────────────────┤
│  RECENT ALERTS                                              │
│  10:40  🟡 High latency on payment-service (p99 > 500ms)    │
│  10:35  🟢 Resolved: Database connection pool recovered     │
│  10:22  🔴 Payment service circuit breaker tripped          │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Patterns

### SQL for KPI Calculations

```sql
-- Monthly Recurring Revenue (MRR)
WITH mrr_calculation AS (
    SELECT
        DATE_TRUNC('month', billing_date) AS month,
        SUM(
            CASE subscription_interval
                WHEN 'monthly' THEN amount
                WHEN 'yearly' THEN amount / 12
                WHEN 'quarterly' THEN amount / 3
            END
        ) AS mrr
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY DATE_TRUNC('month', billing_date)
)
SELECT
    month,
    mrr,
    LAG(mrr) OVER (ORDER BY month) AS prev_mrr,
    (mrr - LAG(mrr) OVER (ORDER BY month)) / LAG(mrr) OVER (ORDER BY month) * 100 AS growth_pct
FROM mrr_calculation;

-- Cohort Retention
WITH cohorts AS (
    SELECT
        user_id,
        DATE_TRUNC('month', created_at) AS cohort_month
    FROM users
),
activity AS (
    SELECT
        user_id,
        DATE_TRUNC('month', event_date) AS activity_month
    FROM user_events
    WHERE event_type = 'active_session'
)
SELECT
    c.cohort_month,
    EXTRACT(MONTH FROM age(a.activity_month, c.cohort_month)) AS months_since_signup,
    COUNT(DISTINCT a.user_id) AS active_users,
    COUNT(DISTINCT a.user_id)::FLOAT / COUNT(DISTINCT c.user_id) * 100 AS retention_rate
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id
    AND a.activity_month >= c.cohort_month
GROUP BY c.cohort_month, EXTRACT(MONTH FROM age(a.activity_month, c.cohort_month))
ORDER BY c.cohort_month, months_since_signup;

-- Customer Acquisition Cost (CAC)
SELECT
    DATE_TRUNC('month', acquired_date) AS month,
    SUM(marketing_spend) / NULLIF(COUNT(new_customers), 0) AS cac,
    SUM(marketing_spend) AS total_spend,
    COUNT(new_customers) AS customers_acquired
FROM (
    SELECT
        DATE_TRUNC('month', u.created_at) AS acquired_date,
        u.id AS new_customers,
        m.spend AS marketing_spend
    FROM users u
    JOIN marketing_spend m ON DATE_TRUNC('month', u.created_at) = m.month
    WHERE u.source = 'marketing'
) acquisition
GROUP BY DATE_TRUNC('month', acquired_date);
```

### Python Dashboard Code (Streamlit)

```python
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(page_title="KPI Dashboard", layout="wide")

# Header with date filter
col1, col2 = st.columns([3, 1])
with col1:
    st.title("Executive Dashboard")
with col2:
    date_range = st.selectbox(
        "Period",
        ["Last 7 Days", "Last 30 Days", "Last Quarter", "YTD"]
    )

# KPI Cards
def metric_card(label, value, delta, prefix="", suffix=""):
    delta_color = "green" if delta >= 0 else "red"
    delta_arrow = "▲" if delta >= 0 else "▼"
    st.metric(
        label=label,
        value=f"{prefix}{value:,.0f}{suffix}",
        delta=f"{delta_arrow} {abs(delta):.1f}%"
    )

col1, col2, col3, col4 = st.columns(4)
with col1:
    metric_card("Revenue", 2400000, 12.5, prefix="$")
with col2:
    metric_card("Customers", 12450, 15.2)
with col3:
    metric_card("NPS Score", 72, 5.0)
with col4:
    metric_card("Churn Rate", 4.2, -0.8, suffix="%")

# Charts
col1, col2 = st.columns(2)

with col1:
    st.subheader("Revenue Trend")
    revenue_data = pd.DataFrame({
        'Month': pd.date_range('2024-01-01', periods=12, freq='M'),
        'Revenue': [180000, 195000, 210000, 225000, 240000, 255000,
                    270000, 285000, 300000, 315000, 330000, 345000]
    })
    fig = px.line(revenue_data, x='Month', y='Revenue',
                  line_shape='spline', markers=True)
    fig.update_layout(height=300)
    st.plotly_chart(fig, use_container_width=True)

with col2:
    st.subheader("Revenue by Product")
    product_data = pd.DataFrame({
        'Product': ['Enterprise', 'Professional', 'Starter', 'Other'],
        'Revenue': [45, 32, 18, 5]
    })
    fig = px.pie(product_data, values='Revenue', names='Product',
                 hole=0.4)
    fig.update_layout(height=300)
    st.plotly_chart(fig, use_container_width=True)

# Cohort Heatmap
st.subheader("Cohort Retention")
cohort_data = pd.DataFrame({
    'Cohort': ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    'M0': [100, 100, 100, 100, 100],
    'M1': [85, 87, 84, 86, 88],
    'M2': [78, 80, 76, 79, None],
    'M3': [72, 74, 70, None, None],
    'M4': [68, 70, None, None, None],
})
fig = go.Figure(data=go.Heatmap(
    z=cohort_data.iloc[:, 1:].values,
    x=['M0', 'M1', 'M2', 'M3', 'M4'],
    y=cohort_data['Cohort'],
    colorscale='Blues',
    text=cohort_data.iloc[:, 1:].values,
    texttemplate='%{text}%',
    textfont={"size": 12},
))
fig.update_layout(height=250)
st.plotly_chart(fig, use_container_width=True)

# Alerts Section
st.subheader("Alerts")
alerts = [
    {"level": "error", "message": "Churn rate exceeded threshold (>5%)"},
    {"level": "warning", "message": "Support ticket volume 20% above average"},
]
for alert in alerts:
    if alert["level"] == "error":
        st.error(f"🔴 {alert['message']}")
    elif alert["level"] == "warning":
        st.warning(f"🟡 {alert['message']}")
```

## Best Practices

### Do's

- **Limit to 5-7 KPIs** - Focus on what matters
- **Show context** - Comparisons, trends, targets
- **Use consistent colors** - Red=bad, green=good
- **Enable drilldown** - From summary to detail
- **Update appropriately** - Match metric frequency

### Don'ts

- **Don't show vanity metrics** - Focus on actionable data
- **Don't overcrowd** - White space aids comprehension
- **Don't use 3D charts** - They distort perception
- **Don't hide methodology** - Document calculations
- **Don't ignore mobile** - Ensure responsive design

## Resources

- [Stephen Few's Dashboard Design](https://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf)
- [Edward Tufte's Principles](https://www.edwardtufte.com/tufte/)
- [Google Data Studio Gallery](https://datastudio.google.com/gallery)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
