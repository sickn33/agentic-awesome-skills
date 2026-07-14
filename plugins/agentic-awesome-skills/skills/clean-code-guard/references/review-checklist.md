# Review-Mode Checklist

When the user asks you to **review, audit, critique, or rate code** (rather than write it), follow this structured walk-through. Do not edit the code unless asked. Produce a findings report.

## Contents

- Output format
- Pre-flight: is this a refactor or a rewrite?
- Walk order
  - Section A: naming and functions
  - Section B: comments and formatting
  - Section C: SOLID
  - Section D: DRY, KISS, YAGNI
  - Section E: AI failure modes
- What to do with each finding
- When the review is contested
- What this review does not do

## Output format

Use this template exactly. The headings make findings easy to triage.

```
# Code review: <file or scope>

## Summary
<2–3 sentence verdict: ship / needs work / rewrite>
Counts: <N> critical, <M> important, <K> nits  (must equal the findings listed below)

## Critical findings
<must-fix before merge; omit this heading if none>
- `<file>:<line>` — <tag>: <what's wrong> [`<quoted code or behavior>`]. Fix: <concrete change>.
  <continuation line only when the fix is code-sized>

## Important findings
<should fix but not blocking; omit if none>
- ...

## Nits
<style, naming, minor structure; max 3, each with a fix; omit if none>
- ...

## What's good
<0–3 genuine, specific positives; omit on a clean review — do not manufacture praise>

## Coverage
One line per section: the findings it produced, or `clean` (walked it, found nothing). A blank section is an unbacked claim, not a pass — fill it before delivering.
- Section A (naming & functions): <findings, or `clean`>
- Section B (comments & formatting): <findings, or `clean`>
- Section C (SOLID): <findings, or `clean`>
- Section D (DRY/KISS/YAGNI): <findings, or `clean`>
- Section E (AI failure modes): <findings, or `clean`>
```

Severity:
- **Critical** — security, correctness, data loss, swallowed exceptions, hardcoded "success" returns.
- **Important** — design defects with maintenance cost: SOLID violations, premature abstractions, parameter explosion, generic naming.
- **Nit** — style, single-letter names outside loops, missing docstring contracts on public APIs.

Every finding carries its quoted code or observed behavior and a named fix — that is what lets the author contest it; with no quote or no fix it is not a finding, so drop it. Report only counted findings: never an estimated quality score, "X% cleaner," or a maintainability index — no baseline exists, so the number would be invented.

## Pre-flight: is this a refactor or a rewrite?

Before walking the sections, classify the review:

- **Refactor review:** the user wants the code to be cleaner, not different. **Observable behavior must not change** — same inputs, same outputs, same exceptions, same side effects. If you'd suggest a change that alters behavior, mark it as a *separate finding* labelled "Behavior change — confirm with author" and do not bundle it with refactor recommendations. Refactoring is *"a change made to the internal structure of software... without changing its observable behavior"* (Fowler, *Refactoring*).
- **Code-review for correctness:** the user wants you to find bugs. Behavior changes are in scope. Flag them at Critical severity if they affect the contract.

If you can't tell which one the user wants, ask before writing the review.

## Walk order

### Section A — naming and functions

Pull [naming-and-functions.md](naming-and-functions.md) if you need source citations.

1. Scan all identifiers. Flag generic ones: `data`, `result`, `item`, `temp`, `value`, `obj`, `info`, `helper`, `manager`, `utils`, `handle_*`, `process_*`, `do_*` without qualifier.
2. For each function: lines ≤20? params ≤4? one thing? one level of abstraction? Flag violations.
3. Flag boolean flag arguments.
4. Flag functions that both return value *and* mutate observable state ambiguously (CQS violation).
5. Flag getter-style or predicate-style functions that mutate.

### Section B — comments and formatting

Pull [comments-and-formatting.md](comments-and-formatting.md) if needed.

1. Flag every comment that paraphrases the code below it.
2. Flag commented-out code blocks.
3. Flag step-number, "First...", or "Then..." scaffolding comments.
4. Flag docstrings that restate the signature with no contract.
5. Flag style inconsistencies with the surrounding file (casing, quoting, import order).

### Section C — SOLID

