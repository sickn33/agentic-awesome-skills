# AI Agent Skills

If you are researching **AI agent skills** on GitHub, the useful first decision is whether you want deterministic project-level composition or manual selection from a catalog.

Agentic Awesome Skills is built around **AAS Core**: Codex or Claude inspects the project, sends an explicit profile to the local AAS MCP, and receives an explainable recommendation from the verified catalog. The agent proposes `aas-stack.json`; the CLI validates it and produces an immutable preview plan before any target change.

The catalog, plugins, bundles, workflows, and direct installer remain supporting content and distribution surfaces. AAS does not scan the repository, call a remote model, or write project files through MCP.

## What to look for in an AI agent skill system

- **Explicit input boundary**: is project analysis performed by the coding agent and passed as a reviewable profile?
- **Deterministic recommendation**: can the same profile, policy, runtime, and catalog identity reproduce the same result?
- **Explainability**: do recommendations include evidence, exclusions, uncovered goals, and unknowns?
- **Durable desired state**: can the approved selection be recorded independently of the agent conversation?
- **Preview before change**: can the system validate the manifest and produce an exact plan without changing the target?
- **Source and compatibility evidence**: are provenance, risk, host support, and distribution boundaries explicit?

## When Agentic Awesome Skills is a good fit

- You use Codex or Claude and want a small, policy-controlled stack for a real project.
- You want local search and recommendation without repository scanning or remote-model calls by AAS.
- You need a reviewable `aas-stack.json` and CLI validation and planning before target changes.
- You also value a broad catalog and multiple distribution options around the Core workflow.

## When a smaller curated repo may be better

- You only want a fixed, vendor-maintained shortlist and do not need project-aware composition.
- You prefer selecting and invoking individual skills manually.
- Your host does not yet have an AAS Core adapter and direct distribution is sufficient.

## Start with a tool-specific guide

- [`claude-code-skills.md`](claude-code-skills.md)
- [`cursor-skills.md`](cursor-skills.md)
- [`codex-cli-skills.md`](codex-cli-skills.md)
- [`gemini-cli-skills.md`](gemini-cli-skills.md)

## Compare catalogs and distribution models

- [`agentic-awesome-skills-vs-awesome-claude-skills.md`](agentic-awesome-skills-vs-awesome-claude-skills.md)
- [`best-claude-code-skills-github.md`](best-claude-code-skills-github.md)
- [`best-cursor-skills-github.md`](best-cursor-skills-github.md)

## Quick recommendation

- Choose **AAS Core** if you want local, deterministic, explainable skill-stack composition from an explicit project profile to a preview plan.
- Choose direct distribution if you already know the exact skills you want or your host does not support the Core path.
- Choose a smaller curated repository if a fixed editorial shortlist matters more than project-specific recommendation and durable desired state.
