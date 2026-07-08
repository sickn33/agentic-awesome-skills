---
name: yield-intelligence
description: Passive income portfolio analysis — activate when user asks about dividend yields, Treasury rates, REIT income, monthly passive income goals, or portfolio yield optimization. Scans 4 asset classes, ranks by risk-adjusted return, and builds allocations targeting a specific monthly income.
risk: safe
source: community
date_added: "2026-05-31"
---

# Yield Intelligence

Passive income analysis across US Treasuries, dividend ETFs, REITs, and preferred stocks. Given a target monthly income and investment amount, returns a ranked opportunity table and optimal allocation.

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

| Asset Class | Benchmarks | Typical Yield Range |
|---|---|---|
| US Treasuries | 1-yr, 5-yr, 10-yr, 30-yr | 4.0–5.5% |
| Dividend ETFs | SCHD, VYM, JEPI, JEPQ | 3.5–10% |
| REITs | O, MAIN, STAG | 4–12% |
| Preferred Stocks | PFF, PFFD | 5–7% |

### Step 3 — Score and Rank

Score each opportunity: **yield × (1 − risk_penalty) × liquidity_factor**

| Category | Risk Penalty |
|---|---|
| US Treasuries | 0.00 |
| Investment-grade dividend ETF | 0.05 |
| REIT / preferred | 0.15 |
| High-yield / speculative | 0.25 |

### Step 4 — Build Allocation

Given monthly target **T** and available capital **C**:
1. Sort opportunities by risk-adjusted score (descending)
2. Assign 30–40% to highest-conviction position
3. Diversify remaining 60–70% across 3–5 positions
4. Verify: `Σ(allocation_i × yield_i × C) ≥ T × 12`

Conservative portfolios: cap any single position at 25%.

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

RECOMMENDED ALLOCATION ($[Z] capital)
  [Asset A]  40%  →  $[amount]  →  $[X]/month
  Total monthly income: $[X]/month ✓
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
