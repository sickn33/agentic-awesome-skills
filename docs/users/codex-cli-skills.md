# Codex CLI Skills

If you want **Codex CLI skills** that are easy to install and practical in a local coding loop, this repository is designed for that exact use case.

Agentic Awesome Skills supports Codex CLI through the `.codex/skills/` path and gives you a wide set of reusable task playbooks for planning, implementation, debugging, testing, security review, and delivery.

Release `9.0.0` also adds a first-class Codex plugin distribution plus bundle plugins. If you want the full explanation of root plugin vs bundle plugin vs full install, read [plugins.md](plugins.md).

## How to use Agentic Awesome Skills with Codex CLI

Install the library into your Codex path, then invoke focused skills directly in your prompt. The most common pattern is:

1. install with `npx agentic-awesome-skills --codex`
2. choose one workflow-oriented skill such as `@brainstorming`, `@concise-planning`, or `@test-driven-development`
3. ask Codex to apply that skill to a concrete file, feature, test, or bugfix

## Why use this repo for Codex CLI

- It supports Codex CLI with a dedicated install flag and a standard skills layout.
- It is strong for local repo work where you want to move from planning to implementation to verification without changing libraries.
- It includes both general-purpose engineering skills and deeper specialist tracks.
- It gives you docs and bundles, not just raw skill files.

## Install Codex CLI Skills

```bash
npx agentic-awesome-skills --codex
```

If you prefer a plugin-style Codex integration, this repository also ships repo-local plugin metadata in `.agents/plugins/marketplace.json` and `plugins/agentic-awesome-skills/.codex-plugin/plugin.json`.

It also generates bundle-specific Codex plugins so you can install a curated pack such as `Essentials` or `Web Wizard` as a marketplace plugin instead of loading the full library.

Those Codex plugins are plugin-safe filtered distributions. Skills that still depend on host-specific paths or undeclared setup stay in the repository, but are not published into the Codex plugin until they are hardened.

For the canonical explanation of how Codex plugins relate to the full library and bundle installs, read [plugins.md](plugins.md).

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

- Read [`ai-agent-skills.md`](ai-agent-skills.md) if you want a framework for choosing between broad and curated skill libraries.
- Read [`plugins.md`](plugins.md) if you want the plugin-specific install story for Codex and Claude Code.
- Use [`workflows.md`](workflows.md) when you want step-by-step execution patterns for common engineering goals.
- Return to [`README.md`](../../README.md) for the full compatibility matrix.
