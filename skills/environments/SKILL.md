---
name: environments
description: 'Adding a variable or secret, ''set up production'', a domain or a provider token, ''which database is this'', a leaked key: dev and production for an AI-built app, backups, incidents.'
risk: critical
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Environments — development, production, and what moves between them

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Adding a variable or secret, 'set up production', a domain or a provider token, 'which database is this', a leaked key: dev and production for an AI-built app, backups, incidents.


**Keep two of everything, never mixed.** Record every claim about which is which with the date checked. This skill covers separating environments, moving configuration and secrets, and changing schema while code still serves. It also covers leaks, failures and rebuilding.

**Keep the principle and swap the mechanism on another stack.** These rules use Next.js (App Router), Supabase, Clerk and Netlify mechanisms after stating the principle.

**The product's own instructions come first.** Follow its names for the environments doc, variables doc and branches.

**Write to the product's records, whatever it calls them.** They hold:

- The environments doc: which resource each environment uses, verified and dated, ending in the environment log, one row per environment event;
- The variables doc: one row per variable, and where every copy of each secret lives;
- The env schema: the one module that validates configuration, at build and at boot;
- `.env`, the local configuration, never committed, and `.env.example`, its committed list of placeholders;
- The backlog: deferred work, each item with its reason and the trigger that reopens it.

## What binds

- **The target is stated, never inferred.** Every command that reads or writes an environment names it (a project ref, a URL, an instance) rather than inheriting it from whatever a config file was last left pointing at. A per-machine, gitignored config (an MCP server's, a CLI's link) may name production today and development tomorrow, and a CLI given both a link and a typed ref may follow either. So the database CLI is never linked: each environment's database is reached by its own connection string, and no command depends on which flag wins. **Operator tooling has no production default.** A command that writes to something both environments share (one DNS zone, one account) refuses to run until its target is named. `references/environments-and-branches.md § Operator commands`; the database mechanics are `supabase-production`.
- **Separate development and production resources and key sets.** Include operator credentials. Share none: a provider token or SSH key in both environments' files lets a development-checkout leak reach production. The app refuses to build and boot on a partial configuration. Production's generated secrets are generated afresh, never copied from development.
- **Record each environment's verified resources, check date and proving command.** Re-read it, never remember it: mappings move. A line in the environments doc still holding a placeholder is a thing that has not happened yet.
- **Secrets are never in the repository, a URL, a log line, a command line or a client bundle.** Every module that imports one is marked server-only (on Next.js, `import "server-only"`), so a client import fails the build. Only `NEXT_PUBLIC_*` values reach the browser.
- **Every new environment variable gets three things in the same change.** Add a placeholder in `.env.example`, a row in the variables doc, and a line in the env schema that fails when it is missing. **The schema runs at build and dev start, not only at boot.** `NEXT_PUBLIC_*` values enter the client bundle during build, before a boot check could catch a leak. It checks each key's shape where the vendor gives one and never echoes a value. `references/variables.md`.
- **A value you generate rather than fetch is generated now.** Generate cookie-signing secrets, token peppers and similar values, write them where that environment's values live, and name them in your summary. Put development's in the development checkout's `.env`. Generate production's afresh in the production operator file outside the development checkout until go-live step 3 puts it on the host. Never use a `.env*` file there: `next build` reads `.env.production`. Nobody can look up a generated value; an empty placeholder causes boot failure without an instruction. **One that seals or tags stored data can never be replaced without breaking that data.** Keep an off-machine copy (`references/variables.md § The kinds of variable`).
- **Know whether a push applies migrations, and apply them by hand before the push.** Apply production's only after the owner's go. Applying before the push opens a window where every build still serving, the app's and each separately deployed runtime's, meets the new schema. Every pending migration is written to survive that window, a contracting one waits outside the migrations directory until every runtime has moved past it, or the outage is named in the go/no-go. `references/migrations-window.md`.
- **A tunnel's address is public.** Development only, the link to the owner and nowhere else (never a deployed runtime's configuration), closed when the owner is done. `references/environments-and-branches.md § Showing development to the owner`.
- **Every holder keeps its own copy of a secret.** This includes the host, each Worker, each box, and the operator's `.env` that a deploy uploads again. Keep a map of every copy. **A planned rotation revokes last.** Make the new value beside the old, put it into every holder and deploy each, check it works, then revoke the old one. Revoking first breaks whatever still holds the old value, and a deploy from an operator file not yet updated puts the old value back. A push redeploys only the app; the rest is `release-gate`. `references/variables.md § Where every copy lives`, `§ Rotating`.
- **A leaked key is the same order, done at once.** Write it in the environment log. If it is being used against you, revoke first and accept that every holder fails until it has the new value. If a build or a dev server ever ran with a secret in a public variable, that secret was served: rotate it.
- **A backup is *not verified* until a restore drill has run.** Record the drill's date and result. A provider's schedule is not evidence, and **a database backup is not the system**: list what no backup holds and how each comes back. Once the product runs more than its host builds, keep a runbook for rebuilding both environments from nothing. `references/data-and-incidents.md § Backups and restore`, `references/rebuild-from-nothing.md`.
- **No screen and no legal page promises automatic deletion until the job that deletes exists.**

