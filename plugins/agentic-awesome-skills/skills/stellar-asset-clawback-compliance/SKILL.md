---
name: stellar-asset-clawback-compliance
description: 'Regulated Stellar asset clawback architecture register: issuer authorization flags, claimable balance revocations, and regulatory audit trail.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [stellar, clawback, compliance, fintech, regtech, security]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Stellar Asset Clawback Compliance

**What it is:** Provides an immutable compliance record and operational audit register for executing regulatory clawbacks on CAP-35 compliant Stellar assets.

## Overview

Provides a standardized, auditable framework and data model for **Stellar Asset Clawback Compliance** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Stellar Asset Clawback Compliance.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Clawback Case ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `CLAW-001` |
| 2 | Asset Code | `text` | `VARCHAR(12)` | `string` | Text | `USDC` |
| 3 | Issuer Account ID | `text` | `VARCHAR(56)` | `string` | Text | `GISS...` |
| 4 | Target Account ID | `text` | `VARCHAR(56)` | `string` | Text | `GTGT...` |
| 5 | Clawback Amount | `currency` | `NUMERIC(24,7)` | `number` | Number | `5000.0000000` |
| 6 | Clawback Enabled Flag Verified | `select` | `VARCHAR(16)` | `string` | Select | `Yes` |
| 7 | Legal Regulatory Reference | `text` | `VARCHAR(128)` | `string` | Text | `COURT-ORD-2026-0914` |
| 8 | Clawback Claimable Balance ID | `text` | `VARCHAR(64)` | `string` | Text | `00000000...` |
| 9 | Action Execution State | `select` | `VARCHAR(32)` | `string` | Select | `Executed Confirmed` |
| 10 | Compliance Officer Signoff | `text` | `VARCHAR(64)` | `string` | Text | `Ranjeet Kumar Sah` |
| 11 | Execution Timestamp | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Clawback Enabled Flag Verified**

```
Yes | No
```

**Action Execution State**

```
Initiated Review | Executed Confirmed | Rejected Invalid | Reverted
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Stellar Asset Clawback Compliance for our production environment?
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
- @stellar-multisig-threshold-coordinator - covers signer weights and threshold coordination.
- @soroban-contract-audit - provides the security checklist and vulnerability categorization.

## Reusable Prompt

```
I want to establish a verified Stellar Asset Clawback Compliance register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
