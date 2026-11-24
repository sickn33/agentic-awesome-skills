# The access model: one key holder, deny-all, proved

## Contents

- Only the app server holds the secret key
- RLS on, zero policies, grants revoked
- A second runtime: its own login, its own functions
- What the permissions doc records
- The Realtime exception
- The integration suite
- The schema catalog suite
- Rules that came from these suites' bugs

## Only the app server holds the secret key

- **One server-only module creates the client**, with the secret key and no session persistence. Mark it `server-only` so that a client-side import fails the build.
- **No browser ever holds a Supabase key.** `@supabase/ssr`, the anon or publishable key in application code, and browser-side queries are all out, whatever the quickstarts show. The publishable key exists in the environment only for tests (§ The integration suite).
- **No other runtime holds the secret key either.** A Worker, a worker box or a job on another host that needs the database gets its own login (§ A second runtime). Supabase's own guidance goes half the way: a separate secret key per backend component, never one shared (its API keys docs, read 2026-10-25). Each of those keys still bypasses RLS and reaches every table, which is why a component here gets a login that cannot.
- **Its reads are never cached.** Next patches `fetch` and the client uses it, so the client sets `cache: "no-store"`, and any page that reads live data says `export const dynamic = "force-dynamic"` (`gotchas.md`).
- **It has a per-request timeout:** `AbortSignal.timeout` in its `fetch`, retried only for idempotent calls. Or the backlog (deferred work, each item with its reason and the trigger that reopens it) holds a row that says why it has none. Without a timeout, a stalled RPC uses up a whole test's budget and holds a page render until the platform kills it.
- **Record it in the integration notes** (each provider's configuration, as set and as last verified):
  - the one client and how it connects (secret key, no session persistence, `no-store`) and its timeout;
  - every other runtime's login, its group role and how it connects;
  - the RLS posture, and the catalog suite that proves it, with how it reaches the database and which ref it targets;
  - that migrations go through the CLI, each database by its own `--db-url`, the CLI never linked;
  - the per-machine, read-only MCP connection if a separate development project uses one for logs or advisors (`migrations.md` § The MCP is for looking);
  - backups.

## RLS on, zero policies, grants revoked

**RLS is on, with zero policies, on every table.** That is deny-all for every role that cannot bypass RLS, which is every key and login except the secret key. RLS is therefore *not* the tenant isolation. The three authorization functions in server code are, and they are tested route by route (`saas-authorization`). RLS is the backstop: if a key other than the secret one ever leaks or is shipped by mistake, it reads nothing.

Supabase's skill will offer to write policies matching your access model. **There is no access model at the database layer to match**, so decline it.

Around the tables:

- **Revoke PUBLIC, `anon` and `authenticated` object grants, and the creator's default privileges**, so that objects created later start closed too.
- **Revoke Postgres's global default of EXECUTE to PUBLIC on new functions** with `alter default privileges revoke execute on functions from public`, with no `in schema`. A per-schema default can only add to the global one, so a schema-level revoke leaves every new function executable by PUBLIC. (`2026-10-22`, a monitoring product's third migration revoked the global default that its first migration's schema-level revoke had left in place.)
- **Views are `security_invoker = true`.** A definer view runs with its owner's rights and walks straight past RLS.
- **No function is `security definer`, except those a second runtime's login calls** (§ A second runtime) **and a trigger that writes on a restricted writer's behalf**, such as an email outbox's (`transactional-email`), each pinned by signature. The reason: a definer function in an exposed schema is a door the gateway can open.
- **Every function sets `search_path = ''`** and names every relation with its schema.
- **The catalog suite enumerates every schema it guards, future objects included**, rather than checking a fixed list. A fixed list covers only what someone remembered to add.
- **Legacy grants are pinned debt, not a default for new objects.** Record their scope and default-privilege mechanics in the permissions doc. Put any deferred hardening in the backlog with a revisit trigger. (`2026-09-16`, a review round pinned legacy grants separately from new objects.)
- **The platform's own roles hold grants your migrations never wrote.** `service_role` holds every table privilege (`arwdDxtm`), not only the four your migrations grant, through the platform's default privileges for `postgres`. `supabase_admin`'s default grants in `public` cannot be altered by the role that runs migrations. Pin both in the catalog suite as known debt rather than asserting they are absent. (`2026-10-24`, a monitoring product's catalog read on development.)

