---
name: dependency-analysis
description: Analyze internal and package dependencies using Ontoly graph traversal.
  Use when asked which modules, packages, services, or files depend on each other.
license: AGPL-3.0-only
compatibility: Portable Agent Skills format; requires Ontoly CLI and MCP-capable or
  CLI-capable coding agent.
metadata:
  ontoly.skill.version: 1.3.3
  ontoly.min.version: 1.3.3
  ontoly.capabilities: FindDependencies, FindDependents, FindCycles, GraphStatistics,
    EvidencePack
  ontoly.category: dependencies
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

# Dependency Analysis

Use this skill when the user asks for dependency analysis using Ontoly evidence.

## Required Workflow

Follow [the shared Ontoly workflow. Also read [graph evidence rules, [MCP usage, [best practices, and [fallback rules when the task requires detail.

## Ontoly Capabilities

Use these capabilities first: `FindDependencies`, `FindDependents`, `FindCycles`, `GraphStatistics`, `EvidencePack`.

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

- [Examples
- [Prompt template
- [Capability notes

## Learn more

- Documentation: https://ontoly.xyz/docs
- This skill on the web: https://ontoly.xyz/skills#dependency-analysis
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
