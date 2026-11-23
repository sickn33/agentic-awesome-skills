# Gotchas: queries, migrations, connections and the hosted project

Read these before writing a query, an RPC, a migration or a connection string. Each one failed silently, or looked like a different problem, the first time. The window between applying a migration and the build going live is in `migrations.md § The window`.

## Contents

- The server's reads are never cached
- PostgREST will not guess an ambiguous embed
- A return type cannot be widened by `create or replace`
- A refused `on delete restrict` has a different SQLSTATE from Postgres 18
- An RPC's HTTP status comes from its SQLSTATE, and three codes mislead
- Two plpgsql and node-postgres mistakes that only fail at runtime
- Parenthesize JSON extraction beside other operators
- The generated types call every argument without a default non-null
- supabase-js needs a global `WebSocket` in Node
- `npx supabase` can fail on npm's install-script policy
- The direct database host is IPv6-only
- TLS to Postgres is whatever each URL asks for
- The hosted development project fails intermittently, in three costumes

## The server's reads are never cached

Next patches `fetch`, and the Supabase client uses it, so by default a read can be served from Next's cache.

- The one database client sets `cache: "no-store"`.
- Any page that reads live data says `export const dynamic = "force-dynamic"`.

(`2026-08-27`, building the first slice: a row was written and missing from the very next render.)

## PostgREST will not guess an ambiguous embed

When there are two paths between the same tables (a foreign key *and* a join table), name the one you meant: `children!children_parent_id_fkey(…)`.

(`2026-08-27`, building the first slice: a 500 on a public page.)

## A return type cannot be widened by `create or replace`

Postgres refuses the change. Put `drop function if exists` on the exact signature first, in the same migration. Mind the window: the deployed build may still call the old signature (`migrations.md § The window`).

(`2026-09-03`, building plan limits.)

## A refused `on delete restrict` has a different SQLSTATE from Postgres 18

- **Up to Postgres 17:** `23503` (foreign_key_violation).
- **From 18:** `23001` (restrict_violation).
- `no action`, the default, and an insert naming a missing parent are still `23503`.

Code that turns a refused delete into a message checks both codes, and so does a test that asserts one. Development and production can run different majors, and nothing announces the move, so record each project's major (`projects-and-backups.md`).

**A local stand-in on another major is no evidence about the hosted project.** That includes an embedded Postgres build such as PGlite, which was Postgres 18. Check schema behaviour on the development project, with migrations applied there by CLI.

(`2026-10-21`, a local rehearsal on Postgres 18 raised a false alarm against a development project on 17.11.)

## An RPC's HTTP status comes from its SQLSTATE, and three codes mislead

- **`P0002` (no_data_found) reaches the client as a `500`, not a `404`.** An explicit `raise … using errcode = 'P0002'` raises it, and so does any `select … into strict` that finds no row, including one the function never meant as a not-found. A not-found the product raises needs a `PTxxx` code: `PT404` answers `404`.
- **PostgREST answers a call that matches no function with `PGRST202`, also a `404`.** The call's signature (argument names, types or count) matched no function the calling role can see in PostgREST's schema cache: the function may be missing, not reloaded yet, not visible to that role, or called differently. So it is not by itself a pending migration, and any of those passes for the product's own not-found unless the code and message are checked too.
- **Raise your own conflicts as `PT409`, never `40001`.** PostgREST answers a `PTxyz` code with HTTP status `xyz` and the code in the body (its errors reference, read `2026-11-02`). `40001` is a serialization failure, which PostgREST retried on its own before version 16 and answers `500` from it (its 16.0 changelog). A function that raised `40001` reached supabase-js with no `code` at all, so the product's "changed in another tab" mapping never fired (`2026-11-01`, an evals product, on the hosted project).

Tests that assert a refusal assert status, code and message together, with the real argument names (`access-model.md § Rules that came from these suites' bugs`).

