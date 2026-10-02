---
name: web3-rate-limiting-circuit-breaker
description: 'On-chain and relayer rate-limiting circuit breaker register: throughput thresholds, emergency pause triggers, and multi-sig recovery.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [security, rate-limiting, circuit-breaker, defi, infrastructure, web3]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Web3 Rate-Limiting & Circuit Breakers

**What it is:** Establishes automated defensive circuit breakers, rate-limiting windows, and volume surge throttles across Web3 smart contracts and relayers.

## Overview

Provides a standardized, auditable framework and data model for **Web3 Rate-Limiting & Circuit Breakers** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Web3 Rate-Limiting & Circuit Breakers.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Breaker Policy ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `CB-001` |
| 2 | Target Service / Protocol | `text` | `VARCHAR(64)` | `string` | Text | `Soroban Minting Endpoint` |
| 3 | Rate Limit Window Seconds | `number` | `INTEGER` | `number` | Number | `60` |
| 4 | Max Requests Allowed Per Window | `number` | `INTEGER` | `number` | Number | `10` |
| 5 | Volume Spike Surge Cap % | `number` | `NUMERIC(6,2)` | `number` | Number | `300.00` |
| 6 | Circuit Breaker Trigger | `select` | `VARCHAR(64)` | `string` | Select | `Automated Anomaly Detection` |
| 7 | Emergency Pause Activated | `select` | `VARCHAR(16)` | `string` | Select | `No` |
| 8 | Multi-Sig Unfreeze Required | `select` | `VARCHAR(16)` | `string` | Select | `Yes` |
| 9 | Cooldown Duration Minutes | `number` | `INTEGER` | `number` | Number | `30` |
| 10 | Breaker Operational State | `select` | `VARCHAR(32)` | `string` | Select | `Guarded Normal` |
| 11 | Configuration Audit Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Circuit Breaker Trigger**

```
Automated Anomaly Detection | Price Oracle Divergence | Drain Threshold Exceeded | Manual Admin
```

**Emergency Pause Activated**

```
Yes | No
```

**Multi-Sig Unfreeze Required**

```
Yes | No
```

**Breaker Operational State**

```
Guarded Normal | Tripped (Paused) | Cooldown Recovery | Bypass Mode
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Web3 Rate-Limiting & Circuit Breakers for our production environment?
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

- @cross-chain-relayer-audit - covers message hashes, nonces and quorum proofs.
- @smart-contract-formal-verification - verifies state invariants mathematically.
- @soroban-contract-audit - provides the security checklist and vulnerability categorization.

## Reusable Prompt

```
I want to establish a verified Web3 Rate-Limiting & Circuit Breakers register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
