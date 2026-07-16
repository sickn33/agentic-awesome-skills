---
name: zeroize-audit
description: "Detects missing zeroization of sensitive data in source code and identifies zeroization removed by compiler optimizations, with assembly-level analysis, and control-flow verification. Use for auditing C/C++/Rust code handling secrets, keys, passwords, or other sensitive data."
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Task
  - AskUserQuestion
  - mcp__serena__activate_project
  - mcp__serena__find_symbol
  - mcp__serena__find_referencing_symbols
  - mcp__serena__get_symbols_overview
risk: unknown
source: community
---

# zeroize-audit — Claude Skill

## When to Use
- Auditing cryptographic implementations (keys, seeds, nonces, secrets)
- Reviewing authentication systems (passwords, tokens, session data)
- Analyzing code that handles PII or sensitive credentials
- Verifying secure cleanup in security-critical codebases
- Investigating memory safety of sensitive data handling

## When NOT to Use
- General code review without security focus
- Performance optimization (unless related to secure wiping)
- Refactoring tasks not related to sensitive data
- Code without identifiable secrets or sensitive values

---

## Purpose
Detect missing zeroization of sensitive data in source code and identify zeroization that is removed or weakened by compiler optimizations (e.g., dead-store elimination), with mandatory LLVM IR/asm evidence. Capabilities include:
- Assembly-level analysis for register spills and stack retention
- Data-flow tracking for secret copies
- Heap allocator security warnings
- Semantic IR analysis for loop unrolling and SSA form
- Control-flow graph analysis for path coverage verification
- Runtime validation test generation

## Scope
- Read-only against the target codebase (does not modify audited code; writes analysis artifacts to a temporary working directory).
- Produces a structured report (JSON).
- Requires valid build context (`compile_commands.json`) and compilable translation units.
- "Optimized away" findings only allowed with compiler evidence (IR/asm diff).

---

## Inputs

See `{baseDir}/schemas/input.json` for the full schema. Key fields:

| Field | Required | Default | Description |
|---|---|---|---|
| `path` | yes | — | Repo root |
| `compile_db` | no | `null` | Path to `compile_commands.json` for C/C++ analysis. Required if `cargo_manifest` is not set. |
| `cargo_manifest` | no | `null` | Path to `Cargo.toml` for Rust crate analysis. Required if `compile_db` is not set. |
| `config` | no | — | YAML defining heuristics and approved wipes |
| `opt_levels` | no | `["O0","O1","O2"]` | Optimization levels for IR comparison. O1 is the diagnostic level: if a wipe disappears at O1 it is simple DSE; O2 catches more aggressive eliminations. |
| `languages` | no | `["c","cpp","rust"]` | Languages to analyze |
| `max_tus` | no | — | Limit on translation units processed from compile DB |
| `mcp_mode` | no | `prefer` | `off`, `prefer`, or `require` — controls Serena MCP usage |
| `mcp_required_for_advanced` | no | `true` | Downgrade `SECRET_COPY`, `MISSING_ON_ERROR_PATH`, and `NOT_DOMINATING_EXITS` to `needs_review` when MCP is unavailable |
| `mcp_timeout_ms` | no | — | Timeout budget for MCP semantic queries |
| `poc_categories` | no | all 11 exploitable | Finding categories for which to generate PoCs. C/C++ findings: all 11 categories supported. Rust findings: only `MISSING_SOURCE_ZEROIZE`, `SECRET_COPY`, and `PARTIAL_WIPE` are supported; other Rust categories are marked `poc_supported=false`. |
| `poc_output_dir` | no | `generated_pocs/` | Output directory for generated PoCs |
| `enable_asm` | no | `true` | Enable assembly emission and analysis (Step 8); produces `STACK_RETENTION`, `REGISTER_SPILL`. Auto-disabled if `emit_asm.sh` is missing. |
| `enable_semantic_ir` | no | `false` | Enable semantic LLVM IR analysis (Step 9); produces `LOOP_UNROLLED_INCOMPLETE` |
| `enable_cfg` | no | `false` | Enable control-flow graph analysis (Step 10); produces `MISSING_ON_ERROR_PATH`, `NOT_DOMINATING_EXITS` |
| `enable_runtime_tests` | no | `false` | Enable runtime test harness generation (Step 11) |

