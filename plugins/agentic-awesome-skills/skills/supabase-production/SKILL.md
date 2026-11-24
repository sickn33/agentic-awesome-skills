---
name: supabase-production
description: 'A Supabase query, RPC or migration, ''db push'', ''supabase link'', RLS or grants, a Supabase error: server-only keys, deny-all RLS, migrations via the CLI.'
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

# Supabase in production: the choices its own skills cannot make

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

A Supabase query, RPC or migration, 'db push', 'supabase link', RLS or grants, a Supabase error: server-only keys, deny-all RLS, migrations via the CLI.


**Decide how the product uses Supabase before following API guidance.** Supabase's own agent skills know the API. They cannot decide key holders, RLS purpose, migration delivery or whether a push applies migrations. Those decisions are here.

**Where Supabase's defaults or quickstarts contradict this skill, this skill wins.** The mechanisms use Next.js (App Router), Supabase Postgres, Clerk and Netlify.

**Keep these principles on any hosted Postgres.** Under them:

- each runtime holds its own credential, and only the app server holds the one that bypasses RLS;
- isolation lives in code you can test;
- schema is files, applied to a target you state rather than one a config file remembers;
- a deploy and a migration are two separate acts unless an integration joins them, so know which you have.

## Supabase's own skills: get them, prefer them for the API

- **Use Supabase's own skills for its APIs and Postgres mechanics.** `supabase` covers any Supabase task: client libraries, auth, the CLI, the MCP server, schema changes. `supabase-postgres-best-practices` covers anything that lives in Postgres: tables, types, indexes, functions, migrations, RLS. Both come from the GitHub repository `supabase/agent-skills`.
- **Install and vendor the skills instead of relying on API memory.** Run `npx skills add supabase/agent-skills`. This uses the open `skills` CLI, and the Supabase dashboard's *Connect → MCP* page offers the same command (observed `2026-08`). Vendor them into the product's skills folder (`.claude/skills/` or `.agents/skills/`) so they load whenever Supabase is touched. Prefer them over training-era memory of the API.
- **Pin them.** A `skills-lock.json` at the repository root records each skill's source repository, its path and a content hash. `npx skills update` refreshes them on purpose, never by surprise.
- **Refuse vendor suggestions that contradict this skill.** These include `@supabase/ssr` and a key in the browser; RLS policies written to match an access model; applying a migration through the MCP; schema edits in the dashboard; `supabase link` to whichever project you are working on.

## The choices

1. **Only the app server holds the secret key.** One server-only module holds it, with no session persistence. No browser ever holds a Supabase key, so `@supabase/ssr`, the anon or publishable key in app code, and browser-side queries are all out, whatever the quickstarts show. **Give every other database runtime its own Postgres login, never the secret key.** For a Worker, worker box or job on another host, use one group role per component holding EXECUTE on that component's functions only, and one login per environment that cannot bypass RLS. A leaked login then does only what its component does. → `references/access-model.md § A second runtime`
2. **RLS is on with zero policies on every table: deny-all for every role that cannot bypass it.** RLS is therefore *not* the tenant isolation; the three authorization functions are (`saas-authorization`). Also:
   - revoke PUBLIC, `anon` and `authenticated` grants and the creator's default privileges, including Postgres's global default of EXECUTE to PUBLIC on new functions, which a per-schema revoke leaves in place;
   - make views `security_invoker = true`;
   - allow no `security definer` function except those a second runtime's login calls and a trigger that writes on a restricted writer's behalf (`transactional-email`), each with an empty `search_path`, pinned by exact signature in the catalog suite, and preferably in a schema the Data API does not expose;
   - have the catalog suite enumerate every schema it guards, future objects included.

   Legacy grants are pinned debt, never a default for new objects. Supabase's skill will offer to write policies matching your access model; there is none to match. → `references/access-model.md`
