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

Source: pragprog official DRY excerpt PDF; Wikipedia summary; O'Reilly *97 Things Every Programmer Should Know*, Ch. 30.

### The misreading

*"Don't have any duplicate code."* No. Hunt and Thomas frame DRY as duplication "of knowledge, of intent... expressing the same thing in two different places, possibly in two totally different ways." Two functions that **look alike but encode different rules** are not a DRY violation. **One rule** expressed in code + database schema + documentation **is**.

### Smells worth flagging

These are textual signals that *probably* indicate knowledge duplication, but verify the underlying meaning before refactoring:

- Identical token sequence of ≥5 non-trivial lines appearing in ≥2 functions.
- The same regex, SQL fragment, or URL literal repeated in ≥3 sites.
- The same magic number or string repeated ≥3 times outside a constants module.
- The same validation branch (for example, "if value is missing, raise") duplicated across siblings of one module.

### The Rule of 3 — wait for the third occurrence

Don't extract an abstraction the first time you see duplication. Don't extract on the second. Wait for the third — by then you have enough signal about the *real* shape of the shared knowledge to abstract correctly. The Rule of 3 is folklore from refactoring practice; the underlying principle (don't abstract too early) is in Fowler's *Refactoring* (refactoring.com/catalog) and in the wrong-abstraction work below.

### The Sandi Metz corollary — wrong abstraction is worse than duplication

From Sandi Metz, "The Wrong Abstraction" (Jan 2016): *"duplication is far cheaper than the wrong abstraction."*

If an abstraction has accumulated per-caller branches and special cases, it is the wrong abstraction. The remedy:

1. Re-inline the abstraction back into each caller.
2. Delete the per-caller dead branches.
3. Live with honest duplication for a while.
4. Re-abstract only when the *real* shared knowledge becomes obvious.

**Rule.** Do not introduce an abstraction to eliminate three lines of duplication unless you can name the underlying *knowledge* the lines represent. If you can't name it, leave the duplication.

---

## KISS — Keep It Simple, Stupid

**Origin.** Coined by Clarence "Kelly" Johnson at Lockheed's Skunk Works (U-2, SR-71). His designers were handed a basic toolkit; the aircraft had to be repairable by an average mechanic in a combat field with only those tools. The "stupid" refers to the mismatch between break-conditions and repair sophistication — not to the engineer.

Original phrasing: *"Keep it simple stupid"* (no comma). First documented use by the U.S. Navy in 1960.

Source: Wikipedia, KISS principle; Braithwaite background story.

### Operationalizing KISS for code review

KISS is fuzzy without numbers. Use these as defaults:

- **Cognitive Complexity ≤10 per function.** SonarSource's Cognitive Complexity metric measures *how hard the code is to understand* rather than the count of independent paths. It's the dominant 2026 metric — adopted by SonarQube, Biome, and ReSharper. Target <7 for greenfield code; <15 is the upper bound before refactor is mandatory.
- **Cyclomatic complexity ≤10 per function.** McCabe's original 1976 metric, still useful as a structural floor. 11–20 is moderate risk; 21–50 is high risk; >50 is untestable. Source: McCabe NIST 235r; JetBrains ReSharper threshold guidance. Use Cognitive Complexity for human-readability judgement; use cyclomatic for "is this testable" judgement. When they disagree, prefer Cognitive Complexity.
- **Nesting depth ≤5.** Source: Aivosto, Project Metrics: Complexity.
- **Function length:** no canonical absolute, but common static-analysis defaults (SonarQube, PMD) flag >50–60 lines. Pair with complexity ceiling rather than relying on LOC alone.

### Self-check

When you see a function exceed cyclo 10 or nest depth 5, refactor *before* finishing — not "later." Extract a helper, replace nested `if/else` with early returns or a lookup table.

---

## YAGNI — You Aren't Gonna Need It

**Canonical reference.** Martin Fowler, *bliki: Yagni* (May 2015). *"A mantra from ExtremeProgramming... capabilities we presume our software needs in the future should not be built now because 'you aren't gonna need it.'"*

### Fowler's four cost categories

When you build a presumptive feature, you pay:

1. **Cost of build.** Analysis, coding, testing of a feature that ends up unused.
2. **Cost of delay.** Opportunity cost — revenue-generating work you didn't do instead.
3. **Cost of carry.** Added complexity makes every future modification and debug slower.
4. **Cost of repair.** When the presumed feature turns out to be wrong, you pay to rip it out plus the technical debt accumulated against it.

Source: martinfowler.com/bliki/Yagni.html; InfoQ summary.

### AI-specific YAGNI traps

LLMs over-produce speculative surface area. These are the patterns to spot:

1. **Config flags / env vars nobody asked for.** `enable_x_v2`, `legacy_mode`, toggles for a single code path that has no second variant.
2. **Plugin / strategy systems for 2 known cases.** Registry + base class + 2 subclasses where a direct conditional is shorter and clearer.
3. **Generic helpers with one caller.** `normalizeAnything(value, strict=false, mode="default")` invoked from exactly one site.
4. **Optional parameters never passed.** `send(value, retries=3, backoff=null, jitter=false, logger=null)` where every call site uses defaults. Delete them until a real caller exists.
5. **Speculative async / batching / caching.** Async wrappers, queues, and batch endpoints where current load is single-digit RPS.
6. **Premature interfaces/protocols with one implementation.** `FooRepository` paired with one concrete `SqlFooRepository`. Inline until you have a second implementation.

### Self-check

For every parameter, class, file, or abstraction you introduce, answer: *who calls this today?* If the answer is "nobody yet," delete it.

---

## Ranked list — where AI agents over-engineer

By frequency observed (engineering-blog-grade, not from a controlled study):

1. **Premature interfaces/protocols** with one implementation.
2. **Factory classes for trivial constructors** — `UserFactory.create(...)` wrapping `User(...)`.
3. **DI containers in small apps** — wiring frameworks for 3–5 services where explicit construction in `main()` is shorter and traceable.
4. **Try/catch wrappers that change nothing** — adds lines, hides tracebacks.
5. **Speculative config surface** — settings objects with 15 fields where 3 are read.
6. **Plugin / registry scaffolding for two cases.**
7. **`utils.py` / `common.py` modules** — magnets for unrelated functions; violate DRY's "single authoritative representation" by location.
8. **Re-implementing what the platform already gives you** — custom retry loops, enums, or record-like types the standard library provides; hand-rolled validation a database/schema constraint, the type system, or a framework's declarative rule would enforce; a native platform feature replaced by hand-written app code. Prefer the cheapest existing solution: stdlib or native feature over new code, a declarative constraint over an imperative check. The flip side is mode 15 in [ai-failure-modes.md](ai-failure-modes.md) — don't reach for a *new* dependency for what a few lines already cover either.
9. **Excessive layering** (Controller → Service → Manager → Repository) for CRUD — four files to read one row.
10. **Wrapping libraries "to make them swappable"** — thin pass-through adapters around an HTTP, database, or SDK client you will never swap.

---

## Self-check for DRY, KISS, YAGNI

Before you ship code:

1. (DRY) Did you eliminate duplication of *knowledge*, or just duplication of *text*? Can you name the underlying rule?
2. (DRY/Metz) If you introduced an abstraction, are there at least two callers today whose code is structurally identical? Or is the abstraction speculative?
3. (KISS) Any function over cyclomatic 10 or nest depth 5?
4. (YAGNI) Any optional parameter, config flag, env var, interface, factory, or base class without a caller using it today?
5. (YAGNI) Did you wrap a library to "make it swappable"? Delete the wrapper.
