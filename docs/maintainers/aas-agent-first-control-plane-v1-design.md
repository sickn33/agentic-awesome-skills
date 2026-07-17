# AAS Agent-First Control Plane v1 Design

Status: frozen and approved for implementation
Date: 2026-07-17

## Product statement

> L'agente compone. Tu controlli. AAS mantiene lo stack aggiornato.

AAS finds, installs, and maintains the right set of skills for each project and agent. The durable product is the approved stack; CLI and MCP are its operational interfaces, while Workbench is the review surface.

## Understanding summary

- Users will ask Codex, Claude Code, or another agent to select skills instead of manually choosing among almost 2,000 entries.
- The agent inspects the project, sends an allowlisted synthetic profile to a local AAS MCP process, and explains the deterministic AAS result.
- A minimal `aas-stack.json` stores approved intent, policy, targets, catalog identity, and exact skill IDs.
- A human approves an immutable plan before the CLI writes anything.
- MCP is local, stdio, process-per-session, read-only, offline-capable, and contains no model or API credentials.
- One versioned core powers CLI, MCP, and Workbench projections.
- Missing metadata is reported as `unknown`; it is never presented as algorithmic certainty.

## Baseline

The published `agentic-awesome-skills` package is version 14.6.0 and exposes the legacy `agentic-awesome-skills` installer entrypoint. The installer already supports exact skill IDs, multiple targets, release pinning, dry-run, managed state, atomic preflight, and symlink safety. It does not yet expose stack lifecycle commands, a JSON recommendation API, or an MCP server.

The current catalog contains 1,965 skills. All entries have basic identity, category, source, risk, compatibility, and setup fields, but evidence coverage is uneven: 936 risks are `unknown`; only 361 entries have non-empty tags; `source_type`, source repository, and license are present for roughly one quarter of the catalog; structured test, review, and quality evidence fields are absent. Existing compatibility and setup values require provenance auditing before they can be treated as strong evidence.

## Scope

### Included

- One npm package with a shared deterministic core.
- Public entrypoints `aas`, `aas-mcp`, and the compatible legacy alias `agentic-awesome-skills`.
- Minimal stack manifest and versioned JSON schemas.
- Explicit catalog update/status and content-addressed local cache.
- Deterministic search, skill inspection, recommendation, eligibility, diff, validation, planning, apply, doctor, and recovery.
- User- or project-scoped MCP configuration adapters for Codex and Claude in v1.
- Minimal Workbench import/review for manifests and plans through user-mediated paste/upload; no ambient filesystem access or browser-side installation.
- Versioned benchmark, hostile-input corpus, independent package verifier, and release evidence bundle.

### Explicit non-goals

- Remote or hosted MCP, AAS accounts, login, cloud sync, or hosted API.
- Repository profile upload, remote telemetry, or analytics by default.
- Internal models, embeddings, remote ranking, or free inference from skill prose.
- Marketplace, public stack publishing, sharing, remixing, or community registry.
- Resident daemon/socket, implicit auto-update, or mandatory global installation.
- Runtime copied into every repository, multi-package split, or plugin system for the core.
- Full Workbench editor, browser filesystem access, or browser-triggered installation.
- Native configuration adapters for every agent host.
- Enrichment of all catalog entries as a prerequisite for preview.
- An OS sandbox guarantee or protection from a machine already compromised by a same-user process.

## Architecture

```text
User
  -> Codex / Claude
      -> aas-mcp (local stdio, one process per host session)
          -> deterministic core
              -> bundled or verified cached catalog
      -> proposed aas-stack.json
  -> human approval
      -> aas stack plan --out .aas/plan.json
      -> aas stack apply --plan .aas/plan.json
  -> Workbench import/review
```

The npm package ships one internal core and two implementations, plus the legacy entrypoint alias. A user-local installation is the default for personal and non-JavaScript work. A project-local pinned devDependency is optional for JavaScript teams. Explicitly pinned `npx` is the bootstrap and CI path.

