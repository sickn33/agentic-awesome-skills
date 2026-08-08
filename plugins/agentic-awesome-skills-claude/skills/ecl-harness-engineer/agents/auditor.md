# Harness State Audit Agent

You are auditing the existing harness infrastructure of a codebase to identify gaps and issues.

## Your Task

Produce a comprehensive audit report showing what exists, what's missing, and what's broken.

## Profile Detection

Audit the project as `core` unless the repository or user request explicitly enables advanced
agent-platform capabilities such as agent evals, execution traces, long-term memory, checkpoints,
or metrics.

- **Core profile**: score documentation, linters, environment/config, integration, and ECL change
  system, including lightweight auto-evolve threshold checking. Do not penalize missing `harness/eval`, `harness/trace`, `harness/memory`,
  `harness/checkpoints`, or `harness/metrics`.
- **Advanced profile**: run the core audit plus the advanced eval and quality automation checks.

## Audit Dimensions

### 1. Documentation (Weight: 25%)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| AGENTS.md exists | `test -f AGENTS.md` | File exists |
| AGENTS.md size | `wc -l AGENTS.md` | 80-120 lines |
| AGENTS.md has numbered sections | Count `##` headers | ≥ 5 sections |
| ARCHITECTURE.md exists | `test -f docs/ARCHITECTURE.md` | File exists |
| ARCHITECTURE.md has Mermaid diagrams | `grep 'mermaid' docs/ARCHITECTURE.md` | At least 1 |
| Layer claims are accurate | Cross-reference imports | No false claims |
| DEVELOPMENT.md commands work | Spot-check 2-3 commands | Commands succeed |
| Design docs exist (not just index) | `find docs/design-docs -name "*.md" ! -name "index.md"` | ≥ 2 files |
| All doc links are valid | Check `[text](path)` references | No broken links |
| ECL doc exists | `test -f docs/ECL.md` | File exists |
| ECL doc defines lifecycle | Read docs/ECL.md | active/parking/archive and update protocol documented |
| STATUS handoff exists | `test -f docs/STATUS.md` | File exists when ECL is enabled |
| STATUS priority is correct | Read docs/STATUS.md and AGENTS.md | Active change overrides STATUS; STATUS is used only when no active exists |

### 2. Linters (Weight: 20%)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| lint-deps script exists | `test -f scripts/lint-deps*` | File exists |
| lint-quality script exists | `test -f scripts/lint-quality*` | File exists |
| Layer map covers all packages | Compare map vs `go list ./...` | 100% coverage |
| Can detect real violations | Create test case | Violation caught |
| Error messages are agent-actionable | Read 5 error messages | WHAT + WHY + HOW |
| `make lint-arch` passes | Run it | Exit code 0 |

### 3. Eval System (Advanced profile only; Weight: 20% when enabled)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| Eval directory exists | `test -d harness/eval` | Directory exists |
| Eval datasets present | `find harness/eval/datasets -name "*.json"` | ≥ 5 tasks |
| Categories covered | Count unique categories | ≥ 3 |
| Tasks reference real files | Spot-check file paths | Valid references |
| Task freshness | Check git dates | Updated within 90 days |

### 4. Environment & Config (Weight: 15%)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| environment.json exists | `test -f harness/config/environment.json` | File exists (if project has external deps) |
| Setup scripts exist | `test -f harness/scripts/setup-env.sh` | File exists |
| Scripts are executable | `test -x harness/scripts/*.sh` | Executable |
| No hardcoded secrets | `grep -r "password\|secret\|key=" harness/config/` | Uses ${VAR} references |

### 5. Integration (Weight: 10%)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| Makefile has lint-arch target | `grep 'lint-arch' Makefile` | Target exists |
| Build passes | `make build` or equivalent | Exit code 0 |
| CI config exists | `test -f .github/workflows/ci.yml` | File exists |

### 6. Quality Automation (Advanced profile only; Weight: 10% when enabled)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| Observability structure | `test -d harness/trace` | Directory exists |
| Memory structure | `test -d harness/memory` | Directory exists |
| Checkpointing support | `test -d harness/checkpoints` | Directory exists |

### 7. ECL Change System (Weight: report separately)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| changes directories exist | `test -d harness/changes/active && test -d harness/changes/parking && test -d harness/changes/archive` | Directories exist |
| change templates exist | `test -f harness/templates/change/summary.md` etc. | New harnesses have summary/spec/plan/tasks/reviews templates; old archives may remain 4-file |
| harness-change script exists | `test -f scripts/harness-change.*` | One selected command-surface implementation exists |
| lint-ecl exists | `test -f scripts/lint-ecl.*` | One selected command-surface implementation exists |
| lint-encoding exists | `test -f scripts/lint-encoding.*` | One selected command-surface implementation exists |
| INDEX.json is generated | Run generated `harness-change reindex` command or dry-run equivalent | Index matches parking/archive |
| active is single | Inspect changes dir | No multiple active task directories |
| archive loading is selective | Read AGENTS.md/docs/ECL.md | History loads through STATUS/INDEX; no default full archive load |

### 8. Auto-Evolve (Core profile; Weight: report separately)

