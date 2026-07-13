# DRY, KISS, YAGNI

Three short principles. Often confused. Often applied wrong by AI agents (and humans).

## Contents

- DRY: do not duplicate knowledge
- KISS: keep complexity low and local
- YAGNI: avoid speculative configurability
- Ranked list: where AI agents over-engineer
- Self-check for DRY, KISS, YAGNI

---

## DRY — Don't Repeat Yourself

**Definition (Hunt & Thomas, *The Pragmatic Programmer*, verbatim).** *"Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."*

### The misreading

*"Don't have any duplicate code."* No. Hunt and Thomas frame DRY as duplication "of knowledge, of intent... expressing the same thing in two different places, possibly in two totally different ways."

### The Rule of 3 — wait for the third occurrence

Don't extract an abstraction the first time you see duplication. Don't extract on the second. Wait for the third.

### The Sandi Metz corollary — wrong abstraction is worse than duplication

From Sandi Metz, "The Wrong Abstraction" (Jan 2016): *"duplication is far cheaper than the wrong abstraction."*

---

## KISS — Keep It Simple, Stupid

**Origin.** Coined by Clarence "Kelly" Johnson at Lockheed's Skunk Works (U-2, SR-71).

### Operationalizing KISS for code review

- **Cognitive Complexity ≤10 per function.**
- **Cyclomatic complexity ≤10 per function.**
- **Nesting depth ≤5.**
- **Function length:** ~50 lines (target ≤20), ≤4 parameters.

---

## YAGNI — You Aren't Gonna Need It

**Canonical reference.** Martin Fowler, *bliki: Yagni* (May 2015).

### AI-specific YAGNI traps

1. **Config flags / env vars nobody asked for.**
2. **Plugin / strategy systems for 2 known cases.**
3. **Generic helpers with one caller.**
4. **Optional parameters never passed.**
5. **Speculative async / batching / caching.**
6. **Premature interfaces/protocols with one implementation.**

---

## Ranked list — where AI agents over-engineer

1. **Premature interfaces/protocols** with one implementation.
2. **Factory classes for trivial constructors**
3. **DI containers in small apps**
4. **Try/catch wrappers that change nothing**
5. **Speculative config surface**
6. **Plugin / registry scaffolding for two cases.**
7. **`utils.py` / `common.py` modules**
8. **Re-implementing what the platform already gives you**
9. **Excessive layering** (Controller → Service → Manager → Repository) for CRUD
10. **Wrapping libraries "to make them swappable"**

---

## Self-check for DRY, KISS, YAGNI

Before you ship code:

1. (DRY) Did you eliminate duplication of *knowledge*, or just duplication of *text*?
2. (DRY/Metz) If you introduced an abstraction, are there at least two callers today?
3. (KISS) Any function over cyclomatic 10 or nest depth 5?
4. (YAGNI) Any optional parameter, config flag, env var, interface, factory, or base class without a caller using it today?
5. (YAGNI) Did you wrap a library "to make it swappable"? Delete the wrapper.
