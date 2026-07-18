# Stable Skills Manifest v1 for Custom Integrations

This page documents the legacy-compatible `skills_index.json` contract used by custom host integrations and lazy loaders.

For Codex and Claude Code, use [AAS Core](aas-core.md) instead of wiring a host directly to this repository manifest. Core uses a verified local catalog and exposes bounded, read-only MCP tools for search, inspection, and recommendation. The raw manifest remains useful for integrations that do not have an AAS Core host adapter.

## Manifest contract (v1)

- **Canonical file:** `skills_index.json` at repository root.
- **Mirror file:** `data/skills_index.json` must be an exact compatibility mirror of `skills_index.json`.
- **Format:** JSON array, one object per skill.
- **Schema:** [`schemas/skills-index.v1.schema.json`](../../schemas/skills-index.v1.schema.json)

## Required fields

Each manifest entry includes:

- `id` – skill identifier (same as `@skill-id`).
- `path` – relative skill folder, e.g. `skills/brainstorming`.
- `category` – grouping used by UI/search surfaces.
- `name` – display name.
- `description` – short purpose/trigger summary.
- `risk` – one of repo risk labels.
- `source` – source of authority/trust metadata.
- `date_added` – ISO date string or `null`.

Additional fields are allowed, and `plugin` metadata is optional.

## Recommended host behavior

Stable integrations must not load every skill instruction file up front.

- Read the manifest (`skills_index.json`).
- Resolve only the requested `@skill-id` values from the conversation.
- For each resolved skill, read that one `SKILL.md` lazily.
- Enforce a per-turn maximum so user prompts stay below context limits.
- Validate each resolved path stays under your configured `SKILLS_ROOT`.

This is the main prevention for context truncation and trajectory conversion errors in custom multi-skill hosts. It is not the AAS Core catalog or stack lifecycle contract.

## Why the `data/` mirror exists

`data/skills_index.json` remains for downstream compatibility where clients still read from the `data/` subtree. The stable contract is that both files contain the same payload.

## Quick structure example

```json
{
  "id": "brainstorming",
  "path": "skills/brainstorming",
  "category": "planning",
  "name": "brainstorming",
  "description": "Use before any creative or constructive work.",
  "risk": "safe",
  "source": "official",
  "date_added": "2026-02-27"
}
```

## Related docs

- [`docs/users/aas-core.md`](aas-core.md)
- [`docs/integrations/jetski-cortex.md`](../integrations/jetski-cortex.md)
- [`docs/integrations/jetski-gemini-loader/README.md`](../integrations/jetski-gemini-loader/README.md)
- [`docs/users/windows-truncation-recovery.md`](windows-truncation-recovery.md)
