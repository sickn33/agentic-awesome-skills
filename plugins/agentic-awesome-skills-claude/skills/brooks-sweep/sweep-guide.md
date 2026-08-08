# Brooks-Lint — Full Sweep Guide

Sequential autonomous pipeline: **review → test → debt → audit**. Fixes findings
in place, iterates until clean or capped, reports residuals. One interaction point:
Step 0 (pre-flight consent) — after approval the pipeline runs hands-free until Step 8.

Every finding follows the Iron Law: **Symptom → Source → Consequence → Remedy**.

---

### Step 0 — Pre-flight consent gate

**Goal:** State scope, cost, and irreversibility up front; get explicit consent
once so later steps never have to ask.

0a. Estimate the file count using `git ls-files | wc -l` if in a git repo, or
   `find . -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/.venv/*' -not -path '*/build/*' -not -path '*/dist/*' -not -path '*/vendor/*' -not -path '*/target/*' | wc -l` otherwise. Order-of-magnitude is enough.

0b. Show this notice verbatim with the estimate filled in. Do not paraphrase —
   the user is agreeing to this exact scope.

   ```
   ⚠️  /brooks-sweep — Full Repository Sweep & Auto-Fix

   Scope:    Four analysis dimensions run in sequence — PR code decay (R1–R6),
             test quality (T1–T6), tech debt, architecture. Edits are made in
             place inside the detected project scope.
   Estimated files in scope: ~N

   Order:    brooks-review → brooks-test → brooks-debt → brooks-audit.
             Each dimension scans, queues, and fixes before the next starts.

   Autonomy: Fully autonomous. Safe single-file fixes apply directly. Multi-file
             fixes that have test coverage AND do not break a public interface
             also apply directly. High-risk fixes (public API break, cross-module
             structural change, or no test coverage) are NOT applied — they are
             recorded in the residual report for human review.

   Iteration: After each dimension pass, modified files + same-module + static
             consumers are re-scanned. A finding that fails to fix 3 times is
             retired to the unresolvable set and never re-queued. Non-critical
             rounds cap at 3 iterations; critical findings iterate until
             resolved or retired.

   Git impact: The pipeline edits files. It does NOT commit, push, or amend.
             If you have uncommitted work you want to preserve, commit or stash
             first.

   Proceed with full autonomous sweep? [Y/n]
   ```

0c. Parse the reply (first match wins, evaluate rules in order):
   1. **Hard negation** (`no`, `n`, `abort`, `cancel`, `取消`, `不要`): abort with "Aborted before scan — no files modified."
   2. **Consent** (`Y`, `yes`, `ok`, `sure`, `proceed`, `go`, `continue`, `好`, `好的`, `行`, `可以`): proceed to Step 1.
   3. **Soft pause** (`wait`, `hold on`, `等一下`, `等我`, `let me`): acknowledge in one line ("Understood, waiting"), then wait for the user's next message and re-evaluate from rule 1.
   4. **Question**: answer it, then re-show the notice once and wait for the next reply. If the next reply is not Consent (rule 2) — whether a second question, another pause, or anything else — abort with "Aborted — did not receive consent after clarification."

0d. After consent, do not ask further questions until Step 8.

---

### Step 1 — Scope enumeration and state init

1a. Apply Auto Scope Detection from `../_shared/common.md` if the user did not
   specify files or a directory. Otherwise honor the user's explicit scope.

1b. Read `.brooks-lint.yaml` from the project root if present. Apply `disable`,
   `severity`, `ignore`, `focus`, and `custom_risks` per common.md. Record the
   applied config values and reuse them across all iteration rounds — do not
   re-read the file in Step 6 even if files were modified.

1c. Initialize pipeline state (persists across all rounds):

   - **`unresolvable`** (set): findings retired after 3 failed attempts — keyed by `(file, line_range, risk_code)`; `signature` breaks ties. Never re-queued.
   - **`non_critical_rounds`** (int, 0): incremented each round producing Warning/Suggestion; reset on clean round.
   - **`fix_log`** (list): each fix with file, line range, risk code, description, and outcome (`applied` / `reverted` / `retired`).

