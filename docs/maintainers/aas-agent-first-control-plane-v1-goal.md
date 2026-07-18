# AAS Agent-First Control Plane v1 Goal

Status: approved source packet for the active Codex goal
Design source: `docs/maintainers/aas-agent-first-control-plane-v1-design.md`

## Fit

Use a durable goal. The work crosses catalog schema, deterministic recommendation, CLI lifecycle, local MCP, transactional filesystem behavior, host adapters, Workbench review, cross-platform packaging, benchmark construction, security abuse testing, and protected release verification. It needs repeated implementation/verification loops and has an independent observable finish line.

## Outcome

Ship and independently verify the AAS v1 agent-first control plane exactly within the frozen design: a user can ask Codex or Claude to obtain a deterministic local recommendation, approve a minimal stack and immutable plan, safely apply it through the CLI, diagnose/recover failures, and review the result in Workbench without repository data leaving the machine by default.

## Baseline

- Package 14.6.0 exposes only the legacy installer entrypoint.
- The installer already provides exact-set, multi-target, pinning, dry-run, managed-state, atomic-preflight, and symlink-safety foundations.
- There is no AAS MCP server, stack lifecycle, deterministic recommendation API, verified catalog cache lifecycle, benchmark, or independent package verifier.
- Catalog metadata is incomplete and cannot yet support strong recommendations across the full catalog.
- The working tree contained unrelated local-skill-reviewer work when this goal was drafted; it must remain isolated from this goal.

## Fixed scope and launch parameters

Implement only the surfaces frozen in the design document. Initial supported intents are web application delivery, API/backend delivery, test/QA automation, security review/hardening, deployment/DevOps, and agent/MCP development. Each requires at least 30 diversified and deduplicated held-out cases. Initial configuration adapters are Codex and Claude. Workbench scope is read-only, in-memory, user-mediated paste/upload and review of stack and plan artifacts, including a verified live Pages deployment.

The runtime matrix is Node majors 22 and 24 on Linux, macOS, and Windows, with exact patch, runner/image, architecture, and filesystem identities frozen in the verifier manifest. The npm package exposes `aas`, `aas-mcp`, and the compatible `agentic-awesome-skills` alias.

## Non-goals

No hosted service, remote MCP, account system, telemetry, repository upload, embeddings/model in the core, marketplace, public stack sharing, daemon, auto-update, multi-package split, full Workbench editor, browser installation, all-host adapter program, or mandatory enrichment of all skills.

## Primary verifier

Before scorer/product implementation, a separate baseline phase creates the reference evaluator, metric schema, benchmark/gold data, hostile corpus, legacy command corpus, and black-box verifier. Two named reviewers, including at least one non-implementer of the scorer, approve and freeze their versions and digests. The product implementation cannot modify these surfaces.

That independently controlled black-box harness must verify the content-addressed `npm pack` tarball from a clean directory outside the repository, installed with lifecycle scripts disabled and without checkout or devDependency access. Protected CI, with declared ownership and no self-approval by the product implementer, produces the evidence bundle and distinguishes:

- `implementationVerified`: all technical gates pass on the candidate tarball;
- `releaseReady`: benchmark and independent security/release review are approved;
- `released`: the protected tag/npm release exists and the registry tarball is re-downloaded and proven identical in integrity and behavior.

Repository tests alone cannot complete the goal.

## Required gates

### Recommendation and metadata

- Versioned metadata schema with explicit unknowns and evidence.
- Entire catalog searchable; eligibility derived only from public rules; no ID whitelist.
- `recommended` and `discoveryCandidates` are both visible with structured reasons.
- Deterministic core output is byte-identical for identical input/digests/versions across the matrix.
- For every supported intent and in macro-average: verified coverage >=80%, per-stack inclusion precision macro-averaged per intent >=90%, explicit out-of-coverage abstention 100%, critical-goal coverage 100%, non-critical-goal coverage >=80%, zero hard-policy violations.
- Verified coverage counts every frozen in-scope case; empty, partial, crashed, timed-out, or missing results fail and remain in the denominator. Inclusion precision evaluates every included skill against accepted-equivalent gold sets. The separately frozen abstention set cannot be relabeled after results are known.
- At least 30 frozen held-out cases per intent, distributed across sub-intents and project archetypes, deduplicated by task/project family, with multiple equivalent gold solutions, provenance/version, and double review for ambiguous cases.
- Zero hard-policy violations across at least 100,000 independently frozen stratified property/generative cases and 50,000 bounded parser/MCP fuzz inputs, plus the hostile corpus with exploit and valid boundary controls per class.
- Metamorphic catalog-order and consistent-ID-permutation tests prove eligibility/scoring do not encode a direct or indirect ID whitelist.

