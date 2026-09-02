# The Full Skill Library: At-a-Glance Overview

Agentic Awesome Skills ships a verified catalog of **2,107 skills** in `skills/<skill-id>/SKILL.md`. This page is a curated high-level map of the whole library: how skills are organized, the main capability areas and their approximate sizes, the risk labels you will encounter, and the authoritative surfaces to browse when you need the complete, current list.

The authoritative, machine-generated catalog is [`CATALOG.md`](../../CATALOG.md). This overview is a hand-maintained index; it can lag the catalog after a release, so treat `CATALOG.md` and `skills_index.json` as the source of truth for counts and exact skill lists.

## How the library is organized

Every skill directory contains a `SKILL.md` whose frontmatter drives discovery:

| Field | Purpose |
| --- | --- |
| `name` | Canonical skill id, e.g. `email-issue-fixer` |
| `description` | Short purpose and trigger summary shown in search surfaces |
| `category` | Thin grouping used by UI/search (see notes below) |
| `tags` | Free-form keywords for search |
| `risk` | One of `none`, `safe`, `critical`, `offensive`, or `unknown` |
| `source` / `source_type` | Provenance of the skill content |
| `date_added` | When the skill entered the registry |

The full registry is exposed through three consistent surfaces:

- [`CATALOG.md`](../../CATALOG.md) — human-readable catalog grouped by category.
- `skills_index.json` — the legacy compatibility manifest (documented in [`discovery-manifest.md`](discovery-manifest.md)).
- `data/catalog.json` — structured catalog used by the catalog app and AAS Core.

> The `category` field is loose and historically fragmented (hundreds of skills are unclassified). Use `tags`, full-text search, and the AAS Core `search_skills` tool instead of relying on the category field as a taxonomy.

## Capability areas

The table below groups the real catalog data into editorial capability areas so you can find the region of the library that matches your task. Counts are approximate and change as the catalog evolves.

| Capability area | Approx. skills | What you will find |
| --- | ---: | --- |
| Development & code quality | 480 | General, frontend, backend, mobile and fullstack development; language-specific guidance; code review and quality patterns |
| Other & uncategorized | 330 | Small, niche, or legacy skills without a clean category label |
| Cloud & infrastructure | 215 | Cloud platforms, DevOps, databases, operations, and ML infrastructure |
| AI, agents & ML | 205 | Agent workflows, orchestration, evaluation, prompt engineering, and voice agents |
| Automation, productivity & workflow | 190 | Task automation, workflows, browser automation, productivity, and collaboration |
| Content, writing & creative | 160 | Writing, design, graphics, media, video, and presentation skills |
| Business, product & research | 160 | Strategy, planning, product, project management, legal, finance, research, education, and health |
| Security & pentesting | 85 | Security engineering, offensive testing, and defensive hardening |
| Marketing, growth & SEO | 70 | Campaigns, analytics, SEO, growth, and app-store optimization |
| Data & document processing | 65 | Data science, engineering, spreadsheets, documents, and knowledge management |
| Testing & reliability | 55 | Test authoring, automation, reliability, and quality engineering |
| Meta, authoring & special | 35 | Meta skills, skill authoring, and general-purpose helper skills |
| API & integrations | 30 | Connectors and automation built around third-party APIs |
| Gaming & blockchain | 25 | Game development, blockchain, and cryptocurrency |

## Risk labels

Every skill carries a `risk:` label in its frontmatter:

| Risk | Meaning |
| --- | --- |
| `none` | No elevated risk; plain productivity guidance |
| `safe` | Generally safe; local or low-impact operations |
| `critical` | Privileged, destructive, or high-impact operations (code execution, deployments, pipelines) |
| `offensive` | Offensive security / penetration-testing content; review the security guardrails before use |
| `unknown` | Legacy or unclassified content that predates the risk-labeling scheme |

Of the current catalog, roughly **1,090 are `critical`**, **850 are `safe`**, **100 are `none`**, and **60 are `offensive`**.

Read [`SECURITY_GUARDRAILS.md`](../../docs/SECURITY_GUARDRAILS.md) and the [`security-guardrails`](../../docs/contributors/security-guardrails.md) contributor guide before invoking anything marked `critical` or `offensive`.

## How to find the right skill

1. **Search the full catalog** — with AAS Core running, use `search_skills`/`get_skill`; see the [usage guide](usage.md).
2. **Browse the generated catalog** — [`CATALOG.md`](../../CATALOG.md) lists every skill by category with description, risk, source, and tags.
3. **Use bundles as editorial shortlists** — see [bundles](bundles.md) for curated packs like the Web Wizard.
4. **Use the tool-specific guides** — [Claude Code](claude-code-skills.md), [Codex CLI](codex-cli-skills.md), [Cursor](cursor-skills.md), and [Gemini CLI](gemini-cli-skills.md) include starter picks.

## Distribution surfaces

The same skills reach you through several channels, all backed by the same source tree:

- **Full library** — direct install of the complete catalog (`~/.agents/skills/` by default).
- **Plugins** — root and bundle plugins for Claude Code and Codex (see [plugins](plugins.md)).
- **AAS Core** — agent-owned, reproducible selection validated against the catalog.

## Related pages

- [Usage guide](usage.md) — compose and use a skill stack.
- [AAS Core](aas-core.md) — agent-owned catalog search and selection.
- [Discovery manifest](discovery-manifest.md) — the machine-readable `skills_index.json` contract.
- [Bundles](bundles.md) — curated skill packs.
- [Security skills](security-skills.md) — guidance for security-relevant skills.