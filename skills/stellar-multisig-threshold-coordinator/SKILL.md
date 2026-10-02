---
name: stellar-multisig-threshold-coordinator
description: 'Multi-signature signer and threshold coordination register: weight configurations, master key locks, and cosigner quorum thresholds for Stellar.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [stellar, multisig, security, governance, web3, auth]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Stellar Multi-Sig Threshold Coordinator

**What it is:** Maintains cryptographic signer weights, transaction authorization thresholds, and master key security boundaries for multi-signature accounts on Stellar.

## Overview

Provides a standardized, auditable framework and data model for **Stellar Multi-Sig Threshold Coordinator** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Stellar Multi-Sig Threshold Coordinator.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Coordination Record ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `MSIG-001` |
| 2 | Controlled Account ID | `text` | `VARCHAR(56)` | `string` | Text | `GCTRL...` |
| 3 | Low Threshold Weight | `number` | `INTEGER` | `number` | Number | `1` |
| 4 | Medium Threshold Weight | `number` | `INTEGER` | `number` | Number | `2` |
| 5 | High Threshold Weight | `number` | `INTEGER` | `number` | Number | `3` |
| 6 | Master Key Weight | `number` | `INTEGER` | `number` | Number | `0` |
| 7 | Active Signers Count | `number` | `INTEGER` | `number` | Number | `4` |
| 8 | Signer Weight Sum | `number` | `INTEGER` | `number` | Number | `4` |
| 9 | Quorum Configuration State | `select` | `VARCHAR(32)` | `string` | Select | `Secured` |
| 10 | Emergency Override Signer | `text` | `VARCHAR(56)` | `string` | Text | `GEMERG...` |
| 11 | Threshold Audit Timestamp | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Quorum Configuration State**

```
Draft Pending | Secured | Sub-Quorum Warning | Degraded Key
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Stellar Multi-Sig Threshold Coordinator for our production environment?
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

- @stellar-anchor-integration - covers SEP-10 and SEP-24 anchor compliance flows.
- @stellar-escrow-timelock - covers conditional escrow and timelock settlement.
- @soroban-contract-audit - provides the security checklist and vulnerability categorization.

## Reusable Prompt

```
I want to establish a verified Stellar Multi-Sig Threshold Coordinator register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