## When you are…

| When you are… | Read |
|---|---|
| setting up an environment, recording which database or instance is which, naming branches, writing an operator command | `references/environments-and-branches.md` |
| showing a change to the owner before it is deployed | `references/environments-and-branches.md § Showing development to the owner` |
| adding, renaming or reading an environment variable; adding a secret; before go-live | `references/variables.md` |
| pointing a domain at the product; giving the agent a provider's token; which host goes behind a proxy; before the first users | `references/domain-and-provider-access.md` |
| rotating a key; finding every place a secret is held | `references/variables.md § Where every copy lives`, `§ Rotating` |
| writing a migration the deployed code will meet; renaming or dropping a column; revoking a grant; promoting a release with pending migrations | `references/migrations-window.md` |
| promising retention, deleting a workspace, listing what is held about people, backups, an incident, a leaked key, writing the environment log | `references/data-and-incidents.md` |
| rebuilding an environment from empty accounts, or writing the runbook for it | `references/rebuild-from-nothing.md` |

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

Every variable the code reads is recorded with where it lives in each environment. Development never reaches production's data, and one rotation would retire a leaked key.

## Files

| File | Holds |
|---|---|
| `references/environments-and-branches.md` | the environments table; recording the verified mapping and the inventory; branches and sites; operator commands; showing development to the owner through a Cloudflare quick tunnel |
| `references/variables.md` | the variables doc's columns; the kinds of variable and how each is handled; the env schema's contract; setting values on the host; where every copy lives; rotating; the pre-go-live checklist |
| `references/domain-and-provider-access.md` | who creates and scopes each provider credential and what stays the owner's; the domain's order, from the nameservers to a certificate; proxy or DNS-only per host; what to tighten before the first users |
| `references/migrations-window.md` | whether a push applies migrations; the window between applying a migration and every runtime's new build going live; compatible changes; expand and contract, for columns and for grants; what to name in the go/no-go |
| `references/data-and-incidents.md` | data that expires; what we hold about people; backups, and what no backup holds; incident basics, the symptom table and panic buttons; a leaked key; the environment log |
| `references/rebuild-from-nothing.md` | the runbook for recreating both environments from empty accounts: what the repository cannot reproduce, the order, and what each step needs |

Related skills:

- `release-gate` (the release checklist, rollback, the runtimes a push does not redeploy, Netlify's edge)
- `supabase-production` (the migration ledger, `--db-url` and why the CLI is never linked, a second runtime's database login, database gotchas)
- `clerk-production` (the production instance, its keys and DNS)
- `transactional-email` (one provider server per environment, the development redirect)
- `test-harness` (the harness's own variables and the pinned `.env`)
- `saas-authorization` (the threat model the secrets rules come from)
- `shipping-artifacts` (the variables doc as a reviewer reads it).

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/environments).
