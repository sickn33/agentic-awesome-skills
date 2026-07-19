# Repo Growth SEO Playbook

This document keeps the repository's GitHub-facing discovery copy aligned with the SEO-focused user docs.

## Current position

Preferred positioning:

> AAS Core is the local, deterministic boundary that exposes the complete catalog, validates exact skill IDs selected by the coding agent from an explicit project profile, and produces an immutable preview plan, backed by 1,968+ cataloged skills.

Key framing:

- AAS Core as the primary product;
- local MCP and CLI as the agent-facing and operator-facing interfaces;
- `aas-stack.json` and the immutable plan as durable artifacts;
- GitHub as the canonical source, with the hosted catalog and Workbench as discovery and review surfaces;
- catalog, plugins, bundles, workflows, and direct installers as supporting content and distribution.

## GitHub About settings

Preferred description:

> Local, deterministic AAS Core for explainable coding-agent skill stacks, backed by 1,967+ cataloged skills. Includes a read-only MCP, stack CLI, Workbench review, plugins, bundles, workflows, and direct distribution.

Preferred homepage:

> `https://github.com/sickn33/agentic-awesome-skills`

Preferred social preview:

- lead with `AAS Core` and the profile → stack → plan flow;
- present `1,968+ Agentic Skills` as supporting catalog evidence, not a second product;
- mention Codex and Claude as the current Core agent path, with broader host compatibility as distribution support;
- avoid dense text and tiny logos that disappear in social cards.

Preferred topics:

- `antigravity`
- `antigravity-skills`
- `claude-code`
- `claude-code-skills`
- `cursor`
- `cursor-skills`
- `codex-cli`
- `codex-skills`
- `gemini-cli`
- `gemini-skills`
- `kiro`
- `ai-agents`
- `ai-agent-skills`
- `agent-skills`
- `agentic-skills`
- `developer-tools`
- `skill-library`
- `ai-workflows`
- `ai-coding`
- `mcp`

## Release notes checklist

When publishing a release:

- include a title that names the main user-facing use case, not only the internal codename;
- mention newly supported tools, new bundles, and onboarding improvements early;
- link back to the most relevant docs in `docs/users/`;
- keep the first paragraph useful to someone who found the release page from Google.

Suggested opening structure:

1. one-sentence release summary with tool/use-case language;
2. top changes that matter to new and returning users;
3. links to install, bundles, workflows, and relevant comparison pages if needed.

Suggested release template:

```md
## [VERSION] - YYYY-MM-DD - "User-facing title"

> AAS Core and supporting catalog update for local, explainable coding-agent skill stacks.

Start here:

- AAS Core guide: `docs/users/aas-core.md`
- Direct skill distribution: `npx agentic-awesome-skills`
- Choose your tool: `README.md#choose-your-tool`
- Specialized plugins: `README.md#recommended-specialized-plugins`
- Bundles: `docs/users/bundles.md`
- Workflows: `docs/users/workflows.md`

## What's new

- New skills with clear use-case language
- New bundles, workflows, or onboarding docs
- New tool support or compatibility improvements

## Improvements

- Reliability and installer updates
- Quality, validation, or metadata updates
- Security or maintenance work that affects users

## Who should care

- Claude Code users
- Cursor users
- Codex CLI users
- Gemini CLI users

## Credits

- Contributors and merged PRs
```

## Discussions checklist

Suggested pinned discussion topics:

- `Start here: compose a project stack with AAS Core`
- `Choose between an agent-selected Core stack and direct distribution`
- `How the catalog, plugins, bundles, and workflows support Core`

Discussion posts should:

- link to the tool-specific docs in `docs/users/`;
- answer one search intent cleanly;
- end with a single clear next step such as install, star, or compare.

## Content maintenance rules

- Keep README, GitHub About description, and tool-specific user docs semantically aligned.
- Avoid cannibalization by giving each user doc a distinct primary intent.
- Prefer honest comparisons over absolute claims.
- Do not use SEM or paid language in discovery docs unless strategy changes later.
