---
name: effect-smol-package-development
description: Create or move an Effect workspace package while checking registration, exports, generated barrels and packed contents.
license: MIT
metadata:
  aas-category: development
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/package-development
  aas-source-repo: sybil-solutions/local-studio
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE
  aas-author: Effectful Technologies Inc
  aas-date-added: '2026-11-19'
---

# Register Effect Workspace Packages

## When to Use

Create or move an Effect workspace package while checking registration, exports, generated barrels and packed contents.

## Workflow

Compare the closest package with the same runtime and publishing role. Update the relevant workspace discovery, TypeScript, build, test, export-map and release surfaces. Keep dependency declarations aligned with runtime and peer roles. Regenerate owned barrels through codegen. Verify local resolution, public type checks and, for a publishable package, the dry pack contents and entrypoints. Apply repository changeset rules.

## Example

Move a publishable workspace package and confirm both development imports and packed exports still resolve.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [dependencies](dependencies.md), [publishing](publishing.md), [registration](registration.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/package-development). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
