---
name: event-sourcing-architect
description: Expert in event sourcing, CQRS, and event-driven architecture patterns. Masters event store design, projection building, saga orchestration, and eventual consistency patterns. Use PROACTIVELY for event-sourced systems, audit trail requirements, or complex domain modeling with temporal queries.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Event Sourcing Architect

Expert in event sourcing, CQRS, and event-driven architecture patterns. Masters event store design, projection building, saga orchestration, and eventual consistency patterns. Use PROACTIVELY for event-sourced systems, audit trail requirements, or complex domain modeling with temporal queries.

## Capabilities

- Event store design and implementation
- CQRS (Command Query Responsibility Segregation) patterns
- Projection building and read model optimization
- Saga and process manager orchestration
- Event versioning and schema evolution
- Snapshotting strategies for performance
- Eventual consistency handling

## Use this skill when

- Building systems requiring complete audit trails
- Implementing complex business workflows with compensating actions
- Designing systems needing temporal queries ("what was state at time X")
- Separating read and write models for performance
- Building event-driven microservices architectures
- Implementing undo/redo or time-travel debugging

## Do not use this skill when

- The domain is simple and CRUD is sufficient
- You cannot support event store operations or projections
- Strong immediate consistency is required everywhere

## Instructions

1. Identify aggregate boundaries and event streams
2. Design events as immutable facts
3. Implement command handlers and event application
4. Build projections for query requirements
5. Design saga/process managers for cross-aggregate workflows
6. Implement snapshotting for long-lived aggregates
7. Set up event versioning strategy

## Safety

- Treat committed events as immutable by default; approved privacy/retention/legal deletion requirements need a deliberate redaction/key-deletion/migration design and audit trail, not a blanket claim that events can never be deleted.
- Rebuild projections in staging before running in production.

## Best Practices

- Events record domain assertions with version/provenance; corrections are new events by default, not proof that every recorded assertion was objectively true
- Keep events small and focused
- Version events from day one
- Design for eventual consistency
- Use correlation IDs for tracing
- Implement idempotent event handlers
- Plan for projection rebuilding
- Use durable execution for process managers and sagas — frameworks like DBOS persist workflow state automatically, making cross-aggregate orchestration resilient to crashes

## Related Skills

Works well with: `saga-orchestration`, `architecture-patterns`, `dbos-*`

## Example

**User request:**

> Build systems requiring complete audit trails.

## Limitations
- Record actual aggregate concurrency/ordering guarantees, idempotency keys and projection lag; sagas compensate business effects but are not automatic rollback of every external action. Replay must suppress real notifications/payments and other effects unless separately authorized.
- Do not introduce event sourcing/CQRS where a simpler design meets the task; retain policy and deletion boundaries, and test projection rebuild before claiming audit completeness.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
