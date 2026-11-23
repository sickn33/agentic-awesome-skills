# Projects, keys, backups and incidents

The general split between development and production (branches, the host's environments, showing development to the owner, rotating a secret across every holder) is `environments`. This file is the Supabase half of it.

## Contents

- Two projects, two key sets
- The verified mapping
- Keys and variables
- Backups and restore
- Incidents and keys

## Two projects, two key sets

- **Development and production are separate Supabase resources with separate key sets.** Production is one project and development another, or, by the owner's choice, a branch of production (`SKILL.md` § Setting it up the first time, step 1).
- **The app refuses to boot on a partial configuration** (the env schema, `environments`).
- **The CLI is never linked.** Each database, development's and production's, is reached with its own `--db-url` for every command that connects to it (`migrations.md § Applied by the CLI`). Management commands that have no database target (`branches list`, `backups list`) take `--project-ref`, on a token that reaches the project named; on production, they are the owner's, in the dashboard or on a time-boxed read-only token (`environments`, `references/domain-and-provider-access.md`). Each can leave a link file; delete it after (`migrations.md § Applied by the CLI`).
- **Going live:** production gets its own project and keys, none shared with development. Every migration is applied to it with `--db-url`, and the ledger is read again.
- **After go-live, keep development's builds off production's values.** Once production deploys from its own branch, a build of the product branch on the same site is a branch deploy: give it the development values (on Netlify, a per-branch deploy-context value), or it starts writing to production. Or run two sites, each building only its own branch (`environments § Branches`).
- **Never pair one environment's identity instance with the other's database**, even for a day. (`2026-10-23`, a monitoring product: while its production site ran on development identity keys, nobody signed in there, because each sign-in would have created production rows keyed to development's user ids.)

## The verified mapping

**Record which ref is development and which is production, with the date it was checked and the command that showed it.** Record each project's Postgres major version too: development and production can run different majors, and nothing announces the move (`gotchas.md`). Record that the CLI is linked to nothing (`supabase/.temp/project-ref` does not exist).

- **A development branch, where the owner chose one, is a child of the production project and never appears in `supabase projects list`.** The owner's read of the production project's branches (the dashboard, or `supabase branches list --project-ref <prod-ref>` on a time-boxed read-only token) shows it, and which git branch it is bound to.
- **Never infer the target from the MCP configuration or the CLI's link.** Both are per machine, and the last thing either named may have been production.
- (`2026-09-15`: the former development project was promoted to production and a new development branch created. Every remembered mapping was wrong from that moment.)

## Keys and variables

| Variable | Used by | Scope | Source | Risk if leaked |
|---|---|---|---|---|
| `SUPABASE_URL` | the database client; also the catalog suite's target | server | *Project Settings → API* | low |
| `SUPABASE_SECRET_KEY` | the app server's database client only. It bypasses RLS | server | *Project Settings → API Keys*; a new one can be made beside the old (below) | **critical**: the full database |
| `SUPABASE_PUBLISHABLE_KEY` | **tests only**: the live grant-denial tests through the gateway. Absent skips loudly; configured and rejected with HTTP 401 fails. No application code reads it, so it is not in the app's env schema | test | *Project Settings → API*, for the exact development target | none (public by design) |
| a second runtime's database URL, one per component and environment | that component only (`access-model.md § A second runtime`) | that runtime | generated when its login is made, saved before the role is created | what that component's functions can do |
| production's `postgres` connection string | the operator's migration and login commands only, as `--db-url` | operator | *Connect* in the dashboard; the password set at project creation | **critical**: everything `postgres` can do, creating logins included |

- **No Supabase variable is ever `NEXT_PUBLIC_*`.**
- **The env schema checks the secret key's shape** (`sb_secret_`) and refuses any secret-shaped value in a public variable, at build time. The schema's contract is in `environments`.
- **Development's keys go into the development checkout's `.env`; production's never do.** The host's go into its production environment at `release-gate` go-live step 3; production's connection string goes into a production operator file outside the development checkout, under a name the app never reads (`PROD_DB_URL`), expanded only for the command that needs it. Never put one into a chat; a key that touched a chat is rotated. The host does not read `.env`, so every variable is set in the host's own environment.

## Backups and restore

- **Read the posture; don't assume it.** `npx supabase backups list --project-ref <ref>` (on production, the owner's read: § Two projects, two key sets) lists the physical backups and whether point-in-time recovery is on (`pitr_enabled`). With daily backups and no point-in-time recovery, the recovery point is up to a day of writes. (`2026-10-24`, a monitoring product read daily backups and no point-in-time recovery on both projects.)
- **Decide backups from a stated recovery point**: how much data the product can afford to lose. The provider's default schedule is not that decision.
- **Run a restore drill into an isolated project**, and record its date and result in the environments doc.
- **Until a drill has run, write *not verified***, rather than repeating the provider's schedule as if it were evidence.
- **A database backup is not the system.** Logins' passwords, the other runtimes' secrets and the keys that seal stored data live elsewhere (`environments`, § Backups and restore).
- Record the backup and point-in-time-recovery settings, read back with the command above, when they are set.

## Incidents and keys

- **Where it hurts first:** the health route reports configuration and database status, and is what the uptime monitor probes.
  - Read Supabase's logs and advisors in the dashboard. A separate development project can use read-only MCP for this (`migrations.md` § The MCP is for looking).
- **Panic buttons:**
  - rotate `SUPABASE_SECRET_KEY` in the provider;
  - change a second runtime's login password (below: never typed into a command), which cuts that one component off until its new URL is deployed;
  - rotate the anonymous cookie's secret, if there is one (every visitor becomes a new visitor; their old rows are orphaned, not lost);
  - freeze or close the primary resource, once the code offers it.

  List these in the environments doc as the code gains them.
- **A planned rotation of `SUPABASE_SECRET_KEY`:** create a new secret key beside the old one in *Project Settings → API Keys*, put it in every place that holds the old one and deploy each, check the app reads the database, then delete the old key. Deleting a secret key cannot be undone (Supabase's API keys docs, read 2026-10-25), so it comes last. The order and the map of every holder are `environments`.
- **A leaked key:** the same order, done at once. If the key is being used against you, delete it first and accept that every holder fails until it has the new one. Write it down in the environment log, with the date and what was rotated.
- **A login's password:** set it the way the login was made (`access-model.md § A second runtime`): generated locally and saved to the operator file first, then sent in a SQL file written outside the repository, with `npx supabase db query --db-url "$DEV_DB_URL" --file <that file>` (production, loaded from the production operator file into that command alone, as § Applied by the CLI in `migrations.md` says: `"$PROD_DB_URL"`, on the operator's machine), each URL carrying `sslmode=verify-full` with Supabase's CA, or at least `sslmode=require` (the CLI's meaning: `gotchas.md § TLS to Postgres`), and the session pooler's host when the operator's machine has no IPv6: the direct host is IPv6-only, and its failure there reads like a wrong password (`gotchas.md`). Delete the file in the same step, whether or not the command succeeded: the operator file already holds the password. Never echo it. A password typed into a command lands in shell history (`environments`). Once the command succeeded and a connection with the new password works, redeploy that component in the same minute, because it loses the database between the two. If the command failed, the database still has the old password: don't redeploy; run it again from the operator file.
- **The environment log** is the last section of the environments doc. It gets one row per environment event: a migration applied to production, a rotation, an incident. Each row has dates, refs, counts and the command that produced them. It is a receipt, not a summary.
