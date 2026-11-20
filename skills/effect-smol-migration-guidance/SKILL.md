---
name: "effect-smol-migration-guidance"
description: "Keep Effect v3-to-v4 migration annotations and generated guidance aligned with verified public API replacements."
category: "development"
risk: "critical"
source: "https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/migration-guidance"
source_repo: "sybil-solutions/local-studio"
source_type: "community"
license: "MIT"
license_source: "https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE"
author: "Effectful Technologies Inc"
date_added: "2026-11-19"
---

# Maintain Effect v3 to v4 Migration Guidance

## When to Use

Keep Effect v3-to-v4 migration annotations and generated guidance aligned with verified public API replacements.

## Workflow

Inventory affected v3 modules and names. Verify proposed v4 replacements through implementation, tests and a representative consumer call. Note behavior differences, service requirements and unsupported mappings. Update source annotations under the checkout's migration policy. Generate from the required committed revision, inspect for unrelated movement and stale refs, and document when generation is deferred for uncommitted code.

## Example

Record a moved v3 API and compile the suggested v4 call before updating the generated migration guide.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [annotations](annotations.md), [generation](generation.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/migration-guidance). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
