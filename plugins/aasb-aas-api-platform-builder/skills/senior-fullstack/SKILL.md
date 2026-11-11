---
name: senior-fullstack
description: Coordinate full-stack implementation across interface, service, database and delivery boundaries using the existing project stack and verified checks.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Full-Stack Implementation Review

## When to Use

Use when a feature spans the browser, backend service and database, or when reviewing an existing full-stack implementation for integration gaps.

## Workflow

1. Inspect the project's actual stack, build commands and conventions. Trace one user journey through interface state, API request, authorization, data access and response handling.
2. Define the request/response contract, permission checks, input validation and failure states before changing code. Keep database migrations and external side effects explicit.
3. Implement the smallest coherent slice using existing dependencies. Separate interface presentation, domain logic and persistence; use parameterized queries and server-side authorization.
4. Run project-owned checks for the changed behavior: unit tests for rules, integration tests for permissions and persistence, and browser tests for the complete journey. Record which checks actually ran and any missing environments.
5. Prepare a migration, rollback and release plan where needed. Dependency installation, destructive data changes, external notifications and deployments require authorization appropriate to that action.

## Example

User: "Add a billing settings page."

Assistant: Inspect the existing billing integration and account permissions, define the settings API, implement loading/empty/error states, and test that one account cannot modify another account's settings. Prepare provider writes and deployment separately from local implementation; do not create a paid subscription merely to test the interface.

## Bundled references

- [Stack inspection checklist](references/tech_stack_guide.md)
- [Boundary and contract review](references/architecture_patterns.md)
- [Implementation and verification workflow](references/development_workflows.md)

## Helper status

The three retained Python helpers are unimplemented historical skeletons. They intentionally fail with a nonzero exit and do not scaffold, analyze quality or certify a project. Use the project's real tools; do not report an empty findings list as a clean audit. No executable installation or production deployment is supplied by this skill.

## Limitations

- Stack and provider compatibility must be checked in the actual project.
- The references are review checklists, not complete application templates.
- Passing a subset of tests does not prove security, performance or deployment readiness.
- Do not infer permission to change accounts, billing or production resources from a request for a code review.
