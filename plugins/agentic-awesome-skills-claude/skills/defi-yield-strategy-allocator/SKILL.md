---
name: defi-yield-strategy-allocator
description: 'Multi-vault automated yield strategy allocation register: APY benchmarks, impermanent loss risk tiers, and rebalancing triggers.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [defi, yield, soroban, vault, liquidity, finance, stellar]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# DeFi Yield Strategy Allocation Register

**What it is:** Monitors capital efficiency, yield compounding schedules, and downside protection bounds across decentralized finance yield protocols.

## Overview

Provides a standardized, auditable framework and data model for **DeFi Yield Strategy Allocation Register** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for DeFi Yield Strategy Allocation Register.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Strategy Allocation ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `YLD-001` |
| 2 | Target Protocol Strategy | `text` | `VARCHAR(64)` | `string` | Text | `Soroban AMM Liquidity Staking` |
| 3 | Allocated Capital Principal | `currency` | `NUMERIC(24,7)` | `number` | Number | `100000.0000000` |
| 4 | Base APY Yield % | `number` | `NUMERIC(6,2)` | `number` | Number | `14.25` |
| 5 | Impermanent Loss Risk Score | `select` | `VARCHAR(32)` | `string` | Select | `Low (Stablecoin Pair)` |
| 6 | Max Protocol Drawdown Cap % | `number` | `NUMERIC(5,2)` | `number` | Number | `5.00` |
| 7 | Automated Harvest Frequency Hours | `number` | `INTEGER` | `number` | Number | `12` |
| 8 | Emergency Unwind Trigger | `select` | `VARCHAR(64)` | `string` | Select | `Price Divergence > 3%` |
| 9 | Capital Allocation Health | `select` | `VARCHAR(32)` | `string` | Select | `Optimum Yield` |
| 10 | Portfolio Manager | `text` | `VARCHAR(64)` | `string` | Text | `Ranjeet2063` |
| 11 | Last Rebalance Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Impermanent Loss Risk Score**

```
Low (Stablecoin Pair) | Moderate (Correlated) | High (Volatile)
```

**Emergency Unwind Trigger**

```
Price Divergence > 3% | TVL Drain > 20% | Oracle Failure
```

**Capital Allocation Health**

```
Optimum Yield | Underperforming | Unwinding | Liquidated
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track DeFi Yield Strategy Allocation Register for our production environment?
```

**Recommended Next Step**

> Generate the unified field schema, SQL DDL migration, and JSON validation schema to register into your system catalog.
>
> Workflow: Define criteria -> Run automated verification -> Record baseline -> Monitor invariants.

## Best Practices

- Enforce strict typing on numerical bounds and currency amounts; avoid unstructured free-text fields for critical states.
- Re-run validation test suites on every state-altering commit or parameter change.
- Keep example data synthetic and isolated from production cryptographic keys or private endpoints.

## Limitations

- Provides architectural specifications, data models, and verification schemas; does not execute direct transaction signing without authorized external tooling.
- Requires network connectivity and valid RPC credentials when querying on-chain states.

## Security & Safety Notes

- All parameters declare `risk: safe`. No unauthorized state modification or privileged credential access is performed.
- Use synthetic dummy keys and mock addresses in test suites and local verification scripts.

## Common Pitfalls

- **Problem:** Mismatched decimal precision between contract runtime and database register.
  **Solution:** Always verify decimals using the explicit field mapping in this reference.
- **Problem:** Missing authorization checks prior to state update.
  **Solution:** Cross-validate against the Security Audit register before deployment.

## Related Skills

- @soroban-liquidity-pool - covers AMM invariant and LP-share modelling.
- @web3-rate-limiting-circuit-breaker - provides operational guardrails and threshold breakers.
- @soroban-oracle-data-feed-audit - covers oracle heartbeat and stale-price handling.

## Reusable Prompt

```
I want to establish a verified DeFi Yield Strategy Allocation Register register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
