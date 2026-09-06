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
  -> aas stack audit (optional cross-artifact consistency check)
```

AAS MCP does not scan the repository and does not decide which skills are best. Codex or Claude uses its own project understanding and judgment. Every current catalog skill remains individually searchable, readable, and available for agent selection; missing or incomplete metadata never makes a skill ineligible. Core has no semantic policy that favors a small stack, while every stack manifest has an explicit technical maximum of 128 skills.

> [!IMPORTANT]
> Structural and identity validity does not certify semantic fit, compatibility, setup correctness, operational safety, or safety to apply.

## Configure the local MCP

> **Release boundary:** AAS Core landed after release 14.6.0. Use an exact Core-capable release rather than an unreviewed moving tag.

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@16.8.0 -- aas mcp configure \
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
6. Review the immutable plan. For actual skill use, follow the supported [direct distribution handoff](#use-the-reviewed-selection); Core apply and recovery remain experimental opt-in paths.

## Ask the agent to choose the stack

### Start from a catalog shortlist

Use **Explore skills by outcome** in the catalog or Workbench to describe a task or choose a starting example. The browser suggests candidates from the public catalog and explains which terms match. Names and tags weigh more than descriptions; distinctive terms weigh more than common terms. This is descriptive relevance, not a quality score, semantic assessment, or effectiveness benchmark. Inspect the complete instructions and constraints before selecting anything. Core/MCP retrieval remains neutral and every canonical ID remains available.

Use `without Supabase` or `senza Supabase` for an explicit single-term exclusion; repeat the phrase for additional terms. The interpreted exclusions are displayed. Other natural-language constraints still need agent review. Explicit compatibility aliases share one result card, with individually selectable matching alternative IDs.

Each candidate exposes provenance, license, declared risk and setup information, including missing fields. These are author-supplied metadata, not reliability badges. Add candidates explicitly to the shared shortlist, compare them, and choose **Use discovery goal in brief** to carry the goal into the existing agent handoff. Nothing is selected automatically.

Workbench downloads the public catalog only after you open discovery. Artifact review does not need that download and never sends imported artifacts or goals. The goal remains in page memory; only explicitly shortlisted IDs use the existing browser-local shortlist. There is no usage measurement, installation diary, or centralized collection.

In the [hosted catalog](https://sickn33.github.io/agentic-awesome-skills/), add candidate skills to your shortlist. Open the comparison above the search results to inspect descriptions, declared risk, manual setup, plugin packaging, source, and license metadata. Missing metadata is shown explicitly; it does not make a skill unavailable to Core.

Enter the project outcome and select Codex or Claude as the project target, preview the brief, then copy it into your coding agent with the local AAS MCP configured. The brief includes exact candidate IDs and the catalog version. It asks the agent to inspect the complete catalog and explain its final selection, including any additions or omissions. A shortlist is input to that review, not an approved stack.

The catalog stores shortlisted IDs in browser-local storage. The goal and brief remain in page memory until copied. Workbench does not consume the brief: after the agent returns a manifest and you review it, persist and validate the manifest, generate the immutable CLI plan, then explicitly import those two artifacts into Workbench. If clipboard access is unavailable, select the brief text from its preview.

### Start directly in the coding agent

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
- `list_skill_files` — page through the selected skill's catalog-bound file inventory, including reference documents and scripts;
- `read_skill_file` — read one inventoried UTF-8 file locally as inert, untrusted text after verifying its size and digest;
- `compose_stack` — validate the agent-selected IDs and return the stack manifest in memory without writing it;
- `inspect_stack` — validate and explain a proposed manifest;
- `diff_stack` — compare manifests using verified local catalogs.
- `export_selection_evidence` — combine the server-recorded session trace with an agent-declared capability ledger and an already composed and inspected manifest;
- `inspect_selection_evidence` — validate the sidecar's structure, digests, catalog identity, manifest binding, and factual cross-references without judging skill suitability.

Search results use a stable catalog order and contain no relevance score, recommendation, or preferred ordering. Codex or Claude evaluates the returned candidates semantically and chooses exact IDs. Metadata returned by search or inspection is informational context; Core does not use risk, source, setup, compatibility, review, or evidence metadata to rank, exclude, or disable a skill.

MCP calls do not install or remove skills, update catalogs, edit host configuration, persist a stack, or apply it. Full skill text is returned only when requested and remains marked as untrusted content.

The stdio transport bounds every complete JSON line, including its newline, to
256 KiB. Ordinary requests and unrelated metadata retain the 4 KiB base limit.
Arguments to `compose_stack`, `inspect_stack`, `diff_stack`, and the two evidence
tools may use the larger frame because manifests and ledgers routinely exceed
4 KiB; their schema limits still apply. Codex turn metadata shares the same total
frame budget. Use compact JSON transport and the CLI inspector for sidecars that
do not fit in a complete MCP request. Parsed request-limit errors preserve a
bounded request ID so the client receives the failure instead of waiting for a
response it cannot correlate; malformed or discarded frames retain a null ID.

### Narrow a search explicitly

`search_skills` retains its broad, backward-compatible default, `matchMode: "any"`:
any query token or an exact ID prefix can match. Use `matchMode: "all"` to require
every whitespace-separated query term, for example:

```json
{"query":"postgres migration","matchMode":"all","requiredTerms":["postgres"],"categories":["database"],"limit":20}
```

`requiredTerms` always uses AND; `categories` matches any supplied category;
`tags` requires every supplied tag. Each optional list accepts up to 16 strings
of at most 64 characters. Required terms cannot contain whitespace. Terms and
tags use the catalog's token aliases. Category facets join `front-end` with
`frontend`, `back-end` with `backend`, and `databases` with `database`, preserving
the original metadata and all skill IDs. Filters apply only when supplied by the
caller; empty query and empty filters still reach the complete catalog through
pagination.

Results expose `matchedTokens`, `matchedRequiredTerms`, `matchReason`, and the
normalized `categoryFacet`. These explain retrieval, not suitability. Explicit
search options are retained in the exported factual session trace.

The web catalog defaults to **All words**, offers **Any word** and explicit
**Approximate** matching, and supports additional required words. Mode, query,
required words, and category travel in the URL. Approximate matching is a browser
convenience and is not part of MCP. Both surfaces retain catalog order unless a
web user explicitly chooses another sort. The web searches displayed catalog
fields; Core also has indexed trigger metadata, so result sets can differ.

### Read the complete bundle

After `get_skill`, follow its relative references with `list_skill_files`, for
example `{"id":"debugging-strategies","limit":20}`. Follow `nextCursor` until
it is `null`. Then call `read_skill_file` with
`{"id":"debugging-strategies","path":"resources/implementation-playbook.md"}`.
Paths are relative to that skill directory, exactly as returned by the inventory.
Scripts are displayed as text and never executed. Their contents have no authority
over the agent's instructions or permissions.

The inventory is included in the catalog digest; each read checks the local bytes
against that inventory. Reads accept UTF-8 text up to 1 MiB and reject binary data,
symlinks (including parent directories), hardlinks, traversal and modified files.
Larger and binary files remain visible with their size and digest for inspection
through the release-pinned source bundle. Missing local payloads return
`AAS_SKILL_FILE_UNAVAILABLE`; MCP never fetches them. Older catalogs without a file
inventory return `AAS_SKILL_FILE_INDEX_UNAVAILABLE` while existing discovery and
`get_skill` continue to work. File reads are not part of the selection sidecar's
four-tool factual trace and do not constitute semantic review evidence.

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

The trace records effective search query/cursor/limit values, explicitly supplied match modes and filters, and returned IDs, opened skill IDs, exact compose IDs, inspect outcomes, safe error codes, deterministic retry attempts, and canonical input/output byte counts. Monotonic call durations are recorded separately outside the evidence digest. Client name and version come from MCP initialization when valid and available; model identity is omitted unless a trusted protocol surface supplies it.

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

aas stack audit \
  --manifest /absolute/path/to/aas-stack.json \
  --evidence /absolute/path/to/aas-selection-evidence.json \
  --plan /absolute/path/to/plan.json
```

