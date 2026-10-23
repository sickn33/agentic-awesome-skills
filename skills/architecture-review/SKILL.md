---
name: architecture-review
description: Review repository architecture using Ontoly Software Graph and MCP capabilities.
  Use when asked to explain architecture, module boundaries, package topology, service
  ownership, or architectural risk.
license: AGPL-3.0-only
compatibility: Portable Agent Skills format; requires Ontoly CLI and MCP-capable or
  CLI-capable coding agent.
metadata:
  ontoly.skill.version: 1.3.3
  ontoly.min.version: 1.3.3
  ontoly.capabilities: ExplainArchitecture, GraphStatistics, FindCycles, FindDependencies,
    EvidencePack
  ontoly.category: architecture
  ontoly.enhancement: LLM Enhancement
  ontoly.deprecated: 'false'
source_repo: 0xsarwagya/ontoly
source_type: community
source: community
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Architecture Review

Use this skill when the user asks for architecture review using Ontoly evidence.

## Required Workflow

The 1.3.3 minimum in frontmatter supersedes older 1.0.0 labels in companion notes. Verify installed capabilities and bind graph hash to the actual source revision; a graph summary is not proof that dynamic/configuration dependencies were fully captured.

Follow the [shared Ontoly workflow](reference/workflow.md). Read the [graph evidence rules](reference/graph.md), [MCP usage](reference/mcp.md), [best practices](reference/best-practices.md), and [fallback rules](reference/fallbacks.md) when the task requires detail.

## Ontoly Capabilities

Use these capabilities first: `ExplainArchitecture`, `GraphStatistics`, `FindCycles`, `FindDependencies`, `EvidencePack`.

## Output Contract

Return:

- answer or plan
- capabilities invoked
- graph evidence with node ids, edge types, source spans, and graph hash when available
- confidence: high, medium, or low
- fallback reason if repository files were inspected

## Boundaries

Do not implement compiler, query, MCP, SDK, or business logic in the skill. Do not search repository files until Ontoly cannot answer or evidence must be confirmed.

## Resources

- [Examples](examples.md)
- [Prompt template](templates/architecture-review.md)
- [Capability notes](reference/capabilities.md)

## Learn more

- Documentation: https://ontoly.xyz/docs
- This skill on the web: https://ontoly.xyz/skills#architecture-review
- All Ontoly Agent Skills: https://ontoly.xyz/skills
- Install via skills.sh: https://www.skills.sh/?q=0xsarwagya/ontoly


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