Pull [solid.md](solid.md) if needed.

1. (SRP) Any class with methods serving two unrelated stakeholder groups?
2. (OCP) Conditional or switch dispatch on a type tag that grew with the codebase?
3. (LSP) Any subclass with an unimplemented/unsupported-operation failure, strengthened preconditions, or weakened postconditions?
4. (ISP) Any interface where the concrete client uses only a subset of methods?
5. (DIP) High-level module importing a concrete from a low-level module? Abstractions living in the same package as the concrete?

### Section D — DRY, KISS, YAGNI

Pull [dry-kiss-yagni.md](dry-kiss-yagni.md) if needed.

1. (DRY) ≥5-line duplicated blocks. Confirm it's knowledge duplication before recommending extraction.
2. (DRY-Metz) Wrong abstractions: per-caller branches and special-case flags accumulating in a shared function.
3. (KISS) Any function with cyclomatic >10 or nesting >5? (Estimate from branches and loops; you don't need exact metrics.)
4. (YAGNI) Optional parameters never called, config flags with one path, abstractions with one implementation, wrappers around libraries that "make them swappable."

### Section E — AI failure modes (highest leverage)

Pull [ai-failure-modes.md](ai-failure-modes.md) for every check here.

1. Any catch-all error handler that swallows without recovery? Critical.
2. Any defensive guards for types/values the system already excludes — *inside* a trust boundary? (Validation of external or untrusted input at the boundary is not a defensive guard; do not flag it.)
3. Any premature abstraction — interface or factory with one implementation?
4. Any comment pollution — line-by-line restating, step-number scaffolding, or documentation comments that paraphrase signatures?
5. Any duplication of logic that already exists in a helper in the same repo?
6. Any imports or library methods you should verify exist in the installed version?
7. Any generic naming (cross-check with Section A).
8. Any long function mixing concerns (cross-check with Section A).
9. Any 5+ parameter functions without a config object (cross-check with Section A).
10. Any inconsistency with surrounding file style (cross-check with Section B).
11. Any dead code, unused imports, unreachable branches, half-implementations?
12. **Any hardcoded "success" returns, mock fixtures, fake values in production code?** Critical.
13. Any code that looks copy-pasted from a similar function (off-by-one, wrong null semantic)?
14. Any speculative configurability — flags, env vars, optional params without callers?
15. **Any "simplification" that deleted boundary validation, or a cleanup path (`finally`/`close`/`defer`/context-manager) the contract relied on?** That's a behavior change, not cleanup. Critical.

## What to do with each finding

A finding must name its fix — a code change OR a specific structural action. "Nameable" is the bar, not "codeable." No named fix means it stays vague unease, not a finding — drop it.

- ❌ "This error handling could perhaps be more specific." (no named replacement — drop it)
- ✅ "`L42 except Exception` swallows the DB error → catch `OperationalError`, let the rest propagate."
- ✅ "`L88–140 processOrder` mixes validation, pricing, persistence → extract `validate()` and `price()`."

For each finding: quote the offending code (file + line), name the principle or AI failure mode in `references/`, give the fix (code if small, a named structural action if not), and assign severity (Critical / Important / Nit).

## When the review is contested

If the user pushes back on a finding, cite the source from the relevant `references/` file. The rules trace to primary sources (Uncle Bob, Fowler, Hunt & Thomas, McCabe, Metz) and published 2024–2026 research on LLM code generation. If the user has a context-specific reason to override, record it as an inline comment that names **the principle, the reason, and a revisit trigger** — e.g. `// clean-code exception: 4-arg ceiling — config DTO, all fields required at construction; revisit when an optional field appears.` (the prefix is illustrative, not a required tag). On a later pass a well-formed marker downgrades the finding to *Documented exception* — don't re-flag it; a marker with **no revisit trigger is itself a finding**, since an exception with no exit is just deferred debt. Name the principle, not a rule number — a number is meaningless to a future reader.

## What this review does not do

- Run linters or formatters. That's tooling.
- Execute the code or run tests. Add a finding instead: *"No tests for the new `charge` path — recommend adding."*
- Enforce language-specific style (Black, Prettier, PHPCS). Defer to the project's style tooling unless the user explicitly asks.