1d. Record the final scope file list in the Fix Report output buffer for Step 8.

---

### Step 2 — brooks-review pass (R1–R6 code decay)

Scan every file in scope against all R-series risks defined in
`../_shared/decay-risks.md`.

2a. For each R-risk, apply its symptom checklist. Record each hit as a finding
   with: risk code, file + approximate line range, Symptom, Source,
   Consequence, Remedy, Severity (Critical / Warning / Suggestion), and
   **Fix-Class** (see Step 2b).

2b. Assign Fix-Class per finding:

   | Class | Criteria |
   |-------|----------|
   | **Safe** | Single-file AND fully local: rename a non-exported symbol, extract a constant, remove dead code, add a null guard at a leaf, add a test scaffold for an untested pure function. Any change that modifies or removes an exported symbol is NOT Safe even if in one file. |
   | **Extended-Safe** | Multi-file but (a) a project test command exists and passes pre-fix, AND (b) the change does not rename, remove, or alter the signature of any publicly exported symbol, AND (c) touches ≤ 5 files in this pass. |
   | **Residual** | Public API break, cross-service boundary change, no test coverage to fall back on, or remedy ambiguous. NOT applied — carried to the Step 8 residual report. |

2c. Skip any finding that matches an entry in the `unresolvable` set.

2d. Apply every Safe and Extended-Safe fix in this dimension, lowest risk
   within each severity tier first. For each fix: Edit or Write, then append
   one row to `fix_log` with outcome `applied`. If two fixes touch overlapping
   line ranges in the same file, apply higher-severity first, re-read the file,
   then apply the next.

2e. After all fixes in this dimension, run the project test/lint command if one
   exists (`package.json` scripts, `pytest`, `cargo test`, `go test ./...`, etc.).
   If tests fail: revert fixes from this dimension in reverse order one at a
   time, re-running the test command after each revert, until tests pass.
   Mark each reverted fix with outcome `reverted` in `fix_log` and promote the
   finding to **Residual**. If no test command is found, note this once in the
   report and continue.

2f. Record dimension summary: N scanned, M Safe applied, K Extended-Safe applied,
   R reverted, P Residual.

---

### Step 3 — brooks-test pass (T1–T6 test decay)

Scan test files (and untested production code) against T-series risks defined
in `../_shared/test-decay-risks.md`.

Follow the same sub-steps as Step 2 (classify → apply → verify → summarize),
using T-prefix risk codes. For production files with no test coverage at all,
record as T5 (Coverage Illusion). A test scaffold that adds a pure-function test is
**Safe**; adding tests that require new test infrastructure is **Residual**.

---

### Step 4 — brooks-debt pass (tech debt accumulation)

Re-classify R-findings through a debt lens — same symptoms at accumulation scale:
repeated duplication, layered workarounds, stale `TODO`/`FIXME` clusters, dead
flags. Score each with **Pain (1–3) × Spread (1–3)**; total 7–9 = Critical,
4–6 = Warning, 1–3 = Suggestion. Apply a severity bump for pattern-level
occurrences (isolated Suggestion → 4+ modules Warning).

Follow the same sub-steps as Step 2. Debt findings often span multiple files
and are more likely to land in Extended-Safe or Residual than Safe.

---

### Step 5 — brooks-audit pass (architecture integrity)

Scan the full scope for architecture-level issues. The dependency-direction
symptoms (inverted dependencies, circular imports, cross-domain coupling) are
defined in `../_shared/decay-risks.md` Risk 5 — use that checklist. Step 5
additionally covers architecture-only concerns that R5 does not: missing
abstraction layers, god modules, leaked infrastructure inside domain code,
and seam-boundary violations.

Most architecture findings are **Residual** by definition — they require human
judgment on module boundaries. A few are Extended-Safe (e.g. extract a shared
constant used in 3+ modules into a new module that nothing else imports yet).
Do not auto-refactor module layouts, rename packages, or change public exports.

Follow the same sub-steps as Step 2.