---

## Prerequisites

Before running, verify the following. Each has a defined failure mode.

**C/C++ prerequisites:**

| Prerequisite | Failure mode if missing |
|---|---|
| `compile_commands.json` at `compile_db` path | Fail fast — do not proceed |
| `clang` on PATH | Fail fast — IR/ASM analysis impossible |
| `uvx` on PATH (for Serena) | If `mcp_mode=require`: fail. If `mcp_mode=prefer`: continue without MCP; downgrade affected findings per Confidence Gating rules. |
| `{baseDir}/tools/extract_compile_flags.py` | Fail fast — cannot extract per-TU flags |
| `{baseDir}/tools/emit_ir.sh` | Fail fast — IR analysis impossible |
| `{baseDir}/tools/emit_asm.sh` | Warn and skip assembly findings (STACK_RETENTION, REGISTER_SPILL) |
| `{baseDir}/tools/mcp/check_mcp.sh` | Warn and treat as MCP unavailable |
| `{baseDir}/tools/mcp/normalize_mcp_evidence.py` | Warn and use raw MCP output |

**Rust prerequisites:**

| Prerequisite | Failure mode if missing |
|---|---|
| `Cargo.toml` at `cargo_manifest` path | Fail fast — do not proceed |
| `cargo check` passes | Fail fast — crate must be buildable |
| `cargo +nightly` on PATH | Fail fast — nightly required for MIR and LLVM IR emission |
| `uv` on PATH | Fail fast — required to run Python analysis scripts |
| `{baseDir}/tools/validate_rust_toolchain.sh` | Warn — run preflight manually. Checks all tools, scripts, nightly, and optionally `cargo check`. Use `--json` for machine-readable output, `--manifest` to also validate the crate builds. |
| `{baseDir}/tools/emit_rust_mir.sh` | Fail fast — MIR analysis impossible (`--opt`, `--crate`, `--bin/--lib` supported; `--out` can be file or directory) |
| `{baseDir}/tools/emit_rust_ir.sh` | Fail fast — LLVM IR analysis impossible (`--opt` required; `--crate`, `--bin/--lib` supported; `--out` must be `.ll`) |
| `{baseDir}/tools/emit_rust_asm.sh` | Warn and skip assembly findings (`STACK_RETENTION`, `REGISTER_SPILL`). Supports `--opt`, `--crate`, `--bin/--lib`, `--target`, `--intel-syntax`; `--out` can be `.s` file or directory. |
| `{baseDir}/tools/diff_rust_mir.sh` | Warn and skip MIR-level optimization comparison. Accepts 2+ MIR files, normalizes, diffs pairwise, and reports first opt level where zeroize/drop-glue patterns disappear. |
| `{baseDir}/tools/scripts/semantic_audit.py` | Warn and skip semantic source analysis |
| `{baseDir}/tools/scripts/find_dangerous_apis.py` | Warn and skip dangerous API scan |
| `{baseDir}/tools/scripts/check_mir_patterns.py` | Warn and skip MIR analysis |
| `{baseDir}/tools/scripts/check_llvm_patterns.py` | Warn and skip LLVM IR analysis |
| `{baseDir}/tools/scripts/check_rust_asm.py` | Warn and skip Rust assembly analysis (`STACK_RETENTION`, `REGISTER_SPILL`, drop-glue checks). Dispatches to `check_rust_asm_x86.py` (production) or `check_rust_asm_aarch64.py` (**EXPERIMENTAL** — AArch64 findings require manual verification). |
| `{baseDir}/tools/scripts/check_rust_asm_x86.py` | Required by `check_rust_asm.py` for x86-64 analysis; warn and skip if missing |
| `{baseDir}/tools/scripts/check_rust_asm_aarch64.py` | Required by `check_rust_asm.py` for AArch64 analysis (**EXPERIMENTAL**); warn and skip if missing |

