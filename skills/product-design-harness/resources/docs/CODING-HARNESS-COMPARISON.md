# Product Design Harness vs Coding Harness

![Product Design Harness vs Coding Harness](../assets/product-vs-coding-harness.svg)

## Core Difference

| Question | Harness |
|---|---|
| Should we build this? | Product Design Harness |
| Did we build this correctly? | Coding Harness |

Both are needed.

Product Design Harness should run first.

## Comparison

| Dimension | Product Design Harness | Coding Harness |
|---|---|---|
| Main concern | Direction quality. | Execution quality. |
| Primary failure | Wrong product. | Broken implementation. |
| Inputs | Brief, user signal, evidence, constraints, strategy. | Issue, spec, codebase, tests, tools. |
| Outputs | Verdict, gate review, context pack, stop conditions. | Diff, tests, logs, verified change. |
| Review lens | User, evidence, business, taste. | Correctness, security, maintainability, performance. |
| Human role | Judge trade-offs and risk. | Review changes and release readiness. |
| Stop signal | Problem, evidence, risk, or value fails. | Tests, linters, policies, runtime checks fail. |

## Sequence

![Harness sequence](../assets/harness-sequence.svg)

1. Product idea
2. Product Design Harness
3. Context pack
4. Coding Harness
5. Implementation
6. Measurement
7. Decision update

Skipping Product Design Harness causes teams to build the wrong work efficiently.

Skipping Coding Harness causes teams to build the right work unreliably.

## Where They Meet

The handoff between the two harnesses is the context pack.

The context pack should include:

- goal
- stage
- scope
- non-goals
- assumptions
- user rules
- evidence rules
- business rules
- acceptance criteria
- stop conditions

The coding harness should not invent these.

If they are missing, execution should stop and ask for product judgment.

## Anti-Patterns

| Anti-pattern | Correction |
|---|---|
| "The prototype works, so the idea is valid." | Working output is not market proof. |
| "The tests pass, so the product is good." | Tests verify implementation, not value. |
| "The user asked for it, so build it." | Convert requests into testable problems. |
| "It is easy to ship, so ship it." | Easy features still have ownership cost. |
| "We will measure later." | Define evidence before execution. |

## Good Handoff Example

| Field | Example |
|---|---|
| Goal | Reduce failed setup for first-time account admins. |
| Scope | Prototype one guided setup path. |
| Non-goals | No billing, permissions redesign, or analytics dashboard. |
| User rule | Admin must understand the next action without reading docs. |
| Evidence rule | Measure setup completion and rescue-click rate. |
| Business rule | Do not add support-heavy customization. |
| Stop condition | Stop if prototype requires changing core account model. |

## Rule

Product Design Harness decides what deserves execution.

Coding Harness verifies execution.
