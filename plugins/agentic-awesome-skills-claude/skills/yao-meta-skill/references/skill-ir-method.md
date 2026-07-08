# Skill IR Method

Skill IR is the 2.0 layer that separates durable skill meaning from platform packaging.

## Purpose

Use Skill IR before platform-specific packaging for production, library, governed, or team-distributed skills. The IR should preserve the capability contract even when OpenAI, Claude, Agent Skills, VS Code, or generic adapters differ in folder layout, metadata names, or activation behavior.

## What Belongs In IR

- the recurring job the skill owns
- the frontmatter trigger description
- should-trigger, should-not-trigger, and near-neighbor edge cases
- workflow steps, decision points, and failure modes
- references, scripts, assets, and reports used by the package
- trigger and output eval plans
- output risk, execution risk, and trust boundary
- owner, maturity, review cadence, and target platforms

## What Does Not Belong In IR

- platform-specific file paths that only exist after packaging
- copied prose from external benchmarks
- client-specific UI labels
- local private paths that are not part of the skill package
- speculative adapters that are not requested or tested

## Authoring Rule

Export or update Skill IR before adding new adapters, compilers, registries, or conformance checks. If a field cannot be derived from local package evidence, leave it empty or use an explicit low-confidence default instead of inventing detail.

## Reviewer Gate

A reviewer should be able to answer:

1. What does this skill own?
2. When should it trigger?
3. When should it not trigger?
4. Which resources and scripts carry the real behavior?
5. Which evals prove the contract?
6. Which targets can consume the skill without semantic loss?