**Common prerequisite:**

| Prerequisite | Failure mode if missing |
|---|---|
| `{baseDir}/tools/generate_poc.py` | Fail fast — PoC generation is mandatory |

---

## Approved Wipe APIs

The following are recognized as valid zeroization. Configure additional entries in `{baseDir}/configs/`.

**C/C++**
- `explicit_bzero`
- `memset_s`
- `SecureZeroMemory`
- `OPENSSL_cleanse`
- `sodium_memzero`
- Volatile wipe loops (pattern-based; see `volatile_wipe_patterns` in `{baseDir}/configs/default.yaml`)
- In IR: `llvm.memset` with volatile flag, volatile stores, or non-elidable wipe call

**Rust**
- `zeroize::Zeroize` trait (`zeroize()` method)
- `Zeroizing<T>` wrapper (drop-based)
- `ZeroizeOnDrop` derive macro

---

## Finding Capabilities

Findings are grouped by required evidence. Only attempt findings for which the required tooling is available.

| Finding ID | Description | Requires | PoC Support |
|---|---|---|---|
| `MISSING_SOURCE_ZEROIZE` | No zeroization found in source | Source only | Yes (C/C++ + Rust) |
| `PARTIAL_WIPE` | Incorrect size or incomplete wipe | Source only | Yes (C/C++ + Rust) |
| `NOT_ON_ALL_PATHS` | Zeroization missing on some control-flow paths (heuristic) | Source only | Yes (C/C++ only) |
| `SECRET_COPY` | Sensitive data copied without zeroization tracking | Source + MCP preferred | Yes (C/C++ + Rust) |
| `INSECURE_HEAP_ALLOC` | Secret uses insecure allocator (malloc vs. secure_malloc) | Source only | Yes (C/C++ only) |
| `OPTIMIZED_AWAY_ZEROIZE` | Compiler removed zeroization | IR diff required (never source-only) | Yes |
| `STACK_RETENTION` | Stack frame may retain secrets after return | Assembly required (C/C++); LLVM IR `alloca`+`lifetime.end` evidence (Rust); assembly corroboration upgrades to `confirmed` | Yes (C/C++ only) |
| `REGISTER_SPILL` | Secrets spilled from registers to stack | Assembly required (C/C++); LLVM IR `load`+call-site evidence (Rust); assembly corroboration upgrades to `confirmed` | Yes (C/C++ only) |
| `MISSING_ON_ERROR_PATH` | Error-handling paths lack cleanup | CFG or MCP required | Yes |
| `NOT_DOMINATING_EXITS` | Wipe doesn't dominate all exits | CFG or MCP required | Yes |
| `LOOP_UNROLLED_INCOMPLETE` | Unrolled loop wipe is incomplete | Semantic IR required | Yes |

---

## Agent Architecture

The analysis pipeline uses 11 agents across 8 phases, invoked by the orchestrator (`{baseDir}/prompts/task.md`) via `Task`. Agents write persistent finding files to a shared working directory (`/tmp/zeroize-audit-{run_id}/`), enabling parallel execution and protecting against context pressure.

