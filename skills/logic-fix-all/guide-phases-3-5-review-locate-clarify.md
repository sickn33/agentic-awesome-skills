# Logic-Lens — Logic Fix All — Phases 3-5 (Review · Locate · Clarify)

---

## Phase 3 — Deep Review (logic-review)

3a. Apply `../logic-review/logic-review-guide.md` to each file in Phase 1 priority order, using `../_shared/common.md` §9 and §13 scope budgets. For files over the review budget, trace the highest-risk entry points first and record untraced functions in the finding state; do not perform shallow pattern scans to claim full coverage.

3b. Adapt method to file role:
- **Source code:** standard Premises→Trace→Divergence.
- **Runtime config:** premises = claimed shape and value constraints; trace how code reads each key; divergence = missing/wrong-typed key or constraint violation.
- **Constraint files** (CLAUDE.md, .logic-lens.yaml, AGENTS.md): premises = stated invariants; trace the code paths they govern; divergence = code violating the invariant.
- **Behavioral docs:** premises = documented behavior; trace the implementation; divergence = contradiction.

3c. Tag each finding with: file path + line range, file role, risk code (L1–L9 or Cx), severity, full Premises→Trace→Divergence triple, and one origin tag:
- `"confirmed by trace"` (default)
- `"unconfirmed — manual check recommended"` (excluded from fix queue per Iron Law)
- `"confirmed by test/error"` (written by Phase 4b)
- `"discovered during verification"` (written by Phase 7c; queued for next iteration)

3d. Deduplicate: if the same root cause appears in multiple files, record one finding for the root and list all call sites.

3e. Pass budget: for more than 20 files, complete Phase 3 in ranked batches of 20 files. After each batch, immediately advance confirmed Critical findings to Phase 6 before continuing lower-tier files. Warning/Suggestion findings can wait until the current batch finishes.

---

## Phase 4 — Fault Location (logic-locate, conditional)

Run only if: user provided a stack trace or error message, repo has failing tests, or user described a specific wrong behavior.

4a. Apply `../logic-locate/logic-locate-guide.md` to each concrete failure.

4b. For each locate finding: if already in Phase 3 results → mark "confirmed by test/error"; if not → add with "confirmed by test/error" tag.

---

## Phase 5 — Path Clarification (logic-explain, conditional)

Invoke logic-explain only when a Phase 3/4 finding matches any of:
- Call depth > 3
- Cross-module (trace crosses a module/package boundary)
- Premises marked "partial — path unclear"
- Async/concurrent/callback flow hard to linearize

5a. Apply `../logic-explain/logic-explain-guide.md` to each flagged finding.

5b. Update the finding's Premises→Trace→Divergence from the explain output. If the explain pass shows the original divergence was a misunderstanding, remove the finding from the queue and record it in Phase 9 under "Resolved by clarification".
