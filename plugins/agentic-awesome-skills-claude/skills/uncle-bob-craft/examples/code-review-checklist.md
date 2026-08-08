# Uncle Bob Craft — Code Review Checklist

Copy-paste this checklist when performing a principle-based code review with the uncle-bob-craft skill. Run your project linter/formatter separately; this checklist focuses on structure and design.

---

## 1. Dependency Rule and boundaries

- [ ] Dependencies point **inward** (use cases / domain do not depend on UI, DB, or framework details).
- [ ] Outer layers depend on interfaces (e.g., repositories, gateways) defined by inner layers.
- [ ] No direct import of framework or driver in the core/use-case code under review.

## 2. SOLID in context

- [ ] **SRP** — Each class/module has one reason to change (one actor).
- [ ] **OCP** — Extension via new implementations, not by editing existing core logic.
- [ ] **LSP** — Subtypes are substitutable; no hidden assumptions about concrete types.
- [ ] **ISP** — Interfaces are focused; callers do not depend on methods they do not use.
- [ ] **DIP** — High-level code depends on abstractions; concretions are injected at the edge.

## 3. Smells

- [ ] **Rigidity** — Small change does not force edits in many places.
- [ ] **Fragility** — Change does not break unrelated areas.
- [ ] **Immobility** — Reuse is possible where it makes sense.
- [ ] **Viscosity** — Doing the right thing is not harder than hacking.
- [ ] **Needless complexity** — No speculative or unused abstraction.
- [ ] **Needless repetition** — DRY; no obvious duplication.
- [ ] **Opacity** — Names and structure make intent clear.

## 4. Design patterns

- [ ] Any pattern used has a clear **reason** (duplication, variation, or boundary).
- [ ] No cargo-cult pattern (e.g., Factory with a single implementation and no plan for variation).
- [ ] Pattern improves readability or testability, not the opposite.

## 5. Tests and professionalism

- [ ] Touched code has or is covered by tests where appropriate.
- [ ] No "we'll fix it later" or "TODO: refactor" that clearly violates sustainable pace or quality.
- [ ] Commit/PR is coherent and does not leave the codebase worse.

---

## Suggested output format for review

1. **Boundaries**: One or two sentences on dependency direction and any violations.
2. **SOLID**: List any violations with file/function and principle (e.g., "SRP: `OrderService` parses and persists — split.").
3. **Smells**: List smells found with location (e.g., "Rigidity: changing discount rule touches 4 files.").
4. **Concrete refactors**: One or two specific suggestions (e.g., "Extract `applyDiscount` from `process`"; "Introduce `OrderRepository` interface and inject in the use case.").
5. **Tests / professionalism**: Brief note on test coverage and any concerns.

---

*Use with the skill: @uncle-bob-craft. For naming, functions, and formatting detail, also use @clean-code. Always run the project linter and formatter separately.*