The first user-local bootstrap is an explicit trust-on-first-use boundary: a pinned `npx agentic-awesome-skills@<version> mcp configure --scope user` invocation runs with package lifecycle scripts disabled, records npm SRI, and installs the exact runtime closure into the content-addressed cache. Later runtime changes are performed by an already installed CLI through the same explicit `mcp configure` flow, with preview, integrity verification, atomic promotion, and no lifecycle execution. Catalog update remains data-only and cannot populate or execute the runtime cache.

The user-local cache separates runtime and catalog identities:

```text
runtimes/<package-version>/<filesystem-safe-integrity-key>/
catalogs/<package-version>/<catalog-digest>/
```

The runtime directory key is a canonical filesystem-safe encoding of the original npm SRI digest; the unmodified `dist.integrity` remains the value verified and recorded in plans and configuration. No manifest stores a local runtime path. MCP configuration binds to an exact runtime version and integrity. Upgrades are explicit.

## Stack manifest

The public v1 manifest stores desired state, not derived repository observations or natural-language reasoning:

```json
{
  "schemaVersion": 1,
  "name": "react-vite-production",
  "catalog": {
    "package": "agentic-awesome-skills",
    "version": "14.6.0",
    "integrity": "sha256-..."
  },
  "targets": [
    { "host": "codex", "scope": "project" }
  ],
  "intent": {
    "goals": ["build", "test", "deploy"]
  },
  "policy": {
    "allowedRisk": ["none", "safe"],
    "requireKnownSource": true,
    "allowManualSetup": false
  },
  "skills": [
    { "id": "react-best-practices" },
    { "id": "playwright-skill" }
  ]
}
```

Detected languages/frameworks, excluded alternatives, evidence breakdown, and natural-language explanations remain in recommendation and plan output. The installer's internal managed-state manifest remains separate.

## MCP v1 contract

The server exposes only:

- `search_skills`
- `get_skill`
- `recommend_stack`
- `inspect_stack`
- `diff_stack`
- resource template `aas://skills/{id}`

`recommend_stack` applies deterministic rules and returns structured factors and evidence. It does not call another model or create subjective reasoning. `diff_stack` uses only verified catalogs already present locally. No MCP tool installs, removes, applies, updates catalogs, scans a repository, or changes configuration.

Full skill text is returned only on request and is separated as `untrustedContent`; metadata and prose cannot acquire instruction authority. The server can signal this trust boundary but cannot guarantee how an external model will behave.

Every structured response declares `protocolVersion`, `coreVersion`, `metadataSchemaVersion`, `scorerVersion`, and catalog digest. Incompatible versions fail explicitly.

## CLI lifecycle

```text
catalog update/status
  -> stack init
  -> agent/MCP recommend
  -> stack validate
  -> stack plan --out .aas/plan.json
  -> human approval
  -> stack apply --plan .aas/plan.json
  -> stack doctor
```

- `stack init` creates targets and policy only.
- `stack recommend` is a deterministic fallback over an explicit profile file; it does not inspect the repository.
- The plan binds manifest hash, runtime identity/integrity, catalog digest, protocol/core/schema/scorer versions, installed managed state, and exact logical operations.
- Each immutable v1 apply plan binds exactly one target and one filesystem transaction. A multi-target manifest produces independently approved per-target plans; AAS does not claim impossible crash-atomic commit across unrelated filesystems.
- `apply` never recalculates an approved plan.
- Unmanaged skills are never overwritten or removed.
- Managed local modifications block apply unless an explicit override and approved backup are present.
- `stack doctor` is read-only. `stack recover --id ... --action rollback|cleanup` is a separate, approved, revalidated write.
- Reapplying a completed plan returns `alreadyApplied` without writing. A partial plan cannot be reused until recovery closes its journal.
- Interactive apply/recovery displays and confirms the exact plan or recovery digest. Non-interactive execution requires an explicit approval value bound to that digest; absence or mismatch blocks. This is an audit marker within the stated same-user threat boundary, not a cryptographic proof against a compromised machine.
- The legacy installer remains compatible and never creates `aas-stack.json` implicitly.

## Metadata and deterministic recommendation

The versioned metadata contract represents capability, target compatibility, risk, provenance/license, setup, dependencies/conflicts, validation, tests, and reviews. Each judgment can be `known`, `unknown`, or `notApplicable` and carries evidence references when known. The engine does not infer authoritative values from free-form skill text.

