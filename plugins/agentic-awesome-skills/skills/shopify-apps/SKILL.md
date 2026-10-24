---
name: shopify-apps
description: Expert patterns for Shopify app development including Remix/React
  Router apps, embedded apps with App Bridge, webhook handling, GraphQL Admin
  API, Polaris components, billing, and app extensions.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Shopify Apps

Expert patterns for Shopify app development including Remix/React Router apps,
embedded apps with App Bridge, webhook handling, GraphQL Admin API,
Polaris components, billing, and app extensions.

<!-- Modified 2026-10-23: deployment and tenant/privacy boundaries; Apache-2.0 retained. -->

## Integration limits

Use the authorized development store/app, minimum scopes and protected-customer-data approvals; accessScopes does not prove protected-data approval. These legacy Remix/2024 API snippets are incomplete and require current generated SDK/template/schema validation. Test billing with explicit test mode and require merchant approval; production deploy/config/scopes/subscriptions and notification sends need task authority. Never log access tokens or customer payloads. Store tenant identity from verified sessions/webhooks and enforce it for every resource operation. No app/runtime was executed in this review.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- User mentions or implies: shopify app
- User mentions or implies: shopify
- User mentions or implies: embedded app
- User mentions or implies: polaris
- User mentions or implies: app bridge
- User mentions or implies: shopify webhook

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
