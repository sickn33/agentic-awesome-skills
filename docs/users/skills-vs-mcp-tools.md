# Skills, AAS MCP, and Other MCP Tools

The short version is:

- **Skills** are reusable `SKILL.md` playbooks that tell an AI assistant how to execute a workflow.
- **AAS MCP** is the local, read-only interface through which an agent searches the verified AAS catalog, inspects evidence, and composes a proposed stack.
- **Other MCP tools** connect an assistant to external systems such as APIs, databases, browsers, or hosted services.
- **The `aas` CLI** validates durable stack intent and previews exact lifecycle operations under human control.

These surfaces are complementary. AAS Core connects them around the approved `aas-stack.json` manifest.

## What a skill does

A skill gives the model better instructions for a repeated task such as:

- planning a feature;
- reviewing code;
- running a security audit;
- writing a README;
- debugging a failing test suite.

In practice, a skill improves the assistant's decision-making, structure, and process. It remains content, not an executable capability or a grant of authority.

Examples:

- `@brainstorming` helps the model clarify requirements before implementation.
- `@lint-and-validate` helps the model run appropriate quality checks before claiming success.

## What AAS MCP does

AAS MCP is part of this repository's product, not an unrelated external integration. Codex or Claude uses it to call the same deterministic AAS Core that powers the CLI projections.

It exposes exactly:

- `search_skills`;
- `get_skill`;
- `recommend_stack`;
- `inspect_stack`;
- `diff_stack`;
- the `aas://skills/{id}` resource template.

The agent inspects the project using its normal local capabilities and sends AAS an explicit, allowlisted profile. AAS MCP does not scan the repository itself. It returns structured factors, evidence, coverage, exclusions, discovery candidates, and unknowns from a bundled or verified local catalog.

AAS MCP is local stdio, process-per-session, read-only, offline-capable, and contains no model credentials or telemetry. Its tool calls do not install or remove skills, apply a stack, update catalogs, or edit host configuration.

## What other MCP tools do

An external MCP tool may give the model a capability it would not otherwise have, such as:

- reading from a database;
- calling GitHub APIs;
- fetching documentation from a service;
- creating calendar events;
- querying or changing another system.

Those tools expand what the assistant can do in the world. Their permissions, network behavior, and write boundaries depend on each server. They are different from the deliberately narrow AAS MCP catalog/composition boundary.

## What the CLI does

The `aas` CLI is the explicit operational interface for:

- catalog status and updates;
- MCP configuration;
- stack initialization and deterministic recommendation from an explicit profile;
- manifest validation;
- plan creation and read-only diagnostics.

The durable artifact is `aas-stack.json`, which pins catalog identity, targets, intent, policy, and exact skill IDs. The agent may propose it; the user reviews it. `stack validate` checks it, and `stack plan` creates an immutable preview bound to the observed managed state and exact operations.

`stack apply` and `stack recover` exist only for controlled preview development. They are experimental, disabled by default, and are not supported or certified preview safety claims.

## The easiest mental model

- **Skills provide the operating guidance.**
- **AAS MCP helps the agent select and explain the right guidance.**
- **`aas-stack.json` records what the user approved.**
- **The CLI validates and previews the lifecycle.**
- **Other MCP servers provide access to outside systems.**

## Which path should you start with?

Start with **AAS Core** when:

- you use Codex or Claude with local MCP support;
- you want the agent to compose a small stack from project evidence;
- you need explicit risk/source/setup policy and a reproducible manifest;
- you want a reviewable plan before any skill changes.

Start with a **direct skill or specialized plugin** when:

- the host does not yet have a native AAS MCP configuration adapter;
- you already know the exact skill or fixed domain pack you want;
- you prefer manual invocation without a managed stack lifecycle.

Add **other MCP tools** when the work needs live access to APIs, services, databases, or hosted platforms. A stack can contain skills that guide those integrations without granting the external permissions itself.

## Preview limits

AAS Agent-First Preview helps Codex and Claude compose a local, explainable, reproducible skill stack. It does not claim certified full-catalog recommendation quality or transactional apply/recovery safety. Missing evidence is reported as `unknown`, and AAS may leave a goal uncovered rather than present a weak recommendation as certainty.

## Good next reads

- [AAS Core](aas-core.md)
- [Getting Started](getting-started.md)
- [FAQ](faq.md)
- [Bundles](bundles.md)
- [Workflows](workflows.md)
- [Plugins for Claude Code and Codex](plugins.md)