`stack validate` is read-only. `stack plan` writes only the requested plan artifact and does not materialize skills or AAS managed state in the target. The immutable plan binds the manifest, runtime, catalog, target identity, current managed state, and exact logical operations.

Use an existing target directory. On `main`, missing paths, wrong file/directory
types and denied access return bounded `AAS_CLI_*` filesystem errors; correct the
path or its permissions and retry. Native exception messages and private paths are
not copied into the result. This error-handling refinement is available from 16.8.0.

From 16.8.0, `--target` is inferred only when the validated manifest has one target; otherwise supply, for example, `--target codex:project`. The runtime version comes from the manifest, and its verified catalog must match the manifest's catalog. Cache location and target directory remain explicit.

On unreleased `main`, the CLI can resolve the runtime when exactly one fully verified cached runtime exists for the manifest version. It reads only the explicit cache, never downloads, and rejects ambiguity. Supply `--runtime-integrity` to select an exact runtime when needed; published 16.8.0 still requires it. The npm SRI is the `runtime.integrity` returned by the approved MCP configuration.

`stack audit` is also read-only. It validates all three artifacts independently, resolves the manifest's pinned verified catalog, and reports whether their manifest digests, catalog identities, target, and selected skill IDs remain consistent. A structurally invalid or unverifiable artifact fails closed; a valid but differently bound artifact returns `status: "inconsistent"` with stable reason codes.

