---
name: surgical-fix
description: "Fix bugs, errors, and crashes using a strict 4-phase protocol (diagnose, declare, change, verify) to prevent silent regressions."
risk: safe
source: community
date_added: "2026-06-23"
---

# surgical-fix — Bug & Error Fix Protocol

## Core Philosophy

> Treat every fix like surgery: diagnose before cutting, touch only what is necessary, verify the patient is stable before closing.

The #1 AI coding failure mode is **fix-one-break-three** — the AI guesses at a fix, edits files it shouldn't touch, and introduces silent regressions. This skill eliminates that by enforcing four strict phases with no skipping.

---

## When to Use This Skill

- Use when the user asks to fix a bug, error, or crash
- Use when the user pastes a stack trace or error log
- Use when something is broken and needs diagnosis
- Use to prevent the AI from guessing at fixes and breaking other things

---

## The Four Phases

### PHASE 1 — Diagnose (Read Only, No Edits)

Before touching a single file, the AI must:

1. **Read the full error** — stack trace, logs, console output, all of it
2. **Read every file named in the error** — the file where the error surfaces AND all files in the call chain above it
3. **Trace the root cause** — not just where the error appears, but *why* it happens upstream
4. **Ask itself:** *"Is the error actually in this file, or is this file just the victim of a problem elsewhere?"*
5. **Map the blast radius** — identify all files that import or depend on the file(s) likely to be changed

> **Blast Radius Rule:** If the blast radius (files that import/depend on the target file) is more than 3 files, the AI must explicitly flag this to the user as **HIGH RISK** before proceeding.

> **No diagnosis shortcuts:** The AI must not propose a fix based on the error message alone. It must read the actual code. Error messages describe symptoms, not causes.

---

### PHASE 2 — Pre-Change Declaration (User Must Confirm)

After diagnosis, the AI outputs a structured fix plan and **waits for user confirmation before writing a single line of code.**

The plan must include all of the following:

```
SURGICAL FIX PLAN
─────────────────────────────────────────
ROOT CAUSE:
  [Exact explanation of why the error occurs, not just where]

FILES TO BE CHANGED:
  - path/to/file.ts  →  [what changes and why]

FILES THAT WILL NOT BE TOUCHED:
  - path/to/other.ts  →  [confirm it is frozen]

BLAST RADIUS:
  - [List files that import/depend on changed files]
  - Risk level: LOW / MEDIUM / HIGH

REGRESSION ANCHORS (things currently working that must stay working):
  1. [behavior/function that must not break]
  2. [behavior/function that must not break]

APPROACH:
  [Step-by-step description of the fix]

MINIMAL DIFF:
  [Confirm: is this the smallest possible change? If a rewrite is needed, say why]

SELF-CHECK:
  ✓ Does this fix the stated error? [yes + reason]
  ✓ Does this break any existing behavior? [no + reason, or flag if unsure]
  ✓ Am I changing only declared files? [yes]
  ✓ Is there a simpler fix? [yes/no — if yes, propose it instead]

CONFIDENCE: [0–100%]
  If below 80%, list alternative approaches before proceeding.
─────────────────────────────────────────
Awaiting your confirmation to proceed.
```

> **The AI must not proceed until the user explicitly confirms.** A reply like "looks good", "yes", "do it", or "confirmed" counts. Silence does not.

---

### PHASE 3 — Surgical Change (Declared Files Only)

Once the user confirms:

1. **Change only the files listed in the plan.** No exceptions.
2. **Every change must map 1:1 to the declared approach.** No bonus cleanup, no "while I'm here" improvements.
3. **Minimal Diff Principle:** Prefer the smallest possible change. If the fix is 1 line, do not rewrite the function. If a larger change is genuinely needed, it must have been declared in Phase 2.
4. **Frozen File Rule:** Any file not in the declared change list is frozen. The AI must not touch it — not even to fix a typo.
5. **Mid-edit stop rule:** If the AI encounters something unexpected while editing (a dependency it didn't know about, a pattern that changes the approach), it must **stop immediately**, report what it found, and return to Phase 2 with an updated plan.
6. **One bug per session:** If fixing the declared bug reveals a second bug, the AI must stop, report the new bug separately, and not fix both in the same pass. Each bug gets its own surgical session.

---

### PHASE 4 — Post-Change Verification

After all changes are made, the AI must verify before declaring success:

1. **Re-read all changed files** — confirm the changes are as declared
2. **Check the error condition** — trace through the code and confirm the original error can no longer occur
3. **Check regression anchors** — explicitly verify each item listed in Phase 2 still holds
4. **Check blast radius files** — spot-check imported/dependent files for anything that could now break
5. **Output a verification report:**

```
VERIFICATION REPORT
─────────────────────────────────────────
Original error resolved:     ✓ YES / ✗ NO / ⚠ UNCERTAIN
Regression anchors intact:   ✓ YES / ✗ NO / ⚠ UNCERTAIN
  1. [anchor 1]: ✓ / ✗
  2. [anchor 2]: ✓ / ✗
New issues introduced:       NONE / [describe if found]
Files changed (final list):  [list]
Files frozen (not touched):  [list]
─────────────────────────────────────────
Status: CLEAN ✓  /  NEEDS FOLLOW-UP ⚠
```

> If status is **NEEDS FOLLOW-UP**, the AI must describe the issue and propose next steps. It must not silently move on.

---

## Self-Ask Checklist (Required Before Every Edit)

The AI must answer all four questions before writing any change:

| # | Question | Required Answer |
|---|----------|-----------------|
| 1 | Does this change fix the stated error? | Yes + reason, or stop |
| 2 | Does this change break any existing behavior? | No + reason, or flag |
| 3 | Am I changing more than what was declared? | No, or stop and re-declare |
| 4 | Is there a simpler fix available? | If yes, propose it first |

---

## Hard Rules (Never Violated)

- **No edits before Phase 2 confirmation.** Ever.
- **No touching frozen files.** Even to fix something unrelated.
- **No cascading fixes.** One bug per surgical session.
- **No guessing.** If confidence is below 80%, present alternatives and ask.
- **No silent regressions.** If something breaks during the fix, report it immediately.
- **No "it should be fine".** Verify — don't assume.
- **No scope creep.** Refactors, cleanups, and style fixes are a separate session.

---

## Uncertain = Stop Rule

If at any point the AI is not confident (less than ~80% certainty) that:
- It has identified the true root cause, OR
- The proposed fix will actually resolve it, OR
- The fix won't break something else

Then the AI must **stop, say so explicitly**, present 2–3 alternative approaches with tradeoffs, and let the user choose the path forward. Guessing and checking in production code is not acceptable.

---

## Quick Reference

| Phase | Action | Edits Allowed? |
|-------|--------|----------------|
| 1 — Diagnose | Read files, trace root cause, map blast radius | ❌ No |
| 2 — Declare | Output fix plan, wait for user confirmation | ❌ No |
| 3 — Change | Edit only declared files, minimal diff | ✅ Yes (declared files only) |
| 4 — Verify | Re-read, check error gone, check regressions | ❌ No |

---

## Example Trigger Phrases

This skill activates on any of these (or similar):

- "fix this error / bug / crash"
- "this is broken / not working"
- "why is X failing?"
- "debug this"
- "help me resolve this issue"
- Any pasted stack trace, error log, or console output

---

## What This Skill Does NOT Cover

- Writing new features (use a feature development skill)
- Refactoring working code (use a refactor-scope-limit skill)
- Performance optimization (separate concern)
- Style or formatting changes (separate concern)

If the user asks to fix something AND add a feature in the same request, the AI must split them: fix first (this skill), feature second (separate session).

---

## Limitations

- Enforces a strict 4-phase protocol that cannot be skipped, even for trivial fixes.
- Cannot be used concurrently with feature development or refactoring.
- If the blast radius is large, the skill blocks progress until explicit user confirmation is received.
