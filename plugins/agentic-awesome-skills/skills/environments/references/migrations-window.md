# The migrations window — when deployed code meets a new schema

The timing principle, on any stack where the code deploys and the schema migrates as two separate acts. How migrations are written, applied and checked on Supabase — files only, each database reached by its own connection string and the CLI never linked, the dry run, the ledger read before and after, never through an MCP server or the dashboard — is the `supabase-production` skill. This file is about the minutes between the two acts.

## Does a push apply migrations?

Find out, write the answer in the environments doc with the date it was read, and never assume either way.

- **The host's deploy does not.** It builds and ships code; the production database is untouched, and nothing warns you. Code that calls a function production does not have is a `500` on every affected page.
- **A database provider's git integration may.** Supabase's GitHub integration applies new migrations on a push to the git branch production tracks when its *Deploy to production* option is on, and nothing orders that run against the host's build (`supabase-production`, which says how to read the setting). A push then hands the provider every file in the migrations directory, which is one more reason a migration you do not intend to run must not sit there.

**In both cases, production's migration ledger is read before every promotion, and pending migrations are applied by CLI after the owner's go and before the push** (`release-gate`, checklist § 3). The push then finds nothing pending, so the build and a migration run cannot race. (`2026-10-24`, a monitoring product found the integration attached to production with branching on; all five promotions that day found nothing pending, because each had applied by hand first.)

## Applying before the push opens a window

Between applying a migration and the new build going live, **the old code calls the new database.** "The old code" is **every build still serving**: the app's, and each runtime deployed separately from it (a Worker, a worker box, a scheduled job on another host). A push redeploys only the app; every other runtime keeps the bundle it was last deployed with until someone deploys it (`release-gate`). So every pending migration is written to survive all of them:

- **A replaced function keeps every parameter the deployed call passes**, with defaults for the new ones.
- **A new refusal is keyed to a state no existing row can hold**, so the old code never meets it.
- **A renamed or dropped column or table cannot be made compatible that way**, because the deployed code still names the old one. Ship it in steps:
  1. add the new one beside the old and keep the two in step until no live build reads the old — a trigger that copies writes, or a view under the old name;
  2. ship code that uses the new one, to every runtime that reads it;
  3. drop the old in a later migration, once every one of those builds is live.

  Or **name the outage**. **A one-time copy is not enough**: whatever the old build writes during the window never reaches the new one.
- **A revoked grant is a drop too.** Tightening what a running consumer may do is expand and contract: apply the additive migration, redeploy each consumer onto the build that no longer needs the old privilege, one at a time, confirming each, and only then apply the revocation. Once it is applied, an older consumer build is no longer a rollback target. (`2026-10-22`, a monitoring product moved its worker boxes from table grants to functions on development this way: the additive migration, both boxes redeployed in turn, then the revocation.)
- **The contracting migration waits outside the migrations directory** until every runtime runs the build that no longer needs what it removes, because the next push applies every file in that directory. (`2026-10-22`, the same product: the revocation first sat beside the additive migration, so one push would have applied both while both boxes still needed the grants; a review caught it, and it waited in a separate directory until both had moved.)

Ask two more questions of every pending file:

- **Does it delete or rewrite data?**
- **Does the new code work before it is applied?**

**Name the window, anything that breaks inside it, and any one-time data effect in the go/no-go** (`release-gate`). Once the product has users, that paragraph is owed at every promotion with a migration.

(`2026-09-21`, a live Q&A product: one of ten migrations refused a call the deployed code still made, so one action failed until the build finished. `2026-10-11`, a second product: a migration renamed a column the running build still read, so one action failed on a hosted development environment until its deploy finished.)

## Rolling back across a migration

Migrations are forward-only. **A previous deploy goes back only once it is known to run against the current schema**: if a migration removed a column, a function signature or a grant the older build uses, a forward migration tested on development restores it first. A mistake in a migration is fixed by a compensating migration, never by editing the applied one (`release-gate`, rollback).

## State is read, never remembered

- **Development migrations never establish production state.** Each environment's ledger is read for itself.
- **Both ledgers are re-read, never remembered**; a count written in the environments doc is a receipt for the moment it was taken.
- **A migration applied to production is an environment event**: a row in the environment log, with the date, the target, the files and the command (`data-and-incidents.md § The log`).