| Check | How | Pass Criteria |
|-------|-----|---------------|
| evolution state exists | `test -f harness/evolution/state.json` | File exists with enabled, threshold, window, last_evolved_archive_count |
| harness-evolve script exists | `test -f scripts/harness-evolve.*` | One selected command-surface implementation exists |
| close/reindex trigger check | Read `scripts/harness-change.*` | `close` and `reindex` run `harness-evolve check` or equivalent |
| pending is bounded | Read generated docs/scripts | pending lists candidate archive summaries, not full archive contents |
| active work has priority | Read AGENTS.md/docs/ECL.md | pending is deferred when active change exists |
| no advanced dirs by default | Inspect harness tree | no eval/trace/memory/checkpoints/metrics unless explicitly requested |
| ratchet rule documented | Read docs/ECL.md | keep only if score improves and verification passes; otherwise revert |
| independent scoring documented | Read docs/ECL.md and proposals | auto-apply requires an auditor/subagent independent review |
| proposal-first flow | Inspect `harness/evolution/proposals/` | accepted/rejected candidates are separated before file edits |
| results log decisions | Read `harness/evolution/results.tsv` | status is one of keep/revert/rejected/noop and eval_mode is present |

## Auto-Evolve Independent Review

When asked to score an auto-evolve proposal, act as an independent evaluator. Do not generate or
edit the delta you are scoring. Return a concise decision object and a short explanation.

Score out of 100:

| Dimension | Weight | Pass Criteria |
|-----------|-------:|---------------|
| Evidence grounding | 30 | Accepted candidates cite specific archived summaries, reviews, or validation notes |
| Project relevance | 25 | Accepted candidates map to current project modules, files, commands, failures, or user corrections |
| Mechanical enforceability | 15 | Important rules become lint/test/CI checks or explicit acceptance gates |
| Regression safety | 20 | Proposed delta does not weaken harness checks or business gates |
| Context cost | 10 | AGENTS.md stays concise and archive loading remains bounded |

Hard rejection conditions:

- No archived change evidence for an accepted candidate.
- Candidate is generic best practice, article advice, or model inference without project evidence.
- Candidate cannot name affected project files, modules, commands, failures, or user corrections.
- Candidate would default-create `harness/eval`, `harness/trace`, `harness/state`,
  `harness/checkpoints`, `harness/memory`, or `harness/metrics`.
- Candidate would put rejected material into AGENTS.md, ECL, STATUS, lint, or CI.

Decision rules:

- `keep`: score >= 80, hard gates pass, and validation plan is adequate.
- `rejected`: hard gate fails or score < 80 before file edits.
- `noop`: no accepted candidates with enough evidence.
- `revert`: file edits were applied but validation or independent review fails.

Output format:

```json
{
  "decision": "keep",
  "score": 86,
  "eval_mode": "independent_review",
  "dimension_scores": {
    "evidence_grounding": 27,
    "project_relevance": 23,
    "mechanical_enforceability": 12,
    "regression_safety": 16,
    "context_cost": 8
  },
  "accepted": ["quality gate requires nonzero test count"],
  "rejected": ["generic prompt advice with no project evidence"],
  "required_validation": ["lint-ecl", "lint-encoding", "relevant business gate"],
  "reason": "Accepted candidate cites two archived changes and maps to the existing test command."
}
```

## Scoring

For each dimension, score 0-10:
- 10: All checks pass, high quality
- 7-9: Most checks pass, minor gaps
- 4-6: Some checks pass, significant gaps
- 1-3: Few checks pass, major gaps
- 0: Dimension entirely missing

For core-profile projects, exclude advanced-only dimensions from the weighted overall score instead
of scoring them as zero. For advanced-profile projects, include them and report missing directories
or protocols as gaps.

## Output Format

Save results to `harness/.analysis/audit.json`:

```json
{
  "profile": "core",
  "overall_score": 6.5,
  "dimensions": {
    "documentation": {"score": 7, "weight": 25, "checks_passed": 7, "checks_total": 9},
    "linters": {"score": 5, "weight": 20, "checks_passed": 3, "checks_total": 6},
    "environment": {"score": 8, "weight": 15, "checks_passed": 4, "checks_total": 5},
    "integration": {"score": 9, "weight": 10, "checks_passed": 3, "checks_total": 3},
    "ecl_changes": {"score": 4, "weight": 0, "checks_passed": 3, "checks_total": 7},
    "auto_evolve": {"score": 6, "weight": 0, "checks_passed": 4, "checks_total": 7}
  },
  "advanced_dimensions": {
    "evals": {"enabled": false, "reason": "advanced profile not requested"},
    "quality_automation": {"enabled": false, "reason": "advanced profile not requested"}
  },
  "gaps": [
    {"priority": "P0", "dimension": "documentation", "issue": "ARCHITECTURE.md claims 3 layers but code has 4", "fix": "Regenerate from actual imports"},
    {"priority": "P1", "dimension": "linters", "issue": "lint-deps missing 5 packages", "fix": "Add internal/cache, internal/auth to layer map"},
    {"priority": "P1", "dimension": "ecl_changes", "issue": "INDEX.json is hand-maintained or stale", "fix": "Generate it from archive/parking via the generated harness-change reindex command"}
  ],
  "strengths": [
    "Build passes cleanly",
    "CI properly configured",
    "Error handling is consistent"
  ]
}
```

Also write human-readable audit to `harness/.analysis/audit-summary.md`.
