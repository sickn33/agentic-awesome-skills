---
name: "effect-smol-ci-maintenance"
description: "Review or update Effect GitHub Actions with a job-by-job trigger, revision, permission and artifact trust inventory."
category: "development"
risk: "critical"
source: "https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/ci-maintenance"
source_repo: "sybil-solutions/local-studio"
source_type: "community"
license: "MIT"
license_source: "https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE"
author: "Effectful Technologies Inc"
date_added: "2026-11-19"
---

# Maintain Effect GitHub Actions

## When to Use

Review or update Effect GitHub Actions with a job-by-job trigger, revision, permission and artifact trust inventory.

## Workflow

Identify affected workflows, composite actions and callers. For each job record trigger, actor, checked-out revision, token permissions, inputs and consumers of outputs and artifacts. Consult current official documentation for event and permission behavior. Use repository shared setup where applicable. Keep permissions minimal, pin actions to verified full SHAs, validate untrusted values as data, and align cancellation with job side effects. Run focused lint and report which checks need real GitHub execution.

## Example

Review a workflow that consumes a build artifact and confirm the producing run, head and trust boundary before proposing a change.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [privileged workflows](privileged-workflows.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/ci-maintenance). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