Eligibility is computed from public rules, never a hidden ID whitelist:

```text
eligibleForRecommendation: true | false
eligibilityReasonCodes: [...]
evidenceLevel: ...
unknownFields: [...]
```

All skills remain searchable. `recommend_stack` returns:

- `recommended`: candidates with sufficient structured evidence;
- `discoveryCandidates`: potentially relevant candidates with material unknowns.

An agent may promote a discovery candidate only through a visible plan override. Validation and apply still enforce the approved policy.

Ranking uses versioned aliases/ontology, explicit normalization, BM25-style lexical retrieval, fixed-point integer factors, and stable skill-ID tie-breaking. Composition is a declared greedy set-cover algorithm with skill budget, dependency/conflict handling, overlap penalty, minimum-value threshold, and permission to leave goals uncovered instead of adding a weak skill.

The canonical output includes scorer version, catalog digest, normalized input, factor breakdown, goal-capability matrix, exclusions with reason codes, material unknowns, and proposed stack. Identical input, catalog digest, schema, and scorer produce byte-identical canonical JSON. Timestamps, correlation IDs, localized messages, and diagnostics are outside that payload.

Coverage is reported with separate `goalCoverage`, `metadataCompleteness`, and `evidenceStrength`; no opaque aggregate confidence is required. Quality evidence is limited to auditable validation, provenance, metadata completeness, tests, and recorded reviews. Popularity, stars, and opaque editorial scores are excluded.

## Result and error model

`unknown` and `insufficientCoverage` are valid recommendation outcomes:

```json
{
  "ok": true,
  "status": "insufficientCoverage",
  "reasonCodes": [],
  "unknown": []
}
```

`ok: false` is reserved for invalid input, a policy-blocked requested operation, or execution failure. Machine clients depend only on versioned schemas, namespaced append-only codes, categories, and structured details. Human messages can change or be localized. Remediation is expressed as structured actions and arguments, never executable shell strings.

Mutating operations use OS-enforced exclusive lock creation plus an informational crash-safe record, same-filesystem staging, journal, revalidation immediately before writes, atomic rename where possible, fsync at commit points, rollback only when current bytes match AAS-written bytes, and internal-manifest update as the final commit. Paths are logical in plans and are derived from allowlisted host adapters. File handles, file type/ownership checks, `realpath`, and target identity are revalidated at write time to reduce swap/TOCTOU risk. Node cannot provide portable descriptor-relative `openat`/`renameat`; resistance to a malicious same-user process remains outside the v1 boundary rather than being overstated. Recovery uses a `recoveryId`, target identity, hashes, and explicit approval.

Diagnostics are redacted. Correlation IDs are allowed; stack traces require explicit redacted debug mode.

## Privacy and threat model

Trust boundaries are npm registry to cache, cache to runtime, host/agent to MCP, recommendation to human approval, approved plan to CLI/filesystem, catalog content to the interpreting agent, and host configuration to its adapter/backup.

Key invariants:

- The updater downloads a tarball, verifies registry `dist.integrity`, extracts only allowlisted data assets, and verifies the internal catalog digest. It never executes release lifecycle scripts, binaries, modules, templates, dynamic imports, or catalog code. Registry integrity proves byte correspondence, not that the publisher account was uncompromised; provenance/attestations are recorded separately.
- Archive extraction rejects absolute/traversal paths, symlinks, hardlinks, devices/FIFOs, duplicate files, case/Unicode collisions, anomalous permissions, excessive file counts or sizes, and decompression bombs.
- MCP contains no network calls, updater, model, credentials, or telemetry and works offline. Tests must observe zero network attempts. OS-level network denial is optional external hardening.
- MCP accepts only bounded, allowlisted structured profiles. It does not persist profiles or log source, secrets, raw files, or absolute paths by default.
- MCP enforces byte, JSON-depth, query-length, result-count, memory, and timeout limits.
- Apply is transactional and fail-closed against drift, target swap, path traversal, symlink races, incompatible producers, and hard-policy violations.
- Host adapters reject symlinks/non-regular files and wrong ownership, preserve mode/owner, lock and patch atomically, redact secrets from diffs/logs, and create user-only backups with explicit retention and cleanup.
- A same-user malicious process or compromised machine is outside the v1 protection boundary.

