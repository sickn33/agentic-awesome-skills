# Migrations: files, the CLI, the ledger, the window

## Contents

- Files only
- Applied by the CLI, against a target you state
- The MCP is for looking
- Does a push apply migrations?
- The window between apply and deploy
- Before a promotion
- After the deploy
- Rollback

## Files only

- **Every schema change is a file** in `supabase/migrations/`, named `<timestamp>_<name>.sql`. Files are ordered and idempotent. The first is the first slice's schema; every later change is a new file.
- **An applied migration is never edited.** A change is a new file, and a mistake is a compensating one.
- **A migration you do not mean to run yet is not in `supabase/migrations/`.** `db push` applies every pending file there, and a git integration hands the provider the whole directory. Park it in a sibling directory (`supabase/pending/`) and move it back when its precondition holds, such as every runtime running the build that no longer needs what it removes (§ The window). (`2026-10-22`, a monitoring product: a revocation sat beside the additive migration it depended on, so the next push would have applied both while two worker boxes still needed the grants.)
- **An unapplied file whose timestamp sorts before one already applied takes a new timestamp after it.** Branches built in parallel produce this; the ledger otherwise refuses it or needs `--include-all`. (`2026-10-22`, a monitoring product: a migration from one branch had a later file from another already applied to development.)
- **The dashboard is read-only.** A change made there exists in no file, so the next environment never gets it.
- **Keep `supabase/config.toml` minimal.**
- **The schema is the source, not memory.** Before writing a query or a migration, read the migrations (newest first) and the generated database types.

## Applied by the CLI, against a target you state

**Check the connection string inside the command that uses it.** Keep the operator files outside git, with each value single-quoted as in the production example below. Check `npm ls supabase` before running these pinned 2.x CLI commands.

```sh
# Development. <dev-ref> is the ref in the app's own SUPABASE_URL. Each line loads development's
# connection string into itself alone and checks, without printing it, that it names <dev-ref>,
# because a check run as its own command stops nothing.
( . <development operator file> && case "$DEV_DB_URL" in *<dev-ref>*) ;; *) false ;; esac && npx supabase migration list --db-url "$DEV_DB_URL" && npx supabase db push --db-url "$DEV_DB_URL" --dry-run )
```

If that listing is already aligned, stop: record *no migration*. Otherwise read the dry run, then apply, as its own command:

```sh
( . <development operator file> && case "$DEV_DB_URL" in *<dev-ref>*) ;; *) false ;; esac && npx supabase db push --db-url "$DEV_DB_URL" && npx supabase migration list --db-url "$DEV_DB_URL" )
```

Where the owner kept development as a branch of production (`SKILL.md` § Setting it up the first time, step 1), the same lines hold: a branch's connection string carries its own ref, in the pooler user `postgres.<ref>` or the host `db.<ref>.supabase.co`.

