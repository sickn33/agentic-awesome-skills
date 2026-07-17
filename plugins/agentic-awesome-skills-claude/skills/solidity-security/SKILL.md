---
name: solidity-security
description: "Review Solidity contracts for reentrancy, access-control, arithmetic, oracle, upgrade, and deployment risks. Use for project-specific test and audit preparation, never as certification or deployment approval."
risk: critical
source: community
date_added: "2026-02-27"
---

# Solidity Security

Review Solidity contracts and prepare project-specific security evidence without treating examples or tool output as certification or deployment approval.

## Use this skill when

- Writing secure smart contracts
- Auditing existing contracts for vulnerabilities
- Implementing secure DeFi protocols
- Preventing reentrancy, overflow, and access control issues
- Optimizing gas usage while maintaining security
- Preparing contracts for professional audits
- Understanding common attack vectors

## Do not use this skill when

- The task is unrelated to solidity security
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Pin the Solidity compiler, dependency, chain, proxy, and test-tool versions before recommending code.
- Treat examples as review aids, not deployment-ready contracts. Require project-specific tests, independent audit, and an explicit human deployment approval.
- Never deploy, upgrade, pause, transfer assets, change roles, or submit a transaction without confirming the network, signer, addresses, simulation, rollback plan, and user approval.
- Apply relevant best practices and validate outcomes with static analysis, unit tests, fuzzing, invariant tests, and a fork or testnet simulation as appropriate.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, formal review, or an independent professional audit.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
