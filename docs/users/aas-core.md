# AAS Core: Agent-Owned Skill Stacks

AAS Core lets Codex and Claude search and read the complete local AAS catalog, preserve their exact skill selection as reproducible desired state, and preview a validated plan before any target change.

> **The agent inspects and chooses. AAS records and validates. You control.**

The durable artifact is [`aas-stack.json`](#the-stack-manifest). It records the exact skill IDs chosen by the coding agent; it is not the output of a Core ranking system. The local MCP is a catalog access and composition boundary, the `aas` CLI validates and plans, and Workbench is a browser-local review surface.

## How it works

```text
your project
  -> Codex or Claude inspects the repository
  -> agent searches and reads the complete local AAS catalog
  -> agent chooses the exact skill IDs
  -> compose_stack validates and pins the selection
  -> you review aas-stack.json
  -> aas stack validate
  -> aas stack plan (preview; no skill changes)
```

AAS MCP does not scan the repository and does not decide which skills are best. Codex or Claude uses its own project understanding and judgment. Every catalog skill remains searchable, readable, selectable, and usable; missing or incomplete metadata never makes a skill ineligible.

## Configure the local MCP

> **Release boundary:** AAS Core landed after release 14.6.0. Use an exact Core-capable release rather than an unreviewed moving tag.

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@X.Y.Z -- aas mcp configure \
  --host codex \
  --scope user \
  --config /absolute/path/to/codex/config.toml \
  --cache-root /absolute/path/to/aas-cache
```

Use `--host claude` with the appropriate absolute Claude MCP configuration path for Claude. The first command is a preview and returns an approval digest without changing the host configuration. Review it, then repeat the exact command with:

```text
--approve <approval-digest>
```

Configuration is explicit and integrity-bound. AAS installs or reuses an exact content-addressed runtime, verifies it, and changes only its managed MCP configuration section. Restart the host if it does not reload MCP configuration automatically.

## Ask the agent to choose the stack

Give the agent the desired outcome and constraints, and leave selection judgment with the agent:

```text
Inspect this repository. Search and read the complete local AAS catalog, then
choose the exact skills you judge most useful for this project. Use compose_stack
with a project profile to validate and pin those IDs in a schema 2 aas-stack.json,
then use inspect_stack before presenting it. Do not install or apply anything.
```

The local MCP exposes these read-only tools:

- `search_skills` — retrieve deterministic, paginated matches from every skill in the verified local catalog without scores or ranking;
- `get_skill` — inspect one skill and optionally read its full content;
- `compose_stack` — validate the agent-selected IDs and produce the pinned stack shape;
- `inspect_stack` — validate and explain a proposed manifest;
- `diff_stack` — compare manifests using verified local catalogs.

Search results use a stable catalog order and contain no relevance score, recommendation, or preferred ordering. Codex or Claude evaluates the returned candidates semantically and chooses exact IDs. Metadata returned by search or inspection is informational context; Core does not use risk, source, setup, compatibility, review, or evidence metadata to rank, exclude, or disable a skill.

MCP calls do not install or remove skills, update catalogs, edit host configuration, or apply a stack. Full skill text is returned only when requested and remains marked as untrusted content.

## The stack manifest

`aas-stack.json` records agent-chosen desired state:

```json
{
  "schemaVersion": 2,
  "name": "project-stack",
  "catalog": {
    "package": "agentic-awesome-skills",
    "version": "<version>",
    "integrity": "sha256-..."
  },
  "targets": [{ "host": "codex", "scope": "project" }],
  "profile": {
    "goals": ["build", "test"],
    "projectType": "web application",
    "languages": ["typescript"],
    "frameworks": ["react"],
    "constraints": ["preview only"]
  },
  "skills": [
    { "id": "example-skill" }
  ]
}
```

The manifest pins catalog identity, targets, the project profile, and exact agent-selected skill IDs. It intentionally has no selection policy: Core validates identity and structure but does not overrule the agent's choice because metadata is missing, incomplete, or cautionary.

## Validate and preview the plan

Use absolute paths in automation and review the JSON result from each command:

```bash
aas stack validate --manifest /absolute/path/to/aas-stack.json

aas stack plan \
  --manifest /absolute/path/to/aas-stack.json \
  --target codex:project \
  --target-root /absolute/path/to/project \
  --cache-root /absolute/path/to/aas-cache \
  --runtime-integrity '<npm-sri>' \
  --out /absolute/path/to/plan.json
```

`stack validate` is read-only. `stack plan` writes only the requested plan artifact and does not materialize skills or AAS managed state in the target. The immutable plan binds the manifest, runtime, catalog, target identity, current managed state, and exact logical operations.

Stop after reviewing the plan unless you are deliberately participating in controlled preview development. `stack apply` and `stack recover` remain experimental and require explicit opt-in.

## Privacy, trust, and limits

- MCP is local stdio, process-per-session, read-only, offline-capable, and contains no model credentials or telemetry.
- Codex or Claude owns semantic selection. Different agents or project observations may reasonably produce different stacks.
- Catalog integrity and manifest validation are deterministic; skill suitability is an agent judgment, not a Core score.
- Every canonical skill can be searched, read, selected, and used. Metadata remains visible but informational.
- Catalog updates and runtime changes are explicit. There is no resident daemon or implicit auto-update.
- Skill prose is untrusted content and does not gain instruction authority by being returned through MCP.

## Other ways to use the catalog

Direct installs, specialized plugins, bundles, workflows, and the legacy installer remain available. These surfaces distribute or curate catalog content; AAS Core adds complete local access, durable agent-owned selection, manifest validation, and a reviewable plan.

## Next reads

- [Getting Started](getting-started.md)
- [Usage](usage.md)
- [Skills vs MCP Tools](skills-vs-mcp-tools.md)
- [Plugins for Claude Code and Codex](plugins.md)
- [Bundles](bundles.md)
- [FAQ](faq.md)
