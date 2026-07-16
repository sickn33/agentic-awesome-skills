# Design Patterns — Use vs Misuse

Use this when evaluating whether a design pattern is justified or is cargo cult / overuse.

## When to use a pattern

- **Repeated variation** — Same algorithm or structure with different behavior (e.g., different discount rules) → Strategy or similar.
- **Lifecycle or creation complexity** — Object creation has many variants or steps → Factory, Builder when the duplication or complexity is real.
- **Cross-cutting concern** — Logging, validation, auth at a boundary → Decorator, middleware, or adapter at the edge.
- **Stable abstraction, varying implementation** — You expect to swap implementations (e.g., repository, gateway) → Interface + implementations; dependency injection.

Rule of thumb: introduce a pattern when you feel the **third duplication** or the **second axis of change** (second reason to open the same module). Name the pattern in code or docs so intent is clear.

## When not to use a pattern

- **Simple, linear code** — No duplication, one reason to change. Adding a Factory or Strategy here adds indirection without benefit.
- **Speculative need** — "We might need to swap implementations later." Prefer YAGNI; add the abstraction when you actually have a second implementation or a second reason to change.
- **Every class is a pattern** — Not every class needs to be behind a Factory or an Interface. Use patterns where they solve a real design problem.

## Cargo cult and misuse

- **Cargo cult** — Using a pattern because "that’s what we do" or "enterprise code has Factories," without a clear design reason. Symptoms: Factory that only calls `new`, Strategy with one implementation and no plan for a second.
- **Overuse** — Pattern names in every class name; layers that only delegate and add no logic; code that is harder to follow than a straightforward version.
- **Misuse** — Wrong pattern for the problem (e.g., Singleton for something that should be testable and replaceable); pattern that hides the real design (e.g., God Object behind a Facade).

## Good signals

- The pattern name appears in design docs or comments where it helps (e.g., "Strategy for discount calculation").
- There are at least two concrete variants or a clear, stated reason for future variation.
- Tests and call sites are simpler because of the abstraction (e.g., tests inject a fake repository).

Use this reference in review when someone proposes or has added a Factory, Strategy, Repository, or other pattern—ask "what duplication or variation does this solve?" and "is there a second implementation or a second reason to change?"
