# Logic-Lens — Logic Fix All — Phases 6-9 (Fix · Verify · Iterate · Report)

---

## Phase 6 — Fix Queue Assembly

6a. Merge all findings from Phases 3–5 (Phase 3 review + Phase 4 locate, as updated/filtered by Phase 5 clarification). Phase 2 health observations are not directly included — they must first receive a full Premises→Trace→Divergence triple from Phase 3 before entering the queue (Iron Law).

6b. Sort by severity. Secondary sort within each tier: (1) "confirmed by test/error" first; (2) systemic-pattern roots before symptoms; (3) root causes before call sites.

| Priority | Criteria |
|----------|----------|
| 1 | 🔴 Critical |
| 2 | 🟡 Warning |
| 3 | 🟢 Suggestion |

6c. For each finding, write the remedy: **Minimal** (change only what the trace shows is wrong), **Targeted** (no side-effect refactoring), **Justified** (one sentence explaining why this fix).

6d. Remedy target for cross-file contradictions:
- **Code vs constraint file** (CLAUDE.md/AGENTS.md/GEMINI.md/README): edit the CODE. Exception: if the constraint text is obviously stale (references a removed function/module) and code is internally coherent, edit the CONSTRAINT FILE and note spec drift in the Fix Log.
- **Code vs runtime config**: edit the CONFIG. Exception: if the config value is internally coherent for its key AND the code looks typo'd, edit the CODE. When both sides are plausible, record as "Unresolved — unclear whether spec or consumer is wrong".
- **Doc vs doc**: (1) more recent git mtime wins; (2) deeper path beats root-level; (3) still tied → "Unresolved — ambiguous spec" with both citations.
- **Config internally inconsistent**: edit at the less-referenced key.

---

## Phase 7 — Apply + Verify (logic-diff)

7a. Before the first fix, capture the baseline:

```bash
PRE_FIX_REF=$(git rev-parse HEAD)
```

If not a git repo, copy each file to `.logic-fix-all-backup/<path>` before its first edit.

Apply fixes one finding at a time. After each fix: record file path, line range changed, one-line description → Fix Log row. For overlapping line ranges in the same file, fix the higher-priority one first, then re-read the file before applying the second.

7b. When a remedy requires choosing between approaches, match the surrounding code's existing convention (read nearest callers and peer functions). When no convention is discoverable, default to the more defensive option (raise/reject/fail fast).

7c. Apply `../logic-diff/logic-diff-guide.md` between pre-fix and post-fix versions. For independent files, verify in parallel; for same-file or cross-dependent fixes, verify one at a time.

**Hard verification gate** before declaring a fix as "pass":
```bash
git diff -- <file>
git diff "$PRE_FIX_REF" -- <file>
```
The diff must: (a) match the planned remedy, (b) touch no lines outside the finding's scope, (c) leave the file syntactically valid. If any fail, jump to 7d.

Interpret logic-diff verdicts:

| Verdict | Condition | Meaning | Action |
|---------|-----------|---------|--------|
| Conditionally Equivalent | covers exactly the failing scenario | fix removes the bug | **pass** |
| Conditionally Equivalent | narrower or broader than failing scenario | partial/over-scoped fix | 7d |
| Conditionally Equivalent | orthogonal to failing scenario (original Divergence no longer triggers) | fix succeeded; new condition is a pre-existing separate bug | **pass** + record new finding tagged "discovered during verification" |
| Semantically Equivalent | — | fix changed nothing | 7d |
| Semantically Divergent | — | fix broke previously-correct paths | 7d |

Additionally verify that the specific Divergence field condition no longer triggers post-fix.

7d. On regression, revert and retry:
```bash
git checkout "$PRE_FIX_REF" -- <file>
# or: cp .logic-fix-all-backup/<path> <path>
```
Never use `git reset --hard` or `git clean -f`. After 3 failed attempts, record as "Unresolved — conflicting constraints" and continue.

7e. If logic-diff cannot confirm equivalence (function too complex or involves external state), note as "unverified — integration test recommended" and continue.

