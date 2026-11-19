---
name: "effect-smol-dependency-maintenance"
description: "Synchronize Effect workspace dependency changes across manifests, lockfile and the affected validation matrix."
category: "development"
risk: "critical"
source: "https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/dependency-maintenance"
source_repo: "sybil-solutions/local-studio"
source_type: "community"
license: "MIT"
license_source: "https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE"
author: "Effectful Technologies Inc"
date_added: "2026-11-19"
---

# Maintain Effect Workspace Dependencies

## When to Use

Synchronize Effect workspace dependency changes across manifests, lockfile and the affected validation matrix.

## Workflow

Discover every manifest entry, peer constraint, patch, setup action, runtime requirement and compatibility claim. Choose a package-local change only if shared toolchain policy is unaffected. For coordinated upgrades, determine the required changes to engines, images and workspace tooling before installation. Use the configured package manager and approved dependency environment. Review the lockfile delta for unintended resolution churn, peer changes, integrity and native lifecycle policy. Run focused correctness checks and select the matching changeset route.

## Example

Upgrade one package peer dependency while preserving the advertised supported range and inspect the changed peer resolutions.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [coordinated upgrades](coordinated-upgrades.md), [manifest roles](manifest-roles.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/dependency-maintenance). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
