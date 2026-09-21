# Codebase Onboarding

This is an official Ontoly Agent Skill. It is independently installable and teaches an agent how to use Ontoly for codebase onboarding.

## Version

- Skill version: 1.0.0
- Minimum Ontoly version: 1.0.0
- Required capabilities: `ExplainArchitecture`, `FindEntrypoints`, `GraphStatistics`, `FindFeatureOwner`, `EvidencePack`
- Enhancement: LLM Enhancement
- Deprecated: no

## Install

Install this skill with any Agent Skills compatible installer that supports `SKILL.md` directories, or copy this folder into your agent skills directory.

## Use

Ask the agent a task such as:

> What does this repository do?

The agent should build or verify the Ontoly graph, use MCP capabilities, cite evidence, and only inspect files as a fallback.

## Public Docs

- [Agent Skills](https://ontoly.xyz/docs/agent-skills)
- [Skills Overview](https://ontoly.xyz/docs/skills-overview)
- [MCP](https://ontoly.xyz/docs/mcp)
- [Capabilities](https://ontoly.xyz/docs/capabilities)
- [Skills Validation](https://ontoly.xyz/docs/skills-validation)

## Shared References

This skill depends on the shared Ontoly workflow in [reference/workflow.md](reference/workflow.md).

## Learn more

- Documentation: https://ontoly.xyz/docs
- This skill on the web: https://ontoly.xyz/skills#codebase-onboarding
- All Ontoly Agent Skills: https://ontoly.xyz/skills
- Install via skills.sh: https://www.skills.sh/?q=0xsarwagya/ontoly
