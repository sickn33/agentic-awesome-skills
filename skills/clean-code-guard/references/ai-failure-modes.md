# AI Failure Modes — the unique value of this skill

This file catalogs 15 systematic ways LLMs produce bad code, each backed by published research or widely-documented engineering observations.

## Contents

- 1. Catch-all error handling that swallows failures
- 2. Defensive guards for impossible cases
- 3. Premature abstraction
- 4. Comment pollution
- 5. Code duplication instead of reuse
- 6. Hallucinated APIs and packages
- 7. Generic, intent-less naming
- 8. Long functions doing many things
- 9. Parameter explosion
- 10. Inconsistency with surrounding code
- 11. Dead code, unused imports, half-implementations
- 12. Declares success with mock fallbacks in production code
- 13. Plausible-but-wrong code
- 14. YAGNI violations through speculative configurability
- 15. New dependency for trivial work

---

## 1. Catch-all error handling that swallows failures

**Pattern.** Wrapping operations in broad catch-all handlers or returning null/empty success on any caught error.

**Rule.** Catch only the specific error type you can recover from. Never use broad catch-all handling without a documented recovery path.

---

## 2. Defensive guards for impossible cases

**Pattern.** Adding null checks, runtime type checks, or truthiness checks for conditions the type system or call graph already prevents.

**Rule.** Do not add null checks, runtime type checks, or truthiness checks for values whose type annotation or caller contract already excludes that case.

---

## 3. Premature abstraction

**Pattern.** Factories, strategy classes, base classes, plugin hooks, dependency-injection scaffolding introduced before a second concrete user exists.

**Rule.** Do not introduce an interface, abstract class, factory, registry, strategy, or plugin pattern unless two or more concrete implementations exist today or the spec explicitly requires extensibility.

---

## 4. Comment pollution

**Pattern.** Line-by-line comments restating the code in English; step-number scaffolding comments left in; documentation comments that paraphrase the signature.

**Rule.** Comments explain *why*, never *what*. Strip restating-code comments and any leftover "Step N" scaffolding before finalizing.

---

## 5. Code duplication instead of reuse

**Pattern.** Inline copies of logic that already exists in a helper, instead of importing it.

**Rule.** Before writing a function, search the codebase for a similar existing one.

---

## 6. Hallucinated APIs and packages

**Pattern.** Imports, method names, or signatures that don't exist in the version of the library actually installed.

**Rule.** Every import and external API call must be verified against the actual installed version.

---

## 7. Generic, intent-less naming

**Pattern.** `data`, `result`, `item`, `temp`, `value`, `obj`, `info`, `helper`, `manager`, `utils`, `process_*`, `handle_*`, `do_*`.

**Rule.** Identifiers must reveal intent. Ban generic names unless qualified.

---

## 8. Long functions doing many things

**Pattern.** A single function mixing I/O, business logic, formatting, and side effects.

**Rule.** A function does one thing. Refactor ceiling: ~50 lines (target ≤20), ≤4 parameters, cyclomatic complexity ≤10.

---

## 9. Parameter explosion

**Pattern.** Functions taking 6+ positional or keyword args that should have been a typed config object.

**Rule.** When a function reaches 5 parameters, stop and introduce a typed request/config object.

---

## 10. Inconsistency with surrounding code

**Pattern.** Introduces snake_case in a camelCase file, a new HTTP client when the repo has one, a new error type when an existing taxonomy exists.

**Rule.** Before writing in a file, read the file and at least one neighbor. Match casing, import style, error handling pattern, and logging style.

---

## 11. Dead code, unused imports, half-implementations

**Pattern.** Imports never referenced, helper functions never called, branches never reachable.

**Rule.** Before finalizing, run a linter or static check for unused imports, unused symbols, and unreachable branches; remove them.

---

## 12. "Declares success" — mock fallbacks in production code

**Pattern.** Returning hardcoded success values, fixture data, or empty defaults instead of doing the actual work.

**Rule.** Never return hardcoded "success" values or fixture data from a function the spec says should perform real work.

---

## 13. Plausible-but-wrong code

**Pattern.** Code that compiles and reads correctly but encodes a slightly wrong formula, range, or null semantic.

**Rule.** For any boundary, range, off-by-one, or null-semantic question, write the case enumeration in a comment first and verify each case before the code.

---

## 14. YAGNI violations — speculative configurability

**Pattern.** Config flags, env vars, optional parameters, and feature toggles for use cases that don't exist.

**Rule.** No optional parameter, config flag, env var, or feature toggle without a present-day caller.

---

## 15. New dependency for trivial work

**Pattern.** Adding a third-party package to do what the standard library, an already-installed dependency, or a few lines of code already cover.

**Rule.** Before adding a package, check the stdlib, the already-installed dependencies, and whether a few lines solve it.

---

## Cross-cutting observation

Nine of the 15 failure modes trace to one root cause: **the model is biased toward emitting more code, more parameters, more guards, more abstractions** — anything but the minimum required by the spec. The cure is restraint, not knowledge.
