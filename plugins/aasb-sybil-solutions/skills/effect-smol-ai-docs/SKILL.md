---
name: effect-smol-ai-docs
description: Update Effect AI documentation sources and verify generated LLMS.md, examples and coverage.
license: MIT
metadata:
  aas-category: development
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/ai-docs
  aas-source-repo: sybil-solutions/local-studio
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/LICENSE
  aas-author: Effectful Technologies Inc
  aas-date-added: '2026-11-19'
---

# Maintain Effect AI Docs

## When to Use

Update Effect AI documentation sources and verify generated LLMS.md, examples and coverage.

## Workflow

Read the source guide under `ai-docs/`. Compare the matching source sections with the generated LLMS.md, the public API and nearby examples. Edit the source only, run the repository's AI docs generator, and inspect the rendered delta for missing sections and ordering. Compile affected TypeScript examples and run the relevant checks. Report unrelated generated changes and resolve them before committing.

## Example

Add guidance for a changed schema API and verify the bulk guidance file and source example agree.

## Limitations

Requires the relevant Effect workspace and its versioned tools. Use local project policy and authorized fixtures. Results cover only the checked packages and environments.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills/ai-docs). See the [MIT license](LICENSE).

This snapshot of [Effect v4](https://github.com/Effect-TS/effect-smol) is vendored by Local Studio.
