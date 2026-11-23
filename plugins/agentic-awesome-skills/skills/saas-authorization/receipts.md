# saas-authorization: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Decide who may act on what across every tenant boundary.

- `Undated`: The rules were learned building several products with coding agents on Next.js (App Router) + Supabase Postgres + Clerk + Netlify. Among them were a live Q&A product with an anonymous audience and a monitoring product with API tokens and background workers. They appear here only as examples, named by kind.

## Everything belongs to a workspace, and the product keys on its own row.

- `2026-10-31`, an evals product left authorship out of its first version because this rule gave it no recipe.

## Check permissions, not roles.

- `2026-09-16`, a control was shown under one permission while its action checked another.

## What a screen *says* is gated too.

- `2026-09-17`, two lifecycle states promised the second role actions reserved for the first.

## Invariants are database constraints, not application code.

- `2026-09-16`: A missing quota is an error, never an entitlement.

- `2026-09-03`: A limit of N is a lock and a count, and then every write must go through the function.