---

### Step 6 — Iteration loop

**Goal:** Re-scan what the fixes touched and converge. Stop on clean round,
cap, or no progress.

6a. Build the re-scan scope:
   - every file modified in Steps 2–5 of the current round, PLUS
   - every file in the same module as a modified file, PLUS
   - every file that statically imports from a modified file.

   Do not re-scan files whose dependencies were not touched. On monorepos
   where a "module" may span hundreds of files, narrow the same-module bucket
   to files that import from or are imported by a modified file (direct
   dependency graph only).

6b. Re-run Steps 2–5 on the re-scan scope. For each new finding in this round:
   - If it matches an entry in `unresolvable` → skip.
   - Else if 🔴 Critical → queue and fix; Critical findings iterate until
     resolved OR retired (3 failed attempts → `unresolvable`).
   - Else 🟡 Warning / 🟢 Suggestion → queue and fix, subject to cap below.

6c. Classify the round after all fixes attempted:
   - **Clean round** (no new findings outside `unresolvable`): pipeline
     converged → proceed to Step 7.
   - **Critical-only round**: do NOT increment `non_critical_rounds`; return
     to 6a.
   - **Mixed or non-critical round** (any Warning / Suggestion produced):
     increment `non_critical_rounds` by 1. If it reaches the cap (default 3,
     or `sweep.max_iterations` from `.brooks-lint.yaml`), proceed to Step 7
     with remaining non-critical findings recorded as
     `"Unresolved — iteration cap reached"`. Otherwise return to 6a.

6d. Fix-retry rule: if a single finding fails verification (Step 2e) 3 times
   across any combination of rounds, retire it to `unresolvable` with reason
   `"3-retry budget exhausted"` and stop attempting it.

---

### Step 7 — Residual aggregation

Collect everything that was NOT fixed in place, de-duplicated:

- All Residual-class findings from Steps 2–5 (first round + re-scan rounds)
- All `unresolvable` entries with their retirement reason
- All iteration-cap residuals from Step 6c

Sort Critical → Warning → Suggestion. Within each severity, list file path,
risk code, Symptom (one line), Remedy (one line), and the reason it was not
applied (`public API break` / `no test coverage` / `3-retry budget` /
`iteration cap`).

---

### Step 8 — Sweep report

Output the final report. Use the standard Report Template from
`../_shared/common.md` with these additions:

```
# Brooks-Lint — Full Sweep Report
Mode: Full Sweep | Scope: <files or directory>
Config: .brooks-lint.yaml applied (N risks disabled, M paths ignored)   # omit if no config

## Dimension Summary
| Dimension | Scanned | Safe Applied | Extended Applied | Reverted | Residual |
|-----------|---------|--------------|------------------|----------|----------|
| Review (R1–R6) | ... | ... | ... | ... | ... |
| Test (T1–T6)   | ... | ... | ... | ... | ... |
| Debt           | ... | ... | ... | ... | ... |
| Audit          | ... | ... | ... | ... | ... |

## Iteration History
Round 1: <classification — clean / critical-only / mixed>, <N> new findings
Round 2: ...
Stopped at: clean round | iteration cap | no outstanding criticals

## Fix Log
| # | File | Lines | Risk | Outcome  | Change |
|---|------|-------|------|----------|--------|
| 1 | ...  | ...   | R2   | applied  | Extract repeated constant |
| 2 | ...  | ...   | T4   | reverted | Test regression; promoted to Residual |
...

## Health Score Delta
Before: <estimated score>/100  →  After: <estimated score>/100
(Re-run /brooks-health for an exact recalculation.)

## Residual Items  (<K> not applied)
<Iron Law entries, sorted Critical → Suggestion, with "Not applied because: ..." line>

## Summary
- Total findings detected: <N>
- Fixed this sweep: <M>
- Residual (needs human review): <K>
- Unresolvable (3-retry exhausted): <U>
```

If there are zero residual items and zero unresolvable entries, end with:
**"Sweep complete — codebase is clean."**

**Mode line in report:** `Full Sweep`
