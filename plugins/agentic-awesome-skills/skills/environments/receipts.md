# environments: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Keep the principle and swap the mechanism on another stack.

- `Undated`: The rules were learned on Next.js (App Router) + Supabase + Clerk + Netlify, by several products: a live Q&A product, a monitoring product that also runs Workers and worker boxes, and others, named here only by kind.

## The target is stated, never inferred.

- `2026-09-16`, an MCP configuration named production while the product's instructions still blessed migration writes through it.

- `2026-10-23`, a monitoring product found `db push --linked` with production's ref writing to the linked development project; `2026-10-25`, a probe of the current CLI saw the first request go to the typed ref instead.

## Separate development and production resources and key sets.

- `2026-10-24`, a monitoring product's inventory found the same DNS-provider token, cloud token and root SSH key in both.

## Record each environment's verified resources, check date and proving command.

- `2026-09-15`, a product's former development database was promoted to production and a new development branch created.

## Every new environment variable gets three things in the same change.

- `2026-10-10`, a product's `.env` held the Clerk secret key in the publishable variable; caught before anything was built with it.

## A planned rotation revokes last.

- `2026-10-24`, a monitoring product rotated its identity provider's production key on the app's host only; a Worker still held the old key, so deleting it would have silently stopped members' email.
