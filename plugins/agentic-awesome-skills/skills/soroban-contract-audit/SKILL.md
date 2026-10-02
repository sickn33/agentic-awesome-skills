---
name: soroban-contract-audit
description: 'Soroban smart contract security audit register: authorization checks, panic pathways, integer overflows, and storage footprint verification for Stellar.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [stellar, soroban, rust, smart-contracts, security, audit, web3]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Soroban Contract Security Audit

**What it is:** Tracks formal security audit findings, authorization invariants, and WASM storage footprint compliance for Soroban Rust smart contracts on Stellar.

## Overview

Provides a standardized, auditable framework and data model for **Soroban Contract Security Audit** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Soroban Contract Security Audit.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Audit Finding ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `AUD-001` |
| 2 | Contract Address | `text` | `VARCHAR(56)` | `string` | Text | `CA3D5K...` |
| 3 | Function Name | `text` | `VARCHAR(64)` | `string` | Text | `transfer_with_approval` |
| 4 | Severity Tier | `select` | `VARCHAR(32)` | `string` | Select | `High` |
| 5 | Vulnerability Class | `select` | `VARCHAR(64)` | `string` | Select | `Missing Auth Check` |
| 6 | Storage Footprint Type | `select` | `VARCHAR(32)` | `string` | Select | `Persistent` |
| 7 | Panic Pathway Present | `select` | `VARCHAR(16)` | `string` | Select | `Yes` |
| 8 | PoC Test Case | `text` | `VARCHAR(255)` | `string` | Text | `test_unauthorized_state_drain` |
| 9 | Remediation Status | `select` | `VARCHAR(32)` | `string` | Select | `Remediated` |
| 10 | Auditor Lead | `text` | `VARCHAR(64)` | `string` | Text | `Ranjeet2063` |
| 11 | Verification Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Severity Tier**

```
Critical | High | Medium | Low | Informational
```

**Vulnerability Class**

```
Missing Auth Check | Integer Overflow | Storage Desync | Reentrancy Variant | Unbounded Loop | Gas Exhaustion
```

**Storage Footprint Type**

```
Instance | Persistent | Temporary
```

**Panic Pathway Present**

```
Yes | No
```

**Remediation Status**

```
Identified | In Progress | Remediated | Risk Accepted
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Soroban Contract Security Audit for our production environment?
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

- @smart-contract-formal-verification - verifies state invariants mathematically.
- @soroban-liquidity-pool - covers AMM invariant and LP-share modelling.
- @soroban-token-minter - covers SEP-41 token supply, admin and event modelling.

## Reusable Prompt

```
I want to establish a verified Soroban Contract Security Audit register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