3. **Supabase never sees the identity provider's token.** Writes stay server-side. The one exception worth reopening is Realtime subscribed from the browser. It would need Clerk as a third-party auth provider plus a read-only policy scoped to the public resource. Decide it when Realtime arrives (when polling's delay is the complaint), not before.
4. **Schema changes are migration files, nothing else.** They are ordered, idempotent, and never edited after they are applied. The dashboard is read-only. Keep `supabase/config.toml` minimal. **The schema is the source, not memory.** Read the migrations newest first and the generated types before writing a query. → `references/migrations.md`
5. **A migration is applied by the CLI against a target you state, never through the MCP.** **The target must be stated rather than inherited.** Keep the CLI unlinked and pinned to 2.x. Each command names its own database with `--db-url`. Use `references/migrations.md § Applied by the CLI` for the commands, credential handling and version behavior.
6. **Use read-only MCP only for logs or advisors on a separate development project.** Verify its configured URL before relying on any answer. First setup and development on a branch of production use the CLI alone. → `references/migrations.md § The MCP is for looking`
7. **Know whether a push applies migrations; never assume either way.** The host's deploy builds and ships code and never touches the database. Supabase's GitHub integration applies migrations when *Deploy to production* is on: a push or merge to the git branch production tracks applies new migrations, racing the host's build (Supabase's docs, read `2026-10-25`). How to tell which case you are in: `references/migrations.md § Does a push apply migrations?` In both cases, at every promotion, read production's migration ledger and, after the owner's go, apply pending migrations by CLI before the push, so the push finds nothing to do. Shipping code that calls a function production does not have is a 500 on every affected page.
8. **Keep new schema compatible with every build still serving.** Applying migrations before pushing opens a window for the app and every separately deployed runtime.
   - **Keep every parameter the deployed call passes when replacing a function.**
   - **Keep contracting migrations outside `supabase/migrations/` until every runtime has moved.** Ship renames, drops and grant revocations still used by deployed builds in steps. Wait until every runtime runs the build no longer needing them: the next push applies every file in that directory.
   - **Name the compatibility window in the go/no-go.**

   Read `references/migrations.md § The window`.
9. **Separate development and production projects, each with its own key set.** The app refuses to boot on a partial configuration. Record the verified project and branch mapping with its date, and never infer the target from an old MCP configuration or the CLI's link. → `references/projects-and-backups.md`
10. **Read the gotchas before writing a query, a migration or a connection string.** Server reads must never be cached. PostgREST will not guess an ambiguous embed. `create or replace` cannot widen a return type. A refused delete changed its SQLSTATE in Postgres 18. Some error codes answer with misleading HTTP statuses, and a conflict raised as `40001` can arrive with no code at all. A plpgsql loop variable named like a table alias, and an array bound to a `jsonb` parameter in node-postgres, fail only at runtime. The generated types call every argument without a default non-null. supabase-js needs a global `WebSocket`. The direct database host is IPv6-only, and TLS is whatever each URL asks for. The hosted development project fails intermittently in three costumes. → `references/gotchas.md`

## Scheduled SQL with `pg_cron`

**Make scheduled SQL safe on every database its migration reaches.** A `cron.schedule` also reaches development branches. It runs as its scheduler (`cron.job.username`); read that role's `rolbypassrls`. If it bypasses RLS, the job's SQL is its only authorization (read `2026-11-07`).

**Assert scheduled jobs through the catalog suite's available route.** Enumerating `public` misses `cron`. On the CLI route (`references/access-model.md` § The schema catalog suite), assert each job's name, schedule and command. Read failures from `cron.job_run_details`. Through the data API, the service role sees neither: pg_cron shows a role only its own jobs, and `cron` is not exposed (observed `2026-11-07`). A definer function exposing them breaks the invoker rule. There, write the run's time in the transaction doing the work. Test that the newest is within a few intervals; `/health` can report the same record.

**Give it an outside witness.** Apply `uptime-monitoring`. Either ping the monitor's heartbeat URL on success through `pg_net`, keeping the secret URL in Vault, never a committed migration. Or report the newest successful run's age in `/health` and assert it in the monitor.

## Applying a migration

**Check the database URL inside the same command that uses it.** Follow `references/migrations.md § Applied by the CLI`. Load the verified target's connection string from its operator file into that command alone. Read the ledger first. If it is aligned, record no migration. Otherwise read the dry run, apply separately and read the ledger again. Regenerate the types from that target and run the tests.

**Apply development without asking only when nobody else depends on it.** The session agent applies it while nobody needs its data, demos or database for work. A delegated builder only names the command. Production runs separately, at release and only after the owner's go in the chat.