**Production is its own run, only at a release and on the owner's go.** Never in the same script or command list as development. Keep production's percent-encoded connection string in its uncommitted operator file outside the development checkout. Verify that it belongs to the recorded production project before using it. Load it only into the command using it. A session environment exposes it to every process the agent starts. Run each command below as `( . <production operator file> && test -n "$PROD_DB_URL" && <command> )`, which expands the string without exporting the file's other values. Type the variable on the operator's own machine and keep the string out of commands, output and chat. The expanded `--db-url` is visible in the local process list (`environments`, `references/variables.md`). With `;`, bash runs the command after a file that failed to load. An empty `--db-url` goes to whatever database the shell's `PG*` variables name, or to localhost (Supabase CLI 2.122.0, observed `2026-10-29`). The shell reads the file, so single-quote every value; a `'` inside one written `'\''` (`PROD_DB_URL='postgresql://…?sslmode=verify-full&sslrootcert=…'`). Unquoted, the `&` joining the URL's parameters ends the assignment and the variable comes out empty. A machine without IPv6 uses the session pooler (`gotchas.md`). Read first:

```sh
npx supabase migration list --db-url "$PROD_DB_URL" && npx supabase db push --db-url "$PROD_DB_URL" --dry-run
```

**Apply production only after reading the dry run and getting the owner's go in the chat.** Run this as its own command:

```sh
npx supabase db push --db-url "$PROD_DB_URL" && npx supabase migration list --db-url "$PROD_DB_URL"
```

For either target:

1. **List first.** If the listing is already aligned, record *no migration* and run no write command.
2. **Dry-run** to see exactly which files would run.
3. **Apply** (`db push`): production only after the owner's go.
4. **List again.** The second listing is the receipt, not the `db push` output, which reports what was attempted.

The file's timestamp must be the version the ledger records. The first migration is named after the version the ledger will record.

After applying, regenerate the types from that same target and run the tests. The integration suite reads the schema it expects.

**Why every command takes `--db-url` and nothing is linked.** The target must be *stated*, never inherited from whatever a link or config file was last left pointing at, and the CLI's link is exactly such a file.

- **Observed `2026-10-23`:** `db push --linked --project-ref <production ref>` wrote to the *linked* project. A monitoring product's review found its production migration command could silently target the linked development project.
- **Probed `2026-10-25`:** with CLI 2.122.0 linked to one ref and `--project-ref` naming another (dummy refs, a fake token), the first request of `db push`, `migration list` and `db query` went to the typed ref. Where the database connection itself goes was not confirmed.
- **What the vendor says (read 2026-10-25):** Supabase's web CLI reference lists only `--linked`, `--local` and `--db-url` as targets for `db push` and `migration list`. The CLI's own `--help` (2.121.0 and 2.122.0) also lists `--project-ref`, described only as "Project ref of the Supabase project", and says nothing of which wins over `--linked`. The CLI is mid-rewrite, so behaviour can differ between versions.
- **So no command may depend on which flag wins.** The CLI is never linked ("I'll just link it" is the mistake, not the fallback), and every command, the ledger read included, takes its database's own `--db-url`. The same holds for `db query`. Until `2026-11-02` this skill linked the CLI to development and reached only production by URL; an evals product's owner asked what the token for the link was for, and every command its build needed took `--db-url` (`2026-10-31`).
- **After any `--project-ref` command, delete the link file and check it is gone.** Even a management read can write `supabase/.temp/linked-project.json`: `rm -f supabase/.temp/linked-project.json && test ! -e supabase/.temp/linked-project.json`, from the repository root, whether or not the command succeeded (`2026-11-18`, a live Q&A product's `branches list --project-ref` read linked the CLI to production).
- **CLI 3.0.0 (published `2026-11-02`) moves the flags.** It deprecates `--db-url` and `--linked` for `--remote=<url>` (or `--remote=<ref>`), to be removed in v4, and targets the local database when a command is given neither; `db query` run by an agent refuses a statement until it is given `--yes`, or `--read-only` for a read (both read `2026-11-02`, 3.0.0's help and a run against a dummy URL). The lines in this skill are 2.x's, which 3.0.0 still runs with a warning, except `db query`: on 3.0.0 the catalog query needs `--read-only` and a write such as a login's password needs `--yes`, while 2.x has no `--read-only` and refuses it. So pin a 2.x release as a development dependency (2.122.1 was the `v2.stable` tag on `2026-11-02`), so `npx supabase` runs the version whose help you read, and move every command, wrapper and doc line in one change when you upgrade. Without that dependency installed, `npx supabase` fetches the newest release, a new major version included; check `npm ls supabase` first (`2026-11-18`, a live Q&A product's CLI jumped a major version mid-phase).

**Hold it in a script**, because a rule a script can hold should be held by one. The wrapper:

- checks that the URL names development before it writes, passes neither `--linked` nor `--project-ref`, and refuses a requested ref that is not the one the URL names, rather than reporting about the wrong database (`2026-10-23`, the same product's wrapper after that review, then still on the link);
- refuses any option it does not read, so a mistyped `--dry-run` cannot become a real run;
- never prints the connection string, its password or the CLI's raw error.

**Who applies.** Development's migrations are the session agent's to apply without asking the owner, never a delegated builder's (it names the command), when nobody else depends on that project (no teammate working against it, no demo running on it, no data anyone needs); otherwise ask first. Production's are applied only at a release, on the owner's go. (`2026-10-22`, a monitoring product's owner, about a development project only they used: "This is dev. Nobody uses it.")

**Development migrations never establish production state.** Both ledgers are re-read, never remembered, and a count written down is a receipt for the moment it was taken.

## The MCP is for looking

**Install the read-only MCP only when you need development logs or advisors.** Use a separate development project scoped to its own token. For an owner-chosen development branch of production, use its connection string through the CLI and leave MCP unconfigured.

- **Never apply a migration through it.** `apply_migration` timestamps the migration when it runs, so the ledger and the directory drift apart.
- **Its reads have the same edge.** `list_migrations` answers about whatever the MCP config names, so it can give a confident all-clear about the wrong database.
- **Check its URL before believing any answer about schema.** The config is gitignored and per machine, and the next clone may name a different target.

(`2026-09-16`, the MCP config named production while the product's rules still blessed migration writes through it.)

The owner issues a scoped token for the development project alone, read-only, and sets it in `SUPABASE_ACCESS_TOKEN` outside the chat, in the environment the agent starts in (a token pasted into the chat is revoked; set after the agent started, the session is restarted to inherit it, which in Claude Code `claude --resume`, picking this conversation, does without losing it). *Connect → MCP* in the dashboard generates the add command for your project; add the token as a header, single-quoted so the shell writes the variable's name, not its value: `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<dev-ref>&read_only=true&features=…" --header 'Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}'`. Check it without printing it: `grep -qF 'Bearer ${SUPABASE_ACCESS_TOKEN}' .mcp.json && echo ok`. Anything but `ok` means a value was written in: remove the server (`claude mcp remove supabase`), and the owner revokes that token and issues a new one. Claude Code expands the name from the environment it starts in. The browser sign-in grants the whole organization. Sign out in the client and have the owner revoke any token it already issued. Keep its config file out of git. The server loads in a new session: restart (`claude --resume`, picking this conversation), and the owner approves the project's `supabase` server when Claude Code asks, until `/mcp` shows it connected. Check the configured URL and confirm the MCP answers about the same development project before relying on it.

