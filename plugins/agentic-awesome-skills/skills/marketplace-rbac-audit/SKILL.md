---
name: marketplace-rbac-audit
description: "Audit multi-role marketplace authorization across roles, resource ownership, tenant boundaries, and order-state transitions; use when access rules need evidence, not UI assumptions."
category: security
risk: safe
source: self
source_type: self
date_added: "2026-09-12"
author: mosinlshaikh
tags: [marketplace, rbac, authorization, access-control, security]
tools: [claude, cursor, codex, gemini]
---

# Marketplace RBAC Audit

## Overview

Audit authorization in marketplaces where customers, vendors, fulfillment staff, couriers, support agents, administrators, and service accounts act on shared orders and resources. Build an explicit policy matrix, trace enforcement from route to data access, and verify both allowed and denied behavior without treating hidden UI controls as security.

This is a read-only review by default. It does not grant permission to scan a live service, create test accounts, alter permissions, or access another person's data.

## When to Use This Skill

- Reviewing authorization in a marketplace, delivery platform, multi-vendor store, or fulfillment system.
- Adding or changing roles, administrative powers, ownership rules, or order-state transitions.
- Investigating whether one customer, vendor, courier, hub, or tenant can access another party's resources.
- Preparing negative authorization tests before release or after an access-control incident.

Do not use this skill for authentication design alone, generic multi-tenant architecture, offensive ID enumeration, or penetration testing outside an explicitly authorized test environment.

## Establish the Authorization Contract

Record the actual actors and resources instead of assuming standard role names.

For each actor, capture:

- identity source and role-assignment authority;
- tenant, organization, store, hub, region, or assignment scope;
- resource relationships such as owner, seller, assigned courier, servicing hub, or support case;
- permitted operations and state transitions;
- emergency, support, delegated, and service-account access;
- audit-log and approval requirements for privileged actions.

Separate these policy dimensions:

1. **Role** — what this actor type may generally do.
2. **Relationship** — which specific object the actor may access.
3. **Tenant or operational scope** — where the permission applies.
4. **Resource state** — whether the operation is valid now.
5. **Field scope** — which attributes may be viewed or changed.

A matching role is not sufficient when ownership, assignment, tenant, state, or field rules fail.

## Build the Policy Matrix

Create one row per meaningful actor-resource-operation combination.

| Field | Required content |
|---|---|
| Actor | Role plus relevant tenant/store/hub/assignment |
| Resource | Order, product, inventory, payout, address, profile, delivery, refund, or admin object |
| Operation | List, view, create, update, delete, assign, transition, refund, export, or impersonate |
| Relationship | Owner, seller, assignee, servicing hub, same tenant, or none |
| Required state | Order/payment/delivery state in which the operation is allowed |
| Field scope | Allowed and prohibited fields |
| Expected result | Allow or deny, including disclosure policy such as 403 versus 404 |
| Enforcement point | Route, policy layer, service, query predicate, database policy, or queue consumer |
| Evidence | Code reference, test ID, request ID, or audit event |

Mark an undocumented decision as **UNDEFINED**; do not invent a permission merely because current code allows it.

## Audit Workflow

### 1. Inventory Entry Points

Map HTTP routes, GraphQL operations, server actions, background jobs, webhooks, file downloads, exports, administrative tools, and queue consumers that access marketplace resources. Include bulk operations and alternate HTTP methods.

### 2. Trace Identity and Scope

For every entry point, trace how the authenticated principal becomes an authorization context. Confirm that role, tenant, store, hub, assignment, and delegation claims come from a trusted server-side source and are current enough for the operation.

Do not accept actor, tenant, owner, vendor, hub, courier, price, payout, or privilege fields from the request merely because they are present in a signed-in session.

### 3. Trace Object Authorization

Follow the resource identifier from request to data access. Prefer a scoped query or atomic mutation that includes every required predicate:

~~~text
resource_id
+ tenant/store/hub scope
+ owner/seller/assignee relationship
+ permitted current state
= authorized object or no match
~~~

A separate “check then update” sequence may race with reassignment or state changes. Record where a transaction, conditional update, row-level lock, or equivalent consistency control is required.

### 4. Check Field-Level Authorization

Compare request and response schemas by role. Verify that mass assignment, serializer defaults, ORM spreads, exports, and error payloads cannot expose or change protected fields.

Examples of sensitive fields include:

- another customer's address or contact details;
- vendor settlement and payout configuration;
- courier identity or precise location outside an active delivery need;
- internal fraud, moderation, cost, or risk fields;
- role, tenant, hub, assignment, price, refund, and payment-state attributes.

### 5. Audit State Transitions

Build an allowlist of valid transitions with authorized actors and invariants. For example, “assigned courier may mark picked up” is incomplete unless the order is assigned to that courier, is in the expected prior state, belongs to the same operational scope, and has not been cancelled.

Reject client-selected final states when the server should derive the transition. Verify idempotency and concurrency behavior for assignment, cancellation, refund, fulfillment, and delivery confirmation.

### 6. Verify Indirect Paths

Apply the same policy to:

- nested resources and parent-child ownership;
- invoice, receipt, label, media, and document downloads;
- search, autocomplete, counts, and analytics;
- bulk update, import, and export;
- webhook and queue-triggered changes;
- cached responses and pre-signed URLs;
- support tools, impersonation, and “view as user” modes.

UI visibility is evidence of presentation only. A hidden button, disabled control, or unpublished link does not enforce authorization.

### 7. Design Negative Tests