### Package, CLI, and MCP

- Clean tarball contains only allowlisted assets and no sensitive or checkout-only dependencies.
- `aas`, `aas-mcp`, and the legacy alias pass black-box smoke tests.
- Legacy behavior is differentially tested against the integrity-pinned 14.6.0 package using a frozen corpus of every public flag, target, representative combination, output tree, exit code, and allowed difference; it does not create stack state implicitly.
- MCP exposes only the frozen five tools and resource template, performs no mutations or updates, works completely offline, produces zero observed network attempts, and produces zero persistent filesystem writes anywhere. HOME, project, cache, and TMP are isolated and observed; stdout/stderr are process streams, not write exceptions.
- MCP keeps protocol-only stdout, redacted diagnostics, untrusted skill-content separation, and resource limits.

### Catalog and supply chain

- Runtime/catalog caches are content-addressed and atomically promoted.
- First bootstrap uses explicitly pinned `npx ... mcp configure --scope user` with lifecycle scripts disabled and records the npm SRI; later runtime changes use the installed CLI with preview and atomic integrity-verified promotion. Catalog update remains data-only.
- Updater verifies npm `dist.integrity`, extracts only allowlisted data assets without executing code, and verifies the internal catalog digest.
- The hostile archive corpus covers traversal, absolute paths, links, special files, duplicates, Unicode/case collisions, permissions, count/size limits, and decompression bombs.
- Every hostile case leaves the cache unchanged and launches no child process or code.

### Plan, apply, and recovery

- Plan binds every approved input and never gets recomputed by apply.
- Every mutating plan binds exactly one target/filesystem. Multi-target manifests produce separate plans and approvals; cross-filesystem atomicity is not claimed.
- Apply uses OS-enforced exclusive lock creation plus crash-safe identity records, and is transactional, same-filesystem staged, crash-safe, fail-closed, and idempotent.
- Black-box fault injection against the production binary, driven by OS/process/filesystem observation rather than mocks or test-mode branches, covers every observed lock, journal, backup, write, fsync, rename, and commit boundary, including kill, concurrency, drift, symlink/target swap, corrupted journal, and recovery races.
- Unmanaged bytes never change. Managed local edits block unless separately overridden and backed up.
- Final state is entirely previous or entirely new; never hybrid. Internal managed state commits last.
- Final-state atomicity is evaluated per approved target transaction after successful apply or completed recovery. Write-time file-handle/type/ownership/realpath/identity checks reduce swap risk; a malicious same-user process remains outside the v1 boundary.
- Doctor is read-only. Recovery uses an approved ID/action and revalidates target and hashes.
- Interactive writes require confirmation of the exact plan/recovery digest. Non-interactive writes require an explicit approval value bound to that digest; absence or mismatch blocks.

### Host configuration and Workbench

- Codex and Claude adapters use real anonymized fixtures with provenance, host version, and validation date, plus isolated current-client smoke tests. They preserve unknown fields, apply minimal atomic patches, preserve ownership/mode, create user-only retained/cleanable backups, lock, redact secrets, and reject unsafe file types or ownership.
- Workbench accepts only size/depth-bounded user paste/upload held in memory and renders stack/plan evidence through schema-validated, text-only/XSS-safe views. It does not install, persist imports, use ambient filesystem APIs, or read local files without the user's explicit selection. Release proof includes the live Pages URL, deployed version, and readback after publication approval.

## Iteration loop

1. Treat the approved intent, held-out, adapter, runtime-matrix, Workbench, and fuzz-budget parameters as frozen.
2. Create and independently approve the initial reference evaluator, benchmark/gold, hostile corpus, legacy corpus, and verifier baseline; record their protected digests before product implementation.
3. Inspect the current design, goal, worklog, repository state, and active goal state.
4. Select one bounded vertical slice that advances the black-box verifier.
5. Implement it without changing frozen scope or benchmark labels.
6. Run targeted tests, then the relevant repository gates.
7. Run the independent verifier or its currently available slice against an actual tarball.
8. Record commands, hashes, failures, and the next smallest corrective action in a durable worklog.
9. Repeat until every gate passes from a clean state on the full frozen matrix.
10. Stop before public/tag/npm/Pages actions and request explicit approval.

