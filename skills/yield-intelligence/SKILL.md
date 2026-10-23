---
name: yield-intelligence
description: Passive income portfolio analysis — activate when user asks about dividend yields, Treasury rates, REIT income, monthly passive income goals, or portfolio yield optimization. Scans 4 asset classes, ranks by risk-adjusted return, and builds allocations targeting a specific monthly income.
risk: safe
source: community
date_added: "2026-05-31"
---

# Yield Intelligence

Passive income analysis across US Treasuries, dividend ETFs, REITs, and preferred stocks. Given a target monthly income and investment amount, returns a research comparison and clearly labeled allocation scenarios; it does not establish an optimal portfolio.

## When to Use This Skill

- "I want to generate $X/month in passive income"
- "What are the best dividend ETFs or Treasury rates right now?"
- "Compare REITs vs Treasuries for income generation"
- "How much capital do I need to retire on dividends?"
- "Build me a conservative income portfolio"

## Limitations

- Provides portfolio research support, not personalized financial advice.
- Requires live yield, price, tax, and risk data for current recommendations.
- Does not account for every user-specific constraint unless the user provides it, including jurisdiction, tax status, and liquidity needs.

## Live Data Source (Optional)

If the YIELD INTELLIGENCE MCP server is configured, call it directly for live rates:

**MCP endpoint:** `https://api.intuitek.ai/yield/mcp` (no auth required, open access)

**Tools:**
- `analyze_yield_opportunities` — Scans dividend ETFs, REITs, preferred stocks, and Treasuries; returns ranked opportunities with yield, risk score, and liquidity
- `optimize_income_portfolio` — Builds a portfolio allocation targeting a specific monthly income goal

**Quick config (Claude Desktop / Claude Code):**
```json
{
  "mcpServers": {
    "yield-intelligence": {
      "url": "https://api.intuitek.ai/yield/mcp"
    }
  }
}
```

## Standalone Workflow (No MCP Required)

### Step 1 — Gather Parameters

Ask if not provided:
- **Target monthly income** (e.g., $500)
- **Available capital** (e.g., $100,000)
- **Risk tolerance**: conservative / moderate / aggressive
- **Account type**: taxable / Roth IRA / traditional IRA

### Step 2 — Asset Class Scan

Research or use current yields for these four classes:

Record current issuer/Treasury primary-source data with as-of dates. Compare like measures: Treasury yield-to-maturity, fund SEC yield and trailing distribution yield differ. Separate income from return of capital and do not annualize a single unusual distribution as a reliable forecast. MAIN is a business development company, not a REIT; classify instruments correctly.

### Step 3 — Compare risks explicitly

Use duration, credit/default, equity drawdown, call/reinvestment, currency, liquidity, fees and concentration. An arbitrary yield-times-penalty formula is not a calibrated risk-adjusted return measure; do not label Treasuries zero risk or infer principal stability from yield.

### Step 4 — Build scenarios

Given annualized yield assumptions `y_i`, weights `w_i` summing to one and capital C, modeled gross annual income is `C * Σ(w_i * y_i)`. Monthly equivalent divides that by 12; actual payment dates may be irregular and income can fall. State tax/fee/inflation assumptions and compare a lower-income/distribution-cut scenario. If the target is infeasible within the user’s constraints, show the shortfall rather than concentrating in the highest yield. No trade execution or guarantee follows from this calculation.

### Step 5 — Present Results

```
YIELD INTELLIGENCE REPORT
─────────────────────────────────────────
Target:  $[X]/month    Required yield: [Y]%
Capital: $[Z]          Account:       [type]

OPPORTUNITY SCAN
┌──────────────────┬───────┬──────┬──────────────┐
│ Asset            │ Yield │ Risk │ $/mo per 100K│
├──────────────────┼───────┼──────┼──────────────┤
│ [Top pick]       │  X.X% │  Low │     $XXX     │
└──────────────────┴───────┴──────┴──────────────┘

ILLUSTRATIVE ALLOCATION ($[Z] capital)
  [Asset A]  40%  →  $[amount]  →  $[X]/month
  Modeled monthly equivalent: $[X], before tax/fees; not guaranteed
```

## Best Practices

- ✅ Verify coverage ratios for high-yield REITs before recommending
- ✅ Note duration risk for long-term Treasuries when rates are rising
- ✅ Consider account type tax efficiency (Roth vs. taxable vs. traditional IRA)
- ❌ Don't chase yield without checking dividend sustainability

## Additional Resources

- Repository: [thebrierfox/yield-intelligence-skill](https://github.com/thebrierfox/yield-intelligence-skill)
- MCP server: [thebrierfox/intuitek-ace](https://github.com/thebrierfox/intuitek-ace)
- Built by [IntuiTek¹](https://intuitek.ai) (~K¹) — MIT License
