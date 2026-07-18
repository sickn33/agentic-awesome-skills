# AAS Core with Codex CLI

For Codex, the recommended AAS path is **AAS Core**: a local, agent-first control plane that lets Codex search the verified catalog, inspect skills, and recommend a minimal stack before anything is installed.

The AAS MCP server is local and read-only. Codex can call `search_skills`, `get_skill`, `recommend_stack`, `inspect_stack`, and `diff_stack`; changes remain in the CLI lifecycle, where `validate` and `plan` are preview operations and `apply` requires explicit approval.

Start with the [AAS Core guide](aas-core.md). Direct skill installation and Codex plugins remain supported when you already know exactly which payload you want.

> **Preview status:** Search, recommendation, manifest validation, and planning are the documented preview path. Stop after plan review; apply and recovery are not certified preview safety claims.

## How to use Agentic Awesome Skills with Codex CLI

Configure AAS Core for Codex, then describe the real task instead of manually searching a large directory. The normal flow is:

1. Codex discovers the local AAS MCP tools.
2. Codex searches the catalog and requests a deterministic recommendation for your task profile.
3. Codex proposes a minimal `aas-stack.json` for you to review.
4. The AAS CLI validates the manifest and previews the exact plan.
5. Stop after reviewing the plan unless you are deliberately participating in controlled preview development.

## Why use this repo for Codex CLI

- It gives Codex native, local discovery and recommendation through MCP.
- It keeps catalog evidence, stack intent, validation, and planning deterministic and inspectable.
- It separates read-only agent tools from approval-gated CLI mutations.
- It is strong for local repo work where you want to move from planning to implementation to verification without changing libraries.
- It includes both general-purpose engineering skills and deeper specialist tracks.
- It still supports direct installs and plugin distributions as delivery surfaces.

## Direct install and plugins

Use a direct install only when you intentionally want the library copied into Codex's skills path:

```bash
npx agentic-awesome-skills --codex
```

For plugin-style packaging, this repository also ships repo-local metadata in `.agents/plugins/marketplace.json` and `plugins/agentic-awesome-skills/.codex-plugin/plugin.json`.

It also generates bundle-specific Codex plugins so you can install a curated pack such as `Essentials` or `Web Wizard` as a marketplace plugin instead of loading the full library.

Those Codex plugins are plugin-safe filtered distributions. Skills that still depend on host-specific paths or undeclared setup stay in the repository, but are not published into the Codex plugin until they are hardened.

For the canonical explanation of how Core, Codex plugins, and direct installs relate, read [plugins.md](plugins.md).

### Verify the install

```bash
test -d .codex/skills || test -d ~/.codex/skills
```

## Best starter skills for Codex CLI

- [`brainstorming`](../../skills/brainstorming/): clarify requirements before touching code.
- [`concise-planning`](../../skills/concise-planning/): turn ambiguous work into an atomic execution plan.
- [`test-driven-development`](../../skills/test-driven-development/): structure changes around red-green-refactor.
- [`lint-and-validate`](../../skills/lint-and-validate/): keep quality checks close to the implementation loop.
- [`create-pr`](../../skills/create-pr/): wrap up work cleanly once implementation is done.

## Example Codex CLI prompts

With AAS Core configured:

```text
Use AAS to recommend the smallest skill stack for designing and testing this parser change. Show me the proposed aas-stack.json and preview the plan; do not apply it.
```

After installing or activating a chosen skill, direct invocation still works:

```text
Use @concise-planning to break this feature request into an implementation checklist.
```

```text
Use @test-driven-development to add tests before changing this parser.
```

```text
Use @create-pr once everything is passing and summarize the user-facing changes.
```

## What to do next

- Start with [`aas-core.md`](aas-core.md) for setup, trust boundaries, and the stack lifecycle.
- Read [`ai-agent-skills.md`](ai-agent-skills.md) if you want a framework for choosing between broad and curated skill libraries.
- Read [`plugins.md`](plugins.md) if you want the plugin-specific install story for Codex and Claude Code.
- Use [`workflows.md`](workflows.md) when you want step-by-step execution patterns for common engineering goals.
- Return to [`README.md`](../../README.md) for the full compatibility matrix.