## A second runtime: its own login, its own functions

When something other than the app server must reach Postgres, such as a Worker, a worker box or a scheduled job on another host, it connects as its own Postgres login. It never holds the secret key, which bypasses RLS and reaches every table.

- **One NOLOGIN group role per component.** It holds USAGE on its schema and EXECUTE on that component's functions only, with no table, sequence or `CREATE` privilege anywhere. A leaked login then does only what its component does.
- **Its functions are `security definer`**, because the group has no table privileges to invoke them with. Each one:
  - sets `search_path = ''` and qualifies every name;
  - is executable by its group alone, with PUBLIC, `anon`, `authenticated` and `service_role` revoked;
  - is pinned by exact signature in the catalog suite, which fails on any definer function not on the list. A pin compared as text is written the way the catalog prints it, with no spaces: `oid::regprocedure::text` gives `worker.claim_job(uuid,uuid,text)` (`2026-10-31`, an evals product);
  - preferably lives in a schema the Data API does not expose, so the gateway cannot reach it at all.
- **Logins are per environment, and are not migration contents**, because a login carries a password.
  - Migrations create the group roles and their grants. Each environment's logins are made by a script or by hand.
  - Each login is `LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`, a member of exactly one group, with no direct grant.
  - The password is generated locally and never printed. It is saved to the operator's environment file *before* the role is created, so a crash cannot leave a login whose password nobody has. It reaches the database in a temporary file outside the repository, over a URL that asks for TLS, and the file is deleted in the same step; never on a command line (`projects-and-backups.md § Incidents and keys`).
  - The script reads the login back (its attributes, its one membership, its function list) and refuses to reuse an existing login that holds more.
- **Prove the boundary with a real login.** An integration test connects as a no-grants member of the group and asserts SQLSTATE `42501` on every table, on the other components' functions and on one of the app's functions. Then it creates a function inside a rolled-back transaction, to prove that new functions grant the group nothing.
- **Behind a pooling proxy that caches reads, turn caching off.** Cloudflare Hyperdrive caches read queries by default and tells reads from writes by the query's text (Cloudflare's docs, read 2026-10-25). So `select record_ping(…)`, a function call that writes, can be answered from the cache and never recorded. Create the configuration with `--caching-disabled`: one configuration, and one login, per Worker.
- **Tightening an existing runtime's privileges is expand and contract** (`migrations.md § The window`).

(`2026-10-22`, a monitoring product: its worker boxes moved from table grants to seven definer functions, then lost every table grant; its later Workers each got a private schema of wrappers. By `2026-10-24` it had five components, each with its own group role and logins, and its catalog suite pinned seventeen definer functions in `public` by signature.)

## What the permissions doc records

The product's permissions doc says who may do what, and how the database enforces it. Its section "RLS and grants" says that:

- all tables have RLS on with zero policies;
- the app server's secret key is the only client that bypasses RLS;
- each other runtime's group role, its logins and the functions it may execute;
- tenant isolation is the three functions, not RLS;
- PUBLIC, `anon` and `authenticated` grants, the creator's defaults and the global function default are revoked;
- views are `security_invoker`, and the only `security definer` functions are the pinned list.

It also names the catalog suite that proves all of this, and any legacy or platform grant the suite pins as debt, with its backlog row.

## The Realtime exception

**Supabase never sees the identity provider's token. Writes stay server-side.** The one exception worth reopening is Realtime subscribed from the browser, and it has a price:

- Clerk (or your provider) configured as a third-party auth provider in Supabase;
- a read-only policy scoped to the public resource being watched;
- the browser holding a key again.

**Decide it when Realtime arrives, not before.** Realtime arrives when a five-second polling delay is the complaint, not before. Until then, live surfaces poll a public snapshot function through a typed allowlist DTO: every five seconds while the tab is visible, paused during the visitor's own mutation. Bounded public reads supply live updates without reopening the browser's database boundary. The owner confirms that the delay is the problem before the provider configuration is enabled.

## The integration suite

