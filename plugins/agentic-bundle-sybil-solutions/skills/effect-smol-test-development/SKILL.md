---
name: effect-smol-test-development
description: Add focused Vitest and Tstyche coverage for Effect runtime behavior and public type inference.
license: MIT
metadata:
  aas-category: development
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/test-development
  aas-source-repo: sybil-solutions/local-studio
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE
  aas-author: Effectful Technologies Inc
  aas-date-added: '2026-11-19'
---

# Test Effect Behavior and Type Contracts

## When to Use

Add focused Vitest and Tstyche coverage for Effect runtime behavior and public type inference.

## Workflow

Identify whether the bug or change affects runtime behavior, public types or both. Use local Vitest conventions for effects and resource cleanup. Use Tstyche to exercise assignability, inferred errors, environment requirements and displayed types. Confirm a regression test fails for the intended reason before accepting its fix. Run focused tests and applicable root checks. Report which branches ran and any platform limitation.

## Example

Test an overload with a runtime result check and explicit type expectations for accepted and rejected call shapes.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [displayed types](displayed-types.md), [runtime](runtime.md), [types](types.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/test-development). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