## Benchmark and acceptance gates

Before product implementation, a separate bootstrap phase creates the reference evaluator, schemas, tuning set, held-out set, hostile corpus, legacy command corpus, and verifier. Their initial versions and digests require review by two named reviewers, at least one of whom does not implement the scorer. After that freeze, the product change cannot modify them; any separately approved revision invalidates prior evidence.

The v1 public benchmark freezes tuning data separately from held-out data. Each supported intent has at least 30 held-out cases distributed across declared sub-intents and project archetypes, deduplicated by task/project family. Gold sets allow multiple equivalent solutions, record provenance/version, and require two reviewers for ambiguous cases. Labels are frozen before execution and cannot be reclassified after observing a result.

For every supported intent and in macro-average:

- verified recommendation coverage is at least 80%;
- inclusion precision is at least 90%;
- explicitly out-of-coverage cases abstain 100%;
- hard-policy violations are zero;
- critical goals are fully covered;
- declared minimum coverage for non-critical goals is met;
- discovery promotions always have visible overrides.

A verified recommendation must satisfy all of those conditions, not merely produce a stack. The minimum non-critical-goal coverage is 80%. Verified coverage uses every frozen in-scope case as its denominator. Inclusion precision is computed per stack and macro-averaged per intent over every included skill, using the accepted-equivalent sets; an empty or partial in-scope stack fails verified coverage and cannot disappear from the denominator. Out-of-coverage cases are measured only in the separately frozen abstention set. Candidate diversity is reported; three eligible candidates are preferred when the ecosystem genuinely offers them, but weak candidates are never added to satisfy a quota.

Hard-policy violations must also remain zero across the independently approved generative, property, fuzz, and hostile-input corpus. Minimum budgets are 100,000 stratified generated/property cases for policy and eligibility plus 50,000 bounded parser/MCP fuzz inputs, with all seeds and distributions frozen before scorer implementation. The hostile corpus contains at least one exploit and one boundary-adjacent valid control for every declared archive/input class. The canonical core payload must be byte-identical across the supported OS/Node matrix.

The initial supported intents are:

1. web application delivery;
2. API/backend delivery;
3. test and QA automation;
4. security review and hardening;
5. deployment and DevOps;
6. agent and MCP development.

An intent failing any gate remains `preview` or unsupported. The supported runtime matrix is Node v22 and v24 on Linux, macOS, and Windows; Node v20 is EOL and excluded. The verifier manifest freezes exact Node patch versions, runner/image identities, filesystem assumptions, architecture, and all required jobs before execution. Skips and `continue-on-error` fail the gate.

## Independent completion verifier

Repository tests are supporting evidence, not the final verifier. The strongest check is an independently controlled black-box harness:

```text
candidate commit
  -> npm pack
  -> content-addressed tarball
  -> clean install outside the checkout with --ignore-scripts
  -> independent verifier and evidence bundle
  -> benchmark/security/release approvals
  -> protected publish
  -> registry re-download and integrity/behavior comparison
```

The verifier checks packaging, all entrypoints, offline catalog access, MCP protocol and resource limits, zero persistent MCP writes anywhere and zero network attempts, hostile archives, tampered plans, fault injection and crash recovery, canary-secret leakage, adapter fixtures, legacy CLI differential behavior against the integrity-pinned 14.6.0 package, and OS/Node behavior. Fault injection acts on the production binary using OS/process/filesystem observation and kills or swaps at every observed mutating boundary; mock-only or test-mode coverage is insufficient. The frozen legacy corpus enumerates every public flag, target, representative combination, filesystem result, exit code, and explicitly allowed difference.

Eligibility and scoring also undergo metamorphic tests that permute catalog order and replace IDs consistently; results must remain invariant except for the documented stable tie-break and returned renamed identity. This prevents public rules from becoming an indirect hardcoded whitelist.

