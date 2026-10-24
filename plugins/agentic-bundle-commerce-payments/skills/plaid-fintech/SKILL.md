---
name: plaid-fintech
description: Expert patterns for Plaid API integration including Link token flows, transactions sync, identity verification, Auth for ACH, balance checks, webhook handling, and fintech compliance best practices.
metadata:
  aas-risk: critical
  aas-source: vibeship-spawner-skills (Apache 2.0)
  aas-date-added: '2026-02-27'
---

# Plaid Fintech

Expert patterns for Plaid API integration including Link token flows,
transactions sync, identity verification, Auth for ACH, balance checks,
webhook handling, and fintech compliance best practices.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- User mentions or implies: plaid
- User mentions or implies: bank account linking
- User mentions or implies: bank connection
- User mentions or implies: ach
- User mentions or implies: account aggregation
- User mentions or implies: bank transactions
- User mentions or implies: open banking
- User mentions or implies: fintech
- User mentions or implies: identity verification banking

## Example

**User request:**

> Use @plaid-fintech for this task: Expert patterns for Plaid API integration including Link token flows, transactions sync, identity verification, Auth for ACH, balance checks, webhook handling, and fintech compliance best practices.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Integration boundaries

All client routes need authenticated server sessions, tenant/item/account checks and CSRF controls where cookies authenticate requests; req.user, db, encryption, queue and verifier helpers are not bundled. Return only necessary client fields and redact SDK errors, tokens and banking data. Consolidate the repeated webhook routes into one verified dispatcher.

The sync fragment now stops before writes until bounded staging, per-item serialization and atomic changes-plus-cursor commit are implemented; restart the entire staged update from its original cursor on mutation errors, with a retry/deadline bound. Access tokens are long-lived secrets, not permanently valid authorization: handle revocation, removal and update states. Balance responses can be null/stale and do not reserve funds; current balance is not a safe substitute for known available funds. Identity Match is not Identity Verification or proof of a debit mandate. Do not use the first account arbitrarily. Confirm product availability/pricing, token expiry and history against actual responses/current documentation. No payment, Link connection, webhook or Plaid API call was executed.
