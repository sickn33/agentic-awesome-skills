# Session protocol — one epic per fresh session

Contents: 1 Why fresh sessions · 2 What must live in the repo · 3 Session lifecycle · 4 Gates (what "done" requires) · 5 Handoff summary format · 6 PROGRESS.md and DECISIONS.md · 7 Amending the blueprint from a session · 8 Recovery · 9 Claude Code vs Codex notes · 10 `[VERIFY-AT-BUILD]` re-check rule

This section is copied (adapted to the product) into section 18 of the blueprint. Its files are in `assets/`.

## 1. Why fresh sessions

Long agent sessions accumulate drift: forgotten constraints, half-remembered decisions, context compression. Starting each epic in a clean session forces every needed fact to live in the repo, where it is versioned, greppable and reviewable. The cost is that nothing can be assumed to be remembered — so the protocol makes the repo the memory: the blueprint says *what*, PROGRESS.md says *where we are*, DECISIONS.md says *why*, and `check` says *whether it works*.

## 2. What must live in the repo (created in Epic 00)

```
docs/BLUEPRINT.md      the full blueprint (this document)
docs/PROGRESS.md       state: epic/story status, AC evidence, deviations, next preconditions
docs/DECISIONS.md      decision records DR-nn (from the blueprint + those made during sessions)
AGENTS.md              Codex entry point: points at the three docs and the protocol
CLAUDE.md              Claude Code entry point: same content
.env.example           every variable with a one-line meaning
<check command>        one command that runs format + lint + typecheck + tests (documented in BLUEPRINT §13.4)
```

`AGENTS.md` and `CLAUDE.md` are identical in content and short (≤ 60 lines): where the docs are, the protocol in ten lines, the `check` command, the commit format, and the rule "if it's not in BLUEPRINT or PROGRESS, ask or record — don't assume".

## 3. Session lifecycle

**Boot (user)** — open a fresh session in the repo, paste the session prompt for the epic (Appendix A of the blueprint; generated from `assets/session-prompt.md`).

**Orient (agent)**
1. Read `AGENTS.md`/`CLAUDE.md`, then `docs/PROGRESS.md` entirely, then `docs/BLUEPRINT.md` sections 12–16, 18, 21 and the target epic in section 17 (and any flow/screen/copy sections the epic references).
2. Verify preconditions: previous epics DONE in PROGRESS.md; `git status` clean on the main branch; `check` green on a clean tree; env vars listed in the epic's preconditions present locally; every `[VERIFY-AT-BUILD]` item the epic depends on re-checked (see §10) and the result recorded in PROGRESS.md.
3. If a precondition fails: stop, report exactly what fails and the fix, do not start building. The user decides.