**What it makes real:** the development Postgres, with the applied schema, RLS deny-all, cross-tenant refusals, and invariants and races, all exercised through the real SQL functions.

**What it fakes:** identity. A mock verifier stands behind the same seam the identity provider uses (`clerk-production § Sessions`).

**What it is not:** a migration-from-zero test, unless one is added and named.

- It runs in the gate.
- If it needs a credential the unit run must not have, such as development's connection string (`DEV_DB_URL`, below), split it out as its own script (`test:integration`), still inside the gate.
- After applying a migration, regenerate the types from that target and run it: the suite reads the schema it expects.
- **A test that needs a restricted login** (§ A second runtime) can run against a local Postgres with every migration applied, where it can create the login itself. Without that database's URL it skips loudly, and whoever runs the full gate runs it.

**The live grant-denial tests go through the gateway with the publishable key**, the only reason that key is in the environment.

- No application code reads it, so it is not in the app's env schema.
- It must belong to the exact development target.
- When it is absent, the suite skips loudly. When it is configured and rejected with HTTP 401, the suite fails.

## The schema catalog suite

**What it makes real:** every relation and function in the schemas it guards, enumerated from the catalog so that future objects are covered. It checks that RLS is on, that there are zero policies, the grants, invoker views, and that the only definer functions are the pinned signatures.

**What it fakes:** nothing. It runs no identity and no fixtures: one read-only catalog query against the project that `SUPABASE_URL` names.

It runs in the gate, by one of two routes:

1. **A fixed metadata RPC through the secret key.** That RPC is itself a function the catalog must clear.
2. **The CLI, with development's own connection string:**

   ```sh
   npx supabase db query --db-url "$DEV_DB_URL" --file <query.sql> --output-format json
   ```

   This adds nothing to `public`, and its credential reaches that one database. The URL is expanded from the operator file, never typed (`environments`, `references/variables.md`). The CLI is never linked (`migrations.md § Applied by the CLI`), and CI reaches development the same way. If CI ever needs the Management API, it gets a token scoped to a development project of its own (where development is a branch of production, CI stays on `--db-url`), never the browser login's, which reaches every project the account can, production included (`environments`, `references/domain-and-provider-access.md`).

**The suite names its target and proves it arrived** (§ Rules that came from these suites' bugs).

## Rules that came from these suites' bugs

- **A gateway rejection is not proof of database denial.**
  - A missing publishable key skips loudly.
  - A configured key rejected with HTTP 401 fails.
  - Admit the key before asserting SQLSTATE `42501`, and run the service-key catalog assertions independently.
  - (`2026-09-16`, a stale key let the RLS suite pass without reaching Postgres.)
- **A refusal through an RPC is asserted by HTTP status, SQLSTATE and message together.**
  - PostgREST answers a call that matches no function signature with `PGRST202` and a 404, before Postgres checks any privilege.
  - So a test expecting only a 404 for a missing or foreign target passes against a schema without the function.
  - A denial probe sent with the wrong argument names proves nothing about grants.
  - Call with the real argument names and assert all three.
  - (`2026-09-16`, written into a product's deny-all proof so that a missing function could not pass for an ownership check that worked.)
- **The catalog suite names its target and proves it arrived.**
  - The project ref comes from `SUPABASE_URL`, the variable the app connects with, never from `supabase link` or a config file. The suite skips loudly when the variable names none.
  - **Its first assertion is that the product's own tables are there.** Every other catalog assertion expects an empty list ("no table without RLS", "no unpinned definer function"). Against the wrong project or an empty one, they would all pass. This is an absence assertion, and an absence is assertable only once the surface is independently proved present.
- **On Windows, hand the CLI multi-line SQL through a temp file, never as an argument.** `npx` needs `shell: true` there, and the shell mangles a multi-line argument. (`2026-10-11`, a product's first catalog run.)
- **The hosted development project fails intermittently.** Read the whole red log before blaming a test (`gotchas.md`, the last entry). The harness method around it (a failure whose duration equals the budget is a hang until shown otherwise) is `test-harness`.
- **Never test against production data or with production credentials.** Use the development project and dedicated test accounts. Only a write-free smoke touches production.
