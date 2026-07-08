# Skills vs MCP Tools

If you are trying to understand the difference between **Antigravity skills** and **MCP tools**, the short version is:

- **Skills** are reusable `SKILL.md` playbooks that tell an AI assistant how to execute a workflow.
- **MCP tools** are integrations or callable capabilities that let the assistant interact with external systems.

The two are complementary, not competing.

## What a skill does

A skill gives the model better instructions for a repeated task such as:

- planning a feature
- reviewing code
- running a security audit
- writing a README
- debugging a failing test suite

In practice, a skill improves the assistant's decision-making, structure, and process for a task.

Example:

- `@brainstorming` helps the model clarify requirements before implementation.
- `@lint-and-validate` helps the model run the right quality checks before claiming success.

## What an MCP tool does

An MCP tool gives the model a capability it would not otherwise have, such as:

- reading from a database
- calling GitHub APIs
- fetching docs from a service
- creating calendar events
- querying an external system

In practice, an MCP tool expands what the assistant can do in the world.

## The easiest mental model

Use this rule:

- **Skills tell the assistant how to work.**
- **MCP tools tell the assistant what systems it can touch.**

If you only install tools, the assistant may have access but still behave inconsistently.

If you only install skills, the assistant may know the workflow but still lack the capability to reach the external system it needs.

Together, they are much stronger.

## Which one should you start with?

Start with **skills** if:

- you want better planning, coding, debugging, testing, or review behavior immediately
- you are working mostly in local files and terminal flows
- you want reusable playbooks before adding more integrations

Start with **MCP tools** if:

- your main blocker is access to external systems
- you need the model to call APIs, query services, or interact with hosted platforms
- you already like the model's workflow quality, but need more reach

Use **both** when:

- you want reliable workflows plus external capabilities
- you are building agent systems, internal tooling, or multi-step operational flows

## How this repo fits in

Agentic Awesome Skills is primarily a **skill library**:

- installable `SKILL.md` playbooks
- bundles for role-based starting points
- workflows for ordered execution patterns
- tool-specific guides for Claude Code, Cursor, Codex CLI, Gemini CLI, and others

Many skills in this repo also explain how to work with MCP, APIs, and other integrations, but the repository itself is centered on reusable workflow guidance rather than acting as an MCP server.

## Good next reads

- [FAQ](faq.md)
- [Bundles](bundles.md)
- [Workflows](workflows.md)
- [AI Agent Skills](ai-agent-skills.md)
- [Codex CLI Skills](codex-cli-skills.md)
- [Gemini CLI Skills](gemini-cli-skills.md)
