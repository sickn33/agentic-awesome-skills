# Plugins for compatible agent clients

AAS ships first-class plugin distributions for **Claude Code** and **Codex**, plus portable [Agent Plugins 1.0](https://agent-plugins.org/specification) manifests for compatible specialized bundles.

This page explains how plugins fit beneath **AAS Core**, the orchestration layer for Codex and Claude Code. Plugins and direct installs deliver skill payloads; Core exposes the complete catalog and validates, records, and plans the exact stack chosen by the agent.

## What a plugin is in this repo

In Agentic Awesome Skills, a plugin is a packaged, installable distribution of skills plus the metadata a host tool needs to expose that distribution through its plugin or marketplace flow.

Plugins are useful when you want:

- a marketplace-style install instead of copying files into `.claude/skills/` or `.codex/skills/`
- a narrower install surface for a team or role
- a safer default distribution for plugin ecosystems
- a stable workflow package that can eventually include skills, app integrations, MCP configuration, hooks, and assets

Plugins are **not** different content formats. They still ship `SKILL.md` playbooks. The difference is the packaging, install surface, and filtering.

## Core orchestration vs delivery surfaces

For Codex and Claude Code, start with [AAS Core](aas-core.md) when you want the agent to choose from catalog evidence. Core exposes read-only local MCP tools and keeps validation, planning, and approved changes in the CLI.

Once the desired stack is clear, plugins and direct installs are two supported delivery surfaces. They do not replace Core and Core is not another plugin bundle.

## Full library install vs plugin install

### Full library install

Use the installer or clone the repository directly when you want the broadest possible coverage:

```bash
npx agentic-awesome-skills --claude
npx agentic-awesome-skills --codex
```

Or clone manually into your preferred skills directory.

Choose the full library when you want:

- the largest available catalog
- repo-only skills that are still being hardened for plugin distribution
- direct filesystem control over the installed tree

### Plugin install

Use the plugin marketplace, repo-local metadata, or portable package when you want a curated, installable distribution:

- **Claude Code** uses `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`
- **Codex** uses `.agents/plugins/marketplace.json` and `plugins/agentic-awesome-skills/.codex-plugin/plugin.json`
- **Agent Plugins clients** load a specialized bundle's root `plugin.json` and discover its skills from the fixed `skills/` directory

Choose the plugin route when you want:

- marketplace-friendly installation
- a cleaner starter surface
- plugin-safe filtering by default
- domain-specific installs such as `AAS Web App Builder`, `AAS Security Engineer`, or `AAS Data Analytics`

## What `plugin-safe` means

Not every skill in the repository is immediately suitable for plugin publication.

`plugin-safe` means the published plugin excludes skills that still need hardening, portability cleanup, or explicit setup metadata. In practice, plugin-safe filtering avoids shipping skills that rely on:

- host-specific local paths
- undeclared manual setup
- assumptions that are acceptable in the full repository but too brittle for marketplace distribution

This is why the **full library** can be larger than the **plugin-safe** subset. That difference is expected and intentional.

The important rule is:

- the repository remains the source of truth for the complete library
- plugins publish the hardened subset that is ready for marketplace-style installation

## Root Plugin Vs Specialized Plugins

The repository now ships two plugin shapes.

### Root plugin

The root plugin is the broad installable distribution for each host:

- **Claude Code root plugin**: install the plugin-safe Antigravity library through the Claude marketplace entry
- **Codex root plugin**: expose the plugin-safe Antigravity library through the Codex plugin surface

Use the root plugin when you want the widest plugin-safe install without picking a specialty bundle. Treat it as an advanced breadth-first option, not the best default for most users.

### Specialized plugins

Specialized plugins are smaller, role-based or workflow-based distributions generated from the same repository. They are the recommended default when a user can name the job they want Claude Code, Codex, or another supported skills host to help with. Examples include:

- `AAS Web App Builder`
- `AAS Security Engineer`
- `AAS Data Analytics`
- `AAS Documents & Presentations`
- `AAS Agent & MCP Builder`

Use a specialized plugin when you want:

- a lighter starting point
- a team-specific plugin install
- a curated subset instead of the broad root plugin
- a plugin with a clear promise, such as building web apps, auditing security, maintaining OSS repos, automating documents, or creating growth content

## Portable Agent Plugins surface

The [Agent Plugins specification](https://agent-plugins.org/specification) defines a shared package floor for Agent Skills and MCP server configuration. A portable AAS bundle has this shape:

```text
plugins/agentic-bundle-<bundle-id>/
├── plugin.json
└── skills/
    └── <skill-id>/
        └── SKILL.md
```

The root `plugin.json` targets the canonical `1.0.0` schema. It deliberately does not copy the host-specific `skills` or `interface` fields used by Codex: Agent Plugins discovers components from fixed locations and its manifest schema is closed.

AAS generates this portable manifest only when every skill in the bundle is plugin-safe for both existing host targets and can be represented as a unique immediate child of `skills/`. Canonical qualified paths are flattened in the generated package without changing their instruction bodies; a basename collision fails the packaging gate. AAS-specific frontmatter such as provenance and risk is preserved as string values under the standard `metadata` field instead of leaking non-standard top-level keys. If any condition fails, the generator omits `plugin.json` instead of making a false portability claim. The per-bundle status in [Bundles](bundles.md) shows that result.

These packages are currently **skills-only**. They do not bundle AAS Core's MCP server, credentials, hooks, or a portable `mcp.json`. Installation and enablement remain client-owned parts of the ecosystem, so use the instructions for your [compatible client](https://agent-plugins.org/compatible-clients) and point it at the desired `plugins/agentic-bundle-*` directory.

`AAS Agent & MCP Builder` is the first public-directory flagship. Its version-controlled [submission dossier](../plugin-submissions/aas-agent-mcp-builder/) contains listing copy, public policy and support URLs, starter prompts, and reviewer-reproducible positive and negative evaluations. The dossier being ready does not mean the plugin is already public: OpenAI Platform review and the verified publisher's final publish action remain separate steps.

The broad Codex and Claude root plugins remain host-specific because their filtered skill sets are not identical. They intentionally do not have a root Agent Plugins manifest. Choose a portable specialized bundle when cross-client packaging matters.

## Claude Code plugin surface

Claude Code uses the repository's root `.claude-plugin` metadata.

Relevant files:

- `.claude-plugin/marketplace.json`
- `.claude-plugin/plugin.json`

Typical install flow:

```text
/plugin marketplace add sickn33/agentic-awesome-skills
/plugin install agentic-awesome-skills
```

Claude Code bundle plugins are also published through the same marketplace metadata, so you can install a focused bundle instead of the root plugin if you prefer.

## Codex plugin surface

Codex uses repo-local plugin metadata that points at the local plugin folders generated by this repository.

Relevant files:

- `.agents/plugins/marketplace.json`
- `plugins/agentic-awesome-skills/.codex-plugin/plugin.json`

The Codex root plugin exposes the same plugin-safe library idea as Claude Code, but through Codex's plugin metadata conventions.

Bundle-specific Codex plugins are generated alongside the root plugin so you can install a narrower pack when plugin marketplaces are available in your Codex environment.

## Which path should you choose?

Choose **AAS Core first** if:

- you want Codex or Claude Code to search and inspect the local catalog
- you want Codex or Claude to search the complete catalog and preserve its exact selection
- you want a reviewable `aas-stack.json` and preview plan before any change
- you want read-only MCP discovery separated from approval-gated CLI operations

Choose the **full library** if:

- you want the biggest catalog
- you are comfortable installing directly into skills directories
- you want repo-only skills that are not yet published as plugins

Choose the **root plugin** if:

- you want the broad installable plugin-safe distribution
- you prefer marketplace-style installation
- you are an advanced user who wants a broad plugin-safe catalog

Choose a **specialized plugin** if:

- you want a smaller role-based install
- you are onboarding a team around one domain
- you want plugin convenience without the breadth of the root plugin
- you want the plugin itself to communicate a clear job, audience, and workflow
- you want one package directory that compatible Agent Plugins clients can load without host-specific manifest fields

The hosted [specialized plugin landing page](https://sickn33.github.io/agentic-awesome-skills/plugins) is the quickest way to compare the current AAS plugin packs.

## Related guides

- [AAS Core](aas-core.md)
- [Getting Started](getting-started.md)
- [FAQ](faq.md)
- [Claude Code skills](claude-code-skills.md)
- [Codex CLI skills](codex-cli-skills.md)
- [Bundles](bundles.md)
- [Specialized Plugin Roadmap](specialized-plugin-roadmap.md)
- [Usage](usage.md)
- [AAS Agent & MCP Builder submission dossier](../plugin-submissions/aas-agent-mcp-builder/)
