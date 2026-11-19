---
name: "effect-smol-changesets"
description: "Audit Effect package changes for consumer-visible impacts and record the appropriate changeset and migration notes."
category: "development"
risk: "critical"
source: "https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/changesets"
source_repo: "sybil-solutions/local-studio"
source_type: "community"
license: "MIT"
license_source: "https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE"
author: "Effectful Technologies Inc"
date_added: "2026-11-19"
---

# Write Effect Changesets

## When to Use

Audit Effect package changes for consumer-visible impacts and record the appropriate changeset and migration notes.

## Workflow

Inspect the full diff and identify affected published packages. Check exported names, entrypoints, inputs, defaults, required services, runtime behavior, lifetime, interruption, errors and wire or persisted data. Determine whether existing valid callers must change. Exercise representative old calls when needed. Follow the installed checkout's changeset conventions. Record one coherent consumer-facing change with package, bump and migration implications, or explain why an internal-only diff needs no changeset.

## Example

Assess a changed default timeout and document what existing consumers need to configure to keep earlier behavior.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [authoring](authoring.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/changesets). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
