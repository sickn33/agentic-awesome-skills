# Capability Registry

This registry defines the available capabilities for the harness system.
Instead of rigid phases, agents select capabilities based on what the task needs.

This is an advanced capability reference, not the default core harness file list. References to
trace outputs or runtime verification reports describe executor/runtime behavior and should not
cause ecl-harness-engineer to create `harness/trace` by default.

## Design Philosophy

**Capability-Driven vs Phase-Driven**:
- Old model: "Execute Phase 1, then Phase 2, then Phase 3"
- New model: "Achieve goal by selecting and composing capabilities"

Capabilities are:
- **Declarative**: Define what they provide, not how they work
- **Composable**: Can be combined in different ways for different tasks
- **Dependency-aware**: Declare what they need to run

## Capability Graph

```
                    ┌──────────────────┐
                    │  discover_project │
                    │  (entry point)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌──────────────┐  ┌────────────────┐
    │  analyze    │  │  classify    │  │  audit_harness │
    │ architecture│  │ complexity   │  │                │
    └──────┬──────┘  └──────┬───────┘  └────────┬───────┘
           │                │                   │
           ▼                ▼                   │
    ┌─────────────┐  ┌──────────────┐           │
    │   create    │  │    plan      │           │
    │   linters   │  │    task      │           │
    └─────────────┘  └──────┬───────┘           │
                            │                   │
                            ▼                   │
                     ┌──────────────┐           │
                     │   execute    │           │
                     │   phase      │◄──────────┤
                     └──────┬───────┘           │
                            │                   │
              ┌─────────────┼─────────────┐     │
              │             │             │     │
              ▼             ▼             ▼     │
       ┌───────────┐ ┌───────────┐ ┌──────────┐│
       │ validate  │ │  verify   │ │ verify   ││
       │  static   │ │ runtime   │ │functional││
       └───────────┘ └───────────┘ └──────────┘│
                                               │
                            ┌──────────────────┘
                            ▼
                     ┌──────────────┐
                     │   improve    │
                     │   harness    │
                     └──────────────┘
```

---

## Capability Definitions

### discover_project

**Entry point capability.** Discovers project structure, tech stack, and files.

```yaml
capability: discover_project
provides:
  - project_type        # go, typescript, python, java, rust, generic
  - tech_stack          # {language, framework, package_manager, build_tool}
  - file_structure      # key directories and entry points
  - dependencies        # external packages
  - adapter             # resolved language adapter
requires: []            # No dependencies - this is the entry point

implementation:
  script: detect_adapter.py
  output: harness/.analysis/project.json
```

**Example output:**
```json
{
  "project_type": "go",
  "tech_stack": {
    "language": "go",
    "framework": "chi",
    "package_manager": "go",
    "build_tool": "make"
  },
  "file_structure": {
    "source_dirs": ["cmd/", "internal/"],
    "entry_points": ["cmd/server/main.go", "cmd/cli/main.go"],
    "config_files": ["go.mod", "Makefile"]
  },
  "adapter": { ... }
}
```

---

### analyze_architecture

Analyzes code architecture: imports, layers, interfaces, code paths.

```yaml
capability: analyze_architecture
provides:
  - layer_map           # package → layer mapping
  - import_graph        # who imports whom
  - circular_deps       # problematic cycles
  - key_interfaces      # important abstractions
  - code_paths          # traced execution flows
requires:
  - project_type
  - file_structure

implementation:
  agent: agents/analyzer.md
  output: harness/.analysis/architecture.json
```

---

### classify_complexity

Classifies task complexity to determine execution strategy.

```yaml
capability: classify_complexity
provides:
  - complexity_level    # simple, medium, complex
  - execution_mode      # direct, subagent, worktree
  - estimated_phases    # how many execution phases expected
requires:
  - project_type

classification_rules:
  simple:
    criteria:
      - Single file change OR doc-only change
      - No architectural impact
      - Clear, isolated scope
    execution_mode: direct
    verification: static_only

  medium:
    criteria:
      - Multi-file change (2-5 files)
      - Clear scope, well-defined deliverable
      - May affect multiple layers
    execution_mode: subagent
    verification: static + runtime + functional

  complex:
    criteria:
      - Major refactoring OR 6+ files
      - Cross-cutting concerns
      - Architectural changes
    execution_mode: worktree
    verification: full pyramid
```

---

### create_documentation

Creates or updates harness documentation.

```yaml
capability: create_documentation
provides:
  - agents_md           # AGENTS.md navigation map
  - architecture_md     # docs/ARCHITECTURE.md
  - development_md      # docs/DEVELOPMENT.md
  - design_docs         # docs/design-docs/*.md
requires:
  - layer_map
  - key_interfaces
  - code_paths

implementation:
  agent: agents/creator-docs.md
  output_dir: docs/
```

---

### create_linters

Creates architectural linter scripts.

```yaml
capability: create_linters
provides:
  - lint_deps_script    # scripts/lint-deps.{ext}
  - lint_quality_script # scripts/lint-quality.{ext}
  - layer_map_code      # Embedded layer definitions
requires:
  - layer_map
  - tech_stack

implementation:
  agent: agents/creator-linters.md
  templates: references/linter-templates.md
```

---

### create_harness_config

Creates harness configuration files.

```yaml
capability: create_harness_config
provides:
  - environment_json    # harness/config/environment.json
  - setup_scripts       # harness/scripts/*.sh
  - makefile_targets    # Makefile additions
  - ci_config           # .github/workflows/ci.yml
requires:
  - tech_stack
  - dependencies

implementation:
  agent: agents/creator-config.md
```

