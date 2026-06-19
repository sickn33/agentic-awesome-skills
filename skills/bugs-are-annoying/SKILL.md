---
name: bugs-are-annoying
description: Adversarial code auditor that hunts down bugs, logic errors, and security flaws. Use for deep correctness passes, not style reviews.
risk: critical
source: community
date_added: "2026-06-19"
---

# Bugs Are Annoying

An adversarial QA pass for any codebase, in any language. AI IDEs are optimized to produce code that *looks* finished — they are not optimized to produce code that is *correct*. This skill exists to close that gap by actively trying to break the code instead of confirming it works.

## Core Mindset

Treat all code as guilty until proven innocent. The default question when reading a builder agent's output is not "does this look right?" — it's "how would this break, and what did the author not think of?"

This is an adversarial pass, not a confirmatory one. Do not skim and approve. Do not skip a category because it "seems fine." Every category in the taxonomy below must be actively checked against the actual code, not assumed clean.

## When To Use

Trigger on: "find bugs," "audit this code/codebase," "run bug hunter," "check for errors," "find flaws," "review this for bugs," "is this code solid," or any request for a deep correctness pass rather than a style/readability review.

## Process — Run These Phases In Order

Do not skip phases or collapse them into a single skim. Each phase catches things the others miss.

0. **Determine scope** — If the user named a specific file or folder, scope to that. Otherwise, ask before starting: confirm whether to audit the whole codebase, just files changed vs. the main branch (`git diff`), or a specific area. Never silently guess the scope on a codebase of unknown size — an unscoped "exhaustive" pass on a large repo can blow context mid-audit. Within scope, always exclude generated and dependency directories (`node_modules`, `vendor`, `dist`, `build`, `.git`, lockfiles) and minified/bundled files — this isn't the user's authored code and auditing it wastes the pass.
1. **Map the codebase** — Identify entry points, the overall data flow, and what calls what before hunting for anything. You can't find a cross-file bug without first knowing the file relationships.
2. **Static line-by-line pass** — Read every relevant/changed file fully, not a skim. Check each line against the taxonomy below.
3. **Trace critical data paths** — Follow data from input to output across file/function boundaries. Most real bugs live at the seams between functions and files, not inside a single function.
4. **Adversarial simulation** — Mentally execute the code against hostile/edge inputs: null, undefined, empty string, empty array, zero, negative numbers, max-length input, duplicate calls, concurrent calls, malformed input, missing fields.
5. **Cross-reference pass** — When a bug is found, actively check if the same mistake was repeated elsewhere. AI IDEs frequently copy-paste the same flawed pattern into multiple files.
6. **Severity triage** — Classify every finding using the definitions below. Do not invent new severity labels.
7. **Write/update `bugs.md`** — Use the exact format below. This is the only output of a hunt — do not also narrate a long summary in chat; point the user to the file.

## Bug Taxonomy

Language-agnostic. Check every category — these are patterns, not syntax, so they apply regardless of stack.

- **Logic errors** — off-by-one errors, inverted conditionals, wrong operator precedence, incorrect boolean logic
- **Null/type safety** — unhandled null/undefined, unsafe casts, missing optional-chaining, wrong assumed type
- **Edge cases** — empty input, zero, negative numbers, single-item vs multi-item collections, first/last iteration of a loop
- **Error handling** — swallowed exceptions, missing try/catch around fallible calls, errors caught but not logged or surfaced, wrong error propagated up the stack
- **Concurrency/async** — race conditions, unawaited promises, stale closures, state updated after a component/process has already torn down
- **Security** — injection points, hardcoded secrets/keys, auth or permission bypass, unsafe deserialization
- **Resource leaks** — unclosed file handles/streams/connections, listeners or subscriptions never removed
- **Cross-file consistency** — a function/type/field changed in one file but call sites elsewhere not updated (the single most common AI-IDE failure mode, since builder agents tend to edit one file at a time)
- **API/contract mismatches** — caller and callee disagree on a field name, type, or required parameter
- **State management** — mutation of state that should be immutable, derived state that goes stale, double-updates
- **Dead/unreachable code** — leftovers from an earlier AI attempt that never got cleaned up, code paths that can never execute
- **Performance** — N+1 queries, avoidable O(n²) where O(n) was available, unnecessary re-computation or re-renders
- **Dependency issues** — deprecated or vulnerable package versions, conflicting version requirements, use of a deprecated API that still works today but is slated for removal
- **Documentation/comment mismatches** — a comment or docstring that no longer matches what the code actually does, usually left behind after a later edit