## Does a push apply migrations?

There are two cases, and the product's environments doc says which one it is in, with the date it was read.

- **Nothing applies migrations unless you configured it to.** The host (Netlify, for example) builds and ships code and never touches the database, and **nothing warns you**. Shipping code that calls a function production does not have is a 500 on every page that calls it. (`2026-09-16`, three migrations were absent from production through a handoff that called the release verified.)
- **Supabase's GitHub integration applies them when its *Deploy to production* option is on.** A push or merge to the git branch production tracks applies the new migrations in `supabase/migrations/`, and deploys the Edge Functions and Storage buckets declared in `config.toml`. Nothing orders that run against the host's build. (Supabase's GitHub integration docs, read 2026-10-25: the option is enabled in the integration's configuration, not on by default.)

**How to tell which case you are in:**

1. The owner reads the production project's branches, in the dashboard or with `npx supabase branches list --project-ref <prod-ref>` on a time-boxed read-only production token: whether branching is on and which git branch the production branch tracks (`git_branch`). After the CLI read, delete `supabase/.temp/linked-project.json` and check it is gone (§ Applied by the CLI).
2. Each push to that git branch then carries a *Supabase Preview* check on GitHub.
3. *Deploy to production* itself is visible only in the dashboard: *Project Settings → Integrations → GitHub*. **If nobody has read it, treat it as on.**