---

## Phase 8 — Iteration Loop

### 8a. Persistent state across rounds

- **`unresolvable_findings`** (set): findings Phase 7d retired with "Unresolved — conflicting constraints". Each entry is `(file_path, line_range, L_code, divergence_signature)`. Match primarily on `(file_path, line_range, L_code)` — `divergence_signature` is a tie-breaker only (LLM-generated Divergence text can drift in wording).
- **`non_critical_round_counter`** (int, starts 0): rounds since the last prompt that produced ≥1 Warning or Suggestion. Incremented in 8d, reset to 0 only on user "continue" in 8e.
- **`consecutive_continues`** (int, starts 0): number of times user answered "continue" at the escalation prompt. Never reset. Hard cap is 3.

### 8b. Re-scan scope

After Phase 7, re-run Phases 2–3 on: all files modified in Phase 7 + files in the same module + files that statically import from a modified file. Skip files whose dependencies were not touched.

**Static-graph boundary:** reflection-based calls, string-dispatch, shared global state, and similar dynamic wiring can carry regressions beyond this scan. If the repo has a test suite, Phase 9 summary should recommend running it.

### 8c. Classify each new finding

- Matches `unresolvable_findings` → skip.
- 🔴 Critical → add to Post-Fix Queue (loops until resolved, or until Phase 7d retires it to `unresolvable_findings` after 3 failed attempts).
- 🟡 Warning / 🟢 Suggestion → add to Post-Fix Queue.

Run Phases 6–7 on the Post-Fix Queue.

### 8d. Round accounting

- **Clean round** (no new findings outside `unresolvable_findings`) → proceed to Phase 9.
- **Critical-only round** → do NOT increment `non_critical_round_counter`; return to 8b.
- **Mixed or non-critical round** → increment `non_critical_round_counter`. If below cap, return to 8b. If at cap, go to 8e.

### 8e. User escalation

```
Logic-Fix-All iteration cap reached.

After {cap} non-critical rounds, N Warning and M Suggestion
findings remain. No outstanding Critical findings
(unresolvable Criticals, if any, are listed in the Fix Log).

Continue for another {cap} rounds?  [Y/n]
```

When `consecutive_continues` is 1 or 2, append:
```
(You have continued {consecutive_continues} time(s) so far — hard
cap is 3 continues per run. To run more rounds without repeated
prompts, raise `fix_all.max_iterations` in `.logic-lens.yaml`.)
```

Parse reply using the same consent/negation rules as Phase 0b.
- **Consent:** increment `consecutive_continues`. If now ≥ 3, hard stop — record remaining as "Unresolved — hard iteration ceiling reached (user continued 3×)" and go to Phase 9. Otherwise reset `non_critical_round_counter` to 0 and return to 8b.
- **Negation (or non-consent):** record remaining as "Unresolved — user stopped iteration at round N" and go to Phase 9.

---

## Phase 9 — Final Report

Use the Report Template from `report-template.md` with the Fix Report additions from `SKILL.md`. Include:

- **Scope summary:** file count by role; Phase 1f truncation notice if applied.
- **Skill invocation count:** health: N, review: N, locate: N, explain: N, diff: N.
- **Iteration history:** round count by severity class; each cap escalation and user response.
- **Findings by role:** separate sub-tables for source, config, constraint, doc.
- **Resolved by clarification:** findings Phase 5 downgraded as false positives.

Do not output per-finding Premises/Trace/Divergence blocks in the final report — the Fix Log table is the user-facing record. Provide full trace on request.

### Logic Score computation

- **Logic Score (before):** start at 100, deduct for every finding collected in Phases 3–5 (before fixes). Apply the per-L-code deduction cap from `common.md`.
- **Logic Score (after):** start at 100, deduct only for findings still marked Unresolved after Phase 8.

When before and after are numerically equal despite fixes (e.g., 3 L1 findings collapse to one −15 in both), the "Findings fixed" count is the authoritative improvement signal.
