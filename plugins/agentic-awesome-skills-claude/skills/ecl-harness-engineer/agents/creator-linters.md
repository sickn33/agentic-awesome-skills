# Linter Creation Agent

You are creating or updating linter scripts for agent harness infrastructure.

## Input

You will receive:
- Architecture analysis with full layer hierarchy (from `harness/.analysis/architecture.json`)
- Existing linter state (from `harness/.analysis/audit.json`)
- Delta list of what to create/update

## Files You Create/Update

### scripts/lint-deps.{ext}

**Purpose**: Enforce layer boundaries — prevent forbidden imports.

**Must include**:
- Complete layer map with EVERY package from the architecture analysis
- No blind spots — if a package exists, it must be in the layer map
- Layer rules: Layer N can only import from layers < N

**Error message format** (agent-actionable):

```
{file}:{line} imports {forbidden_package} (layer {N} → layer {M}).
Layer {N} packages can only import from layers < {N}.

Fix options:
1. Move {logic description} to a higher layer (e.g., {suggestion})
2. Pass the value as a parameter instead of importing directly
3. Define an interface in layer {N} and implement in layer {M}
```

This is the most important quality requirement. An error message that only says "Forbidden import" is useless to an agent. The message must tell WHAT is wrong, WHY it matters, and HOW to fix it.

### scripts/lint-quality.{ext}

**Purpose**: Enforce code quality patterns.

**Common rules** (customize based on codebase patterns):
- File size limits (e.g., > 500 lines → warning)
- Structured logging enforcement
- Error wrapping convention
- Naming conventions
- Test file presence

**Same error message quality**: WHAT + WHY + HOW.

### scripts/lint-ecl.{ps1|sh|mjs|py}

**Purpose**: Enforce ECL change lifecycle integrity.

**Must check**:
- `harness/changes/active/` has `summary.md`, `spec.md`, `plan.md`, `tasks.md`, and `reviews/` when active exists.
- Markdown front matter status is internally consistent.
- Active changes in `implement`, `validate`, or `done` phase have no high-impact
  `[NEEDS CLARIFICATION: ...]` markers in `spec.md`.
- Active changes cannot enter implementation until `plan_review` is approved in `summary.md` or an
  equivalent approved Plan Review exists in `reviews/review.md`.
- Executable task lines in `tasks.md` use `T###` ids, and implementation tasks include target paths
  plus validation notes.
- `completed` changes have validation results.
- `tasks.md` with unexplained pending items cannot be completed.
- `docs/STATUS.md` exists for ECL-enabled projects and clearly says active change files override it.
- A temporary regenerated index matches `harness/changes/INDEX.json`; otherwise fail and tell the user to run the generated `scripts/harness-change.* reindex` equivalent.
- `scripts/harness-evolve.*` and `harness/evolution/state.json` exist for core auto-evolve threshold checking.
- If `harness/evolution/pending.md` exists, lint may report it as pending context, but must not apply or delete it automatically.

### scripts/lint-encoding.{ps1|sh|mjs|py}

**Purpose**: Enforce UTF-8 and prevent mojibake from being written into source or docs.

**Must check**:
- Scan text files for known mojibake markers listed in `references/ecl-harness.md`.
- Exclude generated/vendor/cache directories.
- Return actionable file and line messages.

## Language-Specific Templates

Use templates from `references/linter-templates.md` as starting points, then customize:

- **Go**: Go script that parses imports, checks against layer map
- **TypeScript/Node.js**: read `references/adapters/typescript.md` first; generate Node/TS-native scripts such as `scripts/lint-deps.mjs` and `scripts/lint-quality.mjs`, and wire them through npm/package-manager scripts
- **Python**: Python script that parses from/import statements
- **ECL/Encoding**: use the selected command surface profile from `references/ecl-harness.md` (`.ps1`, `.sh`, `.mjs`, or `.py`)

## Critical Rules

1. **Day-one pass required**: The linter MUST pass on the current codebase without errors. If the codebase has existing violations, document them in `docs/exec-plans/tech-debt-tracker.md` instead of failing the linter.

2. **Complete coverage**: Every package in the codebase must appear in the layer map. Missing packages = blind spots = undetected violations.

3. **Executable**: Scripts must run from the project root. Bash/Node/Python scripts should be executable when the environment supports file modes; Windows-only profiles may use explicit interpreter commands.

4. **Makefile integration**: Ensure `make lint-arch` target runs these scripts.

5. **Generated index, evolution, and handoff discipline**: `lint-ecl` verifies `INDEX.json` freshness, auto-evolve state presence, and `docs/STATUS.md` presence, but never rewrites those files. Rewriting belongs to the generated `harness-change reindex`, `harness-evolve check/mark-complete`, and explicit agent/human handoff updates.

6. **Command surface consistency**: Select the script profile automatically from project evidence. If the project rejects `.ps1`, do not generate PowerShell as the only entrypoint. For Windows projects using Bash, document Git Bash, WSL, MSYS2, or CI Linux shell as a prerequisite. If the PowerShell profile is selected, scripts must run on Windows PowerShell 5.1 as well as PowerShell 7.

7. **Strict business gates**: Do not remove or weaken existing project `lint`, `typecheck`, `test`,
   or `build` checks to make CI pass. If those checks fail before harness creation, report them as
   pre-existing project debt; keep the generated CI strict unless the user explicitly asks for staged rollout.

## Verification

After creating linters, verify:

```bash
# Linters are executable
chmod +x scripts/lint-deps* scripts/lint-quality*

# Linters pass on current codebase
make lint-arch

# ECL and encoding checks pass
{ecl_lint_command}
{encoding_lint_command}

# Count covered packages vs total packages
# (should be 100%)
```
