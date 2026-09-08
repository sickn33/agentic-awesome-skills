---
name: graphql
description: GraphQL gives clients exactly the data they need - no more, no
  less. One endpoint, typed schema, introspection. But the flexibility that
  makes it powerful also makes it dangerous. Without proper controls, clients
  can craft queries that bring down your server.
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# GraphQL

GraphQL gives clients exactly the data they need - no more, no less. One
endpoint, typed schema, introspection. But the flexibility that makes it
powerful also makes it dangerous. Without proper controls, clients can
craft queries that bring down your server.

This skill covers schema design, resolvers, DataLoader for N+1 prevention,
federation for microservices, and client integration with Apollo/urql.
Key insight: GraphQL is a contract. The schema is the API documentation.
Design it carefully.

2025 lesson: GraphQL isn't always the answer. For simple CRUD, REST is
simpler. For high-performance public APIs, REST with caching wins. Use
GraphQL when you have complex data relationships and diverse client needs.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- User mentions or implies: graphql
- User mentions or implies: graphql schema
- User mentions or implies: graphql resolver
- User mentions or implies: apollo server
- User mentions or implies: apollo client
- User mentions or implies: graphql federation
- User mentions or implies: dataloader
- User mentions or implies: graphql codegen
- User mentions or implies: graphql query
- User mentions or implies: graphql mutation

## Example

**User request:**

> Use @graphql for this task: GraphQL gives clients exactly the data they need - no more, no less.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
