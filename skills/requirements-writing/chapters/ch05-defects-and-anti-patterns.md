# Chapter 5: Requirement Defects & Anti-patterns

## Core Idea
EARS fixes the *shape* of a requirement; it does not by itself fix the *content*. A separate, well-known set of defects — ambiguity, compounding, embedded design, weak words, and unverifiability — accounts for most review findings, and each has a standard remedy.

## Frameworks Introduced
- **The defect catalogue**: a short list of recurring requirement faults with a fix for each, used as a review lens.
  - When to use: peer review and requirement quality gates, alongside the Chapter 1 characteristics.

## Key Concepts
- **Ambiguity**: a sentence with more than one reasonable reading (pronouns with unclear referents, "and/or", scope words like "as appropriate").
- **Compound (conjoined) requirement**: two or more needs in one statement, joined by "and", commas, or bullet sub-lists — cannot be verified or traced atomically.
- **Implementation/design in a requirement**: stating *how* (a specific algorithm, technology, or structure) when only *what* is needed; over-constrains design.
- **Weak / vague words**: "user-friendly", "robust", "fast", "minimal", "flexible", "etc.", "support", "handle" — none is testable.
- **Unverifiable requirement**: no finite, affordable test/analysis/inspection/demonstration can confirm it.
- **Missing rationale**: the *why* is absent, so later changes cannot judge whether the requirement still applies.

## Mental Models
- **"Could two engineers disagree on whether it passed?"** If yes, it is ambiguous or unverifiable — rewrite until the answer is no.
- **Count the needs.** One requirement = one need. If you can split it on "and" without nonsense, it was compound.
- **Separate the what from the how.** Ask "is this the need, or one way to meet it?" — design choices masquerading as requirements are the most expensive defect to discover late.

## Anti-patterns
- **"The system shall be user-friendly."** → replace with a measurable criterion (e.g. task completion within N steps, SUS score ≥ X).
- **"The system shall log events and alert the operator and archive daily."** → three requirements; split each so each can be verified and traced.
- **"The system shall use a Kalman filter to estimate position."** → states a mechanism; if the real need is accuracy, write "shall estimate position to within X m, 95% of the time" and let design pick the filter.
- **"etc." / "and so on" / "including but not limited to"** → makes the set incomplete and untestable; enumerate or bound it.

## Key Takeaways
1. Structure (EARS) and content (this catalogue) are separate review passes — do both.
2. Weak words and unverifiable adjectives are the highest-frequency defect; keep a banned-words list (see the cheatsheet).
3. Split compound requirements early; atomic requirements are the unit of verification and traceability.
4. Keep design out of requirements unless the mechanism genuinely *is* the need (e.g. a mandated interface standard); capture rationale so future changes are judged correctly.

## Connects To
- **Quality characteristics (Ch 1)**: each defect maps to a violated characteristic (singular, unambiguous, verifiable).
- **Verifiability & traceability (Ch 6)**: unverifiable and compound requirements break verification and trace links.
- **Applying EARS (Ch 4)**: conversion exposes compounding but not weak verbs — catch those here.
