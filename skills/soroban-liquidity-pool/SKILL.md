---
name: soroban-liquidity-pool
description: 'Automated market maker liquidity pool register: constant-product invariant curves, swap fee tiers, and LP token shares for Soroban DeFi.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [soroban, amm, liquidity, stellar, dex, defi, rust]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Soroban Liquidity Pool Architecture

**What it is:** Tracks automated market maker (AMM) liquidity pools, mathematical invariant boundaries, and token reserve ratios on Soroban DeFi networks.

## Overview

Provides a standardized, auditable framework and data model for **Soroban Liquidity Pool Architecture** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Soroban Liquidity Pool Architecture.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Pool Pair ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `POOL-001` |
| 2 | Token A Contract | `text` | `VARCHAR(56)` | `string` | Text | `CASWAP1...` |
| 3 | Token B Contract | `text` | `VARCHAR(56)` | `string` | Text | `CASWAP2...` |
| 4 | Invariant Model | `select` | `VARCHAR(32)` | `string` | Select | `Constant Product (xy=k)` |
| 5 | Fee Basis Points | `number` | `INTEGER` | `number` | Number | `30` |
| 6 | Token A Reserve | `currency` | `NUMERIC(24,7)` | `number` | Number | `250000.0000000` |
| 7 | Token B Reserve | `currency` | `NUMERIC(24,7)` | `number` | Number | `125000.0000000` |
| 8 | Total LP Shares Issued | `currency` | `NUMERIC(24,7)` | `number` | Number | `176776.6952966` |
| 9 | Slippage Tolerance Bps | `number` | `INTEGER` | `number` | Number | `50` |
| 10 | Pool Health Status | `select` | `VARCHAR(32)` | `string` | Select | `Balanced` |
| 11 | Last Rebalance Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Invariant Model**

```
Constant Product (xy=k) | StableSwap Curve | Concentrated Liquidity
```

**Pool Health Status**

```
Balanced | Impermanent Divergence | High Volatility | Frozen
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Soroban Liquidity Pool Architecture for our production environment?
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

- @soroban-contract-audit - provides the security checklist and vulnerability categorization.
- @soroban-token-minter - covers SEP-41 token supply, admin and event modelling.
- @web3-rate-limiting-circuit-breaker - provides operational guardrails and threshold breakers.

## Reusable Prompt

```
I want to establish a verified Soroban Liquidity Pool Architecture register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
