# Tactical Pattern Checklist

## Aggregate design

- One aggregate root per transaction boundary
- Invariants enforced inside aggregate methods
- Avoid cross-aggregate synchronous consistency rules

## Value objects

- Immutable by default
- Validation at construction
- Equality by value, not identity

## Repositories

- Persist and load aggregate roots only
- Expose domain-friendly query methods
- Avoid leaking ORM entities into domain layer

## Domain events

- Past-tense event names (for example, `OrderSubmitted`)
- Include minimal, stable event payloads
- Version event schema before breaking changes
