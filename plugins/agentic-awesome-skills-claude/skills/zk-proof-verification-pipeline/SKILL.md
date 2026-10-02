---
name: zk-proof-verification-pipeline
description: 'Zero-knowledge cryptographic verification pipeline register: proving system, circuit verification keys, public inputs, and gas costs.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [zk, zero-knowledge, snark, cryptography, privacy, soroban, web3]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Zero-Knowledge Proof Verification Pipeline

**What it is:** Registers zero-knowledge SNARK proof verification keys, circuit complexity constraints, and nullifier tracking to prevent double-spending in privacy systems.

## Overview

Provides a standardized, auditable framework and data model for **Zero-Knowledge Proof Verification Pipeline** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Zero-Knowledge Proof Verification Pipeline.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | ZK Verification ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `ZK-001` |
| 2 | Proving System Architecture | `select` | `VARCHAR(64)` | `string` | Select | `Groth16 (BN254)` |
| 3 | Circuit Identifier | `text` | `VARCHAR(64)` | `string` | Text | `private_identity_membership` |
| 4 | Public Inputs Count | `number` | `INTEGER` | `number` | Number | `4` |
| 5 | Verification Key Hash | `text` | `VARCHAR(64)` | `string` | Text | `0x98f4a...` |
| 6 | Proof Generation Time Ms | `number` | `INTEGER` | `number` | Number | `420` |
| 7 | On-Chain Verification Gas | `number` | `INTEGER` | `number` | Number | `185000` |
| 8 | Nullifier Collision Checked | `select` | `VARCHAR(16)` | `string` | Select | `Yes` |
| 9 | Proof Verification Verdict | `select` | `VARCHAR(32)` | `string` | Select | `Cryptographically Valid` |
| 10 | Cryptographer Reviewer | `text` | `VARCHAR(64)` | `string` | Text | `Ranjeet2063` |
| 11 | Verification Timestamp | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Proving System Architecture**

```
Groth16 (BN254) | Plonk (KZG) | Halo2 | STARK
```

**Nullifier Collision Checked**

```
Yes | No
```

**Proof Verification Verdict**

```
Cryptographically Valid | Invalid Proof State | Malformed Inputs
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Zero-Knowledge Proof Verification Pipeline for our production environment?
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
- @soroban-contract-audit - provides the security checklist and vulnerability categorization.
- @cross-chain-relayer-audit - covers message hashes, nonces and quorum proofs.

## Reusable Prompt

```
I want to establish a verified Zero-Knowledge Proof Verification Pipeline register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
