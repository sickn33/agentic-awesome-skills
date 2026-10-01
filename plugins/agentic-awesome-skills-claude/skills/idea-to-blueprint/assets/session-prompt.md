# Session prompt template (one per epic — Appendix A of the blueprint)

Fill the placeholders per epic and paste as the FIRST message of a fresh Claude Code / Codex session opened in the repo root.

---

You are starting **Epic {{EPIC_ID}} — {{EPIC_TITLE}}** of {{PRODUCT_NAME}}. This is a fresh session: you remember nothing from previous sessions. The repo is the memory.

Read, in order: `AGENTS.md` (or `CLAUDE.md`), `docs/PROGRESS.md` (all of it), then `docs/BLUEPRINT.md` sections 12, 13, 14, 15, 16, 18, 21 and **Epic {{EPIC_ID}}** in section 17, plus every flow (F-*), screen (SCR-*), copy (CP-*), entity (ENT-*), API (API-*), integration (INT-*) and edge case (EC-*) ID that epic references, and `docs/REVIEW-CHECKLIST.md`.

Then follow the session protocol in BLUEPRINT §18 exactly:

1. **Orient** — confirm preconditions: previous epics DONE in PROGRESS.md; clean `git status` on main; `{{CHECK_COMMAND}}` green; required env vars present; every `[VERIFY-AT-BUILD]` item this epic depends on re-checked and recorded. If anything fails, stop and report — do not build.
2. **Plan** — restate the goal and stories in ≤ 15 lines; list the tests you will write per story and the tasks; flag any AC that is ambiguous or references a missing ID (treat as a blueprint defect, do not guess). {{APPROVAL_MODE: "Wait for my 'go' before building." | "Do not wait — plan, then build without stopping unless a precondition fails or an amendment needs my approval."}}
3. **Build** — story by story in order: tests first (they must fail), implement, keep `{{CHECK_COMMAND}}` green, copy only from CP-* IDs, one commit per story with `[E{{EPIC_ID}}-Snn]` in the message, PROGRESS.md evidence line per AC, DR-nn in DECISIONS.md for every decision the blueprint does not make.
4. **Verify** — full `check`, epic-level flow tests, regression of all previous epics, CI green, staging deploy + smoke if the DoD requires it. Then **self-review**: walk `docs/REVIEW-CHECKLIST.md` (BLUEPRINT §14.4) over the epic's diff, story by story, reading the diff rather than recalling what you wrote — check correctness against each AC, module boundaries, failure paths, test meaning (would a test fail if the logic were wrong?), authorization per object, behaviour at 100x data, observability, copy IDs, and diff size. Fix what fails; do not batch it. Walk the epic's Definition of Done line by line with evidence.
5. **Handoff** — update PROGRESS.md (status, evidence, deviations, accepted risks, VERIFY-AT-BUILD results, next epic preconditions, session log line), DECISIONS.md, and the Amendments log if anything changed; final commit; then print the ≤ 20-line handoff summary from BLUEPRINT §18 and tell me it is safe to terminate.

Rules that override everything: never mark DONE without evidence; never improvise user-facing text; never silently change an AC; never touch scope outside this epic; never weaken the quality gate to get to green; never use an API you have not verified exists in the pinned version; when in doubt, record and ask.

---

Notes for the human: set the model to the strongest available and the effort/thinking level to maximum if the tool exposes it. Terminate the session after the handoff summary, then open a new one for the next epic.
