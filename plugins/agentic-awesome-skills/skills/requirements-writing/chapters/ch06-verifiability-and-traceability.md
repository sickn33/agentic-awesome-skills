# Chapter 6: Verifiability & Traceability

## Core Idea
A requirement is only as good as your ability to prove it was met and to follow it through the design. Verifiability is designed in at writing time by choosing a measurable response and a verification method; traceability links each requirement up to its need and down to its evidence.

## Frameworks Introduced
- **The four verification methods**: **Test**, **Analysis**, **Inspection**, **Demonstration** — every verifiable requirement should map to at least one.
  - When to use: assign a method as you write each requirement; if none fits affordably, the requirement is not yet verifiable.
- **Bidirectional traceability**: every requirement traces *up* to a parent need/higher requirement and *down* to design, implementation, and verification evidence.
  - When to use: throughout the lifecycle; it is what lets you assess change impact and prove coverage.

## Key Concepts
- **Test**: exercise the system and measure the result against a numeric criterion (the strongest evidence).
- **Analysis**: use models, calculation, or simulation where a direct test is impractical (e.g. life, worst-case stack-up).
- **Inspection**: examine the item or documentation (e.g. a label, a material, a configuration setting).
- **Demonstration**: show a capability operating, without detailed instrumentation (e.g. an operator workflow).
- **Verification vs validation**: verification asks "did we build the thing right (meet the requirement)?"; validation asks "did we build the right thing (meet the need)?".
- **Trace link**: an explicit relationship (parent/child, satisfied-by, verified-by) that survives change.

## Mental Models
- **Write the test as you write the requirement.** If you cannot state the pass/fail criterion in one breath, the requirement is not yet verifiable — fix the requirement, not the test plan.
- **Numbers make requirements verifiable.** A measurable response (value + units + tolerance + condition) converts an opinion into a check.
- **Trace up before down.** A requirement that traces to no parent need is a candidate for deletion (it may not be *necessary*).

## Anti-patterns
- **"Verify by review" as a catch-all**: often hides an unverifiable requirement; pick a real method or rewrite.
- **Orphan requirements**: no parent need (why does it exist?) or no verification (how will we know?) — both are red flags at baseline.
- **Tolerance-free numbers**: "shall respond in 100 ms" with no condition or tolerance is ambiguous about pass/fail.

## Key Takeaways
1. Choose a verification method (T/A/I/D) for every requirement at writing time; inability to do so signals an unverifiable requirement.
2. Make responses measurable — value, units, tolerance, and the condition under which they apply.
3. Maintain bidirectional traceability so you can prove coverage and assess change impact.
4. Keep verification (met the requirement) distinct from validation (met the need) — both are required, for different questions.

## Connects To
- **Quality characteristics (Ch 1)**: this chapter operationalises the *verifiable* characteristic.
- **EARS patterns (Ch 3)**: the explicit response clause is where you put the measurable, testable criterion.
- **NASA SE process (`nasa-npr-7123`, `nasa-se-handbook`)**: public-domain guidance on verification methods and requirements traceability that this aligns with.
