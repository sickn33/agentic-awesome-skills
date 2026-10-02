---
name: smart-contract-formal-verification
description: 'Foundry and Soroban formal invariant verification register: state transition rules, boundary invariant properties, and symbolic execution checks.'
category: engineering
risk: safe
source: self
source_type: self
date_added: "2026-10-01"
author: Ranjeet2063
tags: [formal-verification, invariants, foundry, soroban, security, math]
tools: []
source_repo: Ranjeet2063/agentic-awesome-skills
---

# Smart Contract Formal Verification

**What it is:** Applies rigorous mathematical invariant proofs, symbolic execution engines, and property-based fuzz tests to verify smart contract safety.

## Overview

Provides a standardized, auditable framework and data model for **Smart Contract Formal Verification** operations across distributed engineering and decentralized application systems.

## When to Use This Skill

- When formalizing architectural contracts, security invariants, or operational limits for Smart Contract Formal Verification.
- When cross-functional review is required between protocol developers, smart contract auditors, and AI engineering agents.
- When generating reproducible CSV, SQL DDL, JSON Schema, and Notion property registers for tracking compliance.

## How It Works

1. Define the parameters, thresholds, and identity bindings required for the target operational register.
2. Select appropriate boundary enforcement values from validated enum select sets.
3. Export standardized artifacts (CSV table, SQL DDL, JSON Schema) to integrate into validation CI pipelines.

## Field Reference

| # | Field Name | Type | SQL Type | JSON Schema Type | Notion Property Type | Example Value |
|---|------------|------|----------|------------------|----------------------|---------------|
| 1 | Formal Spec ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `SPEC-001` |
| 2 | Target Contract Module | `text` | `VARCHAR(64)` | `string` | Text | `vault_liquidity_engine` |
| 3 | State Transition Property | `text` | `VARCHAR(128)` | `string` | Text | `Total Assets Equals Sum of Shares` |
| 4 | Verification Method | `select` | `VARCHAR(64)` | `string` | Select | `Foundry Invariant Fuzzing` |
| 5 | Fuzz Runs Count | `number` | `INTEGER` | `number` | Number | `100000` |
| 6 | Symbolic Execution Engine | `select` | `VARCHAR(32)` | `string` | Select | `Certora Prover` |
| 7 | Counterexample Discovered | `select` | `VARCHAR(16)` | `string` | Select | `No` |
| 8 | Mathematical Theorem Proved | `select` | `VARCHAR(16)` | `string` | Select | `Yes` |
| 9 | Invariant Violation Tolerance | `currency` | `NUMERIC(14,2)` | `number` | Number | `0.00` |
| 10 | Formal Verification Status | `select` | `VARCHAR(32)` | `string` | Select | `Formally Verified` |
| 11 | Proof Generation Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-01` |

## Select Options

**Verification Method**

```
Foundry Invariant Fuzzing | Halmos Symbolic Execution | Certora Rule Prover | SMT Solver
```

**Symbolic Execution Engine**

```
Certora Prover | Halmos | Z3 SMT | None (Fuzzing Only)
```

**Counterexample Discovered**

```
Yes | No
```

**Mathematical Theorem Proved**

```
Yes | No
```

**Formal Verification Status**

```
Formally Verified | Violations Found | Proof In Progress
```

## Relations

- `Audit Reference` -> links to the formal review documentation or test repository.
- `Target Architecture` -> links to the deployed contract or autonomous agent runtime component.

## Examples

**Prompt**

```
How do I configure and track Smart Contract Formal Verification for our production environment?
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
- @web3-rate-limiting-circuit-breaker - provides operational guardrails and threshold breakers.
- @cross-chain-relayer-audit - covers message hashes, nonces and quorum proofs.

## Reusable Prompt

```
I want to establish a verified Smart Contract Formal Verification register for our production protocol.
Guide me through the required field parameters and output the corresponding SQL DDL and JSON Schema.
```
