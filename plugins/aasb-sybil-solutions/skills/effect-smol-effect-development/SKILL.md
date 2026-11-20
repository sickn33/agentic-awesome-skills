---
name: effect-smol-effect-development
description: Implement or review Effect integrations using targeted repository API guidance and version-matched runtime or type checks.
license: MIT
metadata:
  aas-category: development
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/effect-development
  aas-source-repo: sybil-solutions/local-studio
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE
  aas-author: Effectful Technologies Inc
  aas-date-added: '2026-11-19'
---

# Develop with Effect APIs

## When to Use

Implement or review Effect integrations using targeted repository API guidance and version-matched runtime or type checks.

## Workflow

Identify the Effect modules, required services and patterns involved. Search the installed version's LLMS.md and source docs for only those concepts. Trace nearby code and tests to validate local conventions. Apply the existing composition style and verify behavior including typed failures, interruption and resource cleanup where relevant. If an API or version is absent, record the gap and use existing local contracts as the evidence for any fallback.

## Example

Add a dependency to an Effect service and test acquisition, typed failure and release against the workspace version.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/effect-development). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