Stylistic or formatting preferences are explicitly **not** bugs. Do not log them.

## Severity Definitions

- 🔴 **Critical** — causes incorrect output, a crash, data loss, or a security hole, under realistic conditions (not a contrived edge case nobody will hit).
- 🟡 **Intermediate** — wrong behavior under specific but plausible conditions (an edge case, a race condition, a rarely-hit error path), or a problem that will become Critical as the codebase grows.
- 🟢 **Normal** — minor correctness issues, missing defensive checks, small leaks, or issues with low real-world impact.

**Dormant bugs:** if a bug sits on a code path that isn't currently reachable or used (e.g. a variable that's computed but never read), it still gets the severity it *would* have if active — do not downgrade it for being unreachable. Add a one-line note to the entry that it isn't currently triggered, e.g. "Not yet triggered — `finalPricePerItem` is computed but unused."

## Output Format: `bugs.md`

Write this file at the root of the project being audited (or the relevant scope if auditing a subfolder). Use this exact structure:

```markdown
# Bug Report — [project/scope name] — [date]

## Summary
- Critical: N open, N fixed
- Intermediate: N open, N fixed
- Normal: N open, N fixed

## 🔴 Critical

### BUG-001: [Short title]
- **File:** path/to/file.ext:line
- **Issue:** what is actually wrong
- **Trigger:** the exact input/sequence that causes it
- **Impact:** what breaks because of it
- **Suggested Fix:** described or sketched, not applied
- **Confidence:** *(omit if fully confirmed in-scope; include "Needs Verification" if it depends on code outside the audited scope)*
- **Status:** Open

## 🟡 Intermediate
...

## 🟢 Normal
...

## ✅ Resolved
### BUG-0XX: [Title] — Fixed [date]
(kept for history, moved here once fixed)
```

Rules for entries:
- Every bug needs an exact `file:line` reference — never "somewhere in this file."
- IDs are sequential and never reused (`BUG-001`, `BUG-002`, ...), even across multiple runs.
- If the intent of the code is genuinely ambiguous, say so explicitly in the entry rather than guessing what "should" happen.

## Re-Run Behavior (History Is Kept)

When `bugs-are-annoying` is run again on a codebase that already has a `bugs.md`:

1. Read the existing file first.
2. Re-verify every `Open` bug against the current code — if it's actually fixed now, move it to **✅ Resolved** with the date.
3. Re-run the full process (all 7 phases) — don't just diff against old findings, since new bugs can appear anywhere.
4. Append new findings as new IDs continuing the existing sequence — never restart numbering.
5. Update the Summary counts at the top.

The file is a running history of the codebase's health, not a disposable report.

## Hard Rules

- **Never auto-fix.** This skill only ever writes to `bugs.md`. Code is only changed if the user explicitly asks afterward (e.g. "fix BUG-003," "fix all Critical bugs"). Until then, every fix described in `bugs.md` is a suggestion only.
- **Be exhaustive, not fast.** Don't stop early because the file "looks fine so far" — every category in the taxonomy must be actively checked, and a long codebase is not a reason to sample instead of reading it fully.
- **No stylistic nitpicks.** Only functional, security, or correctness issues belong in `bugs.md`.
- **Verify before logging.** Before adding a finding, check whether it's already handled elsewhere — a validator, a wrapper, the type system, a guard clause in a caller. Trace one level out if unsure. If the issue depends on code genuinely outside the audited scope and can't be fully confirmed, log it anyway but mark it `Confidence: Needs Verification` rather than asserting it as certain.
- **Record clean audits too.** If a pass finds zero new bugs, still write/update `bugs.md` with the Summary counts and the date — a clean result is part of the history, not a no-op.
- **Always check for repetition.** One instance of a bug is a finding; the same bug copy-pasted into three files is three findings, each logged separately with its own file:line.

## Fix Mode (Explicit Trigger Only)

Only enters this mode when the user explicitly asks to fix something — e.g. "fix BUG-001," "fix all Critical bugs," "apply the suggested fixes for the Intermediate ones."

1. Open `bugs.md` and locate the specified bug ID(s) or severity tier.
2. Apply the fix described in **Suggested Fix** for each one (or a better fix if the suggested one turns out to be wrong on closer inspection — note this in the entry).
3. Move each fixed entry to **✅ Resolved** with the date, keeping the original description intact for history.
4. Do not touch any bug not explicitly named or covered by the requested severity tier.

## Limitations

- This skill cannot execute the code; it relies purely on static analysis and mental tracing.
- It cannot find logic bugs in areas where the intended business requirements are completely undocumented or ambiguous.