## Anti-cheating rules

- Do not weaken, skip, quarantine, relabel, post-filter, or retry-until-green any gate.
- Initial benchmark/corpus/verifier baselines require independent approval before scorer implementation. The product PR cannot modify them or self-approve their workflow/ownership controls. Changes require a separate approval and invalidate prior evidence.
- Freeze intents, formulas, denominators, outside-coverage labels, minimum fuzz seeds/budgets/distributions, exact runners, and OS/Node matrix before scorer implementation.
- Crashes, timeouts, and missing outputs count as failures.
- No test-mode branch based on case IDs, fixture names, or environment markers.
- Canonical comparison exclusions must be enumerated fields, never a generic metadata exclusion.
- Do not replace real tarball, network/filesystem observation, or fault injection with mocks for completion proof.
- Do not use skipped/allowed-failure matrix jobs or a fault-injection list that omits an observed production mutation boundary.
- Do not touch or absorb unrelated dirty work.
- Do not call the goal complete at `implementationVerified` or `releaseReady`; completion requires the separately approved released state.

## Approval gates

Explicit user approval is required before:

- modifying real user-level Codex or Claude configuration outside isolated fixtures;
- changing frozen intent, benchmark, corpus, verifier, security boundary, or v1 scope;
- publishing a tag, GitHub Release, npm package, or public product announcement;
- deploying the Workbench changes publicly to Pages;
- any migration or cleanup that could remove existing user state.

The protected maintainer release workflow remains mandatory for publication.

## Blocker standard

Difficulty, test failure, incomplete metadata, or a long implementation is not a blocker. Report blocked only after the same external dependency or missing approval prevents meaningful progress for the required repeated goal turns. Preserve partial artifacts and state the smallest user or external action that would unblock the verifier.

## Completion proof

Completion requires:

1. exact candidate commit and clean-scope proof;
2. tarball SHA-512, npm pack manifest, and registry `dist.integrity`;
3. protocol/core/schema/scorer versions and catalog digest;
4. per-intent reports with full denominators and reviewer provenance;
5. canonical output hashes plus exact Node, runner/image, architecture, and filesystem identities for the complete matrix, with no skipped or allowed-failure job;
6. fuzz seeds/budgets, hostile-corpus results, and zero-policy-violation report;
7. observed MCP network/filesystem/process traces;
8. updater archive matrix and unchanged-cache proofs;
9. fault-injection, crash/recovery, and pre/post filesystem snapshots;
10. frozen legacy command corpus, baseline 14.6.0 integrity, explicit allowed-difference list, and differential report;
11. Codex/Claude fixture provenance/current-client adapter reports and canary-secret scans;
12. Workbench import-security tests plus approved live Pages URL/version/readback;
13. protected CI run identity, verifier owner/version/hash, reviewer identities, attestation, retention location, and content-addressed evidence bundle bound to commit and tarball;
14. benchmark, security, and release approvals;
15. protected release evidence plus registry re-download integrity and behavior comparison.

Only after all evidence exists and no required work remains may the active goal be marked complete.

## Delegation map

The primary agent owns scope, integration, repository changes, conflict resolution, and completion. Bounded subagents may independently handle metadata/benchmark audit, CLI/MCP contract tests, security corpus review, cross-platform verification, Workbench review validation, or release evidence review. They may not change the frozen benchmark, approve their own implementation, publish, or declare the parent goal complete.

## Exact activation objective

```text
Implement, independently verify, and—only after explicit publication approval—release the AAS agent-first control plane v1 defined in /Users/nicco/Projects/antigravity-awesome-skills/docs/maintainers/aas-agent-first-control-plane-v1-design.md, satisfying every gate and completion proof in /Users/nicco/Projects/antigravity-awesome-skills/docs/maintainers/aas-agent-first-control-plane-v1-goal.md without expanding the frozen v1 scope or touching unrelated dirty work.
```

## Activation state

This packet is the source of truth for the active Codex goal. Live activation status is maintained by Codex goal state.
