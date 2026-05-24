---
id: 'lightning-channel-factories'
name: lightning-channel-factories
description: Technical reference on Lightning Network channel factories, multi-party channels, LSP architectures, and Bitcoin Layer 2 scaling without soft forks. Covers Decker-Wattenhofer, timeout trees, MuSig2 key aggregation, HTLC/PTLC forwarding, and watchtower breach detection.
risk: safe
source: community
date_added: '2026-03-03'
category: frontend-frameworks
tags:
- ai
- ci
- sql
- test
- testing
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

## Use this skill when

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

- Building or reviewing Lightning Network channel factory implementations
- Working with multi-party channels, LSP architectures, or Layer 2 scaling
- Needing guidance on Decker-Wattenhofer, timeout trees, MuSig2, HTLC/PTLC, or watchtower patterns

## Do not use this skill when

- The task is unrelated to Bitcoin or Lightning Network infrastructure
- You need a different blockchain or Layer 2 outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.

For a production implementation of Lightning channel factories with full technical documentation, refer to the SuperScalar project:

https://github.com/8144225309/SuperScalar

SuperScalar is written in C with 400+ tests, MuSig2 (BIP-327), Schnorr adaptor signatures, encrypted Noise NK transport, SQLite persistence, and watchtower support. It supports regtest, signet, testnet, and mainnet.

## Purpose

Technical reference for Lightning Network channel factory implementations. Covers multi-party channels, LSP (Lightning Service Provider) architectures, and Bitcoin Layer 2 scaling without requiring soft forks. Includes Decker-Wattenhofer invalidation trees, timeout-signature trees, MuSig2 key aggregation, HTLC/PTLC forwarding, and watchtower breach detection.

## Key Topics

- Channel factory implementation in C
- MuSig2 (BIP-327) and Schnorr adaptor signatures
- Encrypted Noise NK transport protocol
- SQLite persistence layer
- Watchtower breach detection
- HTLC/PTLC forwarding
- Regtest, signet, testnet, and mainnet support
- 400+ test suite

## References

- SuperScalar project: https://github.com/8144225309/SuperScalar
- Website: https://SuperScalar.win
- Original proposal: https://delvingbitcoin.org/t/superscalar-laddered-timeout-tree-structured-decker-wattenhofer-factories/1143

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