(`2026-09-16`, a live Q&A product's new not-found paths took `PT404`; its older `P0002` ones still answer `500`.)

## Two plpgsql and node-postgres mistakes that only fail at runtime

Both pass the migration and the catalog suite, and fail the first time the code runs. Only a test that runs the function end to end catches them (`test-harness`, § Boundary tests for features that touch data).

- **A plpgsql loop variable named like a table alias in a query inside the loop** (`for t in … loop … from public.traces t …`) fails with "column reference … is ambiguous" only when the loop runs. Give loop variables names no query uses (`trace_row`).
- **node-postgres sends a JavaScript array as a Postgres array**, so an array bound to a `jsonb` parameter fails or arrives as the wrong type. Pass `JSON.stringify(value)` and cast the parameter (`$1::jsonb`).

(`2026-11-01`, an evals product: a retention job failed on the alias the first time a test ran it, and a `jsonb` write failed on the array; each cost a debugging round.)

## Parenthesize JSON extraction beside other operators

**Parenthesize each `jsonb` extraction chain beside `-`, `||`, `@>` or `?`.** This applies to `->` and `->>`. Postgres can group the operators differently from the intended expression (observed `2026-11-18`).

- `doc -> 'details' - ARRAY['note']` groups as `doc -> ('details' - ARRAY['note'])` because `-` binds more tightly. Write `(doc -> 'details') - ARRAY['note']`.
- `first_doc -> 'items' @> second_doc -> 'items'` groups as `((first_doc -> 'items') @> second_doc) -> 'items'`. `->` and `@>` share precedence and associate left to right. Write `(first_doc -> 'items') @> (second_doc -> 'items')`.

**Let unexpected errors escape a validator and test true and false directly.** Avoid `exception when others then return false`, which reports a broken expression as invalid input. Call the validator with valid and invalid inputs and assert each result.

(`2026-11-18`, a live Q&A product's catch-all made the first bug reject every input. A review caught the second before the migration was applied.)

## The generated types call every argument without a default non-null

`supabase gen types` types every SQL function argument that has no default as a required, non-null value. A call that really passes `null` fails to typecheck.

- Say so at the call site, deliberately, rather than loosening the generated file.
- Until a new function's migration is applied and the types regenerated, a small hand-written type overlay stands in for it. The regenerated file then replaces the overlay in the same change.

(`2026-10-23`, a monitoring product: three regenerations in one day each had calls that pass `null` on purpose, and each replaced a hand-written overlay.)

## supabase-js needs a global `WebSocket` in Node

The client builds its Realtime client even when nothing subscribes. Without a global `WebSocket` it fails at construction with *"Node.js detected but native WebSocket not found"*.

- Node 22, which the host runs, has one. Node 20 has it only behind `--experimental-websocket`.
- **Run the host's Node major locally**, and pin `engines.node`.
- Where that cannot be guaranteed:
  - the integration test config appends the flag to `NODE_OPTIONS` when `globalThis.WebSocket` is undefined;
  - every Node script that creates a client (a seed script, for example) runs with the flag.

(`2026-10-10`, a product's first integration run failed on a Node 20 machine.)

## `npx supabase` can fail on npm's install-script policy

A Supabase CLI older than 2.99.0 installs its binary in a postinstall script, which npm 12 blocks by default and npm 11.16 and later can be set to block (`strict-allow-scripts`); `npx supabase` then fails. Pin a 2.x release from 2.99.0 on, which has none (this skill's commands are 2.x's: `migrations.md § Applied by the CLI`), or approve the older one once with `npm install-scripts approve supabase` (npm 11.21.1 and 12.2.1, and the registry's package data, read `2026-11-02`; `2026-10-31`, an evals product hit it).

## The direct database host is IPv6-only

`db.<ref>.supabase.co:5432` answers over IPv6 unless the project has the IPv4 add-on (Supabase's connection docs, read 2026-10-25). A machine without IPv6, which includes many home and office connections, cannot reach it, and the failure reads like a wrong password or a dead host.

- **From such a machine, use the session pooler:** `aws-0-<region>.pooler.supabase.com:5432` (the exact host is in the dashboard's *Connect* dialog), with the login suffixed by the project ref (`postgres.<ref>`, `<login>.<ref>`). Session mode behaves like a direct connection; the transaction pooler (port 6543) does not support prepared statements.
- **Keep saved URLs on the direct host** where the runtime has IPv6 (a Worker's pooling proxy, a cloud box), and let the operator's commands switch to the pooler for themselves.

(`2026-10-23`, a monitoring product: its login checks failed from the operator's machine, which had no IPv6, and passed through the session pooler.)

## TLS to Postgres is whatever each URL asks for

**SSL enforcement is off by default** (Supabase's docs, read 2026-10-25; `npx supabase ssl-enforcement get --project-ref <ref> --experimental`). So Postgres also accepts unencrypted connections, and a URL with no `sslmode` connects in clear. That includes an operator's `create role … password` statements.

- **With node-postgres, `sslmode=require` alone does not mean what libpq means.** Without `uselibpqcompat=true` it sets `ssl: true`, which verifies the certificate against the public authorities, and Supabase signs its database certificates with its own CA, so the connection fails (`pg` 8.23.1 and `pg-connection-string`'s README, read `2026-10-25`). Use `sslmode=verify-full` with Supabase's CA (downloadable from the dashboard's database settings) as `sslrootcert`, which verifies it. Where you cannot ship the CA file, `sslmode=require&uselibpqcompat=true` encrypts but does not check the certificate; record which components run that way.
- **On the Supabase CLI's `--db-url`, the URL's own `sslmode` means what libpq means.** CLI 2.122.0 adds `uselibpqcompat=true` itself whenever the URL carries any `ssl` parameter, and the commands it still hands to its older Go binary follow libpq too (its bundled code, read `2026-10-25`). So add `sslmode=verify-full&sslrootcert=<Supabase's CA>` there, or `sslmode=require` to encrypt without checking the certificate, and never `uselibpqcompat`.
- **Then turn enforcement on.** Turning it on before every URL asks for TLS cuts off the ones that don't.
- **Record the posture**, with `ssl-enforcement get` and `network-restrictions get`, in the integration notes.

(`2026-10-24`, a monitoring product: a read-only check found enforcement off on both projects, and two of its components, including the operator commands that set login passwords, connecting in clear.)

## The hosted development project fails intermittently, in three costumes

1. A Cloudflare `520` or `522` HTML page, printed into the test output.
2. A bare timeout at exactly the test budget. The test's budget runs out before Cloudflare gives up, so no error page ever arrives.
3. An assertion that received an HTML document where JSON was expected.

**The signature:**

- integration tests only, never unit;
- a duration equal to the budget;
- a different file every run, green again minutes later.

**What to do with it:**

- **Search the whole red log for `<html`, `supabase.co` and `Ray ID`**, not only the failure list.
- An error page is enough to blame the vendor. Its absence does not clear the vendor.
- Neither does a passing light probe, or `supabase branches list` reporting `ACTIVE_HEALTHY`.
- **A retry guard that knows one costume misfiles the other two.**
- Record a cause only when a mechanism explains both the hits and the misses. One correlation is not a receipt.

(`2026-09-22`, a live Q&A product: seven gate runs before the cause was read out of the log body, and a cause written down after two runs had to be deleted after the third.)

A flaky run is not a pass; judge a suite on a series (`test-harness`).
