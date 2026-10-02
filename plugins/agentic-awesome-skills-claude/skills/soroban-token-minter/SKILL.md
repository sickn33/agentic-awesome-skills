---
name: soroban-token-minter
description: 'Soroban SEP-41 token contract architecture register: admin control, supply caps, metadata standard, and transfer event emissions on Stellar.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [stellar, soroban, token, sep-41, defi, web3, rust]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Soroban Token Minting Architecture

**What it is:** Maintains technical specifications, supply parameters, and administrative controls for SEP-41 compliant fungible token implementations on Soroban.

## Overview

Provides a standardized, auditable framework and data model for **Soroban Token Minting Architecture** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Soroban Token Minting Architecture.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Token Registry ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `TOK-001` |
| 2 | Token Symbol | `text` | `VARCHAR(12)` | `string` | Text | `FOX` |
| 3 | Token Name | `text` | `VARCHAR(64)` | `string` | Text | `GrantFox Utility Token` |
| 4 | Decimals | `number` | `INTEGER` | `number` | Number | `7` |
| 5 | Total Supply Cap | `currency` | `NUMERIC(24,7)` | `number` | Number | `10000000.0000000` |
| 6 | Admin Address | `text` | `VARCHAR(56)` | `string` | Text | `GA7QY...` |
| 7 | SEP-41 Interface Compliant | `select` | `VARCHAR(16)` | `string` | Select | `Yes` |
| 8 | Clawback Enabled | `select` | `VARCHAR(16)` | `string` | Select | `No` |
| 9 | Mint Rate Limit Per Epoch | `number` | `INTEGER` | `number` | Number | `50000` |
| 10 | Contract Lifecycle State | `select` | `VARCHAR(32)` | `string` | Select | `Active` |
| 11 | Deployment Timestamp | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**SEP-41 Interface Compliant**

```
Yes | No
```

**Clawback Enabled**

```
Yes | No
```

**Contract Lifecycle State**

```
Draft | Testnet Deployed | Audited | Mainnet Live | Paused | Deprecated
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Soroban Token Minting Architecture for our production environment?
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
- @soroban-liquidity-pool - covers AMM invariant and LP-share modelling.
- @stellar-anchor-integration - covers SEP-10 and SEP-24 anchor compliance flows.

## Reusable Prompt

```
I want to establish a verified Soroban Token Minting Architecture register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
