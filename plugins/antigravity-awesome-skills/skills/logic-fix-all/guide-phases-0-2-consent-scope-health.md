# Logic-Lens — Logic Fix All — Phases 0-2 (Consent · Scope · Health)

---

## Phase 0 — Pre-flight Notice & Consent Gate

0a. Estimate file count (`git ls-files | wc -l` in a git repo; `find . -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/target/*' -not -path '*/.venv/*' -not -path '*/build/*' -not -path '*/dist/*' -not -path '*/vendor/*' | wc -l` otherwise). Display this notice verbatim with the estimate filled in — do not paraphrase:

```
⚠️  /logic-fix-all — Full Repository Logic Audit & Fix

Scope:    ENTIRE repository, not just recent commits or staged changes.
          Includes runtime-affecting files: source code, runtime
          config (.json/.yaml/.toml/.ini), constraint files
          (CLAUDE.md, .logic-lens.yaml, AGENTS.md, etc.), and
          behavioral documentation (README, ARCHITECTURE, ADRs).
          Auto-excludes .git, build artifacts, dependency caches,
          binary assets; respects .gitignore and .logic-lens.yaml
          `ignore:` patterns.
Estimated files to scan: ~N

Method:   Semi-formal execution tracing — Premises → Trace →
          Divergence → Remedy. This is a LOGIC review, not a
          syntax/style/lint pass.

Skills:   logic-health → logic-review → logic-locate → logic-explain
          → logic-diff, iterated until clean.

Token cost: HIGH. The pipeline uses ranked passes and scope caps, but
deep tracing still costs roughly 5k–15k tokens per reviewed file
(more for deeply interprocedural code, less for stateless utilities),
times ~1.3 for iteration rounds.
Your estimate: min(N, 100) reviewed files × ~10k tokens × 1.3 ≈
(compute and show here, e.g. "~1M tokens").

Git impact: The pipeline edits source files. It does NOT commit,
push, or amend. If you have uncommitted work, commit or stash first.

Iteration: Critical findings loop until resolved (no cap). Warnings
and Suggestions default to 3 rounds, configurable via
`.logic-lens.yaml` `fix_all.max_iterations:`.

Proceed with full autonomous run? [Y/n]
```

0b. Parse the user's reply. Maintain two phase-local counters (reset when Phase 0 exits): `consecutive_pauses`, `consecutive_questions`.

Signal sets (case-insensitive):
- **Consent:** `Y`, `yes`, `ok`, `sure`, `proceed`, `go`, `continue`, `继续`, `好`, `好的`, `行`, `可以`
- **Hard negation:** `no`, `n`, `abort`, `cancel`, `取消`, `don't`, `不要`
- **Soft-pause:** `wait`, `hold on`, `not yet`, `一下`, `先别`, `等一下`, `等我`, `let me`

Decision (first match wins):
1. Hard negation → abort: "Aborted by user before scan — no files modified".
2. Consent + soft-pause → increment `consecutive_pauses`, acknowledge in one line, wait for next message. If `consecutive_pauses` would reach 3, re-show the full Phase 0 notice and reset to 0.
3. Consent (no negation) → proceed. Honor any scope/language instructions in one acknowledgment line.
4. Question → increment `consecutive_questions`, answer once, re-prompt. If `consecutive_questions` would reach 2, fall through to rule 5.
5. Unmatched (or falling through from rule 4) → re-show notice once; if next reply still unmatched, treat as abort.

0c. After consent, ask no further questions until Phase 8 cap escalation.

---

## Phase 1 — Scope Enumeration

1a. Read `.logic-lens.yaml` (if present): load only `ignore`, `focus`, `disable`, `custom_risks`, `severity:`, `trace.*`, and `fix_all.max_iterations`. Apply `ignore` immediately.

1b. Detect project type from marker files and derive exclusions:
- `package.json` → exclude `node_modules/`, `dist/`, `build/`, `.next/`, `.nuxt/`, `coverage/`
- `Cargo.toml` → exclude `target/`
- `go.mod` → exclude `vendor/` (unless project-owned — check `modules.txt`)
- `pyproject.toml`/`requirements.txt`/`Pipfile` → exclude `.venv/`, `venv/`, `__pycache__/`, `*.egg-info/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`
- `Gemfile` → exclude `vendor/bundle/`
- `pom.xml` → exclude `target/`
- `build.gradle`/`build.gradle.kts` → exclude `build/`, `.gradle/`
- `build.sbt` → exclude `target/`, `project/target/`
- `mix.exs` → exclude `_build/`, `deps/`
- `composer.json` → exclude `vendor/`
- `*.csproj`/`*.sln` → exclude `bin/`, `obj/`
- `pubspec.yaml` → exclude `.dart_tool/`, `build/`
- Always exclude: `.git/`, `.DS_Store`, lock files (`*.lock`, `package-lock.json`, `yarn.lock`, `Pipfile.lock`, `poetry.lock`, `Cargo.lock`, `go.sum`), log files, binaries (`.png/.jpg/.gif/.pdf/.wasm/.zip/.tar/.gz/.woff*/.ttf`)
- Respect `.gitignore` as a hint, not absolute — some ignored paths may still be relevant.

1c. Classify every non-excluded file into exactly one bucket:
- **Source code:** files whose extension matches a language the project uses (inferred from markers in 1b).
- **Runtime config:** `.json`, `.yaml/.yml`, `.toml`, `.ini`, `.conf`, `*.config.js/ts` — verify by grepping the codebase for the filename before classifying.
- **Constraint files:** `CLAUDE.md` at every level, `.logic-lens.yaml`, `AGENTS.md`, `GEMINI.md`, schema files (`*.schema.json`, `openapi.yaml`, `*.proto`, `*.graphql`).
- **Behavioral docs:** `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `docs/**/*.md` describing runtime behavior, `.env.example`. Skip changelogs, licenses, marketing copy, `.editorconfig`.

1d. Classify each file by risk tier:
- **High:** public API surfaces; files changed in the last 30 days (`git log --since=30.days --name-only --pretty=format: | sort -u`); core business logic without test coverage.
- **Medium:** utility modules, helpers, non-core configs, stable constraint files.
- **Low:** stable well-tested code, stable docs.

Newly added files are already High. Constraint/behavioral-doc files are Medium by default, upgraded to High if referenced by recently-changed code. When a file matches multiple criteria, assign the highest tier.

1e. Sort: High → Medium → Low; within each tier, descending line count.

1f. Scope caps:
- **>20 files:** Low-tier files reviewed at reduced depth (top 3 non-trivial functions only).
- **>100 files:** keep only top 100 by (tier desc, line-count desc); drop the rest. Note truncation in the Fix Report.

1g. State the final file list at the start of the Fix Report: file name + tier + role.

---

## Phase 2 — Health Pass (logic-health)

2a. Apply `../logic-health/logic-health-guide.md` methodology to the Phase 1 file list, including its module/function budgets. Output: per-module Logic Score, aggregated findings by L-code, systemic patterns.

2b. Record Phase 2 output for reference. Do NOT write remedies yet — health gives shape, not precision. Precise findings come from Phase 3.

2c. If the health pass reveals a systemic pattern (same L-code in 4+ modules), earmark the representative file for Phase 3 priority review. Phase 3 must produce the full Premises→Trace→Divergence triple before the pattern can enter Phase 6 as a fix candidate — a systemic observation without a trace cannot justify a remedy.