| Agent | Phase | Purpose | Output Directory |
|---|---|---|---|
| `0-preflight` | Phase 0 | Preflight checks (tools, toolchain, compile DB, crate build), config merge, workdir creation, TU enumeration | `{workdir}/` |
| `1-mcp-resolver` | Phase 1, Wave 1 (C/C++ only) | Resolve symbols, types, and cross-file references via Serena MCP | `mcp-evidence/` |
| `2-source-analyzer` | Phase 1, Wave 2a (C/C++ only) | Identify sensitive objects, detect wipes, validate correctness, data-flow/heap | `source-analysis/` |
| `2b-rust-source-analyzer` | Phase 1, Wave 2b (Rust only, parallel with 2a) | Rustdoc JSON trait-aware analysis + dangerous API grep | `source-analysis/` |
| `3-tu-compiler-analyzer` | Phase 2, Wave 3 (C/C++ only, N parallel) | Per-TU IR diff, assembly, semantic IR, CFG analysis | `compiler-analysis/{tu_hash}/` |
| `3b-rust-compiler-analyzer` | Phase 2, Wave 3R (Rust only, single agent) | Crate-level MIR, LLVM IR, and assembly analysis | `rust-compiler-analysis/` |
| `4-report-assembler` | Phase 3 (interim) + Phase 6 (final) | Collect findings from all agents, apply confidence gates; merge PoC results and produce final report | `report/` |
| `5-poc-generator` | Phase 4 | Craft bespoke proof-of-concept programs (C/C++: all categories; Rust: MISSING_SOURCE_ZEROIZE, SECRET_COPY, PARTIAL_WIPE) | `poc/` |
| `5b-poc-validator` | Phase 5 | Compile and run all PoCs | `poc/` |
| `5c-poc-verifier` | Phase 5 | Verify each PoC proves its claimed finding | `poc/` |
| `6-test-generator` | Phase 7 (optional) | Generate runtime validation test harnesses | `tests/` |

The orchestrator reads one per-phase workflow file from `{baseDir}/workflows/` at a time, and maintains `orchestrator-state.json` for recovery after context compression. Agents receive configuration by file path (`config_path`), not by value.

### Execution flow

```
Phase 0: 0-preflight agent — Preflight + config + create workdir + enumerate TUs
           → writes orchestrator-state.json, merged-config.yaml, preflight.json
Phase 1: Wave 1:  1-mcp-resolver              (skip if mcp_mode=off OR language_mode=rust)
         Wave 2a: 2-source-analyzer           (C/C++ only; skip if no compile_db)  ─┐ parallel
         Wave 2b: 2b-rust-source-analyzer     (Rust only; skip if no cargo_manifest) ─┘
Phase 2: Wave 3:  3-tu-compiler-analyzer x N  (C/C++ only; parallel per TU)
         Wave 3R: 3b-rust-compiler-analyzer   (Rust only; single crate-level agent)
Phase 3: Wave 4:  4-report-assembler          (mode=interim → findings.json; reads all agent outputs)
Phase 4: Wave 5:  5-poc-generator             (C/C++: all categories; Rust: MISSING_SOURCE_ZEROIZE, SECRET_COPY, PARTIAL_WIPE; other Rust findings: poc_supported=false)
Phase 5: PoC Validation & Verification
           Step 1: 5b-poc-validator agent      (compile and run all PoCs)
           Step 2: 5c-poc-verifier agent       (verify each PoC proves its claimed finding)
           Step 3: Orchestrator presents verification failures to user via AskUserQuestion
           Step 4: Orchestrator merges all results into poc_final_results.json
Phase 6: Wave 6: 4-report-assembler           (mode=final → merge PoC results, final-report.md)
Phase 7: Wave 7: 6-test-generator             (optional)
Phase 8: Orchestrator — Return final-report.md
```

## Cross-Reference Convention

IDs are namespaced per agent to prevent collisions during parallel execution:

