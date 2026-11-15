# AI Agent Skills

**An AI agent skill is a reusable set of task instructions in a `SKILL.md` file**, often accompanied by examples, scripts or reference material. A coding agent reads the skill to follow a procedure, such as investigating a failing test or reviewing an API. You still review the instructions, any bundled files and the result.

[Agentic Awesome Skills](https://aaskills.tech/) (AAS), formerly **Antigravity Awesome Skills**, is an open-source library of these instructions for Codex, Claude Code, Cursor and other coding agents. Its canonical source is [sickn33/agentic-awesome-skills](https://github.com/sickn33/agentic-awesome-skills). Original code uses MIT; original written content uses CC BY 4.0, with imported skills retaining their own notices. See [sources and licenses](https://aaskills.tech/trust/).

## A practical first example

For a failing test, inspect [`systematic-debugging`](../../skills/systematic-debugging/) and its bundled files, then use the [setup guide for your agent](#start-with-a-tool-specific-guide). Give the agent a concrete task:

```text
Investigate this failing test. Use the reviewed debugging skill to reproduce the
failure, identify its cause, propose a minimal fix, and rerun the relevant tests.
```

The observable result is a reproduced failure, an explained change and test output. Installing a skill alone does not establish that the task succeeded.

## How AAS Core helps

For Codex and Claude Code, **AAS Core** lets your agent search and read the local catalog, choose skills for your project, and record its selection for review. Follow [Codex setup](codex-cli-skills.md) or [Claude Code setup](claude-code-skills.md) to connect it. For Cursor, follow the [direct installation guide](cursor-skills.md).

The agent uses `compose_stack` to record exact IDs in `aas-stack.json`; the CLI validates that selection and previews a plan before any separate installation. AAS does not scan your repository, choose skills, call a remote model, or write project files through MCP.

## What to look for in an AI agent skill system

- **Explicit input boundary**: is project analysis performed by the coding agent and passed as a reviewable profile?
- **Agent-owned selection**: can the coding agent search and read every skill before choosing exact IDs?
- **Reproducibility**: can the chosen IDs be pinned to a catalog identity and replayed without a metadata eligibility gate?
- **Durable desired state**: can the approved selection be recorded independently of the agent conversation?
- **Preview before change**: can the system validate the manifest and produce an exact plan without changing the target?
- **Source and compatibility evidence**: are provenance, risk, host support, and distribution boundaries explicit?

## When Agentic Awesome Skills is a good fit

- You use Codex or Claude and want the agent to choose a focused stack for a real project.
- You want complete local search and inspection without repository scanning or remote-model calls by AAS.
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

- Choose **AAS Core** if you want complete local catalog access, agent-owned selection, reproducible stack composition, and a preview plan.
- Choose direct distribution if you already know the exact skills you want or your host does not support the Core path.
- Choose a smaller curated repository if a fixed editorial shortlist matters more than complete catalog access and durable desired state.
