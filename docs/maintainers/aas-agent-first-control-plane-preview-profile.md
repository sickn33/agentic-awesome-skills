# AAS Agent-First Control Plane Preview Profile

Status: approved intermediate release profile
Date: 2026-07-17
Certified design: `docs/maintainers/aas-agent-first-control-plane-v1-design.md`

## Purpose

This profile validates whether Codex, Claude Code, and comparable agents can
use AAS to compose useful local skill stacks before AAS claims the stronger
certified-v1 guarantees. It is additive: it does not change the frozen v1
design, benchmark, hostile corpus, verifier, or completion criteria. A passing
preview does not complete the active v1 goal.

The permitted preview claim is:

> AAS Agent-First Preview helps Codex and Claude compose a local, explainable,
> reproducible skill stack. Full-catalog recommendation quality and
> transactional apply/recovery safety are not yet certified.

Preview output must not use `implementationVerified`, `releaseReady`,
`released`, `certified`, or an equivalent unqualified claim.

## Included preview surfaces

- Minimal, schema-validated `aas-stack.json` with pinned catalog identity,
  targets, approved intent and policy, and exact skill IDs.
- CLI `stack init`, `stack recommend`, `stack validate`, `stack plan`, and
  `stack doctor` from the packed npm candidate.
- The local stdio MCP with exactly `search_skills`, `get_skill`,
  `recommend_stack`, `inspect_stack`, `diff_stack`, and
  `aas://skills/{id}`.
- Deterministic recommendation with structured factors, two visible lanes
  (`recommended` and `discoveryCandidates`), explicit unknowns, stable
  tie-breaking, and fail-closed policy decisions.
- Functional Node 22/24 coverage on Linux, macOS, and Windows from one exact
  content-addressed tarball.
- Workbench schema/import/render tests and a local production build. A live
  Pages deployment remains outside the preview until separately approved.

## Experimental writes

`stack apply` and `stack recover` are present for controlled development but
are not preview-supported safety claims. They are disabled by default:

- apply requires the additional `--experimental-apply` flag and the existing
  exact plan-digest approval;
- recovery requires `--experimental-recovery` and retains its existing
  recovery-plan approval;
- successful experimental writes return `releaseProfile: "preview"` and
  `certificationStatus: "experimental"`;
- absence of the opt-in fails before runtime resolution or target writes with
  a structured policy error.

Internal transaction tests are development evidence only. Certification still
requires the frozen production-binary crash, boundary, race, rollback, and
recovery verifier.

## Preview functional gate

Every matrix job must install the exact candidate tarball with lifecycle
scripts disabled and run without checkout-only runtime dependencies. No job may
be skipped or allowed to fail.

On Windows, the preview verifier may materialize its own isolated runtime-cache
fixture and must then have the production core verify the complete identity and
every cached byte before `plan`, `doctor`, or MCP use. This proves the read-only
functional lifecycle without claiming that Windows cache-promotion durability
is certified. Native directory-flush and interrupted-promotion evidence remains
part of the certified-v1 transaction gate.

Windows preview creation of the regenerable manifest and immutable plan uses
the explicit `--preview-windows-output` opt-in. The CLI fsyncs the file and
returns `outputDurability: "fileSyncedDirectoryUnverified"` together with
`certificationStatus: "notCertified"`; without that flag it remains fail-closed.
This opt-in never applies to skill installation, host configuration, apply, or
recovery.

Required functional suites are:

1. **Package and entrypoints** — allowlisted package contents; `aas`,
   `aas-mcp`, and the legacy alias exist; legacy invocation creates no stack
   state implicitly.
2. **Stack lifecycle** — `init -> recommend -> validate -> plan -> doctor`
   succeeds in isolated roots and does not materialize target skills or AAS
   managed state.
3. **Determinism and explanation** — repeated identical inputs produce the
   same canonical recommendation payload and expose factor, coverage, evidence,
   exclusion, and unknown fields.
4. **Policy** — proved incompatibility or forbidden risk is excluded;
   incomplete evidence remains visible; malformed or over-limit input fails
   closed.
5. **MCP contract** — the five tools and one resource template work over real
   stdio framing; project and cache snapshots remain unchanged by tool calls.
6. **Write guard** — apply and recovery without their experimental flags fail
   with structured policy codes and leave project, cache, and managed state
   unchanged.
7. **Workbench** — bounded text-only import/review tests and production build
   pass without ambient filesystem access.

The preview receipt must declare:

```json
{
  "assuranceProfile": "agent-first-preview-1",
  "previewQualified": true,
  "certifiedV1": false,
  "notEvaluated": [
    "native-network-and-filesystem-attempt-observation",
    "transactional-crash-and-race-certification",
    "benchmark-80-90-100",
    "real-host-configuration-writes",
    "public-release"
  ]
}
```

Missing receipts, crashes, timeouts, canonical drift, or any failed functional
suite make `previewQualified` false.

## Explicitly not certified by preview

- ETW, `fs_usage`, or `strace` proof of zero network attempts and zero
  persistent MCP writes.
- Production-binary fault injection at every transaction boundary or every
  declared race class.
- Full benchmark thresholds: at least 80% verified coverage, 90% inclusion
  precision, and 100% correct abstention for each supported intent and in
  macro-average.
- Complete property/fuzz/hostile budgets required by certified v1.
- Real Codex or Claude configuration writes, public Pages deployment, npm
  publication, GitHub release, or announcement.

These remain mandatory before AAS can call the recommendation system or
transactional lifecycle certified v1.

## Product-learning gate

After the functional matrix passes, preview evaluation should measure whether
agents actually produce useful proposals:

- task completion rate from a repository profile to a reviewable stack;
- human accept/replace/remove rates for recommended skills;
- uncovered goals and discovery-candidate promotions;
- deterministic replay rate for the same normalized input and catalog digest;
- time and interaction count from request to approved manifest.

No repository profile, source file, secret, or raw path is uploaded by default.
Publishing or sharing any collected result requires a separate explicit
decision and privacy review.

## Relationship to certified v1

The certified verifier may remain red or unevaluated while the preview gate is
green. That state must be reported as `previewQualified: true` and
`certifiedV1: false`, never as a skipped certified pass. The frozen v1 design
and goal remain the only completion criteria for certification and release.
