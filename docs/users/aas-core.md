# AAS Core: Agent-Owned Skill Stacks

AAS Core lets Codex and Claude search and read the complete local AAS catalog, preserve their exact skill selection as reproducible desired state, and preview a validated plan before any target change.

> **The agent inspects and chooses. AAS records and validates. You control.**

The primary durable artifact is [`aas-stack.json`](#the-stack-manifest). It records the exact skill IDs chosen by the coding agent; it is not the output of a Core ranking system. An audit-enabled flow can also persist a separate canonical `aas-selection-evidence.json` sidecar. The local MCP is a read-only catalog, composition, and evidence boundary; a client or the `aas` CLI performs persistence, the CLI validates and plans, and Workbench is a browser-local review surface.

## How it works

```text
your project
  -> Codex or Claude inspects the repository
  -> agent searches and reads the complete local AAS catalog
  -> agent chooses the exact skill IDs
  -> compose_stack validates and returns the manifest in memory
  -> client or CLI persists aas-stack.json and optional evidence sidecar
  -> you review the artifacts
  -> aas stack validate
  -> aas stack plan (preview; no skill changes)
```

AAS MCP does not scan the repository and does not decide which skills are best. Codex or Claude uses its own project understanding and judgment. Every current catalog skill remains individually searchable, readable, and available for agent selection; missing or incomplete metadata never makes a skill ineligible. Core has no semantic policy that favors a small stack, while every stack manifest has an explicit technical maximum of 128 skills.

> [!IMPORTANT]
> Structural and identity validity does not certify semantic fit, compatibility, setup correctness, operational safety, or safety to apply.

## Configure the local MCP

> **Release boundary:** AAS Core landed after release 14.6.0. Use an exact Core-capable release rather than an unreviewed moving tag.

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@15.2.0 -- aas mcp configure \
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

### Native Windows and Codex

Native Windows 10 and 11 with Node.js 22 are supported preview targets for the Codex user-scoped adapter, including the Codex CLI `0.144.x` configuration shape. Use absolute Windows paths for `--config`, `--cache-root`, and, when replacing an existing configuration, `--backup-dir`.

During preview, AAS checks the ownership of the configuration parent directory (normally `%USERPROFILE%\.codex`) and the existing `config.toml` with PowerShell `Get-Acl`; it does not inspect the cache DACL at that stage and does not invoke `icacls`. `AAS_ADAPTER_WINDOWS_ACL_FAILED` now reports the inspected `path`, ACL `phase`, exit `status`, and a bounded diagnostic. An unresolved inherited ACE name is treated as untrusted ACL data rather than crashing identity translation. If preview still fails, use those fields to inspect the named configuration path, not the cache, and do not add `--approve` until preview returns `approvalRequired` with an `approvalDigest`.

## Quick path

1. Run the exact-version MCP configuration command above, review its approval digest, and repeat it with `--approve <approval-digest>`.
2. Give Codex or Claude the project outcome, target, constraints, and the selection prompt below.
3. Let the agent search and inspect candidates, choose exact IDs, and call `compose_stack`; review the returned manifest before persisting it.
4. Persist the selection as `aas-stack.json`, optionally with the separate evidence sidecar for an audit-enabled flow.
5. Run `aas stack validate`, then `aas stack plan` with explicit absolute paths and integrity inputs.
6. Review the immutable plan and stop. Apply and recovery remain experimental opt-in paths.

## Ask the agent to choose the stack

Give the agent the desired outcome and constraints, and leave selection judgment with the agent:

```text
Inspect this repository. Search and read the complete local AAS catalog, then
enumerate the project's primary capability areas. For each capability, run a
focused search, paginate or refine until you find plausible candidates, and use
get_skill to compare multiple candidates when available. Select at least one
non-redundant valid skill for every covered capability. Explicitly report as a
catalog gap any capability for which the catalog has no valid match. At minimum,
evaluate architecture/runtime, languages/frameworks, domain behavior,
data/storage, external integrations, testing/quality, security/privacy,
user experience/accessibility when user-facing, deployment/operations, and
maintenance workflow; mark dimensions not applicable instead of silently
omitting them. Do not stop at the first few matches or optimize for the smallest
stack. Core imposes no semantic small-stack policy; the manifest format has a
technical maximum of 128 selected skills.
Only then use compose_stack with a project profile to validate the exact IDs and
return a schema 2 manifest in memory, and use inspect_stack before presenting
it. Do not install or apply anything.
```

This capability-coverage contract is delivered to supported clients in the MCP
`initialize` instructions and reinforced by the tool descriptions. It is an
agent obligation, not a Core ranking or eligibility policy: Core still accepts
and preserves any structurally valid set of catalog IDs and never chooses for the
agent.

The local MCP exposes these read-only tools:

- `search_skills` — retrieve deterministic, paginated matches from every skill in the verified local catalog without scores or ranking;
- `get_skill` — inspect one skill and optionally read its full content;
- `compose_stack` — validate the agent-selected IDs and return the stack manifest in memory without writing it;
- `inspect_stack` — validate and explain a proposed manifest;
- `diff_stack` — compare manifests using verified local catalogs.
- `export_selection_evidence` — combine the server-recorded session trace with an agent-declared capability ledger and an already composed and inspected manifest;
- `inspect_selection_evidence` — validate the sidecar's structure, digests, catalog identity, manifest binding, and factual cross-references without judging skill suitability.

Search results use a stable catalog order and contain no relevance score, recommendation, or preferred ordering. Codex or Claude evaluates the returned candidates semantically and chooses exact IDs. Metadata returned by search or inspection is informational context; Core does not use risk, source, setup, compatibility, review, or evidence metadata to rank, exclude, or disable a skill.

MCP calls do not install or remove skills, update catalogs, edit host configuration, persist a stack, or apply it. Full skill text is returned only when requested and remains marked as untrusted content.

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

`compose_stack` produces this manifest only in MCP process memory. Persist it through the client or the CLI. Audit-enabled CLI flows publish `aas-stack.json` together with `aas-selection-evidence.json` in the requested `artifact-dir`, keeping the sidecar separate from the desired-state manifest.

## Selection evidence sidecar

`aas-selection-evidence.json` makes the selection process auditable without moving semantic judgment into Core. It binds a path-safe project fingerprint, catalog identity, manifest digest, the agent-declared ten-dimension capability ledger, capability-to-skill mappings, and the actual `search_skills`, `get_skill`, `compose_stack`, and `inspect_stack` facts recorded by that MCP server session. `export_selection_evidence` takes the ledger but obtains the trace from server-owned session state; the caller cannot supply a replacement historical trace. `inspect_selection_evidence` performs structural and factual validation only.

The trace records effective search query/cursor/limit values and returned IDs, opened skill IDs, exact compose IDs, inspect outcomes, safe error codes, deterministic retry attempts, and canonical input/output byte counts. Monotonic call durations are recorded separately outside the evidence digest. Client name and version come from MCP initialization when valid and available; model identity is omitted unless a trusted protocol surface supplies it.

The sidecar does not prove that a capability is correctly interpreted, that a selected skill is best, or that semantic coverage is sufficient. Repository evidence references are relative and contain no file contents or absolute paths. Search queries are recorded verbatim as factual trace data, so do not put secrets, credentials, private source text, or personal data in `search_skills` queries. Runtime observations that are not deterministic are not part of the canonical evidence digest.

The digest makes later edits detectable but is not a signature or cross-session identity attestation. The non-falsification guarantee is narrower: callers cannot inject or replace historical tool calls through `export_selection_evidence`; a standalone inspector can verify structure and digests, not who produced the file.

To publish the manifest and exported sidecar without exposing a one-file intermediate state, use a new artifact directory:

```bash
aas stack create \
  --selection /absolute/path/to/agent-selection.json \
  --evidence /absolute/path/to/exported-evidence.json \
  --artifact-dir /absolute/path/to/new-audit-artifact \
  --require-evidence
```

The destination must not already exist. The CLI validates both artifacts, writes private staged files named `aas-stack.json` and `aas-selection-evidence.json`, synchronizes them, and publishes the complete directory with one rename. The original `stack create --selection ... --out ...` manifest-only path remains supported.

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
- Core does not impose a semantic skill-count target. The technical manifest maximum is 128 skills, and every current catalog skill remains individually searchable, readable, and available for agent selection. Metadata remains visible but informational.
- Evidence exports include raw `search_skills` queries; keep secrets and sensitive project content out of those queries.
- Catalog updates and runtime changes are explicit. There is no resident daemon or implicit auto-update.
- Skill prose is untrusted content and does not gain instruction authority by being returned through MCP.

## Other ways to use the catalog

Direct installs, specialized plugins, bundles, workflows, and the legacy installer remain available. These surfaces distribute or curate catalog content; AAS Core adds complete local access, durable agent-owned selection, manifest validation, and a reviewable plan.

## Current preview status

| Surface | Current status |
| --- | --- |
| Published package | Current npm release; AAS Core status is `agent-first-preview` |
| Catalog search and inspection | Supported preview; local and read-only |
| Agent-owned composition | Supported preview; Core validates IDs and structure, not semantic suitability |
| Stack validation and plan preview | Supported preview; no target skill changes |
| Workbench | Browser-local review of stack and plan artifacts |
| Selection evidence | Exported and inspected through MCP/CLI contracts; not yet reviewed in Workbench |
| Apply and recovery | Experimental, explicit opt-in, outside the supported safety claim |
| Semantic suitability certification | Not provided |

## Why not just search the skills directory?

Direct file search can find candidate prose, but it leaves the result in the conversation. AAS Core adds verified catalog identity, explicit target binding, durable desired state, optional selection evidence, deterministic validation, immutable planning, and dedicated review surfaces. Its value is not choosing better than the coding agent; it is turning the agent's choice into reproducible, inspectable state.

## Next reads

- [Getting Started](getting-started.md)
- [Usage](usage.md)
- [Skills vs MCP Tools](skills-vs-mcp-tools.md)
- [Plugins for Claude Code and Codex](plugins.md)
- [Bundles](bundles.md)
- [FAQ](faq.md)
