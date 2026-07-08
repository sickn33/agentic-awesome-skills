---
name: wiki-builder
description: "Create and maintain reusable research wikis with source provenance, configurable structure, and local markdown outputs."
category: "knowledge-management"
risk: "safe"
source: "official"
source_repo: "dair-ai/dair-academy-plugins"
source_type: "official"
date_added: "2026-06-19"
author: "DAIR.AI"
license: "MIT"
license_source: "https://github.com/dair-ai/dair-academy-plugins/blob/main/README.md#license"
tags:
  - dair-academy
  - ai
  - workflow
tools:
  - claude-code
  - codex-cli
  - cursor
---

# Wiki Builder

_Source: [dair-ai/dair-academy-plugins](https://github.com/dair-ai/dair-academy-plugins) (MIT)._

## Purpose

Create and maintain configurable research wikis. Each wiki is a standalone folder with its own sources, compiled pages, derived artifacts, prompts, and local configuration.

By default, wikis live under `~/dair-wikis/`. Override the location with the `WIKI_ROOT` environment variable or the `--root` flag on `init_wiki.sh`.

This skill is intentionally general. Do not hard-code every wiki into the AI papers structure. Use each wiki's `wiki.config.md` as the source of truth for purpose, audience, page types, style rules, and update workflow.

## When To Use

Use this skill when the user asks to:

- Start a new wiki or knowledge base.
- Create a wiki for research notes, papers, products, people, organizations, domains, projects, or events.
- Ingest source material into an existing wiki.
- Generate wiki pages, source pages, concept pages, maps, timelines, briefs, or indexes.
- Query a wiki and file the answer back into the wiki.
- Refactor or evolve a wiki's structure, requirements, or flavor.
- Maintain provenance, source notes, and update logs for a wiki.

## Default Wiki Location

Store wikis here unless the user explicitly gives a different path:

```bash
${WIKI_ROOT:-$HOME/dair-wikis}/<wiki-slug>
```

Use lowercase kebab-case slugs, for example `agent-memory`, `ai-evals`, `open-source-models`, or `company-research`.

## Core Layout

New wikis should start with this layout:

```text
<wiki-slug>/
├── wiki.config.md
├── raw/
├── wiki/
│   └── index.md
├── derived/
├── prompts/
│   ├── compile-index.md
│   ├── compile-source-page.md
│   ├── compile-concept-page.md
│   ├── query-and-file.md
│   └── lint-wiki.md
├── logs/
│   └── maintenance-log.md
└── sources.md
```

Add more folders only when the wiki's config needs them. Common additions include `wiki/papers`, `wiki/concepts`, `wiki/people`, `wiki/products`, `wiki/organizations`, `wiki/timelines`, `wiki/questions`, `wiki/maps`, and `assets`.

## Starting A Wiki

For new wikis, use the bundled script (resolve its path via the plugin install location, typically `${CLAUDE_PLUGIN_ROOT}/skills/wiki-builder/scripts/init_wiki.sh`):

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/wiki-builder/scripts/init_wiki.sh" <slug> --title "Readable Title" --flavor research
```

Pass `--root /custom/path` to put the wiki somewhere other than `~/dair-wikis`.

Supported default flavors are `research`, `paper`, `domain`, `product`, `person`, `organization`, and `project`. Use `research` when unsure.

After scaffolding:

1. Edit `wiki.config.md` to match the user's real goal.
2. Put copied or downloaded source material in `raw/`.
3. Record source provenance in `sources.md`.
4. Generate pages under `wiki/`.
5. Record major maintenance actions in `logs/maintenance-log.md`.

## Operating Workflow

### 1. Resolve The Task

Identify whether the user is asking to start, ingest, compile, query, restructure, lint, or export. If the request names an existing wiki, inspect its `wiki.config.md` before making changes.

### 2. Use The Local Config

Every wiki can have different rules. Before generating or modifying pages, read:

- `wiki.config.md`
- `sources.md` when source provenance matters
- relevant files under `prompts/` when the wiki has custom prompts

The local config beats generic defaults in this skill.

### 3. Preserve Provenance

Do not convert loose claims into wiki facts without a source. When using web pages, papers, transcripts, notes, or repository files, record enough provenance that a future agent can find the original source again.

At minimum, `sources.md` entries should include title, source path or URL, date added, and a short note about what it contributes.

### 4. Compile Pages

Prefer durable wiki pages over one-off summaries. Strong pages usually include:

- a concise overview
- source-grounded key points
- links to related wiki pages
- open questions or uncertainty
- update notes when relevant

Keep page structure consistent with the wiki's config and flavor.

### 5. Maintain The Wiki

When adding or changing many pages, update `wiki/index.md`, relevant maps, and `logs/maintenance-log.md`. If the user's request changes the wiki's purpose or structure, update `wiki.config.md` first.

## Flavors

Use `references/wiki-flavors.md` when choosing or adapting wiki types. The reference gives suggested page types and structures for research, paper, domain, product, person, organization, and project wikis.

## Quality Bar

- Make the first page useful immediately.
- Prefer explicit filenames and stable slugs.
- Separate raw source material from compiled interpretation.
- Link related wiki pages.
- Mark speculation and unknowns clearly.
- Avoid rewriting the same source summary in many places.
- Keep generated pages navigable for future agents and humans.

## Limitations

- Requires the upstream tool, account, API key, or local setup when the workflow names one.
- Does not authorize destructive, production, paid, or external-message actions without explicit user approval.
- Validate generated artifacts or recommendations against the user's real sources before treating them as final.
