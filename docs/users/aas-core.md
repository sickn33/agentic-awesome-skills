# AAS Core: Agent-First Skill Stacks

> **Preview status:** AAS Agent-First Preview helps Codex and Claude compose a local, explainable, reproducible skill stack. Full-catalog recommendation quality and transactional apply/recovery safety are not yet certified.

AAS Core is the primary way to turn the repository's skill catalog into a controlled project stack:

> **The agent composes. You control. AAS keeps the stack reproducible.**

The durable artifact is [`aas-stack.json`](#the-stack-manifest), not a prompt, an opaque model decision, or a copy of the entire catalog. The same deterministic, versioned core powers the local MCP server and the `aas` CLI. The hosted Workbench is a review surface; it is not a browser-side installer or hosted control plane.

## How it works

```text
your project
  -> Codex or Claude inspects the repository
  -> local AAS MCP (stdio, read-only)
  -> deterministic AAS Core + bundled or verified local catalog
  -> agent explains a recommendation and proposes aas-stack.json
  -> you review the exact skills, target, policy, and catalog identity
  -> aas stack validate
  -> aas stack plan (preview; no skill changes)
```

The agent may inspect your project using its normal local capabilities, but AAS MCP does not scan the repository. It receives an explicit, allowlisted profile from the agent and returns structured catalog evidence.

## Configure the local MCP

> **Release boundary:** AAS Core landed on `main` after the published 14.6.0 package. Do not use 14.6.0 for this bootstrap. Wait for a release that explicitly includes AAS Core, then substitute that exact version below.

The package publishes separate `aas` and `aas-mcp` binaries. For a pinned Core release without relying on npm's default-bin selection, invoke `aas` explicitly:

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@latest -- aas mcp configure \
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

## Ask the agent to compose the stack

Once the host discovers the AAS MCP tools, give it the outcome and constraints rather than manually choosing from almost 2,000 skills:

```text
Inspect this repository and use the AAS MCP tools to recommend a small skill stack
for implementing and testing this project. Explain exclusions and unknowns, then
propose an aas-stack.json. Do not install or apply anything.
```

The local MCP exposes exactly these read-only tools:

- `search_skills` — search the verified local catalog;
- `get_skill` — inspect one skill and its recorded evidence;
- `recommend_stack` — produce a deterministic recommendation from an explicit profile and policy;
- `inspect_stack` — validate and explain a proposed manifest;
- `diff_stack` — compare manifests using verified local catalogs.

It also exposes the `aas://skills/{id}` resource template. MCP calls do not install or remove skills, update catalogs, edit host configuration, or apply a stack. Full skill text is returned only when requested and remains marked as untrusted content.

## The stack manifest

`aas-stack.json` records approved desired state:

```json
{
  "schemaVersion": 1,
  "name": "project-stack",
  "catalog": {
    "package": "agentic-awesome-skills",
    "version": "<version>",
    "integrity": "sha256-..."
  },
  "targets": [{ "host": "codex", "scope": "project" }],
  "intent": { "goals": ["build", "test"] },
  "policy": {
    "allowedRisk": ["none", "safe"],
    "requireKnownSource": true,
    "allowManualSetup": false
  },
  "skills": [
    { "id": "example-skill" }
  ]
}
```

The manifest pins the catalog identity, target, intent, policy, and exact skill IDs. Repository observations, ranking factors, exclusions, unknowns, and natural-language explanations stay in recommendation or plan output instead of becoming hidden state.

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

`stack plan` derives the exact runtime version from the catalog identity in `aas-stack.json`; the verified runtime integrity remains explicit. The CLI rejects a legacy `--runtime-version` override when it disagrees with the manifest, so the documented command does not need a version edit for each release.

`stack validate` is read-only. `stack plan` writes only the requested plan artifact and does not materialize skills or AAS managed state in the target. The immutable plan binds the manifest, runtime, catalog, target identity, current managed state, and exact logical operations.

Stop after reviewing the plan unless you are deliberately participating in controlled preview development. `stack apply` and `stack recover` are disabled by default, require additional experimental flags and exact digest approval, and are **not supported or certified preview safety claims**.

## Privacy, trust, and limits

- MCP is local stdio, process-per-session, read-only, offline-capable, and contains no model credentials or telemetry.
- Recommendation is deterministic and evidence-based; AAS does not call another model, use embeddings, or perform remote ranking.
- Missing evidence is reported as `unknown`. AAS may leave goals uncovered instead of presenting a weak match as certainty.
- Catalog updates and runtime changes are explicit. There is no resident daemon or implicit auto-update.
- The MCP boundary does not grant skill prose instruction authority and cannot guarantee how an external model interprets untrusted content.
- Preview qualification does not certify full-catalog recommendation quality, transactional crash/race safety, apply, or recovery.

## Other ways to use the catalog

AAS Core is the recommended path when Codex or Claude can use the local MCP. Existing distribution paths remain available:

- direct skill installs for hosts that load `SKILL.md` files;
- specialized plugins for a fixed, domain-focused distribution;
- bundles as human-curated presets;
- workflows as ordered execution playbooks;
- the legacy `agentic-awesome-skills` installer for compatible direct installs.

These surfaces provide catalog content and packaging. AAS Core adds project-aware composition, explicit policy, a durable stack manifest, and a reviewable plan.

## Next reads

- [Getting Started](getting-started.md)
- [Usage](usage.md)
- [Skills vs MCP Tools](skills-vs-mcp-tools.md)
- [Plugins for Claude Code and Codex](plugins.md)
- [Bundles](bundles.md)
- [FAQ](faq.md)
