# Clean Agile — Deep Reference

Based on Robert C. Martin, *Clean Agile* (2019). Use this when discussing agile values, practices, and the "Iron Cross."

## Agile values (manifesto)

- Individuals and interactions over processes and tools.
- Working software over comprehensive documentation.
- Customer collaboration over contract negotiation.
- Responding to change over following a plan.

Uncle Bob stresses that the right-hand side still has value; the left-hand side is preferred when there is a trade-off.

## Iron Cross (four supporting values)

| Value | What it means in practice |
|-------|---------------------------|
| **Communication** | Prefer face-to-face (or high-bandwidth) communication; reduce information loss; keep the team aligned. |
| **Courage** | Courage to refactor, to say no to unreasonable requests, to change the design when the code tells you to. |
| **Feedback** | Short feedback loops—unit tests, integration tests, demos, small iterations. Learn fast what works and what doesn’t. |
| **Simplicity** | Do the simplest thing that could possibly work. Avoid speculative design and unnecessary abstraction. |

## Practices

- **TDD (Test-Driven Development)** — Red, green, refactor. Write a failing test first, then minimal code to pass, then refactor. Tests act as specification and safety net.
- **Refactoring** — Continuous small improvements. Keep tests green; improve structure, names, and design in small steps.
- **Pair programming** — Two people at one machine. Improves design and quality; spreads knowledge. Not mandatory every hour, but a recognized practice for hard or critical work.
- **Simple design** — No duplication; express intent; minimal elements (classes, methods); small, focused abstractions. Add complexity only when the code asks for it (e.g., third duplication).

## Relationship to craft

Clean Agile ties agile values to craft: sustainable pace, tests as requirement, refactoring as part of the loop, and simplicity over speculation. Use this reference when discussing how TDD, refactoring, or pairing support agility and quality.