## Before a promotion

**Read production's migration ledger before every promotion.** Follow `references/migrations.md § Before a promotion`. Check the compatibility window for each pending migration and runtime. Apply pending files just before promoting, after the owner's go, and read the ledger again before promoting.

**Prove code and schema agree after the deploy.** Use one read through an id that cannot exist (`references/migrations.md § After the deploy`). Apply `release-gate` for the release and its separately deployed runtimes.

## Setting it up the first time

1. **Use a separate development project unless the owner chooses a branch.** For a development branch of production, use the branch's own connection string and app keys. Leave the MCP unconfigured. A project scope can reach the parent, production (`environments`, `references/domain-and-provider-access.md`). Production gets its own project at go-live. Apply `release-gate`.
2. **Keep keys and the connection string outside chat and committed files.** From *Project Settings → API*, take the project URL, the secret key and the publishable key (for tests only) for `.env`. Rotate any key that touched chat. From *Connect*, have the owner save the development URL to the uncommitted development operator file. Follow `references/migrations.md § Applied by the CLI` for quoting and the target check. Use the session pooler on a machine without IPv6 (`references/gotchas.md`).
3. **The CLI is never linked, and needs no token.** Use the pinned CLI for setup, stating the database URL for each command. `supabase link` needs permission to read the secret key. `supabase login` through the browser creates a full-access token. If anyone logged in on this machine, have the owner sign out and revoke that token. Apply `environments` § Who holds what for the check.
4. **Verify the development target and configuration before building.** Run the development ledger read with the verified URL from `references/migrations.md § Applied by the CLI`. Confirm the database has no tables, neither `supabase/.temp/project-ref` nor `supabase/.temp/linked-project.json` exists, and `.env` has no placeholders.

**Name the workspace table, three functions and first migration in the plan.** Do this in the plan introducing the database; apply `saas-authorization`.

## Keep a record of every dashboard setting

**Record every dashboard setting with its verification date.** Use CLI or API read-backs where available, screenshots where not, in the product's integration notes:

- the production project's branch list (the owner's read): which git branch production tracks, and which branch is development where the owner chose one;
- the GitHub integration, and whether *Deploy to production* is on;
- the backup and point-in-time-recovery settings;
- SSL enforcement and network restrictions;
- the third-party auth provider, if Realtime ever reopens the boundary.

**A screenshot records intended configuration, not the live value.** Re-read the live value (the CLI, the API) before relying on it.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

Every schema change reached each database through a repository migration. No client key can read a table directly (the catalog test holds deny-all), and every dashboard setting is recorded.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/access-model.md` | the app server's client and its timeout; RLS deny-all, grants and their defaults, invoker views, the definer exceptions; a second runtime's login; what the permissions doc records; the Realtime exception; the integration and catalog suites and the rules that came from their bugs | creating the client; adding a table, view or function; giving another runtime database access; writing or debugging an RLS, grant or integration test |
| `references/migrations.md` | migration files and parking one that must wait; the CLI against a stated target; the ledger; optional diagnostics; whether a push applies migrations; the window between apply and deploy; after the deploy; rollback | writing, applying or reviewing a migration; any promotion; setting up optional diagnostics |
| `references/projects-and-backups.md` | dev and prod projects and branches, the verified mapping, keys and variables, backups and restore drills, incidents and keys | setting up environments; touching keys; planning backups; an incident |
| `references/gotchas.md` | every query, connection and platform gotcha, each with its receipt | writing a query, an RPC, a migration or a connection string; a Supabase error that makes no sense; a flaky integration run |

## When something is learned

- **Keep general Supabase lessons here with their receipts.** Include the date, what happened, the product named by kind.
- **Date platform behaviour because Supabase changes without notice.** Use "observed 2026-10". When it changes, correct the line; never leave the old one beside the new.
- **Keep product-specific facts in its own environments doc.** Include its refs, its Postgres majors, its ledger receipts.

**Write to the product's own records, whatever it calls them.** Integration notes hold each provider's configuration, as set and as last verified. The environments doc holds project identities, applied migrations and a dated environment-event log. The permissions doc records who may do what and how the database enforces it. The backlog holds deferred work, each with its reason and reopening trigger.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/supabase-production).
