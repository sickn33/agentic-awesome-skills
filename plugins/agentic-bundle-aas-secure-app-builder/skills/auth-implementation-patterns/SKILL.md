---
name: auth-implementation-patterns
description: Implement or review authentication and authorization with explicit token, session and resource-access boundaries.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Authentication & Authorization Implementation Patterns

Build secure, scalable authentication and authorization systems using industry-standard patterns and modern best practices.

## Use this skill when

- Implementing user authentication systems
- Securing REST or GraphQL APIs
- Adding OAuth2/social login or SSO
- Designing session management or RBAC
- Debugging authentication or authorization issues

## Do not use this skill when

- You only need UI copy or login page styling
- The task is infrastructure-only without identity concerns
- You cannot change auth policies or credential storage

## Instructions

- Define users, tenants, flows, and threat model constraints.
- Choose auth strategy (session, JWT, OIDC) and token lifecycle.
- Design authorization model and policy enforcement points.
- Plan secrets storage, rotation, logging, and audit requirements.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Safety

- Never log secrets, tokens, or credentials.
- Enforce least privilege and secure storage for keys.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Worked example

Input: an Express application accepts a user's login and keeps the pre-login session ID. Read the bundled playbook, regenerate the session after credential verification, save only required identity fields, and verify that the old cookie cannot access `/api/profile`. Also test failed login, logout and store failure. Expected: successful login changes the session ID; failed login grants no access.

## Inputs and prerequisites

Record the installed framework/SDK versions, identity provider, tenant model, credential store and test environment. Supply project-specific database adapters and request schemas; examples are integration sketches, not a runnable identity service.

## Limitations

- JWT validation does not establish resource ownership; enforce tenant and object policy on reads and writes.
- Refresh rotation requires atomic persistence and concurrency tests; the issuance example alone does not provide it.
- Cookie flags do not replace CSRF protection, and secure-cookie behavior needs the actual HTTPS/proxy configuration tested.
- Provider integrations and password policies must be checked against current primary documentation and the application's threat model.
