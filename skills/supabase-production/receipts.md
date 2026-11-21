# supabase-production: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Where Supabase's defaults or quickstarts contradict this skill, this skill wins.

- `Undated`: They were learned on Next.js (App Router) + Supabase Postgres + Clerk + Netlify, across several products. Among them were a live Q&A product with an anonymous audience and a monitoring product that runs Workers and worker boxes beside the app, named here only by kind.

## RLS is on with zero policies on every table: deny-all for every role that cannot bypass it.

- `2026-09-16`, a review round pinned legacy grants separately from new objects.

## The target must be stated rather than inherited.

- `2026-10-23`, a monitoring product found `db push --linked --project-ref <production ref>` writing to the linked development project.

- `2026-10-25`, a probe of CLI 2.122.0 saw the first request of `db push`, `migration list` and `db query` go to the typed ref.

- `2026-11-02`, until this date this skill kept the CLI linked to development.

- `2026-09-16`, the MCP config named production while the product's rules still blessed migration writes through it.

## Know whether a push applies migrations; never assume either way.

- `2026-09-16`, three migrations were absent from production through a handoff that called the release verified.

- `2026-10-24`, a monitoring product found the integration attached to production with branching on; its five promotions that day found nothing pending, because each had applied by hand first.

## Keep new schema compatible with every build still serving.

- `2026-09-21` and `2026-10-11`, one action failed in each product until the build finished.

- `2026-10-22`, a monitoring product: a grant revocation sat beside the additive migration, so one push would have applied both while its worker boxes still needed the grants.

## Separate development and production projects, each with its own key set.

- `2026-09-15`: the former development project was promoted to production and a new development branch created.

## Assert scheduled jobs through the catalog suite's available route.

- `2026-11-07`, a live Q&A product whose catalog suite reads through the data API. The scheduler's role was read in its database.

## Give it an outside witness.

- `2026-11-07`, a live Q&A product: its adoption pass found a deletion job absent from the catalog suite and external monitoring.

## Apply development without asking only when nobody else depends on it.

- `2026-10-22`, a monitoring product's owner, about a development project only they used: "This is dev. Nobody uses it."

## The CLI is never linked, and needs no token.

- `2026-10-31`, an evals product's owner, asked for a token so the CLI could be linked: "what for?". Every command its build needed took `--db-url`.
