---
name: effect-smol-bundle-analysis
description: Compare Effect bundle fixtures across revisions and identify verified changes in bytes and composition.
license: MIT
metadata:
  aas-category: development
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/bundle-analysis
  aas-source-repo: sybil-solutions/local-studio
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE
  aas-author: Effectful Technologies Inc
  aas-date-added: '2026-11-19'
---

# Analyse Effect Bundle Size

## When to Use

Compare Effect bundle fixtures across revisions and identify verified changes in bytes and composition.

## Workflow

Start from the current bundle-tool README. Choose an established fixture comparison, a user-named temporary fixture or a composition report according to the question. Build current packages before direct measurement. Keep resolver settings, revision and fixture constant across comparisons. Inspect raw module data before interpreting readable labels. Record before/after byte counts and explain meaningful deltas. Preserve unrelated comparison state and remove temporary fixtures only within the requested scope.

## Example

Measure the same import on base and head and verify whether a new dependency accounts for the compressed size delta.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/bundle-analysis). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