Use synthetic identities and records in an authorized test environment. For every important allowed case, add the nearest denied cases:

- same role, different owner;
- same role, different vendor/store/hub/tenant;
- correct role, wrong assignment;
- correct relationship, invalid resource state;
- expired, disabled, removed, or downgraded membership;
- protected field added to an otherwise valid request;
- bulk request containing one unauthorized object;
- stale session after role or assignment revocation;
- guessed nested-resource or download identifier.

Do not use real customer records as “victim” data. Do not enumerate identifiers or run live probes without explicit target authorization and a bounded test plan.

### 8. Report Evidence and Gaps

Report confirmed behavior separately from code inference. A route with no test is not proven secure; mark it **NOT VERIFIED**. A permission with no owner is **UNDEFINED**.

## Findings Format

~~~text
MARKETPLACE RBAC AUDIT
Revision: <immutable source revision>
Environment: <code review or authorized test target>
Observed at: <UTC timestamp>

POLICY COVERAGE: <covered rows>/<required rows>
ALLOWED-PATH TESTS: PASS | FAIL | NOT VERIFIED
DENIED-PATH TESTS: PASS | FAIL | NOT VERIFIED
OBJECT OWNERSHIP: PASS | FAIL | NOT VERIFIED
TENANT/STORE/HUB ISOLATION: PASS | FAIL | NOT VERIFIED
STATE TRANSITIONS: PASS | FAIL | NOT VERIFIED
FIELD-LEVEL ACCESS: PASS | FAIL | NOT VERIFIED
INDIRECT PATHS: PASS | FAIL | NOT VERIFIED
PRIVILEGED ACTION AUDITABILITY: PASS | FAIL | NOT VERIFIED

OVERALL: PASS | FAIL | INCOMPLETE
Findings: <IDs with actor, resource, operation, evidence, and impact>
Undefined policies: <explicit list>
Untested paths: <explicit list>
~~~

## Example Policy Rows

| Actor | Resource and operation | Relationship/state | Expected |
|---|---|---|---|
| Customer | View order | Own order | Allow |
| Customer | View order | Another customer's order | Deny |
| Vendor operator | Update product | Product belongs to vendor; editable state | Allow permitted fields only |
| Vendor operator | View payout | Different vendor | Deny |
| Courier | Update delivery status | Assigned delivery; valid next state | Allow one transition |
| Courier | Read customer location | Unassigned or completed delivery | Deny |
| Hub operator | Assign courier | Order belongs to serviced hub; assignable state | Allow |
| Hub operator | Refund payment | No refund permission | Deny |
| Support agent | View order | Active support purpose | Allow redacted fields and audit access |
| Administrator | Change user role | Explicit privilege plus required approval | Allow and emit audit event |

## Severity Guidance

- **Critical:** cross-tenant administrative access, payout destination changes, role escalation, mass customer-data access, or unauthorized refunds.
- **High:** cross-owner order/address access, unauthorized fulfillment transitions, courier location exposure, or vendor isolation failure.
- **Medium:** excessive fields, missing privileged audit events, stale-role access, or enumeration through counts and metadata.
- **Low:** policy/documentation gaps with no demonstrated access bypass.

Base severity on demonstrated reach, sensitivity, prerequisites, and business impact. Do not inflate severity from a role name alone.

## Best Practices

- Treat authorization as policy over role, relationship, scope, state, and fields.
- Default new actor-resource-operation combinations to deny until explicitly defined.
- Enforce policy server-side at every entry point, close to the data mutation.
- Prefer reusable policy functions plus negative tests over scattered role-name checks.
- Make role and assignment revocation effective within a defined, tested interval.
- Require explicit approval and immutable audit events for high-impact privileged actions.
- Re-run affected matrix rows after route, schema, role, workflow, or ownership changes.

## Common Pitfalls

- **Problem:** The frontend hides unauthorized actions.
  **Solution:** Test the backend operation directly with a synthetic unauthorized principal.

- **Problem:** A vendor role can access every vendor's records.
  **Solution:** Require both the role and the resource's vendor/store relationship in the query.

- **Problem:** A courier can submit any delivery state.
  **Solution:** Authorize one server-defined transition from the current state for the assigned courier.

- **Problem:** An admin bypass silently applies to support agents.
  **Solution:** Define separate privileged operations, field scope, approval requirements, and audit events.

- **Problem:** List endpoints are scoped but exports or downloads are not.
  **Solution:** Reuse the same policy at every direct and indirect resource path.

## Limitations

- A source review cannot prove runtime identity-provider configuration or database policies without corresponding evidence.
- Negative tests prove only the identities, resources, operations, states, and environments exercised.
- This skill does not replace threat modeling, authentication review, privacy assessment, or an authorized penetration test.
- Marketplace policy varies by product and jurisdiction; unresolved business decisions must remain **UNDEFINED**.

## Security & Safety Notes

- Keep the audit read-only unless the user separately authorizes test creation or remediation.
- Use synthetic identities and records; never test by accessing unrelated real users' data.
- Redact tokens, session material, personal data, internal identifiers, and sensitive topology from evidence.
- Stop before live probing, privilege changes, impersonation, bulk exports, or state-changing requests unless the exact action and target are authorized.

## Related Skills

- **@api-security-best-practices** — use for broader API authentication, validation, abuse controls, and secure implementation patterns.
- **@saas-multi-tenant** — use for designing tenant isolation and PostgreSQL row-level security.
- **@idor-testing** — use only for explicitly authorized offensive IDOR testing.
