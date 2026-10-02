---
name: soroban-oracle-data-feed-audit
description: 'DeFi price oracle integration and safety audit register: heartbeat bounds, stale price threshold reversion, and TWAP medianizer validation.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [soroban, oracle, defi, pricing, stellar, security, web3]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Soroban Oracle Data Feed Audit

**What it is:** Tracks decentralized price feed providers, staleness boundaries, and multi-source medianizer logic to prevent oracle manipulation in Soroban protocols.

## Overview

Provides a standardized, auditable framework and data model for **Soroban Oracle Data Feed Audit** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Soroban Oracle Data Feed Audit.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Oracle Feed ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `ORC-001` |
| 2 | Asset Pair Identifier | `text` | `VARCHAR(32)` | `string` | Text | `XLM/USD` |
| 3 | Oracle Contract Address | `text` | `VARCHAR(56)` | `string` | Text | `CORC...` |
| 4 | Max Stale Period Seconds | `number` | `INTEGER` | `number` | Number | `300` |
| 5 | Deviation Threshold Bps | `number` | `INTEGER` | `number` | Number | `100` |
| 6 | TWAP Window Length Seconds | `number` | `INTEGER` | `number` | Number | `1800` |
| 7 | Medianizer Minimum Sources | `number` | `INTEGER` | `number` | Number | `3` |
| 8 | Circuit Breaker Reversion Bound | `select` | `VARCHAR(16)` | `string` | Select | `Yes` |
| 9 | Feed Health Status | `select` | `VARCHAR(32)` | `string` | Select | `Active Healthy` |
| 10 | Last Reported Price | `currency` | `NUMERIC(18,7)` | `number` | Number | `0.1250000` |
| 11 | Audit Verification Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Circuit Breaker Reversion Bound**

```
Yes | No
```

**Feed Health Status**

```
Active Healthy | Stale Alert | Deviation Triggered | Paused
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Soroban Oracle Data Feed Audit for our production environment?
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
- @soroban-storage-ttl-lifecycle - covers ledger rent and TTL extension policy.
- @smart-contract-formal-verification - verifies state invariants mathematically.

## Reusable Prompt

```
I want to establish a verified Soroban Oracle Data Feed Audit register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
