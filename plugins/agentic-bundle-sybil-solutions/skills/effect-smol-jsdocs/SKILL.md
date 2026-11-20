---
name: effect-smol-jsdocs
description: Write or review Effect public JSDoc against declaration, implementation, call-site and doctest evidence.
license: MIT
metadata:
  aas-category: development
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/jsdocs
  aas-source-repo: sybil-solutions/local-studio
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE
  aas-author: Effectful Technologies Inc
  aas-date-added: '2026-11-19'
---

# Document Effect Public APIs

## When to Use

Write or review Effect public JSDoc against declaration, implementation, call-site and doctest evidence.

## Workflow

Read the declaration, implementation, public types and real call sites. Follow the project's current tags, categories and example rules. Write a practical description and add usage, details or concrete gotchas where needed. Audit links and related APIs. Compile runnable examples through the targeted doctest and run the repository's JSDoc checker. Keep internal or unsupported declarations out of public API docs.

## Example

Document a public combinator with one runnable error-handling example and a verified link to its nearest alternative.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Bundled resources

Use the bundled local references for the applicable branch of the workflow: [categories](categories.md), [declarations](declarations.md), [examples](examples.md). Run commands against the target Effect workspace.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/jsdocs). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
