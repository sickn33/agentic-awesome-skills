# Uncle Bob Craft — Expanded Reference

This document expands the criteria referenced in the main skill. Sources: *Clean Code*, *Clean Architecture*, *The Clean Coder*, *Clean Agile* (Robert C. Martin). Use for progressive disclosure when you need full lists or deeper context.

---

## Clean Architecture

### Dependency Rule

Source code dependencies must point only **inward** (toward higher-level policies). Inner layers do not know about outer layers (e.g., use cases do not import from the web framework or the database driver).

- **Entities** (enterprise business rules) — center, no outward dependencies.
- **Use cases** (application business rules) — depend only on entities.
- **Interface adapters** (presenters, gateways) — depend on use cases/entities.
- **Frameworks and drivers** (UI, DB, HTTP) — outermost; depend inward.

### Layers (hexagonal / ports and adapters)

| Layer | Responsibility | Depends on |
|-------|----------------|------------|
| Entities | Core business entities and rules | Nothing (innermost) |
| Use cases | Application-specific business rules, orchestration | Entities |
| Interface adapters | Convert data between use cases and external world | Use cases, entities |
| Frameworks & drivers | DB, UI, HTTP, file I/O | Interface adapters |

### SOLID in architecture context

- **SRP** — A module should have one reason to change (one actor).
- **OCP** — Open for extension, closed for modification (use abstractions and boundaries).
- **LSP** — Subtypes must be substitutable for their base types (interfaces and implementations).
- **ISP** — Many client-specific interfaces are better than one general-purpose interface (splitting interfaces at boundaries).
- **DIP** — Depend on abstractions, not concretions (invert dependencies at boundaries).

### Component design (summary)

For grouping classes into components: **REP** (reuse/release equivalence), **CCP** (common closure), **CRP** (common reuse); **ADP** (acyclic dependencies), **SDP** (stable dependencies), **SAP** (stable abstractions). See [references/clean-architecture.md](./references/clean-architecture.md) for brief definitions.

---

## The Clean Coder

### Professionalism

- **Do no harm** — Do not leave the code worse than you found it; leave it better when you can.
- **Work ethic** — Know your craft, practice, stay current.
- **Saying no** — Say no when the request is unreasonable or would compromise quality; offer alternatives.
- **Saying yes** — When you say yes, mean it; commit to deadlines you can meet.

### Estimation

- **Three-point estimates** — Best case, nominal, worst case; use for planning, not promises.
- **Velocity** — Use historical velocity for iteration planning; do not inflate commitments.
- **Uncertainty** — Communicate uncertainty; avoid false precision.

### Sustainable pace

- Avoid sustained overtime; it reduces quality and long-term output.
- Tests and refactoring are part of the job, not "extra."

### Tests as requirement

- Code without tests is legacy by definition. Writing tests is a professional requirement.

### Mentoring and collaboration

- Helping others (mentoring, pairing) and leaving the team and codebase better are part of professionalism.

---

## Clean Agile

### Values (from Agile manifesto, emphasized by Uncle Bob)

- Individuals and interactions over processes and tools.
- Working software over comprehensive documentation.
- Customer collaboration over contract negotiation.
- Responding to change over following a plan.

### Iron Cross (four values that support the above)

| Value | Meaning |
|-------|--------|
| **Communication** | Prefer face-to-face and collaboration; reduce information loss. |
| **Courage** | Courage to refactor, to say no, to change design when needed. |
| **Feedback** | Short feedback loops (tests, demos, iterations). |
| **Simplicity** | Do the simplest thing that could work; avoid speculative design. |

### Practices

- **TDD** — Red, green, refactor; tests first as specification and safety net.
- **Refactoring** — Continuous small improvements; keep tests green.
- **Pair programming** — Two people at one machine; design and quality improve.
- **Simple design** — No duplication, express intent, minimal elements, small abstractions.

---

## Smells and Heuristics (expanded)

### Design smells (from Clean Code / Clean Architecture)

| Code | Name | Brief |
|------|------|--------|
| **Rigidity** | Hard to change; one change triggers many. | Reduce coupling; introduce boundaries. |
| **Fragility** | Breaks in unexpected places. | Isolate changes; improve tests. |
| **Immobility** | Hard to reuse. | Extract reusable parts; reduce coupling. |
| **Viscosity** | Easy to hack, hard to do right. | Make right thing easy (abstractions, tests). |
| **Needless complexity** | Speculative or unused design. | YAGNI; remove until needed. |
| **Needless repetition** | DRY violated. | Extract common logic; name the abstraction. |
| **Opacity** | Hard to understand. | Rename, extract, clarify intent. |

### Heuristics (review checklist style)

- **C1 / Naming** — Names reveal intent; no disinformation (e.g., `accountList` when it is not a list).
- **C2 / Functions** — Small, one thing, one level of abstraction; few arguments.
- **C3 / Comments** — Prefer self-explanatory code; good comments for why, not what.
- **C4 / Formatting** — Newspaper metaphor; vertical density; variables near use.
- **C5 / Error handling** — Exceptions over return codes; don’t return or pass null without contract.
- **C6 / Tests** — F.I.R.S.T.; TDD when applicable.
- **C7 / Classes** — Small, single responsibility; stepdown rule.
- **T1 / Boundaries** — Dependencies point inward; no outer details in inner layers.
- **T2 / SOLID** — Check SRP, OCP, LSP, ISP, DIP in context.
- **T3 / Patterns** — Pattern used to solve a real problem, not for show.

(You can extend to a full C1–T9 list in your team; the above is a compact reference.)

---

## Design patterns (when and when not)

- **Use** when: you have repeated variation (Strategy), lifecycle/creation complexity (Factory), or a clear cross-cutting concern (e.g., logging, validation at a boundary).
- **Avoid** when: the code is simple and a pattern would add indirection without reducing duplication or clarifying intent.
- **Cargo cult** — Applying a pattern by name everywhere (e.g., everything is a Factory) without a design reason. Prefer "simplest thing that could work" until duplication or change axis appears.

---

---

## Scope and attribution

- **Clean Code** — Full heuristics and chapter-by-chapter detail: use the `@clean-code` skill. This skill references Clean Code for review context and defers naming/functions/formatting there.
- **Clean Architecture** — We cover the Dependency Rule, layers, boundaries, SOLID in architecture, and component cohesion/coupling (REP, CCP, CRP, ADP, SDP, SAP) in summary; the book has full treatment and more nuance.
- **The Clean Coder** — We summarize professionalism, estimation, sustainable pace, tests, and mentoring; the book has full chapters and stories.
- **Clean Agile** — We summarize values, Iron Cross, and key practices (TDD, refactoring, pairing, simple design); the book ties them to agile history and adoption.

*Attribution: Principles and structure drawn from Robert C. Martin, Clean Code (2008), Clean Architecture (2017), The Clean Coder (2011), Clean Agile (2019). This reference is a summary for agent use, not a substitute for the books.*