| Entity | Pattern | Assigned By |
|---|---|---|
| Sensitive object (C/C++) | `SO-0001`–`SO-4999` | `2-source-analyzer` |
| Sensitive object (Rust) | `SO-5000`–`SO-9999` (Rust namespace) | `2b-rust-source-analyzer` |
| Source finding (C/C++) | `F-SRC-NNNN` | `2-source-analyzer` |
| Source finding (Rust) | `F-RUST-SRC-NNNN` | `2b-rust-source-analyzer` |
| IR finding (C/C++) | `F-IR-{tu_hash}-NNNN` | `3-tu-compiler-analyzer` |
| ASM finding (C/C++) | `F-ASM-{tu_hash}-NNNN` | `3-tu-compiler-analyzer` |
| CFG finding | `F-CFG-{tu_hash}-NNNN` | `3-tu-compiler-analyzer` |
| Semantic IR finding | `F-SIR-{tu_hash}-NNNN` | `3-tu-compiler-analyzer` |
| Rust MIR finding | `F-RUST-MIR-NNNN` | `3b-rust-compiler-analyzer` |
| Rust LLVM IR finding | `F-RUST-IR-NNNN` | `3b-rust-compiler-analyzer` |
| Rust assembly finding | `F-RUST-ASM-NNNN` | `3b-rust-compiler-analyzer` |
| Translation unit | `TU-{hash}` | Orchestrator |
| Final finding | `ZA-NNNN` | `4-report-assembler` |

Every finding JSON object includes `related_objects`, `related_findings`, and `evidence_files` fields for cross-referencing between agents.

---

## Detection Strategy

Analysis runs in two phases. For complete step-by-step guidance, see `{baseDir}/references/detection-strategy.md`.

| Phase | Steps | Findings produced | Required tooling |
|---|---|---|---|
| Phase 1 (Source) | 1–6 | `MISSING_SOURCE_ZEROIZE`, `PARTIAL_WIPE`, `NOT_ON_ALL_PATHS`, `SECRET_COPY`, `INSECURE_HEAP_ALLOC` | Source + compile DB |
| Phase 2 (Compiler) | 7–12 | `OPTIMIZED_AWAY_ZEROIZE`, `STACK_RETENTION`*, `REGISTER_SPILL`*, `LOOP_UNROLLED_INCOMPLETE`†, `MISSING_ON_ERROR_PATH`‡, `NOT_DOMINATING_EXITS`‡ | `clang`, IR/ASM tools |

\* requires `enable_asm=true` (default)
† requires `enable_semantic_ir=true`
‡ requires `enable_cfg=true`

---


## Output Format

Each run produces two outputs:

1. **`final-report.md`** — Comprehensive markdown report (primary human-readable output)
2. **`findings.json`** — Structured JSON matching `{baseDir}/schemas/output.json` (for machine consumption and downstream tools)

### Markdown Report Structure

The markdown report (`final-report.md`) contains these sections:

- **Header**: Run metadata (run_id, timestamp, repo, compile_db, config summary)
- **Executive Summary**: Finding counts by severity, confidence, and category
- **Sensitive Objects Inventory**: Table of all identified objects with IDs, types, locations
- **Findings**: Grouped by severity then confidence. Each finding includes location, object, all evidence (source/IR/ASM/CFG), compiler evidence details, and recommended fix
- **Superseded Findings**: Source findings replaced by CFG-backed findings
- **Confidence Gate Summary**: Downgrades applied and overrides rejected
- **Analysis Coverage**: TUs analyzed, agent success/failure, features enabled
- **Appendix: Evidence Files**: Mapping of finding IDs to evidence file paths

### Structured JSON

The `findings.json` file follows the schema in `{baseDir}/schemas/output.json`. Each `Finding` object:

```json
{
  "id": "ZA-0001",
  "category": "OPTIMIZED_AWAY_ZEROIZE",
  "severity": "high",
  "confidence": "confirmed",
  "language": "c",
  "file": "src/crypto.c",
  "line": 42,
  "symbol": "key_buf",
  "evidence": "store volatile i8 0 count: O0=32, O2=0 — wipe eliminated by DSE",
  "compiler_evidence": {
    "opt_levels": ["O0", "O2"],
    "o0": "32 volatile stores targeting key_buf",
    "o2": "0 volatile stores (all eliminated)",
    "diff_summary": "All volatile wipe stores removed at O2 — classic DSE pattern"
  },
  "suggested_fix": "Replace memset with explicit_bzero or add compiler_fence(SeqCst) after the wipe",
  "poc": {
    "file": "generated_pocs/ZA-0001.c",
    "makefile_target": "ZA-0001",
    "compile_opt": "-O2",
    "requires_manual_adjustment": false,
    "validated": true,
    "validation_result": "exploitable"
  }
}
```

