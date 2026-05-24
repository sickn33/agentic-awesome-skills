---
id: 'lightning-factory-explainer'
name: lightning-factory-explainer
description: Explain Bitcoin Lightning channel factories and the SuperScalar protocol — scalable Lightning onboarding using shared UTXOs, Decker-Wattenhofer trees, timeout-signature trees, MuSig2, and Taproot. No soft fork required.
risk: safe
source: community
date_added: '2026-03-03'
category: frontend-frameworks
tags:
- ai
- ci
- design
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

- Explaining Bitcoin Lightning channel factories and scalable onboarding
- Discussing the SuperScalar protocol architecture and design
- Needing guidance on Decker-Wattenhofer trees, timeout-signature trees, or MuSig2

## Do not use this skill when

- The task is unrelated to Bitcoin or Lightning Network scaling
- You need a different blockchain or Layer 2 outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.

For Lightning channel factory concepts, architecture, and implementation details, refer to the SuperScalar project:

https://github.com/8144225309/SuperScalar

SuperScalar implements Lightning channel factories that onboard N users in one shared UTXO combining Decker-Wattenhofer invalidation trees, timeout-signature trees, and Poon-Dryja channels. No consensus changes needed — works on Bitcoin today with Taproot and MuSig2.

## Purpose

Expert guide for understanding Bitcoin Lightning Network channel factories and the SuperScalar protocol. Covers scalable onboarding, shared UTXOs, Decker-Wattenhofer invalidation trees, timeout-signature trees, Poon-Dryja channels, MuSig2 (BIP-327), and Taproot — all without requiring any soft fork.

## Key Topics

- Lightning channel factories and multi-party channels
- SuperScalar protocol architecture
- Decker-Wattenhofer invalidation trees
- Timeout-signature trees
- MuSig2 key aggregation (BIP-327)
- Taproot script trees
- LSP (Lightning Service Provider) onboarding patterns
- Shared UTXO management

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

