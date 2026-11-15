# Chapter 1: What Makes a Good Requirement

## Core Idea
A requirement is fit for use when it is unambiguous, verifiable, and bounded to a single need — the defects that derail projects are almost always introduced at writing time, not at design time, so the cheapest place to catch them is in the wording.

## Frameworks Introduced
- **The quality characteristics of a single requirement**: a checklist a requirement must pass before it is baselined.
  - When to use: when authoring or peer-reviewing any individual requirement statement.
- **The quality characteristics of a requirement set**: properties that only emerge across the whole collection (completeness, consistency, non-redundancy, feasibility as a whole).
  - When to use: at requirements-baseline and change-board reviews, not on a single statement.

## Key Concepts
- **Necessary**: the requirement states a real need; removing it would leave a gap. Requirements that merely restate a design choice are usually not necessary.
- **Appropriate (right level)**: it sits at the correct level of abstraction — a system requirement says *what*, not *how*; design detail belongs lower down.
- **Unambiguous**: it has exactly one reasonable interpretation to every reader, regardless of background.
- **Complete**: it needs no further amplification; conditions, triggers, and tolerances are all present.
- **Singular**: it states one and only one need (no "and"/"or" smuggling two requirements into one line).
- **Feasible**: it can be met within cost, schedule, and the laws of physics.
- **Verifiable**: there is a finite, affordable way to confirm it was met (test, analysis, inspection, or demonstration).
- **Correct**: it accurately reflects the actual stakeholder need.
- **Conforming**: it follows the project's agreed template and style.

## Mental Models
- **Think of a requirement as a contract clause, not a wish.** If you could not write a pass/fail test for it, a supplier could not be held to it either.
- **Use "necessary + verifiable" as the two-question gate.** Most weak requirements fail one of these two before any of the subtler characteristics matter.
- **Push *how* downward.** When a requirement names a mechanism, ask "is the mechanism the need, or just one way to meet it?" — usually it is the latter and belongs in design.

## Anti-patterns
- **Bundling several needs in one statement**: defeats singular and makes partial verification impossible; split it.
- **Specifying a solution instead of a need**: over-constrains the designer and hides the real requirement; state the need and let design choose the means.
- **Unverifiable adjectives** ("robust", "user-friendly", "fast"): no test can confirm them; replace with a measurable criterion.

## Key Takeaways
1. Run every single requirement through the nine characteristics; necessary and verifiable are the two that catch the most damage.
2. Keep system requirements at the *what* level — embedded design detail is the most common quality defect.
3. Defects are cheapest to fix in the requirement text; a clear sentence now saves a change request later.
4. Some quality properties (completeness, consistency) live only at the *set* level — review the collection, not just the line.

## Connects To
- **EARS (Ch 2-4)**: a constrained syntax that makes "unambiguous" and "singular" much easier to achieve.
- **Verifiability & traceability (Ch 6)**: turns the *verifiable* characteristic into concrete verification methods.
- **NASA NPR 7123.1 / SE Handbook (`nasa-npr-7123`, `nasa-se-handbook`)**: public-domain SE guidance on requirements definition that these characteristics align with.