See `{baseDir}/schemas/output.json` for the full schema and enum values.

---

## Confidence Gating

### Evidence thresholds

A finding requires at least **2 independent signals** to be marked `confirmed`. With 1 signal, mark `likely`. With 0 strong signals (name-pattern match only), mark `needs_review`.

Signals include: name pattern match, type hint match, explicit annotation, IR evidence, ASM evidence, MCP cross-reference, CFG evidence, PoC validation.

### PoC validation as evidence signal

Every finding is validated against a bespoke PoC. After compilation and execution, each PoC is also verified to ensure it actually tests the claimed vulnerability. The combined result is an evidence signal:

| PoC Result | Verified | Impact |
|---|---|---|
| Exit 0 (exploitable) | Yes | Strong signal — can upgrade `likely` to `confirmed` |
| Exit 1 (not exploitable) | Yes | Downgrade severity to `low` (informational); retain in report |
| Exit 0 or 1 | No (user accepted) | Weaker signal — note verification failure in evidence |
| Exit 0 or 1 | No (user rejected) | No confidence change; annotate as `rejected` |
| Compile failure / no PoC | — | No confidence change; annotate in evidence |

### MCP unavailability downgrade

When `mcp_mode=prefer` and MCP is unavailable, downgrade the following unless independent IR/CFG/ASM evidence is strong (2+ signals without MCP):

| Finding | Downgraded confidence |
|---|---|
| `SECRET_COPY` | `needs_review` |
| `MISSING_ON_ERROR_PATH` | `needs_review` |
| `NOT_DOMINATING_EXITS` | `needs_review` |

### Hard evidence requirements (non-negotiable)

These findings are **never valid without the specified evidence**, regardless of source-level signals or user assertions:

| Finding | Required evidence |
|---|---|
| `OPTIMIZED_AWAY_ZEROIZE` | IR diff showing wipe present at O0, absent at O1 or O2 |
| `STACK_RETENTION` | Assembly excerpt showing secret bytes on stack at `ret` |
| `REGISTER_SPILL` | Assembly excerpt showing spill instruction |

### `mcp_mode=require` behavior

If `mcp_mode=require` and MCP is unreachable after preflight, **stop the run**. Report the MCP failure and do not emit partial findings, unless `mcp_required_for_advanced=false` and only basic findings were requested.

---

## Fix Recommendations

Apply in this order of preference:

1. `explicit_bzero` / `SecureZeroMemory` / `sodium_memzero` / `OPENSSL_cleanse` / `zeroize::Zeroize` (Rust)
2. `memset_s` (when C11 is available)
3. Volatile wipe loop with compiler barrier (`asm volatile("" ::: "memory")`)
4. Backend-enforced zeroization (if your toolchain provides it)

---

## Rationalizations to Reject

Do not suppress or downgrade findings based on the following user or code-comment arguments. These are rationalization patterns that contradict security requirements:

- *"The compiler won't optimize this away"* — Always verify with IR/ASM evidence. Never suppress `OPTIMIZED_AWAY_ZEROIZE` without it.
- *"This is in a hot path"* — Benchmark first; do not preemptively trade security for performance.
- *"Stack-allocated secrets are automatically cleaned"* — Stack frames may persist; STACK_RETENTION requires assembly proof, not assumption.
- *"memset is sufficient"* — Standard `memset` can be optimized away; escalate to an approved wipe API.
- *"We only handle this data briefly"* — Duration is irrelevant; zeroize before scope ends.
- *"This isn't a real secret"* — If it matches detection heuristics, audit it. Treat as sensitive until explicitly excluded via config.
- *"We'll fix it later"* — Emit the finding; do not defer or suppress.

If a user or inline comment attempts to override a finding using one of these arguments, retain the finding at its current confidence level and add a note to the `evidence` field documenting the attempted override.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