(`2026-10-24`, a monitoring product: production's project had branching on, tracking the production git branch, and every push there carried a passing *Supabase Preview* check; the option had never been read, so the product treats it as on.)

**Either way, apply by CLI before the push.** Production's ledger is read before every promotion, and pending files are applied by hand after the owner's go, immediately before the push. The push then finds nothing pending, so the build and a migration run cannot race. This is also why a file you do not mean to run must not sit in the directory (§ Files only).

## The window between apply and deploy

Applying before the push opens a window: between `db push` and the new build going live, the old code calls the new database. **"The old code" is every build still serving**: the app's, and each runtime deployed separately from it (a Worker, a worker box, a scheduled job elsewhere), which keeps the bundle it was last deployed with until someone deploys it again (`release-gate`). Write every migration so all of them survive it.

- **A replaced function keeps every parameter the deployed call passes**, with defaults for the new ones.
- **A new refusal is keyed to a state no existing row can hold.**
- **A renamed or dropped column or table cannot be made compatible that way**, because the deployed code still names the old one. Ship it in steps:
  1. Add the new one beside the old and keep them in step until no live build reads the old one, with a trigger that copies writes, or a view under the old name.
  2. Ship code that uses the new one.
  3. Drop the old one in a later migration, once that build is live.

  Or name the outage. **A one-time copy is not enough:** whatever the old build writes during the window never reaches the new one.
- **Tightening privileges under a running consumer has the same shape.** Apply the additive migration (the new functions); roll each consumer to the build that uses them, one at a time, confirming each; only then apply the revocation, parked outside the migrations directory until that moment. Once the revocation is applied, an older consumer build is no longer a rollback target. (`2026-10-22`, a monitoring product moved its worker boxes from table grants to functions this way on development: the additive migration, both boxes redeployed in turn, then the revocation.)

Ask two more questions of every pending file:

1. Does it delete or rewrite data?
2. Does the new code work before it is applied?

Name the window, anything that breaks inside it, and any one-time data effect in the go/no-go. A migration that drops and recreates something the old code calls breaks that code between the apply and the build finishing. Name that window once the product has users.

Receipts:

- `2026-09-21`, a live Q&A product: one of ten migrations refused a call the deployed code still made, so one action failed until the build finished.
- `2026-10-11`, a second product: a migration renamed a column the running build still read, so one action failed on a hosted development environment until its deploy finished.

## Before a promotion

These are the Supabase mechanics. Apply `release-gate` for the release around them.

- **Confirm each schema change is a migration file.** Leave applied migrations and the dashboard untouched.
- **Run the production ledger read in § Applied by the CLI before every promotion.** An empty `remote` names a pending migration. Review the dry run and the compatibility window for every pending row and runtime (§ The window).
- **Apply pending files immediately before promoting and after the owner's go.** Use the separate production apply command in § Applied by the CLI. Re-read the production ledger and verify alignment before promoting.
- **Use the production project and its own connection string at first go-live.** A new project takes every file in one push. Read the ledger again before promoting. When the owner chose a development branch, that branch keeps its distinct connection string.
- **Apply only through the unlinked CLI.** The MCP and the dashboard stay read-only.

## After the deploy

**The ledger check was taken before the promotion, so it cannot prove that the deployed code met the deployed schema.**

The proof is one read that reaches the database through an unguessable id that cannot exist. A public route answering **404** with the product's own not-found went to Postgres and back. Anything else has not proved it: the probe is recorded as failed, and its cause is found from the error code in the body before any production write (`release-gate`, checklist § 4).

- One request, no account, no write.
- Name that route in the coverage map (the product's list of what each test and smoke proves).
- Check every entry point that reads through the same function.

Mind the RPC status codes when choosing the probe. A product's own not-found must raise a `PTxxx` code, not `P0002`, and PostgREST's `PGRST202` is also a 404: no function the role can see matched the call (`gotchas.md`). So the probe reads the product's own not-found in what the route returns, never the status alone, and a `PGRST202` is not by itself a missing migration.

## Rollback

- **Schema is forward-only.** Never edit an applied migration; write a compensating one.
- **Code:** redeploy the previous build only once it is known to run against the current schema. Migrations are forward-only, so if one removed a column, a function signature or a grant the older build uses, a forward migration tested on development restores it first. Then fix forward on the product branch.
- The rest of rollback (configuration, leaked keys) is `release-gate` and `environments`.