**Plan (agent)**
4. Restate the epic goal and the story list in ≤ 15 lines. List the ACs that are unclear or reference missing IDs (there should be none; if there are, they are blueprint defects → §7).
5. Produce the session plan: story order, the tests to write per story (from the story's Tests block), the tasks, and the manual checks the user will need to do at the end. Estimate whether it fits the session; if not, propose which stories to defer to a follow-up epic `E03b` and record it in PROGRESS.md as a deviation.
6. Wait for "go" unless the user pre-approved ("plan and build without stopping").

**Build (agent)** — for each story in order:
7. Create a branch `epic/E03` (once per epic) if not on trunk-only.
8. Write the tests for the story's ACs first; run `check`; the new tests must fail.
9. Implement the tasks; run `check` after each task or story; keep it green. Copy strings come from the copy table by ID — no improvised strings.
10. Commit per story: `feat(auth): request OTP by phone [E02-S01]` (type/scope per BLUEPRINT §13.7). Record the story as DONE in PROGRESS.md with one evidence line per AC (test name, or manual-check result).
11. Any decision not covered by the blueprint (a library detail, a schema nuance) → add `DR-nn` to DECISIONS.md in the same commit. Any AC that turns out wrong or impossible → §7, never a silent change.

**Verify (agent)**
12. Run the full `check`; run the epic-level tests (flow e2e) and the whole regression suite; run CI (push and wait, or run the CI script locally).
12b. **Self-review.** Walk the review checklist (BLUEPRINT §14.4) over the epic's diff, story by story, and answer every item. Do this as if reviewing someone else's work: read the diff, not your memory of writing it. Fix what fails rather than noting it. Report the result in the handoff summary as `reviewed: <n> items, <n> fixed, <n> accepted with reason` — never as a bare ✔. This pass exists because the human reviewer sees a large diff produced quickly, and their attention is the scarcest resource in the whole process; anything you can catch here is worth ten times what it costs.
12c. If the diff for any story exceeded the size limit in §14.4, say so explicitly in the handoff. It is a signal that the story was mis-sized in the blueprint, and it is worth an amendment for the next epic.
13. Deploy to staging per BLUEPRINT §13.8 if the epic's DoD requires it; run the smoke checks; record results.
14. Walk the epic's Definition of Done line by line; each line gets a ✔ with evidence or the epic is not done.

**Handoff (agent)**
15. Update PROGRESS.md: epic status, per-story status, AC evidence, deviations, accepted risks, `[VERIFY-AT-BUILD]` results, next epic's preconditions and any prep the user must do (credentials, accounts).
16. Update DECISIONS.md and the blueprint Amendments log if anything changed.
17. Final commit; merge to main if the branch policy says so; confirm CI green.
18. Print the handoff summary (§5) and say explicitly: "Safe to terminate this session. Next: open a fresh session and paste the E04 prompt."

**Terminate (user)** — close the session. Open a new one for the next epic. Repeat.

## 4. Gates

An epic is DONE only when all of these are true; the agent never marks DONE otherwise:

- Every story DONE with an evidence line per AC (an automated test name that passes in `check`, or a recorded manual check with observation and date).
- `check` green on the final commit; CI green.
- Epic-level flow tests green; all previous epics' tests green (no regressions).
- Staging smoke checks passed when required by the DoD.
- The review checklist (§14.4) applied to every story, with the result recorded — not "reviewed", but which items failed and what was done.
- No gate rule weakened, disabled or bypassed to reach green; if one was, a DR entry states why and a follow-up story restores it.
- No `TODO`/`FIXME`/skipped tests introduced without a matching PROGRESS.md "accepted risk" line with reason and owner.
- No new flaky test; any flake observed is quarantined with a follow-up story, never re-run until green.
- PROGRESS.md, DECISIONS.md and (if needed) the Amendments log are updated and committed.

If a gate cannot be met in the session, the epic stays IN PROGRESS with an exact list of what remains; the next session resumes it (§8). Partial is fine; pretending is not.

## 5. Handoff summary format (≤ 20 lines)

```
## Handoff — E03 <Title> — <date>
Status: DONE | IN PROGRESS (remaining: E03-S04 AC-3, AC-5; staging smoke)
Stories: E03-S01 DONE · E03-S02 DONE · E03-S03 DONE · E03-S04 IN PROGRESS
check: green (commit abc123) · CI: green · staging: deployed, smoke 3/3
Self-review (§14.4): 4 items failed and fixed (missing object-level auth check on API-07; N+1 in
  order list; two tests asserted only length; SCR-04 empty state used an improvised string).
  1 accepted: duplication detector flags the two DTO mappers — kept, extraction is E05's job.
Diff size: E03-S02 was 620 lines, over the 400 limit — story was mis-sized, amendment A-03 splits it.
Deviations: E03-S02 AC-4 rate limit changed 5→10 per 10 min — see Amendment A-02, DR-07
Accepted risks: none | E03-S03 EC-MSG-01 manual only until provider sandbox supports delivery status
VERIFY-AT-BUILD: INT-sms reachable ✔ (2026-09-05); gateway sandbox ✔
Decisions added: DR-07, DR-08
Next epic E04 preconditions: create staging bucket; add STORAGE_KEY to .env; nothing else
Manual checks for you: open staging SCR-03, request a code on your phone, confirm delivery < 30 s
Safe to terminate. Next: fresh session, paste E04 prompt.
```

## 6. PROGRESS.md and DECISIONS.md

Formats are in `assets/PROGRESS.md.template` and `assets/DECISIONS.md.template`. Principles:

- PROGRESS.md is a **state file, not a diary**: current status per epic and story, evidence, deviations, risks, preconditions. Session logs are one line per session at the bottom (date, epic, outcome, commit).
- Evidence lines are specific: `AC-3 ✔ api/auth_otp_request.test::provider_timeout_returns_503` or `AC-6 ✔ manual 2026-09-05 — Persian digits render on Chrome Android 128`.
- DECISIONS.md holds `DR-nn` entries: context, options, decision, consequences, date, epic. Blueprint DRs are copied in at Epic 00 so there is one place to look.

## 7. Amending the blueprint from a session

The blueprint is the source of truth, so when reality disagrees with it, the blueprint changes — explicitly:

1. Do not silently implement something different from an AC.
2. Add an entry to the **Amendments log** (section 18 of the blueprint, table `A-nn | date | epic/story | what changed | why | approved by`).
3. Edit the affected AC/copy/architecture text in place and mark it `(amended A-nn)`.
4. If the change affects other epics, add a line to their preconditions.
5. Scope additions are not amendments — they are new stories in a later epic; record the idea in PROGRESS.md "Parking lot" and move on.

Ask the user before amending anything that changes user-visible behaviour, money, data retention or security; smaller technical amendments can be made and reported in the handoff.

## 8. Recovery

- **Session crashed or was terminated mid-epic**: the next session reads PROGRESS.md, runs `git status` and `git log`, inspects the epic branch, runs `check`, and resumes from the first story/AC without evidence. Uncommitted work is inspected and either committed with a WIP note or discarded, stated in PROGRESS.md.
- **`check` red at boot**: the previous session violated a gate. Fix the red first as a hotfix story `E03-S00 — restore green` with its own evidence, then continue.
- **Blueprint defect found** (missing ID, contradictory ACs): treat as §7; if blocking, stop and ask.
- **Environment broken** (missing service, credentials expired): record in PROGRESS.md, report, stop.

## 9. Claude Code vs Codex notes

- Both read a root instructions file: Claude Code reads `CLAUDE.md`; Codex reads `AGENTS.md`. Keep both, identical in content, pointing at the docs.
- Skills: Claude Code discovers `SKILL.md` folders under `.claude/skills/` (project) and `~/.claude/skills/` (personal); Codex discovers the same open skill format from its skills locations (`~/.codex/skills/`, `.codex/skills/`, and `.agents/skills/` in recent versions — confirm against the current Codex docs when installing). The session protocol does not depend on skills at build time; it depends only on the repo files.
- Invocation: paste the session prompt as the first message in either tool. If the harness exposes an effort/thinking level, set it to the maximum for planning and verification steps.
- Verification commands must be runnable by the agent without interaction (no prompts, no watch mode). Provide a `check` that exits non-zero on failure.

## 10. `[VERIFY-AT-BUILD]` re-check rule

Every item tagged `[VERIFY-AT-BUILD]` in the blueprint (service availability, sandbox status, prices, sanctions/blocking status, app-store policy, library latest patch) is listed in section 18 with the epic that first depends on it. At Orient time the agent re-checks the items its epic needs (a search or a request against the sandbox), records `✔ date` or `✘ date + what changed` in PROGRESS.md, and if ✘ stops and reports before building on it.
