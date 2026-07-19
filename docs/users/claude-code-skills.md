# AAS Core with Claude Code

For Claude Code, the recommended AAS path is **AAS Core**: a local, agent-first control plane for complete catalog search, Claude-owned skill selection, manifest inspection, and preview-first planning.

The local AAS MCP is read-only. It lets Claude search and read every catalog skill, then validate and pin Claude's chosen IDs in `aas-stack.json`; planning and any approved changes stay in the AAS CLI lifecycle.

Start with the [AAS Core guide](aas-core.md). The Claude plugin marketplace and direct skill installation remain supported delivery paths after you know which skills you want.

> **Preview status:** Complete catalog search, agent-owned selection, manifest validation, and planning are the documented path. Stop after plan review; apply and recovery remain experimental.

## How to use Agentic Awesome Skills with Claude Code

Configure AAS Core for Claude Code, describe the task and constraints, let Claude choose exact IDs from the complete catalog, then review the composed stack and preview the CLI plan. Core does not install or mutate through MCP.

## Why use this repo for Claude Code

- It lets Claude search the verified local catalog without loading the full library into context.
- It preserves Claude's exact selection without using metadata as an eligibility gate.
- It keeps MCP discovery read-only and CLI changes approval-gated.
- It includes 1,969+ skills instead of a narrow single-domain starter pack.
- It supports the standard `.claude/skills/` path and the Claude Code plugin marketplace flow.
- It also ships generated bundle plugins so teams can install focused packs like `Essentials` or `Security Developer` from the marketplace metadata.
- It includes onboarding docs, bundles, and workflows so new users do not need to guess where to begin.
- It covers both everyday engineering tasks and specialized work like security reviews, infrastructure, product planning, and documentation.

## Direct install and plugins

These are alternative delivery paths for users who already know which skill payload they want.

### Option A: installer CLI

```bash
npx agentic-awesome-skills --claude
```

### Option B: Claude Code plugin marketplace

```text
/plugin marketplace add sickn33/agentic-awesome-skills
/plugin install agentic-awesome-skills
```

The Claude marketplace plugin is a plugin-safe filtered distribution of the repo. Skills that still require portability hardening or explicit setup metadata remain available in the repository, but are excluded from the plugin until they are ready.

You can also install a focused bundle plugin instead of the root plugin when you want a narrower starter surface. See [plugins.md](plugins.md) and [bundles.md](bundles.md).

### Verify the install

```bash
test -d .claude/skills || test -d ~/.claude/skills
```

## Best starter skills for Claude Code

- [`brainstorming`](../../skills/brainstorming/): plan features and specs before writing code.
- [`lint-and-validate`](../../skills/lint-and-validate/): run fast quality checks before you commit.
- [`create-pr`](../../skills/create-pr/): package your work into a clean pull request.
- [`systematic-debugging`](../../skills/systematic-debugging/): investigate failures with a repeatable process.
- [`security-auditor`](../../skills/security-auditor/): review APIs, auth, and sensitive flows with a security lens.

## Example Claude Code prompts

With AAS Core configured:

```text
Inspect this security-review project, search and read the complete AAS catalog, and choose the exact skill IDs you judge most useful. Use compose_stack with a project profile, show me the schema 2 aas-stack.json, inspect it, and preview the plan without applying it.
```

After installing or activating a chosen skill, direct invocation still works:

```text
Use @brainstorming to design a new billing workflow for my SaaS.
```

```text
Use @lint-and-validate on src/routes/api.ts and fix the issues you find.
```

```text
Use @create-pr to turn these changes into a clean PR summary and checklist.
```

## What to do next

- Start with [`aas-core.md`](aas-core.md) for setup, trust boundaries, and the stack lifecycle.
- Start with [`bundles.md`](bundles.md) if you want a role-based shortlist.
- Use [`workflows.md`](workflows.md) if you want step-by-step execution playbooks.
- Compare options in [`best-claude-code-skills-github.md`](best-claude-code-skills-github.md) if you are still evaluating repositories.
- Go back to the main landing page in [`README.md`](../../README.md) when you want the full installation matrix.