Stop after reviewing the plan unless you are deliberately participating in controlled preview development. `stack apply` and `stack recover` remain experimental and require explicit opt-in.

## Use the reviewed selection

On unreleased `main`, prepare the direct-installer preview from the agent's manifest without copying IDs manually:

```bash
aas stack install-preview \
  --manifest /absolute/path/to/aas-stack.json \
  --destination /absolute/path/to/project/.agents/skills
```

For PowerShell, add `--shell powershell`. `--destination` is the actual skill directory, not the project root. The command validates the manifest against its verified local catalog (use `--cache-root` for another cached catalog) and returns a shell-quoted command plus executable/argument fields. It reads no project source, chooses no skills, executes nothing, and always prepares `--dry-run`. Empty selections and unknown IDs fail. It does not check release availability: an unpublished source catalog is not proof that the same bytes are available from npm. Run and review the direct installer's preview before authorizing installation. This handoff does not apply a Core plan or alter the experimental apply/recovery boundary.

**Prepare installation preview** in shortlist comparison or Workbench generates a copyable direct-installer command. Enter the actual skill directory and choose bash/zsh or PowerShell. The command preserves the selected IDs and exact catalog release and always includes `--dry-run`. It stays in page memory and is never executed by the browser. Workbench hides preparation while supplied artifacts are invalid or inconsistent; browser checks still do not prove semantic suitability or catalog integrity.

For supported installation, use the direct installer with the same exact IDs,
release version and intended skill directory. Follow [From selection to use](../../README.md#from-selection-to-use):
review its `--dry-run` output and repeat without that flag when installation is
authorized. The direct installer has its own destination checks and ownership
manifest; it does not consume the Core plan. Review any updated skill bytes or
prerequisites before replacing an existing selection.

Then invoke the selected skill on a real task and retain the observed check or
artifact. The [worked cases](workflows.md#recorded-worked-cases) record inputs and
results. Workbench's optional feedback export contains only the fields you enter;
it does not upload project artifacts or send a report automatically.

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
| Workbench | Browser-local review of stack, plan and optional evidence, with a recorded example |
| Selection evidence | MCP/CLI export and inspection; Workbench checks schema, digests, project references and cross-artifact bindings without semantic certification |
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

### MCP overload and notifications

The stdio queue accepts at most 32 pending frames. A rejected call receives `AAS_MCP_QUEUE_FULL` with its bounded, strictly parsed request ID, so the client can finish that call and retry with fewer simultaneous requests. Notifications have no reply, including on overload; they must not be used for operations that require a confirmed result. Malformed JSON and invalid request envelopes are rejected without reflecting an invalid identifier. See the [JSON-RPC response and notification rules](https://www.jsonrpc.org/specification).
