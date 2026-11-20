---
name: "effect-smol-performance-analysis"
description: "Compare Effect runtime performance or TypeScript checker cost with matched fixtures and repeatable measurements."
category: "development"
risk: "safe"
source: "https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/performance-analysis"
source_repo: "sybil-solutions/local-studio"
source_type: "community"
license: "MIT"
license_source: "https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE"
author: "Effectful Technologies Inc"
date_added: "2026-11-19"
---

# Measure Effect Runtime and Type Performance

## When to Use

Compare Effect runtime performance or TypeScript checker cost with matched fixtures and repeatable measurements.

## Workflow

Run correctness checks before profiling. Select the runtime or type branch based on the regression. Compare the same target operation and inputs on base and head with fixed runtime or compiler flags and versions. Separate warm-up and steady-state runtime samples. For type cost compare the same inclusion graph and record diagnostic counters with wall time. Repeat unexplained results and disclose environmental noise, selected threshold and any unmeasured checks.

## Example

Compare check time and type instantiations for one overload fixture across two commits with the same TypeScript version.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [runtime](runtime.md), [types](types.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/performance-analysis). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
