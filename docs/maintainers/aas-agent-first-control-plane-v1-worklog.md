# AAS Agent-First Control Plane v1 Worklog

## 2026-07-17 — Goal activation and clean baseline

- Active objective is defined by the approved design and goal documents.
- Original worktree `/Users/nicco/Projects/antigravity-awesome-skills` contains unrelated local-skill-reviewer work and remains untouched.
- Created isolated worktree `/private/tmp/aas-agent-first-control-plane-v1` on branch `codex/aas-agent-first-control-plane-v1` from `origin/main` commit `4101f32402448f4fdd96b3cf166a81b8cee8b557`.
- Live source baseline: `origin/main` current; latest main CI, CodeQL, Actionlint, and Pages succeeded; no open Dependabot, code-scanning, secret-scanning, or runtime npm-audit findings.
- Open PRs 867 and 871 are unrelated skill contributions and remain out of scope.
- Copied the approved design and goal packet into the isolated branch.

## Phase 0 status

- Freeze-ready baseline complete: 11 public schemas, exact metric formulas, fixed 100,000 property/generative and 50,000 parser/MCP fuzz budgets, six exact OS/Node jobs, and zero pending requirements.
- Benchmark corpus: 180 held-out cases and accepted-equivalent gold sets, 60 disjoint tuning cases, and 30 disjoint explicit out-of-coverage abstention cases. The six intents each retain a denominator of 30 held-out cases.
- Independent review: `codex-independent-alpha` and `codex-independent-beta` each approved all 270 case/gold or case/label pairs. Their content-addressed reports are bound by `verification/aas-v1/ownership.v1.json`; both reviewers are independent of the future scorer implementation.
- Hostile corpus: 32 exploit/control classes, 64 hash-verified fixtures, zero extracted archives, and zero special filesystem entries.
- Registry legacy baseline: `agentic-awesome-skills@14.6.0`, SRI `sha512-VTOb3O9PSYKCDO99i3h0vOn7vHQlGtO/+jSErR80g6OGaDJoBzg3q2GE9Nu890en1/Z54hBEYiVQj/1Rl95xEg==`, tarball SHA-256 `98f8cbb399613621598ac6aeca619fc7c454530895b4e237eee695d82fbdf0cb`, tag commit `ab5f6c205a548d2f4bec411728c79b9c156fc696`.
- Legacy replay: 41 command cases pass with fixture tree `sha256-80c220b08a221685c26a23e2cd7c1b06628bfec7a542fa91d8ee19a5d3e035f8` and aggregate fake-Git trace `sha256-b36ea8cfd26d642235ce061bb5dcc925bec4b5bf63137cc17edb702b62560384`. Two consecutive complete replays produced the same 64-file corpus aggregate `3797c2c61c6334aa8081380be11958cd555d277baa26114e0cbe35fd62e099f6`.
- The legacy harness binds the exact dependency closure, runtime tree, and entrypoint; validates pre/post filesystem evidence; constrains case, target, and fake-Git paths; observes and denies Node networking with a sentinel self-test; and records zero network attempts. Full OS-syscall observation remains a separate black-box product acceptance gate and is not claimed by this corpus.
- Live `main` protection now requires `aas-v1-baseline`, while retaining `pr-policy`, `pr-evidence`, `source-validation`, and `artifact-preview`; admin enforcement remains enabled and force-pushes/deletions remain disabled.
- Local gate: 9/9 verifier tests, schema validation, structure validation, frozen benchmark and secondary corpora, hostile fixtures, legacy snapshots, and freeze readiness all pass.
- Content-addressed freeze manifest: 712 files, root digest `sha256-c7a4d4b3efa9f2bdf5a126fc3c384680d39534880a3900302785397e4ddd451c`; an immediate independent `freeze:check` reproduced it exactly. GitHub's Linux replay exposed zlib-version variation in valid DEFLATE streams; gzip fixtures now require the frozen compressed digest plus deterministic expanded USTAR bytes and preserve the canonical committed stream during regeneration.

## Feasibility decisions

1. A v1 mutating plan is single-target and single-filesystem. Multi-target manifests generate independently approved plans. This avoids claiming impossible crash-atomic commit across unrelated filesystems.
2. The pure-Node implementation uses atomic exclusive lock creation, file handles, type/ownership/realpath/identity revalidation, same-filesystem staging, journal, fsync, and atomic rename. It documents that portable Node lacks descriptor-relative `openat`/`renameat`; a malicious same-user process is already outside the frozen threat boundary. No native addon is added to v1.
3. Legacy `install.js` remains isolated. The new stack transaction engine will not reuse its per-entry mutation path.

## Next evidence gate

- Land the baseline in a dedicated protected pull request. The required `aas-v1-baseline` job must pass from the committed bytes on GitHub.
- Only after the baseline commit lands on protected `main`, branch the product implementation. Product pull requests may consume but must not modify the frozen verification baseline.
