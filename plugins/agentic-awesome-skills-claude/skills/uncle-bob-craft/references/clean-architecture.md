# Clean Architecture — Deep Reference

Based on Robert C. Martin, *Clean Architecture* (2017). Use this when you need detailed criteria for dependency direction, layers, and boundaries.

## Dependency Rule

**Dependencies point inward only.** Code in the center (entities, use cases) must not depend on code in outer circles (UI, DB, frameworks). Outer circles depend on inner circles; inner circles define interfaces, outer circles implement them.

- **Violation**: A use case that imports from Express, Django, or a concrete repository implementation.
- **Correct**: Use case depends on an interface (e.g., `OrderRepository`); the adapter in the outer layer implements it and uses Express/DB.

## Layers (from inside out)

1. **Entities** — Enterprise business rules. Plain structures and rules that apply across the application. No dependencies on frameworks or UI.
2. **Use cases** — Application business rules. Orchestrate entities and define application-specific workflows. Depend only on entities and on interfaces for I/O (repositories, presenters).
3. **Interface adapters** — Convert data between use cases and the outside world. Presenters, gateways, controllers that translate external format to/from use-case format. Depend on use cases (and entities only via use cases).
4. **Frameworks and drivers** — Web framework, DB driver, messaging, file I/O. Implement interfaces defined by use cases or interface adapters. Depend inward.

## Boundaries

- **Boundary** = interface or abstract type that inner code depends on; outer code implements.
- Good boundaries make it easy to swap implementations (e.g., in-memory repo for tests, SQL repo for production).
- Draw boundaries where there is a reason to vary or replace (different persistence, different UI, different transport).

## SOLID in this context

- **SRP** — Each module (class/package) has one reason to change (one actor). E.g., separate "report formatting" from "report calculation" if they change for different reasons.
- **OCP** — Extend behavior via new implementations of interfaces (new adapters), not by editing existing use-case or entity code.
- **LSP** — Any implementation of a repository or gateway interface must be substitutable without breaking the use case.
- **ISP** — Small, focused interfaces (e.g., `ReadOrderRepository` and `WriteOrderRepository` if read and write evolve differently) instead of one fat `OrderRepository`.
- **DIP** — Use cases depend on `OrderRepository` (interface); the composition root wires in `SqlOrderRepository`. High-level policy does not depend on low-level details.

## Inversion of dependencies

- **Without inversion**: Use case imports and calls `SqlOrderRepository` directly → use case depends on DB.
- **With inversion**: Use case depends on `OrderRepository` (interface); `SqlOrderRepository` implements it and is injected at the edge. Use case stays independent of SQL.

## Component cohesion and coupling (for larger systems)

When grouping classes into **components** (modules, packages), Uncle Bob defines:

**Cohesion:**  
- **REP (Reuse/Release Equivalence)** — The unit of reuse is the unit of release; group classes that are reused and released together.  
- **CCP (Common Closure)** — Classes that change for the same reasons belong in the same component; reduces impact of change.  
- **CRP (Common Reuse)** — Classes reused together should be packaged together; avoid forcing dependents to pull in more than they need.

**Coupling:**  
- **ADP (Acyclic Dependencies)** — Component dependency graph must have no cycles.  
- **SDP (Stable Dependencies)** — Depend in the direction of stability; less stable components depend on more stable ones.  
- **SAP (Stable Abstractions)** — Stable components should be abstract; unstable components can be concrete.

Use this when discussing module/package boundaries beyond single layers. For full treatment see *Clean Architecture* (Martin, 2017).

---

Use this reference when reviewing for "dependency direction," "layer violations," or "missing boundaries."