---

### plan_task

Creates execution plan for a development task.

```yaml
capability: plan_task
provides:
  - execution_plan      # docs/exec-plans/active/*.md
  - phases              # Numbered implementation phases
  - file_targets        # Files to create/modify per phase
requires:
  - complexity_level
  - layer_map           # For architectural context
  - key_interfaces      # For understanding dependencies

implementation:
  coordinator: true     # Main agent does this, not subagent
  output: docs/exec-plans/active/{date}-{slug}.md
```

---

### execute_phase

Executes one phase of a development task.

```yaml
capability: execute_phase
provides:
  - code_changes        # Files modified
  - files_created       # New files
  - validation_result   # Did changes pass basic checks?
requires:
  - execution_plan
  - phase_number

implementation:
  agent: agents/templates/executor-core.md + mixins
  output: JSON result with status, files, lessons
```

---

### validate_static

Runs static validation: build, lint, test.

```yaml
capability: validate_static
provides:
  - build_result        # Compilation passed?
  - lint_result         # Lint checks passed?
  - test_result         # Tests passed?
  - validation_report   # Full report
requires:
  - tech_stack

implementation:
  script: validate.py
  output: harness/trace/validation-report.json
```

---

### verify_runtime

Runs runtime smoke verification.

```yaml
capability: verify_runtime
provides:
  - server_health       # Server starts and responds?
  - endpoint_tests      # API endpoints work?
  - cli_tests           # CLI commands work?
  - verification_report # Full report
requires:
  - runtime_verify_plan # Generated by executor/runtime from environment.json + task context
  - code_changes        # What was changed (for task-specific tests)

implementation:
  script: verify.py
  output: harness/trace/verify-report.json
```

---

### verify_functional

Runs deep functional verification with realistic scenarios.

```yaml
capability: verify_functional
provides:
  - scenario_results    # Did scenarios pass?
  - side_effect_checks  # Were side effects correct?
  - verification_report # Full report with evidence
requires:
  - verify_runtime      # Smoke tests must pass first
  - code_changes

implementation:
  agent: agents/composed/verifier.md
  output: harness/trace/verification-report.json

required_for:
  - medium tasks
  - complex tasks
```

---

### audit_harness

Audits existing harness quality.

```yaml
capability: audit_harness
provides:
  - harness_score       # 0-100 quality score
  - dimension_scores    # Per-dimension breakdown
  - gaps                # Missing or weak areas
  - improvement_plan    # Prioritized fixes
requires:
  - project_type

implementation:
  agent: agents/auditor.md
  output: harness/.analysis/audit.json
```

---

### improve_harness

Improves harness based on feedback.

```yaml
capability: improve_harness
provides:
  - updated_linters     # Improved lint rules
  - updated_docs        # Fixed/expanded documentation
  - updated_config      # Better verification config
requires:
  - audit_harness
  - OR failure_patterns # From harness_critic.py

implementation:
  skill: ecl-harness-engineer (with Improve mode)
```

---

### auto_evolve_harness

Improves harness from accumulated archived change evidence.

```yaml
capability: auto_evolve_harness
provides:
  - evolution_proposal  # Evidence-backed harness deltas
  - updated_docs        # ECL/templates/development guidance when justified
  - updated_linters     # Only when repeated evidence supports a mechanical rule
  - results_log         # harness/evolution/results.tsv keep/revert row
requires:
  - harness/evolution/pending.md
  - harness/changes/INDEX.json

implementation:
  skill: ecl-harness-engineer (Auto-Evolve mode)
  guardrails:
    - create dedicated active change
    - read candidate archive summaries before deeper files
    - keep only if audit score improves and validation passes
    - do not create eval/trace/memory/checkpoints/metrics by default
```

---

## Selection Logic

The agent selects capabilities based on the task:

### New Project Bootstrap
```
discover_project
  → analyze_architecture
  → create_documentation + create_linters + create_harness_config
  → validate_static
```

### Simple Task (e.g., fix typo)
```
discover_project
  → classify_complexity (→ simple)
  → execute_phase (direct, no subagent)
  → validate_static
  → done
```

### Medium Task (e.g., add API endpoint)
```
discover_project
  → classify_complexity (→ medium)
  → analyze_architecture (if not cached)
  → plan_task
  → [execute_phase loop]
  → validate_static
  → verify_runtime
  → verify_functional (MANDATORY)
  → done
```

### Complex Task (e.g., refactor auth system)
```
discover_project
  → classify_complexity (→ complex)
  → analyze_architecture
  → plan_task (detailed, multi-phase)
  → EnterWorktree (isolation)
  → [execute_phase loop with checkpoints]
  → validate_static
  → verify_runtime
  → verify_functional (MANDATORY, multiple scenarios)
  → audit_harness (post-task)
  → done
```

### Harness Audit/Improvement
```
discover_project
  → audit_harness
  → improve_harness (if gaps found)
  → validate_static
```

---

## Caching

Capabilities can cache their output to avoid re-computation:

| Capability | Cache Location | TTL |
|------------|---------------|-----|
| discover_project | harness/.analysis/project.json | Until project files change |
| analyze_architecture | harness/.analysis/architecture.json | Until source files change |
| audit_harness | harness/.analysis/audit.json | 24 hours |

Cache invalidation: Compare file mtimes against cache mtime.