The verifier runs in protected CI under declared ownership and cannot be self-approved by the product implementer. It produces a content-addressed evidence bundle bound to CI run identity, verifier hash, commit, tarball, approvals, and retained protected artifact storage. The bundle contains all versions/digests, full denominators, seeds/budgets, system traces, transaction matrices, redacted logs, and reviewer approvals.

Workbench accepts only size/depth-bounded, user-mediated paste or file upload held in memory. It performs schema validation and text-only/XSS-safe rendering; it does not use ambient filesystem APIs or persist imported content. Completion requires live GitHub Pages deployment and readback of the exact reviewed version, behind the publication approval gate.

`implementationVerified`, `releaseReady`, and `released` are distinct states. Publication requires explicit user approval and the repository's protected maintainer release workflow.

## Decision log

| Decision | Alternatives considered | Rationale |
| --- | --- | --- |
| Stack + CLI + MCP + Workbench | Site-only stack, new installer CLI, MCP wrapper | The stack is durable state; interfaces alone do not create recurring product value. |
| Agent-first, human-approved | Manual Workbench composition | Users delegate selection; humans need review and control, not 2,000 checkboxes. |
| Local stdio MCP | Hosted MCP/API, resident daemon | Preserves privacy, works offline, and keeps process isolation simple. |
| MCP read-only; CLI owns writes | MCP apply/install tools | Preserves an explicit approval boundary and reduces host-agent blast radius. |
| One npm package and one core | Multiple packages or duplicated logic | Minimizes version skew while preserving later split options. |
| Hybrid runtime placement | Mandatory project install or global npm install | User-local works across languages; project-local remains available for team pinning. |
| Minimal manifest | Persist detected profile and prose reasoning | Derived data drifts and causes noisy diffs; approved intent and IDs are durable. |
| Catalog identity includes integrity | Version string only or immediate lockfile | Binds desired state to verified bytes without adding a second public state file. |
| Public eligibility rules and two result lanes | Hidden enriched whitelist | Keeps the whole catalog visible and makes incomplete evidence explicit. |
| Unknown is first-class | Treat unknown as incompatible or infer from prose | Prevents false certainty while allowing policy-controlled caution. |
| Lexical fixed-point deterministic ranking | Embeddings, remote scoring, model ranking | Reproducible across CLI, MCP, and Workbench with auditable factors. |
| Separate coverage/evidence measures | Single confidence percentage | Avoids presenting missing metadata as certainty. |
| Immutable plan and transactional apply | Recompute on apply or direct install | Human approval must bind the exact operation and survive drift/failure safely. |
| One target/filesystem per mutating plan | Claim whole-plan atomicity across multiple host filesystems | Preserves real crash-atomic semantics; multi-host manifests remain portable through separate approved plans. |
| Pure Node write-time containment | Native addon or overstated portable `openat` guarantee | Matches the same-user threat boundary and avoids a new native distribution surface while documenting residual TOCTOU risk. |
| Registry integrity plus internal digest | Digest from same untrusted file alone | Verifies published bytes and catalog consistency while documenting publisher compromise as residual risk. |
| Valid abstention is `ok: true` | Treat insufficient coverage as error | Clients and metrics must distinguish safe abstention from system failure. |
| Independent black-box tarball verifier | Repository test suite alone | Prevents checkout-only success and proves the published artifact boundary. |
| Per-intent 80/90/100 gates | Global average or raw skill-count gate | Prevents strong categories from hiding weak ones and tests correct abstention. |
| Launch parameters frozen before activation | Leave intent, adapter, benchmark-size, runtime, and Workbench scope open | Product-owner approval fixes the cost and finish line before implementation begins. |

## Maintenance ownership

The scorer, metadata schema, benchmark, hostile corpus, and verifier are versioned public maintenance surfaces. Their initial baseline is created and independently approved before scorer implementation. Changes to held-out labels, security corpus, intent set, denominators, fuzz budgets, or verifier require separate review from product implementation and invalidate previous evidence. Adapter fixtures record provenance, host version, and validation date and require an isolated smoke test against the current version before release. Release artifacts must use the exact verified tarball; rebuilding requires a new verification cycle.
